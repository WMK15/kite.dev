import { NextResponse } from "next/server";

import { startBranchIntent } from "@/lib/services/start-branch-intent";

export const runtime = "nodejs";

function readSecret(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  const bearerToken = authorization?.replace(/^Bearer\s+/i, "") ?? null;

  return headers.get("x-kite-webhook-secret") ?? bearerToken;
}

function readDeliveryId(headers: Headers): string | null {
  return (
    headers.get("x-kite-delivery-id") ??
    headers.get("x-request-id") ??
    headers.get("x-notion-request-id")
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await request.text();
  const result = await startBranchIntent({
    payload,
    providedSecret: readSecret(request.headers),
    deliveryId: readDeliveryId(request.headers),
  });

  return NextResponse.json(result.body, { status: result.statusCode });
}
