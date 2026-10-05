import { describe, expect, it } from "vitest";
import { buildCheckResult, buildModelTargets, interviewReadiness } from "@/lib/model";
import type { Ingredient } from "@/lib/types";

const beras: Ingredient = {
  name: "Beras",
  unit: "gram",
  perA: 100,
  perB: 150,
  total: 6000,
  status: "lengkap",
  followUp: "",
};
const ayam: Ingredient = {
  name: "Ayam",
  unit: "gram",
  perA: 80,
  perB: 40,
  total: 4000,
  status: "lengkap",
  followUp: "",
};

const interview = {
  productA: "Nasi ayam",
  productB: "Rice bowl",
  ingredients: [beras, ayam],
  priceA: 15000,
  priceB: 18000,
  costA: 9000,
  costB: 11000,
};

describe("interviewReadiness", () => {
  it("menyatakan data siap bila minimal 2 bahan lengkap dan harga/biaya terisi", () => {
    const readiness = interviewReadiness(interview);
    expect(readiness.constraintReady).toBe(true);
    expect(readiness.objectiveReady).toBe(true);
  });

  it("menolak item berstatus Belum ada sebagai kendala", () => {
    const readiness = interviewReadiness({
      ...interview,
      ingredients: [
        beras,
        { ...ayam, status: "belum_ada", perA: 0, perB: 0, total: 0 },
      ],
    });
    expect(readiness.constraintReady).toBe(false);
    expect(readiness.issues.join(" ")).toContain("Belum ada");
  });

  it("menandai keterbatasan data bila belum jelas", () => {
    const readiness = interviewReadiness({
      ...interview,
      ingredients: [beras, { ...ayam, status: "belum_jelas" }],
    });
    expect(readiness.constraintReady).toBe(true);
    expect(readiness.issues.join(" ")).toContain("Belum jelas");
  });
});

describe("buildModelTargets", () => {
  it("menyusun baris kendala dari bahan dan syarat non-negatif", () => {
    const targets = buildModelTargets(interview);
    const labels = targets.map((target) => target.key);
    expect(labels).toContain("bahan:0:beras");
    expect(labels).toContain("bahan:1:ayam");
    expect(labels).toContain("nonneg:x");
    expect(labels).toContain("nonneg:y");
    // Setiap kunci unik walau ada bahan bernama sama (satuan berbeda).
    expect(new Set(labels).size).toBe(labels.length);
    const berasTarget = targets.find((target) => target.key === "bahan:0:beras")!;
    expect(berasTarget).toMatchObject({ a: 100, b: 150, op: "<=", c: 6000 });
  });
});

describe("buildCheckResult", () => {
  const targets = buildModelTargets(interview);

  it("menyatakan benar untuk model yang tepat", () => {
    const result = buildCheckResult({
      lines: ["100x + 150y <= 6000", "80x + 40y <= 4000", "x >= 0", "y >= 0"],
      targets,
      attemptNo: 1,
      productA: "nasi ayam",
      productB: "rice bowl",
    });
    expect(result.correct).toBe(true);
    expect(result.lines.every((line) => line.status === "benar")).toBe(true);
  });

  it("memberi hint setara untuk kelipatan skala, bukan menyatakan benar", () => {
    const result = buildCheckResult({
      lines: ["2x + 3y <= 120", "2x + y <= 100", "x >= 0", "y >= 0"],
      targets,
      attemptNo: 1,
      productA: "nasi ayam",
      productB: "rice bowl",
    });
    expect(result.correct).toBe(false);
    const berasLine = result.lines.find((line) => line.rowLabel === "Bahan: Beras")!;
    expect(berasLine.status).toBe("setara");
    expect(berasLine.hint.toLowerCase()).toContain("setara");
  });

  it("menandai kesalahan ruas kanan", () => {
    const result = buildCheckResult({
      lines: ["100x + 150y <= 5000", "80x + 40y <= 4000", "x >= 0", "y >= 0"],
      targets,
      attemptNo: 1,
      productA: "nasi ayam",
      productB: "rice bowl",
    });
    const berasLine = result.lines.find((line) => line.rowLabel === "Bahan: Beras")!;
    expect(berasLine.status).toBe("ruas_kanan");
  });

  it("mencocokkan baris yang urutannya tertukar", () => {
    const result = buildCheckResult({
      lines: ["y >= 0", "80x + 40y <= 4000", "x >= 0", "150y + 100x <= 6000"],
      targets,
      attemptNo: 1,
      productA: "nasi ayam",
      productB: "rice bowl",
    });
    expect(result.correct).toBe(true);
  });

  it("memberi petunjuk makin rinci pada percobaan berikutnya", () => {
    const first = buildCheckResult({
      lines: ["100x + 150y <= 5000"],
      targets,
      attemptNo: 1,
      productA: "nasi ayam",
      productB: "rice bowl",
    });
    const third = buildCheckResult({
      lines: ["100x + 150y <= 5000"],
      targets,
      attemptNo: 3,
      productA: "nasi ayam",
      productB: "rice bowl",
    });
    expect(first.hintLevel).toBe(1);
    expect(third.hintLevel).toBe(3);
    const firstHint = first.lines.find((line) => line.rowLabel === "Bahan: Beras")?.hint ?? "";
    const thirdHint = third.lines.find((line) => line.rowLabel === "Bahan: Beras")?.hint ?? "";
    expect(thirdHint.length).toBeGreaterThan(firstHint.length);
  });

  it("melaporkan baris yang tidak dikenali tanpa membuat server error", () => {
    const result = buildCheckResult({
      lines: ["100x + 150y <= 6000", "abc", "80x + 40y <= 4000", "x >= 0", "y >= 0"],
      targets,
      attemptNo: 1,
      productA: "nasi ayam",
      productB: "rice bowl",
    });
    expect(result.correct).toBe(false);
    expect(result.extra).toContain("abc");
    expect(result.summary).toContain("abc");
  });

  it("tidak pernah menyatakan benar bila baris model kurang", () => {
    const result = buildCheckResult({
      lines: ["100x + 150y <= 6000", "80x + 40y <= 4000"],
      targets,
      attemptNo: 1,
      productA: "nasi ayam",
      productB: "rice bowl",
    });
    expect(result.correct).toBe(false);
    expect(result.lines.filter((line) => line.status === "benar")).toHaveLength(2);
  });
});
