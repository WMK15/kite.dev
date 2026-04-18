import { describe, expect, it } from "vitest";

import {
  generateBranchName,
  normaliseTaskIdentifier,
  slugifyBranchSegment,
} from "@/utils/branch-name";

describe("slugifyBranchSegment", () => {
  it("converts spaces to hyphens", () => {
    expect(slugifyBranchSegment("hello world")).toBe("hello-world");
  });

  it("lowercases all characters", () => {
    expect(slugifyBranchSegment("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugifyBranchSegment("Sync Notion & GitHub PRs")).toBe(
      "sync-notion-github-prs",
    );
  });

  it("removes quotes", () => {
    expect(slugifyBranchSegment("Fix 'bug' in \"code\"")).toBe(
      "fix-bug-in-code",
    );
  });

  it("replaces underscores with hyphens", () => {
    expect(slugifyBranchSegment("some_function_name")).toBe(
      "some-function-name",
    );
  });

  it("collapses multiple hyphens", () => {
    expect(slugifyBranchSegment("hello---world")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifyBranchSegment("-hello-world-")).toBe("hello-world");
  });

  it("trims whitespace", () => {
    expect(slugifyBranchSegment("  hello world  ")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(slugifyBranchSegment("")).toBe("");
  });

  it("handles only special characters", () => {
    expect(slugifyBranchSegment("@#$%")).toBe("");
  });

  it("handles unicode characters", () => {
    expect(slugifyBranchSegment("Add café support")).toBe("add-caf-support");
  });

  it("handles emoji", () => {
    expect(slugifyBranchSegment("Add feature 🚀")).toBe("add-feature");
  });
});

describe("normaliseTaskIdentifier", () => {
  it("uppercases identifiers", () => {
    expect(normaliseTaskIdentifier("kite-142")).toBe("KITE-142");
  });

  it("trims and normalises spaces", () => {
    expect(normaliseTaskIdentifier(" kite 142 ")).toBe("KITE-142");
  });

  it("handles already normalised identifiers", () => {
    expect(normaliseTaskIdentifier("KITE-142")).toBe("KITE-142");
  });

  it("handles identifiers with multiple spaces", () => {
    expect(normaliseTaskIdentifier("kite   142")).toBe("KITE-142");
  });

  it("removes special characters except hyphens", () => {
    expect(normaliseTaskIdentifier("KITE#142")).toBe("KITE-142");
  });

  it("handles numeric-only identifiers", () => {
    expect(normaliseTaskIdentifier("142")).toBe("142");
  });

  it("handles identifiers from unique_id format", () => {
    expect(normaliseTaskIdentifier("PROJ-123")).toBe("PROJ-123");
  });

  it("handles page ID as fallback", () => {
    expect(normaliseTaskIdentifier("abc123def456")).toBe("ABC123DEF456");
  });

  it("collapses multiple hyphens", () => {
    expect(normaliseTaskIdentifier("KITE---142")).toBe("KITE-142");
  });

  it("trims leading and trailing hyphens", () => {
    expect(normaliseTaskIdentifier("-KITE-142-")).toBe("KITE-142");
  });
});

describe("generateBranchName", () => {
  it("builds the branch name using the required pattern", () => {
    expect(
      generateBranchName({
        type: "feat",
        taskIdentifier: "KITE-142",
        title: "Sync Notion with GitHub",
      }),
    ).toBe("feat/KITE-142-sync-notion-with-github");
  });

  it("supports all branch types", () => {
    const title = "Some task";
    const taskIdentifier = "TEST-1";

    expect(generateBranchName({ type: "feat", taskIdentifier, title })).toMatch(
      /^feat\//,
    );
    expect(generateBranchName({ type: "fix", taskIdentifier, title })).toMatch(
      /^fix\//,
    );
    expect(
      generateBranchName({ type: "chore", taskIdentifier, title }),
    ).toMatch(/^chore\//);
    expect(generateBranchName({ type: "docs", taskIdentifier, title })).toMatch(
      /^docs\//,
    );
    expect(
      generateBranchName({ type: "refactor", taskIdentifier, title }),
    ).toMatch(/^refactor\//);
    expect(generateBranchName({ type: "test", taskIdentifier, title })).toMatch(
      /^test\//,
    );
  });

  it("truncates long titles to 48 characters", () => {
    const result = generateBranchName({
      type: "feat",
      taskIdentifier: "KITE-1",
      title:
        "This is a very long title that should be truncated to prevent excessively long branch names",
    });

    // The slug portion (after type/TASK-ID-) should be at most 48 chars
    // "feat/KITE-1-" + slug
    const fullSlug = slugifyBranchSegment(
      "This is a very long title that should be truncated to prevent excessively long branch names",
    ).slice(0, 48);
    expect(result).toBe(`feat/KITE-1-${fullSlug}`);
  });

  it("normalises task identifier in output", () => {
    expect(
      generateBranchName({
        type: "fix",
        taskIdentifier: " bug 42 ",
        title: "Fix login issue",
      }),
    ).toBe("fix/BUG-42-fix-login-issue");
  });

  it("handles untitled tasks", () => {
    expect(
      generateBranchName({
        type: "chore",
        taskIdentifier: "KITE-99",
        title: "untitled-task",
      }),
    ).toBe("chore/KITE-99-untitled-task");
  });

  it("produces deterministic output", () => {
    const input = {
      type: "feat" as const,
      taskIdentifier: "KITE-100",
      title: "Add dark mode",
    };

    const result1 = generateBranchName(input);
    const result2 = generateBranchName(input);

    expect(result1).toBe(result2);
  });

  it("handles special characters in title", () => {
    expect(
      generateBranchName({
        type: "feat",
        taskIdentifier: "KITE-1",
        title: "Add OAuth2.0 (Google & GitHub)",
      }),
    ).toBe("feat/KITE-1-add-oauth2-0-google-github");
  });
});
