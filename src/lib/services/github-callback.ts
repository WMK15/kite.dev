import { getDb } from "@/db";
import { fetchInstallation } from "@/github/app";
import { logger } from "@/observability/logger";
import { captureException } from "@/observability/sentry";
import { auditEvents, githubInstallations } from "@/schema";

export async function handleGitHubCallback(requestUrl: string): Promise<{
  redirectPath: string;
}> {
  const db = getDb();
  const url = new URL(requestUrl);
  const installationIdParam = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action") ?? "install";
  const oauthCode = url.searchParams.get("code");

  // Kite.dev uses GitHub App installation redirects and webhook deliveries.
  // This callback is for install and setup redirects, not signed webhook events.
  if (!installationIdParam) {
    logger.info("GitHub callback received without installation ID", {
      hasCode: Boolean(oauthCode),
      setupAction,
    });

    return {
      redirectPath: "/integrations?github=callback-missing-installation",
    };
  }

  const installationId = Number(installationIdParam);

  if (!Number.isInteger(installationId) || installationId <= 0) {
    return {
      redirectPath: "/integrations?github=callback-invalid-installation",
    };
  }

  try {
    const installation = await fetchInstallation(installationId);

    const [storedInstallation] = await db
      .insert(githubInstallations)
      .values({
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
          accountId: installation.accountId,
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          targetType: installation.targetType,
          permissions: installation.permissions,
        },
      })
      .returning();

    if (storedInstallation) {
      await db.insert(auditEvents).values({
        actorType: "github",
        actorId: String(installation.id),
        action: `github.installation.callback_${setupAction}`,
        targetType: "github_installation",
        targetId: storedInstallation.id,
        metadata: {
          accountLogin: installation.accountLogin,
        },
      });
    }

    return {
      redirectPath: `/integrations?github=${setupAction}&installation_id=${installation.id}`,
    };
  } catch (error) {
    captureException(error, {
      service: "handleGitHubCallback",
      installationId,
    });
    logger.error("Failed to process GitHub callback", error, {
      installationId,
      setupAction,
    });

    return {
      redirectPath: "/integrations?github=callback-failed",
    };
  }
}
