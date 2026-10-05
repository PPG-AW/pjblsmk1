import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { requireEnv } from "@/lib/env";
import { clientIp, readJson, route, tooManyRequests, unauthorized } from "@/lib/http";
import { formatRetryAfter, hitRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/ratelimit";
import { asString } from "@/lib/validation";

function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * POST /api/auth/teacher
 * Login guru memakai TEACHER_CODE (wajib diisi di variabel lingkungan) + rate limit.
 */
export const POST = route(async (request) => {
  const body = await readJson(request);
  const code = asString(body.code, "Kode guru", { min: 4, max: 200, label: "Kode guru" });
  const ip = clientIp(request);
  const limitKey = `login:teacher:ip:${ip}`;

  const limit = await hitRateLimit(limitKey, RATE_LIMITS.teacherLogin);
  if (!limit.allowed) {
    throw tooManyRequests(
      `Terlalu banyak percobaan kode guru. Coba lagi dalam ${formatRetryAfter(limit.retryAfterSeconds)}.`,
    );
  }

  const expected = requireEnv("TEACHER_CODE");
  if (!safeEqual(code, expected)) {
    throw unauthorized("Kode guru salah.");
  }

  await resetRateLimit(limitKey);
  await createSession({ role: "teacher", ip, userAgent: request.headers.get("user-agent") });

  return NextResponse.json({ ok: true });
});
