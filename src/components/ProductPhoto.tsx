"use client";

import { useState } from "react";

/**
 * Foto produk dengan cadangan (fallback) bila berkas gambar belum tersedia.
 */
export default function ProductPhoto({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="card-tight overflow-hidden">
      {failed ? (
        <div className="grid h-32 place-items-center rounded-lg border border-dashed border-kitchen-600 bg-kitchen-950/60 text-center">
          <span className="px-3 font-mono text-xs text-cream-400">{alt}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- gambar statis lokal
        <img
          src={src}
          alt={alt}
          className="h-32 w-full rounded-lg object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      <figcaption className="mt-2 text-xs text-cream-300">{caption ?? alt}</figcaption>
    </figure>
  );
}
