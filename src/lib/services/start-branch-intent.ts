import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { logger } from "@/observability/logger";
import { posthogServer } from "@/observability/posthog";
import { captureException } from "@/observability/sentry";
import { getPropertyPlainText } from "@/notion/page-properties";
import type { NotionPageProperties } from "@/notion/page-properties";
import {
  auditEvents,
  branchIntents,
  databaseMappings,
  syncEvents,
  webhookDeliveries,
  type BranchIntent,
} from "@/schema";
import { hashWebhookPayload } from "@/security/github-webhooks";
import { verifyNotionStartBranchRequest } from "@/security/notion-webhooks";
import type { WebhookProcessingResult } from "@/types/domain";
import { generateBranchName } from "@/utils/branch-name";

import { updateNotionTask } from "./update-notion-task";

const startBranchIntentInputSchema = z.object({
  pageId: z.string().min(1),
  databaseId: z.string().min(1),
  branchType: z
    .enum(["feat", "fix", "chore", "docs", "refactor", "test"])
    .optional(),
});

export async function startBranchIntent(input: {
  payload: string;
  providedSecret: string | null;
  deliveryId: string | null;
}): Promise<WebhookProcessingResult> {
  let webhookDeliveryId: string | null = null;

  try {
    const parsedPayload = startBranchIntentInputSchema.parse(
      JSON.parse(input.payload) as unknown,
    );
    const payloadHash = hashWebhookPayload(input.payload);
    const notionDeliveryId = input.deliveryId ?? payloadHash;

    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        source: "notion",
        deliveryId: notionDeliveryId,
        eventName: "start_branch",
        signatureVerified: Boolean(input.providedSecret),
        payloadHash,
        context: {
          pageId: parsedPayload.pageId,
          databaseId: parsedPayload.databaseId,
        },
      })
      .onConflictDoNothing()
      .returning({ id: webhookDeliveries.id });

    if (!delivery) {
      return {
        statusCode: 200,
        body: { ok: true, duplicate: true },
      };
    }

    webhookDeliveryId = delivery.id;

    const mappingRecord = await db.query.databaseMappings.findFirst({
      where: and(
        eq(databaseMappings.notionDatabaseId, parsedPayload.databaseId),
        eq(databaseMappings.active, true),
      ),
      with: {
        notionWorkspace: true,
        repository: true,
      },
    });

    if (!mappingRecord) {
      await markNotionDelivery(
        webhookDeliveryId,
        "ignored",
        404,
        "mapping_not_found",
      );
      return {
        statusCode: 404,
        body: { error: "Database mapping not found" },
      };
    }

    const verification = verifyNotionStartBranchRequest({
      configuredSecret: mappingRecord.webhookSecret,
      providedSecret: input.providedSecret,
    });

    const notion = await import("@/notion/client").then(
      ({ createNotionClient }) =>
        createNotionClient(mappingRecord.notionWorkspace.accessToken),
    );
    const page = await notion.pages.retrieve({ page_id: parsedPayload.pageId });

    if (!("parent" in page) || page.parent.type !== "database_id") {
      await markNotionDelivery(
        webhookDeliveryId,
        "ignored",
        400,
        "page_not_in_database",
      );
      return {
        statusCode: 400,
        body: { error: "Notion page is not part of a database" },
      };
    }

    if (page.parent.database_id !== mappingRecord.notionDatabaseId) {
      await markNotionDelivery(
        webhookDeliveryId,
        "ignored",
        403,
        "page_database_mismatch",
      );
      return {
        statusCode: 403,
        body: { error: "Notion page does not belong to the mapped database" },
      };
    }

    if (!("properties" in page)) {
      await markNotionDelivery(
        webhookDeliveryId,
        "ignored",
        400,
        "page_properties_missing",
      );
      return {
        statusCode: 400,
        body: { error: "Notion page properties were not returned" },
      };
    }

    const taskIdentifier =
      getPropertyPlainText(
        page.properties as NotionPageProperties,
        mappingRecord.taskIdProperty,
      ) || parsedPayload.pageId;
    const taskTitle =
      getPropertyPlainText(
        page.properties as NotionPageProperties,
        mappingRecord.titleProperty,
      ) || "untitled-task";
    const branchType =
      parsedPayload.branchType ?? mappingRecord.defaultBranchType;
    const branchName = generateBranchName({
      type: branchType,
      taskIdentifier,
      title: taskTitle,
    });
    const now = new Date();

    const [intent] = await db
      .insert(branchIntents)
      .values({
        databaseMappingId: mappingRecord.id,
        repositoryId: mappingRecord.repository.id,
        notionPageId: parsedPayload.pageId,
        taskIdentifier,
        taskTitle,
        branchType,
        branchName,
        status: "waiting_for_push",
        verificationStrategy: verification.strategy,
        suggestedAt: now,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: [branchIntents.repositoryId, branchIntents.branchName],
        set: {
          notionPageId: parsedPayload.pageId,
          taskIdentifier,
          taskTitle,
          branchType,
          status: "waiting_for_push",
          verificationStrategy: verification.strategy,
          lastSyncedAt: now,
          updatedAt: now,
        },
      })
      .returning();

    if (!intent) {
      throw new Error("Branch intent could not be persisted");
    }

    await updateNotionTask({
      notionAccessToken: mappingRecord.notionWorkspace.accessToken,
      pageId: parsedPayload.pageId,
      mapping: mappingRecord,
      suggestedBranch: branchName,
      gitStatus: "Waiting for Push",
      lastSyncedAt: now.toISOString(),
    });

    await recordBranchIntentLifecycle({
      webhookDeliveryId,
      intent,
      message: `Suggested branch ${branchName}`,
      repositoryId: mappingRecord.repository.id,
      notionPageId: parsedPayload.pageId,
    });

    void posthogServer.capture({
      distinctId: mappingRecord.notionWorkspace.notionWorkspaceId,
      event: "branch_intent_started",
      properties: {
        repositoryId: mappingRecord.repository.id,
        notionPageId: parsedPayload.pageId,
        branchType,
        verificationStrategy: verification.strategy,
      },
    });

    logger.info("Started branch intent", {
      branchIntentId: intent.id,
      repositoryId: mappingRecord.repository.id,
      notionPageId: parsedPayload.pageId,
    });

    await markNotionDelivery(webhookDeliveryId, "processed", 200);

    return {
      statusCode: 200,
      body: {
        branchName,
        branchType,
        taskIdentifier,
        verificationStrategy: verification.strategy,
      },
    };
  } catch (error) {
    captureException(error, { service: "startBranchIntent" });
    logger.error("Failed to start branch intent", error);

    if (webhookDeliveryId) {
      await markNotionDelivery(
        webhookDeliveryId,
        "failed",
        400,
        "processing_failed",
      );
    }

    return {
      statusCode: 400,
      body: { error: "Unable to start branch intent" },
    };
  }
}

async function recordBranchIntentLifecycle(input: {
  webhookDeliveryId: string | null;
  intent: BranchIntent;
  repositoryId: string;
  notionPageId: string;
  message: string;
}): Promise<void> {
  await db.insert(syncEvents).values({
    webhookDeliveryId: input.webhookDeliveryId,
    repositoryId: input.repositoryId,
    branchIntentId: input.intent.id,
    source: "notion",
    eventType: "branch_intent_started",
    outcome: "success",
    notionPageId: input.notionPageId,
    externalId: input.intent.branchName,
    message: input.message,
    context: {
      branchType: input.intent.branchType,
      verificationStrategy: input.intent.verificationStrategy,
    },
  });

  await db.insert(auditEvents).values({
    repositoryId: input.repositoryId,
    branchIntentId: input.intent.id,
    actorType: "notion",
    action: "branch_intent.started",
    targetType: "branch_intent",
    targetId: input.intent.id,
    metadata: {
      branchName: input.intent.branchName,
      notionPageId: input.notionPageId,
    },
  });
}

async function markNotionDelivery(
  webhookDeliveryId: string | null,
  status: "processed" | "ignored" | "failed",
  responseStatus: number,
  errorCode?: string,
): Promise<void> {
  if (!webhookDeliveryId) {
    return;
  }

  await db
    .update(webhookDeliveries)
    .set({
      status,
      responseStatus,
      errorCode,
      processedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, webhookDeliveryId));
}
