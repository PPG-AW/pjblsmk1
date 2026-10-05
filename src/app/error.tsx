"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Batas galat halaman: menggantikan layar bawaan Next.js dengan penjelasan
 * berbahasa Indonesia yang bisa ditindaklanjuti.
 *
 * Penyebab tersering:
 * 1. database Neon baru saja menganggur (compute tidur setelah 5 menit) dan
 *    koneksi pertama meleset — cukup dicoba lagi;
 * 2. string koneksi di Vercel belum benar;
 * 3. koneksi terputus sesaat oleh pooler.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[halaman]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
      <section className="card w-full space-y-3">
        <p className="font-mono text-xs tracking-widest text-berry-400 uppercase">Halaman gagal dimuat</p>
        <h1 className="font-display text-2xl text-cream-100">Sambungan ke database sedang bermasalah</h1>
        <p className="text-sm text-cream-200">
          Halaman ini butuh membaca/menyimpan data ke database, tetapi databasenya belum menjawab. Ini biasanya
          bukan salahmu.
        </p>
        <ol className="prose-block list-decimal ps-5 text-sm">
          <li>
            <strong>Coba lagi</strong> — paling sering ini hanya soal database yang baru bangun dari mode hemat
            (Neon menidurkan database setelah 5 menit menganggur dan bangun otomatis dalam hitungan detik).
          </li>
          <li>
            Bila tetap gagal, <strong>guru</strong> memeriksa <span className="code-chip">DATABASE_URL</span> dan{" "}
            <span className="code-chip">DIRECT_URL</span> di Vercel (Settings → Environment Variables), lalu{" "}
            <strong>Redeploy</strong>.
          </li>
          <li>
            Cek <Link href="/api/health">/api/health</Link> — bila muncul{" "}
            <span className="code-chip">status: &quot;degraded&quot;</span>, memang database yang tidak terjangkau.
          </li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Coba lagi
          </button>
          <Link className="btn" href="/dashboard">
            Ke beranda
          </Link>
          <Link className="btn btn-ghost" href="/api/health">
            Cek status server
          </Link>
        </div>
        {error.digest && (
          <p className="muted text-xs">
            Kode galat untuk dilaporkan ke guru: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </section>
    </main>
  );
}
