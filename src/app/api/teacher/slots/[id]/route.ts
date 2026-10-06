import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { interviewSlots } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { badRequest, notFound, readJson, route } from "@/lib/http";
import { asString, optionalString } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("ID slot tidak valid.");
  return id;
}

/** PATCH /api/teacher/slots/[id], ubah nama/tanggal slot. */
export const PATCH = route<Context>(async (request, context) => {
  await requireTeacher();
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  const body = await readJson(request);

  const label = asString(body.label, "Nama slot", { min: 2, max: 60 });
  const date = optionalString(body.date, "Tanggal", { max: 40 }) ?? "";

  const db = getDb();
  const updated = await db
    .update(interviewSlots)
    .set({ label, date })
    .where(eq(interviewSlots.id, id))
    .returning({ id: interviewSlots.id });
  if (updated.length === 0) throw notFound("Slot tidak ditemukan.");
  return NextResponse.json({ ok: true });
});

/** DELETE /api/teacher/slots/[id], hapus slot (kelompok otomatis kehilangan slot). */
export const DELETE = route<Context>(async (_request, context) => {
  await requireTeacher();
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  const db = getDb();
  const deleted = await db
    .delete(interviewSlots)
    .where(eq(interviewSlots.id, id))
    .returning({ id: interviewSlots.id });
  if (deleted.length === 0) throw notFound("Slot tidak ditemukan.");
  return NextResponse.json({ ok: true, message: "Slot dihapus." });
});
