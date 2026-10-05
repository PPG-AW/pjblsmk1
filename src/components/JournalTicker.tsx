"use client";

import Link from "next/link";

/**
 * Notice berjalan (marquee) pengingat jurnal harian.
 *
 * Muncul untuk siswa yang sudah masuk fase proyek (sudah bergabung di kelompok),
 * karena jurnal diisi setiap hari kegiatan — bukan hanya saat pertemuan di kelas.
 * Teksnya berjalan pelan, berhenti saat disorot kursor, dan otomatis menjadi teks
 * biasa bila pengguna mengaktifkan "kurangi gerakan" (prefers-reduced-motion).
 */
export default function JournalTicker({
  hasJournalToday,
  reminder,
}: {
  hasJournalToday: boolean;
  reminder: string | null;
}) {
  const parts: string[] = [];

  if (hasJournalToday) {
    parts.push("Jurnal hari ini sudah kamu isi — terima kasih! Isi lagi setiap hari kegiatan berikutnya.");
  } else {
    parts.push(
      "Pengingat: jurnal hari ini belum diisi. Tulis apa yang kelompokmu kerjakan + kontribusimu (wajib, minimal 10 karakter).",
    );
  }
  parts.push("Jurnal diisi setiap hari, termasuk hari tanpa pertemuan kelas.");
  if (reminder) parts.push(`Pesan guru: ${reminder}`);

  const text = parts.join("   •   ");

  return (
    <div className={`ticker ${hasJournalToday ? "ticker-ok" : "ticker-warn"}`} role="status">
      <span className="ticker-label">{hasJournalToday ? "Jurnal ✓" : "Jurnal harian"}</span>
      <div className="ticker-viewport">
        <div className="ticker-track">
          <span className="ticker-text">{text}</span>
          <span className="ticker-text" aria-hidden="true">
            {text}
          </span>
        </div>
      </div>
      <Link className="ticker-action" href="/proyek/jurnal">
        {hasJournalToday ? "Lihat jurnal" : "Isi jurnal sekarang"}
      </Link>
    </div>
  );
}
