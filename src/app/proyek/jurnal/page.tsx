import { redirect } from "next/navigation";
import JournalForm, { type JournalEntry } from "@/components/JournalForm";
import { getJournalEntries } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import { todayJakarta } from "@/lib/date";
import { JOURNAL_ACTIVITY_TYPES } from "@/lib/sptldv";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");
  if (!session.group) redirect("/dashboard");

  const rows = await getJournalEntries(session.group.id);
  const entries: JournalEntry[] = rows.map((entry) => ({
    id: entry.id,
    studentId: entry.studentId,
    studentName: entry.studentName,
    entryDate: entry.entryDate,
    activityType: entry.activityType,
    activity: entry.activity,
    obstacle: entry.obstacle,
    contribution: entry.contribution,
    isMine: entry.studentId === session.student.id,
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : String(entry.updatedAt),
  }));

  const mine = entries.filter((entry) => entry.isMine).length;

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
          Fase Proyek · 9 · Monitoring kontribusi
        </p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Jurnal harian</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Catat kegiatan berdasarkan tanggal dan label kegiatan (Pertemuan 1, wawancara/observasi, Pertemuan 2, dan
          seterusnya). Kolom <strong>kontribusi saya</strong> wajib diisi agar guru dapat melihat peran tiap anggota.
        </p>
        <p className="muted mt-2">
          Kamu sudah menulis {mine} entri. Entri anggota lain tampil sebagai bacaan agar kontribusi kelompok terlihat
          bersama.
        </p>
      </section>

      <JournalForm entries={entries} activityTypes={JOURNAL_ACTIVITY_TYPES} today={todayJakarta()} />
    </div>
  );
}
