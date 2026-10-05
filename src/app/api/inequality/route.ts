import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getInterview } from "@/db/queries";
import { inequalityAttempts } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth";
import { badRequest, readJson, route } from "@/lib/http";
import { buildCheckResult, buildModelTargets, interviewReadiness, objectiveExpression } from "@/lib/model";
import type { InterviewData } from "@/lib/model";
import { asStringArray } from "@/lib/validation";
import type { InequalityCheckResult } from "@/lib/types";

const MAX_LINES = 12;

function toInterviewData(interview: Awaited<ReturnType<typeof getInterview>>): InterviewData | null {
  if (!interview) return null;
  return {
    productA: interview.productA,
    productB: interview.productB,
    ingredients: interview.ingredients,
    priceA: interview.priceA,
    priceB: interview.priceB,
    costA: interview.costA,
    costB: interview.costB,
    moneyStatus: interview.moneyStatus,
  };
}

/** GET /api/inequality — status kesiapan + riwayat percobaan terakhir. */
export const GET = route(async () => {
  const context = await requireGroupMember();
  const interview = await getInterview(context.group.id);
  const data = toInterviewData(interview);
  const readiness = interviewReadiness(data);
  const targets = buildModelTargets(data);

  const db = getDb();
  const attempts = await db
    .select({ id: inequalityAttempts.id, attemptNo: inequalityAttempts.attemptNo, correct: inequalityAttempts.correct })
    .from(inequalityAttempts)
    .where(eq(inequalityAttempts.studentId, context.student.id))
    .orderBy(desc(inequalityAttempts.attemptNo))
    .limit(5);

  const total = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(inequalityAttempts)
    .where(eq(inequalityAttempts.studentId, context.student.id));

  return NextResponse.json({
    ready: readiness.constraintReady,
    issues: readiness.issues,
    objective: data ? objectiveExpression(data) : null,
    targetCount: targets.length,
    rowHints: targets.map((target) => ({
      key: target.key,
      label: target.label,
      kind: target.nonNegative ? "nonnegatif" : "bahan",
    })),
    attempts,
    nextAttemptNo: (total[0]?.total ?? 0) + 1,
  });
});

/**
 * POST /api/inequality — periksa jawaban sistem pertidaksamaan kelompok.
 *
 * - Kunci jawaban dibangun dari data wawancara kelompok.
 * - Petunjuk bertahap; tidak mengembalikan "hadiah grafik" (siswa membuka Lab
 *   Grafik sendiri lewat tombol verifikasi).
 */
export const POST = route(async (request) => {
  const context = await requireGroupMember();
  const groupId = context.group.id;
  const body = await readJson(request);

  const lines = asStringArray(body.lines ?? [], "Baris pertidaksamaan", {
    max: MAX_LINES,
    label: "Baris pertidaksamaan",
  }).map((line) => line.slice(0, 120));

  const interview = await getInterview(groupId);
  const data = toInterviewData(interview);
  const readiness = interviewReadiness(data);

  if (!readiness.constraintReady) {
    throw badRequest(
      `Susun Pertidaksamaan belum bisa dinilai karena data wawancara belum siap: ${readiness.issues.join(" ")}`,
    );
  }

  const targets = buildModelTargets(data);
  const db = getDb();

  const total = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(inequalityAttempts)
    .where(eq(inequalityAttempts.studentId, context.student.id));
  const attemptNo = (total[0]?.total ?? 0) + 1;

  const result: InequalityCheckResult = buildCheckResult({
    lines,
    targets,
    attemptNo,
    productA: data!.productA,
    productB: data!.productB,
  });

  await db.insert(inequalityAttempts).values({
    groupId,
    studentId: context.student.id,
    attemptNo,
    lines,
    result,
    correct: result.correct,
  });

  return NextResponse.json({
    ok: true,
    attemptNo,
    result,
    canVerifyInGraph: true,
    message: result.correct
      ? "Sistem pertidaksamaanmu sudah tepat. Silakan verifikasi gambar DHP-nya di Lab Grafik."
      : "Belum semua baris tepat. Baca petunjuk, perbaiki, lalu periksa lagi.",
  });
});
