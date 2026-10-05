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
  item: "video" | "modul" | "grafik" | "grafik_verifikasi";
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={handleClick} disabled={busy || done}>
          {done ? "Sudah ditandai selesai ✓" : busy ? "Menyimpan…" : label}
        </button>
        {error && <span className="chip chip-bad">{error}</span>}
        {done && !target && <span className="chip chip-ok">Langkah ini tuntas ✓</span>}
      </div>

      {done && target && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-herb-500/40 bg-herb-500/10 px-3 py-2">
          <span className="text-sm text-herb-300">
            Tersimpan. Kamu dapat melanjutkan ke langkah berikutnya.
          </span>
          <Link className="btn btn-primary btn-small" href={target}>
            Lanjut: {targetLabel} →
          </Link>
        </div>
      )}

      {!done && target && (
        <p className="muted">
          Setelah semua selesai, tekan tombol di atas lalu lanjut ke <strong>{targetLabel}</strong>.
        </p>
      )}
    </div>
  );
}
