/**
 * Pengaturan aplikasi (disimpan di tabel `settings`).
 */
import { getDb } from "@/db";
import { settings } from "@/db/schema";

export type QuizScoreMode = "pertama" | "tertinggi";

export type AppSettings = {
  /** Skor kuis yang dipakai untuk pembagian kelompok. */
  quizScoreMode: QuizScoreMode;
  /** Pertemuan/tahap berjalan (1, 2, 3) — pengganti "hari ke-N". */
  currentStage: number;
  /** Bila aktif, hanya nama dalam daftar kelas yang boleh login. */
  restrictRoster: boolean;
};

export const SETTING_KEYS = {
  quizScoreMode: "quiz_score_mode",
  currentStage: "current_stage",
  restrictRoster: "restrict_roster",
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  quizScoreMode: "pertama",
  currentStage: 1,
  restrictRoster: false,
};

export async function getSettings(): Promise<AppSettings> {
  const db = getDb();
  const rows = await db.select().from(settings);
  const map = new Map(rows.map((row) => [row.key, row.value]));

  const scoreMode = map.get(SETTING_KEYS.quizScoreMode);
  const stage = map.get(SETTING_KEYS.currentStage);
  const restrict = map.get(SETTING_KEYS.restrictRoster);

  return {
    quizScoreMode: scoreMode === "tertinggi" ? "tertinggi" : "pertama",
    currentStage:
      typeof stage === "number" && stage >= 1 && stage <= 3 ? Math.trunc(stage) : DEFAULT_SETTINGS.currentStage,
    restrictRoster: restrict === true,
  };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const db = getDb();
  const entries: [string, unknown][] = [];
  if (patch.quizScoreMode !== undefined) entries.push([SETTING_KEYS.quizScoreMode, patch.quizScoreMode]);
  if (patch.currentStage !== undefined) entries.push([SETTING_KEYS.currentStage, patch.currentStage]);
  if (patch.restrictRoster !== undefined) entries.push([SETTING_KEYS.restrictRoster, patch.restrictRoster]);

  for (const [key, value] of entries) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  }

  return getSettings();
}

export function quizScoreFor(
  mode: QuizScoreMode,
  stats: { firstScore: number | null; highestScore: number | null },
): number | null {
  return mode === "tertinggi" ? stats.highestScore : stats.firstScore;
}

export function stageLabel(stage: number): string {
  switch (stage) {
    case 1:
      return "Pertemuan 1 — memahami masalah & menyusun rencana";
    case 2:
      return "Pertemuan 2 — wawancara, data, dan model matematika";
    case 3:
      return "Pertemuan 3 — produk akhir, presentasi, dan refleksi";
    default:
      return "Pertemuan berjalan";
  }
}
