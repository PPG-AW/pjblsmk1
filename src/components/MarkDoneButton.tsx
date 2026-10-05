"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function MarkDoneButton({
  item,
  alreadyDone,
  label = "Tandai selesai",
}: {
  item: "video" | "modul" | "grafik" | "grafik_verifikasi";
  alreadyDone: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(alreadyDone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-primary" onClick={handleClick} disabled={busy || done}>
        {done ? "Sudah ditandai selesai ✓" : busy ? "Menyimpan…" : label}
      </button>
      {error && <span className="chip chip-bad">{error}</span>}
    </div>
  );
}
