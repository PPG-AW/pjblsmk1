/**
 * Validasi input di server. Semua pesan galat berbahasa Indonesia dan aman
 * ditampilkan ke siswa/guru.
 */
import { badRequest } from "@/lib/http";

type StringOptions = {
  min?: number;
  max?: number;
  label?: string;
  required?: boolean;
};

export function asString(value: unknown, field: string, options: StringOptions = {}): string {
  const { min = 0, max = 5000, label = field, required = true } = options;
  if (value === undefined || value === null) {
    if (required) throw badRequest(`${label} wajib diisi.`);
    return "";
  }
  if (typeof value !== "string") throw badRequest(`${label} harus berupa teks.`);
  const text = value.trim();
  if (required && text.length === 0) throw badRequest(`${label} wajib diisi.`);
  if (text.length > 0 && text.length < min) {
    throw badRequest(`${label} minimal ${min} karakter.`);
  }
  if (text.length > max) throw badRequest(`${label} maksimal ${max} karakter.`);
  return text;
}

export function optionalString(value: unknown, field: string, options: StringOptions = {}): string | null {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  const text = asString(value, field, { ...options, required: false });
  return text.length > 0 ? text : null;
}

type NumberOptions = {
  min?: number;
  max?: number;
  label?: string;
  required?: boolean;
  integer?: boolean;
};

export function asNumber(value: unknown, field: string, options: NumberOptions = {}): number {
  const {
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    label = field,
    required = true,
    integer = false,
  } = options;

  if (value === undefined || value === null || value === "") {
    if (required) throw badRequest(`${label} wajib diisi.`);
    return 0;
  }

  const num = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(num)) throw badRequest(`${label} harus berupa angka.`);
  if (integer && !Number.isInteger(num)) throw badRequest(`${label} harus berupa bilangan bulat.`);
  if (num < min) throw badRequest(`${label} minimal ${min}.`);
  if (num > max) throw badRequest(`${label} maksimal ${max}.`);
  return num;
}

export function optionalNumber(value: unknown, field: string, options: NumberOptions = {}): number | null {
  if (value === undefined || value === null || value === "") return null;
  return asNumber(value, field, { ...options, required: false });
}

export function asBoolean(value: unknown, field: string): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw badRequest(`${field} harus bernilai true atau false.`);
}

export function asArray<T>(
  value: unknown,
  field: string,
  options: { min?: number; max?: number; label?: string } = {},
  mapper: (item: unknown, index: number) => T,
): T[] {
  const { min = 0, max = 50, label = field } = options;
  if (!Array.isArray(value)) throw badRequest(`${label} harus berupa daftar.`);
  if (value.length < min) throw badRequest(`${label} minimal ${min} baris.`);
  if (value.length > max) throw badRequest(`${label} maksimal ${max} baris.`);
  return value.map(mapper);
}

export function asStringArray(value: unknown, field: string, options: { min?: number; max?: number; label?: string } = {}): string[] {
  return asArray(value, field, options, (item, index) =>
    asString(item, `${options.label ?? field} baris ${index + 1}`, { max: 600, required: false }),
  ).filter((text) => text.length > 0);
}

export function oneOf<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  label = field,
): T {
  const text = asString(value, field, { label, max: 200 });
  if (!(allowed as readonly string[]).includes(text)) {
    throw badRequest(`${label} harus salah satu dari: ${allowed.join(", ")}.`);
  }
  return text as T;
}

/** Nama siswa: minimal 3 huruf, hanya huruf/spasi/titik/apostrof/tanda hubung. */
export function validateStudentName(value: unknown): string {
  const name = asString(value, "name", { min: 3, max: 60, label: "Nama lengkap" });
  const collapsed = name.replace(/\s+/g, " ");
  if (!/^[A-Za-zÀ-ÿ.'\- ]+$/.test(collapsed)) {
    throw badRequest("Nama hanya boleh memuat huruf, spasi, titik, apostrof, dan tanda hubung.");
  }
  const letters = collapsed.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 3) throw badRequest("Nama lengkap minimal 3 huruf.");
  return collapsed;
}

export function normalizePin(value: unknown): string {
  const pin = asString(value, "pin", { min: 6, max: 6, label: "PIN kelompok" }).toUpperCase();
  if (!/^[0-9A-Z]{6}$/.test(pin)) {
    throw badRequest("PIN terdiri dari 6 karakter angka/huruf.");
  }
  return pin;
}
