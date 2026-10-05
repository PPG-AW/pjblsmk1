import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { getQuizStats, groupHasProjectData } from "@/db/queries";
import { groupMembers, groups, students } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import { badRequest, conflict, readJson, route } from "@/lib/http";
import { generatePin } from "@/lib/pin";
import { getSettings, quizScoreFor } from "@/lib/settings";
import { asArray, asBoolean, asString } from "@/lib/validation";

type GroupPayload = { name: string; studentIds: number[] };

/**
 * POST /api/teacher/groups/apply
 * Terapkan saran pembagian kelompok heterogen (pratinjau -> terapkan).
 * Diblokir bila kelompok lama sudah punya data proyek, kecuali "tetap terapkan".
 */
export const POST = route(async (request) => {
  await requireTeacher();
  const body = await readJson(request);
  const force = asBoolean(body.force ?? false, "Tetap terapkan");

  const payload = asArray<GroupPayload>(
    body.groups ?? [],
    "Susunan kelompok",
    { min: 1, max: 20, label: "Susunan kelompok" },
    (item, index) => {
      if (typeof item !== "object" || item === null) throw badRequest("Susunan kelompok tidak valid.");
      const record = item as Record<string, unknown>;
      const name = asString(record.name ?? `Kelompok ${index + 1}`, `Nama kelompok ${index + 1}`, {
        min: 2,
        max: 60,
      });
      const studentIds = asArray<number>(record.studentIds ?? [], "Anggota", { max: 10 }, (value) => {
        const id = Number(value);
        if (!Number.isInteger(id) || id <= 0) throw badRequest("Ada anggota yang tidak valid.");
        return id;
      });
      if (studentIds.length === 0) throw badRequest(`${name} belum memiliki anggota.`);
      return { name, studentIds };
    },
  );

  const allIds = payload.flatMap((group) => group.studentIds);
  if (new Set(allIds).size !== allIds.length) {
    throw badRequest("Ada siswa yang muncul di dua kelompok. Periksa kembali susunannya.");
  }

  const db = getDb();
  const [studentRows, existingMembers, settings, quizStats] = await Promise.all([
    db.select({ id: students.id, name: students.name }).from(students).where(inArray(students.id, allIds)),
    db
      .select({ studentId: groupMembers.studentId, groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(inArray(groupMembers.studentId, allIds)),
    getSettings(),
    getQuizStats(),
  ]);

  if (studentRows.length !== allIds.length) {
    throw badRequest("Ada siswa yang tidak ditemukan.");
  }

  // Peringatan bila kelompok lama sudah menyimpan data proyek.
  const affectedGroups = [...new Set(existingMembers.map((member) => member.groupId))];
  const blocked: string[] = [];
  if (affectedGroups.length > 0) {
    const checks = await Promise.all(
      affectedGroups.map(async (groupId) => ({ groupId, hasData: await groupHasProjectData(groupId) })),
    );
    const withData = checks.filter((check) => check.hasData).map((check) => check.groupId);
    if (withData.length > 0) {
      const rows = await db
        .select({ id: groups.id, name: groups.name })
        .from(groups)
        .where(inArray(groups.id, withData));
      blocked.push(...rows.map((row) => row.name));
    }
  }

  if (blocked.length > 0 && !force) {
    throw conflict(
      `Kelompok berikut sudah memiliki data proyek (perencanaan/wawancara/jurnal): ${blocked.join(", ")}. ` +
        "Memindahkan anggotanya bisa membuat data itu terpisah dari pemiliknya. Centang \"tetap terapkan\" bila guru yakin ingin melanjutkan.",
    );
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const group of payload) {
      const existing = await tx
        .select({ id: groups.id, pin: groups.pin })
        .from(groups)
        .where(inArray(groups.name, [group.name]))
        .limit(1);
      let groupId: number;

      if (existing[0]) {
        groupId = existing[0].id;
      } else {
        let pin = generatePin();
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const clash = await tx.select({ id: groups.id }).from(groups).where(inArray(groups.pin, [pin])).limit(1);
          if (clash.length === 0) break;
          pin = generatePin();
        }
        const inserted = await tx.insert(groups).values({ name: group.name, pin }).returning({ id: groups.id });
        groupId = inserted[0]!.id;
      }

      // Keluarkan anggota lama dari kelompok ini, lalu masukkan susunan baru.
      await tx.delete(groupMembers).where(inArray(groupMembers.groupId, [groupId]));
      for (const studentId of group.studentIds) {
        await tx
          .insert(groupMembers)
          .values({ groupId, studentId, joinedAt: now })
          .onConflictDoUpdate({ target: groupMembers.studentId, set: { groupId } });
      }
    }
  });

  const preview = payload.map((group) => {
    const scores = group.studentIds
      .map((id) => quizStats.get(id))
      .map((stats) => (stats ? quizScoreFor(settings.quizScoreMode, stats) : null));
    const filled = scores.filter((score): score is number => score !== null);
    return {
      name: group.name,
      memberCount: group.studentIds.length,
      averageScore: filled.length > 0 ? filled.reduce((sum, value) => sum + value, 0) / filled.length : null,
    };
  });

  return NextResponse.json({
    ok: true,
    applied: preview,
    forced: blocked.length > 0 && force,
    message:
      blocked.length > 0 && force
        ? "Kelompok diterapkan, walaupun ada kelompok lama yang sudah punya data proyek."
        : "Pembagian kelompok diterapkan.",
  });
});
