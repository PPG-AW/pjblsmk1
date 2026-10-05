/**
 * Pembacaan variabel lingkungan.
 *
 * Aplikasi HARUS gagal start dengan pesan jelas bila variabel wajib kosong.
 * Tidak ada nilai fallback (khususnya tidak ada kode guru default).
 */

export const REQUIRED_ENV = ["DATABASE_URL", "TEACHER_CODE", "SESSION_SECRET"] as const;

export type RequiredEnvName = (typeof REQUIRED_ENV)[number];

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEnv(name: RequiredEnvName | string): string {
  const value = readEnv(name);
  if (!value) {
    throw new EnvError(
      `Variabel lingkungan ${name} belum diisi. Isi file .env untuk pengembangan lokal atau Environment Variables di Vercel (Production & Preview) sebelum menjalankan aplikasi.`,
    );
  }
  return value;
}

/** Dipanggil saat server mulai (instrumentation) dan di setiap route API. */
export function assertServerEnv(): void {
  const missing = REQUIRED_ENV.filter((name) => !readEnv(name));
  if (missing.length > 0) {
    throw new EnvError(
      `Konfigurasi server tidak lengkap: ${missing.join(", ")}. ` +
        "Salin .env.example menjadi .env (lokal) atau isi Environment Variables di Vercel: " +
        "DATABASE_URL, DIRECT_URL, TEACHER_CODE, SESSION_SECRET, CRON_SECRET.",
    );
  }

  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < 24) {
    throw new EnvError(
      "SESSION_SECRET terlalu pendek (minimal 24 karakter). Buat nilai acak misalnya dengan `openssl rand -hex 32`.",
    );
  }
}
