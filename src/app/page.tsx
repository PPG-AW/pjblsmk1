import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSessionContext } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  DRIVING_QUESTION,
  NO_FABRICATION_RULE,
  PEMANTIK_QUESTIONS,
  PROJECT_TITLE,
  SIX_PHASES,
} from "@/lib/sptldv";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSessionContext().catch(() => null);
  if (session?.kind === "student") redirect("/dashboard");
  if (session?.kind === "teacher") redirect("/guru/dashboard");

  const settings = await getSettings().catch(() => null);
  const rosterActive = settings?.restrictRoster ?? false;

  return (
    <div className="space-y-6">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
          Matematika · Fase E · Kelas X AKL · Program Linear
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-cream-100 md:text-4xl">
          {PROJECT_TITLE}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cream-200">
          <span className="font-semibold text-ember-300">Pertanyaan utama proyek: </span>
          {DRIVING_QUESTION}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="card-tight">
            <h2 className="section-title text-lg">Enam fase project based learning</h2>
            <ol className="mt-2 grid gap-1 text-sm text-cream-200 sm:grid-cols-2">
              {SIX_PHASES.map((phase, index) => (
                <li key={phase}>
                  <span className="font-mono text-xs text-ember-400">{index + 1}. </span>
                  {phase}
                </li>
              ))}
            </ol>
          </div>
          <div className="card-tight">
            <h2 className="section-title text-lg">Aturan data</h2>
            <p className="mt-2 text-sm text-cream-200">{NO_FABRICATION_RULE}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card space-y-3">
          <h2 className="section-title">Masuk siswa</h2>
          <LoginForm rosterActive={rosterActive} />
          <p className="muted">
            Guru?{" "}
            <Link href="/guru" className="font-medium">
              Masuk lewat halaman guru
            </Link>
            .
          </p>
        </div>

        <div className="card space-y-3">
          <h2 className="section-title">Pertanyaan pemantik</h2>
          <ul className="prose-block list-disc ps-5">
            {PEMANTIK_QUESTIONS.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <div className="note-info">
            <p className="font-semibold text-cream-100">Alur belajar</p>
            <p className="mt-1">
              Fase Memahami (cerita, modul, Lab Grafik, kuis) terbuka untuk semua siswa. Setelah kuis, guru
              membentuk kelompok heterogen dan membagikan PIN. Fase Proyek dan Fase Akhir terbuka setelah kamu
              bergabung di kelompok.
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Yang akan kamu kerjakan</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="card-tight">
            <h3 className="font-display text-lg text-ember-300">1. Memahami</h3>
            <p className="mt-1 text-sm">
              Membaca cerita D&apos;Culinary tiga babak, mempelajari modul (model matematika, grafik DHP, titik pojok), mencoba
              Lab Grafik, lalu mengerjakan kuis kesiapan.
            </p>
          </div>
          <div className="card-tight">
            <h3 className="font-display text-lg text-ember-300">2. Proyek</h3>
            <p className="mt-1 text-sm">
              Menyusun Project Planning Sheet, mewawancarai pengurus D&apos;Culinary, menyusun pertidaksamaan,
              memverifikasi grafik, dan menulis jurnal harian.
            </p>
          </div>
          <div className="card-tight">
            <h3 className="font-display text-lg text-ember-300">3. Akhir</h3>
            <p className="mt-1 text-sm">
              Mengumpulkan produk akhir (tautan Google Drive + ringkasan) dan menulis refleksi pengalaman
              kelompok.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
