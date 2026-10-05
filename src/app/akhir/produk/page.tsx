import { redirect } from "next/navigation";
import FinalProductForm, { type FinalProductData } from "@/components/FinalProductForm";
import { getFinalProduct } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import { DRIVE_SHARING_REMINDER } from "@/lib/links";
import { FINAL_PRODUCT_TYPES } from "@/lib/sptldv";

export const dynamic = "force-dynamic";

export default async function FinalProductPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");
  if (!session.group) redirect("/dashboard");

  const product = await getFinalProduct(session.group.id);
  const data: FinalProductData | null = product
    ? {
        type: product.type,
        title: product.title,
        link: product.link,
        summary: product.summary,
        source: product.source,
        modelText: product.modelText,
        optimumText: product.optimumText,
        updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : String(product.updatedAt),
      }
    : null;

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
          Fase Akhir · 10 · Menguji &amp; mengomunikasikan hasil
        </p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Produk akhir kelompok</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Kumpulkan tautan produk akhir kelompokmu (Google Drive) beserta ringkasan hasil. Tidak ada lagi unggahan
          berkas besar ke server — cukup tautan, sehingga tidak ada file besar tersimpan di database.
        </p>
        <p className="note mt-3">{DRIVE_SHARING_REMINDER}</p>
      </section>

      <FinalProductForm product={data} types={FINAL_PRODUCT_TYPES} reminder={DRIVE_SHARING_REMINDER} />

      <section className="note-info">
        Setelah produk akhir tersimpan, lanjut ke <strong>Refleksi</strong> (halaman terakhir) untuk mencatat
        keberhasilan, tantangan, solusi, pengalaman bermakna, dan rencana perbaikan kelompok.
      </section>
    </div>
  );
}
