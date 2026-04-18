import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { githubInstallations, notionWorkspaces } from "@/schema";

export async function deleteGitHubInstallation(
  installationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const db = getDb();

  const installation = await db.query.githubInstallations.findFirst({
    where: eq(githubInstallations.id, installationId),
  });

  if (!installation) {
    return { success: false, error: "Installation not found" };
  }

  await db
    .delete(githubInstallations)
    .where(eq(githubInstallations.id, installationId));

  return { success: true };
}

export async function deleteNotionWorkspace(
  workspaceId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const db = getDb();

  const workspace = await db.query.notionWorkspaces.findFirst({
    where: eq(notionWorkspaces.id, workspaceId),
  });

  if (!workspace) {
    return { success: false, error: "Workspace not found" };
  }

  await db.delete(notionWorkspaces).where(eq(notionWorkspaces.id, workspaceId));

  return { success: true };
}
