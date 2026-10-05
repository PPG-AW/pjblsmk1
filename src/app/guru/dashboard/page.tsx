import { redirect } from "next/navigation";
import TeacherDashboard from "@/components/TeacherDashboard";
import { getTeacherOverview } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const session = await getSessionContext();
  if (!session) redirect("/guru");
  if (session.kind !== "teacher") redirect("/dashboard");

  const overview = await getTeacherOverview();

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">Dashboard guru</p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Pemantauan proyek D&apos;Culinary</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Semua data siswa tersimpan di server (Postgres/Neon), sehingga dashboard ini menampilkan siswa dari
          perangkat mana pun. Data agregat dihitung dengan query SQL, bukan dengan menarik seluruh tabel.
        </p>
      </section>

      <TeacherDashboard initialOverview={overview} />
    </div>
  );
}
