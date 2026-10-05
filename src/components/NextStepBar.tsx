"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LAST_STEP_NUMBER, nextStepFor, prevStepFor, stepFor } from "@/lib/steps";

/**
 * Bilah pengarah langkah yang tampil di bawah setiap halaman siswa.
 *
 * Tujuannya: siswa selalu tahu dia sedang di langkah berapa dan apa yang harus
 * dikerjakan, serta punya tombol "Lanjut" yang jelas — tanpa harus menebak dari
 * menu. Tidak tampil di halaman guru atau halaman yang tidak ada dalam urutan.
 */
export default function NextStepBar() {
  const pathname = usePathname();
  const step = stepFor(pathname);
  if (!step) return null;

  const next = nextStepFor(pathname);
  const prev = prevStepFor(pathname);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-2">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
            {step.n === 0 ? "Mulai dari langkah 1" : `Langkah ${step.n} dari ${LAST_STEP_NUMBER}`} ·{" "}
            {step.title}
          </p>
          <p className="mt-1 max-w-3xl text-sm text-cream-200">{step.todo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prev && (
            <Link className="btn btn-small btn-ghost" href={prev.href}>
              ← {prev.short}
            </Link>
          )}
          {next ? (
            <Link className="btn btn-primary btn-small" href={next.href}>
              {step.n === 0 ? `Mulai: ${next.short}` : `Lanjut: ${next.short}`} →
            </Link>
          ) : (
            <span className="chip chip-ok">Semua langkah sudah tersedia — pastikan tidak ada yang terlewat ✓</span>
          )}
        </div>
      </section>
    </div>
  );
}
