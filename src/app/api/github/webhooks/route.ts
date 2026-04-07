import { NextResponse } from "next/server";

import { handleGitHubWebhook } from "@/lib/services/github-webhooks";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  // GitHub signs webhook payloads, so the raw body must be preserved.
  const payload = await request.text();
  const result = await handleGitHubWebhook({
    payload,
    headers: request.headers,
  });

  return NextResponse.json(result.body, { status: result.statusCode });
}
