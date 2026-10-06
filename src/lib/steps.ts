/**
 * Peta langkah belajar siswa.
 *
 * Satu sumber kebenaran untuk: menu di header, bilah "langkah berikutnya", dan
 * tombol lanjut setelah "Tandai selesai". Urutan di sini harus sama dengan
 * urutan RPP (memahami → proyek → akhir).
 */

export type StudentStep = {
  /** Nomor langkah yang ditampilkan (0 = beranda, tidak diberi nomor). */
  n: number;
  href: string;
  /** Label pada menu header, harus sama dengan navigasi sebelumnya. */
  nav: string;
  /** Judul singkat untuk tombol lanjut/kembali. */
  short: string;
  title: string;
  /** Apa yang harus dikerjakan siswa di halaman ini. */
  todo: string;
};

export const STUDENT_STEPS: StudentStep[] = [
  {
    n: 0,
    href: "/dashboard",
    nav: "Beranda",
    short: "Beranda",
    title: "Beranda dan kemajuanmu",
    todo: "Lihat kemajuan tiga fase, lalu mulai dari langkah 1 (Cerita).",
  },
  {
    n: 1,
    href: "/belajar/cerita",
    nav: "1 · Cerita",
    short: "Cerita",
    title: "Cerita masalah D'Culinary",
    todo: "Baca cerita tiga babak, renungkan pertanyaan pemantik, lalu tekan “Tandai selesai”.",
  },
  {
    n: 2,
    href: "/belajar/modul",
    nav: "2 · Modul",
    short: "Modul",
    title: "Modul: model matematika, grafik, titik pojok",
    todo: "Pelajari tiga bagian modul dengan data contoh, lalu tekan “Tandai selesai”.",
  },
  {
    n: 3,
    href: "/belajar/grafik",
    nav: "3 · Lab Grafik",
    short: "Lab Grafik",
    title: "Lab Grafik: eksplorasi",
    todo: "Ketik pertidaksamaanmu sendiri, amati DHP, lalu tekan “Tandai selesai”.",
  },
  {
    n: 4,
    href: "/belajar/kuis",
    nav: "4 · Kuis",
    short: "Kuis",
    title: "Kuis kesiapan",
    todo: "Kerjakan 10 soal. Skormu dipakai guru untuk menyusun kelompok.",
  },
  {
    n: 5,
    href: "/proyek/perencanaan",
    nav: "5 · Perencanaan",
    short: "Perencanaan",
    title: "Project Planning Sheet",
    todo: "Isi 10 bagian rencana kelompok dan pilih nomor urut hari wawancara.",
  },
  {
    n: 6,
    href: "/proyek/wawancara",
    nav: "6 · Wawancara",
    short: "Wawancara",
    title: "Form wawancara D'Culinary",
    todo: "Catat bahan pokok, harga jual, dan biaya produksi hasil wawancara kelompokmu.",
  },
  {
    n: 7,
    href: "/proyek/pertidaksamaan",
    nav: "7 · Pertidaksamaan",
    short: "Pertidaksamaan",
    title: "Susun pertidaksamaan",
    todo: "Susun model pertidaksamaan dari data wawancara, lalu periksa jawabanmu.",
  },
  {
    n: 8,
    href: "/proyek/grafik",
    nav: "8 · Verifikasi",
    short: "Verifikasi",
    title: "Verifikasi grafik",
    todo: "Gambar ulang model kelompokmu, cocokkan DHP dengan LKPD, lalu tandai selesai.",
  },
  {
    n: 9,
    href: "/proyek/jurnal",
    nav: "9 · Jurnal",
    short: "Jurnal",
    title: "Jurnal harian",
    todo: "Tulis jurnal setiap hari kegiatan. Kontribusimu wajib diisi.",
  },
  {
    n: 10,
    href: "/akhir/produk",
    nav: "10 · Produk",
    short: "Produk akhir",
    title: "Produk akhir kelompok",
    todo: "Kumpulkan tautan Google Drive produk akhir + ringkasan dan rekomendasi produksi.",
  },
  {
    n: 11,
    href: "/akhir/refleksi",
    nav: "11 · Refleksi",
    short: "Refleksi",
    title: "Refleksi pribadi",
    todo: "Isi lima pertanyaan refleksi dan rating 1–5. Ini langkah terakhir.",
  },
];

/** Jumlah langkah bernomor (tanpa beranda). */
export const LAST_STEP_NUMBER = STUDENT_STEPS[STUDENT_STEPS.length - 1]!.n;

/** Cari langkah berdasarkan pathname (cocok persis atau sebagai awalan). */
export function findStepIndex(pathname: string): number {
  const clean = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  const exact = STUDENT_STEPS.findIndex((step) => step.href === clean);
  if (exact >= 0) return exact;
  return STUDENT_STEPS.findIndex((step) => clean.startsWith(`${step.href}/`));
}

export function stepFor(pathname: string): StudentStep | null {
  const index = findStepIndex(pathname);
  return index >= 0 ? STUDENT_STEPS[index]! : null;
}

export function nextStepFor(pathname: string): StudentStep | null {
  const index = findStepIndex(pathname);
  if (index < 0) return null;
  return STUDENT_STEPS[index + 1] ?? null;
}

export function prevStepFor(pathname: string): StudentStep | null {
  const index = findStepIndex(pathname);
  if (index <= 0) return null;
  return STUDENT_STEPS[index - 1] ?? null;
}
