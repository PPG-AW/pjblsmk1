/**
 * Query agregat untuk dashboard siswa & guru.
 *
 * Prinsip: pakai agregasi SQL (GROUP BY / COUNT / jsonb_array_elements), bukan
 * menarik seluruh tabel lalu menyaring di JavaScript.
 */
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb, getSql } from "@/db";
import {
  classRoster,
  finalProducts,
  groupMembers,
  groups,
  interviews,
  interviewSlots,
  journals,
  planningSheets,
  progress,
  quizAttempts,
  reflections,
  reminders,
  students,
} from "@/db/schema";
import { todayJakarta } from "@/lib/date";
import { getSettings, quizScoreFor, type AppSettings } from "@/lib/settings";
import type { GroupStatus } from "@/lib/types";

export type MemberSummary = {
  studentId: number;
  name: string;
  quizScore: number | null;
  quizAttempts: number;
  journalCount: number;
  hasActivity: boolean;
  reflectionDone: boolean;
  lastSeenAt: string | null;
  roles: string[];
};

export type GroupOverview = {
  id: number;
  name: string;
  pin: string;
  members: MemberSummary[];
  planning: {
    status: string;
    updatedAt: string | null;
    updatedByName: string | null;
    productA: string;
    productB: string;
    slotId: number | null;
    slotLabel: string | null;
    teacherNote: string | null;
    rolesFilled: boolean;
  } | null;
  interview: {
    exists: boolean;
    completeCount: number;
    unclearCount: number;
    missingCount: number;
    followUps: string[];
    objectiveReady: boolean;
    updatedAt: string | null;
  };
  journal: { total: number; perMember: Record<number, number>; lastAt: string | null };
  finalProduct: { type: string; title: string; link: string; updatedAt: string | null } | null;
  reflections: { done: number; total: number };
  status: GroupStatus;
  statusReasons: string[];
};

export type TeacherOverview = {
  settings: AppSettings;
  groups: GroupOverview[];
  ungrouped: {
    studentId: number;
    name: string;
    quizScore: number | null;
    quizAttempts: number;
    hasActivity: boolean;
  }[];
  slots: { id: number; label: string; date: string; groupId: number | null; groupName: string | null }[];
  reminders: { id: number; message: string; active: boolean; createdAt: string }[];
  roster: { name: string; studentExists: boolean }[];
  classStats: {
    studentCount: number;
    groupCount: number;
    withoutScore: number;
    averageScore: number | null;
    submittedFinalProducts: number;
    submittedReflections: number;
  };
};

export async function getQuizStats(): Promise<
  Map<number, { attempts: number; firstScore: number | null; highestScore: number | null; lastScore: number | null }>
> {
  const db = getDb();
  const rows = await db
    .select({
      studentId: quizAttempts.studentId,
      attempts: sql<number>`count(*)::int`,
      firstScore: sql<number | null>`(array_agg(${quizAttempts.score} ORDER BY ${quizAttempts.attemptNo} ASC))[1]`,
      highestScore: sql<number | null>`max(${quizAttempts.score})::int`,
      lastScore: sql<number | null>`(array_agg(${quizAttempts.score} ORDER BY ${quizAttempts.attemptNo} DESC))[1]`,
    })
    .from(quizAttempts)
    .groupBy(quizAttempts.studentId);

  return new Map(
    rows.map((row) => [
      row.studentId,
      {
        attempts: row.attempts ?? 0,
        firstScore: row.firstScore ?? null,
        highestScore: row.highestScore ?? null,
        lastScore: row.lastScore ?? null,
      },
    ]),
  );
}

export async function getJournalCounts(): Promise<Map<number, number>> {
  const db = getDb();
  const rows = await db
    .select({ studentId: journals.studentId, total: sql<number>`count(*)::int` })
    .from(journals)
    .groupBy(journals.studentId);
  return new Map(rows.map((row) => [row.studentId, row.total ?? 0]));
}

export async function getActivityFlags(): Promise<Set<number>> {
  const client = getSql();
  const rows = await client<{ student_id: number }[]>`
    SELECT student_id FROM progress
    UNION SELECT student_id FROM quiz_attempts
    UNION SELECT student_id FROM journals
    UNION SELECT student_id FROM reflections
    UNION SELECT student_id FROM sessions WHERE student_id IS NOT NULL`;
  return new Set(rows.map((row) => row.student_id));
}

type InterviewAggregate = {
  group_id: number;
  complete_count: number;
  unclear_count: number;
  missing_count: number;
  follow_ups: string[] | null;
  objective_ready: boolean;
  updated_at: string | null;
};

export async function getInterviewAggregates(): Promise<Map<number, InterviewAggregate>> {
  const client = getSql();
  const rows = await client<InterviewAggregate[]>`
    SELECT
      i.group_id,
      COALESCE((SELECT count(*)::int FROM jsonb_array_elements(i.ingredients) e WHERE e->>'status' = 'lengkap'), 0) AS complete_count,
      COALESCE((SELECT count(*)::int FROM jsonb_array_elements(i.ingredients) e WHERE e->>'status' = 'belum_jelas'), 0) AS unclear_count,
      COALESCE((SELECT count(*)::int FROM jsonb_array_elements(i.ingredients) e WHERE e->>'status' = 'belum_ada'), 0) AS missing_count,
      ARRAY(
        SELECT jsonb_build_object('bahan', e->>'name', 'tindakLanjut', e->>'followUp')::text
        FROM jsonb_array_elements(i.ingredients) e
        WHERE e->>'status' <> 'lengkap'
      ) AS follow_ups,
      (i.price_a IS NOT NULL AND i.price_b IS NOT NULL AND i.cost_a IS NOT NULL AND i.cost_b IS NOT NULL) AS objective_ready,
      i.updated_at::text AS updated_at
    FROM interviews i`;

  return new Map(rows.map((row) => [row.group_id, row]));
}

export async function getTeacherOverview(): Promise<TeacherOverview> {
  const db = getDb();
  const settings = await getSettings();

  const [studentRows, groupRows, memberRows, planningRows, slotRows, finalRows, reflectionAgg, reminderRows, rosterRows] =
    await Promise.all([
      db.select().from(students).orderBy(asc(students.name)),
      db.select().from(groups).orderBy(asc(groups.name)),
      db
        .select({
          groupId: groupMembers.groupId,
          studentId: groupMembers.studentId,
          name: students.name,
          lastSeenAt: students.lastSeenAt,
        })
        .from(groupMembers)
        .innerJoin(students, eq(students.id, groupMembers.studentId)),
      db.select().from(planningSheets),
      db
        .select({
          id: interviewSlots.id,
          label: interviewSlots.label,
          date: interviewSlots.date,
          groupId: interviewSlots.groupId,
          groupName: groups.name,
        })
        .from(interviewSlots)
        .leftJoin(groups, eq(groups.id, interviewSlots.groupId))
        .orderBy(asc(interviewSlots.label)),
      db.select().from(finalProducts),
      db
        .select({ groupId: groupMembers.groupId, total: sql<number>`count(*)::int` })
        .from(reflections)
        .innerJoin(groupMembers, eq(groupMembers.studentId, reflections.studentId))
        .groupBy(groupMembers.groupId),
      db.select().from(reminders).orderBy(desc(reminders.createdAt)),
      db.select().from(classRoster).orderBy(asc(classRoster.name)),
    ]);

  const [quizStats, journalCounts, activityFlags, interviewAggregates, reflectionRows] = await Promise.all([
    getQuizStats(),
    getJournalCounts(),
    getActivityFlags(),
    getInterviewAggregates(),
    db.select({ studentId: reflections.studentId }).from(reflections),
  ]);
  const reflectionStudentSet = new Set(reflectionRows.map((row) => row.studentId));

  const journalLastRows = await db
    .select({ groupId: journals.groupId, lastAt: sql<string | null>`max(${journals.updatedAt})::text` })
    .from(journals)
    .where(isNotNull(journals.groupId))
    .groupBy(journals.groupId);
  const journalLast = new Map(journalLastRows.map((row) => [row.groupId!, row.lastAt]));

  const studentById = new Map(studentRows.map((row) => [row.id, row]));
  const planningByGroup = new Map(planningRows.map((row) => [row.groupId, row]));
  const finalByGroup = new Map(finalRows.map((row) => [row.groupId, row]));
  const reflectionByGroup = new Map(reflectionAgg.map((row) => [row.groupId, row.total]));
  const slotByGroup = new Map(
    slotRows.filter((slot) => slot.groupId !== null).map((slot) => [slot.groupId!, slot]),
  );

  const memberIdsByGroup = new Map<number, number[]>();
  for (const member of memberRows) {
    const list = memberIdsByGroup.get(member.groupId) ?? [];
    list.push(member.studentId);
    memberIdsByGroup.set(member.groupId, list);
  }

  const groupsOverview: GroupOverview[] = groupRows.map((group) => {
    const memberIds = memberIdsByGroup.get(group.id) ?? [];
    const planning = planningByGroup.get(group.id);
    const interviewAgg = interviewAggregates.get(group.id);

    const members: MemberSummary[] = memberIds
      .map((studentId) => {
        const student = studentById.get(studentId);
        const stats = quizStats.get(studentId);
        const roles = planning
          ? (planning.roles ?? [])
              .filter((assignment) => assignment.studentId === studentId)
              .flatMap((assignment) => assignment.roles)
          : [];
        return {
          studentId,
          name: student?.name ?? "Siswa",
          quizScore: stats ? quizScoreFor(settings.quizScoreMode, stats) : null,
          quizAttempts: stats?.attempts ?? 0,
          journalCount: journalCounts.get(studentId) ?? 0,
          hasActivity: activityFlags.has(studentId),
          reflectionDone: reflectionStudentSet.has(studentId),
          lastSeenAt: student ? new Date(student.lastSeenAt).toISOString() : null,
          roles,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "id"));

    const statusReasons: string[] = [];
    const withoutActivity = members.filter((member) => !member.hasActivity);
    if (withoutActivity.length > 0) {
      statusReasons.push(`${withoutActivity.length} anggota belum ada aktivitas`);
    }
    if (interviewAgg && (interviewAgg.unclear_count > 0 || interviewAgg.missing_count > 0)) {
      statusReasons.push("data wawancara belum lengkap");
    }
    if (interviewAgg === undefined) {
      statusReasons.push("form wawancara belum diisi");
    }
    const membersWithoutJournal = members.filter((member) => member.journalCount === 0);
    if (members.length > 0 && membersWithoutJournal.length > 0) {
      statusReasons.push(`${membersWithoutJournal.length} anggota belum menulis jurnal`);
    }

    let status: GroupStatus = "lancar";
    if (withoutActivity.length > 0) status = "masalah";
    else if (statusReasons.length > 0) status = "perhatian";

    return {
      id: group.id,
      name: group.name,
      pin: group.pin,
      members,
      planning: planning
        ? {
            status: planning.status,
            updatedAt: toIso(planning.updatedAt),
            updatedByName: planning.updatedBy ? studentById.get(planning.updatedBy)?.name ?? null : null,
            productA: planning.productA,
            productB: planning.productB,
            slotId: slotByGroup.get(group.id)?.id ?? null,
            slotLabel: slotByGroup.get(group.id)?.label ?? null,
            teacherNote: planning.teacherNote,
            rolesFilled: members.length > 0 && members.every((member) => member.roles.length > 0),
          }
        : null,
      interview: {
        exists: Boolean(interviewAgg),
        completeCount: interviewAgg?.complete_count ?? 0,
        unclearCount: interviewAgg?.unclear_count ?? 0,
        missingCount: interviewAgg?.missing_count ?? 0,
        followUps: (interviewAgg?.follow_ups ?? []).map((raw) => raw),
        objectiveReady: interviewAgg?.objective_ready ?? false,
        updatedAt: interviewAgg?.updated_at ?? null,
      },
      journal: {
        total: members.reduce((sum, member) => sum + member.journalCount, 0),
        perMember: Object.fromEntries(members.map((member) => [member.studentId, member.journalCount])),
        lastAt: journalLast.get(group.id) ?? null,
      },
      finalProduct: finalByGroup.has(group.id)
        ? {
            type: finalByGroup.get(group.id)!.type,
            title: finalByGroup.get(group.id)!.title,
            link: finalByGroup.get(group.id)!.link,
            updatedAt: toIso(finalByGroup.get(group.id)!.updatedAt),
          }
        : null,
      reflections: { done: reflectionByGroup.get(group.id) ?? 0, total: members.length },
      status,
      statusReasons,
    };
  });

  const groupedStudentIds = new Set(memberRows.map((row) => row.studentId));
  const ungrouped = studentRows
    .filter((student) => !groupedStudentIds.has(student.id))
    .map((student) => {
      const stats = quizStats.get(student.id);
      return {
        studentId: student.id,
        name: student.name,
        quizScore: stats ? quizScoreFor(settings.quizScoreMode, stats) : null,
        quizAttempts: stats?.attempts ?? 0,
        hasActivity: activityFlags.has(student.id),
      };
    });

  const scored = [...quizStats.values()]
    .map((stats) => quizScoreFor(settings.quizScoreMode, stats))
    .filter((score): score is number => score !== null);

  const rosterNames = rosterRows.map((row) => row.name);
  const studentNames = new Set(studentRows.map((row) => row.name.toLowerCase()));

  return {
    settings,
    groups: groupsOverview,
    ungrouped,
    slots: slotRows,
    reminders: reminderRows.map((reminder) => ({
      id: reminder.id,
      message: reminder.message,
      active: reminder.active,
      createdAt: toIso(reminder.createdAt) ?? "",
    })),
    roster: rosterNames.map((name) => ({ name, studentExists: studentNames.has(name.toLowerCase()) })),
    classStats: {
      studentCount: studentRows.length,
      groupCount: groupRows.length,
      withoutScore: studentRows.filter((student) => !quizStats.has(student.id)).length,
      averageScore: scored.length > 0 ? scored.reduce((sum, value) => sum + value, 0) / scored.length : null,
      submittedFinalProducts: finalRows.length,
      submittedReflections: reflectionAgg.reduce((sum, row) => sum + row.total, 0),
    },
  };
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/* -------------------------------------------------------------------------- */
/* Data satu kelompok (dipakai halaman proyek & dashboard siswa)               */
/* -------------------------------------------------------------------------- */

export async function getGroupStudents(groupId: number) {
  const db = getDb();
  return db
    .select({ id: students.id, name: students.name })
    .from(groupMembers)
    .innerJoin(students, eq(students.id, groupMembers.studentId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(students.name));
}

export async function getPlanningSheet(groupId: number) {
  const db = getDb();
  const rows = await db.select().from(planningSheets).where(eq(planningSheets.groupId, groupId)).limit(1);
  return rows[0] ?? null;
}

export async function getInterview(groupId: number) {
  const db = getDb();
  const rows = await db.select().from(interviews).where(eq(interviews.groupId, groupId)).limit(1);
  return rows[0] ?? null;
}

export async function getInequalityAttemptCount(studentId: number): Promise<number> {
  const client = getSql();
  const rows = await client<{ total: number }[]>`
    SELECT count(*)::int AS total FROM inequality_attempts WHERE student_id = ${studentId}`;
  return rows[0]?.total ?? 0;
}

export async function getJournalEntries(groupId: number) {
  const db = getDb();
  return db
    .select({
      id: journals.id,
      studentId: journals.studentId,
      studentName: students.name,
      entryDate: journals.entryDate,
      activityType: journals.activityType,
      activity: journals.activity,
      obstacle: journals.obstacle,
      contribution: journals.contribution,
      updatedAt: journals.updatedAt,
    })
    .from(journals)
    .innerJoin(students, eq(students.id, journals.studentId))
    .where(eq(journals.groupId, groupId))
    .orderBy(desc(journals.entryDate), desc(journals.id));
}

export async function getFinalProduct(groupId: number) {
  const db = getDb();
  const rows = await db.select().from(finalProducts).where(eq(finalProducts.groupId, groupId)).limit(1);
  return rows[0] ?? null;
}

export async function getStudentReflection(studentId: number) {
  const db = getDb();
  const rows = await db.select().from(reflections).where(eq(reflections.studentId, studentId)).limit(1);
  return rows[0] ?? null;
}

export async function getProgressItems(studentId: number): Promise<Set<string>> {
  const db = getDb();
  const rows = await db.select({ item: progress.item }).from(progress).where(eq(progress.studentId, studentId));
  return new Set(rows.map((row) => row.item));
}

export async function getQuizHistory(studentId: number, limit = 5) {
  const db = getDb();
  return db
    .select({
      attemptNo: quizAttempts.attemptNo,
      score: quizAttempts.score,
      total: quizAttempts.total,
      createdAt: quizAttempts.createdAt,
    })
    .from(quizAttempts)
    .where(eq(quizAttempts.studentId, studentId))
    .orderBy(desc(quizAttempts.attemptNo))
    .limit(limit);
}

/**
 * Info untuk notice berjalan di header siswa: apakah jurnal hari ini sudah diisi,
 * dan pesan pengingat terakhir dari guru (bila ada).
 */
export async function getJournalTickInfo(studentId: number) {
  const db = getDb();
  const today = todayJakarta();
  const [todayEntries, activeReminders] = await Promise.all([
    db
      .select({ id: journals.id })
      .from(journals)
      .where(and(eq(journals.studentId, studentId), eq(journals.entryDate, today)))
      .limit(1),
    db
      .select({ message: reminders.message })
      .from(reminders)
      .where(eq(reminders.active, true))
      .orderBy(desc(reminders.createdAt))
      .limit(1),
  ]);
  return {
    hasJournalToday: todayEntries.length > 0,
    reminder: activeReminders[0]?.message ?? null,
  };
}

export async function getActiveReminders() {
  const db = getDb();
  return db
    .select()
    .from(reminders)
    .where(eq(reminders.active, true))
    .orderBy(desc(reminders.createdAt))
    .limit(3);
}

export async function getInterviewSlotsWithGroups() {
  const db = getDb();
  return db
    .select({
      id: interviewSlots.id,
      label: interviewSlots.label,
      date: interviewSlots.date,
      groupId: interviewSlots.groupId,
      groupName: groups.name,
    })
    .from(interviewSlots)
    .leftJoin(groups, eq(groups.id, interviewSlots.groupId))
    .orderBy(asc(interviewSlots.label));
}

export async function groupHasProjectData(groupId: number): Promise<boolean> {
  const client = getSql();
  const rows = await client<{ total: number }[]>`
    SELECT (
      (SELECT count(*) FROM planning_sheets WHERE group_id = ${groupId}) +
      (SELECT count(*) FROM interviews WHERE group_id = ${groupId}) +
      (SELECT count(*) FROM journals WHERE group_id = ${groupId}) +
      (SELECT count(*) FROM final_products WHERE group_id = ${groupId})
    )::int AS total`;
  return (rows[0]?.total ?? 0) > 0;
}

export async function getClassRosterRows() {
  const db = getDb();
  return db.select().from(classRoster).orderBy(asc(classRoster.name));
}

export async function findStudentByName(name: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(students)
    .where(sql`lower(${students.name}) = lower(${name})`)
    .limit(1);
  return rows[0] ?? null;
}

