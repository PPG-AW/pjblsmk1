"use client";

/**
 * Papan tombol simbol pertidaksamaan.
 *
 * Dipakai di Lab Grafik dan di halaman Susun Pertidaksamaan. Tujuannya: siswa
 * tidak perlu mencari karakter ≤ / ≥ di papan tombol ponsel atau laptop.
 *
 * Cara pakai:
 * - Tombol besar ≤ dan ≥ menyisipkan simbol pada posisi kursor (tidak menghapus
 *   teks yang sudah diketik, karena fokus dipertahankan).
 * - Bila siswa tetap mengetik `<=` atau `>=`, teks otomatis diubah menjadi ≤ / ≥.
 */
export const SYMBOL_OPTIONS = ["≤", "≥", "<", ">", "="] as const;

export default function SymbolKeypad({
  onInsert,
  compact = false,
  hint,
}: {
  onInsert: (symbol: string) => void;
  compact?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-ember-500/30 bg-ember-500/5 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] tracking-wide text-ember-300 uppercase">Tanda pertidaksamaan</span>

        <button
          type="button"
          className={`btn btn-primary ${compact ? "btn-small" : ""}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsert("≤")}
          aria-label="Sisipkan tanda ≤ (lebih kecil atau sama dengan)"
        >
          ≤ lebih kecil <span className="opacity-70">atau sama dengan</span>
        </button>
        <button
          type="button"
          className={`btn btn-primary ${compact ? "btn-small" : ""}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsert("≥")}
          aria-label="Sisipkan tanda ≥ (lebih besar atau sama dengan)"
        >
          ≥ lebih besar <span className="opacity-70">atau sama dengan</span>
        </button>

        {SYMBOL_OPTIONS.filter((symbol) => symbol !== "≤" && symbol !== "≥").map((symbol) => (
          <button
            key={symbol}
            type="button"
            className={`btn ${compact ? "btn-small" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onInsert(symbol)}
            aria-label={`Sisipkan tanda ${symbol}`}
          >
            {symbol}
          </button>
        ))}
      </div>

      <p className="muted mt-2 text-xs">
        {hint ??
          "Tombol menyisipkan tanda tepat di posisi kursor. Kalau lebih suka mengetik biasa, tulis \u003c= atau \u003e= dan otomatis menjadi ≤ / ≥."}
      </p>
    </div>
  );
}
