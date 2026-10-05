import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { groups } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { badRequest, notFound, readJson, route } from "@/lib/http";
import { asString } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("ID kelompok tidak valid.");
  return id;
}

/** PATCH /api/teacher/groups/[id] — ubah nama kelompok. */
export const PATCH = route<Context>(async (request, context) => {
  await requireTeacher();
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  const body = await readJson(request);
  const name = asString(body.name, "Nama kelompok", { min: 2, max: 60 });

  const db = getDb();
  const updated = await db.update(groups).set({ name }).where(eq(groups.id, id)).returning({ id: groups.id });
  if (updated.length === 0) throw notFound("Kelompok tidak ditemukan.");
  return NextResponse.json({ ok: true });
});

/** DELETE /api/teacher/groups/[id] — hapus kelompok beserta data anggotanya. */
export const DELETE = route<Context>(async (_request, context) => {
  await requireTeacher();
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  const db = getDb();
  const deleted = await db.delete(groups).where(eq(groups.id, id)).returning({ id: groups.id });
  if (deleted.length === 0) throw notFound("Kelompok tidak ditemukan.");
  return NextResponse.json({ ok: true, message: "Kelompok dihapus." });
});
