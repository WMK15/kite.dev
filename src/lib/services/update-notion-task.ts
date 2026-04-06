import { createNotionClient } from "@/notion/client";
import {
  buildNotionPropertyUpdate,
  type NotionPageProperties,
} from "@/notion/page-properties";
import type { DatabaseMapping } from "@/schema";

export async function updateNotionTask(input: {
  notionAccessToken: string;
  pageId: string;
  mapping: DatabaseMapping;
  suggestedBranch?: string;
  gitStatus?: string;
  lastSyncedAt?: string;
  pullRequestUrl?: string;
}): Promise<void> {
  const notion = createNotionClient(input.notionAccessToken);
  const page = await notion.pages.retrieve({ page_id: input.pageId });

  if (!("properties" in page)) {
    throw new Error("Notion page payload did not include editable properties");
  }

  const properties = page.properties as NotionPageProperties;
  const patch: Record<string, unknown> = {};

  if (input.suggestedBranch) {
    const property = properties[input.mapping.suggestedBranchProperty];
    if (property) {
      patch[input.mapping.suggestedBranchProperty] = buildNotionPropertyUpdate(
        property,
        input.suggestedBranch,
      );
    }
  }

  if (input.gitStatus) {
    const property = properties[input.mapping.gitStatusProperty];
    if (property) {
      patch[input.mapping.gitStatusProperty] = buildNotionPropertyUpdate(
        property,
        input.gitStatus,
      );
    }
  }

  if (input.lastSyncedAt) {
    const property = properties[input.mapping.lastSyncedAtProperty];
    if (property) {
      patch[input.mapping.lastSyncedAtProperty] = buildNotionPropertyUpdate(
        property,
        input.lastSyncedAt,
      );
    }
  }

  if (input.pullRequestUrl && input.mapping.pullRequestUrlProperty) {
    const property = properties[input.mapping.pullRequestUrlProperty];
    if (property) {
      patch[input.mapping.pullRequestUrlProperty] = buildNotionPropertyUpdate(
        property,
        input.pullRequestUrl,
      );
    }
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  await notion.pages.update({
    page_id: input.pageId,
    properties: patch as NonNullable<
      Parameters<typeof notion.pages.update>[0]["properties"]
    >,
  });
}
