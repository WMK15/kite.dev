import { db } from "@/db";
import {
  exchangeGitHubUserCode,
  fetchGitHubUser,
  fetchInstallation,
} from "@/github/app";
import { auditEvents, githubInstallations, users } from "@/schema";

export async function completeGitHubAuth(input: {
  code: string;
  installationId?: number;
}): Promise<string> {
  const token = await exchangeGitHubUserCode(input.code);
  const githubUser = await fetchGitHubUser(token.accessToken);

  const [user] = await db
    .insert(users)
    .values({
      githubUserId: githubUser.id,
      email: githubUser.email,
      name: githubUser.name ?? githubUser.login,
      avatarUrl: githubUser.avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.githubUserId,
      set: {
        email: githubUser.email,
        name: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatarUrl,
      },
    })
    .returning();

  if (!user) {
    throw new Error("GitHub user could not be persisted");
  }

  if (input.installationId) {
    const installation = await fetchInstallation(input.installationId);

    await db
      .insert(githubInstallations)
      .values({
        userId: user.id,
        githubInstallationId: installation.id,
        accountId: installation.accountId,
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
        targetType: installation.targetType,
        permissions: installation.permissions,
      })
      .onConflictDoUpdate({
        target: githubInstallations.githubInstallationId,
        set: {
          userId: user.id,
          accountId: installation.accountId,
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          targetType: installation.targetType,
          permissions: installation.permissions,
        },
      });
  }

  await db.insert(auditEvents).values({
    actorType: "github",
    actorId: String(githubUser.id),
    action: "github.user.connected",
    targetType: "user",
    targetId: user.id,
    metadata: {
      login: githubUser.login,
    },
  });

  return "/integrations?github=connected";
}
