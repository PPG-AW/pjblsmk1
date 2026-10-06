import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { reminders } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { badRequest, notFound, readJson, route } from "@/lib/http";
import { asBoolean, asNumber, asString } from "@/lib/validation";

/** GET /api/teacher/reminders */
export const GET = route(async () => {
  await requireTeacher();
  const db = getDb();
  const rows = await db.select().from(reminders).orderBy(desc(reminders.createdAt));
  return NextResponse.json({ reminders: rows });
});

/** POST /api/teacher/reminders, kirim pengingat untuk siswa. */
export const POST = route(async (request) => {
  await requireTeacher();
  const body = await readJson(request);
  const message = asString(body.message, "Isi pengingat", { min: 5, max: 500 });
  const db = getDb();
  const inserted = await db.insert(reminders).values({ message }).returning();
  return NextResponse.json({ ok: true, reminder: inserted[0] });
});

/** PATCH /api/teacher/reminders, aktif/non-aktifkan pengingat. */
export const PATCH = route(async (request) => {
  await requireTeacher();
  const body = await readJson(request);
  const id = asNumber(body.id, "Pengingat", { min: 1, integer: true });
  const active = asBoolean(body.active, "Status pengingat");
  const db = getDb();
  const updated = await db.update(reminders).set({ active }).where(eq(reminders.id, id)).returning({ id: reminders.id });
  if (updated.length === 0) throw notFound("Pengingat tidak ditemukan.");
  return NextResponse.json({ ok: true });
});

/** DELETE /api/teacher/reminders?id=1 */
export const DELETE = route(async (request) => {
  await requireTeacher();
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw badRequest("ID pengingat tidak valid.");
  const db = getDb();
  const deleted = await db.delete(reminders).where(eq(reminders.id, id)).returning({ id: reminders.id });
  if (deleted.length === 0) throw notFound("Pengingat tidak ditemukan.");
  return NextResponse.json({ ok: true, message: "Pengingat dihapus." });
});
