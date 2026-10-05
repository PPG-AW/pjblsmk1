import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { groups } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { badRequest, conflict, notFound, route } from "@/lib/http";
import { generatePin } from "@/lib/pin";

type Context = { params: Promise<{ id: string }> };

/** POST /api/teacher/groups/[id]/pin — reset PIN kelompok. */
export const POST = route<Context>(async (_request, context) => {
  await requireTeacher();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("ID kelompok tidak valid.");

  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const pin = generatePin();
    const existing = await db.select({ id: groups.id }).from(groups).where(eq(groups.pin, pin)).limit(1);
    if (existing.length > 0) continue;
    const updated = await db.update(groups).set({ pin }).where(eq(groups.id, id)).returning();
    if (updated.length === 0) throw notFound("Kelompok tidak ditemukan.");
    return NextResponse.json({ ok: true, pin });
  }
  throw conflict("Gagal membuat PIN unik. Coba lagi.");
});
