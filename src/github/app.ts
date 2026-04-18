import { App } from "@octokit/app";

import { serverEnv } from "@/env/server";

function parsePrivateKey(key: string): string {
  // If key already has proper PEM format with real newlines, use as-is
  if (key.includes("-----BEGIN") && key.includes("\n")) {
    return key;
  }

  // If key has escaped newlines (literal \n characters), convert them
  if (key.includes("\\n")) {
    return key.replace(/\\n/g, "\n");
  }

  // If key is base64 encoded (no dashes), decode it
  if (!key.includes("-----")) {
    return Buffer.from(key, "base64").toString("utf-8");
  }

  // Otherwise assume it's a single-line PEM and add newlines
  return key
    .replace(
      /-----BEGIN RSA PRIVATE KEY-----/,
      "-----BEGIN RSA PRIVATE KEY-----\n",
    )
    .replace(/-----END RSA PRIVATE KEY-----/, "\n-----END RSA PRIVATE KEY-----")
    .replace(/-----BEGIN PRIVATE KEY-----/, "-----BEGIN PRIVATE KEY-----\n")
    .replace(/-----END PRIVATE KEY-----/, "\n-----END PRIVATE KEY-----");
}

export function createGitHubApp(): App {
  return new App({
    appId: serverEnv.GITHUB_APP_ID,
    privateKey: parsePrivateKey(serverEnv.GITHUB_APP_PRIVATE_KEY),
  });
}

export async function getInstallationOctokit(installationId: number) {
  const app = createGitHubApp();
  return app.getInstallationOctokit(installationId);
}

export async function fetchInstallationRepositories(
  installationId: number,
): Promise<
  Array<{
    id: number;
    name: string;
    fullName: string;
    ownerLogin: string;
    defaultBranch: string;
    isPrivate: boolean;
  }>
> {
  const octokit = await getInstallationOctokit(installationId);
  const repos: Array<{
    id: number;
    name: string;
    fullName: string;
    ownerLogin: string;
    defaultBranch: string;
    isPrivate: boolean;
  }> = [];

  // Fetch first page and check for more
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await octokit.request("GET /installation/repositories", {
      per_page: 100,
      page,
    });

    for (const repo of response.data.repositories) {
      repos.push({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        ownerLogin: repo.owner.login,
        defaultBranch: repo.default_branch ?? "main",
        isPrivate: repo.private,
      });
    }

    hasMore = response.data.repositories.length === 100;
    page++;
  }

  return repos;
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
