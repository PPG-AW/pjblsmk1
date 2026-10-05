"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { nextStepFor } from "@/lib/steps";

export default function MarkDoneButton({
  item,
  alreadyDone,
  label = "Tandai selesai",
  nextHref,
  nextLabel,
}: {
  item: "cerita" | "modul" | "grafik" | "grafik_verifikasi";
  alreadyDone: boolean;
  label?: string;
  /** Bila tidak diisi, diambil otomatis dari urutan langkah siswa. */
  nextHref?: string;
  nextLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [done, setDone] = useState(alreadyDone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = nextStepFor(pathname);
  const target = nextHref ?? step?.href;
  const targetLabel = nextLabel ?? (step ? step.short : null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/progress", { method: "POST", body: { item } });
      setDone(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" onClick={handleClick} disabled={busy || done}>
          {done ? "Sudah ditandai selesai ✓" : busy ? "Menyimpan…" : label}
        </button>

        {/* Tombol lanjut muncul di samping begitu langkah ditandai selesai. */}
        {done && target && (
          <Link className="btn btn-primary" href={target}>
            Lanjut: {targetLabel} →
          </Link>
        )}

        {error && <span className="chip chip-bad">{error}</span>}
        {done && !target && <span className="chip chip-ok">Langkah terakhir selesai ✓</span>}
      </div>

      {done && target && (
        <p className="muted">Tersimpan. Silakan lanjut ke langkah berikutnya lewat tombol di atas.</p>
      )}
      {!done && target && (
        <p className="muted">
          Setelah semua selesai, tekan tombol di atas — tombol <strong>Lanjut: {targetLabel}</strong> akan muncul di
          sampingnya.
        </p>
      )}
    </div>
  );
}
