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
 *  "money" is the fallback, never the opening guess.
 *
 *  The backend's declared kind (orchestrator.infer_kind) is used as a second opinion, not
 *  thrown away: it was ignored unless it said "text", so a `year` it had marked as a year
 *  still printed "2,026" in the headline band. It is not trusted blindly either: it calls
 *  `sales_qty` money (its money words include "sales") and any "rate" a percentage, so a
 *  count tail or a money name still beats it. */
export type Kind = "text" | "id" | "inr" | "pct" | "pct2" | "days" | "num" | "bool";

const IDENTIFIER = /^(year|yr|fy|fiscal_year|month|month_num|period|week|quarter|id|.*_id|.*_code|material|plant|po_no|gr_no|invoice.*)$/i;
// Wider than it was: a Keytruda sales trend comes back as `total_sales` or `net_sales`,
// which matched nothing here and printed as 9,68,00,000 instead of ₹9.68 Cr.
const MONEY = /(revenue|sales|billed|topline|mrp|cost|margin|value|price|spend|amount|saving|missed|loss|purchase|opportunity|overpay)/;
// The LAST word decides a count: `sales_qty`, `billed_patients` and `purchase_orders`
// carry a money word but are counts.
const COUNT_TAIL = /^(qty|quantity|count|cnt|lines|nos|units|patients|doctors|items|skus|brands|hospitals|plants|orders|visits|bills|invoices|materials|vendors)$/;
// A figure the SQL already scaled (`revenue_cr` = 9.68) is a plain number with its unit in
// the header; formatting it as money would print "₹9.68", nine crore short.
const SCALED_TAIL = /^(cr|crs|crore|crores|lakh|lakhs|lac|lacs)$/;
// The Formulary and Spend pages print these to two decimals (kpiFormat pct2); "87.4%"
// next to a dashboard "87.43%" reads as a disagreement.
const PCT2 = /(compliance|oof|formulary|share)/;

/** A string sample that is really a label: not a number, blank, or a code with a leading
 *  zero ("000123" is a code, and Number() would print it as 123). */
const textual = (s: unknown) => typeof s === "string" && (s.trim() === "" || /^0\d/.test(s.trim()) || !Number.isFinite(Number(s)));

export function kindOf(col: string, sample?: unknown, declared?: string): Kind {
  const c = (col || "").toLowerCase();
  if (typeof sample === "boolean" || declared === "bool") return "bool";
  if (IDENTIFIER.test(c) || declared === "year") return "id";
  const money = MONEY.test(c);
  const pctName = /(^|_)(pct|percent|percentage)(_|$)/.test(c) || c.includes("%") || /(^|_)share$/.test(c);
  if (pctName || (declared === "pct" && !money)) return PCT2.test(c) ? "pct2" : "pct";
  if (c.endsWith("_days") || c.endsWith("_day") || c.includes("lead_time") || c.startsWith("days_") || (declared === "days" && !money)) return "days";
  if (declared === "text" || textual(sample)) return "text";
  const tail = c.split(/[_\s]+/).filter(Boolean).pop() || c;
  if (COUNT_TAIL.test(tail) || SCALED_TAIL.test(tail)) return "num";
  if (money || declared === "inr") return "inr";
  return "num";
}

export function fmtValue(v: unknown, kind?: string): string {
  if (v === null || v === undefined || v === "") return "—";
  // a flag is Yes/No, never 1/0 (and never a data bar)
  if (typeof v === "boolean" || kind === "bool") return v === true || v === "true" || v === 1 || v === "1" ? "Yes" : "No";
  if (!kind || kind === "text") return String(v);
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  // a year is 2026, never 2,026; a material code is a label, not a quantity, and one that
  // arrives as text keeps its leading zeros ("000123", not 123)
  if (kind === "id" || kind === "year") return typeof v === "string" ? v : Number.isInteger(n) ? String(n) : String(v);
  if (kind === "inr") {
    // Sign in front of the symbol ("-₹2.50 Cr", not "₹-2.50 Cr"), and an ASCII hyphen:
    // the PDF export's Latin-1 filter would drop a real minus sign and flip the figure.
    const a = Math.abs(n), s = n < 0 ? "-" : "";
    if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
    if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
    if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)} K`;
    // small amounts keep their paise: an MRP of 2.35 is not "₹2", and 0.5 is "₹0.50"
    const paise = a < 100 && !Number.isInteger(a);
    return `${s}₹${a.toLocaleString("en-IN", { minimumFractionDigits: paise ? 2 : 0, maximumFractionDigits: paise ? 2 : 0 })}`;
  }
  if (kind === "pct") return `${n.toFixed(1)}%`;
  if (kind === "pct2") return `${n.toFixed(2)}%`;
  if (kind === "days") return `${Math.round(n)} d`;
  if (Math.abs(n) >= 1000 || Number.isInteger(n)) return Math.round(n).toLocaleString("en-IN");
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const LABEL_FIXUPS: Record<string, string> = {
  qty: "qty", doh: "days on hand", pct: "%", avg: "avg", num: "count",
  sku: "SKU", skus: "SKUs", grn: "GRN", po: "PO", id: "ID", ytd: "YTD", mtd: "MTD", asp: "ASP",
  mrp: "MRP", oof: "out-of-formulary", tpa: "TPA", ip: "IP", op: "OP", gov: "GOV", fy: "FY",
  // a pre-scaled figure says its unit in the header, since the cell is a plain number
  cr: "(₹ Cr)", crore: "(₹ Cr)", crores: "(₹ Cr)", lakh: "(₹ L)", lakhs: "(₹ L)",
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

// ── The code column leads ─────────────────────────────────────────────────
// A table an answer rests on is read, copied and shared by its codes: a material code is what
// a pharmacist searches the HIS and SAP by, and two brands can share a name. So whatever order
// the query returned, the code column comes first, on screen, in the Excel sheet and the PDF
// alike. The columns that count as "the code", most specific first: an item's own code, then
// any other code, then an ID (doctor, vendor), then the hospital's plant. A time column
// (month, year) is an identifier too but never a code: a table of months keeps its order.
const CODE_TIERS = [
  /^(material|material_code|material_no|matnr|item_code|item_no|sku|sku_code|product_code|drug_code|brand_code)$/,
  /(^|_)code$/,
  /(^|_)id$/,
  /^(plant|his_code)$/,
];
const TIME_COL = /^(year|yr|fy|fiscal_year|month|month_num|period|week|quarter|date)$/;

/** The index of the column a table's rows are identified by, or -1 when it has none. */
export function codeColumn(cols: { key?: string; label?: string }[]): number {
  const keys = cols.map((c) => String(c.key || c.label || "").trim().toLowerCase());
  for (const tier of CODE_TIERS) {
    const i = keys.findIndex((k) => tier.test(k) && !TIME_COL.test(k));
    if (i >= 0) return i;
  }
  return -1;
}

/** `cols` with the code column first; the others keep their order. */
export function codeFirst<T extends { key?: string; label?: string }>(cols: T[]): T[] {
  const i = codeColumn(cols);
  return i <= 0 ? cols : [cols[i], ...cols.slice(0, i), ...cols.slice(i + 1)];
}
