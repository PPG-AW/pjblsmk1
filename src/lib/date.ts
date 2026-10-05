/**
 * Bantuan tanggal.
 *
 * Aplikasi ini dipakai di Indonesia (WIB, UTC+7) sementara server Vercel berjalan
 * pada UTC. Tanpa zona waktu eksplisit, "hari ini" akan berganti pada pukul 07.00
 * pagi WIB — mengganggu jurnal harian dan pengingatnya. Semua perhitungan tanggal
 * karena itu memakai zona waktu Asia/Jakarta.
 */
const JAKARTA = "Asia/Jakarta";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: JAKARTA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Tanggal hari ini di Jakarta, format YYYY-MM-DD. */
export function todayJakarta(now: Date = new Date()): string {
  // en-CA menghasilkan format YYYY-MM-DD.
  return formatter.format(now);
}

/** Tanggal (YYYY-MM-DD) dalam bahasa Indonesia, mis. "5 Oktober 2026". */
export function formatTanggalJakarta(value: Date | string = new Date()): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00+07:00`) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
