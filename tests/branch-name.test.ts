import { describe, expect, it } from "vitest";

import {
  generateBranchName,
  normaliseTaskIdentifier,
  slugifyBranchSegment,
} from "../src/utils/branch-name";

describe("branch naming", () => {
  it("slugifies titles safely", () => {
    expect(slugifyBranchSegment("Sync Notion & GitHub PRs")).toBe(
      "sync-notion-github-prs",
    );
  });

  it("normalises task identifiers deterministically", () => {
    expect(normaliseTaskIdentifier(" kite 142 ")).toBe("KITE-142");
  });

  it("builds the branch name using the required pattern", () => {
    expect(
      generateBranchName({
        type: "feat",
        taskIdentifier: "KITE-142",
        title: "Sync Notion with GitHub",
      }),
    ).toBe("feat/KITE-142-sync-notion-with-github");
  });
});
