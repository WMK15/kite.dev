"use server";

import { revalidatePath } from "next/cache";

import {
  deleteGitHubInstallation,
  deleteNotionWorkspace,
} from "@/lib/services/integrations";
import { syncRepositoriesForInstallation } from "@/lib/services/sync-repositories";

export type SyncState =
  | { status: "idle" }
  | { status: "success"; syncedCount: number }
  | { status: "error"; message: string };

export async function syncRepositoriesAction(
  _prevState: SyncState,
  formData: FormData,
): Promise<SyncState> {
  const installationId = formData.get("installationId");

  if (typeof installationId !== "string" || !installationId) {
    return { status: "error", message: "Installation ID is required" };
  }

  const result = await syncRepositoriesForInstallation(installationId);

  if (!result.success) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/integrations");
  revalidatePath("/dashboard/repo-mappings");

  return { status: "success", syncedCount: result.syncedCount };
}

export async function deleteGitHubInstallationAction(
  installationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await deleteGitHubInstallation(installationId);

  if (!result.success) {
    return result;
  }

  revalidatePath("/integrations");
  revalidatePath("/dashboard/repo-mappings");

  return { success: true };
}

export async function deleteNotionWorkspaceAction(
  workspaceId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await deleteNotionWorkspace(workspaceId);

  if (!result.success) {
    return result;
  }

  revalidatePath("/integrations");
  revalidatePath("/dashboard/repo-mappings");

  return { success: true };
}
