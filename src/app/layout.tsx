import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import AppShell, { type ShellSession } from "@/components/AppShell";
import { getSessionContext } from "@/lib/auth";
import { isConnectionError } from "@/lib/db-error";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-grotesk",
});

/**
 * Ditampilkan bila database tidak dapat dihubungi sama sekali. Sengaja
 * server-rendered (tanpa JavaScript) supaya pesan tetap terbaca.
 */
function DatabaseOfflineNotice() {
  return (
    <section className="card space-y-3">
      <p className="font-mono text-xs tracking-widest text-berry-400 uppercase">Database sedang tidak bisa dihubungi</p>
      <h1 className="font-display text-2xl text-cream-100">Aplikasi belum bisa membaca data</h1>
      <p className="text-sm text-cream-200">
        Penyebab paling sering: database Neon baru saja bangun dari mode hemat (compute tidur setelah 5 menit
        menganggur), string koneksi belum benar, atau koneksi terputus sesaat.
      </p>
      <ol className="prose-block list-decimal ps-5 text-sm">
        <li>
          <strong>Muat ulang halaman ini</strong> — bila hanya koneksi sesaat atau database baru bangun, biasanya
          langsung normal dalam beberapa detik.
        </li>
        <li>
          Bila tetap, <strong>guru</strong> memeriksa <span className="code-chip">DATABASE_URL</span> dan{" "}
          <span className="code-chip">DIRECT_URL</span> di Vercel, lalu <strong>Redeploy</strong>.
        </li>
        <li>
          Cek <a href="/api/health">/api/health</a>: <span className="code-chip">status: &quot;ok&quot;</span> berarti
          sudah normal.
        </li>
      </ol>
    </section>
  );
}

export const metadata: Metadata = {
  title: "DapurSPtLDV — Investigasi D'Culinary",
  description:
    "Proyek PjBL Program Linear (SPtLDV) kelas X AKL SMK N 1 Salatiga dengan konteks unit usaha D'Culinary.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session: ShellSession = { kind: "guest" };
  let databaseDown = false;
  try {
    const context = await getSessionContext();
    if (context?.kind === "teacher") session = { kind: "teacher" };
    else if (context?.kind === "student") {
      session = { kind: "student", name: context.student.name, groupName: context.group?.name ?? null };
    }
  } catch (error) {
    // Kredensial/env belum siap: tampilkan halaman sebagai tamu, tanpa crash.
    console.error("[layout] gagal membaca sesi:", error instanceof Error ? error.message : error);
    // Bila koneksi database yang bermasalah (mis. Neon baru bangun dari mode
    // hemat, atau string koneksi salah), jangan lanjutkan merender halaman —
    // tampilkan penjelasan yang bisa langsung dibaca tanpa menunggu JavaScript.
    databaseDown = isConnectionError(error);
  }

  return (
    <html lang="id" className={`${fraunces.variable} ${jakarta.variable} ${grotesk.variable}`}>
      <body>
        <AppShell session={session}>
          {databaseDown ? <DatabaseOfflineNotice /> : children}
        </AppShell>
      </body>
    </html>
  );
}
