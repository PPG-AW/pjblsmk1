import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { classRoster } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { asString } from "@/lib/validation";

/**
 * PUT /api/teacher/roster
 * Guru menempel daftar nama kelas (satu nama per baris). Nama di luar daftar
 * akan ditolak saat login apabila pengaturan "hanya nama dalam daftar kelas"
 * aktif.
 */
export const PUT = route(async (request) => {
  await requireTeacher();
  const body = await readJson(request);
  const text = asString(body.text ?? "", "Daftar nama", { max: 8000, required: false });

  const names = Array.from(
    new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter((line) => line.length >= 3)
        .slice(0, 300),
    ),
  );

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(classRoster);
    if (names.length > 0) {
      await tx.insert(classRoster).values(names.map((name) => ({ name }))).onConflictDoNothing();
    }
  });

  return NextResponse.json({
    ok: true,
    count: names.length,
    message: names.length > 0 ? `${names.length} nama tersimpan di daftar kelas.` : "Daftar kelas dikosongkan.",
  });
});
