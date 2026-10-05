import { redirect } from "next/navigation";
import ReflectionForm from "@/components/ReflectionForm";
import { getStudentReflection } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReflectionPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");
  if (!session.group) redirect("/dashboard");

  const reflection = await getStudentReflection(session.student.id);

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
          Fase Akhir · 11 · Evaluasi pengalaman
        </p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Refleksi pengalaman</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Tuliskan refleksimu sendiri (bukan mewakili kelompok) tentang keberhasilan, tantangan, solusi, pengalaman
          bermakna, dan rencana perbaikan.
        </p>
      </section>

      <ReflectionForm
        initialAnswers={reflection ? reflection.answers : null}
        initialRating={reflection?.rating ?? 3}
        updatedAt={
          reflection?.updatedAt
            ? reflection.updatedAt instanceof Date
              ? reflection.updatedAt.toISOString()
              : String(reflection.updatedAt)
            : null
        }
      />
    </div>
  );
}
