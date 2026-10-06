import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { groups } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { conflict, readJson, route } from "@/lib/http";
import { generatePin } from "@/lib/pin";
import { asString } from "@/lib/validation";

/** POST /api/teacher/groups, buat kelompok baru (PIN dibuat otomatis). */
export const POST = route(async (request) => {
  await requireTeacher();
  const body = await readJson(request);
  const name = asString(body.name, "Nama kelompok", { min: 2, max: 60 });
  const db = getDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const pin = generatePin();
    const existing = await db.select({ id: groups.id }).from(groups).where(eq(groups.pin, pin)).limit(1);
    if (existing.length > 0) continue;
    const inserted = await db.insert(groups).values({ name, pin }).returning();
    return NextResponse.json({ ok: true, group: inserted[0] });
  }

  throw conflict("Gagal membuat PIN unik. Coba lagi.");
});
