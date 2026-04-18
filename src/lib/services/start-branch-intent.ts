import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
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

/**
 * Internal normalised shape after extracting IDs from various payload formats.
 */
const normalisedInputSchema = z.object({
  pageId: z.string().min(1),
  databaseId: z.string().min(1),
  branchType: z
    .enum(["feat", "fix", "chore", "docs", "refactor", "test"])
    .optional(),
});

type NormalisedInput = z.infer<typeof normalisedInputSchema>;

/**
 * Extract pageId and databaseId from various Notion webhook payload shapes.
 *
 * Supported formats:
 * 1. Direct: { pageId, databaseId, branchType? }
 * 2. Notion page object: { id, parent: { database_id } }
 * 3. Nested data: { data: { id, parent: { database_id } } }
 * 4. Nested page: { page: { id, parent: { database_id } } }
 * 5. With source info: { source: { database_id }, data: { id } }
 */
function normalisePayload(raw: unknown): NormalisedInput | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const payload = raw as Record<string, unknown>;

  // Format 1: Direct shape { pageId, databaseId }
  if (
    typeof payload["pageId"] === "string" &&
    typeof payload["databaseId"] === "string"
  ) {
    return {
      pageId: payload["pageId"],
      databaseId: payload["databaseId"],
      branchType: extractBranchType(payload["branchType"]),
    };
  }

  // Format 2: Notion page object { id, parent: { type: "database_id", database_id } }
  const pageId = extractPageId(payload);
  const databaseId = extractDatabaseId(payload);

  if (pageId && databaseId) {
    return {
      pageId,
      databaseId,
      branchType: extractBranchType(payload["branchType"]),
    };
  }

  // Format 3: Nested under "data" key
  if (typeof payload["data"] === "object" && payload["data"] !== null) {
    const data = payload["data"] as Record<string, unknown>;
    const nestedPageId = extractPageId(data);
    const nestedDatabaseId =
      extractDatabaseId(data) ?? extractDatabaseId(payload);

    if (nestedPageId && nestedDatabaseId) {
      return {
        pageId: nestedPageId,
        databaseId: nestedDatabaseId,
        branchType: extractBranchType(payload["branchType"]),
      };
    }
  }

  // Format 4: Nested under "page" key
  if (typeof payload["page"] === "object" && payload["page"] !== null) {
    const page = payload["page"] as Record<string, unknown>;
    const nestedPageId = extractPageId(page);
    const nestedDatabaseId =
      extractDatabaseId(page) ?? extractDatabaseId(payload);

    if (nestedPageId && nestedDatabaseId) {
      return {
        pageId: nestedPageId,
        databaseId: nestedDatabaseId,
        branchType: extractBranchType(payload["branchType"]),
      };
    }
  }

  // Format 5: Source contains database_id
  if (typeof payload["source"] === "object" && payload["source"] !== null) {
    const source = payload["source"] as Record<string, unknown>;
    const sourceDatabaseId =
      typeof source["database_id"] === "string"
        ? source["database_id"]
        : undefined;
    const dataPageId =
      typeof payload["data"] === "object" && payload["data"] !== null
        ? extractPageId(payload["data"] as Record<string, unknown>)
        : undefined;

    if (dataPageId && sourceDatabaseId) {
      return {
        pageId: dataPageId,
        databaseId: sourceDatabaseId,
        branchType: extractBranchType(payload["branchType"]),
      };
    }
  }

  return null;
}

function extractPageId(obj: Record<string, unknown>): string | undefined {
  // Direct "id" field
  if (typeof obj["id"] === "string" && obj["id"].length > 0) {
    return obj["id"];
  }
  // Nested "page_id" field
  if (typeof obj["page_id"] === "string" && obj["page_id"].length > 0) {
    return obj["page_id"];
  }
  return undefined;
}

function extractDatabaseId(obj: Record<string, unknown>): string | undefined {
  // Direct "database_id" field
  if (typeof obj["database_id"] === "string" && obj["database_id"].length > 0) {
    return obj["database_id"];
  }

  // Direct "data_source_id" field (newer Notion API terminology)
  if (
    typeof obj["data_source_id"] === "string" &&
    obj["data_source_id"].length > 0
  ) {
    return obj["data_source_id"];
  }

  // Nested in "parent" object
  if (typeof obj["parent"] === "object" && obj["parent"] !== null) {
    const parent = obj["parent"] as Record<string, unknown>;
    if (
      typeof parent["database_id"] === "string" &&
      parent["database_id"].length > 0
    ) {
      return parent["database_id"];
    }
    // Also check data_source_id in parent
    if (
      typeof parent["data_source_id"] === "string" &&
      parent["data_source_id"].length > 0
    ) {
      return parent["data_source_id"];
    }
  }

  return undefined;
}

function extractBranchType(
  value: unknown,
): "feat" | "fix" | "chore" | "docs" | "refactor" | "test" | undefined {
  const validTypes = ["feat", "fix", "chore", "docs", "refactor", "test"];
  if (typeof value === "string" && validTypes.includes(value)) {
    return value as "feat" | "fix" | "chore" | "docs" | "refactor" | "test";
  }
  return undefined;
}

/**
 * Get a sanitised summary of payload shape for debugging.
 * Does not include values, only structure.
 */
function describePayloadShape(obj: unknown, depth = 0): string {
  if (depth > 3) return "...";
  if (obj === null) return "null";
  if (typeof obj !== "object") return typeof obj;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return `[${describePayloadShape(obj[0], depth + 1)}]`;
  }

  const keys = Object.keys(obj as Record<string, unknown>).slice(0, 10);
  const entries = keys.map((k) => {
    const value = (obj as Record<string, unknown>)[k];
    return `${k}: ${describePayloadShape(value, depth + 1)}`;
  });

  return `{ ${entries.join(", ")} }`;
}

export async function startBranchIntent(input: {
  payload: string;
  providedSecret: string | null;
  deliveryId: string | null;
}): Promise<WebhookProcessingResult> {
  let webhookDeliveryId: string | null = null;
  const db = getDb();

  try {
    // Parse raw JSON
    let rawPayload: unknown;
    try {
      rawPayload = JSON.parse(input.payload) as unknown;
    } catch {
      logger.warn("Invalid JSON in start-branch webhook payload");
      return {
        statusCode: 400,
        body: { error: "Invalid JSON payload" },
      };
    }

    // Log payload shape for debugging (no sensitive values)
    logger.info("Received start-branch webhook", {
      payloadShape: describePayloadShape(rawPayload),
      topLevelKeys:
        typeof rawPayload === "object" && rawPayload !== null
          ? Object.keys(rawPayload).slice(0, 15)
          : [],
    });

    // Normalise into internal shape
    const normalised = normalisePayload(rawPayload);

    if (!normalised) {
      const topKeys =
        typeof rawPayload === "object" && rawPayload !== null
          ? Object.keys(rawPayload).slice(0, 10)
          : [];

      logger.warn("Could not extract pageId/databaseId from webhook payload", {
        observedKeys: topKeys,
        payloadShape: describePayloadShape(rawPayload),
      });

      return {
        statusCode: 400,
        body: {
          error: "Could not extract pageId and databaseId from payload",
          hint: "Expected either { pageId, databaseId } or a Notion page object with { id, parent: { database_id } }",
          observedKeys: topKeys,
        },
      };
    }

    // Validate normalised shape
    const parseResult = normalisedInputSchema.safeParse(normalised);
    if (!parseResult.success) {
      logger.warn("Normalised payload failed validation", {
        issues: parseResult.error.issues,
      });
      return {
        statusCode: 400,
        body: {
          error: "Invalid payload after normalisation",
          issues: parseResult.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      };
    }

    const parsedPayload = parseResult.data;

    // Log extracted IDs for debugging
    logger.info("Extracted IDs from webhook payload", {
      pageId: parsedPayload.pageId,
      databaseId: parsedPayload.databaseId,
      branchType: parsedPayload.branchType ?? "default",
    });

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
        eq(
          databaseMappings.notionDatabaseId,
          parsedPayload.databaseId.replace(/-/g, ""),
        ),
        eq(databaseMappings.active, true),
      ),
      with: {
        notionWorkspace: true,
        repository: true,
      },
    });

    if (!mappingRecord) {
      logger.warn("No database mapping found for Notion database", {
        databaseId: parsedPayload.databaseId,
        pageId: parsedPayload.pageId,
      });

      await markNotionDelivery(
        webhookDeliveryId,
        "ignored",
        404,
        "mapping_not_found",
      );
      return {
        statusCode: 404,
        body: {
          error: "Database mapping not found",
          databaseId: parsedPayload.databaseId,
          hint: "Ensure this Notion database is connected to a repository in Kite",
        },
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

    logger.info("Fetching Notion page", { pageId: parsedPayload.pageId });
    const page = await notion.pages.retrieve({ page_id: parsedPayload.pageId });
    logger.info("Fetched Notion page", {
      hasParent: "parent" in page,
      parentType: "parent" in page ? page.parent.type : null,
    });

    if (
      !("parent" in page) ||
      (page.parent.type !== "database_id" &&
        page.parent.type !== "data_source_id")
    ) {
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

    // Get the database ID from parent - could be database_id or data_source_id depending on API version
    const parentDatabaseId =
      page.parent.type === "database_id"
        ? page.parent.database_id
        : (page.parent as { data_source_id: string }).data_source_id;

    // Normalize database IDs for comparison (remove dashes)
    const pageParentDbId = parentDatabaseId.replace(/-/g, "");
    const mappedDbId = mappingRecord.notionDatabaseId.replace(/-/g, "");

    logger.info("Comparing database IDs", {
      pageParentDbId,
      mappedDbId,
      match: pageParentDbId === mappedDbId,
    });

    if (pageParentDbId !== mappedDbId) {
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
    logger.error("Failed to start branch intent", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

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
  const db = getDb();
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
  const db = getDb();
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
