import Link from "next/link";
import { redirect } from "next/navigation";
import PlanningSheetForm, { type PlanningSheetData } from "@/components/PlanningSheetForm";
import { getGroupStudents, getInterviewSlotsWithGroups, getPlanningSheet } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import { DRIVING_QUESTION_PLACEHOLDER } from "@/lib/planning";
import { FINAL_PRODUCT_TYPES, GROUP_ROLES, MATERIAL_OPTIONS, MINIMAL_DATA_CHECKLIST, PRODUCT_PLACES, NO_FABRICATION_RULE } from "@/lib/sptldv";

export const dynamic = "force-dynamic";

export default async function PlanningSheetPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");
  if (!session.group) redirect("/dashboard");

  const groupId = session.group.id;
  const [members, sheet, slots] = await Promise.all([
    getGroupStudents(groupId),
    getPlanningSheet(groupId),
    getInterviewSlotsWithGroups(),
  ]);

  const data: PlanningSheetData = sheet
    ? {
        question: sheet.question,
        productA: sheet.productA,
        productB: sheet.productB,
        roles: sheet.roles,
        dataSources: sheet.dataSources,
        interviewQuestions: sheet.interviewQuestions,
        schedule: sheet.schedule,
        finalProductType: sheet.finalProductType,
        guideLink: sheet.guideLink,
        ethicsAck: sheet.ethicsAck,
        status: sheet.status,
        updatedAt: sheet.updatedAt instanceof Date ? sheet.updatedAt.toISOString() : String(sheet.updatedAt),
        updatedByName: null,
        exists: true,
      }
    : {
        question: DRIVING_QUESTION_PLACEHOLDER,
        productA: "",
        productB: "",
        roles: members.map((member) => ({ studentId: member.id, roles: [] })),
        dataSources: "",
        interviewQuestions: [],
        schedule: [],
        finalProductType: "",
        guideLink: null,
        ethicsAck: false,
        status: "draft",
        updatedAt: null,
        updatedByName: null,
        exists: false,
      };

  const mySlot = slots.find((slot) => slot.groupId === groupId);

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
          Fase Proyek · 5 · Desain perencanaan &amp; jadwal
        </p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Project Planning Sheet</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">
          Satu lembar per kelompok: {session.group.name}. Semua anggota bisa menyunting. Perubahan terakhir
          tercatat lengkap dengan nama pengubah dan waktunya.
        </p>
        {sheet?.teacherNote && (
          <p className="note mt-3">
            <strong>Catatan guru: </strong>
            {sheet.teacherNote}
          </p>
        )}
        <p className="note-info mt-3">{NO_FABRICATION_RULE}</p>
        <p className="muted mt-3">
          Belum punya data? Lanjut ke <Link href="/proyek/wawancara">Form Wawancara</Link> setelah rencana ini
          tersimpan, dan lihat <Link href="/proyek/jurnal">jurnal harian</Link> untuk mencatat kontribusi.
        </p>
      </section>

      <PlanningSheetForm
        members={members}
        sheet={data}
        slots={slots}
        roles={GROUP_ROLES}
        finalProductTypes={FINAL_PRODUCT_TYPES}
        places={PRODUCT_PLACES}
        checklist={MINIMAL_DATA_CHECKLIST}
        materialOptions={MATERIAL_OPTIONS}
        selectedSlotId={mySlot?.id ?? null}
        myId={session.student.id}
      />
    </div>
  );
}
