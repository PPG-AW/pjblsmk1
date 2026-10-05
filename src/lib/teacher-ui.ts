/** Konstanta kecil untuk komponen dashboard guru (aman di klien). */

export { FINAL_PRODUCT_TYPES, GROUP_ROLES } from "@/lib/sptldv";

export function stageLabelFallback(stage: number): string {
  switch (stage) {
    case 1:
      return "Pertemuan 1 berjalan";
    case 2:
      return "Pertemuan 2 berjalan";
    case 3:
      return "Pertemuan 3 berjalan";
    default:
      return "Pertemuan berjalan";
  }
}
