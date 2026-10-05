/**
 * Validasi tautan luar (Google Drive saja). Hanya https + domain resmi.
 *
 * Proyek ini tidak memakai video maupun unggahan berkas: satu-satunya berkas
 * yang diunggah siswa adalah produk akhir, dan unggahannya dilakukan ke
 * Google Drive lalu tautannya ditempel di halaman Produk akhir.
 */
import { badRequest } from "@/lib/http";

export const ALLOWED_LINK_HOSTS = ["drive.google.com", "docs.google.com"] as const;

export function isAllowedExternalLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return (ALLOWED_LINK_HOSTS as readonly string[]).includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export const LINK_ERROR_MESSAGE =
  "Tautan harus berupa alamat https dari Google Drive (drive.google.com atau docs.google.com).";

/** Mengembalikan tautan yang sudah divalidasi, atau null bila kosong. */
export function normalizeExternalLink(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw badRequest(LINK_ERROR_MESSAGE);
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > 500) throw badRequest("Tautan terlalu panjang (maksimal 500 karakter).");
  if (!isAllowedExternalLink(trimmed)) throw badRequest(LINK_ERROR_MESSAGE);
  return trimmed;
}

export const DRIVE_SHARING_REMINDER =
  'Pastikan akses file di Drive sudah diatur menjadi "siapa saja yang memiliki tautan dapat melihat".';

export const INTERVIEW_ETHICS_TEXT =
  "Kami memahami etika wawancara: meminta izin, bersikap sopan, tidak mengganggu proses produksi, dan mencatat data apa adanya (tidak mengarang data).";
