import { NextResponse } from "next/server";

import { serverEnv } from "@/env/server";
import { completeGitHubAuth } from "@/lib/services/github-auth";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const installationId = url.searchParams.get("installation_id");

  if (!code) {
    return NextResponse.json({ error: "Missing GitHub code" }, { status: 400 });
  }

  const redirectPath = await completeGitHubAuth(
    installationId
      ? { code, installationId: Number(installationId) }
      : { code },
  );

  return NextResponse.redirect(
    new URL(redirectPath, serverEnv.NEXT_PUBLIC_APP_URL),
  );
}
