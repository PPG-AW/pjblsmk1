import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getFinalProduct } from "@/db/queries";
import { finalProducts } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth";
import { badRequest, readJson, route } from "@/lib/http";
import { DRIVE_SHARING_REMINDER, normalizeExternalLink } from "@/lib/links";
import { FINAL_PRODUCT_TYPES } from "@/lib/sptldv";
import { asString } from "@/lib/validation";

/** Jenis produk akhir wajib salah satu dari daftar RPP. */
function validateType(value: unknown): string {
  const text = asString(value, "Jenis produk akhir", { max: 40 });
  if (!FINAL_PRODUCT_TYPES.some((type) => type.value === text)) {
    throw badRequest(
      `Jenis produk akhir harus salah satu dari: ${FINAL_PRODUCT_TYPES.map((type) => type.label).join(", ")}.`,
    );
  }
  return text;
}

/** GET /api/portfolio, produk akhir kelompok (satu pengumpulan per kelompok). */
export const GET = route(async () => {
  const context = await requireGroupMember();
  const product = await getFinalProduct(context.group.id);
  return NextResponse.json({
    product: product
      ? {
          type: product.type,
          title: product.title,
          link: product.link,
          summary: product.summary,
          source: product.source,
          modelText: product.modelText,
          optimumText: product.optimumText,
          updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt,
        }
      : null,
    types: FINAL_PRODUCT_TYPES,
    reminder: DRIVE_SHARING_REMINDER,
  });
});

/** PUT /api/portfolio, simpan/ubah produk akhir (tautan Google Drive, tanpa unggah file). */
export const PUT = route(async (request) => {
  const context = await requireGroupMember();
  const body = await readJson(request);

  const type = validateType(body.type);
  const title = asString(body.title, "Judul produk akhir", { min: 5, max: 200 });
  const link = normalizeExternalLink(body.link);
  if (!link) {
    throw badRequest(
      "Tautan Google Drive wajib diisi. Unggah berkas produk akhir kelompokmu ke Google Drive, lalu tempel tautannya di sini.",
    );
  }
  const summary = asString(body.summary, "Ringkasan hasil", { min: 50, max: 3000 });
  const source = asString(body.source, "Sumber data", { min: 5, max: 1000 });
  const modelText = asString(body.modelText, "Model matematika", { min: 5, max: 1000 });
  const optimumText = asString(body.optimumText, "Nilai optimum dan rekomendasi produksi", {
    min: 5,
    max: 1000,
  });

  const db = getDb();
  const values = {
    groupId: context.group.id,
    type,
    title,
    link,
    summary,
    source,
    modelText,
    optimumText,
    updatedBy: context.student.id,
    updatedAt: new Date(),
  };

  await db.insert(finalProducts).values(values).onConflictDoUpdate({ target: finalProducts.groupId, set: values });

  return NextResponse.json({
    ok: true,
    message: "Produk akhir tersimpan.",
    reminder: DRIVE_SHARING_REMINDER,
  });
});
