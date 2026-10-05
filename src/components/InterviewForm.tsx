"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { DataStatus, Ingredient, MoneyData } from "@/lib/types";
import { DATA_STATUS_LABEL, DATA_STATUS_ORDER } from "@/lib/types";

type Props = {
  productA: string;
  productB: string;
  ingredients: Ingredient[];
  priceA: number | null;
  priceB: number | null;
  costA: number | null;
  costB: number | null;
  moneyStatus: MoneyData | null;
  limitations: string;
  checklist: string[];
  hasConstraints: boolean;
  hasObjective: boolean;
};

const STATUS_ORDER_CLASS: Record<DataStatus, string> = {
  lengkap: "chip chip-ok",
  belum_jelas: "chip chip-warn",
  belum_ada: "chip chip-bad",
};

function emptyIngredient(): Ingredient {
  return {
    name: "",
    unit: "gram",
    perA: 0,
    perB: 0,
    total: 0,
    status: "lengkap",
    followUp: "",
  };
}

function rupiah(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function InterviewForm(props: Props) {
  const router = useRouter();

  const [productA, setProductA] = useState(props.productA);
  const [productB, setProductB] = useState(props.productB);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    props.ingredients.length >= 2 ? props.ingredients : [emptyIngredient(), emptyIngredient()],
  );
  const [priceA, setPriceA] = useState<string>(props.priceA !== null ? String(props.priceA) : "");
  const [priceB, setPriceB] = useState<string>(props.priceB !== null ? String(props.priceB) : "");
  const [costA, setCostA] = useState<string>(props.costA !== null ? String(props.costA) : "");
  const [costB, setCostB] = useState<string>(props.costB !== null ? String(props.costB) : "");
  const [moneyStatus, setMoneyStatus] = useState<MoneyData>(
    props.moneyStatus ?? {
      priceA: "lengkap",
      priceB: "lengkap",
      costA: "lengkap",
      costB: "lengkap",
      followUp: "",
    },
  );
  const [limitations, setLimitations] = useState(props.limitations);

  // Nama produk mengikuti apa yang diketik di bagian atas, mis. "Per 1 pcs Roti".
  const labelA = productA.trim() === "" ? "Produk A" : productA.trim();
  const labelB = productB.trim() === "" ? "Produk B" : productB.trim();

  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const profitA = useMemo(() => {
    const price = Number(priceA);
    const cost = Number(costA);
    if (!priceA || !costA || Number.isNaN(price) || Number.isNaN(cost)) return null;
    return price - cost;
  }, [priceA, costA]);

  const profitB = useMemo(() => {
    const price = Number(priceB);
    const cost = Number(costB);
    if (!priceB || !costB || Number.isNaN(price) || Number.isNaN(cost)) return null;
    return price - cost;
  }, [priceB, costB]);

  const readyIngredients = ingredients.filter(
    (ingredient) =>
      ingredient.status !== "belum_ada" &&
      ingredient.name.trim().length > 0 &&
      Number(ingredient.total) > 0 &&
      (Number(ingredient.perA) > 0 || Number(ingredient.perB) > 0),
  );

  function updateIngredient(index: number, patch: Partial<Ingredient>) {
    setIngredients((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = await apiFetch<{ message: string; warnings: string[]; objective: string | null }>(
        "/api/interview",
        {
          method: "PUT",
          body: {
            productA,
            productB,
            ingredients: ingredients.map((ingredient) => ({
              ...ingredient,
              perA: Number(ingredient.perA) || 0,
              perB: Number(ingredient.perB) || 0,
              total: Number(ingredient.total) || 0,
            })),
            priceA: Number(priceA) || 0,
            priceB: Number(priceB) || 0,
            costA: Number(costA) || 0,
            costB: Number(costB) || 0,
            moneyStatus,
            limitations,
          },
        },
      );
      setWarnings(payload.warnings ?? []);
      setMessage(payload.message ?? "Tersimpan.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan data wawancara.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <section className="card space-y-3">
        <h2 className="section-title">Produk yang diwawancarakan</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Produk A</label>
            <input className="field" value={productA} onChange={(event) => setProductA(event.target.value)} required />
          </div>
          <div>
            <label className="field-label">Produk B</label>
            <input className="field" value={productB} onChange={(event) => setProductB(event.target.value)} required />
          </div>
        </div>
        <p className="muted">
          Nama produk terisi otomatis dari planning sheet, tetapi boleh diperbaiki bila hasil wawancara berbeda.
        </p>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Bahan pokok (2–6 bahan)</h2>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setIngredients((current) => [...current, emptyIngredient()])}
            disabled={ingredients.length >= 6}
          >
            + tambah bahan
          </button>
        </div>

        <ul className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <li key={index} className="card-tight space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-ember-400">Bahan {index + 1}</span>
                <span className={STATUS_ORDER_CLASS[ingredient.status]}>
                  {DATA_STATUS_LABEL[ingredient.status]}
                </span>
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => setIngredients((current) => current.filter((_, i) => i !== index))}
                  disabled={ingredients.length <= 2}
                >
                  hapus
                </button>
              </div>

              <div className="grid gap-2 md:grid-cols-5">
                <div className="md:col-span-2">
                  <label className="field-label">Nama bahan</label>
                  <input
                    className="field"
                    value={ingredient.name}
                    onChange={(event) => updateIngredient(index, { name: event.target.value })}
                    placeholder="contoh: tepung terigu"
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Satuan</label>
                  <input
                    className="field"
                    value={ingredient.unit}
                    onChange={(event) => updateIngredient(index, { unit: event.target.value })}
                    placeholder="gram"
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Per 1 pcs {labelA}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="field"
                    value={ingredient.perA}
                    onChange={(event) => updateIngredient(index, { perA: Number(event.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Per 1 pcs {labelB}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="field"
                    value={ingredient.perB}
                    onChange={(event) => updateIngredient(index, { perB: Number(event.target.value) })}
                    required
                  />
                </div>
            </div>

              <div className="grid gap-2 md:grid-cols-4">
                <div>
                  <label className="field-label">Stok / total tersedia</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="field"
                    value={ingredient.total}
                    onChange={(event) => updateIngredient(index, { total: Number(event.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Status data</label>
                  <select
                    className="field"
                    value={ingredient.status}
                    onChange={(event) => updateIngredient(index, { status: event.target.value as DataStatus })}
                  >
                    {DATA_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {DATA_STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Tindak lanjut (bila belum jelas / belum ada)</label>
                  <input
                    className="field"
                    value={ingredient.followUp}
                    onChange={(event) => updateIngredient(index, { followUp: event.target.value })}
                    placeholder="data apa, kepada siapa, kapan"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="muted">
          Item berstatus &ldquo;Belum ada&rdquo; tidak boleh dipakai sebagai kendala saat menyusun pertidaksamaan.
          Item &ldquo;Belum jelas&rdquo; wajib punya tindak lanjut.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Harga jual dan biaya produksi (fungsi tujuan)</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="field-label">Harga jual 1 pcs {labelA} (Rp)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="field"
              value={priceA}
              onChange={(event) => setPriceA(event.target.value)}
              required
            />
            <select
              className="field mt-1"
              value={moneyStatus.priceA}
              onChange={(event) => setMoneyStatus({ ...moneyStatus, priceA: event.target.value as DataStatus })}
            >
              {DATA_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {DATA_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Biaya produksi 1 pcs {labelA} (Rp)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="field"
              value={costA}
              onChange={(event) => setCostA(event.target.value)}
              required
            />
            <select
              className="field mt-1"
              value={moneyStatus.costA}
              onChange={(event) => setMoneyStatus({ ...moneyStatus, costA: event.target.value as DataStatus })}
            >
              {DATA_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {DATA_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Harga jual 1 pcs {labelB} (Rp)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="field"
              value={priceB}
              onChange={(event) => setPriceB(event.target.value)}
              required
            />
            <select
              className="field mt-1"
              value={moneyStatus.priceB}
              onChange={(event) => setMoneyStatus({ ...moneyStatus, priceB: event.target.value as DataStatus })}
            >
              {DATA_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {DATA_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Biaya produksi 1 pcs {labelB} (Rp)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="field"
              value={costB}
              onChange={(event) => setCostB(event.target.value)}
              required
            />
            <select
              className="field mt-1"
              value={moneyStatus.costB}
              onChange={(event) => setMoneyStatus({ ...moneyStatus, costB: event.target.value as DataStatus })}
            >
              {DATA_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {DATA_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Tindak lanjut harga/biaya (bila belum lengkap)</label>
          <input
            className="field"
            value={moneyStatus.followUp}
            onChange={(event) => setMoneyStatus({ ...moneyStatus, followUp: event.target.value })}
            placeholder="contoh: tanya harga kemasan ke pengurus D'Culinary, Jumat depan"
          />
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="card-tight">
            <p className="muted">Keuntungan per 1 pcs {labelA}</p>
            <p className="font-mono text-lg text-ember-300">{rupiah(profitA)}</p>
          </div>
          <div className="card-tight">
            <p className="muted">Keuntungan per 1 pcs {labelB}</p>
            <p className="font-mono text-lg text-ember-300">{rupiah(profitB)}</p>
          </div>
          <div className="card-tight">
            <p className="muted">Fungsi tujuan (dihitung otomatis dari datamu)</p>
            <p className="font-mono text-lg text-ember-300">
              {profitA !== null && profitB !== null
                ? `Z = ${profitA.toLocaleString("id-ID")}x + ${profitB.toLocaleString("id-ID")}y`
                : "lengkapi harga & biaya"}
            </p>
          </div>
        </div>
        <p className="muted">
          Keuntungan per 1 pcs = harga jual 1 pcs − biaya produksi 1 pcs. Angka ini menjadi koefisien fungsi
          tujuan Z, dengan x menyatakan banyak {labelA} dan y menyatakan banyak {labelB} (dalam pcs).
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Keterbatasan & data minimal</h2>
        <div>
          <label className="field-label">Catatan keterbatasan data / asumsi yang disepakati dengan guru</label>
          <textarea
            className="field min-h-[90px]"
            value={limitations}
            onChange={(event) => setLimitations(event.target.value)}
            placeholder="contoh: berat 1 sendok sayur tidak diukur timbangan, disepakati taksiran 15 gram; harga kemasan tidak diperoleh sehingga diasumsikan Rp500"
          />
        </div>
        <div className="note-info">
          <p className="font-semibold text-cream-100">Data minimal</p>
          <ul className="mt-1 list-disc space-y-1 ps-5">
            {props.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <p className="muted">
          Status sekarang:{" "}
          {readyIngredients.length >= 2 ? (
            <span className="chip chip-ok">{readyIngredients.length} bahan siap dipakai sebagai kendala</span>
          ) : (
            <span className="chip chip-warn">
              {readyIngredients.length} bahan siap — minimal 2 agar bisa lanjut ke Susun Pertidaksamaan
            </span>
          )}
        </p>
      </section>

      {error && <p className="chip chip-bad w-full justify-start">{error}</p>}
      {message && <p className="chip chip-ok w-full justify-start">{message}</p>}
      {warnings.length > 0 && (
        <section className="card">
          <h2 className="section-title text-lg">Peringatan</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-ember-300">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="card flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan data wawancara"}
        </button>
        <span className="muted">
          Data yang tersimpan di server inilah yang menjadi kunci penilaian pada tahap Susun Pertidaksamaan.
        </span>
      </div>
    </form>
  );
}
