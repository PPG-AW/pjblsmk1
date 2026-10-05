import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getJournalEntries } from "@/db/queries";
import { journals } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth";
import { todayJakarta } from "@/lib/date";
import { badRequest, readJson, route } from "@/lib/http";
import { JOURNAL_ACTIVITY_TYPES } from "@/lib/sptldv";
import { asString, oneOf } from "@/lib/validation";

/** GET /api/journal — entri jurnal seluruh anggota kelompok. */
export const GET = route(async () => {
  const context = await requireGroupMember();
  const entries = await getJournalEntries(context.group.id);
  return NextResponse.json({
    entries: entries.map((entry) => ({
      ...entry,
      isMine: entry.studentId === context.student.id,
      updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt,
    })),
    activityTypes: JOURNAL_ACTIVITY_TYPES,
    today: todayJakarta(),
  });
});

/** POST /api/journal — tambah entri jurnal harian milik sendiri. */
export const POST = route(async (request) => {
  const context = await requireGroupMember();
  const body = await readJson(request);

  const entryDate = asString(body.entryDate ?? todayJakarta(), "Tanggal", { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    throw badRequest("Tanggal harus berformat YYYY-MM-DD.");
  }
  if (entryDate > todayJakarta()) {
    throw badRequest("Tanggal tidak boleh di masa depan.");
  }

  const activityType = oneOf(body.activityType, "Jenis kegiatan", JOURNAL_ACTIVITY_TYPES, "Jenis kegiatan");
  const activity = asString(body.activity, "Kegiatan", { min: 3, max: 600 });
  const obstacle = asString(body.obstacle ?? "", "Kendala", { max: 600, required: false });
  const contribution = asString(body.contribution, "Kontribusi saya", { min: 10, max: 1200 });

  const db = getDb();
  const inserted = await db
    .insert(journals)
    .values({
      studentId: context.student.id,
      groupId: context.group.id,
      entryDate,
      activityType,
      activity,
      obstacle,
      contribution,
    })
    .returning({ id: journals.id });

  return NextResponse.json({ ok: true, id: inserted[0]?.id, message: "Entri jurnal tersimpan." });
});

/** Penyuntingan & penghapusan ada di /api/journal/[id]. */
