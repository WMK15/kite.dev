import { NextResponse } from "next/server";

import { serverEnv } from "@/env/server";
import { handleGitHubCallback } from "@/lib/services/github-callback";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  // Kite.dev currently connects GitHub through App installations and webhooks.
  // This callback handles the post-install browser redirect rather than user OAuth.
  console.log("[GitHub Callback] Received request:", request.url);
  const { redirectPath } = await handleGitHubCallback(request.url);
  console.log("[GitHub Callback] Redirecting to:", redirectPath);

  return NextResponse.redirect(
    new URL(redirectPath, serverEnv.NEXT_PUBLIC_APP_URL),
  );
}
