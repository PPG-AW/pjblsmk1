"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export type JournalEntry = {
  id: number;
  studentId: number;
  studentName: string;
  entryDate: string;
  activityType: string;
  activity: string;
  obstacle: string;
  contribution: string;
  isMine: boolean;
  updatedAt: string;
};

const EMPTY = {
  entryDate: "",
  activityType: "Pertemuan 2",
  activity: "",
  obstacle: "",
  contribution: "",
};

export default function JournalForm({
  entries,
  activityTypes,
  today,
}: {
  entries: JournalEntry[];
  activityTypes: string[];
  today: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY, entryDate: today });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setForm({ ...EMPTY, entryDate: today });
    setEditingId(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        entryDate: form.entryDate,
        activityType: form.activityType,
        activity: form.activity,
        obstacle: form.obstacle,
        contribution: form.contribution,
      };
      if (editingId === null) {
        await apiFetch("/api/journal", { method: "POST", body });
        setMessage("Entri jurnal tersimpan.");
      } else {
        await apiFetch(`/api/journal/${editingId}`, { method: "PATCH", body });
        setMessage("Entri jurnal diperbarui.");
      }
      reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan entri.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/journal/${id}`, { method: "DELETE" });
      setMessage("Entri jurnal dihapus.");
      if (editingId === id) reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menghapus entri.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setForm({
      entryDate: entry.entryDate,
      activityType: entry.activityType,
      activity: entry.activity,
      obstacle: entry.obstacle,
      contribution: entry.contribution,
    });
  }

  return (
    <div className="space-y-5">
      <form className="card space-y-3" onSubmit={handleSubmit}>
        <h2 className="section-title">{editingId === null ? "Tambah entri jurnal" : `Sunting entri #${editingId}`}</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Tanggal</label>
            <input
              type="date"
              className="field"
              value={form.entryDate}
              max={today}
              onChange={(event) => setForm({ ...form, entryDate: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="field-label">Kegiatan</label>
            <select
              className="field"
              value={form.activityType}
              onChange={(event) => setForm({ ...form, activityType: event.target.value })}
            >
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Yang dikerjakan kelompok hari itu</label>
          <input
            className="field"
            value={form.activity}
            onChange={(event) => setForm({ ...form, activity: event.target.value })}
            placeholder="contoh: wawancara pengurus D'Culinary tentang stok beras dan ayam"
            minLength={3}
            required
          />
        </div>

        <div>
          <label className="field-label">Kendala (opsional)</label>
          <input
            className="field"
            value={form.obstacle}
            onChange={(event) => setForm({ ...form, obstacle: event.target.value })}
            placeholder="contoh: pengurus hanya bisa diwawancarai 10 menit"
          />
        </div>

        <div>
          <label className="field-label">Kontribusi saya (wajib, minimal 10 karakter)</label>
          <textarea
            className="field min-h-[80px]"
            value={form.contribution}
            onChange={(event) => setForm({ ...form, contribution: event.target.value })}
            placeholder="contoh: saya mencatat semua angka stok dan memotret struk belanja bahan"
            minLength={10}
            required
          />
        </div>

        {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
        {message && <p className="chip chip-ok w-full justify-start">{message}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId === null ? "Simpan entri" : "Perbarui entri"}
          </button>
          {editingId !== null && (
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>
              Batal menyunting
            </button>
          )}
        </div>
      </form>

      <section className="card space-y-3">
        <h2 className="section-title">Jurnal kelompok ({entries.length} entri)</h2>
        {entries.length === 0 && <p className="muted">Belum ada entri. Mulai tulis jurnal setelah kegiatan pertama.</p>}
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="card-tight">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{entry.entryDate}</span>
                <span className="chip chip-warn">{entry.activityType}</span>
                <span className="text-sm font-medium text-cream-100">{entry.studentName}</span>
                {entry.isMine && <span className="chip chip-ok">milik saya</span>}
              </div>
              <p className="mt-2 text-sm text-cream-100">{entry.activity}</p>
              {entry.obstacle && <p className="muted mt-1">Kendala: {entry.obstacle}</p>}
              <p className="mt-1 text-sm text-ember-300">Kontribusi: {entry.contribution}</p>
              {entry.isMine && (
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn btn-small" onClick={() => startEdit(entry)} disabled={busy}>
                    sunting
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => void handleDelete(entry.id)}
                    disabled={busy}
                  >
                    hapus
                  </button>
                </div>
              )}
              {!entry.isMine && <p className="muted mt-2">Entri anggota lain — hanya dapat dibaca.</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
