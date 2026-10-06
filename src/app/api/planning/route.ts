import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getGroupStudents, getInterviewSlotsWithGroups, getPlanningSheet } from "@/db/queries";
import { interviewSlots, planningSheets } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth";
import { badRequest, conflict, readJson, route } from "@/lib/http";
import { DRIVING_QUESTION_PLACEHOLDER } from "@/lib/planning";
import {
  FINAL_PRODUCT_TYPES,
  GROUP_ROLES,
  MINIMAL_DATA_CHECKLIST,
  PRODUCT_PLACES,
} from "@/lib/sptldv";
import type { RoleAssignment, ScheduleRow } from "@/lib/types";
import { asArray, asBoolean, asString, asStringArray, oneOf, optionalNumber } from "@/lib/validation";

function defaultSheet(groupId: number, members: { id: number }[]): {
  question: string;
  productA: string;
  productB: string;
  roles: RoleAssignment[];
  dataSources: string;
  interviewQuestions: string[];
  schedule: ScheduleRow[];
  finalProductType: string;
  ethicsAck: boolean;
  status: string;
  teacherNote: string | null;
  updatedBy: number | null;
  updatedAt: Date | null;
  exists: boolean;
} {
  void groupId;
  return {
    question: DRIVING_QUESTION_PLACEHOLDER,
    productA: "",
    productB: "",
    roles: members.map((member) => ({ studentId: member.id, roles: [] })),
    dataSources: "",
    interviewQuestions: [],
    schedule: [],
    finalProductType: "",
    ethicsAck: false,
    status: "draft",
    teacherNote: null,
    updatedBy: null,
    updatedAt: null,
    exists: false,
  };
}

/** GET /api/planning, lembar perencanaan kelompok + data pendukung. */
export const GET = route(async () => {
  const context = await requireGroupMember();
  const groupId = context.group.id;

  const [members, sheet, slots] = await Promise.all([
    getGroupStudents(groupId),
    getPlanningSheet(groupId),
    getInterviewSlotsWithGroups(),
  ]);

  const data = sheet
    ? {
        question: sheet.question,
        productA: sheet.productA,
        productB: sheet.productB,
        roles: sheet.roles,
        dataSources: sheet.dataSources,
        interviewQuestions: sheet.interviewQuestions,
        schedule: sheet.schedule,
        finalProductType: sheet.finalProductType,
        ethicsAck: sheet.ethicsAck,
        status: sheet.status,
        teacherNote: sheet.teacherNote,
        updatedBy: sheet.updatedBy,
        updatedAt: sheet.updatedAt,
        exists: true,
      }
    : defaultSheet(groupId, members);

  return NextResponse.json({
    group: { id: groupId, name: context.group.name },
    members,
    sheet: data,
    slots: slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      date: slot.date,
      groupId: slot.groupId,
      groupName: slot.groupName,
    })),
    roles: GROUP_ROLES,
    finalProductTypes: FINAL_PRODUCT_TYPES,
    places: PRODUCT_PLACES,
    checklist: MINIMAL_DATA_CHECKLIST,
  });
});

/** PUT /api/planning, simpan lembar perencanaan (semua anggota boleh menyunting). */
export const PUT = route(async (request) => {
  const context = await requireGroupMember();
  const groupId = context.group.id;
  const body = await readJson(request);
  const members = await getGroupStudents(groupId);
  const memberIds = new Set(members.map((member) => member.id));

  const question = asString(body.question ?? DRIVING_QUESTION_PLACEHOLDER, "Pertanyaan proyek", {
    min: 10,
    max: 800,
  });
  const productA = asString(body.productA, "Produk A", { max: 80, required: false });
  const productB = asString(body.productB, "Produk B", { max: 80, required: false });

  const roles = asArray<RoleAssignment>(
    body.roles ?? [],
    "Pembagian peran",
    { max: 20, label: "Pembagian peran" },
    (item) => {
      if (typeof item !== "object" || item === null) throw badRequest("Data peran tidak valid.");
      const record = item as Record<string, unknown>;
      const studentId = Number(record.studentId);
      if (!Number.isInteger(studentId) || !memberIds.has(studentId)) {
        throw badRequest("Ada peran yang ditujukan untuk siswa di luar kelompok ini.");
      }
      const roleList = asStringArray(record.roles ?? [], "Peran", { max: 10, label: "Peran" });
      for (const role of roleList) {
        if (!GROUP_ROLES.includes(role)) {
          throw badRequest(`Peran "${role}" tidak dikenali.`);
        }
      }
      return { studentId, roles: Array.from(new Set(roleList)) };
    },
  );

  const dataSources = asString(body.dataSources, "Sumber & instrumen data", { max: 1000, required: false });
  const interviewQuestions = asStringArray(body.interviewQuestions ?? [], "Daftar pertanyaan wawancara", {
    max: 25,
    label: "Pertanyaan wawancara",
  });
  const schedule = asArray<ScheduleRow>(
    body.schedule ?? [],
    "Jadwal proyek",
    { max: 20, label: "Jadwal proyek" },
    (item, index) => {
      if (typeof item !== "object" || item === null) throw badRequest("Baris jadwal tidak valid.");
      const record = item as Record<string, unknown>;
      return {
        activity: asString(record.activity, `Kegiatan baris ${index + 1}`, { max: 200, required: false }),
        place: oneOf(record.place ?? "Kelas", `Tempat baris ${index + 1}`, PRODUCT_PLACES, "Tempat"),
        date: asString(record.date ?? "", `Tanggal baris ${index + 1}`, { max: 40, required: false }),
        person: asString(record.person, `Penanggung jawab baris ${index + 1}`, { max: 120, required: false }),
      };
    },
  ).filter((row) => row.activity.length > 0);

  const finalProductType = asString(body.finalProductType, "Bentuk produk akhir", {
    max: 40,
    required: false,
  });
  if (
    finalProductType &&
    !FINAL_PRODUCT_TYPES.some((option: { value: string; label: string }) => option.value === finalProductType)
  ) {
    throw badRequest("Bentuk produk akhir tidak dikenali.");
  }

  const ethicsAck = asBoolean(body.ethicsAck ?? false, "Persetujuan etika wawancara");
  const status = oneOf(body.status ?? "draft", "Status", ["draft", "final"] as const, "Status lembar");
  const slotId = optionalNumber(body.slotId, "Slot wawancara", { min: 1, integer: true, required: false });

  // Validasi bila kelompok menandai lembar sebagai final.
  if (status === "final") {
    const problems: string[] = [];
    if (!productA || !productB) problems.push("nama dua produk yang dianalisis");
    if (interviewQuestions.length === 0) problems.push("minimal satu pertanyaan wawancara");
    if (!dataSources) problems.push("sumber & instrumen pengumpulan data");
    if (!finalProductType) problems.push("bentuk produk akhir");
    if (!ethicsAck) problems.push("centang pernyataan etika wawancara");
    const missingRoles = members.filter(
      (member) => !roles.some((assignment) => assignment.studentId === member.id && assignment.roles.length > 0),
    );
    if (missingRoles.length > 0) {
      problems.push(
        `peran untuk: ${missingRoles.map((member) => member.name).join(", ")}`,
      );
    }
    if (problems.length > 0) {
      throw badRequest(`Lembar belum bisa difinalkan. Lengkapi dulu: ${problems.join("; ")}.`);
    }
  }

  const db = getDb();

  // Pemilihan slot wawancara (satu slot hanya untuk satu kelompok; aman dari race
  // karena interview_slots.group_id unik).
  if (slotId !== null) {
    await db
      .update(interviewSlots)
      .set({ groupId: null })
      .where(sql`${interviewSlots.groupId} = ${groupId}`);
    const updated = await db
      .update(interviewSlots)
      .set({ groupId })
      .where(sql`${interviewSlots.id} = ${slotId} AND (${interviewSlots.groupId} IS NULL OR ${interviewSlots.groupId} = ${groupId})`)
      .returning({ id: interviewSlots.id });
    if (updated.length === 0) {
      throw conflict("Slot wawancara itu sudah dipilih kelompok lain. Silakan pilih slot lain.");
    }
  }

  const values = {
    groupId,
    question,
    productA,
    productB,
    roles,
    dataSources,
    interviewQuestions,
    schedule,
    finalProductType,
    ethicsAck,
    status,
    updatedBy: context.student.id,
    updatedAt: new Date(),
  };

  await db
    .insert(planningSheets)
    .values(values)
    .onConflictDoUpdate({ target: planningSheets.groupId, set: values });

  return NextResponse.json({ ok: true, status, message: "Lembar perencanaan tersimpan." });
});
