// Export helpers for the AI Analyst — a single answer or the whole conversation,
// to Excel (SheetJS) or PDF (jsPDF + Plotly image + autotable).
import type { AiMsg } from "@/context/AiChatContext";

export type Turn = { question: string; answer: string; figures: any[]; tables: NonNullable<AiMsg["table"]>[] };

const FONTFMT = (v: any, kind?: string): string => {
  if (v === null || v === undefined || v === "") return "";
  if (!kind || kind === "text") return String(v);
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (kind === "inr") { const a = Math.abs(n); if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`; return `₹${Math.round(n)}`; }
  if (kind === "pct") return `${n.toFixed(1)}%`;
  if (kind === "days") return `${Math.round(n)} d`;
  return n.toLocaleString("en-IN");
};

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

// ── EXCEL ─────────────────────────────────────────────────────────────────
export async function exportExcel(turns: Turn[], filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const convo = turns.map((t, i) => ({ "#": i + 1, Question: t.question, Answer: t.answer.replace(/\n+/g, " ") }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(convo.length ? convo : [{ Question: "", Answer: "" }]), "Conversation");
  const used = new Set<string>(["Conversation"]);
  turns.forEach((t, ti) => {
    t.tables.forEach((tbl, bi) => {
      const cols = tbl.columns || [];
      const rows = (tbl.rows || []).map((r: any) => {
        const o: any = {};
        cols.forEach((c: any) => { o[c.label || c.key] = c.kind === "text" ? r[c.key] : (typeof r[c.key] === "number" ? r[c.key] : r[c.key]); });
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Plotly = require("plotly.js-dist-min");
    return await Plotly.toImage({ data: figure.data, layout: { ...figure.layout, paper_bgcolor: "#fff", plot_bgcolor: "#fff" } }, { format: "png", width: 820, height: 420, scale: 1.4 });
  } catch { return null; }
}

export async function exportPdf(turns: Turn[], title: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;
  const ensure = (h: number) => { if (y + h > doc.internal.pageSize.getHeight() - M) { doc.addPage(); y = M; } };

  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(31, 35, 51);
  doc.text("HCG AI Analyst", M, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(140, 145, 160);
  doc.text(new Date().toLocaleString(), M, y); y += 20;

  for (const t of turns) {
    ensure(60);
    if (t.question) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(31, 35, 51);
      const q = doc.splitTextToSize(`Q:  ${t.question}`, W - 2 * M);
      doc.text(q, M, y); y += q.length * 15 + 4;
    }
    if (t.answer) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(60, 70, 92);
      const a = doc.splitTextToSize(t.answer.replace(/\*\*/g, ""), W - 2 * M);
      ensure(a.length * 14);
      doc.text(a, M, y); y += a.length * 14 + 8;
    }
    for (const fig of t.figures) {
      const png = await figureToPng(fig);
      if (png) { const h = (W - 2 * M) * (460 / 900); ensure(h + 10); doc.addImage(png, "PNG", M, y, W - 2 * M, h); y += h + 12; }
    }
    for (const tbl of t.tables) {
      const cols = tbl.columns || [];
      const head = [cols.map((c: any) => c.label || c.key)];
      const body = (tbl.rows || []).slice(0, 40).map((r: any) => cols.map((c: any) => FONTFMT(r[c.key], c.kind)));
      ensure(60);
      autoTable(doc, { head, body, startY: y, margin: { left: M, right: M }, styles: { fontSize: 8.5, cellPadding: 4 },
        headStyles: { fillColor: [75, 123, 212], textColor: 255 }, alternateRowStyles: { fillColor: [247, 248, 251] }, theme: "grid" });
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 14;
    }
    y += 8;
    ensure(1);
  }
  doc.save(`${clean(title, 30)}-${stamp()}.pdf`);
}
