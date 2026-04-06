"use client";

import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { clientEnv } from "@/env/client";

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  useEffect(() => {
    posthog.init(clientEnv.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: clientEnv.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false,
      autocapture: false,
      persistence: "localStorage",
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PostHogProvider client={posthog}>{children}</PostHogProvider>
    </ThemeProvider>
  );
}
