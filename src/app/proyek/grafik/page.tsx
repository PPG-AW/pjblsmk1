import Link from "next/link";
import { redirect } from "next/navigation";
import LabGrafik from "@/components/LabGrafik";
import { getInterview, getProgressItems } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import { formatAngka, formatRupiah } from "@/lib/format";
import { profitPerUnit } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function VerificationGraphPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");
  if (!session.group) redirect("/dashboard");

  const [interview, progressItems] = await Promise.all([
    getInterview(session.group.id),
    getProgressItems(session.student.id),
  ]);

  const rows: { label: string; value: string }[] = [];
  if (interview) {
    rows.push({ label: "Produk A", value: interview.productA || "-" });
    rows.push({ label: "Produk B", value: interview.productB || "-" });
    for (const ingredient of interview.ingredients) {
      rows.push({
        label: `${ingredient.name} (${ingredient.unit})`,
        value: `A: ${formatAngka(ingredient.perA)} · B: ${formatAngka(ingredient.perB)} · stok: ${formatAngka(ingredient.total)}`,
      });
    }
    rows.push({ label: "Harga jual A / B", value: `${formatRupiah(interview.priceA)} / ${formatRupiah(interview.priceB)}` });
    rows.push({ label: "Biaya produksi A / B", value: `${formatRupiah(interview.costA)} / ${formatRupiah(interview.costB)}` });
    const data = {
      productA: interview.productA,
      productB: interview.productB,
      ingredients: interview.ingredients,
      priceA: interview.priceA,
      priceB: interview.priceB,
      costA: interview.costA,
      costB: interview.costB,
    };
    rows.push({ label: "Keuntungan/unit A / B", value: `${formatRupiah(profitPerUnit(data, "A"))} / ${formatRupiah(profitPerUnit(data, "B"))}` });
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
          Fase Proyek · 8 · Monitoring &amp; pengujian
        </p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Lab Grafik — verifikasi</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Ketik sistem pertidaksamaan model kelompokmu sendiri untuk memeriksa gambarnya. Kolom tidak diisi otomatis:
          yang menulis tetap kamu. Cocokkan DHP yang muncul dengan hasil gambar manual di LKPD — titik pojok dan
          nilai optimum tetap dihitung manual.
        </p>
        <p className="note mt-3">
          Belum menyusun pertidaksamaan? Mulai dari{" "}
          <Link href="/proyek/pertidaksamaan">tahap Susun Pertidaksamaan</Link> agar kamu dapat umpan balik.
        </p>
      </section>

      <LabGrafik
        mode="verifikasi"
        checklist={{ title: "Data mentah hasil wawancara kelompok (tanpa kunci jawaban model).", rows }}
        doneItem="grafik_verifikasi"
        alreadyDone={progressItems.has("grafik_verifikasi")}
      />
    </div>
  );
}
