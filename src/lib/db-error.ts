/**
 * Pengenalan galat koneksi database Postgres terkelola (Neon, Supabase, …).
 *
 * Dua kelompok galat yang paling sering muncul:
 *
 * 1. `unreachable` — database tidak bisa dihubungi sama sekali:
 *    - Neon (paket gratis) menidurkan compute setelah 5 menit menganggur dan
 *      bangun otomatis dalam ratusan milidetik — koneksi pertama bisa meleset;
 *    - string koneksi salah / password salah / host keliru;
 *    - kuota paket gratis habis sehingga endpoint dinonaktifkan.
 *    Gejala: `Tenant or user not found`, `ENOTFOUND`, `ECONNREFUSED`,
 *    `password authentication failed`, `endpoint has been disabled`, dsb.
 * 2. `dropped` — koneksi diputus sesaat oleh pooler/serverless
 *    (`connection to client lost`, `Connection terminated unexpectedly`).
 *
 * Keduanya dikembalikan ke siswa/guru sebagai pesan bahasa Indonesia yang
 * menjelaskan apa yang harus dilakukan, bukan "Terjadi kesalahan di server".
 */

export type DatabaseFailure = {
  kind: "unreachable" | "dropped";
  status: number;
  message: string;
};

const UNREACHABLE_PATTERNS: RegExp[] = [
  /tenant or user not found/i,
  /ENOTFOUND/i,
  /getaddrinfo/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /timeout exceeded when trying to connect/i,
  /connect timeout error/i,
  /connection timeout/i,
  /password authentication failed/i,
  /no pg_hba\.conf entry/i,
  /Cannot connect to the database/i,
  /endpoint has been disabled/i,
  /endpoint is disabled/i,
  /compute.*(disabled|suspended)/i,
  /project.*(suspended|disabled)/i,
  /quota/i,
];

const DROPPED_PATTERNS: RegExp[] = [
  /connection to client lost/i,
  /Connection terminated/i,
  /server closed the connection unexpectedly/i,
  /Client has encountered a connection error/i,
  /ECONNRESET/i,
  /EPIPE/i,
  /socket hang up/i,
  /Connection closed/i,
  /CONNECTION_CLOSED/i,
  /terminating connection/i,
  /too many clients/i,
  /remaining connection slots are reserved/i,
];

function messageOf(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    const causeText =
      cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
    return `${error.name}: ${error.message} ${causeText}`;
  }
  return String(error ?? "");
}

/** Kelompokkan galat koneksi; `null` bila bukan galat koneksi. */
export function databaseFailure(error: unknown): DatabaseFailure | null {
  const text = messageOf(error);
  if (text.trim() === "") return null;

  if (UNREACHABLE_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      kind: "unreachable",
      status: 503,
      message:
        "Database belum bisa dihubungi. Bila memakai Neon, database yang menganggur butuh beberapa detik " +
        "untuk bangun — coba lagi sebentar lagi. Bila tetap gagal, minta guru memeriksa string koneksi " +
        "(DATABASE_URL) di Vercel.",
    };
  }

  if (DROPPED_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      kind: "dropped",
      status: 503,
      message:
        "Koneksi ke database terputus sesaat. Coba sekali lagi — tekan tombol yang tadi. " +
        "Belum tentu data tersimpan, jadi pastikan formulirmu masih terisi sebelum menekan ulang.",
    };
  }

  return null;
}

export function isConnectionError(error: unknown): boolean {
  return databaseFailure(error) !== null;
}
