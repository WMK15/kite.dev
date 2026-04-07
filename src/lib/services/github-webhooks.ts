import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { serverEnv } from "@/env/server";
import { logger } from "@/observability/logger";
import { posthogServer } from "@/observability/posthog";
import { captureException } from "@/observability/sentry";
import {
  auditEvents,
  branchIntents,
  githubInstallations,
  pullRequests,
  repositories,
  syncEvents,
  webhookDeliveries,
} from "@/schema";
import { verifyGitHubWebhookRequest } from "@/security/github-webhooks";
import type { WebhookProcessingResult } from "@/types/domain";
import { matchBranchIntentByBranchName } from "@/utils/branch-matching";
import {
  extractBranchFromRef,
  normaliseRepositoryFullName,
} from "@/utils/github";

import { updateNotionTask } from "./update-notion-task";

type InstallationAccountPayload = {
  login?: string;
  id?: number;
  type?: string;
};

type InstallationWebhookPayload = {
  id: number;
  account?: InstallationAccountPayload;
  target_type?: string;
  permissions?: Record<string, string>;
};

type RepositoryWebhookPayload = {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  owner?: InstallationAccountPayload;
};

type PushPayload = {
  installation?: InstallationWebhookPayload;
  repository?: RepositoryWebhookPayload;
  ref?: string;
  after?: string;
};

type PullRequestPayload = {
  installation?: InstallationWebhookPayload;
  action?: string;
  repository?: RepositoryWebhookPayload;
  pull_request?: {
    id: number;
    number: number;
    title: string;
    html_url: string;
    draft: boolean;
    state: "open" | "closed";
    merged_at: string | null;
    head?: { ref?: string };
    base?: { ref?: string };
    created_at: string;
    closed_at: string | null;
  };
};

type InstallationEventPayload = {
  action?: string;
  installation?: InstallationWebhookPayload;
  repositories?: RepositoryWebhookPayload[];
};

type InstallationRepositoriesPayload = {
  action?: string;
  installation?: InstallationWebhookPayload;
  repositories_added?: RepositoryWebhookPayload[];
  repositories_removed?: RepositoryWebhookPayload[];
};

export async function handleGitHubWebhook(input: {
  payload: string;
  headers: Headers;
}): Promise<WebhookProcessingResult> {
  let deliveryRowId: string | null = null;
  const db = getDb();

  try {
    const verified = verifyGitHubWebhookRequest({
      payload: input.payload,
      signature: input.headers.get("x-hub-signature-256"),
      deliveryId: input.headers.get("x-github-delivery"),
      eventName: input.headers.get("x-github-event"),
      secret: serverEnv.GITHUB_WEBHOOK_SECRET,
    });

    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        source: "github",
        deliveryId: verified.deliveryId,
        eventName: verified.eventName,
        signatureVerified: true,
        payloadHash: verified.payloadHash,
        context: {},
      })
      .onConflictDoNothing()
      .returning({ id: webhookDeliveries.id });

    if (!delivery) {
      return {
        statusCode: 200,
        body: { ok: true, duplicate: true },
      };
    }

    deliveryRowId = delivery.id;

    const parsed = JSON.parse(input.payload) as unknown;

    switch (verified.eventName) {
      case "push":
        await handlePushEvent(parsed as PushPayload, delivery.id);
        break;
      case "pull_request":
        await handlePullRequestEvent(parsed as PullRequestPayload, delivery.id);
        break;
      case "installation":
        await handleInstallationEvent(
          parsed as InstallationEventPayload,
          delivery.id,
        );
        break;
      case "installation_repositories":
        await handleInstallationRepositoriesEvent(
          parsed as InstallationRepositoriesPayload,
          delivery.id,
        );
        break;
      default:
        await markWebhookDelivery(delivery.id, "ignored", 200);
        return {
          statusCode: 200,
          body: { ok: true, ignored: true },
        };
    }

    await markWebhookDelivery(delivery.id, "processed", 200);

    return {
      statusCode: 200,
      body: { ok: true },
    };
  } catch (error) {
    captureException(error, { service: "handleGitHubWebhook" });
    logger.error("Failed to process GitHub webhook", error);

    if (deliveryRowId) {
      await db
        .update(webhookDeliveries)
        .set({
          status: "failed",
          responseStatus: 400,
          errorCode: "processing_failed",
          processedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryRowId));
    }

    return {
      statusCode: 400,
      body: { error: "GitHub webhook processing failed" },
    };
  }
}

export async function handlePushEvent(
  payload: PushPayload,
  webhookDeliveryId: string,
): Promise<void> {
  const db = getDb();
  const branchName = payload.ref ? extractBranchFromRef(payload.ref) : null;
  const repository = payload.repository;

  if (
    !branchName ||
    !repository ||
    !payload.installation?.id ||
    !repository.owner?.login
  ) {
    await recordSyncEvent({
      webhookDeliveryId,
      source: "github",
      eventType: "branch_pushed",
      outcome: "ignored",
      message: "Push event did not include a usable branch or repository",
      context: {},
    });
    return;
  }

  const storedRepository = await upsertRepositoryFromWebhook({
    installation: payload.installation,
    repository,
  });

  const candidateIntents = await db.query.branchIntents.findMany({
    where: and(
      eq(branchIntents.repositoryId, storedRepository.id),
      eq(branchIntents.branchName, branchName),
    ),
  });
  const matchedIntent = matchBranchIntentByBranchName(
    candidateIntents,
    branchName,
  );

  if (!matchedIntent) {
    await recordSyncEvent({
      webhookDeliveryId,
      repositoryId: storedRepository.id,
      source: "github",
      eventType: "branch_pushed",
      outcome: "ignored",
      externalId: branchName,
      message: "No tracked branch intent matched the pushed branch",
      context: {
        repositoryFullName: storedRepository.fullName,
      },
    });
    return;
  }

  const now = new Date();
  const [updatedIntent] = await db
    .update(branchIntents)
    .set({
      status: "pushed",
      latestCommitSha: payload.after ?? null,
      pushedAt: now,
      lastSyncedAt: now,
      updatedAt: now,
    })
    .where(eq(branchIntents.id, matchedIntent.id))
    .returning();

  if (!updatedIntent) {
    throw new Error("Branch intent could not be updated for push event");
  }

  const hydratedIntent = await db.query.branchIntents.findFirst({
    where: eq(branchIntents.id, updatedIntent.id),
    with: {
      databaseMapping: {
        with: {
          notionWorkspace: true,
        },
      },
      repository: true,
    },
  });

  if (!hydratedIntent) {
    throw new Error("Updated branch intent could not be reloaded");
  }

  await updateNotionTask({
    notionAccessToken:
      hydratedIntent.databaseMapping.notionWorkspace.accessToken,
    pageId: hydratedIntent.notionPageId,
    mapping: hydratedIntent.databaseMapping,
    suggestedBranch: hydratedIntent.branchName,
    gitStatus: "Branch Pushed",
    lastSyncedAt: now.toISOString(),
  });

  await recordSyncEvent({
    webhookDeliveryId,
    repositoryId: hydratedIntent.repository.id,
    branchIntentId: hydratedIntent.id,
    source: "github",
    eventType: "branch_pushed",
    outcome: "success",
    notionPageId: hydratedIntent.notionPageId,
    externalId: hydratedIntent.branchName,
    message: `Recorded push for ${hydratedIntent.branchName}`,
    context: {
      latestCommitSha: hydratedIntent.latestCommitSha,
    },
  });

  await db.insert(auditEvents).values({
    repositoryId: hydratedIntent.repository.id,
    branchIntentId: hydratedIntent.id,
    actorType: "github",
    actorId: String(payload.installation.id),
    action: "branch_intent.push_detected",
    targetType: "branch_intent",
    targetId: hydratedIntent.id,
    metadata: {
      branchName: hydratedIntent.branchName,
      latestCommitSha: hydratedIntent.latestCommitSha,
    },
  });

  void posthogServer.capture({
    distinctId: storedRepository.fullName,
    event: "branch_pushed",
    properties: {
      branchName,
      repositoryId: storedRepository.id,
    },
  });
}

export async function handlePullRequestEvent(
  payload: PullRequestPayload,
  webhookDeliveryId: string,
): Promise<void> {
  const db = getDb();
  const repository = payload.repository;
  const pullRequest = payload.pull_request;
  const branchName = pullRequest?.head?.ref ?? null;

  if (
    !repository ||
    !pullRequest ||
    !branchName ||
    !payload.installation?.id ||
    !repository.owner?.login
  ) {
    await recordSyncEvent({
      webhookDeliveryId,
      source: "github",
      eventType: "pull_request_linked",
      outcome: "ignored",
      message: "Pull request event did not include a tracked branch",
      context: {},
    });
    return;
  }

  const storedRepository = await upsertRepositoryFromWebhook({
    installation: payload.installation,
    repository,
  });

  const intent = await db.query.branchIntents.findFirst({
    where: and(
      eq(branchIntents.repositoryId, storedRepository.id),
      eq(branchIntents.branchName, branchName),
    ),
    with: {
      databaseMapping: {
        with: {
          notionWorkspace: true,
        },
      },
      repository: true,
    },
  });

  if (!intent) {
    await recordSyncEvent({
      webhookDeliveryId,
      repositoryId: storedRepository.id,
      source: "github",
      eventType: "pull_request_linked",
      outcome: "ignored",
      externalId: branchName,
      message: "No tracked branch intent matched the pull request branch",
      context: {
        pullRequestNumber: pullRequest.number,
      },
    });
    return;
  }

  const now = new Date();
  const prState = pullRequest.merged_at
    ? "merged"
    : pullRequest.draft
      ? "draft"
      : pullRequest.state;

  await db
    .insert(pullRequests)
    .values({
      branchIntentId: intent.id,
      repositoryId: storedRepository.id,
      githubPullRequestId: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
      url: pullRequest.html_url,
      state: prState,
      baseBranch: pullRequest.base?.ref ?? storedRepository.defaultBranch,
      headBranch: branchName,
      openedAt: new Date(pullRequest.created_at),
      mergedAt: pullRequest.merged_at ? new Date(pullRequest.merged_at) : null,
      closedAt: pullRequest.closed_at ? new Date(pullRequest.closed_at) : null,
    })
    .onConflictDoUpdate({
      target: pullRequests.githubPullRequestId,
      set: {
        title: pullRequest.title,
        url: pullRequest.html_url,
        state: prState,
        baseBranch: pullRequest.base?.ref ?? storedRepository.defaultBranch,
        headBranch: branchName,
        mergedAt: pullRequest.merged_at
          ? new Date(pullRequest.merged_at)
          : null,
        closedAt: pullRequest.closed_at
          ? new Date(pullRequest.closed_at)
          : null,
        updatedAt: now,
      },
    });

  const status =
    prState === "merged"
      ? "Merged"
      : prState === "closed"
        ? "PR Closed"
        : "PR Opened";
  const intentStatus =
    prState === "merged"
      ? "merged"
      : prState === "closed"
        ? "closed"
        : "pull_request_opened";

  await db
    .update(branchIntents)
    .set({
      status: intentStatus,
      lastSyncedAt: now,
      updatedAt: now,
    })
    .where(eq(branchIntents.id, intent.id));

  await updateNotionTask({
    notionAccessToken: intent.databaseMapping.notionWorkspace.accessToken,
    pageId: intent.notionPageId,
    mapping: intent.databaseMapping,
    suggestedBranch: intent.branchName,
    gitStatus: status,
    lastSyncedAt: now.toISOString(),
    pullRequestUrl: pullRequest.html_url,
  });

  await recordSyncEvent({
    webhookDeliveryId,
    repositoryId: storedRepository.id,
    branchIntentId: intent.id,
    source: "github",
    eventType: "pull_request_linked",
    outcome: "success",
    notionPageId: intent.notionPageId,
    externalId: String(pullRequest.number),
    message: `Linked pull request #${pullRequest.number}`,
    context: {
      branchName,
      prState,
      action: payload.action ?? "unknown",
    },
  });

  await db.insert(auditEvents).values({
    repositoryId: storedRepository.id,
    branchIntentId: intent.id,
    actorType: "github",
    actorId: String(payload.installation.id),
    action: "branch_intent.pull_request_linked",
    targetType: "pull_request",
    targetId: String(pullRequest.id),
    metadata: {
      branchName,
      url: pullRequest.html_url,
      state: prState,
    },
  });

  void posthogServer.capture({
    distinctId: storedRepository.fullName,
    event: "pull_request_linked",
    properties: {
      branchName,
      pullRequestNumber: pullRequest.number,
      state: prState,
    },
  });
}

export async function handleInstallationEvent(
  payload: InstallationEventPayload,
  webhookDeliveryId: string,
): Promise<void> {
  const db = getDb();
  if (!payload.installation) {
    await recordSyncEvent({
      webhookDeliveryId,
      source: "github",
      eventType: "installation_synced",
      outcome: "ignored",
      message: "Installation event did not include installation metadata",
      context: {},
    });
    return;
  }

  const installation = await upsertInstallationRecord(payload.installation);
  const action = payload.action ?? "unknown";

  if (action === "deleted" || action === "suspend") {
    await db
      .update(repositories)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(repositories.githubInstallationId, installation.id));
  }

  if (
    payload.repositories?.length &&
    action !== "deleted" &&
    action !== "suspend"
  ) {
    await Promise.all(
      payload.repositories
        .filter((repository) => Boolean(repository.owner?.login))
        .map((repository) =>
          upsertRepositoryRecord({
            githubInstallationId: installation.id,
            repository,
          }),
        ),
    );
  }

  await recordSyncEvent({
    webhookDeliveryId,
    source: "github",
    eventType: "installation_synced",
    outcome: "success",
    externalId: String(payload.installation.id),
    message: `Processed installation event: ${action}`,
    context: {
      accountLogin: installation.accountLogin,
      repositoryCount: payload.repositories?.length ?? 0,
    },
  });

  await db.insert(auditEvents).values({
    actorType: "github",
    actorId: String(payload.installation.id),
    action: `github.installation.${action}`,
    targetType: "github_installation",
    targetId: installation.id,
    metadata: {
      accountLogin: installation.accountLogin,
    },
  });
}

export async function handleInstallationRepositoriesEvent(
  payload: InstallationRepositoriesPayload,
  webhookDeliveryId: string,
): Promise<void> {
  const db = getDb();
  if (!payload.installation) {
    await recordSyncEvent({
      webhookDeliveryId,
      source: "github",
      eventType: "repository_synced",
      outcome: "ignored",
      message: "Repository sync event did not include installation metadata",
      context: {},
    });
    return;
  }

  const installation = await upsertInstallationRecord(payload.installation);
  const repositoriesAdded = payload.repositories_added ?? [];
  const repositoriesRemoved = payload.repositories_removed ?? [];

  if (repositoriesAdded.length > 0) {
    await Promise.all(
      repositoriesAdded
        .filter((repository) => Boolean(repository.owner?.login))
        .map((repository) =>
          upsertRepositoryRecord({
            githubInstallationId: installation.id,
            repository,
          }),
        ),
    );
  }

  const removedRepositoryIds = repositoriesRemoved.map(
    (repository) => repository.id,
  );

  if (removedRepositoryIds.length > 0) {
    await db
      .update(repositories)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(repositories.githubInstallationId, installation.id),
          inArray(repositories.githubRepositoryId, removedRepositoryIds),
        ),
      );
  }

  await recordSyncEvent({
    webhookDeliveryId,
    source: "github",
    eventType: "repository_synced",
    outcome: "success",
    externalId: String(payload.installation.id),
    message: "Processed installation repository changes",
    context: {
      added: repositoriesAdded.length,
      removed: repositoriesRemoved.length,
      accountLogin: installation.accountLogin,
    },
  });

  await db.insert(auditEvents).values({
    actorType: "github",
    actorId: String(payload.installation.id),
    action: `github.installation_repositories.${payload.action ?? "unknown"}`,
    targetType: "github_installation",
    targetId: installation.id,
    metadata: {
      added: repositoriesAdded.length,
      removed: repositoriesRemoved.length,
    },
  });
}

async function markWebhookDelivery(
  webhookDeliveryId: string,
  status: "processed" | "ignored",
  responseStatus: number,
): Promise<void> {
  const db = getDb();
  await db
    .update(webhookDeliveries)
    .set({
      status,
      responseStatus,
      processedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, webhookDeliveryId));
}

async function recordSyncEvent(input: {
  webhookDeliveryId?: string;
  repositoryId?: string;
  branchIntentId?: string;
  source: "github" | "notion";
  eventType:
    | "branch_intent_started"
    | "branch_pushed"
    | "pull_request_linked"
    | "installation_synced"
    | "repository_synced";
  outcome: "success" | "ignored" | "failed";
  notionPageId?: string;
  externalId?: string;
  message: string;
  context: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  await db.insert(syncEvents).values({
    webhookDeliveryId: input.webhookDeliveryId,
    repositoryId: input.repositoryId,
    branchIntentId: input.branchIntentId,
    source: input.source,
    eventType: input.eventType,
    outcome: input.outcome,
    notionPageId: input.notionPageId,
    externalId: input.externalId,
    message: input.message,
    context: input.context,
  });
}

async function upsertInstallationRecord(input: InstallationWebhookPayload) {
  const db = getDb();
  const [installation] = await db
    .insert(githubInstallations)
    .values({
      githubInstallationId: input.id,
      accountId: input.account?.id ?? 0,
      accountLogin: input.account?.login ?? "unknown",
      accountType: input.account?.type ?? "User",
      targetType: input.target_type ?? input.account?.type ?? "User",
      permissions: input.permissions ?? {},
    })
    .onConflictDoUpdate({
      target: githubInstallations.githubInstallationId,
      set: {
        accountId: input.account?.id ?? 0,
        accountLogin: input.account?.login ?? "unknown",
        accountType: input.account?.type ?? "User",
        targetType: input.target_type ?? input.account?.type ?? "User",
        permissions: input.permissions ?? {},
      },
    })
    .returning();

  if (!installation) {
    throw new Error("GitHub installation could not be persisted");
  }

  return installation;
}

async function upsertRepositoryRecord(input: {
  githubInstallationId: string;
  repository: RepositoryWebhookPayload;
}) {
  const db = getDb();
  const repositoryFullName = normaliseRepositoryFullName(
    input.repository.owner?.login ??
      input.repository.full_name.split("/")[0] ??
      "unknown",
    input.repository.name,
  );

  const [repository] = await db
    .insert(repositories)
    .values({
      githubInstallationId: input.githubInstallationId,
      githubRepositoryId: input.repository.id,
      owner:
        input.repository.owner?.login ??
        input.repository.full_name.split("/")[0] ??
        "unknown",
      name: input.repository.name,
      fullName: repositoryFullName,
      defaultBranch: input.repository.default_branch,
      isPrivate: input.repository.private,
      active: true,
    })
    .onConflictDoUpdate({
      target: repositories.githubRepositoryId,
      set: {
        githubInstallationId: input.githubInstallationId,
        owner:
          input.repository.owner?.login ??
          input.repository.full_name.split("/")[0] ??
          "unknown",
        name: input.repository.name,
        fullName: repositoryFullName,
        defaultBranch: input.repository.default_branch,
        isPrivate: input.repository.private,
        active: true,
      },
    })
    .returning();

  if (!repository) {
    throw new Error("Repository could not be persisted");
  }

  return repository;
}

async function upsertRepositoryFromWebhook(input: {
  installation: InstallationWebhookPayload;
  repository: RepositoryWebhookPayload;
}) {
  const installation = await upsertInstallationRecord(input.installation);

  return upsertRepositoryRecord({
    githubInstallationId: installation.id,
    repository: input.repository,
  });
}
