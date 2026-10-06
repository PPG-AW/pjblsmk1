import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { requireStudent } from "@/lib/auth";
import {
  badRequest,
  clientIp,
  forbidden,
  notFound,
  readJson,
  route,
  tooManyRequests,
} from "@/lib/http";
import { formatRetryAfter, hitRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/ratelimit";
import { normalizePin } from "@/lib/validation";
import { sql } from "drizzle-orm";

/**
 * POST /api/groups/join
 * Siswa bergabung ke kelompok memakai PIN dari guru.
 * Rate limit: 5 kali gagal -> terkunci 10 menit (per siswa dan per IP).
 */
export const POST = route(async (request) => {
  const context = await requireStudent();
  const body = await readJson(request);
  const pin = normalizePin(body.pin);
  const ip = clientIp(request);

  if (context.group) {
    throw badRequest(`Kamu sudah tergabung di kelompok ${context.group.name}.`);
  }

  const keyStudent = `join:pin:student:${context.student.id}`;
  const keyIp = `join:pin:ip:${ip}`;

  const [studentLimit, ipLimit] = await Promise.all([
    hitRateLimit(keyStudent, RATE_LIMITS.joinPin),
    hitRateLimit(keyIp, RATE_LIMITS.joinPin),
  ]);

  if (!studentLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(studentLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
    throw tooManyRequests(
      `Percobaan PIN terlalu banyak. Coba lagi dalam ${formatRetryAfter(retryAfter)}, atau minta guru mengirim PIN baru.`,
    );
  }

  const db = getDb();
  const rows = await db.select().from(groups).where(sql`upper(${groups.pin}) = ${pin}`).limit(1);
  const group = rows[0];

  if (!group) {
    throw notFound("PIN tidak ditemukan. Periksa kembali 6 karakter PIN dari gurumu.");
  }

  const memberCount = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(groupMembers)
    .where(sql`${groupMembers.groupId} = ${group.id}`);

  await db
    .insert(groupMembers)
    .values({ groupId: group.id, studentId: context.student.id })
    .onConflictDoNothing({ target: groupMembers.studentId });

  await Promise.all([resetRateLimit(keyStudent), resetRateLimit(keyIp)]);

  const alreadyMember = (memberCount[0]?.total ?? 0) > 0;

  return NextResponse.json({
    ok: true,
    group: { id: group.id, name: group.name },
    note: alreadyMember
      ? "Kamu bergabung di kelompok ini."
      : "Kamu menjadi anggota pertama kelompok ini.",
  });
});

/** GET /api/groups/join, informasi kelompok siswa saat ini. */
export const GET = route(async () => {
  const context = await requireStudent();
  if (!context.group) throw forbidden("Kamu belum tergabung di kelompok.");
  return NextResponse.json({ group: context.group });
});
