import type { NextConfig } from "next";

/**
 * Header keamanan dasar.
 *
 * Catatan: X-Frame-Options hanya dipasang pada deployment Vercel. Di lingkungan
 * pratinjau / lokal halaman perlu bisa dibingkai (iframe) agar bisa ditinjau,
 * sehingga header anti-framing tidak dipasang di sana.
 */
const isVercelDeployment = Boolean(process.env.VERCEL);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ...(isVercelDeployment
    ? [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
