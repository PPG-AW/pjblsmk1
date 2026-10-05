"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { PublicQuizQuestion } from "@/lib/sptldv";

type GradingDetail = {
  questionId: string;
  prompt: string;
  chosenText: string | null;
  correctText: string;
  correct: boolean;
  explanation: string;
};

type QuizResult = {
  attemptNo: number;
  score: number;
  total: number;
  message: string;
  details: GradingDetail[];
};

export default function QuizRunner({
  seed,
  questions,
}: {
  seed: string;
  questions: PublicQuizQuestion[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answeredCount = Object.values(answers).filter((value) => value !== null && value !== undefined).length;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = await apiFetch<QuizResult>("/api/quiz", {
        method: "POST",
        body: { seed, answers },
      });
      setResult(payload);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mengirim jawaban.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <section className="card">
          <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
            Percobaan ke-{result.attemptNo}
          </p>
          <h2 className="mt-1 font-display text-3xl text-cream-100">
            Skor kesiapanmu: {result.score}
            <span className="text-xl text-cream-400">/{result.total}</span>
          </h2>
          <p className="mt-2 text-sm text-cream-200">{result.message}</p>
          <p className="note mt-3">
            Skor ini <strong>bukan</strong> nilai kelulusan. Guru memakai skor ini (bersama hasil kuis temanmu)
            untuk menyusun kelompok heterogen agar setiap kelompok punya anggota dengan kesiapan beragam. Tidak ada
            syarat skor minimum untuk masuk fase proyek — yang menentukan adalah keanggotaan kelompok (PIN).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/proyek/perencanaan">
              Lanjut ke fase proyek
            </Link>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
            >
              Kerjakan lagi sebagai latihan
            </button>
            <Link className="btn btn-ghost" href="/dashboard">
              Kembali ke beranda
            </Link>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="section-title">Pembahasan per soal</h2>
          {result.details.map((detail, index) => (
            <article key={detail.questionId} className="card-tight">
              <div className="flex flex-wrap items-center gap-2">
                <span className={detail.correct ? "chip chip-ok" : "chip chip-bad"}>
                  {detail.correct ? "Tepat" : "Belum tepat"}
                </span>
                <span className="muted">Soal {index + 1}</span>
              </div>
              <p className="mt-2 text-sm text-cream-100">{detail.prompt}</p>
              <p className="muted mt-2">
                Jawabanmu: {detail.chosenText ?? "(tidak dijawab)"} · Jawaban tepat: {detail.correctText}
              </p>
              <p className="mt-2 text-sm text-ember-300">Pembahasan: {detail.explanation}</p>
            </article>
          ))}
        </section>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {questions.map((question, index) => (
        <section key={question.id} className="card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">Soal {index + 1}</span>
            <span className="chip chip-warn">{question.topic}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-cream-100">{question.prompt}</p>
          <div className="mt-3 space-y-2">
            {question.options.map((option, optionIndex) => {
              const id = `${question.id}-${optionIndex}`;
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-kitchen-700 bg-kitchen-850/60 px-3 py-2 text-sm transition hover:border-ember-500/60"
                >
                  <input
                    type="radio"
                    name={question.id}
                    className="mt-1 accent-ember-500"
                    checked={answers[question.id] === optionIndex}
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                  />
                  <span className="text-cream-100">{option}</span>
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-cream-200">
          Terjawab {answeredCount} dari {questions.length} soal.
          {answeredCount < questions.length && " Soal yang dikosongkan dihitung belum tepat."}
        </p>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Menilai…" : "Kumpulkan jawaban"}
        </button>
      </div>
    </form>
  );
}
