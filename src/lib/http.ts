import { NextResponse } from "next/server";
import { assertServerEnv, EnvError } from "@/lib/env";

/** Error HTTP yang aman dikirim ke klien. */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function badRequest(message: string) {
  return new HttpError(400, message);
}

export function unauthorized(message = "Kamu belum masuk. Silakan login dulu.") {
  return new HttpError(401, message);
}

export function forbidden(message = "Kamu tidak punya akses ke bagian ini.") {
  return new HttpError(403, message);
}

export function notFound(message = "Data tidak ditemukan.") {
  return new HttpError(404, message);
}

export function conflict(message: string) {
  return new HttpError(409, message);
}

export function tooManyRequests(message: string) {
  return new HttpError(429, message);
}

type RouteHandler<Ctx> = (request: Request, context: Ctx) => Promise<Response> | Response;

/**
 * Pembungkus route API: memastikan env server lengkap, menerjemahkan HttpError
 * menjadi respons JSON, dan menutupi detail error internal.
 */
export function route<Ctx = unknown>(handler: RouteHandler<Ctx>) {
  return async (request: Request, context: Ctx): Promise<Response> => {
    try {
      assertServerEnv();
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof EnvError) {
        console.error("[env]", error.message);
        return NextResponse.json(
          { error: "Konfigurasi server belum lengkap. Hubungi guru/administrator." },
          { status: 503 },
        );
      }
      console.error("[api]", error);
      return NextResponse.json(
        { error: "Terjadi kesalahan di server. Coba lagi sebentar lagi." },
        { status: 500 },
      );
    }
  };
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const data = (await request.json()) as T;
    if (data === null || typeof data !== "object") {
      throw badRequest("Isi permintaan tidak valid.");
    }
    return data;
  } catch {
    throw badRequest("Isi permintaan harus berupa JSON yang valid.");
  }
}

/** Ambil alamat IP klien dari header proxy (Vercel). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
