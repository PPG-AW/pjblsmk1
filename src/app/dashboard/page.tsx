import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  getActiveReminders,
  getFinalProduct,
  getInterview,
  getJournalEntries,
  getPlanningSheet,
  getProgressItems,
  getQuizHistory,
  getStudentReflection,
} from "@/db/queries";
import { inequalityAttempts } from "@/db/schema";
import JoinGroupForm from "@/components/JoinGroupForm";
import { getSessionContext } from "@/lib/auth";
import { formatWaktu } from "@/lib/format";
import { interviewReadiness } from "@/lib/model";
import { NO_FABRICATION_RULE, readinessMessage } from "@/lib/sptldv";
import { stageLabel } from "@/lib/settings";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Step = {
  label: string;
  href: string;
  done: boolean;
  detail?: string;
};

export default async function StudentDashboard() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");

  const { student, group } = session;
  const settings = await getSettings();

  const [progressItems, quizHistory, reminders, reflection] = await Promise.all([
    getProgressItems(student.id),
    getQuizHistory(student.id, 5),
    getActiveReminders(),
    getStudentReflection(student.id),
  ]);

  const db = getDb();
  const inequalityStats = await db
    .select({
      total: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where ${inequalityAttempts.correct})::int`,
    })
    .from(inequalityAttempts)
    .where(eq(inequalityAttempts.studentId, student.id));
  const inequalityTotal = inequalityStats[0]?.total ?? 0;
  const inequalityCorrect = (inequalityStats[0]?.correct ?? 0) > 0;

  const planning = group ? await getPlanningSheet(group.id) : null;
  const interview = group ? await getInterview(group.id) : null;
  const journalEntries = group ? await getJournalEntries(group.id) : [];
  const finalProduct = group ? await getFinalProduct(group.id) : null;

  const journalMine = journalEntries.filter((entry) => entry.studentId === student.id).length;
  const readiness = interview
    ? interviewReadiness({
        productA: interview.productA,
        productB: interview.productB,
        ingredients: interview.ingredients,
        priceA: interview.priceA,
        priceB: interview.priceB,
        costA: interview.costA,
        costB: interview.costB,
      })
    : null;

  const memahami: Step[] = [
    { label: "Cerita masalah & video", href: "/belajar/video", done: progressItems.has("video") },
    { label: "Modul tiga bagian", href: "/belajar/modul", done: progressItems.has("modul") },
    { label: "Lab Grafik (eksplorasi)", href: "/belajar/grafik", done: progressItems.has("grafik") },
    {
      label: "Kuis kesiapan",
      href: "/belajar/kuis",
      done: quizHistory.length > 0,
      detail:
        quizHistory.length > 0
          ? `Skor terakhir ${quizHistory[0]!.score}/${quizHistory[0]!.total} · ${quizHistory.length} percobaan`
          : "Belum dikerjakan — tidak ada batas kelulusan, skor dipakai guru untuk menyusun kelompok.",
    },
  ];

  const proyek: Step[] = [
    {
      label: "Project Planning Sheet",
      href: "/proyek/perencanaan",
      done: Boolean(planning && planning.status === "final"),
      detail: planning ? (planning.status === "final" ? "Sudah difinalkan kelompok" : "Masih draft") : "Belum diisi",
    },
    {
      label: "Form Wawancara (data D'Culinary)",
      href: "/proyek/wawancara",
      done: Boolean(readiness?.constraintReady && readiness?.objectiveReady),
      detail: interview
        ? `Data lengkap: ${interview.ingredients.filter((item) => item.status === "lengkap").length} item`
        : "Belum diisi",
    },
    {
      label: "Susun Pertidaksamaan",
      href: "/proyek/pertidaksamaan",
      done: inequalityCorrect,
      detail: `${inequalityTotal} percobaan${inequalityCorrect ? " · pernah tepat" : ""}`,
    },
    {
      label: "Lab Grafik (verifikasi)",
      href: "/proyek/grafik",
      done: progressItems.has("grafik_verifikasi"),
    },
    {
      label: "Jurnal harian",
      href: "/proyek/jurnal",
      done: journalMine > 0,
      detail: `${journalMine} entri milikmu`,
    },
  ];

  const akhir: Step[] = [
    {
      label: "Produk akhir (tautan + ringkasan)",
      href: "/akhir/produk",
      done: Boolean(finalProduct),
      detail: finalProduct ? finalProduct.title : "Belum dikumpulkan",
    },
    {
      label: "Refleksi pengalaman",
      href: "/akhir/refleksi",
      done: Boolean(reflection),
      detail: reflection ? `Diisi ${formatWaktu(reflection.updatedAt)}` : "Belum diisi",
    },
  ];

  const lastScore = quizHistory[0];

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
              {stageLabel(settings.currentStage)}
            </p>
            <h1 className="mt-1 font-display text-2xl text-cream-100">Halo, {student.name}</h1>
            <p className="muted mt-1">
              {group ? `Kelompok: ${group.name} · ${group.memberCount} anggota` : "Kamu belum bergabung di kelompok."}
            </p>
          </div>
          {lastScore && (
            <div className="card-tight text-center">
              <p className="font-mono text-xs tracking-wider text-cream-400 uppercase">Skor kuis terakhir</p>
              <p className="font-display text-3xl text-ember-300">
                {lastScore.score}
                <span className="text-base text-cream-400">/{lastScore.total}</span>
              </p>
              <p className="muted max-w-[16rem]">{readinessMessage(lastScore.score, lastScore.total)}</p>
            </div>
          )}
        </div>

        {!group && (
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="card-tight">
              <h2 className="section-title text-lg">Buka fase proyek: gabung kelompok</h2>
              <p className="muted mt-1">
                PIN dibagikan guru setelah kuis. Setelah bergabung, semua tahap proyek (perencanaan, wawancara,
                pertidaksamaan, grafik verifikasi, jurnal) dan tahap akhir terbuka.
              </p>
              <div className="mt-3">
                <JoinGroupForm />
              </div>
            </div>
            <div className="note">
              <p className="font-semibold">Akses terkunci di server</p>
              <p className="mt-1">
                Halaman dan API fase proyek hanya bisa dipakai anggota kelompok — bukan hanya disembunyikan di
                tampilan. Jadi gabung kelompok dulu sebelum mencoba membuka tautannya.
              </p>
            </div>
          </div>
        )}
      </section>

      {reminders.length > 0 && (
        <section className="card">
          <h2 className="section-title">Pengingat dari guru</h2>
          <ul className="mt-2 space-y-2">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="note">
                {reminder.message}
                <span className="muted"> · {formatWaktu(reminder.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {planning?.teacherNote && (
        <section className="card">
          <h2 className="section-title">Catatan guru pada rencana kelompok</h2>
          <p className="note mt-2">{planning.teacherNote}</p>
        </section>
      )}

      {readiness && readiness.issues.length > 0 && (
        <section className="card">
          <h2 className="section-title">Catatan kelengkapan data wawancara</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-ember-300">
            {readiness.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <StepColumn title="Fase Memahami" steps={memahami} locked={false} />
        <StepColumn title="Fase Proyek" steps={proyek} locked={!group} />
        <StepColumn title="Fase Akhir" steps={akhir} locked={!group} />
      </section>

      <section className="note-info">
        <p className="font-semibold text-cream-100">Aturan data proyek</p>
        <p className="mt-1">{NO_FABRICATION_RULE}</p>
      </section>
    </div>
  );
}

function StepColumn({ title, steps, locked }: { title: string; steps: Step[]; locked: boolean }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">{title}</h2>
        {locked ? <span className="chip chip-warn">terkunci</span> : null}
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.href} className="card-tight">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-cream-100">{step.label}</span>
              <span className={step.done ? "chip chip-ok" : "chip"}>{step.done ? "selesai" : "belum"}</span>
            </div>
            {step.detail && <p className="muted mt-1">{step.detail}</p>}
            {!locked && (
              <Link href={step.href} className="mt-2 inline-block text-sm font-medium">
                Buka →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
