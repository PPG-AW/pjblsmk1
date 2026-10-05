/** Pemanggil API dari komponen klien. Aman dipakai di peramban. */

export type ApiError = { error: string };

export async function apiFetch<T>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as T | ApiError)
    : (({ error: await response.text() } as unknown) as ApiError);

  if (!response.ok) {
    const message = (payload as ApiError)?.error ?? `Permintaan gagal (${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}
