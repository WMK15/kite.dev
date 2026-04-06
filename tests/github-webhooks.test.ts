import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  hashWebhookPayload,
  verifyGitHubWebhookRequest,
  verifyGitHubWebhookSignature,
} from "../src/security/github-webhooks";

describe("github webhook verification", () => {
  const payload = JSON.stringify({ hello: "world" });
  const secret = "super-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

  it("rejects invalid signatures", () => {
    expect(
      verifyGitHubWebhookSignature({
        payload,
        signature: "sha256=bad",
        secret,
      }),
    ).toBe(false);
  });

  it("computes a deterministic payload hash", () => {
    expect(hashWebhookPayload(payload)).toHaveLength(64);
  });

  it("accepts valid webhook metadata", () => {
    expect(
      verifyGitHubWebhookRequest({
        payload,
        signature,
        deliveryId: "delivery-1",
        eventName: "push",
        secret,
      }),
    ).toMatchObject({
      deliveryId: "delivery-1",
      eventName: "push",
    });
  });
});
