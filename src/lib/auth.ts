/**
 * Sesi login (siswa & guru) + helper otorisasi.
 *
 * - Cookie: httpOnly, sameSite lax, secure di produksi, token acak 256-bit.
 * - Sesi punya expires_at (30 hari) dan dibersihkan berkala.
 * - Query sesi + siswa + kelompok digabung menjadi satu JOIN.
 * - requireGroupMember() dipakai SEMUA route fase proyek & akhir.
 */
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { groupMembers, groups, sessions, students } from "@/db/schema";
import type { Group, Student } from "@/db/schema";
import { forbidden, unauthorized } from "@/lib/http";

export const SESSION_COOKIE = "dapur_sptldv_session";
export const SESSION_TTL_DAYS = 30;
const LAST_SEEN_UPDATE_MS = 5 * 60 * 1000;

export type StudentContext = {
  kind: "student";
  student: Student;
  group: (Pick<Group, "id" | "name" | "pin"> & { memberCount: number }) | null;
  token: string;
};

export type TeacherContext = {
  kind: "teacher";
  token: string;
};

export type SessionContext = StudentContext | TeacherContext;

type CookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(input: {
  role: "student" | "teacher";
  studentId?: number | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<string> {
  const db = getDb();
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    token,
    role: input.role,
    studentId: input.studentId ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent?.slice(0, 300) ?? null,
    expiresAt,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions());
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * Satu query JOIN: sesi + siswa + anggota kelompok + kelompok.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const rows = await db
    .select({
      session: sessions,
      student: students,
      group: groups,
      memberCount: sql<number>`(
        SELECT count(*)::int FROM ${groupMembers} gm WHERE gm.group_id = ${groups.id}
      )`,
    })
    .from(sessions)
    .leftJoin(students, eq(sessions.studentId, students.id))
    .leftJoin(groupMembers, eq(groupMembers.studentId, students.id))
    .leftJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Perbarui last_seen_at paling sering sekali tiap 5 menit.
  const now = Date.now();
  if (now - new Date(row.session.lastSeenAt).getTime() > LAST_SEEN_UPDATE_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.token, token));
    if (row.student) {
      await db
        .update(students)
        .set({ lastSeenAt: new Date() })
        .where(eq(students.id, row.student.id));
    }
  }

  if (row.session.role === "teacher") {
    return { kind: "teacher", token };
  }

  if (!row.student) return null;

  return {
    kind: "student",
    student: row.student,
    token,
    group: row.group
      ? { id: row.group.id, name: row.group.name, pin: row.group.pin, memberCount: row.memberCount ?? 0 }
      : null,
  };
}

export async function requireStudent(): Promise<StudentContext> {
  const context = await getSessionContext();
  if (!context || context.kind !== "student") {
    throw unauthorized("Kamu belum masuk sebagai siswa. Silakan login dulu.");
  }
  return context;
}

export async function requireTeacher(): Promise<TeacherContext> {
  const context = await getSessionContext();
  if (!context || context.kind !== "teacher") {
    throw forbidden("Hanya guru yang bisa mengakses halaman/API ini.");
  }
  return context;
}

/** Gerbang fase proyek & fase akhir: wajib sudah tergabung di kelompok. */
export async function requireGroupMember(): Promise<StudentContext & { group: NonNullable<StudentContext["group"]> }> {
  const context = await requireStudent();
  if (!context.group) {
    throw forbidden(
      "Kamu belum tergabung di kelompok. Gabung memakai PIN dari guru untuk membuka tahap proyek.",
    );
  }
  return context as StudentContext & { group: NonNullable<StudentContext["group"]> };
}

/** Hapus sesi kedaluwarsa (dipanggil cron harian /api/health). */
export async function purgeExpiredSessions(): Promise<number> {
  const db = getDb();
  const removed = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ token: sessions.token });
  return removed.length;
}
