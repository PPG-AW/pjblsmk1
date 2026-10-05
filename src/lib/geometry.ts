/**
 * Geometri daerah penyelesaian (DHP) dengan algoritma clipping poligon
 * (Sutherland–Hodgman), diperluas untuk tanda >= dan kendala sebarang
 * (vertikal/horizontal).
 */
import type { RelOp } from "@/lib/parser";
import { opFamily } from "@/lib/parser";

export type Point = { x: number; y: number };

export type HalfPlane = {
  a: number;
  b: number;
  op: RelOp;
  c: number;
};

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export type FeasibleRegion = {
  /** Poligon DHP (mungkin kosong) dalam koordinat matematika. */
  polygon: Point[];
  /** Benar bila DHP menyentuh batas kotak besar (daerah tak terbatas). */
  unbounded: boolean;
  /** Benar bila sistem hanya memuat kendala bertanda "=" (hanya garis). */
  lineOnly: boolean;
  /** Benar bila tidak ada daerah penyelesaian. */
  empty: boolean;
};

const EPS = 1e-9;

export function isEmptyPolygon(polygon: Point[]): boolean {
  return polygon.length < 3;
}

export function boundaryValue(constraint: HalfPlane, point: Point): number {
  return constraint.a * point.x + constraint.b * point.y - constraint.c;
}

/** Apakah titik memenuhi pertidaksamaan (termasuk titik pada garis batas). */
export function satisfies(constraint: HalfPlane, point: Point, tolerance = 1e-7): boolean {
  const value = boundaryValue(constraint, point);
  const scaled = tolerance * Math.max(1, Math.abs(constraint.c));
  switch (opFamily(constraint.op)) {
    case "le":
      return value <= scaled;
    case "ge":
      return value >= -scaled;
    default:
      return Math.abs(value) <= scaled;
  }
}

function intersects(constraint: HalfPlane, p1: Point, p2: Point, tolerance = 1e-9): Point {
  const v1 = boundaryValue(constraint, p1);
  const v2 = boundaryValue(constraint, p2);
  const denominator = v1 - v2;
  if (Math.abs(denominator) < tolerance) return p1;
  const t = v1 / (v1 - v2);
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

/** Potong poligon dengan satu setengah bidang tertutup. */
export function clipPolygon(
  polygon: Point[],
  constraint: HalfPlane,
  tolerance = 1e-9,
): Point[] {
  if (polygon.length === 0) return [];
  // Kendala bertanda "=" hanya digambar sebagai garis, tidak memotong DHP.
  if (constraint.op === "=") return polygon;
  if (constraint.a === 0 && constraint.b === 0) {
    return satisfies(constraint, polygon[0]!, tolerance) ? polygon : [];
  }

  const result: Point[] = [];
  const scale = tolerance * Math.max(1, Math.abs(constraint.c));

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i]!;
    const previous = polygon[(i + polygon.length - 1) % polygon.length]!;
    const currentValue = boundaryValue(constraint, current);
    const previousValue = boundaryValue(constraint, previous);

    const insideCurrent =
      opFamily(constraint.op) === "le" ? currentValue <= scale : currentValue >= -scale;
    const insidePrevious =
      opFamily(constraint.op) === "le" ? previousValue <= scale : previousValue >= -scale;

    if (insideCurrent) {
      if (!insidePrevious) {
        result.push(intersects(constraint, previous, current, tolerance));
      }
      result.push(current);
    } else if (insidePrevious) {
      result.push(intersects(constraint, previous, current, tolerance));
    }
  }

  return dedupe(result);
}

function dedupe(points: Point[], tolerance = 1e-7): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - point.x) < tolerance && Math.abs(last.y - point.y) < tolerance) {
      continue;
    }
    out.push({ x: round(point.x), y: round(point.y) });
  }
  if (out.length > 1) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (Math.abs(first.x - last.x) < tolerance && Math.abs(first.y - last.y) < tolerance) {
      out.pop();
    }
  }
  return out;
}

function round(value: number): number {
  const rounded = Math.round(value * 1e9) / 1e9;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function rectPoints(bounds: Bounds): Point[] {
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
}

export function expandBounds(bounds: Bounds, factor: number): Bounds {
  const width = (bounds.maxX - bounds.minX) * factor;
  const height = (bounds.maxY - bounds.minY) * factor;
  return {
    minX: bounds.minX - width,
    maxX: bounds.maxX + width,
    minY: bounds.minY - height,
    maxY: bounds.maxY + height,
  };
}

export function clipPolygonToBounds(polygon: Point[], bounds: Bounds): Point[] {
  let result = polygon;
  result = clipPolygon(result, { a: 1, b: 0, op: ">=", c: bounds.minX });
  result = clipPolygon(result, { a: 1, b: 0, op: "<=", c: bounds.maxX });
  result = clipPolygon(result, { a: 0, b: 1, op: ">=", c: bounds.minY });
  result = clipPolygon(result, { a: 0, b: 1, op: "<=", c: bounds.maxY });
  return result;
}

/**
 * Hitung irisan semua pertidaksamaan aktif (DHP).
 * Titik pojok & nilai optimum SENGAJA tidak dihitung di sini — dikerjakan
 * siswa secara manual di LKPD.
 */
export function feasibleRegion(
  constraints: HalfPlane[],
  bounds: Bounds,
): FeasibleRegion {
  const active = constraints.filter((constraint) => constraint.op !== "=");
  const lineOnly = active.length === 0 && constraints.length > 0;

  if (active.length === 0) {
    return { polygon: [], unbounded: false, lineOnly, empty: !lineOnly ? false : false };
  }

  const big = expandBounds(bounds, 20);
  let polygon = rectPoints(big);

  for (const constraint of active) {
    polygon = clipPolygon(polygon, constraint);
    if (isEmptyPolygon(polygon)) {
      return { polygon: [], unbounded: false, lineOnly: false, empty: true };
    }
  }

  const tolerance = 1e-6 * Math.max(1, big.maxX - big.minX);
  const touchesBigBox = polygon.some(
    (point) =>
      Math.abs(point.x - big.minX) < tolerance ||
      Math.abs(point.x - big.maxX) < tolerance ||
      Math.abs(point.y - big.minY) < tolerance ||
      Math.abs(point.y - big.maxY) < tolerance,
  );

  return {
    polygon: clipPolygonToBounds(polygon, bounds),
    unbounded: touchesBigBox,
    lineOnly: false,
    empty: false,
  };
}

/** Titik berat poligon, dipakai untuk menempatkan label DHP. */
export function polygonCentroid(polygon: Point[]): Point | null {
  if (isEmptyPolygon(polygon)) return null;
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i]!;
    const next = polygon[(i + 1) % polygon.length]!;
    const cross = current.x * next.y - next.x * current.y;
    area += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }
  if (Math.abs(area) < 1e-12) {
    // Poligon degenerat (segmen): pakai rata-rata titik.
    const sum = polygon.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / polygon.length, y: sum.y / polygon.length };
  }
  return { x: cx / (3 * area), y: cy / (3 * area) };
}

export function polygonArea(polygon: Point[]): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i]!;
    const next = polygon[(i + 1) % polygon.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

/**
 * Titik tengah garis batas di dalam viewport (untuk label pertidaksamaan).
 * Mengembalikan juga arah garis agar label bisa diletakkan "di dekat" garis.
 */
export function boundaryLabelAnchor(
  constraint: HalfPlane,
  bounds: Bounds,
  index = 0,
): { point: Point; direction: Point } | null {
  const segment = clipLineToBounds(constraint, bounds);
  if (!segment) return null;
  const [start, end] = segment;
  const fractions = [0.5, 0.35, 0.65, 0.22, 0.78, 0.14, 0.86, 0.58];
  const fraction = fractions[index % fractions.length]!;
  const point = {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
  };
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  return { point, direction: { x: (end.x - start.x) / length, y: (end.y - start.y) / length } };
}

/** Potong garis a·x + b·y = c terhadap viewport (Liang–Barsky). */
export function clipLineToBounds(constraint: HalfPlane, bounds: Bounds): [Point, Point] | null {
  const { a, b, c } = constraint;
  if (a === 0 && b === 0) return null;

  const norm = a * a + b * b;
  const base: Point = { x: (a * c) / norm, y: (b * c) / norm };
  const direction: Point = { x: -b, y: a };

  let tMin = -Infinity;
  let tMax = Infinity;

  const clipAxis = (p: number, q: number) => {
    if (Math.abs(p) < EPS) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > tMax) return false;
      if (r > tMin) tMin = r;
    } else {
      if (r < tMin) return false;
      if (r < tMax) tMax = r;
    }
    return true;
  };

  if (!clipAxis(-direction.x, base.x - bounds.minX)) return null;
  if (!clipAxis(direction.x, bounds.maxX - base.x)) return null;
  if (!clipAxis(-direction.y, base.y - bounds.minY)) return null;
  if (!clipAxis(direction.y, bounds.maxY - base.y)) return null;

  if (tMin > tMax) return null;

  const start: Point = { x: base.x + direction.x * tMin, y: base.y + direction.y * tMin };
  const end: Point = { x: base.x + direction.x * tMax, y: base.y + direction.y * tMax };
  return [start, end];
}
