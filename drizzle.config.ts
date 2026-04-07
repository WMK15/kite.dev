import { config as loadEnv } from "dotenv";

import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
