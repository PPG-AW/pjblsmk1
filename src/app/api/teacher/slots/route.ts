import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { interviewSlots } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { asArray, asNumber, asString, optionalString } from "@/lib/validation";

/** GET /api/teacher/slots — daftar slot wawancara. */
export const GET = route(async () => {
  await requireTeacher();
  const db = getDb();
  const rows = await db.select().from(interviewSlots).orderBy(asc(interviewSlots.label));
  return NextResponse.json({ slots: rows });
});

/**
 * POST /api/teacher/slots — buat slot wawancara.
 * Body: { label, date } atau { count, date, prefix } untuk membuat beberapa sekaligus.
 */
export const POST = route(async (request) => {
  await requireTeacher();
  const body = await readJson(request);
  const db = getDb();

  if (body.count !== undefined && body.count !== null) {
    const count = asNumber(body.count, "Jumlah slot", { min: 1, max: 30, integer: true });
    const prefix = asString(body.prefix ?? "Slot", "Awalan nama slot", { max: 30, required: false }) || "Slot";
    const date = optionalString(body.date, "Tanggal", { max: 40 }) ?? "";
    const values = Array.from({ length: count }, (_, index) => ({
      label: `${prefix} ${index + 1}`,
      date,
    }));
    await db.insert(interviewSlots).values(values);
    return NextResponse.json({ ok: true, created: values.length });
  }

  const label = asString(body.label, "Nama slot", { min: 2, max: 60 });
  const date = optionalString(body.date, "Tanggal", { max: 40 }) ?? "";
  const inserted = await db.insert(interviewSlots).values({ label, date }).returning();
  return NextResponse.json({ ok: true, slot: inserted[0] });
});

void asArray;
