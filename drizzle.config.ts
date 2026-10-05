import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Konfigurasi migrasi Drizzle.
 *
 * Migrasi memakai DIRECT_URL (session pooler / koneksi langsung port 5432),
 * karena drizzle-kit butuh koneksi persisten (aman di jaringan IPv4 maupun
 * IPv6). Aplikasi saat berjalan memakai DATABASE_URL (transaction pooler 6543)
 * dengan prepare:false.
 */
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DIRECT_URL (atau DATABASE_URL) belum diisi. Salin .env.example menjadi .env lalu isi connection string Postgres (Neon/Supabase) sebelum menjalankan drizzle-kit.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
