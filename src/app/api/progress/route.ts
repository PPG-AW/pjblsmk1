import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { progress } from "@/db/schema";
import { requireGroupMember, requireStudent } from "@/lib/auth";
import { badRequest, readJson, route } from "@/lib/http";
import { oneOf } from "@/lib/validation";

/** Item progres fase memahami (terbuka untuk semua siswa yang login). */
const OPEN_ITEMS = ["cerita", "modul", "grafik"] as const;
/** Item progres fase proyek (wajib sudah tergabung di kelompok). */
const GROUP_ITEMS = ["grafik_verifikasi"] as const;

/** POST /api/progress, tandai langkah selesai. */
export const POST = route(async (request) => {
  const body = await readJson(request);
  const item = oneOf(body.item, "item", [...OPEN_ITEMS, ...GROUP_ITEMS], "Item progres");

  const isGroupItem = (GROUP_ITEMS as readonly string[]).includes(item);
  const context = isGroupItem ? await requireGroupMember() : await requireStudent();

  if (!isGroupItem && !(OPEN_ITEMS as readonly string[]).includes(item)) {
    throw badRequest("Item progres tidak dikenali.");
  }

  const db = getDb();
  await db
    .insert(progress)
    .values({ studentId: context.student.id, item })
    .onConflictDoNothing({ target: [progress.studentId, progress.item] });

  return NextResponse.json({ ok: true, item });
});
