// Export helpers for the AI Analyst — a single answer or the whole conversation,
// to Excel (SheetJS) or PDF (jsPDF + Plotly image + autotable).
import type { AiMsg } from "@/context/AiChatContext";
// One formatting layer, shared with the on-screen table. Everything below used to format
// its own way, which is why the export shipped "2,025", "total_qty" and "plant" long after
// the screen was correct.
import { codeFirst, fmtValue, humanLabels, hospitalise, kindOf } from "@/lib/aiFormat";
import { csvCell, saveBlob } from "@/components/portfolio/table/exportCsv";

export type Turn = { question: string; answer: string; figures: any[]; tables: NonNullable<AiMsg["table"]>[] };

/** Resolve each column's unit the same way the screen does, rather than trusting the
 *  `kind` the backend guessed — `year` arrives as a number and printed as "2,025". */
const colKinds = (cols: any[], rows: any[]): string[] =>
  cols.map((c: any) => kindOf(c.key || c.label, rows.find((r) => r?.[c.key] != null)?.[c.key], c.kind));

const FONTFMT = (v: any, kind?: string): string => (v === null || v === undefined || v === "" ? "" : fmtValue(v, kind));

export function groupTurns(messages: AiMsg[]): Turn[] {
  const turns: Turn[] = [];
  let cur: Turn | null = null;
  for (const m of messages) {
    if (m.role === "user") { cur = { question: m.text || "", answer: "", figures: [], tables: [] }; turns.push(cur); }
    else if (cur) {
      if (m.kind === "text") cur.answer += (cur.answer ? "\n\n" : "") + (m.text || "");
      else if (m.kind === "plotly" && m.figure) cur.figures.push(m.figure);
      else if (m.kind === "table" && m.table) cur.tables.push(m.table);
    }
  }
  return turns.filter((t) => t.question || t.answer || t.tables.length);
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const clean = (s: string, n = 28) => (s || "sheet").replace(/[^\w ]+/g, "").trim().slice(0, n) || "sheet";

// jsPDF's built-in Helvetica can't render ₹ (U+20B9) or emoji — swap ₹→"Rs " and drop
// anything outside Latin-1 so the PDF never shows garbage glyphs.
const pdfSafe = (s: any): string => String(s ?? "").replace(/₹\s?/g, "Rs ").replace(/[^\n\r\t\x20-\xFF]/g, "");
// Strip markdown so the answer reads as clean prose in the PDF (no raw pipe-tables).
const pdfProse = (s: string): string => (s || "")
  .split("\n")
  .filter((ln) => (ln.match(/\|/g) || []).length < 2)   // drop markdown table rows
  .join("\n")
  .replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_`]/g, "")
  .replace(/^#{1,6}\s*/gm, "").replace(/^\s*[-•]\s*/gm, "• ")
  .replace(/\n{3,}/g, "\n\n").trim();

// ── EXCEL ─────────────────────────────────────────────────────────────────
export async function exportExcel(turns: Turn[], filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const convo = turns.map((t, i) => ({ "#": i + 1, Question: t.question, Answer: t.answer.replace(/\n+/g, " ") }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(convo.length ? convo : [{ Question: "", Answer: "" }]), "Conversation");
  const used = new Set<string>(["Conversation"]);
  turns.forEach((t, ti) => {
    t.tables.forEach((tbl, bi) => {
      const cols = codeFirst(tbl.columns || []);
      const rows = (tbl.rows || []).map((r: any) => {
        const o: any = {};
        const labels = humanLabels(cols.map((c: any) => c.label || c.key));
        const kinds = colKinds(cols, tbl.rows || []);
        cols.forEach((c: any, i: number) => { o[labels[i]] = FONTFMT(r[c.key], kinds[i]); });
        return o;
      });
      let name = clean(tbl.title || `Q${ti + 1}`, 22) + (t.tables.length > 1 ? `_${bi + 1}` : "");
      let nm = name; let k = 1; while (used.has(nm)) nm = `${name}_${k++}`.slice(0, 31);
      used.add(nm);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ note: "no rows" }]), nm.slice(0, 31));
    });
  });
  XLSX.writeFile(wb, `${filename}-${stamp()}.xlsx`);
}

// ── PDF ───────────────────────────────────────────────────────────────────
async function figureToPng(figure: any): Promise<string | null> {
  try {
    // A dynamic import, not require(): the require was resolved at build time and pulled
    // Plotly into the chat's chunk, which the floater then loaded on every dashboard page.
    const mod: any = await import("plotly.js-dist-min");
    const Plotly = mod.default ?? mod;
    // The exported PNG rendered the RAW backend figure — still in #3b5bdb, a blue that
    // appears nowhere in this product, with "plants" in its title. Theme it the same way
    // the on-screen chart is themed before rasterising.
    const { themeFigure } = await import("@/components/ai/plotlyTheme");
    const themed = themeFigure(figure);
    const layout = { ...themed.layout, paper_bgcolor: "#fff", plot_bgcolor: "#fff" };
    if (layout.title?.text) layout.title = { ...layout.title, text: hospitalise(String(layout.title.text)) };
    return await Plotly.toImage({ data: themed.data, layout }, { format: "png", width: 820, height: 420, scale: 1.4 });
  } catch { return null; }
}

export async function exportPdf(turns: Turn[], title: string) {
  // `.default`, not `{ jsPDF }`: package.json still carries @types/jspdf 1.3 (`export =`),
  // which shadows jspdf 3's own types, so the named import fails to type-check (TS2339)
  // though the ES build exports both. Typed loosely until that stale package is removed.
  const JsPDF: any = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;
  const ensure = (h: number) => { if (y + h > doc.internal.pageSize.getHeight() - M) { doc.addPage(); y = M; } };

  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(31, 35, 51);
  doc.text("HCG AI Analyst", M, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(140, 145, 160);
  doc.text(new Date().toLocaleString(), M, y); y += 20;

  for (const t of turns) {
    ensure(70);
    if (t.question) {
      // question chip
      doc.setFillColor(65, 59, 53); doc.roundedRect(M, y - 12, Math.min(doc.getTextWidth(pdfSafe(t.question)) + 34, W - 2 * M), 22, 5, 5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
      doc.text(pdfSafe(hospitalise(t.question)).slice(0, 120), M + 12, y + 3); y += 22;
    }
    if (t.answer) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(55, 62, 82);
      const a = doc.splitTextToSize(pdfSafe(hospitalise(pdfProse(t.answer))), W - 2 * M);
      ensure(a.length * 14 + 6);
      doc.text(a, M, y); y += a.length * 14 + 10;
    }
    for (const fig of t.figures) {
      const png = await figureToPng(fig);
      if (png) { const h = (W - 2 * M) * (420 / 820); ensure(h + 12); doc.addImage(png, "PNG", M, y, W - 2 * M, h); y += h + 14; }
    }
    for (const tbl of t.tables) {
      const cols = codeFirst(tbl.columns || []);
      const rowsAll = tbl.rows || [];
      const labels = humanLabels(cols.map((c: any) => c.label || c.key));
      const kinds = colKinds(cols, rowsAll);
      const head = [labels.map((l) => pdfSafe(l))];
      const body = rowsAll.slice(0, 40).map((r: any) => cols.map((c: any, i: number) => pdfSafe(FONTFMT(r[c.key], kinds[i]))));
      ensure(60);
      autoTable(doc, { head, body, startY: y, margin: { left: M, right: M }, styles: { fontSize: 8.5, cellPadding: 4, font: "helvetica" },
        headStyles: { fillColor: [65, 59, 53], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [247, 248, 251] }, theme: "grid" });
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 16;
    }
    // divider
    ensure(14); doc.setDrawColor(235, 237, 242); doc.line(M, y, W - M, y); y += 16;
  }
  doc.save(`${clean(title, 30)}-${stamp()}.pdf`);
}

// ── ONE TABLE, TO SHARE ───────────────────────────────────────────────────
// Each table under an answer can be copied (into an email, chat or sheet), saved as a CSV, or
// handed to the device's share sheet, in the order and units the screen shows: the code column
// first (aiFormat.codeFirst), the same labels. A copy carries the printed values ("₹9.68 Cr"),
// the CSV the exact ones (9.68e7, as every Export in the app writes them).
type AiTable = NonNullable<AiMsg["table"]>;

/** The table as the screen lays it out: columns code first, their labels and units. */
export function tableLayout(table: AiTable) {
  const cols = codeFirst(table.columns || []);
  const rows = table.rows || [];
  return { cols, rows, labels: humanLabels(cols.map((c: any) => c.label || c.key)), kinds: colKinds(cols, rows) };
}

const tableName = (table: AiTable) => clean(hospitalise(table.title || "AI Analyst table"), 48).replace(/\s+/g, "-");

/** Tab-separated printed values: pastes as a table into Excel, Sheets and most chat apps. */
export function tableTsv(table: AiTable): string {
  const { cols, rows, labels, kinds } = tableLayout(table);
  const line = (cells: string[]) => cells.map((v) => v.replace(/[\t\r\n]+/g, " ")).join("\t");
  return [line(labels), ...rows.map((r: any) => line(cols.map((c: any, i: number) => FONTFMT(r[c.key], kinds[i]))))].join("\n");
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The same table as HTML: pastes as a formatted table into Outlook, Gmail and Word. */
export function tableHtml(table: AiTable): string {
  const { cols, rows, labels, kinds } = tableLayout(table);
  const td = "border:1px solid #d9d4c6;padding:4px 8px;font:12px Arial,sans-serif";
  const right = (k: string) => (["text", "id", "bool"].includes(k) ? "" : ";text-align:right");
  const head = labels.map((l, i) => `<th style="${td};background:#f3efe4;font-weight:bold${right(kinds[i])}">${esc(l)}</th>`).join("");
  const body = rows.map((r: any) => `<tr>${cols.map((c: any, i: number) => `<td style="${td}${right(kinds[i])}">${esc(FONTFMT(r[c.key], kinds[i]))}</td>`).join("")}</tr>`).join("");
  const title = table.title ? `<p style="font:bold 13px Arial,sans-serif;margin:0 0 6px">${esc(hospitalise(table.title))}</p>` : "";
  const note = table.note ? `<p style="font:11px Arial,sans-serif;color:#6b7280;margin:6px 0 0">${esc(table.note)}</p>` : "";
  return `${title}<table style="border-collapse:collapse"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${note}`;
}

/** The table as a CSV file: exact values, the code column first, Excel-safe (BOM, quoting). */
export function tableCsvFile(table: AiTable): File {
  const { cols, rows, labels } = tableLayout(table);
  const lines = [labels.map((l) => csvCell(l)).join(","), ...rows.map((r: any) => cols.map((c: any) => csvCell(r[c.key])).join(","))];
  return new File([`\uFEFF${lines.join("\r\n")}\r\n`], `${tableName(table)}-${stamp()}.csv`, { type: "text/csv;charset=utf-8" });
}

/** Copies the table, formatted where the target takes HTML and as tab-separated text where
 *  it does not. Resolves false when the browser refuses the clipboard. */
export async function copyTable(table: AiTable): Promise<boolean> {
  const tsv = tableTsv(table);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([tableHtml(table)], { type: "text/html" }),
        "text/plain": new Blob([tsv], { type: "text/plain" }),
      })]);
      return true;
    }
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    // The Clipboard API needs a secure context; an http:// box falls back to the old path.
    const ta = document.createElement("textarea");
    ta.value = tsv; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}

/** Saves the table as a CSV download. */
export function downloadTableCsv(table: AiTable): void {
  const f = tableCsvFile(table);
  saveBlob(f, f.name);
}

/** Whether this device can hand a file to its share sheet (most phones, Windows and macOS). */
export function canShareFiles(): boolean {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare) return false;
    return navigator.canShare({ files: [new File(["x"], "x.csv", { type: "text/csv" })] });
  } catch {
    return false;
  }
}

/** Hands the table's CSV to the device's share sheet (mail, Teams, WhatsApp…). Resolves false
 *  when the reader closes the sheet or the device refuses. */
export async function shareTable(table: AiTable, question?: string): Promise<boolean> {
  const file = tableCsvFile(table);
  try {
    await navigator.share({ files: [file], title: hospitalise(table.title || "AI Analyst table"), text: question ? hospitalise(question) : undefined });
    return true;
  } catch {
    return false;
  }
}
