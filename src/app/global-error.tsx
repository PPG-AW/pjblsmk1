"use client";

/**
 * Batas galat tingkat akar (dipakai bila layout utama sendiri gagal render).
 * Sengaja memakai gaya sebaris karena berkas CSS global mungkin belum termuat.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#100c0a",
          color: "#f1e4d3",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "560px" }}>
          <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>Aplikasi gagal dimuat</h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6 }}>
            Muat ulang halaman ini. Bila tetap gagal, mungkin sambungan data sedang bermasalah. Minta guru memeriksa
            pengaturan aplikasi, lalu coba lagi.
          </p>
          <p style={{ fontSize: "12px", opacity: 0.7 }}>
            Kode galat untuk dilaporkan ke guru: {error.digest ? <span>{error.digest}</span> : "tidak ada"}
            {" · "}
            <a href="/api/health" style={{ color: "#f2a25c" }}>
              keterangan teknis
            </a>
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "12px",
              background: "#f2a25c",
              color: "#100c0a",
              border: 0,
              borderRadius: "10px",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
