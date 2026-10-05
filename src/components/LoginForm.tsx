"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function LoginForm({ rosterActive }: { rosterActive: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ student: { name: string } }>("/api/auth/student", {
        method: "POST",
        body: { name },
      });
      setMessage(`Selamat datang, ${result.student.name}!`);
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="field-label" htmlFor="student-name">
          Nama lengkap
        </label>
        <input
          id="student-name"
          className="field"
          placeholder="contoh: Aulia Rahma"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          minLength={3}
          maxLength={60}
          required
        />
        <p className="muted mt-1">
          Cukup tulis nama lengkapmu (minimal 3 huruf). Huruf besar/kecil tidak berpengaruh.
          {rosterActive && " Hanya nama dalam daftar kelas yang bisa masuk."}
        </p>
      </div>

      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
      {message && <p className="chip chip-ok w-full justify-start">{message}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Masuk…" : "Masuk sebagai siswa"}
      </button>
    </form>
  );
}
