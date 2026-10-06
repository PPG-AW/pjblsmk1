import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { progress, quizAttempts } from "@/db/schema";
import { requireStudent } from "@/lib/auth";
import { badRequest, readJson, route } from "@/lib/http";
import {
  buildQuizPlan,
  gradeQuiz,
  isValidQuizSeed,
  QUIZ_TOTAL,
  QUIZ_QUESTIONS,
  readinessMessage,
} from "@/lib/sptldv";
import { sql } from "drizzle-orm";

/**
 * POST /api/quiz, kuis kesiapan (TANPA batas kelulusan).
 *
 * Semua percobaan disimpan. Guru memakai skor (percobaan pertama atau
 * tertinggi, sesuai pengaturan) untuk menyusun kelompok heterogen.
 * Kunci jawaban tidak pernah dikirim ke klien sebelum submit.
 */
export const POST = route(async (request) => {
  const context = await requireStudent();
  const body = await readJson(request);

  const seed = typeof body.seed === "string" ? body.seed : "";
  if (!isValidQuizSeed(seed)) {
    throw badRequest("Sesi kuis tidak valid. Muat ulang halaman kuis lalu coba lagi.");
  }

  const rawAnswers = body.answers;
  if (typeof rawAnswers !== "object" || rawAnswers === null || Array.isArray(rawAnswers)) {
    throw badRequest("Jawaban tidak terbaca. Muat ulang halaman kuis lalu coba lagi.");
  }

  const answers: Record<string, number | null> = {};
  const knownIds = new Set(QUIZ_QUESTIONS.map((question) => question.id));
  for (const [questionId, value] of Object.entries(rawAnswers as Record<string, unknown>)) {
    if (!knownIds.has(questionId)) continue;
    if (value === null || value === undefined) {
      answers[questionId] = null;
      continue;
    }
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= 4) {
      answers[questionId] = null;
      continue;
    }
    answers[questionId] = index;
  }

  const plan = buildQuizPlan(seed);
  const grading = gradeQuiz(plan, answers);

  const db = getDb();
  const existing = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(quizAttempts)
    .where(sql`${quizAttempts.studentId} = ${context.student.id}`);
  const attemptNo = (existing[0]?.total ?? 0) + 1;

  await db.insert(quizAttempts).values({
    studentId: context.student.id,
    attemptNo,
    score: grading.score,
    total: grading.total,
    answers: grading.details.map((detail) => ({
      questionId: detail.questionId,
      chosen: detail.chosenIndex,
      correct: detail.correct,
    })),
  });

  await db
    .insert(progress)
    .values({ studentId: context.student.id, item: "kuis" })
    .onConflictDoNothing({ target: [progress.studentId, progress.item] });

  return NextResponse.json({
    ok: true,
    attemptNo,
    score: grading.score,
    total: QUIZ_TOTAL,
    message: readinessMessage(grading.score, grading.total),
    details: grading.details,
  });
});
