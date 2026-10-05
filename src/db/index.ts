import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Akses database HANYA dari server (Supabase Postgres).
 *
 * - Driver: postgres-js, `prepare: false` wajib untuk transaction pooler
 *   Supabase (port 6543 / PgBouncer transaction mode).
 * - Tidak ada supabase-js maupun anon key di klien.
 */

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __dapurSql?: ReturnType<typeof postgres>;
  __dapurDb?: Db;
};

function createClient() {
  const url = requireEnv("DATABASE_URL");
  return postgres(url, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

export function getSql() {
  if (!globalForDb.__dapurSql) {
    globalForDb.__dapurSql = createClient();
  }
  return globalForDb.__dapurSql;
}

export function getDb(): Db {
  if (!globalForDb.__dapurDb) {
    globalForDb.__dapurDb = drizzle(getSql(), { schema });
  }
  return globalForDb.__dapurDb;
}

export { schema };
