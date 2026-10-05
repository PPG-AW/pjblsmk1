import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import AppShell, { type ShellSession } from "@/components/AppShell";
import { getSessionContext } from "@/lib/auth";
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

export const metadata: Metadata = {
  title: "DapurSPtLDV — Investigasi D'Culinary",
  description:
    "Proyek PjBL Program Linear (SPtLDV) kelas X AKL SMK N 1 Salatiga dengan konteks unit usaha D'Culinary.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session: ShellSession = { kind: "guest" };
  try {
    const context = await getSessionContext();
    if (context?.kind === "teacher") session = { kind: "teacher" };
    else if (context?.kind === "student") {
      session = { kind: "student", name: context.student.name, groupName: context.group?.name ?? null };
    }
  } catch (error) {
    // Kredensial/env belum siap: tampilkan halaman sebagai tamu, tanpa crash.
    console.error("[layout] gagal membaca sesi:", error instanceof Error ? error.message : error);
  }

  return (
    <html lang="id" className={`${fraunces.variable} ${jakarta.variable} ${grotesk.variable}`}>
      <body>
        <AppShell session={session}>{children}</AppShell>
      </body>
    </html>
  );
}
