/**
 * Tipe data bersama (dipakai di skema database, API, dan komponen).
 */

/** Status kelengkapan satu item data hasil wawancara (kegiatan Pertemuan 2). */
export type DataStatus = "lengkap" | "belum_jelas" | "belum_ada";

export const DATA_STATUS_LABEL: Record<DataStatus, string> = {
  lengkap: "Lengkap",
  belum_jelas: "Belum jelas",
  belum_ada: "Belum ada",
};

export const DATA_STATUS_ORDER: DataStatus[] = ["lengkap", "belum_jelas", "belum_ada"];

/**
 * Satu bahan pokok hasil wawancara.
 * perA/perB = kebutuhan bahan untuk 1 unit produk A / B.
 * total = stok/total bahan yang tersedia.
 */
export type Ingredient = {
  name: string;
  unit: string;
  perA: number;
  perB: number;
  total: number;
  status: DataStatus;
  followUp: string;
};

/** Status kelengkapan harga jual & biaya produksi (fungsi tujuan). */
export type MoneyData = {
  priceA: DataStatus;
  priceB: DataStatus;
  costA: DataStatus;
  costB: DataStatus;
  followUp: string;
};

/** Peran anggota kelompok pada Project Planning Sheet. */
export type RoleAssignment = {
  studentId: number;
  roles: string[];
};

/** Baris jadwal proyek. */
export type ScheduleRow = {
  activity: string;
  place: string;
  date: string;
  person: string;
};

export type InequalityLineResult = {
  rowLabel: string;
  status: "benar" | "setara" | "koefisien" | "ruas_kanan" | "tanda" | "kosong" | "tidak_dikenal";
  hint: string;
  matchedInput?: string;
};

export type InequalityCheckResult = {
  correct: boolean;
  hintLevel: number;
  lines: InequalityLineResult[];
  extra: string[];
  summary: string;
};

export type QuizStoredAnswer = {
  questionId: string;
  chosen: number | null;
  correct: boolean;
};

export type ReflectionAnswers = {
  keberhasilan: string;
  tantangan: string;
  solusi: string;
  bermakna: string;
  perbaikan: string;
};

export const REFLECTION_QUESTIONS: { key: keyof ReflectionAnswers; question: string }[] = [
  { key: "keberhasilan", question: "Apa keberhasilan kelompok kami dalam proyek ini?" },
  { key: "tantangan", question: "Apa tantangan yang kami hadapi saat mengerjakan proyek?" },
  { key: "solusi", question: "Solusi apa yang kami temukan untuk mengatasi tantangan itu?" },
  { key: "bermakna", question: "Satu pengalaman bermakna apa yang saya dapat dari proyek ini?" },
  {
    key: "perbaikan",
    question: "Satu hal apa yang akan kami perbaiki pada proyek berikutnya?",
  },
];

export type GroupStatus = "lancar" | "perhatian" | "masalah";
