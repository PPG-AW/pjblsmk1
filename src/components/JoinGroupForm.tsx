"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function JoinGroupForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/groups/join", { method: "POST", body: { pin: pin.trim().toUpperCase() } });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal bergabung.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="field-label" htmlFor="pin">
          PIN kelompok (6 karakter)
        </label>
        <input
          id="pin"
          className="field font-mono tracking-[0.4em] uppercase"
          value={pin}
          onChange={(event) => setPin(event.target.value.toUpperCase().slice(0, 6))}
          placeholder="A7K2M9"
          required
          minLength={6}
          maxLength={6}
        />
      </div>
      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || pin.length !== 6}>
        {busy ? "Menggabungkan…" : "Gabung kelompok"}
      </button>
      <p className="muted">
        Bila PIN salah 5 kali berturut-turut, kamu terkunci 10 menit. Minta guru mengirim/reset PIN bila lupa.
      </p>
    </form>
  );
}
