import { describe, expect, it } from "vitest";
import {
  caretAfterNormalize,
  compareInequality,
  isParseFailure,
  normalizeTypedInequality,
  parseInequality,
  trimNumber,
  type ParsedInequality,
} from "@/lib/parser";

function parse(input: string): ParsedInequality {
  const result = parseInequality(input);
  if (isParseFailure(result)) throw new Error(`Gagal parse "${input}": ${result.error}`);
  return result;
}

describe("parseInequality", () => {
  it("membaca bentuk baku", () => {
    const parsed = parse("2x + 3y <= 120");
    expect(parsed).toMatchObject({ a: 2, b: 3, op: "<=", c: 120, kind: "standard" });
  });

  it("menerima urutan suku bebas", () => {
    const satu = parse("100x+150y<=6000");
    const dua = parse("150y+100x<=6000");
    expect(satu).toMatchObject({ a: 100, b: 150, c: 6000 });
    expect(dua).toMatchObject({ a: 100, b: 150, c: 6000 });
  });

  it("menerima koefisien 1 tanpa angka dan spasi bebas", () => {
    const parsed = parse("   x    +   y   <=   10 ");
    expect(parsed).toMatchObject({ a: 1, b: 1, c: 10 });
  });

  it("menerima tanda unicode ≤ ≥ dan desimal koma", () => {
    const parsed = parse("2,5x + y ≤ 8");
    expect(parsed).toMatchObject({ a: 2.5, b: 1, c: 8, op: "<=" });
  });

  it("menerima pemisah ribuan titik", () => {
    expect(parse("100x + 150y <= 6.000")).toMatchObject({ c: 6000 });
    expect(parse("x + y <= 1.000.000")).toMatchObject({ c: 1000000 });
    expect(parse("1.500,5x <= 3")).toMatchObject({ a: 1500.5 });
  });

  it("menjaga desimal dengan satu digit setelah titik tetap desimal", () => {
    expect(parse("3.5x <= 7")).toMatchObject({ a: 3.5 });
  });

  it("menerima kendala sejajar sumbu", () => {
    const x = parse("x >= 0");
    expect(x).toMatchObject({ a: 1, b: 0, op: ">=", c: 0, kind: "axis", variable: "x" });
    const y = parse("y <= 40");
    expect(y).toMatchObject({ a: 0, b: 1, op: "<=", c: 40, kind: "axis", variable: "y" });
    const negatif = parse("2y > 8");
    expect(negatif).toMatchObject({ b: 2, op: ">", c: 8 });
  });

  it("menerima bentuk y (<=|>=) mx + k", () => {
    const parsed = parse("y > 2x - 5");
    expect(parsed).toMatchObject({ a: -2, b: 1, op: ">", c: -5 });
  });

  it("memindahkan suku dari kedua ruas", () => {
    const parsed = parse("3x + 2 <= x + 10");
    expect(parsed).toMatchObject({ a: 2, b: 0, op: "<=", c: 8 });
  });

  it("menerima koefisien negatif dan perkalian/pembagian angka", () => {
    expect(parse("-x + y >= 3")).toMatchObject({ a: -1, b: 1, op: ">=", c: 3 });
    expect(parse("3*x + y <= 9")).toMatchObject({ a: 3, b: 1, c: 9 });
    expect(parse("x/2 + y <= 5")).toMatchObject({ a: 0.5, b: 1, c: 5 });
  });

  it("menerima tanda sama dengan", () => {
    expect(parse("x + y = 5")).toMatchObject({ a: 1, b: 1, op: "=", c: 5 });
  });

  it("menolak input yang tidak masuk akal dengan pesan ramah", () => {
    const cases = [
      "",
      "   ",
      "hello",
      "2x + 3y",
      "2x + 3y <= 5 <= 6",
      "2 3x <= 5",
      "2x + 3y <=",
      "<= 5",
      "z <= 3",
      "2x + (3 <= 5",
      "5 <= 0",
      "x <= 4 @",
    ];
    for (const input of cases) {
      const result = parseInequality(input);
      expect(isParseFailure(result), `harus gagal: ${input}`).toBe(true);
      if (isParseFailure(result)) {
        expect(result.error.length).toBeGreaterThan(5);
        expect(result.error).not.toMatch(/undefined|NaN/);
      }
    }
  });
});

describe("compareInequality", () => {
  const target = parse("100x + 150y <= 6000");

  it("mengenali jawaban identik", () => {
    expect(compareInequality(parse("100x + 150y <= 6000"), target)).toBe("exact");
    expect(compareInequality(parse("150y + 100x <= 6.000"), target)).toBe("exact");
  });

  it("mengenali kelipatan skala yang setara", () => {
    expect(compareInequality(parse("2x + 3y <= 120"), target)).toBe("scaled");
    expect(compareInequality(parse("x + 1.5y <= 60"), target)).toBe("scaled");
  });

  it("mengenali ruas kanan dan koefisien yang salah", () => {
    expect(compareInequality(parse("100x + 150y <= 5000"), target)).toBe("rhs");
    expect(compareInequality(parse("100x + 200y <= 6000"), target)).toBe("coef");
  });

  it("mengenali tanda yang terbalik", () => {
    expect(compareInequality(parse("100x + 150y >= 6000"), target)).toBe("op");
    expect(compareInequality(parse("x + y <= 10"), target)).toBe("coef");
  });

  it("memperlakukan < dan <= sebagai keluarga tanda yang sama", () => {
    expect(compareInequality(parse("100x + 150y < 6000"), target)).toBe("exact");
  });
});

describe("trimNumber", () => {
  it("memformat angka gaya Indonesia", () => {
    expect(trimNumber(6000)).toBe("6.000");
    expect(trimNumber(2.5)).toBe("2,5");
  });
});

describe("bantuan pengetikan <= menjadi ≤", () => {
  it("mengubah <= dan >= menjadi simbol ≤ ≥", () => {
    expect(normalizeTypedInequality("2x+3y<=120")).toBe("2x+3y≤120");
    expect(normalizeTypedInequality("x >= 0")).toBe("x ≥ 0");
  });

  it("menerima urutan terbalik =< dan =>", () => {
    expect(normalizeTypedInequality("x =< 40")).toBe("x ≤ 40");
    expect(normalizeTypedInequality("y => 2")).toBe("y ≥ 2");
  });

  it("membiarkan tanda tunggal < > dan teks tanpa tanda", () => {
    expect(normalizeTypedInequality("y < 40")).toBe("y < 40");
    expect(normalizeTypedInequality("y > 2x - 5")).toBe("y > 2x - 5");
    expect(normalizeTypedInequality("100x + 150y")).toBe("100x + 150y");
  });

  it("mengganti beberapa tanda sekaligus", () => {
    expect(normalizeTypedInequality("a<=b>=c<=d")).toBe("a≤b≥c≤d");
  });

  it("mempertahankan posisi kursor setelah penggantian", () => {
    // "x<=0" dengan kursor di ujung (4) menjadi "x≤0" dengan kursor 3.
    expect(caretAfterNormalize("x<=0", 4)).toBe(3);
    // kursor tepat setelah tanda yang baru diganti
    expect(caretAfterNormalize("x<=", 3)).toBe(2);
    // kursor sebelum tanda tidak bergeser
    expect(caretAfterNormalize("x<=0", 1)).toBe(1);
    // tanpa penggantian, posisi tetap
    expect(caretAfterNormalize("x < 40", 4)).toBe(4);
    // beberapa penggantian sebelum kursor
    expect(caretAfterNormalize("a<=b>=c", 7)).toBe(5);
    // kursor di luar panjang teks tetap aman
    expect(caretAfterNormalize("x<=0", 99)).toBe(3);
  });

  it("hasil normalisasi tetap bisa diparse", () => {
    const normalized = normalizeTypedInequality("2x + 3y <= 120");
    const parsed = parseInequality(normalized);
    expect(isParseFailure(parsed)).toBe(false);
    if (!isParseFailure(parsed)) {
      expect(parsed.a).toBe(2);
      expect(parsed.b).toBe(3);
      expect(parsed.op).toBe("<=");
      expect(parsed.c).toBe(120);
    }
  });
});
