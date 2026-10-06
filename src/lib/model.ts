/**
 * Model matematika kelompok: membangun "kunci" dari data wawancara, mengecek
 * jawaban siswa, dan menyusun petunjuk bertahap (tanpa memberi jawaban akhir).
 *
 * Titik pojok & nilai optimum TIDAK dihitung di sini, siswa mengerjakannya
 * manual di LKPD.
 */
import type { Ingredient, InequalityCheckResult, InequalityLineResult, MoneyData } from "@/lib/types";
import {
  compareInequality,
  isParseFailure,
  parseInequality,
  trimNumber,
  type ParsedInequality,
  type RelOp,
} from "@/lib/parser";

export type InterviewData = {
  productA: string;
  productB: string;
  ingredients: Ingredient[];
  priceA: number | null;
  priceB: number | null;
  costA: number | null;
  costB: number | null;
  moneyStatus?: MoneyData | null;
};

export type ModelTarget = {
  key: string;
  label: string;
  hint: string;
  a: number;
  b: number;
  op: RelOp;
  c: number;
  /** Data mentah untuk petunjuk lanjutan (bukan jawaban jadi). */
  raw?: Ingredient;
  nonNegative?: "x" | "y";
};

export type Readiness = {
  constraintReady: boolean;
  objectiveReady: boolean;
  usableIngredients: Ingredient[];
  issues: string[];
};

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function ingredientUsable(ingredient: Ingredient): boolean {
  return (
    ingredient.status !== "belum_ada" &&
    isNumber(ingredient.perA) &&
    isNumber(ingredient.perB) &&
    isNumber(ingredient.total) &&
    ingredient.total > 0 &&
    (ingredient.perA > 0 || ingredient.perB > 0) &&
    typeof ingredient.name === "string" &&
    ingredient.name.trim().length > 0
  );
}

export function interviewReadiness(interview: InterviewData | null): Readiness {
  const issues: string[] = [];
  if (!interview) {
    return {
      constraintReady: false,
      objectiveReady: false,
      usableIngredients: [],
      issues: ["Data wawancara belum diisi."],
    };
  }

  const usableIngredients = (interview.ingredients ?? []).filter(ingredientUsable);
  const belumAda = (interview.ingredients ?? []).filter(
    (ingredient) => ingredient.status === "belum_ada",
  );
  const belumJelas = (interview.ingredients ?? []).filter(
    (ingredient) => ingredient.status === "belum_jelas",
  );

  if (usableIngredients.length < 2) {
    issues.push("Minimal 2 bahan pokok harus berstatus Lengkap (atau Belum jelas dengan angka yang sudah diisi).");
  }
  if (belumAda.length > 0) {
    issues.push(
      `${belumAda.length} item berstatus "Belum ada" belum boleh dipakai sebagai kendala. Lengkapi dulu atau catat sebagai keterbatasan.`,
    );
  }
  const belumJelasTanpaTindakLanjut = belumJelas.filter((ingredient) => ingredient.followUp.trim().length === 0);
  if (belumJelasTanpaTindakLanjut.length > 0) {
    issues.push(
      `${belumJelasTanpaTindakLanjut.length} item berstatus "Belum jelas" belum mengisi kolom tindak lanjut (data apa, kepada siapa, kapan).`,
    );
  }

  const objectiveReady =
    isNumber(interview.priceA) &&
    isNumber(interview.priceB) &&
    isNumber(interview.costA) &&
    isNumber(interview.costB) &&
    interview.priceA > interview.costA &&
    interview.priceB > interview.costB;

  if (!objectiveReady) {
    issues.push(
      "Harga jual satuan dan biaya produksi per unit kedua produk harus terisi, dan harga jual harus lebih besar dari biaya produksi.",
    );
  }

  const constraintReady = usableIngredients.length >= 2;
  return { constraintReady, objectiveReady, usableIngredients, issues };
}

export function profitPerUnit(interview: InterviewData, product: "A" | "B"): number | null {
  const price = product === "A" ? interview.priceA : interview.priceB;
  const cost = product === "A" ? interview.costA : interview.costB;
  if (!isNumber(price) || !isNumber(cost)) return null;
  return price - cost;
}

export function objectiveExpression(interview: InterviewData): string | null {
  const profitA = profitPerUnit(interview, "A");
  const profitB = profitPerUnit(interview, "B");
  if (profitA === null || profitB === null) return null;
  return `Z = ${trimNumber(profitA)}x + ${trimNumber(profitB)}y`;
}

/** Susun daftar baris model yang diharapkan dari data wawancara kelompok. */
export function buildModelTargets(interview: InterviewData | null): ModelTarget[] {
  if (!interview) return [];
  const { usableIngredients } = interviewReadiness(interview);
  const targets: ModelTarget[] = [];

  usableIngredients.forEach((ingredient, index) => {
    targets.push({
      key: `bahan:${index}:${ingredient.name.toLowerCase()}`,
      label: `Bahan: ${ingredient.name}`,
      hint: `Pemakaian ${ingredient.name} tidak boleh melebihi stok yang tersedia.`,
      a: ingredient.perA,
      b: ingredient.perB,
      op: "<=",
      c: ingredient.total,
      raw: ingredient,
    });
  });

  targets.push({
    key: "nonneg:x",
    label: "Banyak produk A tidak negatif",
    hint: "Banyak produk tidak mungkin negatif.",
    a: 1,
    b: 0,
    op: ">=",
    c: 0,
    nonNegative: "x",
  });
  targets.push({
    key: "nonneg:y",
    label: "Banyak produk B tidak negatif",
    hint: "Banyak produk tidak mungkin negatif.",
    a: 0,
    b: 1,
    op: ">=",
    c: 0,
    nonNegative: "y",
  });

  return targets;
}

function ingredientHint(ingredient: Ingredient, level: number, productA: string, productB: string): string {
  const satuan = ingredient.unit?.trim() ? ingredient.unit.trim() : "satuan";
  const dasar = `Untuk 1 unit ${productA} perlu ${ingredient.perA} ${satuan} ${ingredient.name}, untuk 1 unit ${productB} perlu ${ingredient.perB} ${satuan}.`;
  const stok = `Stok/total ${ingredient.name} yang tersedia ${trimNumber(ingredient.total)} ${satuan}.`;
  if (level <= 1) {
    return `Periksa baris untuk bahan ${ingredient.name}: bandingkan koefisien x, koefisien y, tanda, dan ruas kanan dengan data wawancaramu.`;
  }
  if (level === 2) {
    return `Ingat susunannya: (kebutuhan ${productA})x + (kebutuhan ${productB})y ≤ stok. ${dasar}`;
  }
  return `${dasar} ${stok} Susun sendiri barisnya memakai angka-angka itu (perhatikan satuannya).`;
}

function statusToLineResult(
  target: ModelTarget,
  status: "benar" | "setara" | "koefisien" | "ruas_kanan" | "tanda" | "kosong" | "tidak_dikenal",
  hint: string,
  matchedInput?: string,
): InequalityLineResult {
  return { rowLabel: target.label, status, hint, matchedInput };
}

type Candidate = {
  index: number;
  parsed: ParsedInequality;
  comparison: ReturnType<typeof compareInequality>;
};

const COMPARISON_RANK: Record<Candidate["comparison"], number> = {
  exact: 6,
  scaled: 5,
  op: 4,
  rhs: 3,
  coef: 2,
  different: 1,
};

/**
 * Cocokkan baris jawaban siswa ke baris model data wawancara secara cerdas
 * (tidak harus urut): setiap baris target dicarikan baris siswa paling cocok.
 */
export function checkModel(lines: string[], targets: ModelTarget[]): {
  lines: InequalityLineResult[];
  extra: string[];
  correctCount: number;
} {
  const parsedLines: { index: number; parsed: ParsedInequality | null; error?: string; raw: string }[] = [];

  lines.forEach((raw, index) => {
    const text = (raw ?? "").trim();
    if (text.length === 0) return;
    const parsed = parseInequality(text);
    if (isParseFailure(parsed)) {
      parsedLines.push({ index, parsed: null, error: parsed.error, raw: text });
    } else {
      parsedLines.push({ index, parsed, raw: text });
    }
  });

  const usedLines = new Set<number>();
  const results: InequalityLineResult[] = [];
  let correctCount = 0;

  for (const target of targets) {
    const candidates: Candidate[] = [];
    for (const line of parsedLines) {
      if (line.parsed === null) continue;
      if (usedLines.has(line.index)) continue;
      candidates.push({
        index: line.index,
        parsed: line.parsed,
        comparison: compareInequality(line.parsed, target),
      });
    }
    candidates.sort((a, b) => COMPARISON_RANK[b.comparison] - COMPARISON_RANK[a.comparison]);
    const best = candidates[0];

    if (!best || best.comparison === "different") {
      results.push(
        statusToLineResult(
          target,
          "kosong",
          target.nonNegative
            ? `Belum ada baris untuk banyak produk ${target.nonNegative === "x" ? "A" : "B"}. Tambahkan syarat bahwa banyak produk tidak boleh negatif.`
            : ingredientHint(target.raw!, 1, "", ""),
        ),
      );
      continue;
    }

    usedLines.add(best.index);

    switch (best.comparison) {
      case "exact": {
        correctCount += 1;
        results.push(
          statusToLineResult(
            target,
            "benar",
            target.nonNegative
              ? "Benar."
              : `Benar: ${best.parsed.kind === "axis" ? "kendala sejajar sumbu" : "koefisien, tanda, dan ruas kanan sudah sesuai data wawancara"}.`,
            best.parsed.raw,
          ),
        );
        break;
      }
      case "scaled": {
        results.push(
          statusToLineResult(
            target,
            "setara",
            "Bentuk ini setara secara matematis, tetapi bukan sesuai satuan data wawancaramu. Tulis memakai angka asli hasil wawancara (kebutuhan per unit dan stok dalam satuan yang sama).",
            best.parsed.raw,
          ),
        );
        break;
      }
      case "rhs": {
        results.push(
          statusToLineResult(
            target,
            "ruas_kanan",
            "Koefisien x dan y sudah tepat. Periksa ruas kanan: pakai stok/total bahan yang tersedia (bukan angka lain).",
            best.parsed.raw,
          ),
        );
        break;
      }
      case "op": {
        results.push(
          statusToLineResult(
            target,
            "tanda",
            "Angka-angkanya sudah tepat, tetapi tandanya belum pas. Ingat: pemakaian bahan tidak boleh melebihi stok.",
            best.parsed.raw,
          ),
        );
        break;
      }
      default: {
        results.push(
          statusToLineResult(
            target,
            "koefisien",
            target.nonNegative
              ? "Periksa kembali baris ini: seharusnya menyatakan banyak produk tidak boleh negatif."
              : "Periksa koefisien x dan y: pakai kebutuhan bahan untuk 1 unit produk A dan 1 unit produk B.",
            best.parsed.raw,
          ),
        );
      }
    }
  }

  const extra = parsedLines
    .filter((line) => !usedLines.has(line.index))
    .map((line) => line.raw);

  return { lines: results, extra, correctCount };
}

/** Petunjuk bertahap: tingkat 1 ringkas, tingkat 3 paling rinci (tetap bukan jawaban). */
export function refineHints(
  results: InequalityLineResult[],
  targets: ModelTarget[],
  attemptNo: number,
  productA: string,
  productB: string,
): InequalityLineResult[] {
  const level = attemptNo <= 1 ? 1 : attemptNo === 2 ? 2 : 3;
  return results.map((result) => {
    if (result.status === "benar") return result;
    const target = targets.find((item) => item.label === result.rowLabel);
    if (!target) return result;
    if (target.raw) {
      if (result.status === "setara") {
        // Pertahankan pesan "setara" (penting agar siswa paham kelipatan skala),
        // lalu tambahkan rincian data pada percobaan berikutnya.
        return level >= 2
          ? { ...result, hint: `${result.hint} ${ingredientHint(target.raw, level, productA, productB)}` }
          : result;
      }
      // Percobaan pertama: pakai pesan spesifik (tanda/ruas kanan/koefisien).
      // Percobaan berikutnya: petunjuk makin rinci.
      return level === 1
        ? result
        : { ...result, hint: ingredientHint(target.raw, level, productA, productB) };
    }
    if (target.nonNegative) {
      const nama = target.nonNegative === "x" ? productA : productB;
      const symbol = target.nonNegative;
      if (level === 1) {
        return {
          ...result,
          hint: `Jangan lupa syarat untuk banyak produk ${nama} (variabel ${symbol}).`,
        };
      }
      if (level === 2) {
        return {
          ...result,
          hint: `Tulis syarat ${symbol} ≥ 0 (banyak produk ${nama} tidak boleh negatif).`,
        };
      }
      return { ...result, hint: `Syarat yang dimaksud: variabel ${symbol} harus lebih besar atau sama dengan 0.` };
    }
    return result;
  });
}

export function summarizeCheck(results: InequalityLineResult[], extra: string[]): string {
  const benar = results.filter((item) => item.status === "benar").length;
  const total = results.length;
  if (benar === total && extra.length === 0) {
    return `Semua ${total} baris model sudah tepat. Buka Lab Grafik untuk memverifikasi gambar DHP kelompokmu.`;
  }
  if (extra.length > 0) {
    return `${benar} dari ${total} baris sudah tepat. Ada ${extra.length} baris yang tidak cocok dengan data wawancara mana pun: ${extra
      .map((line) => `"${line}"`)
      .join(", ")}.`;
  }
  return `${benar} dari ${total} baris sudah tepat. Perbaiki baris yang masih bertanda peringatan, lalu periksa lagi.`;
}

export function buildCheckResult(
  input: { lines: string[]; targets: ModelTarget[]; attemptNo: number; productA: string; productB: string },
): InequalityCheckResult {
  const { lines: results, extra, correctCount } = checkModel(input.lines, input.targets);
  const refined = refineHints(results, input.targets, input.attemptNo, input.productA, input.productB);
  const correct = correctCount === input.targets.length && input.targets.length > 0 && extra.length === 0;
  return {
    correct,
    hintLevel: input.attemptNo <= 1 ? 1 : input.attemptNo === 2 ? 2 : 3,
    lines: refined,
    extra,
    summary: summarizeCheck(results, extra),
  };
}
