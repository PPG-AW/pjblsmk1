import { redirect } from "next/navigation";
import LabGrafik from "@/components/LabGrafik";
import { getProgressItems } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import { EXPLORE_PRESETS, SAMPLE_DATA_LABEL } from "@/lib/sptldv";

export const dynamic = "force-dynamic";

export default async function GraphExplorationPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");

  const progressItems = await getProgressItems(session.student.id);

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">Fase Memahami · 3 dari 4</p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Lab Grafik — eksplorasi</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Ketik pertidaksamaanmu sendiri dan lihat garis beserta daerah penyelesaian (DHP) tergambar. Kanvas dimulai
          kosong: kamu yang menuliskan pertidaksamaannya, bukan slider atau contoh otomatis.
        </p>
        <p className="note mt-3">
          Yang tidak ada di sini (memang disengaja): penanda titik pojok dan hitungan nilai optimum otomatis. Titik
          pojok dan nilai optimum kamu hitung manual di LKPD.
        </p>
      </section>

      <LabGrafik mode="eksplorasi" presets={EXPLORE_PRESETS} doneItem="grafik" alreadyDone={progressItems.has("grafik")} />

      <section className="card">
        <h2 className="section-title">Latihan terbimbing</h2>
        <ol className="prose-block mt-2 list-decimal ps-5">
          <li>Ketik <span className="code-chip">100x + 150y &lt;= 6000</span>. Amati garis dan daerah yang diarsir.</li>
          <li>Tambahkan <span className="code-chip">80x + 40y &lt;= 4000</span>. Perhatikan irisan kedua kendala.</li>
          <li>Tambahkan <span className="code-chip">x &gt;= 0</span> dan <span className="code-chip">y &gt;= 0</span>.</li>
          <li>Ubah satu tanda menjadi <span className="code-chip">&lt;</span> (misalnya y &lt; 40) dan lihat garis putus-putus.</li>
          <li>Coba tombol &ldquo;Sesuaikan otomatis&rdquo; lalu &ldquo;Atur ulang tampilan&rdquo;.</li>
        </ol>
        <p className="muted mt-2">{SAMPLE_DATA_LABEL}</p>
      </section>
    </div>
  );
}
