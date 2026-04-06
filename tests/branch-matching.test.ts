import { describe, expect, it } from "vitest";

import type { BranchIntent } from "../src/schema";
import { matchBranchIntentByBranchName } from "../src/utils/branch-matching";

function buildBranchIntent(status: BranchIntent["status"]): BranchIntent {
  const now = new Date();

  return {
    id: "1",
    databaseMappingId: "mapping-1",
    repositoryId: "repo-1",
    notionPageId: "page-1",
    taskIdentifier: "KITE-1",
    taskTitle: "Sync Notion",
    branchType: "feat",
    branchName: "feat/KITE-1-sync-notion",
    status,
    latestCommitSha: null,
    verificationStrategy: "shared-secret",
    suggestedAt: now,
    pushedAt: null,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

describe("branch intent matching", () => {
  it("matches open intents by branch name", () => {
    const match = matchBranchIntentByBranchName(
      [buildBranchIntent("waiting_for_push")],
      "feat/KITE-1-sync-notion",
    );

    expect(match?.id).toBe("1");
  });

  it("ignores closed intents", () => {
    const match = matchBranchIntentByBranchName(
      [buildBranchIntent("closed")],
      "feat/KITE-1-sync-notion",
    );

    expect(match).toBeNull();
  });
});
