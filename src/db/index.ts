import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { serverEnv } from "@/env/server";
import * as schema from "@/schema";

declare global {
  var __kitePool: Pool | undefined;
}

const pool =
  globalThis.__kitePool ??
  new Pool({ connectionString: serverEnv.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalThis.__kitePool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
