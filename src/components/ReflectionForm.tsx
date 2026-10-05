"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { REFLECTION_QUESTIONS, type ReflectionAnswers } from "@/lib/types";

export default function ReflectionForm({
  initialAnswers,
  initialRating,
  updatedAt,
}: {
  initialAnswers: ReflectionAnswers | null;
  initialRating: number;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const question of REFLECTION_QUESTIONS) {
      base[question.key] = initialAnswers?.[question.key] ?? "";
    }
    return base;
  });
  const [rating, setRating] = useState(initialRating);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = await apiFetch<{ message: string }>("/api/reflection", {
        method: "PUT",
        body: { answers, rating },
      });
      setMessage(payload.message);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan refleksi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card space-y-4" onSubmit={handleSubmit}>
      {REFLECTION_QUESTIONS.map((question, index) => (
        <div key={question.key}>
          <label className="field-label">
            {index + 1}. {question.question}
          </label>
          <textarea
            className="field min-h-[80px]"
            value={answers[question.key] ?? ""}
            onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}
            minLength={10}
            required
          />
        </div>
      ))}

      <div>
        <label className="field-label">Rating kerja sama kelompok (1–5)</label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={rating === value ? "btn btn-primary btn-small" : "btn btn-small"}
              onClick={() => setRating(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="muted mt-1">1 = perlu banyak perbaikan, 5 = sangat baik.</p>
      </div>

      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
      {message && <p className="chip chip-ok w-full justify-start">{message}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan refleksi"}
        </button>
        {updatedAt && (
          <span className="muted">Terakhir diperbarui {new Date(updatedAt).toLocaleString("id-ID")}.</span>
        )}
      </div>
    </form>
  );
}
