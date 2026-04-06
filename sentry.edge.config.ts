import * as Sentry from "@sentry/nextjs";

import { serverEnv } from "@/env/server";

Sentry.init({
  dsn: serverEnv.SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  debug: false,
});
