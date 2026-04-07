import { getDb } from "@/db";
import { serverEnv } from "@/env/server";
import { exchangeNotionCode } from "@/notion/client";
import { auditEvents, notionWorkspaces, users } from "@/schema";

export async function completeNotionAuth(code: string): Promise<string> {
  const db = getDb();
  const payload = await exchangeNotionCode(
    code,
    serverEnv.NOTION_REDIRECT_URI,
    serverEnv.NOTION_CLIENT_ID,
    serverEnv.NOTION_CLIENT_SECRET,
  );

  const owner = payload.owner?.user;

  let userId: string | null = null;

  if (owner?.id) {
    const [user] = await db
      .insert(users)
      .values({
        notionUserId: owner.id,
        email: owner.person?.email ?? null,
        name: owner.name ?? null,
        avatarUrl: owner.avatar_url ?? null,
      })
      .onConflictDoUpdate({
        target: users.notionUserId,
        set: {
          email: owner.person?.email ?? null,
          name: owner.name ?? null,
          avatarUrl: owner.avatar_url ?? null,
        },
      })
      .returning({ id: users.id });

    if (!user) {
      throw new Error("Notion user could not be persisted");
    }

    userId = user.id;
  }

  const [workspace] = await db
    .insert(notionWorkspaces)
    .values({
      userId,
      notionWorkspaceId: payload.workspace_id,
      workspaceName: payload.workspace_name,
      workspaceIcon: payload.workspace_icon,
      accessToken: payload.access_token,
      botId: payload.bot_id,
      ownerNotionUserId: owner?.id ?? null,
    })
    .onConflictDoUpdate({
      target: notionWorkspaces.notionWorkspaceId,
      set: {
        userId,
        workspaceName: payload.workspace_name,
        workspaceIcon: payload.workspace_icon,
        accessToken: payload.access_token,
        botId: payload.bot_id,
        ownerNotionUserId: owner?.id ?? null,
      },
    })
    .returning();

  if (!workspace) {
    throw new Error("Notion workspace could not be persisted");
  }

  await db.insert(auditEvents).values({
    actorType: "notion",
    actorId: workspace.notionWorkspaceId,
    action: "notion.workspace.connected",
    targetType: "notion_workspace",
    targetId: workspace.id,
    metadata: {
      workspaceName: workspace.workspaceName,
    },
  });

  return "/integrations?notion=connected";
}
