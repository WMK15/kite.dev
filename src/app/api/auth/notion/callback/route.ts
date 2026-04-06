import { NextResponse } from "next/server";

import { serverEnv } from "@/env/server";
import { completeNotionAuth } from "@/lib/services/notion-auth";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing Notion code" }, { status: 400 });
  }

  const redirectPath = await completeNotionAuth(code);

  return NextResponse.redirect(
    new URL(redirectPath, serverEnv.NEXT_PUBLIC_APP_URL),
  );
}
