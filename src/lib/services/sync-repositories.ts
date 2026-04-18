import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { fetchInstallationRepositories } from "@/github/app";
import { githubInstallations, repositories } from "@/schema";

export type SyncRepositoriesResult =
  | { success: true; syncedCount: number }
  | { success: false; error: string };

export async function syncRepositoriesForInstallation(
  installationId: string,
): Promise<SyncRepositoriesResult> {
  const db = getDb();

  // Find the installation
  const installation = await db.query.githubInstallations.findFirst({
    where: eq(githubInstallations.id, installationId),
  });

  if (!installation) {
    return { success: false, error: "Installation not found" };
  }

  // Fetch repositories from GitHub API
  const githubRepos = await fetchInstallationRepositories(
    installation.githubInstallationId,
  );

  if (githubRepos.length === 0) {
    return { success: true, syncedCount: 0 };
  }

  // Upsert all repositories
  for (const repo of githubRepos) {
    await db
      .insert(repositories)
      .values({
        githubInstallationId: installation.id,
        githubRepositoryId: repo.id,
        owner: repo.ownerLogin,
        name: repo.name,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        isPrivate: repo.isPrivate,
        active: true,
      })
      .onConflictDoUpdate({
        target: repositories.githubRepositoryId,
        set: {
          githubInstallationId: installation.id,
          owner: repo.ownerLogin,
          name: repo.name,
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
          isPrivate: repo.isPrivate,
          active: true,
        },
      });
  }

  return { success: true, syncedCount: githubRepos.length };
}
