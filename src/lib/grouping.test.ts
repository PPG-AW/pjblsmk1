import { describe, expect, it } from "vitest";
import { suggestHeterogeneousGroups, type ScoredStudent } from "@/lib/grouping";

function students(scores: (number | null)[]): ScoredStudent[] {
  return scores.map((score, index) => ({
    studentId: index + 1,
    name: `Siswa ${String.fromCharCode(65 + index)}`,
    score,
  }));
}

describe("suggestHeterogeneousGroups", () => {
  it("membagi 20 siswa menjadi 5 kelompok berisi 4 orang", () => {
    const result = suggestHeterogeneousGroups(students([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]));
    expect(result.groups).toHaveLength(5);
    for (const group of result.groups) expect(group.studentIds).toHaveLength(4);
  });

  it("menyeimbangkan rata-rata skor (pola ular)", () => {
    const scores = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const result = suggestHeterogeneousGroups(students(scores), { size: 4, mode: "kecil" });
    const averages = result.groups.map((group) => group.averageScore ?? 0);
    expect(Math.max(...averages) - Math.min(...averages)).toBeLessThanOrEqual(2.5);
  });

  it("menyebarkan sisa siswa ke kelompok berukuran 5 (mode seimbang)", () => {
    const result = suggestHeterogeneousGroups(students([9, 8, 7, 6, 5, 4, 3, 2, 1]).filter(Boolean), {
      size: 4,
      mode: "seimbang",
    });
    const sizes = result.groups.map((group) => group.studentIds.length).sort();
    expect(sizes).toEqual([4, 5]);
    expect(result.note).toContain("Mode \"seimbang\"");
  });

  it("membuat kelompok kecil 3 orang (mode kecil)", () => {
    const result = suggestHeterogeneousGroups(students([9, 8, 7, 6, 5, 4, 3]), { size: 4, mode: "kecil" });
    const sizes = result.groups.map((group) => group.studentIds.length).sort();
    expect(sizes).toEqual([3, 4]);
  });

  it("menempatkan siswa tanpa skor di akhir dan menandainya", () => {
    const result = suggestHeterogeneousGroups(students([10, null, 8, null, 6, 5, 4, 3, 2]), { size: 4 });
    expect(result.withoutScore).toHaveLength(2);
    expect(result.note).toContain("belum punya skor");
  });

  it("menangani daftar kosong", () => {
    const result = suggestHeterogeneousGroups([]);
    expect(result.groups).toHaveLength(0);
    expect(result.note).toContain("Belum ada siswa");
  });

  it("tidak pernah kehilangan atau menggandakan siswa", () => {
    const list = students([7, 6, 5, 4, 3, 2, 1, null, 9, 8, 10]);
    const result = suggestHeterogeneousGroups(list, { size: 4 });
    const allIds = result.groups.flatMap((group) => group.studentIds);
    expect(allIds).toHaveLength(list.length);
    expect(new Set(allIds).size).toBe(list.length);
  });
});
