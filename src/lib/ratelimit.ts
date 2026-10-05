/**
 * Pembatasan laju akses (rate limit) berbasis tabel `rate_limits`, karena
 * serverless tidak punya memori bersama antar instance.
 */
import { getSql } from "@/db";

export type RateLimitRule = {
  /** Jumlah percobaan yang diizinkan dalam satu jendela waktu. */
  limit: number;
  /** Panjang jendela waktu (detik). Setelah lewat, hitungan dimulai ulang. */
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  count: number;
};

const CLEANUP_AFTER_SECONDS = 60 * 60 * 24;

export async function hitRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const client = getSql();
  const rows = await client<
    { count: number; window_start: Date }[]
  >`INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - (${rule.windowSeconds} * interval '1 second') THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - (${rule.windowSeconds} * interval '1 second') THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING count, window_start`;

  const row = rows[0];
  const count = row?.count ?? 1;
  const windowStart = row?.window_start ? new Date(row.window_start) : new Date();
  const elapsed = (Date.now() - windowStart.getTime()) / 1000;
  const remainingWindow = Math.max(0, Math.ceil(rule.windowSeconds - elapsed));

  if (Math.random() < 0.02) {
    // Bersihkan baris lama sesekali agar tabel tidak tumbuh tanpa batas.
    await client`DELETE FROM rate_limits WHERE window_start < now() - (${CLEANUP_AFTER_SECONDS} * interval '1 second')`;
  }

  const allowed = count <= rule.limit;
  return {
    allowed,
    count,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds: allowed ? 0 : remainingWindow,
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  const client = getSql();
  await client`DELETE FROM rate_limits WHERE key = ${key}`;
}

export function formatRetryAfter(seconds: number): string {
  if (seconds <= 60) return `${Math.max(1, Math.ceil(seconds))} detik`;
  return `${Math.ceil(seconds / 60)} menit`;
}

export const RATE_LIMITS = {
  /** Login guru: 5 percobaan gagal per 15 menit per IP. */
  teacherLogin: { limit: 5, windowSeconds: 15 * 60 } satisfies RateLimitRule,
  /** Login siswa: 10 percobaan per 10 menit per IP. */
  studentLogin: { limit: 10, windowSeconds: 10 * 60 } satisfies RateLimitRule,
  /** Gabung PIN: 5 kali gagal -> terkunci 10 menit (per siswa dan per IP). */
  joinPin: { limit: 5, windowSeconds: 10 * 60 } satisfies RateLimitRule,
} as const;
