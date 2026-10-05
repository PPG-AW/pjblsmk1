/** Utilitas ekspor CSV (aman untuk Excel: BOM + escaping). */

export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",;\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows: CsvCell[][], delimiter = ";"): string {
  return rows.map((row) => row.map(escapeCell).join(delimiter)).join("\r\n");
}

export function csvResponse(filename: string, rows: CsvCell[][]): Response {
  const body = `\uFEFF${toCsv(rows)}`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function timestampSuffix(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
