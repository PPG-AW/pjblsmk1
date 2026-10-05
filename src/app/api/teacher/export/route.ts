import { getTeacherOverview } from "@/db/queries";
import { requireTeacher } from "@/lib/auth";
import { csvResponse, timestampSuffix, type CsvCell } from "@/lib/csv";
import { badRequest, route } from "@/lib/http";
import { FINAL_PRODUCT_TYPES } from "@/lib/sptldv";

const EXPORT_TYPES = ["quiz", "groups", "journal", "status"] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

function productLabel(value: string): string {
  return FINAL_PRODUCT_TYPES.find((type) => type.value === value)?.label ?? value ?? "-";
}

/**
 * GET /api/teacher/export?type=quiz|groups|journal|status
 * Ekspor CSV: skor kuis, daftar kelompok, kontribusi jurnal, dan status tahapan.
 */
export const GET = route(async (request) => {
  await requireTeacher();
  const url = new URL(request.url);
  const rawType = url.searchParams.get("type") ?? "quiz";
  if (!(EXPORT_TYPES as readonly string[]).includes(rawType)) {
    throw badRequest(`Jenis ekspor harus salah satu dari: ${EXPORT_TYPES.join(", ")}.`);
  }
  const type = rawType as ExportType;
  const overview = await getTeacherOverview();
  const suffix = timestampSuffix();

  if (type === "quiz") {
    const rows: CsvCell[][] = [["Nama", "Kelompok", "Skor yang dipakai", "Percobaan", "Ada aktivitas"]];
    for (const group of overview.groups) {
      for (const member of group.members) {
        rows.push([
          member.name,
          group.name,
          member.quizScore ?? "belum ada skor",
          member.quizAttempts,
          member.hasActivity ? "ya" : "tidak",
        ]);
      }
    }
    for (const student of overview.ungrouped) {
      rows.push([
        student.name,
        "(belum berkelompok)",
        student.quizScore ?? "belum ada skor",
        student.quizAttempts,
        student.hasActivity ? "ya" : "tidak",
      ]);
    }
    return csvResponse(`skor-kuis-${suffix}.csv`, rows);
  }

  if (type === "groups") {
    const rows: CsvCell[][] = [["Kelompok", "PIN", "Anggota", "Skor rata-rata", "Status"]];
    for (const group of overview.groups) {
      const scores = group.members
        .map((member) => member.quizScore)
        .filter((score): score is number => score !== null);
      const average = scores.length > 0 ? (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2) : "-";
      const anggota = group.members.map((member) => `${member.name} (${member.quizScore ?? "-"})`).join("; ");
      rows.push([group.name, group.pin, anggota, average, group.status]);
    }
    return csvResponse(`daftar-kelompok-${suffix}.csv`, rows);
  }

  if (type === "journal") {
    const rows: CsvCell[][] = [["Kelompok", "Nama", "Jumlah entri jurnal", "Peran", "Skor kuis"]];
    for (const group of overview.groups) {
      for (const member of group.members) {
        rows.push([
          group.name,
          member.name,
          member.journalCount,
          member.roles.join(", ") || "belum diisi",
          member.quizScore ?? "-",
        ]);
      }
    }
    return csvResponse(`kontribusi-jurnal-${suffix}.csv`, rows);
  }

  const rows: CsvCell[][] = [
    [
      "Kelompok",
      "Jumlah anggota",
      "Planning sheet",
      "Slot wawancara",
      "Data lengkap",
      "Data belum jelas",
      "Data belum ada",
      "Jurnal (anggota)",
      "Produk akhir",
      "Refleksi",
      "Status",
      "Catatan status",
    ],
  ];
  for (const group of overview.groups) {
    rows.push([
      group.name,
      group.members.length,
      group.planning ? group.planning.status : "belum ada",
      group.planning?.slotLabel ?? "belum pilih",
      group.interview.completeCount,
      group.interview.unclearCount,
      group.interview.missingCount,
      group.journal.perMember ? `${group.journal.total} entri pada ${Object.keys(group.journal.perMember).length} anggota` : "0",
      group.finalProduct ? `${productLabel(group.finalProduct.type)} — ${group.finalProduct.title}` : "belum ada",
      `${group.reflections.done}/${group.reflections.total}`,
      group.status,
      group.statusReasons.join("; "),
    ]);
  }
  return csvResponse(`status-tahapan-${suffix}.csv`, rows);
});
