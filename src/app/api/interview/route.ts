import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getInterview, getPlanningSheet } from "@/db/queries";
import { interviews } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth";
import { badRequest, readJson, route } from "@/lib/http";
import { interviewReadiness, objectiveExpression, profitPerUnit, type InterviewData } from "@/lib/model";
import { MINIMAL_DATA_CHECKLIST } from "@/lib/sptldv";
import type { DataStatus, Ingredient, MoneyData } from "@/lib/types";
import { DATA_STATUS_ORDER } from "@/lib/types";
import { asArray, asNumber, asString } from "@/lib/validation";

const MAX_INGREDIENTS = 6;
const MIN_INGREDIENTS = 2;

function parseStatus(value: unknown, label: string): DataStatus {
  const text = asString(value ?? "lengkap", label, { max: 20, label });
  if (!(DATA_STATUS_ORDER as readonly string[]).includes(text)) {
    throw badRequest(`${label} harus salah satu dari: Lengkap, Belum jelas, Belum ada.`);
  }
  return text as DataStatus;
}

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

/** GET /api/interview, data wawancara kelompok + status kelengkapan. */
export const GET = route(async () => {
  const context = await requireGroupMember();
  const groupId = context.group.id;
  const [interview, planning] = await Promise.all([getInterview(groupId), getPlanningSheet(groupId)]);

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

  return NextResponse.json({
    interview: interview
      ? {
          productA: interview.productA,
          productB: interview.productB,
          ingredients: interview.ingredients,
          priceA: interview.priceA,
          priceB: interview.priceB,
          costA: interview.costA,
          costB: interview.costB,
          moneyStatus: interview.moneyStatus,
          limitations: interview.limitations,
          updatedAt: interview.updatedAt,
        }
      : null,
    suggestedProducts: planning ? { productA: planning.productA, productB: planning.productB } : null,
    checklist: MINIMAL_DATA_CHECKLIST,
    readiness,
    objective: data ? objectiveExpression(data) : null,
    profit: data ? { a: profitPerUnit(data, "A"), b: profitPerUnit(data, "B") } : null,
  });
});

/** PUT /api/interview, simpan data hasil wawancara. */
export const PUT = route(async (request) => {
  const context = await requireGroupMember();
  const groupId = context.group.id;
  const body = await readJson(request);
  const planning = await getPlanningSheet(groupId);

  const productA = asString(body.productA ?? planning?.productA, "Nama produk A", { max: 80 });
  const productB = asString(body.productB ?? planning?.productB, "Nama produk B", { max: 80 });

  const ingredients = asArray<Ingredient>(
    body.ingredients ?? [],
    "Bahan pokok",
    { min: MIN_INGREDIENTS, max: MAX_INGREDIENTS, label: "Bahan pokok" },
    (item, index) => {
      if (typeof item !== "object" || item === null) throw badRequest("Data bahan tidak valid.");
      const record = item as Record<string, unknown>;
      const label = `Bahan baris ${index + 1}`;
      const status = parseStatus(record.status, `Status ${label.toLowerCase()}`);
      const followUp = asString(record.followUp ?? "", `Tindak lanjut ${label.toLowerCase()}`, {
        max: 400,
        required: false,
      });
      if (status !== "lengkap" && followUp.trim().length < 3) {
        throw badRequest(
          `${label}: karena statusnya "${status === "belum_ada" ? "Belum ada" : "Belum jelas"}", isi kolom tindak lanjut (data apa, kepada siapa, kapan).`,
        );
      }
      return {
        name: asString(record.name, `Nama ${label.toLowerCase()}`, { max: 80 }),
        unit: asString(record.unit, `Satuan ${label.toLowerCase()}`, { max: 20 }),
        perA: asNumber(record.perA, `Kebutuhan per 1 pcs produk A (${label})`, { min: 0, max: 1e9 }),
        perB: asNumber(record.perB, `Kebutuhan per 1 pcs produk B (${label})`, { min: 0, max: 1e9 }),
        total: asNumber(record.total, `Stok/total (${label})`, { min: 0, max: 1e9 }),
        status,
        followUp,
      };
    },
  );

  const priceA = asNumber(body.priceA, "Harga jual satuan produk A", { min: 0, max: 1e9, integer: true });
  const priceB = asNumber(body.priceB, "Harga jual satuan produk B", { min: 0, max: 1e9, integer: true });
  const costA = asNumber(body.costA, "Biaya produksi per 1 pcs produk A", { min: 0, max: 1e9, integer: true });
  const costB = asNumber(body.costB, "Biaya produksi per 1 pcs produk B", { min: 0, max: 1e9, integer: true });

  const moneyStatus: MoneyData = {
    priceA: parseStatus((body.moneyStatus as Record<string, unknown> | undefined)?.priceA, "Status harga jual A"),
    priceB: parseStatus((body.moneyStatus as Record<string, unknown> | undefined)?.priceB, "Status harga jual B"),
    costA: parseStatus((body.moneyStatus as Record<string, unknown> | undefined)?.costA, "Status biaya A"),
    costB: parseStatus((body.moneyStatus as Record<string, unknown> | undefined)?.costB, "Status biaya B"),
    followUp: asString((body.moneyStatus as Record<string, unknown> | undefined)?.followUp ?? "", "Tindak lanjut harga/biaya", {
      max: 500,
      required: false,
    }),
  };

  const limitations = asString(body.limitations ?? "", "Catatan keterbatasan data/asumsi", {
    max: 1500,
    required: false,
  });

  // Peringatan (bukan galat): satuan campuran & harga ≤ biaya.
  const warnings: string[] = [];
  const unitByName = new Map<string, Set<string>>();
  for (const ingredient of ingredients) {
    const key = ingredient.name.trim().toLowerCase();
    const units = unitByName.get(key) ?? new Set<string>();
    units.add(normalizeUnit(ingredient.unit));
    unitByName.set(key, units);
  }
  for (const [name, units] of unitByName) {
    if (units.size > 1) {
      warnings.push(
        `Bahan "${name}" memakai satuan campuran (${[...units].join(", ")}). Samakan satuannya (konversi dulu) sebelum menyusun pertidaksamaan.`,
      );
    }
  }
  if (priceA <= costA) {
    warnings.push("Harga jual produk A tidak lebih besar dari biaya produksinya, sehingga keuntungan per pcs tidak positif.");
  }
  if (priceB <= costB) {
    warnings.push("Harga jual produk B tidak lebih besar dari biaya produksinya, sehingga keuntungan per pcs tidak positif.");
  }

  const db = getDb();
  const values = {
    groupId,
    productA,
    productB,
    ingredients,
    priceA,
    priceB,
    costA,
    costB,
    moneyStatus,
    limitations,
    updatedBy: context.student.id,
    updatedAt: new Date(),
  };

  await db.insert(interviews).values(values).onConflictDoUpdate({ target: interviews.groupId, set: values });

  const readiness = interviewReadiness({ productA, productB, ingredients, priceA, priceB, costA, costB, moneyStatus });

  return NextResponse.json({
    ok: true,
    warnings,
    readiness,
    objective: objectiveExpression({ productA, productB, ingredients, priceA, priceB, costA, costB, moneyStatus }),
    message: readiness.constraintReady && readiness.objectiveReady
      ? "Data tersimpan. Kamu bisa lanjut menyusun pertidaksamaan."
      : "Data tersimpan, tetapi masih ada catatan yang perlu dilengkapi.",
  });
});
