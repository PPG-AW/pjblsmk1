"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import SymbolKeypad from "@/components/SymbolKeypad";
import { apiFetch } from "@/lib/api-client";
import { caretAfterNormalize, normalizeTypedInequality } from "@/lib/parser";
import type { InequalityCheckResult } from "@/lib/types";

type RowHint = { key: string; label: string; kind: string };

type AttemptResponse = {
  attemptNo: number;
  result: InequalityCheckResult;
  message: string;
};

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  benar: { text: "Benar", className: "chip chip-ok" },
  setara: { text: "Setara, tapi bukan jawaban akhir", className: "chip chip-warn" },
  koefisien: { text: "Periksa koefisien", className: "chip chip-warn" },
  ruas_kanan: { text: "Periksa ruas kanan", className: "chip chip-warn" },
  tanda: { text: "Periksa tanda", className: "chip chip-warn" },
  kosong: { text: "Belum diisi", className: "chip chip-bad" },
  tidak_dikenal: { text: "Tidak dikenali", className: "chip chip-bad" },
};

export default function InequalityLab({
  rowHints,
  ready,
  issues,
  objective,
  canOpenGraph,
}: {
  rowHints: RowHint[];
  ready: boolean;
  issues: string[];
  objective: string | null;
  canOpenGraph: boolean;
}) {
  const initialRows = Math.max(rowHints.length + 1, 4);
  const [lines, setLines] = useState<string[]>(() => Array.from({ length: initialRows }, () => ""));
  const [result, setResult] = useState<InequalityCheckResult | null>(null);
  const [attemptNo, setAttemptNo] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusedLine, setFocusedLine] = useState(0);
  const lineRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function updateLine(index: number, value: string) {
    setLines((current) => current.map((line, i) => (i === index ? value : line)));
  }

  /** Sisipkan tanda dari papan tombol ke baris yang sedang disorot (di posisi kursor). */
  function insertSymbol(symbol: string) {
    const index = focusedLine;
    const input = lineRefs.current[index];
    const current = lines[index] ?? "";
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? start;
    const next = current.slice(0, start) + symbol + current.slice(end);
    const caret = start + symbol.length;
    setLines((rows) => rows.map((line, i) => (i === index ? next : line)));
    input?.focus();
    requestAnimationFrame(() => input?.setSelectionRange(caret, caret));
  }

  /** Ketikan <= langsung menjadi ≤ (dan >= menjadi ≥) seperti di Lab Grafik. */
  function handleLineChange(index: number, input: HTMLInputElement) {
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const cleaned = normalizeTypedInequality(raw);
    if (cleaned === raw) {
      updateLine(index, raw);
      return;
    }
    const nextCaret = caretAfterNormalize(raw, caret);
    updateLine(index, cleaned);
    requestAnimationFrame(() => input.setSelectionRange(nextCaret, nextCaret));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = await apiFetch<AttemptResponse>("/api/inequality", {
        method: "POST",
        body: { lines },
      });
      setResult(payload.result);
      setAttemptNo(payload.attemptNo);
      setMessage(payload.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memeriksa jawaban.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="card space-y-3">
        <h2 className="section-title">Tahap ini belum bisa dinilai</h2>
        <p className="muted">
          Data wawancara kelompok belum cukup. Lengkapi dulu, lalu kembali ke halaman ini.
        </p>
        <ul className="list-disc space-y-1 ps-5 text-sm text-ember-300">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
        <Link className="btn btn-primary w-fit" href="/proyek/wawancara">
          Buka Form Wawancara
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form className="card space-y-3" onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Baris model matematika</h2>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setLines((current) => [...current, ""])}
            disabled={lines.length >= 12}
          >
            + tambah baris
          </button>
        </div>

        <p className="muted">
          Tulis satu pertidaksamaan per baris (boleh tidak berurutan, boleh memakai spasi bebas). Contoh bentuk:{" "}
          <span className="code-chip">100x + 150y ≤ 6000</span>,{" "}
          <span className="code-chip">x ≥ 0</span>. Cukup ketik <span className="code-chip">&lt;=</span> dan
          otomatis menjadi <span className="code-chip">≤</span> (juga <span className="code-chip">&gt;=</span>{" "}
          menjadi <span className="code-chip">≥</span>). Kamu juga boleh menulis &lt; &gt;, memakai titik sebagai pemisah ribuan (6.000), dan koma sebagai desimal.
        </p>

        <SymbolKeypad
          onInsert={insertSymbol}
          compact
          hint="Tombol menyisipkan tanda di baris yang sedang kamu isi (klik dulu kotak barisnya bila perlu). Mengetik <= atau >= juga otomatis menjadi ≤ / ≥."
        />

        <ul className="space-y-2">
          {lines.map((line, index) => {
            const hint = rowHints[index];
            return (
              <li key={index} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ember-400 w-6">{index + 1}.</span>
                <input
                  ref={(element) => {
                    lineRefs.current[index] = element;
                  }}
                  className="field flex-1 font-mono"
                  value={line}
                  onFocus={() => setFocusedLine(index)}
                  onChange={(event) => handleLineChange(index, event.currentTarget)}
                  placeholder={hint ? `untuk: ${hint.label}` : "pertidaksamaan lain (boleh dikosongkan)"}
                />
                <span className={hint ? "chip" : "chip chip-warn"}>{hint ? hint.label : "baris tambahan"}</span>
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  disabled={lines.length <= 1}
                >
                  hapus
                </button>
              </li>
            );
          })}
        </ul>

        {objective && (
          <p className="note-info">
            Fungsi tujuan kelompokmu: <span className="font-mono text-ember-300">{objective}</span> (tidak ikut
            dinilai di sini; tuliskan di produk akhir bersama nilai optimum).
          </p>
        )}

        {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
        {message && <p className="chip chip-ok w-full justify-start">{message}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Memeriksa…" : "Periksa jawaban"}
          </button>
          <span className="muted">Percobaanmu disimpan supaya guru bisa melihat riwayat.</span>
        </div>
      </form>

      {result && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Hasil percobaan ke-{attemptNo}</h2>
            <span className={result.correct ? "chip chip-ok" : "chip chip-warn"}>
              tingkat petunjuk {result.hintLevel}
            </span>
          </div>
          <p className="text-sm text-cream-100">{result.summary}</p>

          <ul className="space-y-2">
            {result.lines.map((line) => {
              const status = STATUS_LABEL[line.status] ?? STATUS_LABEL.kosong!;
              return (
                <li key={line.rowLabel} className="card-tight">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={status.className}>{status.text}</span>
                    <span className="text-sm font-medium text-cream-100">{line.rowLabel}</span>
                  </div>
                  <p className="mt-1 text-sm text-cream-200">{line.hint}</p>
                  {line.matchedInput && (
                    <p className="muted mt-1 font-mono">baris jawabanmu: {line.matchedInput}</p>
                  )}
                </li>
              );
            })}
          </ul>

          {result.extra.length > 0 && (
            <div className="note">
              <p className="font-semibold">Baris yang tidak cocok dengan data wawancara</p>
              <ul className="mt-1 list-disc ps-5 font-mono text-xs">
                {result.extra.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link className={result.correct ? "btn btn-primary" : "btn"} href="/proyek/grafik">
              Buka Lab Grafik untuk verifikasi →
            </Link>
            <span className="muted">
              Titik pojok dan nilai optimum tetap kamu hitung manual di LKPD; grafik hanya untuk memeriksa gambar
              DHP.
            </span>
          </div>
        </section>
      )}

      {!result && canOpenGraph && (
        <p className="note-info">
          Kamu juga boleh langsung membuka{" "}
          <Link href="/proyek/grafik">Lab Grafik (verifikasi)</Link> untuk mencoba menggambar sistem
          pertidaksamaanmu sendiri.
        </p>
      )}
    </div>
  );
}
