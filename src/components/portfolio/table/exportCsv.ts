// The CSV behind every table's Export button: exactly the rows the table's filters and search
// match, ALL of them (the old export stopped silently at 5,000), with the on-screen column
// labels. It pages through the very request the table sends, so the file and the screen
// cannot disagree. The file is written for Excel and for code alike:
//   UTF-8 with a BOM (Excel otherwise misreads ₹ and accented names), CRLF line ends, RFC 4180
//   quoting; numbers raw (exact rupees, no lakhs, no digit grouping), dates ISO, booleans Yes/No;
//   text that a spreadsheet would run as a formula (= + - @, tab, CR) gets a leading apostrophe
//   (OWASP CSV injection).
import type { Col } from "@/lib/kpiRegistry";
import { getTable, type Params, type Row } from "./query";

/** Rows per request: 1.7 lakh rows take ~35 requests, and one answer stays a few MB. */
const EXPORT_PAGE = 5000;
/** From this many rows the export asks first: the file is large and slow to build. */
export const CONFIRM_ROWS = 100_000;
/** The most rows one Excel sheet opens. */
export const EXCEL_MAX_ROWS = 1_048_576;

/** An export that cannot finish; the message is for the reader. */
export class ExportError extends Error {}

const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA = /^[=+\-@\t\r]/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]/;

/** One CSV cell by the rules above. Shared with the AI Analyst's table files (lib/aiExport). */
export function csvCell(v: unknown, kind?: Col["kind"]): string {
  if (v == null || v === "") return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  let s = String(v);
  if (kind === "bool" && (s === "true" || s === "false")) return s === "true" ? "Yes" : "No";
  if (kind === "date" && ISO_DATETIME.test(s)) s = s.slice(0, 10);
  if (FORMULA.test(s)) s = `'${s}`;
  return NEEDS_QUOTES.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV lines (each ending CRLF) for `rows`, one cell per column in column order. */
export function csvLines(rows: Row[], columns: Col[]): string {
  let out = "";
  for (const r of rows) out += `${columns.map((c) => csvCell(r[c.field], c.kind)).join(",")}\r\n`;
  return out;
}

/** Roughly how large the file for `total` rows will be, from the rows already on screen;
 *  null when there are none to measure. */
export function estimateBytes(rows: Row[], columns: Col[], total: number): number | null {
  if (!rows.length) return null;
  return (new TextEncoder().encode(csvLines(rows, columns)).length / rows.length) * total;
}

/** Saves `blob` as a download named `fileName`. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked a little later: some browsers read the blob after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Pages through `base` with `params` (the table's scope, filters, search and sort), writes
 *  every row to `fileName` and returns the number of rows written. Each page becomes CSV text
 *  as it arrives, so memory holds text, not row objects. Throws ExportError when the data
 *  changes underneath (a refresh mid-export) and an AbortError when `signal` fires. */
export async function exportAll({ base, params, columns, fileName, onProgress, signal }: {
  base: string;
  params: Params;
  columns: Col[];
  fileName: string;
  onProgress: (done: number, total: number) => void;
  signal: AbortSignal;
}): Promise<number> {
  // Rows carry only the columns on screen; the list keeps full rows for its row clicks.
  const ask = (page: number) => getTable(base, [
    ...params,
    ["page", String(page)], ["page_size", String(EXPORT_PAGE)],
    ["fields", columns.map((c) => c.field).join(",")],
  ], signal);

  const parts: string[] = [`﻿${columns.map((c) => csvCell(c.label)).join(",")}\r\n`];
  let page = 0;
  let d = await ask(page);
  const total = d.total;
  let done = 0;
  for (;;) {
    const rows = d.data ?? [];
    // Every page must count the same rows, and a page short of the total must not be empty;
    // otherwise rows moved between pages and the file would skip or repeat some.
    if (d.total !== total || (!rows.length && done < total)) throw new ExportError("The data changed while exporting, try again.");
    parts.push(csvLines(rows, columns));
    done += rows.length;
    onProgress(Math.min(done, total), total);
    if (done >= total) break;
    d = await ask(++page);
  }
  saveBlob(new Blob(parts, { type: "text/csv;charset=utf-8" }), fileName);
  return done;
}
