import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { planningSheets } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { badRequest, notFound, readJson, route } from "@/lib/http";
import { asNumber, asString } from "@/lib/validation";

/** PATCH /api/teacher/planning, catatan/umpan balik guru pada planning sheet kelompok. */
export const PATCH = route(async (request) => {
  await requireTeacher();
  const body = await readJson(request);
  const groupId = asNumber(body.groupId, "Kelompok", { min: 1, integer: true });
  const note = asString(body.note ?? "", "Catatan guru", { max: 1500, required: false });

  const db = getDb();
  const existing = await db
    .select({ id: planningSheets.id })
    .from(planningSheets)
    .where(eq(planningSheets.groupId, groupId))
    .limit(1);

  if (existing.length === 0) {
    // Lembar perencanaan belum dibuat kelompok -> buat wadah catatan guru.
    await db.insert(planningSheets).values({ groupId, teacherNote: note || null, updatedAt: new Date() });
  } else {
    await db
      .update(planningSheets)
      .set({ teacherNote: note || null, updatedAt: new Date() })
      .where(eq(planningSheets.groupId, groupId));
  }

  if (!existing.length && note === "") {
    throw badRequest("Isi catatan guru terlebih dahulu.");
  }

  return NextResponse.json({ ok: true, message: "Catatan guru tersimpan." });
});

void notFound;
