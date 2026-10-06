import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { groupMembers, groups, students } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { badRequest, notFound, readJson, route } from "@/lib/http";
import { asNumber } from "@/lib/validation";

function readIds(body: Record<string, unknown>) {
  const studentId = asNumber(body.studentId, "Siswa", { min: 1, integer: true });
  const groupId = asNumber(body.groupId, "Kelompok", { min: 1, integer: true });
  return { studentId, groupId };
}

/** POST /api/teacher/groups/members, pindahkan/masukkan siswa ke kelompok. */
export const POST = route(async (request) => {
  await requireTeacher();
  const { studentId, groupId } = readIds(await readJson(request));
  const db = getDb();

  const [group] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group) throw notFound("Kelompok tidak ditemukan.");
  const [student] = await db.select({ id: students.id }).from(students).where(eq(students.id, studentId)).limit(1);
  if (!student) throw notFound("Siswa tidak ditemukan.");

  await db
    .insert(groupMembers)
    .values({ groupId, studentId })
    .onConflictDoUpdate({ target: groupMembers.studentId, set: { groupId } });

  return NextResponse.json({ ok: true, message: "Anggota dipindahkan." });
});

/** DELETE /api/teacher/groups/members, keluarkan siswa dari kelompoknya. */
export const DELETE = route(async (request) => {
  await requireTeacher();
  const { studentId, groupId } = readIds(await readJson(request));
  const db = getDb();

  const removed = await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.studentId, studentId), eq(groupMembers.groupId, groupId)))
    .returning({ id: groupMembers.id });

  if (removed.length === 0) throw badRequest("Siswa itu tidak berada di kelompok tersebut.");
  return NextResponse.json({ ok: true, message: "Anggota dikeluarkan dari kelompok." });
});
