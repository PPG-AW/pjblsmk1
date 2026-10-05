"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export type PlanningMember = { id: number; name: string };
export type PlanningSlot = { id: number; label: string; date: string; groupId: number | null; groupName: string | null };

export type PlanningSheetData = {
  question: string;
  productA: string;
  productB: string;
  roles: { studentId: number; roles: string[] }[];
  dataSources: string;
  interviewQuestions: string[];
  schedule: { activity: string; place: string; date: string; person: string }[];
  finalProductType: string;
  ethicsAck: boolean;
  status: string;
  updatedAt: string | null;
  updatedByName: string | null;
  exists: boolean;
};

type Props = {
  members: PlanningMember[];
  sheet: PlanningSheetData;
  slots: PlanningSlot[];
  roles: string[];
  finalProductTypes: { value: string; label: string }[];
  places: string[];
  checklist: string[];
  materialOptions: string[];
  selectedSlotId: number | null;
  myId: number;
};

export default function PlanningSheetForm({
  members,
  sheet,
  slots,
  roles,
  finalProductTypes,
  places,
  checklist,
  materialOptions,
  selectedSlotId,
  myId,
}: Props) {
  const router = useRouter();

  const [question, setQuestion] = useState(sheet.question);
  const [productA, setProductA] = useState(sheet.productA);
  const [productB, setProductB] = useState(sheet.productB);
  const [rolesByMember, setRolesByMember] = useState<Record<number, string[]>>(() => {
    const initial: Record<number, string[]> = {};
    for (const member of members) {
      initial[member.id] = sheet.roles.find((assignment) => assignment.studentId === member.id)?.roles ?? [];
    }
    return initial;
  });
  const [dataSources, setDataSources] = useState(sheet.dataSources);
  const [questions, setQuestions] = useState<string[]>(
    sheet.interviewQuestions.length > 0 ? sheet.interviewQuestions : [""],
  );
  const [schedule, setSchedule] = useState(
    sheet.schedule.length > 0
      ? sheet.schedule
      : [{ activity: "Wawancara pengurus D'Culinary", place: places[1] ?? "D'Culinary", date: "", person: "" }],
  );
  const [finalProductType, setFinalProductType] = useState(sheet.finalProductType);
  const [ethicsAck, setEthicsAck] = useState(sheet.ethicsAck);
  const [slotId, setSlotId] = useState<string>(selectedSlotId ? String(selectedSlotId) : "");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleRole(memberId: number, role: string) {
    setRolesByMember((current) => {
      const list = current[memberId] ?? [];
      return {
        ...current,
        [memberId]: list.includes(role) ? list.filter((item) => item !== role) : [...list, role],
      };
    });
  }

  async function save(nextStatus: "draft" | "final") {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const payload = await apiFetch<{ message: string }>("/api/planning", {
        method: "PUT",
        body: {
          question,
          productA,
          productB,
          roles: members.map((member) => ({ studentId: member.id, roles: rolesByMember[member.id] ?? [] })),
          dataSources,
          interviewQuestions: questions.filter((item) => item.trim().length > 0),
          schedule: schedule.filter((row) => row.activity.trim().length > 0),
          finalProductType,
          ethicsAck,
          status: nextStatus,
          slotId: slotId === "" ? null : Number(slotId),
        },
      });
      setStatus(payload.message ?? "Tersimpan.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  const availableSlots = slots.filter((slot) => slot.groupId === null || slot.groupId === selectedSlotId || slot.groupId);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save("draft");
      }}
    >
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">1 · Pertanyaan proyek</h2>
          <span className={sheet.status === "final" ? "chip chip-ok" : "chip chip-warn"}>
            {sheet.status === "final" ? "final" : "draft"}
          </span>
        </div>
        <textarea
          className="field min-h-[90px]"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          minLength={10}
          required
        />
        <p className="muted">
          Pertanyaan utama dari guru sudah terisi otomatis. Kelompok boleh merumuskan ulang dengan bahasamu sendiri,
          asal maksudnya tetap sama.
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">2 · Produk yang dianalisis</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Produk A</label>
            <input
              className="field"
              list="material-options"
              value={productA}
              onChange={(event) => setProductA(event.target.value)}
              placeholder="contoh: tahu walik"
            />
          </div>
          <div>
            <label className="field-label">Produk B</label>
            <input
              className="field"
              list="material-options"
              value={productB}
              onChange={(event) => setProductB(event.target.value)}
              placeholder="contoh: risol"
            />
          </div>
        </div>
        <datalist id="material-options">
          {materialOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <p className="muted">
          Pilih dua produk yang memakai bahan pokok yang sama, misalnya dari daftar: {materialOptions.join(", ")}.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">3 · Pembagian peran anggota</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Anggota</th>
                {roles.map((role) => (
                  <th key={role}>{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    {member.name}
                    {member.id === myId && <span className="chip ms-2">saya</span>}
                  </td>
                  {roles.map((role) => (
                    <td key={role}>
                      <input
                        type="checkbox"
                        className="accent-ember-500"
                        checked={(rolesByMember[member.id] ?? []).includes(role)}
                        onChange={() => toggleRole(member.id, role)}
                        aria-label={`${role} untuk ${member.name}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          Satu anggota boleh memegang lebih dari satu peran, tetapi setiap anggota wajib punya minimal satu peran.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">4 · Sumber dan instrumen pengumpulan data</h2>
        <textarea
          className="field min-h-[80px]"
          value={dataSources}
          onChange={(event) => setDataSources(event.target.value)}
          placeholder="contoh: wawancara pengurus D'Culinary (instrumen: daftar pertanyaan di bawah), observasi proses produksi, foto struk belanja bahan"
        />
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">5 · Daftar pertanyaan wawancara</h2>
        <ul className="space-y-2">
          {questions.map((value, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="font-mono text-xs text-ember-400">{index + 1}.</span>
              <input
                className="field"
                value={value}
                onChange={(event) =>
                  setQuestions((current) => current.map((item, i) => (i === index ? event.target.value : item)))
                }
                placeholder="contoh: Berapa banyak tahu walik yang biasanya dibuat setiap hari?"
              />
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))}
              >
                hapus
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => setQuestions((current) => [...current, ""])}
          disabled={questions.length >= 20}
        >
          + tambah pertanyaan
        </button>
        <div className="note-info">
          <p className="font-semibold text-cream-100">Data minimal yang harus diperoleh</p>
          <ul className="mt-1 list-disc space-y-1 ps-5">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">6 · Jadwal proyek</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kegiatan</th>
                <th>Tempat</th>
                <th>Tanggal</th>
                <th>Penanggung jawab</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      className="field"
                      value={row.activity}
                      onChange={(event) =>
                        setSchedule((current) =>
                          current.map((item, i) => (i === index ? { ...item, activity: event.target.value } : item)),
                        )
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="field"
                      value={row.place}
                      onChange={(event) =>
                        setSchedule((current) =>
                          current.map((item, i) => (i === index ? { ...item, place: event.target.value } : item)),
                        )
                      }
                    >
                      {places.map((place) => (
                        <option key={place} value={place}>
                          {place}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      className="field"
                      value={row.date}
                      onChange={(event) =>
                        setSchedule((current) =>
                          current.map((item, i) => (i === index ? { ...item, date: event.target.value } : item)),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="field"
                      value={row.person}
                      onChange={(event) =>
                        setSchedule((current) =>
                          current.map((item, i) => (i === index ? { ...item, person: event.target.value } : item)),
                        )
                      }
                      placeholder="nama anggota"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => setSchedule((current) => current.filter((_, i) => i !== index))}
                    >
                      hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="btn btn-small"
          onClick={() =>
            setSchedule((current) => [...current, { activity: "", place: places[0] ?? "Kelas", date: "", person: "" }])
          }
          disabled={schedule.length >= 20}
        >
          + tambah baris jadwal
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">7 · Nomor urutan hari wawancara</h2>
        <p className="muted">
          Pilih satu slot dari guru. Satu slot hanya untuk satu kelompok, jadi pilih segera setelah gurumu
          menambahkannya.
        </p>
        <select className="field" value={slotId} onChange={(event) => setSlotId(event.target.value)}>
          <option value="">— belum memilih slot —</option>
          {availableSlots.map((slot) => {
            const takenByOther = slot.groupId !== null && slot.groupId !== selectedSlotId;
            return (
              <option key={slot.id} value={slot.id} disabled={takenByOther}>
                {slot.label}
                {slot.date ? ` · ${slot.date}` : ""}
                {takenByOther ? ` · sudah diambil ${slot.groupName ?? ""}` : ""}
              </option>
            );
          })}
        </select>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">8 · Bentuk produk akhir</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {finalProductTypes.map((type) => (
            <label key={type.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="final-product"
                className="accent-ember-500"
                checked={finalProductType === type.value}
                onChange={() => setFinalProductType(type.value)}
              />
              {type.label}
            </label>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">9 · Etika wawancara</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 accent-ember-500"
            checked={ethicsAck}
            onChange={(event) => setEthicsAck(event.target.checked)}
          />
          <span>
            Kami memahami etika wawancara: meminta izin terlebih dahulu, bersikap sopan, tidak mengganggu proses
            produksi D&apos;Culinary, dan mencatat data apa adanya (tidak mengarang data).
          </span>
        </label>
      </section>

      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
      {status && <p className="chip chip-ok w-full justify-start">{status}</p>}

      <div className="card flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan lembar"}
        </button>
        <button type="button" className="btn" onClick={() => void save("final")} disabled={busy}>
          Tandai final
        </button>
        {sheet.updatedAt && (
          <span className="muted">
            Terakhir diubah {new Date(sheet.updatedAt).toLocaleString("id-ID")}
            {sheet.updatedByName ? ` oleh ${sheet.updatedByName}` : ""}.
          </span>
        )}
      </div>
    </form>
  );
}
