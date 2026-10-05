import { describe, expect, it } from "vitest";
import {
  boundaryLabelAnchor,
  clipLineToBounds,
  clipPolygon,
  feasibleRegion,
  polygonArea,
  polygonCentroid,
  satisfies,
  type Bounds,
  type HalfPlane,
} from "@/lib/geometry";
import { isParseFailure, parseInequality } from "@/lib/parser";

const VIEW: Bounds = { minX: -10, maxX: 80, minY: -10, maxY: 60 };

/** Model contoh D'Culinary (data contoh): 100x + 150y <= 6000 ; 80x + 40y <= 4000 ; x,y >= 0 */
const SAMPLE_MODEL = [
  "100x + 150y <= 6000",
  "80x + 40y <= 4000",
  "x >= 0",
  "y >= 0",
];

function halfPlanes(lines: string[]): HalfPlane[] {
  return lines.map((line) => {
    const parsed = parseInequality(line);
    if (isParseFailure(parsed)) throw new Error(parsed.error);
    return { a: parsed.a, b: parsed.b, op: parsed.op, c: parsed.c };
  });
}

describe("clipPolygon", () => {
  it("memotong persegi dengan x >= 0", () => {
    const square = [
      { x: -10, y: -10 },
      { x: 10, y: -10 },
      { x: 10, y: 10 },
      { x: -10, y: 10 },
    ];
    const clipped = clipPolygon(square, { a: 1, b: 0, op: ">=", c: 0 });
    expect(clipped.length).toBeGreaterThanOrEqual(3);
    for (const point of clipped) expect(point.x).toBeGreaterThanOrEqual(-1e-9);
    expect(polygonArea(clipped)).toBeCloseTo(200, 6);
  });

  it("memotong dengan kendala sejajar sumbu (y <= 40)", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ];
    const clipped = clipPolygon(square, { a: 0, b: 1, op: "<=", c: 40 });
    expect(polygonArea(clipped)).toBeCloseTo(2000, 6);
  });

  it("menghasilkan poligon kosong bila batas bertentangan", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(clipPolygon(square, { a: 1, b: 0, op: ">=", c: 20 })).toHaveLength(0);
  });

  it("mengabaikan kendala bertanda = (hanya garis)", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const clipped = clipPolygon(square, { a: 1, b: 1, op: "=", c: 5 });
    expect(clipped).toHaveLength(4);
  });
});

describe("satisfies", () => {
  const constraint: HalfPlane = { a: 100, b: 150, op: "<=", c: 6000 };
  it("memeriksa titik terhadap pertidaksamaan", () => {
    expect(satisfies(constraint, { x: 45, y: 10 })).toBe(true);
    expect(satisfies(constraint, { x: 50, y: 10 })).toBe(false);
    expect(satisfies(constraint, { x: 0, y: 40 })).toBe(true);
  });
});

describe("feasibleRegion", () => {
  it("menghitung irisan semua kendala model contoh", () => {
    const region = feasibleRegion(halfPlanes(SAMPLE_MODEL), VIEW);
    expect(region.empty).toBe(false);
    expect(region.unbounded).toBe(false);

    // Titik pojok: (0,0), (50,0), (45,10), (0,40) -> luas 1150
    expect(polygonArea(region.polygon)).toBeCloseTo(1150, 6);

    const points = region.polygon.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`);
    for (const corner of ["0,0", "50,0", "45,10", "0,40"]) {
      expect(points).toContain(corner);
    }
  });

  it("mengarsir sampai batas viewport bila daerah tak terbatas", () => {
    const region = feasibleRegion(halfPlanes(["2x + 3y <= 120"]), VIEW);
    expect(region.empty).toBe(false);
    expect(region.unbounded).toBe(true);
    expect(region.polygon.length).toBeGreaterThanOrEqual(3);
    for (const point of region.polygon) {
      expect(point.x).toBeGreaterThanOrEqual(VIEW.minX - 1e-6);
      expect(point.x).toBeLessThanOrEqual(VIEW.maxX + 1e-6);
      expect(point.y).toBeGreaterThanOrEqual(VIEW.minY - 1e-6);
      expect(point.y).toBeLessThanOrEqual(VIEW.maxY + 1e-6);
    }
  });

  it("menandai daerah kosong", () => {
    const region = feasibleRegion(halfPlanes(["x >= 5", "x <= 1"]), VIEW);
    expect(region.empty).toBe(true);
    expect(region.polygon).toHaveLength(0);
  });

  it("memahami tanda > dan < sebagai setengah bidang yang sama", () => {
    const tegas = feasibleRegion(halfPlanes(["y < 40"]), VIEW);
    const lembut = feasibleRegion(halfPlanes(["y <= 40"]), VIEW);
    expect(tegas.empty).toBe(false);
    expect(polygonArea(tegas.polygon)).toBeCloseTo(polygonArea(lembut.polygon), 3);
  });

  it("membedakan area lebih kecil saat ada kendala negatif", () => {
    const region = feasibleRegion(halfPlanes(["-x + y <= 20", "x >= 0", "y >= 0"]), VIEW);
    expect(region.empty).toBe(false);
    expect(region.unbounded).toBe(true);
    expect(region.polygon.length).toBeGreaterThanOrEqual(3);
  });
});

describe("clipLineToBounds", () => {
  it("memotong garis miring ke dalam viewport", () => {
    const segment = clipLineToBounds({ a: 100, b: 150, op: "<=", c: 6000 }, VIEW);
    expect(segment).not.toBeNull();
    if (!segment) return;
    const [start, end] = segment;
    for (const point of [start, end]) {
      expect(point.x).toBeGreaterThanOrEqual(VIEW.minX - 1e-6);
      expect(point.x).toBeLessThanOrEqual(VIEW.maxX + 1e-6);
      expect(100 * point.x + 150 * point.y).toBeCloseTo(6000, 4);
    }
  });

  it("menangani garis vertikal dan horizontal", () => {
    const vertical = clipLineToBounds({ a: 1, b: 0, op: ">=", c: 20 }, VIEW);
    expect(vertical).not.toBeNull();
    expect(vertical?.[0].x).toBeCloseTo(20, 6);
    const horizontal = clipLineToBounds({ a: 0, b: 1, op: "<=", c: 40 }, VIEW);
    expect(horizontal).not.toBeNull();
    expect(horizontal?.[0].y).toBeCloseTo(40, 6);
  });

  it("mengembalikan null bila garis ada di luar viewport", () => {
    expect(clipLineToBounds({ a: 1, b: 0, op: "<=", c: 1000 }, VIEW)).toBeNull();
  });
});

describe("boundaryLabelAnchor", () => {
  it("memberikan titik di sepanjang garis untuk label", () => {
    const anchor = boundaryLabelAnchor({ a: 100, b: 150, op: "<=", c: 6000 }, VIEW, 0);
    expect(anchor).not.toBeNull();
    if (!anchor) return;
    expect(100 * anchor.point.x + 150 * anchor.point.y).toBeCloseTo(6000, 4);
    expect(Math.hypot(anchor.direction.x, anchor.direction.y)).toBeCloseTo(1, 6);
  });

  it("memberikan posisi berbeda untuk indeks berbeda (agar label tidak menumpuk)", () => {
    const first = boundaryLabelAnchor({ a: 100, b: 150, op: "<=", c: 6000 }, VIEW, 0);
    const second = boundaryLabelAnchor({ a: 100, b: 150, op: "<=", c: 6000 }, VIEW, 1);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (!first || !second) return;
    expect(first.point.x).not.toBeCloseTo(second.point.x, 3);
  });
});

describe("polygonCentroid", () => {
  it("menghitung titik berat poligon", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const centroid = polygonCentroid(square);
    expect(centroid?.x).toBeCloseTo(5, 6);
    expect(centroid?.y).toBeCloseTo(5, 6);
  });

  it("mengembalikan null untuk poligon kosong", () => {
    expect(polygonCentroid([])).toBeNull();
  });
});
