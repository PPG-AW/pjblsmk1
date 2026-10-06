import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sanitizeConnectionUrl } from "@/lib/db-url";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Akses database HANYA dari server (Postgres terkelola: Neon / Supabase / Aiven).
 *
 * - Driver: postgres-js, `prepare: false` wajib untuk koneksi lewat pooler
 *   (PgBouncer/PgBouncer-transaction mode, Supavisor), prepared statement tidak
 *   bertahan antar transaksi di mode itu.
 * - URL dibersihkan dulu oleh `sanitizeConnectionUrl()`: parameter seperti
 *   `channel_binding=require` (dipakai Neon pada string barunya) tidak dipahami
 *   postgres-js dan membuat koneksi gagal.
 * - Satu koneksi per instance serverless (`max: 1`) dengan masa hidup terbatas.
 *   Pooler memutus koneksi menganggur; karena itu `idle_timeout` dan
 *   `max_lifetime` dibuat pendek, dan `resetDb()` dipakai untuk membuang klien
 *   yang soketnya sudah mati (lihat src/lib/http.ts).
 */

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __dapurSql?: ReturnType<typeof postgres>;
  __dapurDb?: Db;
};

function createClient() {
  const raw = requireEnv("DATABASE_URL");
  const { url, removed } = sanitizeConnectionUrl(raw);
  if (removed.length > 0) {
    console.info(
      `[db] parameter koneksi yang tidak dikenal dibuang: ${removed.join(", ")} ` +
        "(aman; hanya diberitahukan sekali per instance)",
    );
  }
  return postgres(url, {
    prepare: false,
    max: 1,
    idle_timeout: 10,
    max_lifetime: 60 * 15,
    connect_timeout: 15,
  });
}

export function getSql() {
  if (!globalForDb.__dapurSql) {
    globalForDb.__dapurSql = createClient();
  }
  return globalForDb.__dapurSql;
}

/**
 * Buang klien yang soketnya sudah mati.
 *
 * Dipanggil otomatis oleh pembungkus route saat muncul galat koneksi
 * ("connection to client lost", "Connection terminated unexpectedly", dsb),
 * supaya permintaan berikutnya membuat koneksi baru alih-alih memakai soket
 * yang sudah ditutup pooler.
 */
export function resetDb(): void {
  const client = globalForDb.__dapurSql;
  globalForDb.__dapurSql = undefined;
  globalForDb.__dapurDb = undefined;
  if (client) {
    void client.end({ timeout: 1 }).catch(() => {
      /* koneksi memang sudah mati, tidak perlu dilaporkan */
    });
  }
}

export function getDb(): Db {
  if (!globalForDb.__dapurDb) {
    globalForDb.__dapurDb = drizzle(getSql(), { schema });
  }
  return globalForDb.__dapurDb;
}

export { schema };
