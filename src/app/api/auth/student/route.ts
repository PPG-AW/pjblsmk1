import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getClassRosterRows, findStudentByName } from "@/db/queries";
import { students } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { clientIp, forbidden, readJson, route, tooManyRequests } from "@/lib/http";
import { formatRetryAfter, hitRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/ratelimit";
import { getSettings } from "@/lib/settings";
import { validateStudentName } from "@/lib/validation";

/**
 * POST /api/auth/student
 * Login siswa cukup dengan nama lengkap (min. 3 huruf, tidak peka huruf besar/kecil).
 */
export const POST = route(async (request) => {
  const body = await readJson(request);
  const name = validateStudentName(body.name);
  const ip = clientIp(request);

  const limit = await hitRateLimit(`login:student:ip:${ip}`, RATE_LIMITS.studentLogin);
  if (!limit.allowed) {
    throw tooManyRequests(
      `Terlalu banyak percobaan login dari perangkat ini. Coba lagi dalam ${formatRetryAfter(limit.retryAfterSeconds)}.`,
    );
  }

  const settings = await getSettings();
  if (settings.restrictRoster) {
    const roster = await getClassRosterRows();
    const allowed = roster.some((entry) => entry.name.toLowerCase() === name.toLowerCase());
    if (!allowed) {
      throw forbidden(
        "Namamu belum terdaftar di daftar kelas. Periksa ejaannya atau tanyakan ke guru (guru dapat memperbarui daftar nama di dashboard).",
      );
    }
  }

  const db = getDb();
  let student = await findStudentByName(name);
  if (!student) {
    const inserted = await db
      .insert(students)
      .values({ name })
      .onConflictDoNothing()
      .returning();
    student = inserted[0] ?? (await findStudentByName(name));
  }
  if (!student) {
    throw new Error("Gagal membuat data siswa.");
  }

  await resetRateLimit(`login:student:ip:${ip}`);
  await createSession({
    role: "student",
    studentId: student.id,
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, student: { id: student.id, name: student.name } });
});
