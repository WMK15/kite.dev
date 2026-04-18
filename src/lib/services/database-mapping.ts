import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { fetchNotionDatabases } from "@/notion/client";
import { databaseMappings, notionWorkspaces, repositories } from "@/schema";

export const createDatabaseMappingSchema = z.object({
  notionWorkspaceId: z.string().uuid("Invalid workspace ID"),
  repositoryId: z.string().uuid("Invalid repository ID"),
  notionDatabaseId: z
    .string()
    .min(1, "Notion database ID is required")
    .transform((v) => v.replace(/-/g, "")),
  notionDatabaseName: z.string().min(1, "Notion database name is required"),
  titleProperty: z.string().min(1, "Title property is required"),
  taskIdProperty: z.string().min(1, "Task ID property is required"),
  suggestedBranchProperty: z
    .string()
    .min(1, "Suggested branch property is required"),
  gitStatusProperty: z.string().min(1, "Git status property is required"),
  lastSyncedAtProperty: z
    .string()
    .min(1, "Last synced at property is required"),
  pullRequestUrlProperty: z.string().optional(),
  webhookSecret: z.string().optional(),
  defaultBranchType: z.enum([
    "feat",
    "fix",
    "chore",
    "docs",
    "refactor",
    "test",
  ]),
});

export type CreateDatabaseMappingInput = z.infer<
  typeof createDatabaseMappingSchema
>;

export type CreateDatabaseMappingResult =
  | { success: true; mappingId: string }
  | { success: false; error: string };

export async function createDatabaseMapping(
  input: CreateDatabaseMappingInput,
): Promise<CreateDatabaseMappingResult> {
  const db = getDb();

  // Verify workspace exists
  const workspace = await db.query.notionWorkspaces.findFirst({
    where: eq(notionWorkspaces.id, input.notionWorkspaceId),
  });

  if (!workspace) {
    return { success: false, error: "Notion workspace not found" };
  }

  // Verify repository exists
  const repository = await db.query.repositories.findFirst({
    where: eq(repositories.id, input.repositoryId),
  });

  if (!repository) {
    return { success: false, error: "Repository not found" };
  }

  // Check for existing mapping with same Notion database ID
  const existing = await db.query.databaseMappings.findFirst({
    where: eq(databaseMappings.notionDatabaseId, input.notionDatabaseId),
  });

  if (existing) {
    return {
      success: false,
      error: "A mapping already exists for this Notion database",
    };
  }

  // Create the mapping
  const [mapping] = await db
    .insert(databaseMappings)
    .values({
      notionWorkspaceId: input.notionWorkspaceId,
      repositoryId: input.repositoryId,
      notionDatabaseId: input.notionDatabaseId,
      notionDatabaseName: input.notionDatabaseName,
      titleProperty: input.titleProperty,
      taskIdProperty: input.taskIdProperty,
      suggestedBranchProperty: input.suggestedBranchProperty,
      gitStatusProperty: input.gitStatusProperty,
      lastSyncedAtProperty: input.lastSyncedAtProperty,
      pullRequestUrlProperty: input.pullRequestUrlProperty ?? null,
      webhookSecret: input.webhookSecret ?? null,
      defaultBranchType: input.defaultBranchType,
      active: true,
    })
    .returning({ id: databaseMappings.id });

  if (!mapping) {
    return { success: false, error: "Failed to create mapping" };
  }

  return { success: true, mappingId: mapping.id };
}

export async function getAvailableWorkspacesAndRepositories() {
  const db = getDb();

  const [workspaces, repos] = await Promise.all([
    db.query.notionWorkspaces.findMany({
      orderBy: (table, { asc }) => [asc(table.workspaceName)],
    }),
    db.query.repositories.findMany({
      orderBy: (table, { asc }) => [asc(table.fullName)],
    }),
  ]);

  return { workspaces, repositories: repos };
}

export async function getDatabasesForWorkspace(
  workspaceId: string,
): Promise<Array<{ id: string; title: string }>> {
  const db = getDb();

  const workspace = await db.query.notionWorkspaces.findFirst({
    where: eq(notionWorkspaces.id, workspaceId),
  });

  if (!workspace) {
    return [];
  }

  return fetchNotionDatabases(workspace.accessToken);
}

export async function deleteDatabaseMapping(
  mappingId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const db = getDb();

  const mapping = await db.query.databaseMappings.findFirst({
    where: eq(databaseMappings.id, mappingId),
  });

  if (!mapping) {
    return { success: false, error: "Mapping not found" };
  }

  await db.delete(databaseMappings).where(eq(databaseMappings.id, mappingId));

  return { success: true };
}
