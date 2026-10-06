import { describe, expect, it } from "vitest";
import { LAST_STEP_NUMBER, STUDENT_STEPS, findStepIndex, nextStepFor, prevStepFor, stepFor } from "./steps";

describe("urutan langkah siswa", () => {
  it("memuat 12 halaman dengan nomor unik dan berurutan", () => {
    expect(STUDENT_STEPS).toHaveLength(12);
    expect(STUDENT_STEPS.map((step) => step.n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(LAST_STEP_NUMBER).toBe(11);
  });

  it("setiap langkah punya href, judul, dan petunjuk yang terisi", () => {
    for (const step of STUDENT_STEPS) {
      expect(step.href.startsWith("/")).toBe(true);
      expect(step.nav.length).toBeGreaterThan(2);
      expect(step.title.length).toBeGreaterThan(3);
      expect(step.todo.length).toBeGreaterThan(10);
    }
  });

  it("tidak lagi memuat halaman video (sudah dihapus dari proyek)", () => {
    expect(STUDENT_STEPS.some((step) => step.href.includes("video"))).toBe(false);
    expect(STUDENT_STEPS[1]?.href).toBe("/belajar/cerita");
  });

  it("setiap langkah punya halaman yang benar-benar ada di aplikasi", () => {
    // Daftar ini dijaga manual: kalau rute dipindahkan, uji ini gagal.
    const knownHrefs = new Set([
      "/dashboard",
      "/belajar/cerita",
      "/belajar/modul",
      "/belajar/grafik",
      "/belajar/kuis",
      "/proyek/perencanaan",
      "/proyek/wawancara",
      "/proyek/pertidaksamaan",
      "/proyek/grafik",
      "/proyek/jurnal",
      "/akhir/produk",
      "/akhir/refleksi",
    ]);
    for (const step of STUDENT_STEPS) {
      expect(knownHrefs.has(step.href)).toBe(true);
    }
  });

  it("mengenali halaman lewat pathname persis", () => {
    expect(findStepIndex("/belajar/kuis")).toBe(4);
    expect(findStepIndex("/akhir/refleksi")).toBe(11);
    expect(findStepIndex("/dashboard")).toBe(0);
  });

  it("tetap mengenali halaman bila ada sub-path atau garis miring di akhir", () => {
    expect(findStepIndex("/proyek/jurnal/")).toBe(9);
    expect(findStepIndex("/proyek/jurnal?tab=baru")).toBe(9);
    expect(findStepIndex("/belajar/grafik/")).toBe(3);
  });

  it("tidak mencampur halaman grafik eksplorasi dan verifikasi", () => {
    expect(stepFor("/belajar/grafik")?.href).toBe("/belajar/grafik");
    expect(nextStepFor("/belajar/grafik")?.href).toBe("/belajar/kuis");
    expect(stepFor("/proyek/grafik")?.href).toBe("/proyek/grafik");
    expect(nextStepFor("/proyek/grafik")?.href).toBe("/proyek/jurnal");
  });

  it("tidak menerima halaman di luar urutan siswa", () => {
    expect(stepFor("/guru/dashboard")).toBeNull();
    expect(nextStepFor("/halaman-tidak-ada")).toBeNull();
  });

  it("beranda tidak punya langkah sebelumnya, refleksi tidak punya langkah berikutnya", () => {
    expect(prevStepFor("/dashboard")).toBeNull();
    expect(nextStepFor("/dashboard")?.n).toBe(1);
    expect(nextStepFor("/akhir/refleksi")).toBeNull();
    expect(prevStepFor("/akhir/refleksi")?.n).toBe(10);
  });
});
