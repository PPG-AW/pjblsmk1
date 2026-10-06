import { redirect } from "next/navigation";
import MarkDoneButton from "@/components/MarkDoneButton";
import { getProgressItems } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import {
  SAMPLE_CORNERS,
  SAMPLE_DATA_LABEL,
  SAMPLE_MODEL_LINES,
  SAMPLE_OBJECTIVE,
  SAMPLE_OPTIMUM,
  SAMPLE_PRODUCTS,
} from "@/lib/sptldv";

export const dynamic = "force-dynamic";

export default async function ModulePage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");

  const progressItems = await getProgressItems(session.student.id);

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">Fase Memahami · 2 dari 4</p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Modul: tiga langkah menyelesaikan SPtLDV</h1>
        <p className="muted mt-2">
          Tiga bagian berikut adalah inti materi. Baca berurutan, lalu uji kesiapanmu di halaman kuis.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Bagian 1: Menyusun model matematika</h2>
        <div className="prose-block">
          <p>
            <strong>1) Tentukan variabel.</strong> Misalkan x = banyaknya produk A yang dibuat dan y = banyaknya
            produk B yang dibuat (dalam satuan pcs).
          </p>
          <p>
            <strong>2) Susun kendala.</strong> Setiap keterbatasan (stok bahan, kapasitas, permintaan) menjadi satu
            pertidaksamaan linear dua variabel. Untuk bahan: (kebutuhan per pcs A)·x + (kebutuhan per pcs B)·y ≤
            stok yang tersedia. Tambahkan syarat x ≥ 0 dan y ≥ 0 karena banyak produk tidak mungkin negatif.
          </p>
          <p>
            <strong>3) Tentukan fungsi tujuan.</strong> Keuntungan per pcs = harga jual 1 pcs − biaya produksi 1 pcs.
            Fungsi tujuan: Z = (untung per pcs A)·x + (untung per pcs B)·y yang akan dimaksimumkan.
          </p>
        </div>

        <div className="card-tight">
          <h3 className="font-display text-lg text-ember-300">Ringkasan {SAMPLE_DATA_LABEL}</h3>
          <div className="table-wrap mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Beras (gram/pcs)</th>
                  <th>Ayam (gram/pcs)</th>
                  <th>Harga jual</th>
                  <th>Biaya produksi</th>
                  <th>Keuntungan/pcs</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Nasi ayam (x)</td>
                  <td>100</td>
                  <td>80</td>
                  <td>{formatRupiah(SAMPLE_PRODUCTS.priceA)}</td>
                  <td>{formatRupiah(SAMPLE_PRODUCTS.costA)}</td>
                  <td>{formatRupiah(SAMPLE_PRODUCTS.profitA)}</td>
                </tr>
                <tr>
                  <td>Rice bowl (y)</td>
                  <td>150</td>
                  <td>40</td>
                  <td>{formatRupiah(SAMPLE_PRODUCTS.priceB)}</td>
                  <td>{formatRupiah(SAMPLE_PRODUCTS.costB)}</td>
                  <td>{formatRupiah(SAMPLE_PRODUCTS.profitB)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted mt-2">Stok bahan tersedia: beras 6.000 gram dan ayam 4.000 gram.</p>
          <div className="mt-3 rounded-xl border border-kitchen-700 bg-kitchen-950/60 p-3 font-mono text-sm text-cream-100">
            <p>Model matematika (data contoh):</p>
            <p>{SAMPLE_MODEL_LINES[0]!.replace(/<=/, "≤")}</p>
            <p>{SAMPLE_MODEL_LINES[1]!.replace(/<=/, "≤")}</p>
            <p>x ≥ 0</p>
            <p>y ≥ 0</p>
            <p className="text-ember-300">{SAMPLE_OBJECTIVE}</p>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Bagian 2: Menggambar grafik dan daerah penyelesaian (DHP)</h2>
        <div className="prose-block">
          <p>
            <strong>1)</strong> Ubah setiap pertidaksamaan menjadi persamaan garis, lalu gambar garisnya: cari titik
            potong dengan sumbu X (y = 0) dan sumbu Y (x = 0).
          </p>
          <p>
            <strong>2)</strong> Uji satu titik yang mudah, misalnya (0, 0). Bila memenuhi pertidaksamaan, arsir
            bagian yang memuat titik itu; bila tidak, arsir bagian sebaliknya.
          </p>
          <p>
            <strong>3)</strong> DHP adalah irisan (bagian bersama) semua daerah tersebut. Gunakan tanda ≤ atau ≥
            untuk garis penuh (garis termasuk batas), dan &lt; atau &gt; untuk garis putus-putus.
          </p>
          <p>
            Di Lab Grafik, kamu cukup mengetik pertidaksamaannya, lalu garis dan arsiran DHP tergambar. Titik pojok
            tidak ditandai otomatis, agar kamu berlatih menentukannya sendiri.
          </p>
        </div>
        <div className="note-info">
          Contoh data contoh: garis 100x + 150y = 6.000 memotong sumbu X di (60, 0) dan sumbu Y di (0, 40). Titik
          (0, 0) memenuhi 100x + 150y ≤ 6.000, jadi daerah yang memuat (0, 0) yang diarsir.
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Bagian 3: Titik pojok dan nilai optimum</h2>
        <div className="prose-block">
          <p>
            <strong>1)</strong> Tentukan semua titik pojok (titik sudut) DHP. Titik pojok berasal dari perpotongan
            garis batas dengan sumbu atau dengan garis batas lain.
          </p>
          <p>
            <strong>2)</strong> Hitung nilai Z pada setiap titik pojok.
          </p>
          <p>
            <strong>3)</strong> Bandingkan: nilai Z terbesar adalah keuntungan maksimum (untuk fungsi yang
            dimaksimumkan). Tuliskan jawabannya sebagai kalimat, misalnya &ldquo;sebaiknya dibuat … porsi produk A
            dan … porsi produk B&rdquo;.
          </p>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Titik pojok (x, y)</th>
                <th>Substitusi ke Z = 6.000x + 7.000y</th>
                <th>Nilai Z</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_CORNERS.map((corner) => (
                <tr key={`${corner.x}-${corner.y}`}>
                  <td className="font-mono">
                    ({corner.x}, {corner.y})
                  </td>
                  <td className="font-mono">
                    {corner.x > 0 ? `6.000(${corner.x})` : "0"}
                    {corner.y > 0 ? ` + 7.000(${corner.y})` : ""}
                  </td>
                  <td className="font-mono text-ember-300">{formatRupiah(corner.z)}</td>
                  <td>{corner.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="note">
          Keuntungan maksimum pada data contoh adalah <strong>{formatRupiah(SAMPLE_OPTIMUM.z)}</strong>, yaitu{" "}
          {SAMPLE_OPTIMUM.text}
        </p>
        <p className="muted">
          Ingat: ini contoh. Untuk proyek kelompokmu, gunakan data hasil wawancara D&apos;Culinary yang kalian
          kumpulkan sendiri.
        </p>

        <MarkDoneButton item="modul" alreadyDone={progressItems.has("modul")} />
      </section>
    </div>
  );
}
