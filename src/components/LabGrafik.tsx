"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import {
  boundaryLabelAnchor,
  clipLineToBounds,
  feasibleRegion,
  type Bounds,
  type HalfPlane,
  type Point,
} from "@/lib/geometry";
import {
  caretAfterNormalize,
  isParseFailure,
  normalizeTypedInequality,
  parseInequality,
  trimNumber,
  type ParsedInequality,
} from "@/lib/parser";
import { nextStepFor } from "@/lib/steps";

export type LabRow = { id: string; text: string; visible: boolean; color: string };

export type GraphPreset = {
  id: string;
  title: string;
  description: string;
  lines: string[];
};

const COLORS = [
  "#f2a25c",
  "#8ecf92",
  "#f0938f",
  "#7fb3f0",
  "#c9a3f0",
  "#f0d97f",
  "#7fe0d8",
  "#d0b48f",
];

const MAX_ROWS = 8;
const DEFAULT_BOUNDS: Bounds = { minX: -5, maxX: 60, minY: -5, maxY: 60 };
const PADDING = { top: 18, right: 22, bottom: 38, left: 48 };

type Parsed = { row: LabRow; constraint: HalfPlane | null; error: string | null };

function newRow(index: number, text = ""): LabRow {
  return {
    id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    visible: true,
    color: COLORS[index % COLORS.length]!,
  };
}

function niceStep(span: number, target = 8): number {
  const rough = span / target;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)));
  const candidates = [1, 2, 2.5, 5, 10];
  let best = magnitude;
  for (const candidate of candidates) {
    if (rough <= candidate * magnitude) {
      best = candidate * magnitude;
      break;
    }
  }
  return best;
}

function fitAspect(bounds: Bounds, plotW: number, plotH: number): Bounds {
  if (plotW <= 0 || plotH <= 0) return bounds;
  const targetRatio = plotW / plotH;
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  if (spanX <= 0 || spanY <= 0) return bounds;
  const ratio = spanX / spanY;
  if (ratio < targetRatio) {
    const newSpanX = spanY * targetRatio;
    const center = (bounds.minX + bounds.maxX) / 2;
    return { minX: center - newSpanX / 2, maxX: center + newSpanX / 2, minY: bounds.minY, maxY: bounds.maxY };
  }
  const newSpanY = spanX / targetRatio;
  const center = (bounds.minY + bounds.maxY) / 2;
  return { minX: bounds.minX, maxX: bounds.maxX, minY: center - newSpanY / 2, maxY: center + newSpanY / 2 };
}

function lineIntersection(a: HalfPlane, b: HalfPlane): Point | null {
  const determinant = a.a * b.b - b.a * a.b;
  if (Math.abs(determinant) < 1e-9) return null;
  const x = (a.c * b.b - b.c * a.b) / determinant;
  const y = (a.a * b.c - b.a * a.c) / determinant;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function autoFitBounds(constraints: HalfPlane[], plotW: number, plotH: number): Bounds {
  const points: Point[] = [{ x: 0, y: 0 }];
  for (const constraint of constraints) {
    if (Math.abs(constraint.a) > 1e-9) points.push({ x: constraint.c / constraint.a, y: 0 });
    if (Math.abs(constraint.b) > 1e-9) points.push({ x: 0, y: constraint.c / constraint.b });
  }
  for (let i = 0; i < constraints.length; i += 1) {
    for (let j = i + 1; j < constraints.length; j += 1) {
      const intersection = lineIntersection(constraints[i]!, constraints[j]!);
      if (intersection) points.push(intersection);
    }
  }

  const xs = points.map((point) => point.x).filter((value) => Number.isFinite(value));
  const ys = points.map((point) => point.y).filter((value) => Number.isFinite(value));
  const positiveXs = xs.filter((value) => value > 0);
  const positiveYs = ys.filter((value) => value > 0);

  const maxX = positiveXs.length > 0 ? Math.max(...positiveXs) : 20;
  const maxY = positiveYs.length > 0 ? Math.max(...positiveYs) : 20;
  const minX = Math.min(...xs.filter((value) => value < 0), 0);
  const minY = Math.min(...ys.filter((value) => value < 0), 0);

  const padX = Math.max((maxX - minX) * 0.15, 1);
  const padY = Math.max((maxY - minY) * 0.15, 1);

  const bounds: Bounds = {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  };
  // Batasi skala agar tetap masuk akal (mis. bila data memakai satuan besar).
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const safe: Bounds =
    spanX > 1e6 || spanY > 1e6 ? DEFAULT_BOUNDS : bounds;
  return fitAspect(safe, plotW, plotH);
}

export default function LabGrafik({
  mode,
  presets = [],
  checklist,
  doneItem,
  alreadyDone = false,
}: {
  mode: "eksplorasi" | "verifikasi";
  presets?: GraphPreset[];
  checklist?: { title: string; rows: { label: string; value: string }[] };
  doneItem?: "grafik" | "grafik_verifikasi";
  alreadyDone?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState<LabRow[]>(() => [newRow(0)]);
  const [bounds, setBounds] = useState<Bounds>(DEFAULT_BOUNDS);
  const [size, setSize] = useState({ width: 760, height: 470 });
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyDone);
  const [marking, setMarking] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const lastCaret = useRef<Record<string, number>>({});
  const [focusedRow, setFocusedRow] = useState<string | null>(null);
  const pinch = useRef<{ distance: number; bounds: Bounds; center: Point } | null>(null);

  /* ---------------------------------------------------------------- ukuran */
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => {
      const width = Math.max(320, element.clientWidth);
      const height = Math.max(320, Math.min(560, Math.round(width * 0.62)));
      setSize({ width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const plotW = Math.max(40, size.width - PADDING.left - PADDING.right);
  const plotH = Math.max(40, size.height - PADDING.top - PADDING.bottom);
  const view = useMemo(() => fitAspect(bounds, plotW, plotH), [bounds, plotW, plotH]);

  const toScreen = useCallback(
    (point: Point) => ({
      x: PADDING.left + ((point.x - view.minX) / (view.maxX - view.minX)) * plotW,
      y: PADDING.top + ((view.maxY - point.y) / (view.maxY - view.minY)) * plotH,
    }),
    [view, plotW, plotH],
  );

  const toMath = useCallback(
    (screenX: number, screenY: number): Point => ({
      x: view.minX + ((screenX - PADDING.left) / plotW) * (view.maxX - view.minX),
      y: view.maxY - ((screenY - PADDING.top) / plotH) * (view.maxY - view.minY),
    }),
    [view, plotW, plotH],
  );

  /* ------------------------------------------------------------- parsing */
  const parsedRows: Parsed[] = useMemo(
    () =>
      rows.map((row) => {
        if (row.text.trim() === "") return { row, constraint: null, error: null };
        const result = parseInequality(row.text);
        if (isParseFailure(result)) return { row, constraint: null, error: result.error };
        return {
          row,
          constraint: { a: result.a, b: result.b, op: result.op, c: result.c },
          error: null,
        };
      }),
    [rows],
  );

  const validParsed = useMemo(
    () => parsedRows.filter((item) => item.constraint !== null && item.row.visible),
    [parsedRows],
  );
  const constraints = useMemo(() => validParsed.map((item) => item.constraint!), [validParsed]);
  const region = useMemo(() => feasibleRegion(constraints, view), [constraints, view]);

  /* ------------------------------------------------------------ interaksi */
  const zoomAt = useCallback(
    (factor: number, anchorScreen: { x: number; y: number }) => {
      const anchor = toMath(anchorScreen.x, anchorScreen.y);
      setBounds((current) => {
        const fitted = fitAspect(current, plotW, plotH);
        const next: Bounds = {
          minX: anchor.x + (fitted.minX - anchor.x) * factor,
          maxX: anchor.x + (fitted.maxX - anchor.x) * factor,
          minY: anchor.y + (fitted.minY - anchor.y) * factor,
          maxY: anchor.y + (fitted.maxY - anchor.y) * factor,
        };
        return next;
      });
    },
    [toMath, plotW, plotH],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const scaleX = size.width / rect.width;
      const scaleY = size.height / rect.height;
      const point = { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
      zoomAt(Math.pow(1.12, event.deltaY > 0 ? 1 : -1), point);
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [zoomAt, size.width, size.height]);

  function pointerPosition(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.width,
      y: ((event.clientY - rect.top) / rect.height) * size.height,
    };
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    const position = pointerPosition(event);
    pointers.current.set(event.pointerId, position);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinch.current = {
        distance: Math.hypot(first!.x - second!.x, first!.y - second!.y),
        bounds: view,
        center: toMath((first!.x + second!.x) / 2, (first!.y + second!.y) / 2),
      };
    }
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const position = pointerPosition(event);
    pointers.current.set(event.pointerId, position);

    if (pointers.current.size >= 2 && pinch.current) {
      const [first, second] = [...pointers.current.values()];
      const distance = Math.hypot(first!.x - second!.x, first!.y - second!.y);
      const factor = pinch.current.distance / Math.max(distance, 1);
      const anchor = pinch.current.center;
      setBounds({
        minX: anchor.x + (pinch.current.bounds.minX - anchor.x) * factor,
        maxX: anchor.x + (pinch.current.bounds.maxX - anchor.x) * factor,
        minY: anchor.y + (pinch.current.bounds.minY - anchor.y) * factor,
        maxY: anchor.y + (pinch.current.bounds.maxY - anchor.y) * factor,
      });
      return;
    }

    const dx = ((position.x - previous.x) / plotW) * (view.maxX - view.minX);
    const dy = ((position.y - previous.y) / plotH) * (view.maxY - view.minY);
    setBounds((current) => {
      const fitted = fitAspect(current, plotW, plotH);
      return {
        minX: fitted.minX - dx,
        maxX: fitted.maxX - dx,
        minY: fitted.minY + dy,
        maxY: fitted.maxY + dy,
      };
    });
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  /* -------------------------------------------------------------- aksi UI */
  function updateRow(id: string, patch: Partial<LabRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  /**
   * Siswa cukup mengetik <= dan langsung menjadi ≤ (juga >= menjadi ≥).
   * Kursor dipertahankan di posisi yang benar supaya tidak melompat ke ujung.
   */
  function handleTextChange(id: string, input: HTMLInputElement) {
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const cleaned = normalizeTypedInequality(raw);
    if (cleaned === raw) {
      lastCaret.current[id] = caret;
      updateRow(id, { text: raw });
      return;
    }
    const nextCaret = caretAfterNormalize(raw, caret);
    lastCaret.current[id] = nextCaret;
    updateRow(id, { text: cleaned });
    requestAnimationFrame(() => {
      input.setSelectionRange(nextCaret, nextCaret);
    });
  }

  /** Tombol cepat ≤ ≥ < > = menyisipkan simbol pada posisi kursor. */
  function insertSymbol(symbol: string) {
    const id = focusedRow ?? rows[rows.length - 1]?.id;
    if (!id) return;
    const row = rows.find((item) => item.id === id);
    const input = inputRefs.current[id];
    if (!row) return;
    const start = input?.selectionStart ?? lastCaret.current[id] ?? row.text.length;
    const end = input?.selectionEnd ?? start;
    const text = row.text.slice(0, start) + symbol + row.text.slice(end);
    const caret = start + symbol.length;
    lastCaret.current[id] = caret;
    updateRow(id, { text });
    input?.focus();
    requestAnimationFrame(() => input?.setSelectionRange(caret, caret));
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) {
      setNotice(`Maksimal ${MAX_ROWS} pertidaksamaan dalam satu grafik.`);
      return;
    }
    setRows((current) => [...current, newRow(current.length)]);
  }

  function removeRow(id: string) {
    setRows((current) => (current.length === 1 ? [newRow(0)] : current.filter((row) => row.id !== id)));
  }

  function applyPreset(preset: GraphPreset) {
    setRows(preset.lines.map((line, index) => newRow(index, line)));
    setNotice(null);
    const constraintsFromPreset = preset.lines
      .map((line) => parseInequality(line))
      .filter((result): result is ParsedInequality => !isParseFailure(result))
      .map((result) => ({ a: result.a, b: result.b, op: result.op, c: result.c }));
    setBounds(autoFitBounds(constraintsFromPreset, plotW, plotH));
  }

  async function markDone() {
    if (!doneItem) return;
    setMarking(true);
    setNotice(null);
    try {
      await apiFetch("/api/progress", { method: "POST", body: { item: doneItem } });
      setDone(true);
      setNotice("Langkah ditandai selesai.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal menandai selesai.");
    } finally {
      setMarking(false);
    }
  }

  const nextStep = nextStepFor(pathname);

  /* ------------------------------------------------------------- geometri */
  const gridLines = useMemo(() => {
    const stepX = niceStep(view.maxX - view.minX);
    const stepY = niceStep(view.maxY - view.minY);
    const verticals: number[] = [];
    const horizontals: number[] = [];
    for (let x = Math.ceil(view.minX / stepX) * stepX; x <= view.maxX; x += stepX) verticals.push(Number(x.toFixed(6)));
    for (let y = Math.ceil(view.minY / stepY) * stepY; y <= view.maxY; y += stepY) horizontals.push(Number(y.toFixed(6)));
    return { stepX, stepY, verticals, horizontals };
  }, [view]);

  const axisX = Math.min(Math.max(0, view.minX), view.maxX);
  const axisY = Math.min(Math.max(0, view.minY), view.maxY);

  const polygonPath = region.polygon.length >= 3
    ? `${region.polygon.map((point) => toScreen(point)).map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")} Z`
    : null;

  const activeCount = constraints.length;

  return (
    <div className="space-y-4">
      <div className={mode === "verifikasi" ? "grid gap-4 lg:grid-cols-[1.6fr_1fr]" : "space-y-4"}>
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">
                {mode === "eksplorasi" ? "Tulis pertidaksamaanmu" : "Tulis sistem pertidaksamaan kelompokmu"}
              </h2>
              <div className="flex gap-2">
                <button type="button" className="btn btn-small" onClick={addRow} disabled={rows.length >= MAX_ROWS}>
                  + tambah pertidaksamaan
                </button>
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setBounds(DEFAULT_BOUNDS)}>
                  Atur ulang tampilan
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-ghost"
                  onClick={() => setBounds(autoFitBounds(constraints, plotW, plotH))}
                  disabled={constraints.length === 0}
                >
                  Sesuaikan otomatis
                </button>
              </div>
            </div>

            <p className="muted mt-2">
              Contoh yang bisa diketik: <span className="code-chip">2x + 3y ≤ 120</span>,{" "}
              <span className="code-chip">x ≥ 0</span>, <span className="code-chip">y &lt; 40</span>,{" "}
              <span className="code-chip">y &gt; 2x - 5</span>. Tanda <strong>&lt;</strong> dan{" "}
              <strong>&gt;</strong> digambar sebagai garis putus-putus.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-kitchen-700/60 bg-kitchen-850/60 px-3 py-2">
              <span className="font-mono text-[11px] tracking-wide text-cream-400 uppercase">
                Ketik ≤ dengan tombol ini
              </span>
              {["≤", "≥", "<", ">", "="].map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  className="btn btn-small"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertSymbol(symbol)}
                  aria-label={`Sisipkan tanda ${symbol}`}
                >
                  {symbol}
                </button>
              ))}
              <span className="muted text-xs">
                atau langsung ketik <span className="code-chip">&lt;=</span> pada papan tombol — otomatis menjadi{" "}
                <span className="code-chip">≤</span> (begitu juga <span className="code-chip">&gt;=</span> menjadi{" "}
                <span className="code-chip">≥</span>).
              </span>
            </div>

            {mode === "eksplorasi" && presets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="btn btn-small"
                    onClick={() => applyPreset(preset)}
                    title={preset.description}
                  >
                    Muat: {preset.title}
                  </button>
                ))}
              </div>
            )}

            <ul className="mt-4 space-y-2">
              {parsedRows.map((item, index) => (
                <li key={item.row.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
                      style={{ background: item.row.color }}
                      aria-hidden
                    />
                    <input
                      ref={(element) => {
                        inputRefs.current[item.row.id] = element;
                      }}
                      className="field font-mono"
                      value={item.row.text}
                      placeholder={index === 0 ? "2x + 3y ≤ 120" : "x ≥ 0"}
                      onFocus={() => setFocusedRow(item.row.id)}
                      onSelect={(event) => {
                        lastCaret.current[item.row.id] = event.currentTarget.selectionStart ?? 0;
                      }}
                      onChange={(event) => handleTextChange(item.row.id, event.currentTarget)}
                      aria-label={`Pertidaksamaan baris ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="btn btn-small btn-ghost"
                      onClick={() => updateRow(item.row.id, { visible: !item.row.visible })}
                      title={item.row.visible ? "Sembunyikan garis" : "Tampilkan garis"}
                    >
                      {item.row.visible ? "sembunyikan" : "tampilkan"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => removeRow(item.row.id)}
                      aria-label={`Hapus baris ${index + 1}`}
                    >
                      hapus
                    </button>
                  </div>
                  {item.error && <p className="ms-6 text-xs text-berry-400">{item.error}</p>}
                  {!item.error && !item.row.visible && (
                    <p className="muted ms-6">Baris disembunyikan: tidak digambar dan tidak ikut menghitung DHP.</p>
                  )}
                </li>
              ))}
            </ul>

            {notice && <p className="note mt-3">{notice}</p>}
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">Grafik</h2>
              <p className="muted">
                Geser kanvas untuk menggeser (pan), gulir/pinch untuk zoom. Digambar dengan SVG, tanpa library
                tambahan.
              </p>
            </div>

            <div ref={containerRef} className="mt-3 w-full">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${size.width} ${size.height}`}
                width="100%"
                height={size.height}
                className="touch-none rounded-xl border border-kitchen-700 bg-kitchen-950/70 select-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                role="img"
                aria-label="Grafik daerah penyelesaian"
              >
                <defs>
                  <pattern id="dhp-hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(242,162,92,0.35)" strokeWidth="3" />
                  </pattern>
                </defs>

                {/* grid */}
                <g>
                  {gridLines.verticals.map((x) => {
                    const screen = toScreen({ x, y: 0 });
                    return (
                      <line
                        key={`v-${x}`}
                        x1={screen.x}
                        y1={PADDING.top}
                        x2={screen.x}
                        y2={PADDING.top + plotH}
                        stroke="rgba(241,228,211,0.10)"
                        strokeWidth={1}
                      />
                    );
                  })}
                  {gridLines.horizontals.map((y) => {
                    const screen = toScreen({ x: 0, y });
                    return (
                      <line
                        key={`h-${y}`}
                        x1={PADDING.left}
                        y1={screen.y}
                        x2={PADDING.left + plotW}
                        y2={screen.y}
                        stroke="rgba(241,228,211,0.10)"
                        strokeWidth={1}
                      />
                    );
                  })}
                </g>

                {/* DHP */}
                {polygonPath && (
                  <>
                    <path d={polygonPath} fill="rgba(242,162,92,0.16)" />
                    <path d={polygonPath} fill="url(#dhp-hatch)" />
                    <path d={polygonPath} fill="none" stroke="rgba(242,162,92,0.5)" strokeWidth={1.5} />
                  </>
                )}

                {/* sumbu */}
                <g>
                  <line
                    x1={PADDING.left}
                    y1={toScreen({ x: 0, y: axisY }).y}
                    x2={PADDING.left + plotW}
                    y2={toScreen({ x: 0, y: axisY }).y}
                    stroke="rgba(241,228,211,0.55)"
                    strokeWidth={1.4}
                  />
                  <line
                    x1={toScreen({ x: axisX, y: 0 }).x}
                    y1={PADDING.top}
                    x2={toScreen({ x: axisX, y: 0 }).x}
                    y2={PADDING.top + plotH}
                    stroke="rgba(241,228,211,0.55)"
                    strokeWidth={1.4}
                  />
                  {gridLines.verticals
                    .filter((x) => Math.abs(x) > 1e-9)
                    .map((x) => {
                      const screen = toScreen({ x, y: 0 });
                      return (
                        <text
                          key={`tx-${x}`}
                          x={screen.x}
                          y={toScreen({ x: 0, y: axisY }).y + 14}
                          fill="rgba(241,228,211,0.6)"
                          fontSize={10}
                          textAnchor="middle"
                          className="font-mono"
                        >
                          {trimNumber(x)}
                        </text>
                      );
                    })}
                  {gridLines.horizontals
                    .filter((y) => Math.abs(y) > 1e-9)
                    .map((y) => {
                      const screen = toScreen({ x: 0, y });
                      return (
                        <text
                          key={`ty-${y}`}
                          x={toScreen({ x: axisX, y: 0 }).x - 6}
                          y={screen.y + 3}
                          fill="rgba(241,228,211,0.6)"
                          fontSize={10}
                          textAnchor="end"
                          className="font-mono"
                        >
                          {trimNumber(y)}
                        </text>
                      );
                    })}
                  <text
                    x={PADDING.left + plotW - 4}
                    y={toScreen({ x: 0, y: axisY }).y - 8}
                    fill="rgba(241,228,211,0.85)"
                    fontSize={12}
                    textAnchor="end"
                    className="font-mono"
                  >
                    x
                  </text>
                  <text
                    x={toScreen({ x: axisX, y: 0 }).x + 8}
                    y={PADDING.top + 12}
                    fill="rgba(241,228,211,0.85)"
                    fontSize={12}
                    className="font-mono"
                  >
                    y
                  </text>
                </g>

                {/* garis batas + label pertidaksamaan */}
                {validParsed.map((item, index) => {
                  const constraint = item.constraint!;
                  const anchor = boundaryLabelAnchor(constraint, view, index);
                  if (!anchor) return null;
                  const screen = toScreen(anchor.point);
                  const normal = { x: -anchor.direction.y, y: anchor.direction.x };
                  const offset = (index % 2 === 0 ? 1 : -1) * (16 + Math.floor(index / 2) * 6);
                  const labelX = screen.x + normal.x * offset;
                  const labelY = screen.y - normal.y * offset;
                  const label = item.row.text.trim();
                  const dashed = constraint.op === "<" || constraint.op === ">";
                  const width = Math.max(label.length * 6.4 + 12, 60);

                  const segment = clipLineToBounds(constraint, view);
                  if (!segment) return null;
                  const [start, end] = segment.map((point) => toScreen(point));

                  return (
                    <g key={item.row.id}>
                      <line
                        x1={start!.x}
                        y1={start!.y}
                        x2={end!.x}
                        y2={end!.y}
                        stroke={item.row.color}
                        strokeWidth={2.4}
                        strokeDasharray={dashed ? "8 6" : undefined}
                      />
                      <rect
                        x={labelX - width / 2}
                        y={labelY - 11}
                        width={width}
                        height={20}
                        rx={6}
                        fill="rgba(18,14,11,0.9)"
                        stroke={item.row.color}
                        strokeOpacity={0.55}
                      />
                      <text
                        x={labelX}
                        y={labelY + 3}
                        fill={item.row.color}
                        fontSize={11}
                        textAnchor="middle"
                        className="font-mono"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeCount === 0 && <span className="chip chip-warn">Belum ada pertidaksamaan yang tergambar</span>}
              {activeCount > 0 && !region.empty && (
                <span className="chip chip-ok">
                  {activeCount} pertidaksamaan · DHP {region.unbounded ? "terbuka (tak terbatas)" : "tertutup"}
                </span>
              )}
              {region.empty && <span className="chip chip-bad">Tidak ada daerah penyelesaian</span>}
              {region.lineOnly && (
                <span className="chip chip-warn">
                  Tanda = hanya digambar sebagai garis; tidak membentuk daerah penyelesaian
                </span>
              )}
              {constraints.some((constraint) => constraint.op === "=") && !region.lineOnly && (
                <span className="chip chip-warn">Ada kendala bertanda = yang hanya digambar sebagai garis</span>
              )}
            </div>

            {region.empty && (
              <p className="note mt-2">
                Irisan semua pertidaksamaan kosong. Periksa kembali tanda (&lt;, ≤, &gt;, ≥) dan angka pada tiap
                baris.
              </p>
            )}
            {!region.empty && region.unbounded && activeCount > 0 && (
              <p className="note-info mt-2">
                Daerah penyelesaian tidak terbatas (dibatasi sebagian oleh sumbu/garis). Daerah tetap diarsir
                sampai batas pandangan.
              </p>
            )}
          </div>

          {mode === "verifikasi" && (
            <div className="note">
              Cocokkan DHP dengan hasil gambar manual kelompokmu di LKPD. Titik pojok dan nilai optimum tetap
              dihitung manual — aplikasi ini tidak menghitungnya.
            </div>
          )}

          {doneItem && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={markDone}
                  disabled={marking || done || constraints.length === 0}
                >
                  {done ? "Sudah ditandai selesai ✓" : marking ? "Menyimpan…" : "Tandai selesai"}
                </button>
                {constraints.length === 0 && (
                  <span className="muted">Tambahkan dan gambar minimal satu pertidaksamaan dulu.</span>
                )}
              </div>
              {done && nextStep && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-herb-500/40 bg-herb-500/10 px-3 py-2">
                  <span className="text-sm text-herb-300">
                    {mode === "eksplorasi"
                      ? "Lab Grafik eksplorasi selesai. Lanjutkan ke langkah berikutnya."
                      : "Verifikasi grafik selesai. Lanjutkan ke langkah berikutnya."}
                  </span>
                  <Link className="btn btn-primary btn-small" href={nextStep.href}>
                    Lanjut: {nextStep.short} →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {mode === "verifikasi" && (
          <aside className="card h-fit">
            <h2 className="section-title">Ringkasan data wawancara kelompok</h2>
            {checklist && checklist.rows.length > 0 ? (
              <table className="data-table mt-3 min-w-0">
                <tbody>
                  {checklist.rows.map((row) => (
                    <tr key={`${row.label}-${row.value}`}>
                      <th scope="row" className="w-2/5 text-xs">
                        {row.label}
                      </th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted mt-2">Data wawancara belum tersedia.</p>
            )}
            <p className="muted mt-3">
              Ringkasan ini hanya data mentah sebagai rujukan. Model pertidaksamaan tidak diisi otomatis — kamu
              yang menuliskannya untuk memeriksa gambar.
            </p>
            {checklist?.title && <p className="muted mt-2">{checklist.title}</p>}
          </aside>
        )}
      </div>
    </div>
  );
}
