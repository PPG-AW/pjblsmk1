import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getStudentReflection } from "@/db/queries";
import { reflections } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { REFLECTION_QUESTIONS, type ReflectionAnswers } from "@/lib/types";
import { asNumber, asString } from "@/lib/validation";

/** GET /api/reflection — refleksi milik siswa. */
export const GET = route(async () => {
  const context = await requireGroupMember();
  const existing = await getStudentReflection(context.student.id);
  return NextResponse.json({
    reflection: existing
      ? {
          rating: existing.rating,
          answers: existing.answers,
          updatedAt: existing.updatedAt instanceof Date ? existing.updatedAt.toISOString() : existing.updatedAt,
        }
      : null,
    questions: REFLECTION_QUESTIONS,
  });
});

/** PUT /api/reflection — lima pertanyaan refleksi + rating 1–5. */
export const PUT = route(async (request) => {
  const context = await requireGroupMember();
  const body = await readJson(request);
  const rawAnswers = (body.answers ?? {}) as Record<string, unknown>;

  const answers = {} as ReflectionAnswers;
  for (const question of REFLECTION_QUESTIONS) {
    answers[question.key] = asString(rawAnswers[question.key], question.question, {
      min: 10,
      max: 1500,
      label: "Jawaban refleksi",
    });
  }

  const rating = asNumber(body.rating, "Rating kerja sama kelompok", { min: 1, max: 5, integer: true });

  const db = getDb();
  const values = { studentId: context.student.id, rating, answers, updatedAt: new Date() };
  await db.insert(reflections).values(values).onConflictDoUpdate({ target: reflections.studentId, set: values });

  return NextResponse.json({ ok: true, message: "Refleksi tersimpan. Terima kasih sudah menulis dengan jujur." });
});
