import { Client } from "@notionhq/client";

export function createNotionClient(auth: string): Client {
  return new Client({ auth });
}

export async function exchangeNotionCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
) {
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Notion code");
  }

  return (await response.json()) as {
    access_token: string;
    bot_id: string;
    workspace_id: string;
    workspace_name: string;
    workspace_icon: string | null;
    owner?: {
      user?: {
        id?: string;
        name?: string;
        avatar_url?: string;
        person?: {
          email?: string;
        };
      };
    };
  };
}
