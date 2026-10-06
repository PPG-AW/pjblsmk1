"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Batas galat halaman: menggantikan layar bawaan Next.js dengan penjelasan
 * berbahasa Indonesia yang bisa ditindaklanjuti.
 *
 * Siswa melihat penjelasan sederhana; rincian teknis disembunyikan di bagian
 * "Keterangan untuk guru" agar tidak membingungkan saat pelajaran.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[halaman]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
      <section className="card w-full space-y-3">
        <p className="font-mono text-xs tracking-widest text-berry-400 uppercase">Halaman gagal dimuat</p>
        <h1 className="font-display text-2xl text-cream-100">Halaman ini belum bisa dibuka</h1>
        <p className="text-sm text-cream-200">
          Biasanya ini hanya gangguan singkat, bukan salahmu. Tekan tombol Coba lagi, kalau masih gagal tunggu
          sebentar lalu muat ulang halamannya.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Coba lagi
          </button>
          <Link className="btn" href="/dashboard">
            Ke beranda
          </Link>
        </div>
        {error.digest && (
          <p className="muted text-xs">
            Kode galat untuk dilaporkan ke guru: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-cream-300">Keterangan untuk guru</summary>
          <ol className="prose-block list-decimal ps-5 pt-2">
            <li>
              Halaman ini butuh membaca atau menyimpan data, tetapi sambungan datanya belum menjawab. Neon
              menidurkan database setelah 5 menit menganggur dan bangun otomatis dalam hitungan detik, jadi coba
              lagi biasanya cukup.
            </li>
            <li>
              Bila tetap gagal, periksa <span className="code-chip">DATABASE_URL</span> dan{" "}
              <span className="code-chip">DIRECT_URL</span> di Vercel (Settings, Environment Variables), lalu{" "}
              <strong>Redeploy</strong>.
            </li>
            <li>
              Cek <Link href="/api/health">/api/health</Link>. Bila muncul{" "}
              <span className="code-chip">status: &quot;degraded&quot;</span>, memang databasenya yang tidak
              terjangkau.
            </li>
          </ol>
        </details>
      </section>
    </main>
  );
}
