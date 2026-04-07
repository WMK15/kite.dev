import { count, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  branchIntents,
  databaseMappings,
  repositories,
  type DatabaseMapping,
  type Repository,
} from "@/schema";
import type { DashboardSnapshot, IntegrationStatus } from "@/types/domain";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const db = getDb();
  const [
    repositoryCountRow,
    mappingCountRow,
    openIntentCountRow,
    recentSyncEvents,
    recentIntents,
  ] = await Promise.all([
    db.select({ value: count() }).from(repositories),
    db.select({ value: count() }).from(databaseMappings),
    db
      .select({ value: count() })
      .from(branchIntents)
      .where(
        inArray(branchIntents.status, [
          "waiting_for_push",
          "pushed",
          "pull_request_opened",
        ]),
      ),
    db.query.syncEvents.findMany({
      orderBy: (table, { desc: byDesc }) => [byDesc(table.occurredAt)],
      limit: 8,
    }),
    db.query.branchIntents.findMany({
      orderBy: (table, { desc: byDesc }) => [byDesc(table.updatedAt)],
      limit: 6,
      with: {
        repository: true,
        databaseMapping: true,
      },
    }),
  ]);

  return {
    repositoryCount: repositoryCountRow[0]?.value ?? 0,
    mappingCount: mappingCountRow[0]?.value ?? 0,
    openIntentCount: openIntentCountRow[0]?.value ?? 0,
    recentSyncEvents,
    recentBranchIntents: recentIntents.map((intent) => ({
      ...intent,
      repository: intent.repository as Repository,
      mapping: intent.databaseMapping as DatabaseMapping,
    })),
  };
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const db = getDb();
  const [workspaceRows, installationRows] = await Promise.all([
    db.query.notionWorkspaces.findMany({
      orderBy: (table, { desc: byDesc }) => [byDesc(table.updatedAt)],
    }),
    db.query.githubInstallations.findMany({
      orderBy: (table, { desc: byDesc }) => [byDesc(table.updatedAt)],
    }),
  ]);

  return {
    notionWorkspaces: workspaceRows,
    githubInstallations: installationRows,
  };
}

export async function getRepositoryMappings() {
  const db = getDb();
  return db.query.databaseMappings.findMany({
    orderBy: (table, { desc: byDesc }) => [byDesc(table.updatedAt)],
    with: {
      notionWorkspace: true,
      repository: true,
    },
  });
}

export async function getRecentSyncLog() {
  const db = getDb();
  return db.query.syncEvents.findMany({
    orderBy: (table, { desc: byDesc }) => [byDesc(table.occurredAt)],
    limit: 20,
    with: {
      repository: true,
      branchIntent: true,
    },
  });
}
