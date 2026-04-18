import { Client } from "@notionhq/client";

export function createNotionClient(auth: string): Client {
  return new Client({ auth });
}

export async function fetchNotionDatabases(
  accessToken: string,
): Promise<Array<{ id: string; title: string }>> {
  const client = createNotionClient(accessToken);
  const databases: Array<{ id: string; title: string }> = [];

  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    // Try both filter values - Notion API has changed this
    const response = await client.request<{
      results: Array<{
        id: string;
        object: string;
        title?: Array<{ plain_text?: string }>;
      }>;
      has_more: boolean;
      next_cursor: string | null;
    }>({
      path: "search",
      method: "post",
      body: {
        filter: { property: "object", value: "database" },
        start_cursor: cursor,
        page_size: 100,
      },
    });

    console.log(
      "Notion search response (filter=database):",
      JSON.stringify(
        response.results.map((r) => ({
          id: r.id,
          object: r.object,
          title: r.title,
        })),
        null,
        2,
      ),
    );

    for (const result of response.results) {
      if (result.title) {
        const title =
          result.title.map((t) => t.plain_text ?? "").join("") || "Untitled";
        databases.push({
          id: result.id,
          title,
        });
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return databases;
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
