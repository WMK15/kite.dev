import { App } from "@octokit/app";

import { serverEnv } from "@/env/server";

export function createGitHubApp(): App {
  return new App({
    appId: serverEnv.GITHUB_APP_ID,
    privateKey: serverEnv.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });
}

export async function fetchInstallation(installationId: number): Promise<{
  id: number;
  accountId: number;
  accountLogin: string;
  accountType: string;
  targetType: string;
  permissions: Record<string, string>;
}> {
  const octokit = createGitHubApp().octokit;
  const response = await octokit.request(
    "GET /app/installations/{installation_id}",
    {
      installation_id: installationId,
    },
  );

  const account = response.data.account;
  const accountLogin =
    account && "login" in account
      ? account.login
      : account && "slug" in account
        ? account.slug
        : "unknown";
  const accountType =
    account && "type" in account ? account.type : "Organization";

  return {
    id: response.data.id,
    accountId: account?.id ?? 0,
    accountLogin,
    accountType,
    targetType: response.data.target_type,
    permissions: Object.fromEntries(
      Object.entries(response.data.permissions ?? {}).map(([key, value]) => [
        key,
        String(value),
      ]),
    ),
  };
}
