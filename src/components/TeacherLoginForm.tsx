"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function TeacherLoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/auth/teacher", { method: "POST", body: { code } });
      router.push("/guru/dashboard");
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
        <label className="field-label" htmlFor="teacher-code">
          Kode guru
        </label>
        <input
          id="teacher-code"
          className="field font-mono"
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="current-password"
          minLength={4}
          required
        />
        <p className="muted mt-1">
          Kode guru diatur lewat variabel lingkungan <span className="code-chip">TEACHER_CODE</span> di server.
          Tidak ada kode bawaan di aplikasi.
        </p>
      </div>

      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Memeriksa…" : "Masuk sebagai guru"}
      </button>
    </form>
  );
}
