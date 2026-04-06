import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { VerifiedWebhook } from "@/types/domain";

export function hashWebhookPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export function verifyGitHubWebhookSignature(input: {
  payload: string;
  signature: string | null;
  secret: string;
}): boolean {
  if (!input.signature?.startsWith("sha256=")) {
    return false;
  }

  const expected = Buffer.from(
    `sha256=${createHmac("sha256", input.secret).update(input.payload).digest("hex")}`,
  );
  const actual = Buffer.from(input.signature);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyGitHubWebhookRequest(input: {
  payload: string;
  signature: string | null;
  deliveryId: string | null;
  eventName: string | null;
  secret: string;
}): VerifiedWebhook {
  if (!input.deliveryId || !input.eventName) {
    throw new Error("Missing GitHub delivery metadata");
  }

  if (!verifyGitHubWebhookSignature(input)) {
    throw new Error("Invalid GitHub webhook signature");
  }

  return {
    deliveryId: input.deliveryId,
    eventName: input.eventName,
    payloadHash: hashWebhookPayload(input.payload),
  };
}
