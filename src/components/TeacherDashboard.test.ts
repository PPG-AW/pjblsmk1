import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TeacherDashboard from "./TeacherDashboard";

/* -------------------------------------------------------------------------- */
/* Data contoh untuk menguji tampilan dashboard guru tanpa database           */
/* -------------------------------------------------------------------------- */

const overview = {
  settings: { quizScoreMode: "pertama" as const, currentStage: 2, restrictRoster: true },
  groups: [
    {
      id: 1,
      name: "Kelompok 1",
      pin: "K7M2QP",
      members: [
        {
          studentId: 1,
          name: "Aulia Rahma",
          quizScore: 80,
          quizAttempts: 2,
          journalCount: 2,
          hasActivity: true,
          reflectionDone: false,
          lastSeenAt: "2026-10-06T02:00:00.000Z",
          roles: ["ketua"],
        },
        {
          studentId: 2,
          name: "Bima Saputra",
          quizScore: null as number | null,
          quizAttempts: 0,
          journalCount: 0,
          hasActivity: false,
          reflectionDone: false,
          lastSeenAt: null as string | null,
          roles: [] as string[],
        },
      ],
      planning: {
        status: "draft",
        updatedAt: "2026-10-05T02:00:00.000Z",
        updatedByName: "Aulia Rahma",
        productA: "Roti",
        productB: "Risol",
        slotLabel: "Slot 1",
        teacherNote: null as string | null,
        rolesFilled: false,
      },
      interview: {
        exists: true,
        completeCount: 3,
        unclearCount: 1,
        missingCount: 0,
        followUps: ['{"bahan":"Ayam","tindakLanjut":"cek harga pasar"}'],
        objectiveReady: false,
      },
      journal: {
        total: 2,
        perMember: { "1": 2, "2": 0 } as Record<string, number>,
        lastAt: "2026-10-06T02:00:00.000Z",
        grid: {
          dates: ["2026-10-06", "2026-10-05"],
          members: [
            {
              studentId: 1,
              name: "Aulia Rahma",
              cells: {
                "2026-10-06": { count: 1, activityTypes: ["Pertemuan 1"] },
                "2026-10-05": { count: 2, activityTypes: ["Wawancara/observasi", "Lainnya"] },
              },
              total: 2,
              lastDate: "2026-10-06",
            },
            {
              studentId: 2,
              name: "Bima Saputra",
              cells: {} as Record<string, { count: number; activityTypes: string[] }>,
              total: 0,
              lastDate: null as string | null,
            },
          ],
        },
      },
      finalProduct: null as { type: string; title: string; link: string; updatedAt: string | null } | null,
      reflections: { done: 1, total: 2 },
      status: "perhatian" as const,
      statusReasons: ["1 anggota belum menulis jurnal"],
    },
  ],
  ungrouped: [
    { studentId: 3, name: "Citra Dewi", quizScore: 70, quizAttempts: 1, hasActivity: true },
  ],
  slots: [{ id: 1, label: "Slot 1", date: "2026-10-07", groupId: 1, groupName: "Kelompok 1" }],
  reminders: [
    { id: 1, message: "besok kumpulkan data harga jual", active: true, createdAt: "2026-10-05T02:00:00.000Z" },
  ],
  roster: [
    { name: "Aulia Rahma", studentExists: true },
    { name: "Bima Saputra", studentExists: true },
  ],
  classStats: {
    studentCount: 3,
    groupCount: 1,
    withoutScore: 1,
    averageScore: 80,
    submittedFinalProducts: 0,
    submittedReflections: 1,
  },
};

function render(menu: "nilai" | "jurnal" | "pengaturan"): string {
  return renderToStaticMarkup(createElement(TeacherDashboard, { initialOverview: overview, initialMenu: menu }));
}

describe("dashboard guru berbasis menu", () => {
  it("menampilkan tiga menu utama", () => {
    const html = render("nilai");
    expect(html).toContain("Rekap nilai siswa");
    expect(html).toContain("Laporan jurnal");
    expect(html).toContain("Pengaturan");
  });

  it("menu rekap nilai memuat tabel nilai per siswa dan ringkasan kelas", () => {
    const html = render("nilai");
    expect(html).toContain("Rekap nilai per siswa");
    expect(html).toContain("Aulia Rahma");
    expect(html).toContain("Rata-rata skor");
    expect(html).toContain("Unduh CSV skor kuis");
    // menu lain tidak ikut tampil supaya halaman tetap rapi
    expect(html).not.toContain("Grid jurnal per kelompok");
    expect(html).not.toContain("Slot wawancara");
  });

  it("menu laporan jurnal memuat grid per kelompok beserta tanggal dan sel entri", () => {
    const html = render("jurnal");
    expect(html).toContain("Grid jurnal per kelompok");
    expect(html).toContain("Kontribusi jurnal per anggota");
    expect(html).toContain("6 Okt &#x27;26");
    expect(html).toContain("5 Okt &#x27;26");
    expect(html).toContain("Pertemuan 1");
    expect(html).toContain("belum menulis");
    expect(html).toContain("Kirim pengingat");
    expect(html).not.toContain("Unduh CSV skor kuis");
  });

  it("menu pengaturan memuat kelompok, slot wawancara, dan daftar kelas", () => {
    const html = render("pengaturan");
    expect(html).toContain("Daftar nama kelas");
    expect(html).toContain("Slot wawancara");
    expect(html).toContain("Saran pembagian kelompok heterogen");
    expect(html).toContain("Reset PIN");
    expect(html).toContain("Siswa belum berkelompok");
  });

  it("tidak memakai tanda pisah panjang pada seluruh menu", () => {
    for (const menu of ["nilai", "jurnal", "pengaturan"] as const) {
      expect(render(menu)).not.toContain("\u2014");
    }
  });
});
