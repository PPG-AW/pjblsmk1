import Link from "next/link";
import { redirect } from "next/navigation";
import InterviewForm from "@/components/InterviewForm";
import { getInterview, getPlanningSheet } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import { interviewReadiness, objectiveExpression, profitPerUnit } from "@/lib/model";
import { MINIMAL_DATA_CHECKLIST, NO_FABRICATION_RULE } from "@/lib/sptldv";

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");
  if (!session.group) redirect("/dashboard");

  const groupId = session.group.id;
  const [interview, planning] = await Promise.all([getInterview(groupId), getPlanningSheet(groupId)]);

  const data = interview
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

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">Fase Proyek · 6 · Monitoring data</p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Form Wawancara D&apos;Culinary</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Catat data hasil wawancara/observasi kelompokmu: minimal 2 bahan pokok, stok, harga jual satuan, dan biaya
          produksi per unit. Waktu produksi tidak lagi dicatat.
        </p>
        <p className="note mt-3">{NO_FABRICATION_RULE}</p>
      </section>

      {planning && (planning.productA || planning.productB) && (
        <section className="note-info">
          Produk dari planning sheet kalian: <strong>{planning.productA || "—"}</strong> dan{" "}
          <strong>{planning.productB || "—"}</strong>. Bila hasil wawancara menunjukkan produk lain, ubah di form di
          bawah sekaligus perbarui planning sheet.
        </section>
      )}

      <section className="card">
        <h2 className="section-title">Status kelengkapan untuk tahap berikutnya</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            Data kendala (bahan):{" "}
            {readiness.constraintReady ? <span className="chip chip-ok">siap</span> : <span className="chip chip-warn">belum siap</span>}
          </li>
          <li>
            Harga jual &amp; biaya produksi (fungsi tujuan):{" "}
            {readiness.objectiveReady ? <span className="chip chip-ok">siap</span> : <span className="chip chip-warn">belum siap</span>}
          </li>
          {data && (
            <li className="font-mono text-ember-300">
              {objectiveExpression(data) ?? "Fungsi tujuan belum bisa dihitung"} · untung per unit A:{" "}
              {profitPerUnit(data, "A") ?? "-"} · B: {profitPerUnit(data, "B") ?? "-"}
            </li>
          )}
        </ul>
        {readiness.issues.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-ember-300">
            {readiness.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <p className="muted mt-3">
          Tahap <Link href="/proyek/pertidaksamaan">Susun Pertidaksamaan</Link> terbuka setelah data kendala dan
          harga/biaya terisi.
        </p>
      </section>

      <InterviewForm
        productA={interview?.productA ?? planning?.productA ?? ""}
        productB={interview?.productB ?? planning?.productB ?? ""}
        ingredients={interview?.ingredients ?? []}
        priceA={interview?.priceA ?? null}
        priceB={interview?.priceB ?? null}
        costA={interview?.costA ?? null}
        costB={interview?.costB ?? null}
        moneyStatus={interview?.moneyStatus ?? null}
        photoLink={interview?.photoLink ?? null}
        limitations={interview?.limitations ?? ""}
        checklist={MINIMAL_DATA_CHECKLIST}
        hasConstraints={readiness.constraintReady}
        hasObjective={readiness.objectiveReady}
      />
    </div>
  );
}
