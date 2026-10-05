"use client";

import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatWaktu } from "@/lib/format";
import { suggestHeterogeneousGroups, type GroupingMode, type SuggestedGroup } from "@/lib/grouping";
import { FINAL_PRODUCT_TYPES, GROUP_ROLES, stageLabelFallback } from "@/lib/teacher-ui";

type MemberSummary = {
  studentId: number;
  name: string;
  quizScore: number | null;
  quizAttempts: number;
  journalCount: number;
  hasActivity: boolean;
  reflectionDone: boolean;
  lastSeenAt: string | null;
  roles: string[];
};

type GroupOverview = {
  id: number;
  name: string;
  pin: string;
  members: MemberSummary[];
  planning: {
    status: string;
    updatedAt: string | null;
    updatedByName: string | null;
    productA: string;
    productB: string;
    slotLabel: string | null;
    teacherNote: string | null;
    rolesFilled: boolean;
  } | null;
  interview: {
    exists: boolean;
    completeCount: number;
    unclearCount: number;
    missingCount: number;
    followUps: string[];
    objectiveReady: boolean;
  };
  journal: { total: number; perMember: Record<string, number> };
  finalProduct: { type: string; title: string; link: string; updatedAt: string | null } | null;
  reflections: { done: number; total: number };
  status: "lancar" | "perhatian" | "masalah";
  statusReasons: string[];
};

type Overview = {
  settings: { quizScoreMode: "pertama" | "tertinggi"; currentStage: number; restrictRoster: boolean };
  groups: GroupOverview[];
  ungrouped: { studentId: number; name: string; quizScore: number | null; quizAttempts: number; hasActivity: boolean }[];
  slots: { id: number; label: string; date: string; groupId: number | null; groupName: string | null }[];
  reminders: { id: number; message: string; active: boolean; createdAt: string }[];
  roster: { name: string; studentExists: boolean }[];
  classStats: {
    studentCount: number;
    groupCount: number;
    withoutScore: number;
    averageScore: number | null;
    submittedFinalProducts: number;
    submittedReflections: number;
  };
};

const STATUS_CHIP: Record<GroupOverview["status"], string> = {
  lancar: "chip chip-ok",
  perhatian: "chip chip-warn",
  masalah: "chip chip-bad",
};

export default function TeacherDashboard({ initialOverview }: { initialOverview: Overview }) {
  const [overview, setOverview] = useState<Overview>(initialOverview);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<GroupingMode>("seimbang");
  const [preview, setPreview] = useState<SuggestedGroup[] | null>(null);
  const [force, setForce] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [slotCount, setSlotCount] = useState("4");
  const [slotDate, setSlotDate] = useState("");
  const [rosterText, setRosterText] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Overview>("/api/teacher/overview");
      setOverview(data);
      setRosterText(data.roster.map((row) => row.name).join("\n"));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat data.");
    }
  }, []);

  const allStudents = useMemo(() => {
    return [
      ...overview.groups.flatMap((group) =>
        group.members.map((member) => ({
          studentId: member.studentId,
          name: member.name,
          score: member.quizScore,
          groupName: group.name,
        })),
      ),
      ...overview.ungrouped.map((student) => ({
        studentId: student.studentId,
        name: student.name,
        score: student.quizScore,
        groupName: null as string | null,
      })),
    ];
  }, [overview]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aksi gagal.");
    } finally {
      setBusy(false);
    }
  }

  function generatePreview() {
    const students = allStudents.map((student) => ({
      studentId: student.studentId,
      name: student.name,
      score: student.score,
    }));
    const result = suggestHeterogeneousGroups(students, { size: 4, mode });
    setPreview(result.groups);
    setNotice(result.note);
  }

  function shuffleRandomly() {
    const students = [...allStudents].sort(() => Math.random() - 0.5);
    const groups: SuggestedGroup[] = [];
    const groupCount = Math.max(1, Math.round(students.length / 4));
    for (let i = 0; i < groupCount; i += 1) groups.push({ name: `Kelompok ${i + 1}`, studentIds: [], averageScore: null, withoutScore: 0 });
    students.forEach((student, index) => {
      groups[index % groupCount]!.studentIds.push(student.studentId);
    });
    setPreview(
      groups.map((group) => {
        const scores = group.studentIds
          .map((id) => allStudents.find((student) => student.studentId === id)?.score ?? null)
          .filter((score): score is number => score !== null);
        return {
          ...group,
          averageScore: scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null,
        };
      }),
    );
    setNotice("Pratinjau acak murni (opsi sekunder) — skor kelompok bisa tidak seimbang.");
  }

  function moveInPreview(studentId: number, targetIndex: number) {
    setPreview((current) => {
      if (!current) return current;
      return current.map((group, index) => ({
        ...group,
        studentIds:
          index === targetIndex
            ? [...group.studentIds, studentId]
            : group.studentIds.filter((id) => id !== studentId),
      }));
    });
  }

  async function applyPreview() {
    if (!preview) return;
    await run(async () => {
      const payload = await apiFetch<{ message: string }>("/api/teacher/groups/apply", {
        method: "POST",
        body: {
          force,
          groups: preview.map((group) => ({ name: group.name, studentIds: group.studentIds })),
        },
      });
      setNotice(payload.message);
      setPreview(null);
      setForce(false);
      await load();
    });
  }

  async function saveSettings(patch: Partial<Overview["settings"]>) {
    await run(async () => {
      const payload = await apiFetch<{ message: string }>("/api/teacher/settings", {
        method: "PUT",
        body: {
          quizScoreMode: patch.quizScoreMode ?? overview.settings.quizScoreMode,
          currentStage: patch.currentStage ?? overview.settings.currentStage,
          restrictRoster: patch.restrictRoster ?? overview.settings.restrictRoster,
        },
      });
      setNotice(payload.message);
      await load();
    });
  }

  const studentName = (id: number) => allStudents.find((student) => student.studentId === id)?.name ?? `#${id}`;
  const studentScore = (id: number) => allStudents.find((student) => student.studentId === id)?.score ?? null;

  return (
    <div className="space-y-5">
      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
      {notice && <p className="chip chip-ok w-full justify-start">{notice}</p>}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Ringkasan kelas</h2>
          <span className="chip">{stageLabelFallback(overview.settings.currentStage)}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Siswa" value={overview.classStats.studentCount} />
          <Stat label="Kelompok" value={overview.classStats.groupCount} />
          <Stat label="Belum ada skor" value={overview.classStats.withoutScore} />
          <Stat
            label={`Rata-rata skor (${overview.settings.quizScoreMode})`}
            value={overview.classStats.averageScore !== null ? overview.classStats.averageScore.toFixed(1) : "-"}
          />
          <Stat label="Produk akhir masuk" value={overview.classStats.submittedFinalProducts} />
          <Stat label="Refleksi terkumpul" value={overview.classStats.submittedReflections} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "quiz", label: "Ekspor skor kuis (CSV)" },
            { type: "groups", label: "Ekspor daftar kelompok" },
            { type: "journal", label: "Ekspor kontribusi jurnal" },
            { type: "status", label: "Ekspor status tahapan" },
          ].map((item) => (
            <a key={item.type} className="btn btn-small" href={`/api/teacher/export?type=${item.type}`}>
              {item.label}
            </a>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Pengaturan</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="field-label">Skor kuis yang dipakai untuk kelompok</label>
            <select
              className="field"
              value={overview.settings.quizScoreMode}
              onChange={(event) => void saveSettings({ quizScoreMode: event.target.value as "pertama" | "tertinggi" })}
              disabled={busy}
            >
              <option value="pertama">Percobaan pertama (default, paling adil)</option>
              <option value="tertinggi">Skor tertinggi</option>
            </select>
          </div>
          <div>
            <label className="field-label">Pertemuan / tahap berjalan</label>
            <select
              className="field"
              value={overview.settings.currentStage}
              onChange={(event) => void saveSettings({ currentStage: Number(event.target.value) })}
              disabled={busy}
            >
              <option value={1}>1 — Pertemuan 1</option>
              <option value={2}>2 — Pertemuan 2</option>
              <option value={3}>3 — Pertemuan 3</option>
            </select>
          </div>
          <div>
            <label className="field-label">Login siswa</label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-ember-500"
                checked={overview.settings.restrictRoster}
                onChange={(event) => void saveSettings({ restrictRoster: event.target.checked })}
                disabled={busy}
              />
              Hanya nama dalam daftar kelas
            </label>
          </div>
        </div>

        <div>
          <label className="field-label">Daftar nama kelas (satu nama per baris)</label>
          <textarea
            className="field min-h-[120px]"
            value={rosterText}
            onChange={(event) => setRosterText(event.target.value)}
            placeholder={"Aulia Rahma\nBima Saputra\n…"}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-small"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const payload = await apiFetch<{ message: string }>("/api/teacher/roster", {
                    method: "PUT",
                    body: { text: rosterText },
                  });
                  setNotice(payload.message);
                  await load();
                })
              }
            >
              Simpan daftar kelas
            </button>
            <span className="muted">
              {overview.roster.length} nama tersimpan. Nama di luar daftar akan ditolak saat login bila pengaturan di
              atas aktif.
            </span>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Saran pembagian kelompok heterogen (4 orang)</h2>
        <p className="muted">
          Pola ular (snake draft): siswa diurutkan dari skor tertinggi ke terendah lalu dibagikan bergantian, sehingga
          rata-rata skor tiap kelompok seimbang. Siswa tanpa skor ditempatkan terakhir dan ditandai.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select className="field w-auto" value={mode} onChange={(event) => setMode(event.target.value as GroupingMode)}>
            <option value="seimbang">Sisa siswa masuk kelompok ukuran 5</option>
            <option value="kecil">Sisa siswa membentuk kelompok ukuran 3</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={generatePreview} disabled={busy}>
            Buat pratinjau
          </button>
          <button type="button" className="btn btn-ghost" onClick={shuffleRandomly} disabled={busy}>
            Acak murni (sekunder)
          </button>
          {preview && (
            <>
              <button type="button" className="btn" onClick={() => void applyPreview()} disabled={busy}>
                Terapkan
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPreview(null)} disabled={busy}>
                Batal
              </button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-ember-500"
                  checked={force}
                  onChange={(event) => setForce(event.target.checked)}
                />
                tetap terapkan walau kelompok lama sudah punya data proyek
              </label>
            </>
          )}
        </div>

        {preview && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {preview.map((group, index) => (
              <div key={`${group.name}-${index}`} className="card-tight space-y-2">
                <input
                  className="field"
                  value={group.name}
                  onChange={(event) =>
                    setPreview((current) =>
                      current ? current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)) : current,
                    )
                  }
                />
                <p className="muted">
                  {group.studentIds.length} anggota · rata-rata skor{" "}
                  {group.averageScore !== null ? group.averageScore.toFixed(1) : "-"}
                </p>
                <ul className="space-y-1 text-sm">
                  {group.studentIds.map((id) => {
                    const score = studentScore(id);
                    return (
                      <li key={id} className="flex items-center justify-between gap-2">
                        <span className={score === null ? "text-ember-300" : ""}>
                          {studentName(id)}
                          {score === null && " (tanpa skor)"}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="chip">{score ?? "-"}</span>
                          <select
                            className="field w-auto px-1 py-0 text-xs"
                            value={index}
                            onChange={(event) => moveInPreview(id, Number(event.target.value))}
                            aria-label={`Pindahkan ${studentName(id)}`}
                          >
                            {preview.map((option, optionIndex) => (
                              <option key={option.name + optionIndex} value={optionIndex}>
                                pindah ke {option.name}
                              </option>
                            ))}
                          </select>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Pengingat</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="field flex-1"
            value={reminderText}
            onChange={(event) => setReminderText(event.target.value)}
            placeholder="contoh: besok kumpulkan data harga jual ke D'Culinary"
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || reminderText.trim().length < 5}
            onClick={() =>
              void run(async () => {
                await apiFetch("/api/teacher/reminders", { method: "POST", body: { message: reminderText } });
                setReminderText("");
                await load();
              })
            }
          >
            Kirim pengingat
          </button>
        </div>
        <ul className="space-y-2">
          {overview.reminders.map((reminder) => (
            <li key={reminder.id} className="card-tight flex flex-wrap items-center gap-2">
              <span className="flex-1 text-sm">{reminder.message}</span>
              <span className={reminder.active ? "chip chip-ok" : "chip"}>{reminder.active ? "aktif" : "nonaktif"}</span>
              <span className="muted">{formatWaktu(reminder.createdAt)}</span>
              <button
                type="button"
                className="btn btn-small"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await apiFetch("/api/teacher/reminders", {
                      method: "PATCH",
                      body: { id: reminder.id, active: !reminder.active },
                    });
                    await load();
                  })
                }
              >
                {reminder.active ? "nonaktifkan" : "aktifkan"}
              </button>
              <button
                type="button"
                className="btn btn-small btn-danger"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await apiFetch(`/api/teacher/reminders?id=${reminder.id}`, { method: "DELETE" });
                    await load();
                  })
                }
              >
                hapus
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Slot wawancara</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="field-label">Jumlah slot</label>
            <input
              type="number"
              min={1}
              max={30}
              className="field w-24"
              value={slotCount}
              onChange={(event) => setSlotCount(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Tanggal (opsional)</label>
            <input type="date" className="field" value={slotDate} onChange={(event) => setSlotDate(event.target.value)} />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await apiFetch("/api/teacher/slots", {
                  method: "POST",
                  body: { count: Number(slotCount), prefix: "Slot", date: slotDate },
                });
                await load();
              })
            }
          >
            Buat slot
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Tanggal</th>
                <th>Dipilih kelompok</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overview.slots.map((slot) => (
                <tr key={slot.id}>
                  <td>{slot.label}</td>
                  <td>{slot.date || "-"}</td>
                  <td>{slot.groupName ?? <span className="chip chip-ok">masih kosong</span>}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await apiFetch(`/api/teacher/slots/${slot.id}`, { method: "DELETE" });
                          await load();
                        })
                      }
                    >
                      hapus
                    </button>
                  </td>
                </tr>
              ))}
              {overview.slots.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Belum ada slot wawancara. Buat beberapa slot agar tiap kelompok memilih nomor urut harinya.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Kelompok</h2>
          <div className="flex gap-2">
            <input
              className="field"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Nama kelompok baru"
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || newGroupName.trim().length < 2}
              onClick={() =>
                void run(async () => {
                  await apiFetch("/api/teacher/groups", { method: "POST", body: { name: newGroupName } });
                  setNewGroupName("");
                  await load();
                })
              }
            >
              + Buat kelompok
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {overview.groups.map((group) => (
            <article key={group.id} className="card-tight space-y-3">
              <header className="flex flex-wrap items-center gap-2">
                <span className={STATUS_CHIP[group.status]}>{group.status}</span>
                <input
                  className="field flex-1"
                  defaultValue={group.name}
                  onBlur={(event) => {
                    if (event.target.value !== group.name && event.target.value.trim().length >= 2) {
                      void run(async () => {
                        await apiFetch(`/api/teacher/groups/${group.id}`, {
                          method: "PATCH",
                          body: { name: event.target.value },
                        });
                        await load();
                      });
                    }
                  }}
                />
                <span className="chip font-mono">PIN {group.pin}</span>
              </header>

              {group.statusReasons.length > 0 && <p className="muted">{group.statusReasons.join(" · ")}</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-small"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await apiFetch(`/api/teacher/groups/${group.id}/pin`, { method: "POST" });
                      await load();
                    })
                  }
                >
                  Reset PIN
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await apiFetch(`/api/teacher/groups/${group.id}`, { method: "DELETE" });
                      await load();
                    })
                  }
                >
                  Hapus kelompok
                </button>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Anggota</th>
                      <th>Skor</th>
                      <th>Jurnal</th>
                      <th>Peran</th>
                      <th>Aktivitas</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map((member) => (
                      <tr key={member.studentId}>
                        <td>{member.name}</td>
                        <td className="font-mono">
                          {member.quizScore ?? "-"}
                          <span className="muted"> ({member.quizAttempts}x)</span>
                        </td>
                        <td>{member.journalCount}</td>
                        <td>{member.roles.length > 0 ? member.roles.join(", ") : <span className="chip chip-warn">belum diisi</span>}</td>
                        <td>{member.hasActivity ? <span className="chip chip-ok">ada</span> : <span className="chip chip-bad">kosong</span>}</td>
                        <td className="space-x-1 whitespace-nowrap">
                          <select
                            className="field w-auto px-1 py-0 text-xs"
                            value={group.id}
                            onChange={(event) => {
                              const target = Number(event.target.value);
                              if (target === 0) {
                                void run(async () => {
                                  await apiFetch("/api/teacher/groups/members", {
                                    method: "DELETE",
                                    body: { studentId: member.studentId, groupId: group.id },
                                  });
                                  await load();
                                });
                                return;
                              }
                              if (target !== group.id) {
                                void run(async () => {
                                  await apiFetch("/api/teacher/groups/members", {
                                    method: "POST",
                                    body: { studentId: member.studentId, groupId: target },
                                  });
                                  await load();
                                });
                              }
                            }}
                            aria-label={`Pindahkan ${member.name}`}
                          >
                            <option value={group.id}>di {group.name}</option>
                            {overview.groups
                              .filter((other) => other.id !== group.id)
                              .map((other) => (
                                <option key={other.id} value={other.id}>
                                  pindah ke {other.name}
                                </option>
                              ))}
                            <option value={0}>keluarkan dari kelompok</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="card-tight">
                  <p className="field-label">Planning sheet</p>
                  <p className="text-sm">
                    {group.planning ? (
                      <>
                        <span className={group.planning.status === "final" ? "chip chip-ok" : "chip chip-warn"}>
                          {group.planning.status}
                        </span>{" "}
                        {group.planning.productA || "-"} &amp; {group.planning.productB || "-"}
                        <br />
                        Slot: {group.planning.slotLabel ?? "belum pilih"}
                        <br />
                        Peran lengkap: {group.planning.rolesFilled ? "ya" : <span className="text-ember-300">belum</span>}
                      </>
                    ) : (
                      <span className="muted">Belum dibuat.</span>
                    )}
                  </p>
                  <textarea
                    className="field mt-2 min-h-[60px]"
                    defaultValue={group.planning?.teacherNote ?? ""}
                    placeholder="Catatan/umpan balik guru untuk kelompok ini"
                    onBlur={(event) => {
                      if ((group.planning?.teacherNote ?? "") !== event.target.value) {
                        void run(async () => {
                          await apiFetch("/api/teacher/planning", {
                            method: "PATCH",
                            body: { groupId: group.id, note: event.target.value },
                          });
                          await load();
                        });
                      }
                    }}
                  />
                </div>

                <div className="card-tight">
                  <p className="field-label">Kelengkapan data wawancara</p>
                  {group.interview.exists ? (
                    <>
                      <p className="flex flex-wrap gap-1 text-sm">
                        <span className="chip chip-ok">Lengkap {group.interview.completeCount}</span>
                        <span className="chip chip-warn">Belum jelas {group.interview.unclearCount}</span>
                        <span className="chip chip-bad">Belum ada {group.interview.missingCount}</span>
                      </p>
                      <p className="muted mt-1">
                        Harga/biaya: {group.interview.objectiveReady ? "siap" : "belum lengkap"}
                      </p>
                      {group.interview.followUps.length > 0 && (
                        <ul className="mt-1 list-disc space-y-1 ps-5 text-xs text-cream-300">
                          {group.interview.followUps.slice(0, 4).map((item) => (
                            <li key={item}>{formatFollowUp(item)}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="muted">Belum diisi.</p>
                  )}
                </div>

                <div className="card-tight">
                  <p className="field-label">Kontribusi jurnal per anggota</p>
                  <ul className="text-sm">
                    {group.members.map((member) => (
                      <li key={member.studentId}>
                        {member.name}: {member.journalCount} entri
                        {member.journalCount === 0 && <span className="text-berry-400"> (belum menulis)</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card-tight">
                  <p className="field-label">Produk akhir &amp; refleksi</p>
                  {group.finalProduct ? (
                    <p className="text-sm">
                      {FINAL_PRODUCT_TYPES.find((type) => type.value === group.finalProduct?.type)?.label ??
                        group.finalProduct.type}
                      : {group.finalProduct.title}
                      <br />
                      <a href={group.finalProduct.link} target="_blank" rel="noopener noreferrer">
                        buka tautan Drive
                      </a>
                    </p>
                  ) : (
                    <p className="muted">Produk akhir belum dikumpulkan.</p>
                  )}
                  <p className="mt-1 text-sm">
                    Refleksi: {group.reflections.done}/{group.reflections.total}
                  </p>
                </div>
              </div>
            </article>
          ))}
          {overview.groups.length === 0 && <p className="muted">Belum ada kelompok.</p>}
        </div>

        <div className="card-tight">
          <h3 className="font-display text-lg text-ember-300">Siswa belum berkelompok ({overview.ungrouped.length})</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {overview.ungrouped.map((student) => (
              <li key={student.studentId} className="flex flex-wrap items-center gap-2">
                <span className="flex-1">
                  {student.name} · skor {student.quizScore ?? "-"} · percobaan {student.quizAttempts}
                  {!student.hasActivity && <span className="text-berry-400"> · belum ada aktivitas</span>}
                </span>
                {overview.groups.length > 0 && (
                  <select
                    className="field w-auto px-1 py-0 text-xs"
                    value=""
                    onChange={(event) => {
                      const target = Number(event.target.value);
                      if (target > 0) {
                        void run(async () => {
                          await apiFetch("/api/teacher/groups/members", {
                            method: "POST",
                            body: { studentId: student.studentId, groupId: target },
                          });
                          await load();
                        });
                      }
                    }}
                  >
                    <option value="">masukkan ke kelompok…</option>
                    {overview.groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
            {overview.ungrouped.length === 0 && <li className="muted">Semua siswa sudah berkelompok.</li>}
          </ul>
        </div>
      </section>

      <section className="note-info">
        Peran yang tersedia pada planning sheet: {GROUP_ROLES.join(", ")}.
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card-tight">
      <p className="muted">{label}</p>
      <p className="font-display text-2xl text-cream-100">{value}</p>
    </div>
  );
}

/** followUps disimpan sebagai JSON string dari SQL; tampilkan dengan rapi. */
function formatFollowUp(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { bahan?: string; tindakLanjut?: string };
    return `${parsed.bahan ?? "bahan"}: ${parsed.tindakLanjut?.trim() ? parsed.tindakLanjut : "(tindak lanjut belum diisi)"}`;
  } catch {
    return raw;
  }
}
