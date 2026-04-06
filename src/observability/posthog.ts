import { PostHog } from "posthog-node";

import { serverEnv } from "@/env/server";

declare global {
  var __kitePostHog: PostHog | undefined;
}

export const posthogServer =
  globalThis.__kitePostHog ??
  new PostHog(serverEnv.NEXT_PUBLIC_POSTHOG_KEY, {
    host: serverEnv.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__kitePostHog = posthogServer;
}
