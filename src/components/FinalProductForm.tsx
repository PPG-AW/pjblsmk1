"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type ProductType = { value: string; label: string };

export type FinalProductData = {
  type: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  modelText: string;
  optimumText: string;
  updatedAt: string | null;
};

export default function FinalProductForm({
  product,
  types,
  reminder,
}: {
  product: FinalProductData | null;
  types: ProductType[];
  reminder: string;
}) {
  const router = useRouter();
  const [type, setType] = useState(product?.type ?? types[0]?.value ?? "");
  const [title, setTitle] = useState(product?.title ?? "");
  const [link, setLink] = useState(product?.link ?? "");
  const [summary, setSummary] = useState(product?.summary ?? "");
  const [source, setSource] = useState(product?.source ?? "");
  const [modelText, setModelText] = useState(product?.modelText ?? "");
  const [optimumText, setOptimumText] = useState(product?.optimumText ?? "");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = await apiFetch<{ message: string; reminder: string }>("/api/portfolio", {
        method: "PUT",
        body: { type, title, link, summary, source, modelText, optimumText },
      });
      setMessage(`${payload.message} ${payload.reminder}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan produk akhir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="field-label">Jenis produk akhir</label>
        <select className="field" value={type} onChange={(event) => setType(event.target.value)}>
          {types.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Judul</label>
        <input
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          minLength={5}
          placeholder="contoh: Poster Keuntungan Maksimum Tahu Walik & Risol D'Culinary"
          required
        />
      </div>

      <div>
        <label className="field-label">Tautan Google Drive produk akhir</label>
        <input
          className="field"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="https://drive.google.com/..."
          required
        />
        <p className="muted mt-1">
          Unggah berkas produk akhir kelompokmu ke Google Drive, lalu tempel tautannya di sini. Halaman ini
          satu-satunya tempat unggahan dalam proyek — dokumen pendukung lain tidak perlu diunggah.
        </p>
        <p className="muted mt-1">{reminder}</p>
      </div>

      <div>
        <label className="field-label">Ringkasan hasil (minimal 50 karakter)</label>
        <textarea
          className="field min-h-[120px]"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          minLength={50}
          placeholder="Tuliskan temuan utama kelompok: kombinasi produksi yang disarankan dan alasannya."
          required
        />
        <p className="muted mt-1">{summary.trim().length} karakter.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="field-label">Sumber data</label>
          <textarea
            className="field min-h-[90px]"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="wawancara pengurus D'Culinary tanggal …, observasi produksi, dokumen stok"
            required
          />
        </div>
        <div>
          <label className="field-label">Model matematika (ketik)</label>
          <textarea
            className="field min-h-[90px] font-mono"
            value={modelText}
            onChange={(event) => setModelText(event.target.value)}
            placeholder={"100x + 150y <= 6000\n80x + 40y <= 4000\nx, y >= 0\nZ = ..."}
            required
          />
        </div>
        <div>
          <label className="field-label">Nilai optimum & rekomendasi produksi</label>
          <textarea
            className="field min-h-[90px]"
            value={optimumText}
            onChange={(event) => setOptimumText(event.target.value)}
            placeholder="titik pojok dan nilai Z, lalu rekomendasi: buat … pcs A dan … pcs B"
            required
          />
        </div>
      </div>

      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
      {message && <p className="chip chip-ok w-full justify-start">{message}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Menyimpan…" : product ? "Perbarui produk akhir" : "Kumpulkan produk akhir"}
        </button>
        {product?.updatedAt && (
          <span className="muted">
            Terakhir diperbarui {new Date(product.updatedAt).toLocaleString("id-ID")}. Satu kelompok hanya punya
            satu pengumpulan yang boleh diperbarui.
          </span>
        )}
      </div>
    </form>
  );
}
