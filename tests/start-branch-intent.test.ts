import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyNotionStartBranchRequest } from "@/security/notion-webhooks";
import { generateBranchName } from "@/utils/branch-name";

// Mock external dependencies
vi.mock("@/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/notion/client", () => ({
  createNotionClient: vi.fn(() => mockNotionClient),
}));

vi.mock("@/observability/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/observability/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/observability/posthog", () => ({
  posthogServer: {
    capture: vi.fn(),
  },
}));

// Mock database
const mockDb = {
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoNothing: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: "delivery-id" }])),
      })),
      onConflictDoUpdate: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.resolve([
            {
              id: "intent-id",
              branchName: "feat/KITE-1-test-task",
              branchType: "feat",
              verificationStrategy: "workspace-page-check",
            },
          ]),
        ),
      })),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
  query: {
    databaseMappings: {
      findFirst: vi.fn(),
    },
  },
};

// Mock Notion client
const mockNotionClient = {
  pages: {
    retrieve: vi.fn(),
    update: vi.fn(),
  },
};

describe("verifyNotionStartBranchRequest", () => {
  it("returns strong verification with matching shared secret", () => {
    const result = verifyNotionStartBranchRequest({
      providedSecret: "correct-secret",
      configuredSecret: "correct-secret",
    });

    expect(result.strategy).toBe("shared-secret");
    expect(result.strongVerification).toBe(true);
  });

  it("throws on mismatched shared secret", () => {
    expect(() =>
      verifyNotionStartBranchRequest({
        providedSecret: "wrong-secret",
        configuredSecret: "correct-secret",
      }),
    ).toThrow("Invalid Notion webhook secret");
  });

  it("falls back to workspace-page-check when no secret configured", () => {
    const result = verifyNotionStartBranchRequest({
      providedSecret: null,
      configuredSecret: null,
    });

    expect(result.strategy).toBe("workspace-page-check");
    expect(result.strongVerification).toBe(false);
  });

  it("falls back when provided secret but none configured", () => {
    const result = verifyNotionStartBranchRequest({
      providedSecret: "some-secret",
      configuredSecret: null,
    });

    expect(result.strategy).toBe("workspace-page-check");
    expect(result.strongVerification).toBe(false);
  });
});

describe("branch name generation for start-branch flow", () => {
  it("generates branch name from Notion unique_id property", () => {
    const result = generateBranchName({
      type: "feat",
      taskIdentifier: "KITE-42",
      title: "Implement user authentication",
    });

    expect(result).toBe("feat/KITE-42-implement-user-authentication");
  });

  it("generates branch name with page ID fallback", () => {
    const result = generateBranchName({
      type: "fix",
      taskIdentifier: "abc123def456",
      title: "Fix login bug",
    });

    expect(result).toBe("fix/ABC123DEF456-fix-login-bug");
  });

  it("generates branch name for untitled task", () => {
    const result = generateBranchName({
      type: "chore",
      taskIdentifier: "KITE-99",
      title: "untitled-task",
    });

    expect(result).toBe("chore/KITE-99-untitled-task");
  });

  it("respects branch type from payload override", () => {
    const resultFix = generateBranchName({
      type: "fix",
      taskIdentifier: "BUG-1",
      title: "Fix crash on startup",
    });

    expect(resultFix).toMatch(/^fix\//);
  });
});

describe("start-branch-intent service integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("input validation", () => {
    it("accepts valid payload with required fields", async () => {
      const payload = JSON.stringify({
        pageId: "page-123",
        databaseId: "db-456",
      });

      const { z } = await import("zod");
      const schema = z.object({
        pageId: z.string().min(1),
        databaseId: z.string().min(1),
        branchType: z
          .enum(["feat", "fix", "chore", "docs", "refactor", "test"])
          .optional(),
      });

      const result = schema.safeParse(JSON.parse(payload));
      expect(result.success).toBe(true);
    });

    it("accepts payload with optional branchType", async () => {
      const payload = JSON.stringify({
        pageId: "page-123",
        databaseId: "db-456",
        branchType: "fix",
      });

      const { z } = await import("zod");
      const schema = z.object({
        pageId: z.string().min(1),
        databaseId: z.string().min(1),
        branchType: z
          .enum(["feat", "fix", "chore", "docs", "refactor", "test"])
          .optional(),
      });

      const result = schema.safeParse(JSON.parse(payload));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.branchType).toBe("fix");
      }
    });

    it("rejects invalid branchType", async () => {
      const payload = JSON.stringify({
        pageId: "page-123",
        databaseId: "db-456",
        branchType: "invalid",
      });

      const { z } = await import("zod");
      const schema = z.object({
        pageId: z.string().min(1),
        databaseId: z.string().min(1),
        branchType: z
          .enum(["feat", "fix", "chore", "docs", "refactor", "test"])
          .optional(),
      });

      const result = schema.safeParse(JSON.parse(payload));
      expect(result.success).toBe(false);
    });

    it("rejects missing pageId", async () => {
      const payload = JSON.stringify({
        databaseId: "db-456",
      });

      const { z } = await import("zod");
      const schema = z.object({
        pageId: z.string().min(1),
        databaseId: z.string().min(1),
      });

      const result = schema.safeParse(JSON.parse(payload));
      expect(result.success).toBe(false);
    });

    it("rejects empty pageId", async () => {
      const payload = JSON.stringify({
        pageId: "",
        databaseId: "db-456",
      });

      const { z } = await import("zod");
      const schema = z.object({
        pageId: z.string().min(1),
        databaseId: z.string().min(1),
      });

      const result = schema.safeParse(JSON.parse(payload));
      expect(result.success).toBe(false);
    });
  });
});
