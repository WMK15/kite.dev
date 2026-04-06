import { serverEnv } from "@/env/server";

export function getNotionAuthorisationUrl(): string {
  const url = new URL("https://api.notion.com/v1/oauth/authorize");

  url.searchParams.set("client_id", serverEnv.NOTION_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", serverEnv.NOTION_REDIRECT_URI);

  return url.toString();
}

export function getGitHubUserAuthorisationUrl(): string {
  const url = new URL("https://github.com/login/oauth/authorize");

  url.searchParams.set("client_id", serverEnv.GITHUB_APP_CLIENT_ID);
  url.searchParams.set(
    "redirect_uri",
    `${serverEnv.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
  );

  return url.toString();
}

export function getGitHubAppInstallationUrl(): string {
  return `https://github.com/apps/${serverEnv.GITHUB_APP_NAME}/installations/new`;
}
