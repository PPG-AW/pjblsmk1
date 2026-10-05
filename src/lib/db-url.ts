/**
 * Pembersih URL koneksi database.
 *
 * Penyedia Postgres terkelola (Neon, Supabase, Aiven, …) kadang menambahkan
 * parameter tambahan pada string koneksi yang **hanya dipahami oleh klien
 * libpq/psql**, misalnya `channel_binding=require`. Paket `postgres`
 * (postgres-js) meneruskan parameter yang tidak dikenal ke server sebagai
 * parameter startup, dan Postgres menolaknya:
 *
 *   FATAL: unrecognized configuration parameter "channel_binding"
 *
 * Karena itu URL dibersihkan dulu: hanya parameter yang benar-benar dipahami
 * postgres-js yang dibiarkan (terutama `sslmode`, yang wajib untuk Neon).
 */
const ALLOWED_QUERY_PARAMS = new Set(["sslmode", "application_name"]);

/** Parameter yang dibuang tanpa dicatat (bising, bukan masalah). */
const SILENT_PARAMS = new Set(["channel_binding", "target_session_attrs", "sslmode_extra"]);

export type SanitizedUrl = { url: string; removed: string[] };

/** Buang parameter kueri yang tidak dikenal; kembalikan URL bersih + daftar yang dibuang. */
export function sanitizeConnectionUrl(url: string): SanitizedUrl {
  const hashIndex = url.indexOf("#");
  const withoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf("?");
  if (queryIndex === -1) return { url: withoutHash, removed: [] };

  const base = withoutHash.slice(0, queryIndex);
  const query = withoutHash.slice(queryIndex + 1);

  const kept: string[] = [];
  const removed: string[] = [];
  for (const pair of query.split("&")) {
    if (pair.trim() === "") continue;
    const key = (pair.split("=")[0] ?? "").trim().toLowerCase();
    if (ALLOWED_QUERY_PARAMS.has(key)) {
      kept.push(pair);
    } else if (!SILENT_PARAMS.has(key)) {
      removed.push(key);
    } else {
      removed.push(key);
    }
  }

  const cleaned = kept.length > 0 ? `${base}?${kept.join("&")}` : base;
  return { url: cleaned, removed };
}
