import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { serverEnv } from "@/env/server";
import * as schema from "@/schema";

type KiteDatabase = NodePgDatabase<typeof schema>;

declare global {
  var __kitePool: Pool | undefined;
  var __kiteDb: KiteDatabase | undefined;
  var __kiteDatabaseUrl: string | undefined;
}

export function getPool(): Pool {
  if (
    globalThis.__kitePool &&
    globalThis.__kiteDatabaseUrl === serverEnv.DATABASE_URL
  ) {
    return globalThis.__kitePool;
  }

  if (
    globalThis.__kitePool &&
    globalThis.__kiteDatabaseUrl !== serverEnv.DATABASE_URL
  ) {
    void globalThis.__kitePool.end().catch(() => undefined);
    globalThis.__kitePool = undefined;
    globalThis.__kiteDb = undefined;
  }

  const pool = new Pool({ connectionString: serverEnv.DATABASE_URL });

  if (process.env.NODE_ENV !== "production") {
    const connection = new URL(serverEnv.DATABASE_URL);
    console.info(
      JSON.stringify({
        level: "info",
        message: "Initialised database pool",
        context: {
          username: connection.username,
          host: connection.hostname,
          port: connection.port,
          database: connection.pathname,
        },
      }),
    );
  }

  if (process.env.NODE_ENV !== "production") {
    globalThis.__kitePool = pool;
    globalThis.__kiteDatabaseUrl = serverEnv.DATABASE_URL;
  }

  return pool;
}

export function getDb(): KiteDatabase {
  if (
    globalThis.__kiteDb &&
    globalThis.__kiteDatabaseUrl === serverEnv.DATABASE_URL
  ) {
    return globalThis.__kiteDb;
  }

  if (
    globalThis.__kiteDb &&
    globalThis.__kiteDatabaseUrl !== serverEnv.DATABASE_URL
  ) {
    globalThis.__kiteDb = undefined;
  }

  const db = drizzle(getPool(), { schema });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__kiteDb = db;
  }

  return db;
}
