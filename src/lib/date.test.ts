import { describe, expect, it } from "vitest";
import { formatTanggalJakarta, todayJakarta } from "./date";

describe("tanggal zona waktu Jakarta", () => {
  it("menghasilkan format YYYY-MM-DD", () => {
    expect(todayJakarta(new Date("2026-10-05T03:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("memakai WIB (UTC+7), bukan UTC", () => {
    // 04 Okt 16:59 UTC = 04 Okt 23:59 WIB
    expect(todayJakarta(new Date("2026-10-04T16:59:00Z"))).toBe("2026-10-04");
    // 04 Okt 17:00 UTC = 05 Okt 00:00 WIB (sudah ganti hari)
    expect(todayJakarta(new Date("2026-10-04T17:00:00Z"))).toBe("2026-10-05");
    // 05 Okt 06:00 UTC = 05 Okt 13:00 WIB
    expect(todayJakarta(new Date("2026-10-05T06:00:00Z"))).toBe("2026-10-05");
  });

  it("memformat tanggal dalam bahasa Indonesia", () => {
    expect(formatTanggalJakarta("2026-10-05")).toBe("5 Oktober 2026");
    expect(formatTanggalJakarta("2026-01-01")).toBe("1 Januari 2026");
  });

  it("tidak melempar galat untuk nilai aneh", () => {
    expect(formatTanggalJakarta("bukan-tanggal")).toBe("bukan-tanggal");
  });
});
