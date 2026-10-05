import { redirect } from "next/navigation";
import TeacherLoginForm from "@/components/TeacherLoginForm";
import { getSessionContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeacherLoginPage() {
  const session = await getSessionContext().catch(() => null);
  if (session?.kind === "teacher") redirect("/guru/dashboard");

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card">
        <h1 className="section-title text-2xl">Masuk sebagai guru</h1>
        <p className="muted mt-1">
          Halaman ini untuk memantau progres siswa, membentuk kelompok heterogen, mengirim pengingat, dan
          mengekspor data.
        </p>
        <div className="mt-4">
          <TeacherLoginForm />
        </div>
      </div>
      <div className="note-info">
        Kode guru tidak ditampilkan di antarmuka mana pun. Bila kode hilang, guru/administrator dapat
        menggantinya lewat Environment Variables <span className="code-chip">TEACHER_CODE</span> di Vercel, lalu
        deploy ulang.
      </div>
    </div>
  );
}
