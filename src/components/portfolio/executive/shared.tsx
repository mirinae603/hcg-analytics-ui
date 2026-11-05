"use client";
// What every panel of the Executive overview shares: its colour law, the selection the answer
// was computed under (hospital, month, filters, basis) worked out once, how each kind of figure
// prints, where each figure's own page is, and the small pieces several drawers print.
//
// COLOUR LAW on this page — each hue keeps the job it has on the page a figure comes from, so a
// figure looks the same here as where its link leads (the kit's WARM hues, ledger/kit.tsx):
//   KPI tiles  — the stock-value page's cards: a coral icon chip and a coral sparkline on each,
//                the first (sales) the dark hero card. In a drawer each figure keeps its topic's
//                hue: sales and margin % INK, compliance SAGE (Formulary), out-of-formulary share,
//                missed and extra paid CORAL_MARK (what needs acting on).
//   IP / OP    — TEAL / OCHRE, the Revenue page's validated pair; the margin % line INK.
//   Bridge     — margin possible CORAL_SOFT (the pale whole), each part missed CORAL_MARK, margin
//                earned SAGE.
//   Buckets    — the Formulary and Revenue pages' own hues (formulary SAGE, out of formulary
//                CORAL_MARK, non-formulary stone, consumables UMBER); non-formulary hatched where
//                it sits outside the compliance ratio (the unit mix).
//   Units      — hospitals and items in the coral, a one-measure ranking's colour.
//   Material types are a pass-through on this page (the flow's middle, the treemap's blocks):
//   neutral STONE, so the buckets they split into keep the colour.
// Words stay in ink: colour only says which series a mark is.
import React from "react";
import { useRouter } from "next/navigation";
import { TbDownload } from "react-icons/tb";
import { CARD, CORAL, CORAL_INK, CORAL_MARK, INK, LINE, PILL_SHADOW, PILL_TRACK, RULE, SAGE, SEL_BG, STONE, SUB } from "@/components/portfolio/ledger/kit";
import { DrawerSection, type DrawerFilter } from "@/components/portfolio/ledger/DetailDrawer";
import { dayLabel, isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { csvCell, saveBlob } from "@/components/portfolio/table/exportCsv";
import { useSelectHospital } from "@/context/RegionContext";
import { BASIS_OPTIONS, type Basis } from "@/context/BasisContext";
import { count } from "@/components/portfolio/formulary/measure";
import { countShort, BUCKET_COL, IP_COL, OP_COL, RATE_COL, bucketCol } from "@/components/portfolio/margin/shared";
import type { ExecOverview, ExecScope, Filters, Kpi, KpiKey, Segment, UnitRow } from "./api";

export { BUCKET_COL, IP_COL, OP_COL, RATE_COL, bucketCol };

export const KPI_COL: Record<KpiKey, string> = {
  sales: INK, margin_pct: INK, compliance: SAGE, oof_share: CORAL_MARK, losses: CORAL_MARK, extra_paid: CORAL_MARK,
};
export const HOSPITAL_COL = CORAL_MARK;
export const ITEM_COL = CORAL_MARK;
export const TYPE_COL = STONE;
/** The page's topic colour: the dot before the titles of the panels about the whole page. */
export const ACCENT = CORAL;

/** Said wherever a money figure keeps rupees on the Quantity basis. */
export const RUPEES_ONLY = "₹ only";

/** The basis that counts pieces sold, by the header switch's own name for it (BasisContext), so
 *  the page says what the switch says. On this page "unit" is a hospital, as in HCG's MIS, so the
 *  basis is never called "Units"; the pieces themselves (tablets, vials, bottles) are "units
 *  sold". */
export const QUANTITY = BASIS_OPTIONS.find((o) => o.key === "qty")?.label ?? "Quantity";
/** The same in a sentence: "on quantity", "the quantity view". */
export const QUANTITY_LC = QUANTITY.toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────
// Where each figure's own page is
// ─────────────────────────────────────────────────────────────────────────────
/** The page that shows a KPI in full: its link and its name on the button. */
export const KPI_PAGE: Record<KpiKey, { href: string; name: string }> = {
  sales: { href: "/revenue", name: "Revenue & margin" },
  margin_pct: { href: "/revenue", name: "Revenue & margin" },
  compliance: { href: "/formulary?view=overview", name: "Formulary compliance" },
  oof_share: { href: "/formulary?view=overview", name: "Formulary compliance" },
  losses: { href: "/spend", name: "Spend analysis" },
  extra_paid: { href: "/spend?section=prices", name: "Prices" },
};
export const PAGES = {
  revenue: { href: "/revenue", name: "Revenue & margin" },
  formulary: { href: "/formulary?view=overview", name: "Formulary compliance" },
  items: { href: "/formulary?view=items", name: "Formulary items" },
  spend: { href: "/spend", name: "Spend analysis" },
  exports: { href: "/exports", name: "Data exports" },
} as const;

/** `href` with the page's selection added — its month, and its patients and material where they
 *  narrow — under the names the Formulary, Spend and Revenue pages give their own filters
 *  (month, type, segment), so the page a link opens can start from what this one shows. The
 *  hospital and the Value ↔ Quantity switch are global and carry over by themselves. Anything but
 *  an app path is left as it is. */
export function drillHref(href: string, sc: Pick<ExecScope, "month" | "type" | "segment">): string {
  if (!href.startsWith("/")) return href;
  const u = new URL(href, "http://app.local");
  if (sc.month) u.searchParams.set("month", sc.month);
  if (sc.type === "IP" || sc.type === "OP") u.searchParams.set("type", sc.type);
  if (isSegment(sc.segment)) u.searchParams.set("segment", sc.segment);
  return `${u.pathname}${u.search}${u.hash}`;
}

/** The material types the Material filter takes (Segment less "ALL"). */
export const SEGMENTS: Exclude<Segment, "ALL">[] = ["onco", "non-onco", "consumables"];
export const isSegment = (s: string | null | undefined): s is Exclude<Segment, "ALL"> => SEGMENTS.some((x) => x === s);

/** The name of the page an app link opens, for a link's words: "/spend?section=oof…" →
 *  "Out of formulary". */
export function pageName(href: string): string {
  const u = new URL(href, "http://x");
  const section = u.searchParams.get("section");
  if (u.pathname === "/spend") {
    return section === "cash" ? "Cash & TPA margin" : section === "oof" ? "Out of formulary"
      : section === "scheme" ? "Scheme brands" : section === "prices" ? "Prices" : section === "generic" ? "Generic vs branded" : "Spend analysis";
  }
  if (u.pathname === "/formulary") return u.searchParams.get("view") === "items" ? "Formulary items" : "Formulary compliance";
  if (u.pathname === "/revenue") return "Revenue & margin";
  if (u.pathname === "/exports") return "Data exports";
  return "the page";
}

// ─────────────────────────────────────────────────────────────────────────────
// Numbers
// ─────────────────────────────────────────────────────────────────────────────
/** Units sold in full: "44,90,262 units". */
export const unitsExact = (v: number | null | undefined) => (isNum(v) ? `${count(v)} ${Math.round(v) === 1 ? "unit" : "units"}` : "—");

/** A size on the chosen basis, short for a chart face: lakhs of rupees, or units in lakhs. */
export const sizeShort = (v: number | null | undefined, units: boolean) => (units ? countShort(v) : lakhs(v));
/** The same, exact, for a drawer. */
export const sizeExact = (v: number | null | undefined, units: boolean) => (units ? unitsExact(v) : rupeesExact(v));

/** The parts of a unit's total missed, each its own section's figure for the unit, in the order
 *  the Total missed tile and the bridge list them. */
export const MISSED_PARTS = [
  { key: "cash_loss", label: "Cash & TPA" },
  { key: "scheme_missed", label: "Scheme" },
  { key: "oof_loss", label: "Out of formulary" },
] as const satisfies readonly { key: keyof UnitRow; label: string }[];

/** A unit's total missed: the cash & TPA margin, the scheme saving and the out-of-formulary
 *  margin it missed — the three figures the server sends for it, added as the Total missed tile
 *  adds the selection's (over every unit they come to that tile's figure). A part whose section
 *  has no figures (null) is left out, as on the tile; null when none has. An out-of-formulary
 *  part below zero (a brand that earned more) takes away, as on the bridge. */
export function missedOf(u: Pick<UnitRow, "cash_loss" | "scheme_missed" | "oof_loss">): number | null {
  const parts = MISSED_PARTS.map((p) => u[p.key]).filter(isNum);
  return parts.length ? parts.reduce((t, v) => t + v, 0) : null;
}

/** A % without its sign, for a table column whose header gives the unit: "96.2", "−4.2". */
export const pctBare = (v: number | null | undefined, d = 1) => (isNum(v) ? pct(v, d).replace("%", "") : "—");

/** Rupees in lakhs as a bare figure, for a table column whose header says "₹ L": "13.24",
 *  "1,021" (whole lakhs from ₹ 100 L, two decimals below, as lakhs() prints them), "0.31" for
 *  ₹ 31,030 — never whole rupees, which would read as lakhs in such a column. */
export function inLakhs(v: number | null | undefined): string {
  if (!isNum(v)) return "—";
  const l = Math.abs(v) / 1e5;
  const body = Math.round(l * 100) >= 10000 ? Math.round(l).toLocaleString("en-IN") : l.toFixed(2);
  return v < 0 && /[1-9]/.test(body) ? `−${body}` : body;
}

/** A unit's total missed in words, part by part in exact rupees: the cell's tooltip. */
export function missedNote(u: Pick<UnitRow, "cash_loss" | "scheme_missed" | "oof_loss">): string {
  return MISSED_PARTS.map((p) => { const v = u[p.key]; return `${p.label} ${isNum(v) ? rupeesExact(v) : "no figures"}`; }).join(" · ");
}

/** A KPI's figure on its tile: lakhs, a % or a whole count. */
export function kpiShort(k: Pick<Kpi, "unit">, v: number | null | undefined): string {
  return k.unit === "inr" ? lakhs(v) : k.unit === "pct" ? pct(v) : count(v);
}
/** A KPI's figure in its drawer: exact rupees, a % or a whole count. */
export function kpiExact(k: Pick<Kpi, "unit">, v: number | null | undefined): string {
  return k.unit === "inr" ? rupeesExact(v) : k.unit === "pct" ? pct(v) : unitsExact(v);
}

// ─────────────────────────────────────────────────────────────────────────────
// The selection
// ─────────────────────────────────────────────────────────────────────────────
export type ExecCtx = {
  d: ExecOverview;
  /** All hospitals together. */
  network: boolean;
  /** "HCG KR, Bangalore" (HCG's own name), or "All hospitals". */
  where: string;
  /** "Aug-26", or "All months (Jun-26 – Aug-26)". */
  when: string;
  /** "HCG KR, Bangalore · Aug-26": the context after a panel's title. */
  context: string;
  /** The basis the answer is in (not the switch: a stale answer keeps its own). */
  basis: Basis;
  /** On the Quantity basis: figures with a quantity version count units sold. */
  units: boolean;
  /** Compliance is compared with HCG's budget (value basis, no patient or material filter). */
  judged: boolean;
  /** "Jul-26": what every change is against; null for the first month and All months. */
  prevLabel: string | null;
  asOf: string | null;
  kpi: (key: KpiKey) => Kpi | null;
  /** An app link carrying this page's month and filters (drillHref). */
  link: (href: string) => string;
  /** Opens an app page, carrying this page's month and filters. */
  go: (href: string) => void;
  /** Selects a unit in the header (or goes back to all hospitals from the selected one). */
  select: (u: Pick<UnitRow, "plant" | "name" | "selected">) => void;
  /** Changes the page's own filters (a material type picked on a chart); null where the panels
   *  are rendered without the page around them. */
  narrow: ((patch: Partial<Filters>) => void) | null;
};

/** Whether a month is in the selection: the month picked, or on All months every month on the
 *  page (its sales and purchase months) — not every month a purchases figure's own section
 *  holds, which can reach further back. */
export function inSelection(c: Pick<ExecCtx, "d">, period: string): boolean {
  const sc = c.d.scope;
  return sc.month === "ALL" ? c.d.months.some((m) => m.period === period) : period === sc.month;
}

/** "Jun-26 – Aug-26" for the page's months. */
export function spanOf(months: { label: string }[]): string {
  if (!months.length) return "—";
  return months.length === 1 ? months[0].label : `${months[0].label} – ${months[months.length - 1].label}`;
}

export function useExecCtx(d: ExecOverview, narrow: ExecCtx["narrow"] = null): ExecCtx {
  const router = useRouter();
  const selectHospital = useSelectHospital();
  const sc = d.scope;
  const network = !sc.plant || sc.plant === "ALL";
  const where = network ? "All hospitals" : sc.his_name || sc.plant_name || sc.plant;
  const all = sc.month === "ALL";
  const when = all ? `All months (${spanOf(d.months)})` : sc.month_label;
  const byKey = new Map(d.kpis.map((k) => [k.key, k]));
  const link = (href: string) => drillHref(href, sc);
  return {
    d, network, where, when, context: `${where} · ${when}`,
    basis: sc.basis === "qty" ? "qty" : "value", units: sc.basis === "qty", judged: !!sc.budget_judged,
    prevLabel: sc.prev_label, asOf: dayLabel(d.data_as_of),
    kpi: (key) => byKey.get(key) ?? null,
    link,
    go: (href) => router.push(link(href)),
    select: (u) => selectHospital({ plant: u.plant, name: u.name, selected: u.selected }),
    narrow,
  };
}

export const SEGMENT_LABEL: Record<string, string> = { onco: "Onco", "non-onco": "Non-onco", consumables: "Consumables" };

/** What a drawer's figures are counted in, for its "Counted in" chip on the Quantity basis:
 *  "basis" follows the switch (units sold, shares of units sold); "rupees" stays in rupees
 *  whatever it says (money, and the margin %, a rupee ratio); "mixed" holds both kinds. On the
 *  Value basis everything is rupees. */
export type Counted = "basis" | "rupees" | "mixed";
const COUNTED_ON_QUANTITY: Record<Counted, string> = {
  basis: `${QUANTITY} (units sold)`, rupees: `Rupees (${RUPEES_ONLY})`, mixed: `${QUANTITY}, money in ₹`,
};

/** The filters a figure was computed under, for a drawer's header. A list of every unit leaves
 *  the hospital out. */
export function filterChips(c: ExecCtx, o: { hospital?: boolean; months?: string; counted?: Counted } = {}): DrawerFilter[] {
  const sc = c.d.scope;
  return [
    ...(o.hospital === false ? [] : [{ label: "Hospital", value: c.where }]),
    { label: "Month", value: o.months ?? c.when },
    { label: "Patients", value: sc.type === "IP" || sc.type === "OP" ? sc.type : "IP + OP" },
    { label: "Material", value: SEGMENT_LABEL[sc.segment] ?? "All materials" },
    { label: "Counted in", value: c.units ? COUNTED_ON_QUANTITY[o.counted ?? "basis"] : "Rupees" },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Controls and drawer pieces
// ─────────────────────────────────────────────────────────────────────────────
/** A compact segmented switch for a panel's own control (the panel is `interactive`): a radio
 *  group whose arrow keys move between the options, as the page's tabs do. */
export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: React.KeyboardEvent) => {
    const i = options.findIndex((o) => o.key === value);
    const to = e.key === "ArrowRight" ? (i + 1) % options.length : e.key === "ArrowLeft" ? (i - 1 + options.length) % options.length : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(options[to].key);
    refs.current[options[to].key]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="inline-flex items-center rounded-full p-[2px] gap-0.5 flex-shrink-0"
      style={{ background: PILL_TRACK, border: `1px solid ${RULE}` }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} ref={(el) => { refs.current[o.key] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            onClick={() => { if (!on) onChange(o.key); }}
            className="px-2 h-5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2"
            style={{ background: on ? CARD : "transparent", color: on ? CORAL_INK : SUB, boxShadow: on ? PILL_SHADOW : undefined }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A short paragraph of method text inside a drawer tab. */
export function MethodText({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-[12.5px] leading-relaxed mb-7" style={{ color: SUB }}>{children}</div>;
}

/** "How these figures are built": the API's own notes for this selection (which section each
 *  figure is from, the months each covers, what a filter leaves out, the Quantity basis). Every
 *  drawer's Method tab ends on it. */
export function HowBuilt({ c }: { c: ExecCtx }) {
  const notes = Array.from(new Set(c.d.notes ?? []));
  return (
    <DrawerSection title="How these figures are built">
      <ul className="space-y-1.5 text-[12px] leading-relaxed list-disc pl-5" style={{ color: SUB }}>
        {notes.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </DrawerSection>
  );
}

/** One column of an ExactTable. `value` is what the drawer prints; `raw` is the cell in the CSV
 *  download — the figure itself (exact rupees, a % as a number), never a formatted string — and
 *  `unit` what that figure is counted in, added to its CSV heading ("Margin, ₹"). A column
 *  without `raw` writes its printed value when that is text, else leaves the cell blank. */
export type ExactColumn<T> = {
  label: string;
  value: (r: T) => React.ReactNode;
  raw?: (r: T) => string | number | null | undefined;
  unit?: "₹" | "%" | "pts" | "units";
  text?: boolean;
  strong?: boolean;
};

/** A column's CSV heading: its label, with its unit when the label does not already say it. */
const csvHeading = (col: Pick<ExactColumn<unknown>, "label" | "unit">) =>
  col.unit && !col.label.toLowerCase().includes(col.unit) ? `${col.label}, ${col.unit}` : col.label;

/** An ExactTable as CSV text, by the app's export rules (table/exportCsv): a BOM so Excel reads
 *  ₹, CRLF line ends, RFC 4180 quoting, raw numbers, and text a spreadsheet would run as a
 *  formula defused. */
export function exactCsv<T>(rows: T[], columns: ExactColumn<T>[]): string {
  const cell = (col: ExactColumn<T>, r: T) => {
    if (col.raw) return col.raw(r);
    const v = col.value(r);
    return typeof v === "string" || typeof v === "number" ? v : null;
  };
  const lines = [
    columns.map((col) => csvCell(csvHeading(col))).join(","),
    ...rows.map((r) => columns.map((col) => csvCell(cell(col, r))).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** A file name from a table's caption: "Every unit, Aug-26" → "Executive overview - Every unit Aug-26.csv". */
export const csvName = (caption: string) =>
  `Executive overview - ${caption.replace(/[^\w &+%-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90)}.csv`;

/** A simple exact table for a drawer: words left, figures right, the first column a row header,
 *  with a "Download CSV" of exactly these rows and columns (HCG asked for tables it can take
 *  away), named after the table's caption. */
export function ExactTable<T>({ rows, rowKey, columns, caption, selected, empty = "Nothing in this selection." }: {
  rows: T[];
  rowKey: (r: T) => string;
  columns: ExactColumn<T>[];
  caption: string;
  selected?: (r: T) => boolean;
  empty?: string;
}) {
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>{empty}</p>;
  const [head, ...rest] = columns;
  const download = () => saveBlob(new Blob([exactCsv(rows, columns)], { type: "text/csv;charset=utf-8" }), csvName(caption));
  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end mb-1">
        <button type="button" onClick={download} aria-label={`Download CSV: ${caption}`}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold rounded hover:underline focus-visible:outline focus-visible:outline-2"
          style={{ color: INK }}>
          <TbDownload size={13} aria-hidden="true" />Download CSV
        </button>
      </div>
      <table className="min-w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
            {columns.map((col) => (
              <th key={col.label} scope="col" className={`px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap ${col.text ? "text-left" : "text-right"}`}
                style={{ letterSpacing: ".08em" }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const on = selected?.(r) ?? false;
            return (
              <tr key={rowKey(r)} style={{ borderBottom: `1px solid ${LINE}`, background: on ? SEL_BG : undefined }}>
                <th scope="row" className="px-3 py-2 text-[12px] text-left" style={{ color: INK, fontWeight: on ? 700 : 600 }}>{head.value(r)}</th>
                {rest.map((col) => (
                  <td key={col.label} className={`px-3 py-2 text-[12px] ${col.text ? "text-left" : "text-right tabular-nums whitespace-nowrap"}`}
                    style={{ color: INK, fontWeight: col.strong ? 700 : 400 }}>{col.value(r)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A unit's name as HCG writes it (its HIS name), else the SAP name. */
export const unitName = (u: Pick<UnitRow, "his_name" | "name">) => u.his_name || u.name;
