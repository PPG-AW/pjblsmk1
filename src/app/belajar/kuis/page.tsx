import Link from "next/link";
import { redirect } from "next/navigation";
import QuizRunner from "@/components/QuizRunner";
import { getQuizHistory } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { buildQuizPlan, newQuizSeed, publicQuizQuestions, QUIZ_TOTAL } from "@/lib/sptldv";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");

  const [history, settings] = await Promise.all([getQuizHistory(session.student.id, 10), getSettings()]);

  // Urutan soal & urutan opsi diacak di server tiap sesi; kunci jawaban tidak
  // pernah dikirim ke klien.
  const seed = newQuizSeed();
  const plan = buildQuizPlan(seed);
  const questions = publicQuizQuestions(plan);

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">Fase Memahami · 4 dari 4</p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Kuis kesiapan ({QUIZ_TOTAL} soal)</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Kuis ini mengukur seberapa siap kamu menyusun model matematika dan membaca grafik DHP. Pertanyaan
          memakai konteks nasi ayam &amp; rice bowl (data contoh).
        </p>
        <p className="note mt-3">
          Tidak ada batas kelulusan. Kamu boleh mengulang kuis sebagai latihan. Guru memakai skor{" "}
          <strong>{settings.quizScoreMode === "pertama" ? "percobaan pertamamu" : "skor tertinggimu"}</strong> untuk
          menyusun kelompok heterogen (4 orang). Skor kuis tidak menjadi syarat masuk fase proyek.
        </p>

        {history.length > 0 && (
          <div className="mt-4">
            <h2 className="section-title text-lg">Riwayat percobaanmu</h2>
            <div className="table-wrap mt-2">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Percobaan</th>
                    <th>Skor</th>
                    <th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((attempt) => (
                    <tr key={attempt.attemptNo}>
                      <td>ke-{attempt.attemptNo}</td>
                      <td className="font-mono">
                        {attempt.score}/{attempt.total}
                      </td>
                      <td>{new Date(attempt.createdAt).toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="muted mt-3">
          Belum membaca modul? <Link href="/belajar/modul">Buka modul dulu</Link> atau{" "}
          <Link href="/belajar/grafik">coba Lab Grafik</Link>.
        </p>
      </section>

      <QuizRunner seed={seed} questions={questions} />

      <section className="note-info">
        Setelah mengumpulkan kuis, tunggu guru membentuk kelompok dan membagikan PIN. Masukkan PIN di{" "}
        <Link href="/dashboard">beranda</Link> untuk membuka fase proyek.
      </section>
    </div>
  );
}
