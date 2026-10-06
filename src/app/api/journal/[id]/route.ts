import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { journals } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth";
import { badRequest, notFound, readJson, route } from "@/lib/http";
import { JOURNAL_ACTIVITY_TYPES } from "@/lib/sptldv";
import { asString, oneOf } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("ID entri jurnal tidak valid.");
  return id;
}

async function loadOwnEntry(id: number, studentId: number, groupId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(journals)
    .where(and(eq(journals.id, id), eq(journals.studentId, studentId), eq(journals.groupId, groupId)))
    .limit(1);
  const entry = rows[0];
  if (!entry) throw notFound("Entri jurnal tidak ditemukan, atau bukan milikmu.");
  return entry;
}

/** PATCH /api/journal/[id], siswa menyunting entri jurnalnya sendiri. */
export const PATCH = route<Context>(async (request, context) => {
  const auth = await requireGroupMember();
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  const entry = await loadOwnEntry(id, auth.student.id, auth.group.id);

  const body = await readJson(request);
  const entryDate = asString(body.entryDate ?? entry.entryDate, "Tanggal", { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) throw badRequest("Tanggal harus berformat YYYY-MM-DD.");

  const db = getDb();
  await db
    .update(journals)
    .set({
      entryDate,
      activityType: oneOf(body.activityType ?? entry.activityType, "Jenis kegiatan", JOURNAL_ACTIVITY_TYPES, "Jenis kegiatan"),
      activity: asString(body.activity ?? entry.activity, "Kegiatan", { min: 3, max: 600 }),
      obstacle: asString(body.obstacle ?? entry.obstacle, "Kendala", { max: 600, required: false }),
      contribution: asString(body.contribution ?? entry.contribution, "Kontribusi saya", { min: 10, max: 1200 }),
      updatedAt: new Date(),
    })
    .where(eq(journals.id, id));

  return NextResponse.json({ ok: true, message: "Entri jurnal diperbarui." });
});

/** DELETE /api/journal/[id], siswa menghapus entri jurnalnya sendiri. */
export const DELETE = route<Context>(async (_request, context) => {
  const auth = await requireGroupMember();
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  await loadOwnEntry(id, auth.student.id, auth.group.id);

  const db = getDb();
  await db.delete(journals).where(eq(journals.id, id));
  return NextResponse.json({ ok: true, message: "Entri jurnal dihapus." });
});
