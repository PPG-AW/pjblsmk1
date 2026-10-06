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

type GridCell = { count: number; activityTypes: string[] };

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
  journal: {
    total: number;
    perMember: Record<string, number>;
    lastAt: string | null;
    grid: {
      dates: string[];
      members: {
        studentId: number;
        name: string;
        cells: Record<string, GridCell>;
        total: number;
        lastDate: string | null;
      }[];
    };
  };
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

type MenuId = "nilai" | "jurnal" | "pengaturan";

const MENUS: { id: MenuId; label: string; hint: string }[] = [
  {
    id: "nilai",
    label: "Rekap nilai siswa",
    hint: "Skor kuis, keaktifan, produk akhir, dan unduhan CSV untuk penilaian.",
  },
  {
    id: "jurnal",
    label: "Laporan jurnal",
    hint: "Pantau jurnal tiap kelompok lewat grid tanggal, lihat siapa yang belum menulis, lalu kirim pengingat.",
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    hint: "Kelompok, saran pembagian otomatis, slot wawancara, dan daftar nama kelas.",
  },
];

const STATUS_CHIP: Record<GroupOverview["status"], string> = {
  lancar: "chip chip-ok",
  perhatian: "chip chip-warn",
  masalah: "chip chip-bad",
};

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const index = Number(month) - 1;
  return `${Number(day)} ${MONTHS_ID[index] ?? month} '${year.slice(2)}`;
}

export default function TeacherDashboard({
  initialOverview,
  initialMenu = "nilai",
}: {
  initialOverview: Overview;
  /** Menu yang langsung terbuka; dipakai halaman guru dan pengujian. */
  initialMenu?: MenuId;
}) {
  const [overview, setOverview] = useState<Overview>(initialOverview);
  const [menu, setMenu] = useState<MenuId>(initialMenu);
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

  const valueRows = useMemo(() => {
    const grouped = overview.groups.flatMap((group) =>
      group.members.map((member) => ({
        studentId: member.studentId,
        name: member.name,
        groupName: group.name as string | null,
        score: member.quizScore,
        attempts: member.quizAttempts,
        journal: member.journalCount,
        roles: member.roles,
        hasActivity: member.hasActivity,
        lastSeenAt: member.lastSeenAt,
        finalProduct: group.finalProduct,
      })),
    );
    const loose = overview.ungrouped.map((student) => ({
      studentId: student.studentId,
      name: student.name,
      groupName: null as string | null,
      score: student.quizScore,
      attempts: student.quizAttempts,
      journal: 0,
      roles: [] as string[],
      hasActivity: student.hasActivity,
      lastSeenAt: null as string | null,
      finalProduct: null as GroupOverview["finalProduct"],
    }));
    return [...grouped, ...loose].sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [overview]);

  const journalWarning = useMemo(
    () =>
      overview.groups.flatMap((group) =>
        group.journal.grid.members
          .filter((member) => member.total === 0)
          .map((member) => ({ groupName: group.name, name: member.name })),
      ),
    [overview],
  );

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
    for (let i = 0; i < groupCount; i += 1)
      groups.push({ name: `Kelompok ${i + 1}`, studentIds: [], averageScore: null, withoutScore: 0 });
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
    setNotice("Pratinjau acak murni (opsi sekunder). Skor kelompok bisa tidak seimbang.");
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

  async function sendReminder(text: string) {
    await run(async () => {
      await apiFetch("/api/teacher/reminders", { method: "POST", body: { message: text } });
      if (text === reminderText) setReminderText("");
      await load();
    });
  }

  const studentName = (id: number) => allStudents.find((student) => student.studentId === id)?.name ?? `#${id}`;
  const studentScore = (id: number) => allStudents.find((student) => student.studentId === id)?.score ?? null;
  const activeMenu = MENUS.find((item) => item.id === menu)!;

  return (
    <div className="space-y-5">
      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
      {notice && <p className="chip chip-ok w-full justify-start">{notice}</p>}

      <nav className="card space-y-3">
        <p className="field-label">Menu guru</p>
        <div className="flex flex-wrap gap-2">
          {MENUS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === menu ? "btn btn-primary" : "btn btn-ghost"}
              aria-current={item.id === menu ? "page" : undefined}
              onClick={() => {
                setMenu(item.id);
                setNotice(null);
                setError(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="muted">{activeMenu.hint}</p>
      </nav>

      {/* ============================== MENU 1 ============================== */}
      {menu === "nilai" && (
        <>
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
            <div className="flex flex-wrap items-center gap-2">
              {[
                { type: "quiz", label: "Unduh CSV skor kuis" },
                { type: "groups", label: "Unduh CSV daftar kelompok" },
                { type: "journal", label: "Unduh CSV kontribusi jurnal" },
                { type: "status", label: "Unduh CSV status tahapan" },
              ].map((item) => (
                <a key={item.type} className="btn btn-small" href={`/api/teacher/export?type=${item.type}`}>
                  {item.label}
                </a>
              ))}
            </div>
          </section>

          <section className="card space-y-3">
            <h2 className="section-title">Rekap nilai per siswa</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Kelompok</th>
                    <th>Skor</th>
                    <th>Percobaan</th>
                    <th>Jurnal</th>
                    <th>Peran</th>
                    <th>Aktivitas</th>
                    <th>Produk akhir kelompok</th>
                    <th>Terakhir aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {valueRows.map((row) => (
                    <tr key={row.studentId}>
                      <td>{row.name}</td>
                      <td>{row.groupName ?? <span className="chip chip-warn">belum berkelompok</span>}</td>
                      <td className="font-mono">{row.score ?? "-"}</td>
                      <td className="font-mono">{row.attempts}x</td>
                      <td className="font-mono">{row.journal}</td>
                      <td>{row.roles.length > 0 ? row.roles.join(", ") : <span className="muted">-</span>}</td>
                      <td>
                        {row.hasActivity ? <span className="chip chip-ok">ada</span> : <span className="chip chip-bad">kosong</span>}
                      </td>
                      <td>
                        {row.finalProduct ? (
                          <span className="chip chip-ok">
                            {FINAL_PRODUCT_TYPES.find((type) => type.value === row.finalProduct?.type)?.label ??
                              row.finalProduct.type}
                          </span>
                        ) : (
                          <span className="chip">belum</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">{row.lastSeenAt ? formatWaktu(row.lastSeenAt) : "-"}</td>
                    </tr>
                  ))}
                  {valueRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="muted">
                        Belum ada siswa. Minta siswa masuk lewat halaman login lebih dulu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Modus skor kuis diatur di menu Pengaturan. Untuk pemantauan jurnal, buka menu Laporan jurnal.
            </p>
          </section>

          <section className="card space-y-3">
            <h2 className="section-title">Rekap per kelompok</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {overview.groups.map((group) => (
                <article key={group.id} className="card-tight space-y-3">
                  <header className="flex flex-wrap items-center gap-2">
                    <span className={STATUS_CHIP[group.status]}>{group.status}</span>
                    <span className="flex-1 font-display text-lg text-cream-100">{group.name}</span>
                    <span className="chip font-mono">PIN {group.pin}</span>
                  </header>
                  {group.statusReasons.length > 0 && <p className="muted">{group.statusReasons.join(" · ")}</p>}
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Anggota</th>
                          <th>Skor</th>
                          <th>Jurnal</th>
                          <th>Peran</th>
                          <th>Aktivitas</th>
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
                            <td className="font-mono">{member.journalCount}</td>
                            <td>
                              {member.roles.length > 0 ? member.roles.join(", ") : <span className="chip chip-warn">belum diisi</span>}
                            </td>
                            <td>
                              {member.hasActivity ? <span className="chip chip-ok">ada</span> : <span className="chip chip-bad">kosong</span>}
                            </td>
                          </tr>
                        ))}
                        {group.members.length === 0 && (
                          <tr>
                            <td colSpan={5} className="muted">
                              Belum ada anggota. Masukkan siswa di menu Pengaturan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm">
                    Produk akhir:{" "}
                    {group.finalProduct ? (
                      <a href={group.finalProduct.link} target="_blank" rel="noopener noreferrer">
                        {group.finalProduct.title} (buka tautan Drive)
                      </a>
                    ) : (
                      <span className="muted">belum dikumpulkan</span>
                    )}
                  </p>
                  <p className="text-sm">
                    Refleksi: {group.reflections.done}/{group.reflections.total} · Skor kelompok rata-rata:{" "}
                    {averageScoreOf(group.members)}
                  </p>
                </article>
              ))}
              {overview.groups.length === 0 && (
                <p className="muted">Belum ada kelompok. Buat kelompok di menu Pengaturan.</p>
              )}
            </div>
          </section>

          <section className="card space-y-3">
            <h2 className="section-title">Siswa belum berkelompok ({overview.ungrouped.length})</h2>
            <ul className="space-y-1 text-sm">
              {overview.ungrouped.map((student) => (
                <li key={student.studentId}>
                  {student.name} · skor {student.quizScore ?? "-"} · percobaan {student.quizAttempts}
                  {!student.hasActivity && <span className="text-berry-400"> · belum ada aktivitas</span>}
                </li>
              ))}
              {overview.ungrouped.length === 0 && <li className="muted">Semua siswa sudah berkelompok.</li>}
            </ul>
          </section>
        </>
      )}

      {/* ============================== MENU 2 ============================== */}
      {menu === "jurnal" && (
        <>
          <section className="card space-y-3">
            <h2 className="section-title">Status kelompok</h2>
            <div className="flex flex-wrap gap-2">
              {overview.groups.map((group) => (
                <span key={group.id} className={STATUS_CHIP[group.status]}>
                  {group.name}: {group.status}
                </span>
              ))}
              {overview.groups.length === 0 && <span className="muted">Belum ada kelompok.</span>}
            </div>
            {journalWarning.length > 0 && (
              <p className="chip chip-warn w-full justify-start">
                {journalWarning.length} anggota belum menulis jurnal:{" "}
                {journalWarning.map((item) => `${item.name} (${item.groupName})`).join(", ")}
              </p>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="section-title">Grid jurnal per kelompok</h2>
            <p className="muted">
              14 tanggal terakhir dengan entri jurnal. Tanda centang berarti 1 entri pada tanggal itu, angka berarti
              lebih dari satu entri, dan titik kecil berarti belum ada entri. Arahkan kursor ke sel untuk melihat jenis
              kegiatannya.
            </p>
            {overview.groups.map((group) => (
              <div key={group.id} className="card-tight space-y-2">
                <header className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 font-display text-lg text-cream-100">{group.name}</span>
                  <span className="chip">total {group.journal.total} entri</span>
                  <span className="chip">{group.journal.lastAt ? `terakhir ${formatWaktu(group.journal.lastAt)}` : "belum ada"}</span>
                </header>
                {group.journal.grid.dates.length === 0 ? (
                  <p className="muted">Belum ada entri jurnal pada 60 hari terakhir.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Anggota</th>
                          {group.journal.grid.dates.map((date) => (
                            <th key={date} className="whitespace-nowrap text-center">
                              {shortDate(date)}
                            </th>
                          ))}
                          <th className="text-center">Total</th>
                          <th className="whitespace-nowrap">Terakhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.journal.grid.members.map((member) => (
                          <tr key={member.studentId}>
                            <td className="whitespace-nowrap">{member.name}</td>
                            {group.journal.grid.dates.map((date) => {
                              const cell = member.cells[date];
                              return (
                                <td
                                  key={date}
                                  className="text-center"
                                  title={
                                    cell
                                      ? `${member.name} · ${shortDate(date)}: ${cell.activityTypes.join(", ")} (${cell.count} entri)`
                                      : `${member.name} · ${shortDate(date)}: belum ada entri`
                                  }
                                >
                                  {cell ? (
                                    <span className={cell.count > 1 ? "chip chip-warn" : "chip chip-ok"}>
                                      {cell.count > 1 ? cell.count : "✓"}
                                    </span>
                                  ) : (
                                    <span className="muted">·</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center font-mono">{member.total}</td>
                            <td className="whitespace-nowrap">
                              {member.lastDate ? shortDate(member.lastDate) : <span className="chip chip-bad">belum menulis</span>}
                            </td>
                          </tr>
                        ))}
                        {group.journal.grid.members.length === 0 && (
                          <tr>
                            <td colSpan={group.journal.grid.dates.length + 3} className="muted">
                              Belum ada anggota di kelompok ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {overview.groups.length === 0 && <p className="muted">Belum ada kelompok.</p>}
          </section>

          <section className="card space-y-3">
            <h2 className="section-title">Kontribusi jurnal per anggota</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {overview.groups.map((group) => (
                <div key={group.id} className="card-tight space-y-2">
                  <p className="field-label">{group.name}</p>
                  <ul className="text-sm">
                    {group.journal.grid.members.map((member) => (
                      <li key={member.studentId} className="flex flex-wrap items-center gap-2">
                        <span className="flex-1">{member.name}</span>
                        <span className="chip">{member.total} entri</span>
                        <span className={member.total === 0 ? "chip chip-bad" : "chip chip-ok"}>
                          {member.lastDate ? `terakhir ${shortDate(member.lastDate)}` : "belum menulis"}
                        </span>
                        {member.total === 0 && (
                          <button
                            type="button"
                            className="btn btn-small"
                            disabled={busy}
                            onClick={() =>
                              void sendReminder(`Ayo isi jurnal hari ini, ${member.name}. Jurnal harian menjadi bagian penilaian.`)
                            }
                          >
                            Kirim pengingat
                          </button>
                        )}
                      </li>
                    ))}
                    {group.journal.grid.members.length === 0 && <li className="muted">Belum ada anggota.</li>}
                  </ul>
                </div>
              ))}
            </div>
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
                onClick={() => void sendReminder(reminderText)}
              >
                Kirim pengingat
              </button>
            </div>
            <ul className="space-y-2">
              {overview.reminders.map((reminder) => (
                <li key={reminder.id} className="card-tight flex flex-wrap items-center gap-2">
                  <span className="flex-1 text-sm">{reminder.message}</span>
                  <span className={reminder.active ? "chip chip-ok" : "chip"}>
                    {reminder.active ? "aktif" : "nonaktif"}
                  </span>
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
              {overview.reminders.length === 0 && <li className="muted">Belum ada pengingat.</li>}
            </ul>
          </section>
        </>
      )}

      {/* ============================== MENU 3 ============================== */}
      {menu === "pengaturan" && (
        <>
          <section className="card space-y-3">
            <h2 className="section-title">Pengaturan aplikasi</h2>
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
                  <option value={1}>Pertemuan 1</option>
                  <option value={2}>Pertemuan 2</option>
                  <option value={3}>Pertemuan 3</option>
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
          </section>

          <section className="card space-y-3">
            <h2 className="section-title">Daftar nama kelas</h2>
            <textarea
              className="field min-h-[120px]"
              value={rosterText}
              onChange={(event) => setRosterText(event.target.value)}
              placeholder={"Aulia Rahma\nBima Saputra\n…"}
            />
            <div className="flex flex-wrap items-center gap-2">
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
          </section>

          <section className="card space-y-3">
            <h2 className="section-title">Saran pembagian kelompok heterogen (4 orang)</h2>
            <p className="muted">
              Pola ular (snake draft): siswa diurutkan dari skor tertinggi ke terendah lalu dibagikan bergantian,
              sehingga rata-rata skor tiap kelompok seimbang. Siswa tanpa skor ditempatkan terakhir dan ditandai.
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
                          current
                            ? current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item))
                            : current,
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
                          <th>Pindahkan</th>
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
                            <td>
                              {member.roles.length > 0 ? member.roles.join(", ") : <span className="chip chip-warn">belum diisi</span>}
                            </td>
                            <td>
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
                        {group.members.length === 0 && (
                          <tr>
                            <td colSpan={5} className="muted">
                              Belum ada anggota.
                            </td>
                          </tr>
                        )}
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
                            Peran lengkap:{" "}
                            {group.planning.rolesFilled ? "ya" : <span className="text-ember-300">belum</span>}
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

                    <div className="card-tight">
                      <p className="field-label">Jurnal kelompok</p>
                      <p className="text-sm">
                        Total {group.journal.total} entri.{" "}
                        {group.journal.lastAt ? `Terakhir ${formatWaktu(group.journal.lastAt)}.` : "Belum ada entri."}
                      </p>
                      <p className="muted mt-1 text-xs">Grid pemantauan lengkap ada di menu Laporan jurnal.</p>
                    </div>
                  </div>
                </article>
              ))}
              {overview.groups.length === 0 && <p className="muted">Belum ada kelompok.</p>}
            </div>

            <div className="card-tight">
              <h3 className="font-display text-lg text-ember-300">
                Siswa belum berkelompok ({overview.ungrouped.length})
              </h3>
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

            <div className="note-info">Peran yang tersedia pada planning sheet: {GROUP_ROLES.join(", ")}.</div>
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
                <input
                  type="date"
                  className="field"
                  value={slotDate}
                  onChange={(event) => setSlotDate(event.target.value)}
                />
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
        </>
      )}
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

function averageScoreOf(members: MemberSummary[]): string {
  const scores = members
    .map((member) => member.quizScore)
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return "-";
  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return `${average.toFixed(1)} (dari ${scores.length} siswa berskor)`;
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
