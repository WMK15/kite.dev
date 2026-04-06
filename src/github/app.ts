import { App } from "@octokit/app";

import { serverEnv } from "@/env/server";

export function createGitHubApp(): App {
  return new App({
    appId: serverEnv.GITHUB_APP_ID,
    privateKey: serverEnv.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });
}

export async function exchangeGitHubUserCode(code: string): Promise<{
  accessToken: string;
  tokenType: string;
  scope: string;
}> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: serverEnv.GITHUB_APP_CLIENT_ID,
      client_secret: serverEnv.GITHUB_APP_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange GitHub code");
  }

  const payload = (await response.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
  };

  if (!payload.access_token || !payload.token_type) {
    throw new Error(payload.error ?? "GitHub OAuth exchange failed");
  }

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type,
    scope: payload.scope ?? "",
  };
}

export async function fetchGitHubUser(accessToken: string): Promise<{
  id: number;
  login: string;
  avatarUrl: string;
  email: string | null;
  name: string | null;
}> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub user");
  }

  const payload = (await response.json()) as {
    id: number;
    login: string;
    avatar_url: string;
    email: string | null;
    name: string | null;
  };

  return {
    id: payload.id,
    login: payload.login,
    avatarUrl: payload.avatar_url,
    email: payload.email,
    name: payload.name,
  };
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
