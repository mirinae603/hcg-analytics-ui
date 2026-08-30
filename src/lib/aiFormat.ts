// ── ONE formatting layer for every surface that shows an AI Analyst result ────
//
// This exists because there were two. Column labels, value units and the Plant→Hospital
// rule were all implemented inside AiChat.tsx, so the screen was correct while the PDF
// export — a completely separate render path — shipped raw: a year printed "2,025", a
// column headed "total_qty", a hospital called a "plant", and a chart still in the old
// blue. Every fix made to the component silently missed the export.
//
// So the rule is: nothing formats an AI result except this file. The React table, the PDF
// and the Excel sheet all read from here, and a fix lands in all three at once.

/** Units are decided by column NAME, and the order of these tests matters.
 *  `value_share_pct` contains "value", so a money-first check typed a percentage as
 *  rupees and printed "₹85". `year` is numeric, so it typed as a measure, got charted,
 *  and produced twelve identical bars reading "2,026". Narrow suffixes go first;
 *  "money" is the fallback, never the opening guess. */
export type Kind = "text" | "id" | "inr" | "pct" | "days" | "num";

const IDENTIFIER = /^(year|yr|month_num|week|quarter|id|.*_id|.*_code|material|plant|po_no|gr_no|invoice.*)$/i;

export function kindOf(col: string, sample?: unknown, declared?: string): Kind {
  const c = (col || "").toLowerCase();
  if (IDENTIFIER.test(c)) return "id";
  if (c.endsWith("_pct") || c.endsWith("_percent") || c.endsWith("_%") || c.includes("percent") || c.includes("share_pct")) return "pct";
  if (c.endsWith("_days") || c.endsWith("_day") || c.includes("lead_time") || c.startsWith("days_")) return "days";
  if (/(revenue|cost|margin|value|price|spend|amount)/.test(c)) return "inr";
  if (declared === "text" || typeof sample === "string") return "text";
  return "num";
}

export function fmtValue(v: unknown, kind?: string): string {
  if (v === null || v === undefined || v === "") return "—";
  if (!kind || kind === "text") return String(v);
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  // a year is 2026, never 2,026; a material code is a label, not a quantity
  if (kind === "id") return Number.isInteger(n) ? String(n) : String(v);
  if (kind === "inr") {
    const a = Math.abs(n);
    if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (a >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`;
    return `₹${Math.round(n)}`;
  }
  if (kind === "pct") return `${n.toFixed(1)}%`;
  if (kind === "days") return `${Math.round(n)} d`;
  if (Math.abs(n) >= 1000 || Number.isInteger(n)) return Math.round(n).toLocaleString("en-IN");
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const LABEL_FIXUPS: Record<string, string> = {
  qty: "qty", doh: "days on hand", pct: "%", avg: "avg", num: "count",
  sku: "SKU", skus: "SKUs", grn: "GRN", po: "PO", id: "ID", ytd: "YTD", mtd: "MTD", asp: "ASP",
};

/** A column label from whatever the SQL aliased. Sentence case, acronyms preserved, and a
 *  trailing "name"/"desc" dropped — a column of vendors is "Vendor", not "Vendor name". */
export function humanLabel(raw: string): string {
  const words = String(raw ?? "").trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").split(" ");
  if (words.length > 1 && /^(name|desc|description)$/i.test(words[words.length - 1])) words.pop();
  return hospitalise(
    words.map((w, i) => {
      const fix = LABEL_FIXUPS[w.toLowerCase()];
      const t = fix ?? (w === w.toUpperCase() && w.length <= 4 ? w : w.toLowerCase());
      return i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    }).join(" "));
}

/** Label a whole column set, keeping every label distinct: `material` and `material_desc`
 *  both collapse to "Material", which shipped a table with two identical headers. */
export function humanLabels(keys: string[]): string[] {
  const base = keys.map(humanLabel);
  const groups = new Map<string, number[]>();
  base.forEach((l, i) => groups.set(l, [...(groups.get(l) || []), i]));
  for (const [, idxs] of groups) {
    if (idxs.length < 2) continue;
    for (const i of idxs) if (!/(desc|description|name)$/i.test(keys[i])) base[i] = "Code";
  }
  return base;
}

/** The warehouse calls them plants; the hospital calls them hospitals. A prompt asking for
 *  this was ignored roughly half the time in a live audit, so it is done deterministically
 *  — and now on EVERY surface, including exported column headers and chart titles, which
 *  is where "plant" was still reaching the reader. */
export function hospitalise(text: string): string {
  return String(text ?? "").replace(/\b(plant)(s?)\b/gi, (_m, p1: string, p2: string) => {
    const word = "hospital" + (p2 || "");
    return p1[0] === p1[0].toUpperCase() ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  });
}
