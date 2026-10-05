import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { getSettings, saveSettings, type QuizScoreMode } from "@/lib/settings";
import { asBoolean, asNumber, oneOf } from "@/lib/validation";

/** GET /api/teacher/settings */
export const GET = route(async () => {
  await requireTeacher();
  const settings = await getSettings();
  return NextResponse.json({ settings });
});

/**
 * PUT /api/teacher/settings
 * - quizScoreMode: "pertama" (default) atau "tertinggi"
 * - currentStage: 1..3 (pertemuan/tahap berjalan)
 * - restrictRoster: hanya nama dalam daftar kelas yang boleh login
 */
export const PUT = route(async (request) => {
  await requireTeacher();
  const body = await readJson(request);

  const quizScoreMode: QuizScoreMode = oneOf(
    body.quizScoreMode ?? "pertama",
    "Skor kuis yang dipakai",
    ["pertama", "tertinggi"] as const,
    "Skor kuis yang dipakai",
  );
  const currentStage = asNumber(body.currentStage ?? 1, "Pertemuan/tahap berjalan", {
    min: 1,
    max: 3,
    integer: true,
  });
  const restrictRoster = asBoolean(body.restrictRoster ?? false, "Batasi ke daftar kelas");

  const settings = await saveSettings({ quizScoreMode, currentStage, restrictRoster });
  return NextResponse.json({ ok: true, settings, message: "Pengaturan tersimpan." });
});
