"use server";

import { revalidatePath } from "next/cache";

import {
  createDatabaseMapping,
  createDatabaseMappingSchema,
  deleteDatabaseMapping,
  getDatabasesForWorkspace,
} from "@/lib/services/database-mapping";

export type NotionDatabase = {
  id: string;
  title: string;
};

export async function fetchDatabasesForWorkspace(
  workspaceId: string,
): Promise<NotionDatabase[]> {
  if (!workspaceId) {
    return [];
  }

  return getDatabasesForWorkspace(workspaceId);
}

export type CreateMappingState =
  | { status: "idle" }
  | { status: "success"; mappingId: string }
  | { status: "error"; message: string };

export async function createMappingAction(
  _prevState: CreateMappingState,
  formData: FormData,
): Promise<CreateMappingState> {
  const raw = {
    notionWorkspaceId: formData.get("notionWorkspaceId"),
    repositoryId: formData.get("repositoryId"),
    notionDatabaseId: formData.get("notionDatabaseId"),
    notionDatabaseName: formData.get("notionDatabaseName"),
    titleProperty: formData.get("titleProperty"),
    taskIdProperty: formData.get("taskIdProperty"),
    suggestedBranchProperty: formData.get("suggestedBranchProperty"),
    gitStatusProperty: formData.get("gitStatusProperty"),
    lastSyncedAtProperty: formData.get("lastSyncedAtProperty"),
    pullRequestUrlProperty: formData.get("pullRequestUrlProperty") || undefined,
    webhookSecret: formData.get("webhookSecret") || undefined,
    defaultBranchType: formData.get("defaultBranchType"),
  };

  const parsed = createDatabaseMappingSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      status: "error",
      message: firstError?.message ?? "Invalid form data",
    };
  }

  const result = await createDatabaseMapping(parsed.data);

  if (!result.success) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/dashboard/repo-mappings");

  return { status: "success", mappingId: result.mappingId };
}

export async function deleteMappingAction(
  mappingId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await deleteDatabaseMapping(mappingId);

  if (!result.success) {
    return result;
  }

  revalidatePath("/dashboard/repo-mappings");

  return { success: true };
}
