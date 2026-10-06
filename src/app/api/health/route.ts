import { NextResponse } from "next/server";
import { getSql, resetDb } from "@/db";
import { purgeExpiredSessions } from "@/lib/auth";
import { databaseFailure } from "@/lib/db-error";
import { readEnv } from "@/lib/env";
import { route } from "@/lib/http";

/**
 * GET /api/health
 *
 * Selalu melakukan `SELECT 1` (murah) supaya:
 * - cron harian Vercel (vercel.json) benar-benar menyentuh database, pada Neon
 *   ini sekaligus membangunkan compute yang tidur, sehingga permintaan siswa
 *   pertama tidak menunggu cold start;
 * - layanan pemantau eksternal (mis. UptimeRobot/cron-job.org) bisa memakai
 *   endpoint ini dan melihat status 200/503 dengan jujur.
 *
 * Detail (latensi, sesi yang dibersihkan, alasan kegagalan) hanya diberikan bila
 * pemanggil melampirkan header `Authorization: Bearer $CRON_SECRET`.
 */
export const GET = route(async (request) => {
  const secret = readEnv("CRON_SECRET");
  const header = request.headers.get("authorization") ?? "";
  const authorized = Boolean(secret) && header === `Bearer ${secret}`;

  const started = Date.now();
  let pingError: unknown = null;
  try {
    await getSql()`SELECT 1 AS ping`;
  } catch (error) {
    pingError = error;
    console.error("[health]", error);
    resetDb();
  }

  if (pingError) {
    const failure = databaseFailure(pingError);
    if (!authorized) {
      return NextResponse.json(
        { status: "degraded" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        reason: failure?.kind ?? "unknown",
        error: failure?.message ?? "Database tidak dapat dihubungi.",
        time: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!authorized) {
    return NextResponse.json(
      { status: "ok", time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const purgedSessions = await purgeExpiredSessions();
  const purgedRateLimits = await getSql()`
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' RETURNING key`;

  return NextResponse.json(
    {
      status: "ok",
      time: new Date().toISOString(),
      database: "ok",
      latencyMs: Date.now() - started,
      purgedSessions,
      purgedRateLimits: purgedRateLimits.length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
