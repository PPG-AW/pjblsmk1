import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getInterview } from "@/db/queries";
import { inequalityAttempts } from "@/db/schema";
import InequalityLab from "@/components/InequalityLab";
import { getSessionContext } from "@/lib/auth";
import { buildModelTargets, interviewReadiness, objectiveExpression } from "@/lib/model";
import type { InterviewData } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function InequalityPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");
  if (!session.group) redirect("/dashboard");

  const interview = await getInterview(session.group.id);
  const data: InterviewData | null = interview
    ? {
        productA: interview.productA,
        productB: interview.productB,
        ingredients: interview.ingredients,
        priceA: interview.priceA,
        priceB: interview.priceB,
        costA: interview.costA,
        costB: interview.costB,
        moneyStatus: interview.moneyStatus,
      }
    : null;

  const readiness = interviewReadiness(data);
  const targets = buildModelTargets(data);

  const db = getDb();
  const attempts = await db
    .select({
      attemptNo: inequalityAttempts.attemptNo,
      correct: inequalityAttempts.correct,
      createdAt: inequalityAttempts.createdAt,
    })
    .from(inequalityAttempts)
    .where(eq(inequalityAttempts.studentId, session.student.id))
    .orderBy(desc(inequalityAttempts.attemptNo))
    .limit(5);
  const total = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(inequalityAttempts)
    .where(eq(inequalityAttempts.studentId, session.student.id));

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
          Fase Proyek · 7 · Menyusun model matematika
        </p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Susun Pertidaksamaan</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Ubah data wawancaramu menjadi sistem pertidaksamaan. Kunci penilaian diambil dari data yang kalian isi
          sendiri di Form Wawancara, dan petunjuk diberikan bertahap, bukan jawaban langsung.
        </p>
        <p className="muted mt-2">
          Jumlah percobaanmu: {total[0]?.total ?? 0}. Riwayat 5 terakhir:{" "}
          {attempts.length === 0
            ? "belum ada"
            : attempts
                .map((attempt) => `#${attempt.attemptNo} ${attempt.correct ? "tepat" : "belum tepat"}`)
                .join(", ")}
          .
        </p>
      </section>

      <InequalityLab
        rowHints={targets.map((target) => ({
          key: target.key,
          label: target.label,
          kind: target.nonNegative ? "nonnegatif" : "bahan",
        }))}
        ready={readiness.constraintReady}
        issues={readiness.issues}
        objective={objectiveExpression(data ?? ({} as unknown as InterviewData)) ?? null}
        canOpenGraph={Boolean(interview)}
      />
    </div>
  );
}
