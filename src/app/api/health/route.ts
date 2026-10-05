import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getSql } from "@/db";
import { purgeExpiredSessions } from "@/lib/auth";
import { readEnv } from "@/lib/env";
import { route } from "@/lib/http";

/**
 * GET /api/health
 *
 * - Tanpa token: hanya menjawab { status: "ok" }.
 * - Dengan header `Authorization: Bearer $CRON_SECRET`: menjalankan pemeriksaan
 *   database + membersihkan sesi kedaluwarsa. Dipanggil cron harian Vercel
 *   (vercel.json) sekaligus menjaga proyek Supabase gratis tetap aktif.
 */
export const GET = route(async (request) => {
  const secret = readEnv("CRON_SECRET");
  const header = request.headers.get("authorization") ?? "";
  const authorized = Boolean(secret) && header === `Bearer ${secret}`;

  if (!authorized) {
    return NextResponse.json({ status: "ok", time: new Date().toISOString() });
  }

  const client = getSql();
  const started = Date.now();
  await client`SELECT 1 AS ping`;
  const purgedSessions = await purgeExpiredSessions();
  const purgedRateLimits = await client`
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' RETURNING key`;

  void sql;

  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    database: "ok",
    latencyMs: Date.now() - started,
    purgedSessions,
    purgedRateLimits: purgedRateLimits.length,
  });
});
