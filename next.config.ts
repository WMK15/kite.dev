import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["pg"],
  allowedDevOrigins: ["mitered-alaysia-soapily.ngrok-free.dev"],
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
