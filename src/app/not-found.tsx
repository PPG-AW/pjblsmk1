import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-xl text-center">
      <h1 className="font-display text-2xl text-cream-100">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-cream-200">
        Alamat yang kamu buka tidak ada di DapurSPtLDV. Kembali ke beranda untuk melanjutkan proyek.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link className="btn btn-primary" href="/dashboard">
          Ke beranda siswa
        </Link>
        <Link className="btn btn-ghost" href="/">
          Halaman masuk
        </Link>
      </div>
    </div>
  );
}
