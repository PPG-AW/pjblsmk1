/**
 * Validasi tautan luar (Google Drive, YouTube). Hanya https + domain resmi.
 */
import { badRequest } from "@/lib/http";

export const ALLOWED_LINK_HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
] as const;

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
  "Tautan harus berupa alamat https dari Google Drive (drive.google.com / docs.google.com) atau YouTube (youtube.com / youtu.be).";

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

/** Ubah tautan YouTube menjadi URL embed (hanya untuk domain terverifikasi). */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url || !isAllowedExternalLink(url)) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;
    if (host === "youtu.be" || host === "www.youtu.be") {
      videoId = parsed.pathname.slice(1).split("/")[0] ?? null;
    } else if (parsed.pathname.startsWith("/embed/")) {
      videoId = parsed.pathname.split("/")[2] ?? null;
    } else if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/shorts/")) {
      videoId = parsed.pathname.split("/")[2] ?? null;
    }
    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}
