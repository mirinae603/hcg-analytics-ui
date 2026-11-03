"use client";
// What every panel on the Revenue & margin Overview shares: its colour law, the selection it
// answers (hospital, months, filters, the month before) worked out once, the switch between
// revenue, margin and margin %, and the pieces several drawers print (a month table, the
// method notes).
//
// COLOUR LAW on this page — one job per hue, the kit's WARM hues (ledger/kit.tsx; the pairs drawn
// side by side were checked with the data-viz palette validator: lightness band, chroma,
// colour-blind and normal-vision separation):
//   IP_COL / OP_COL = inpatient / outpatient (TEAL / OCHRE: CVD ΔE 17.8, normal 22.6, both ≥ 3:1
//                     on white, and clear of INK, the line drawn over them).
//   RATE_COL        = margin %, and only ever a rate (INK, as on the Formulary & Spend pages).
//   MARGIN_COL      = margin rupees (SAGE, "the margin earned" on the Spend page); COST_COL the
//                     cost it is taken from (a neutral sand: the rest of the MRP).
//   BUCKET_COL      = HCG's formulary buckets in the Formulary page's own hues (formulary SAGE,
//                     out of formulary CORAL_MARK, non-formulary stone, not in Item Master
//                     TEAL_LIGHT), plus consumables in UMBER; on this page they are a breakdown of
//                     sales, not terms of a ratio, so none is hatched.
//   HOSPITAL_COL    = a ranking of hospitals (the coral, as on the Spend page).
// Words stay in ink: colour only says which series a mark is.
import React from "react";
import { TEAL, OCHRE, SAGE, CORAL, CORAL_MARK, CORAL_INK, UMBER, NEUTRAL, INK, SUB, LINE, RULE, SEL_BG, CARD, PILL_TRACK, PILL_SHADOW } from "@/components/portfolio/ledger/kit";
import { DrawerSection, type DrawerFilter } from "@/components/portfolio/ledger/DetailDrawer";
import { dayLabel, isNum, lakhs, pct, pts, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import type { DeltaProps } from "@/components/portfolio/ledger/KpiCard";
import { num } from "@/lib/kpiFormat";
import type { Basis } from "@/context/BasisContext";
import { F_COL, NF_COL, OOF_COL, X_COL } from "@/components/portfolio/formulary/parts";
import { payerLabel } from "@/components/portfolio/formulary/api";
import type { Block, BucketKey, Filters, RevenueOverview, TrendRow, TypeKey, View } from "./api";

export const IP_COL = TEAL;
export const OP_COL = OCHRE;
export const RATE_COL = INK;
export const MARGIN_COL = SAGE;
export const COST_COL = NEUTRAL;
export const HOSPITAL_COL = CORAL_MARK;
/** The page's topic colour: the dot before each panel's title, the screen's coral accent. */
export const ACCENT = CORAL;

export const BUCKET_COL: Record<BucketKey, string> = {
  formulary: F_COL,
  out_of_formulary: OOF_COL,
  non_formulary: NF_COL,
  consumables: UMBER,
  not_in_master: X_COL,
};
/** A bucket the page does not know (a newer API) still gets a colour. */
export const bucketCol = (k: string): string => BUCKET_COL[k as BucketKey] ?? X_COL;

export const TYPE_COL: Record<TypeKey, string> = { IP: IP_COL, OP: OP_COL };
export const TYPE_SHORT: Record<TypeKey, string> = { IP: "IP", OP: "OP" };
export const TYPE_LONG: Record<TypeKey, string> = { IP: "Inpatient (IP)", OP: "Outpatient (OP)" };
export const TYPES: TypeKey[] = ["IP", "OP"];

export const SEGMENT_LABEL: Record<string, string> = { onco: "Onco", "non-onco": "Non-onco", consumables: "Consumables" };

/** Said wherever a volume view keeps rupees under the Quantity switch: units add vials, tablets
 *  and bottles together, so revenue, margin and margin % are never converted. */
export const RUPEES_ONLY = "₹ only";

// ─────────────────────────────────────────────────────────────────────────────
// Numbers
// ─────────────────────────────────────────────────────────────────────────────
/** A count of units sold, short, the way lakhs print rupees: "44.90 L", "1,021 L", "31,030". */
export function countShort(v: number | null | undefined): string {
  if (!isNum(v)) return "—";
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (a >= 1e7) return `${s}${Math.round(a / 1e5).toLocaleString("en-IN")} L`;
  if (Math.round(a) >= 1e5) return `${s}${(a / 1e5).toFixed(2)} L`;
  return `${s}${Math.round(a).toLocaleString("en-IN")}`;
}

/** Units sold in full, Indian grouping: "44,90,262 units". */
export const unitsExact = (v: number | null | undefined) => (isNum(v) ? `${num(v)} ${Math.round(v) === 1 ? "unit" : "units"}` : "—");

/** The size of a slice on the chosen basis: MRP on Value, units sold on Quantity. */
export const sizeOf = (b: Pick<Block, "mrp" | "qty">, basis: Basis): number => (basis === "qty" ? b.qty : b.mrp);
/** That size, short, for a chart face. */
export const sizeShort = (v: number | null | undefined, basis: Basis) => (basis === "qty" ? countShort(v) : lakhs(v));
/** That size, exact, for a drawer. */
export const sizeExact = (v: number | null | undefined, basis: Basis) => (basis === "qty" ? unitsExact(v) : rupeesExact(v));
/** What a size is called on the chosen basis. */
export const sizeWord = (basis: Basis) => (basis === "qty" ? "Units sold" : "Revenue");

// ─────────────────────────────────────────────────────────────────────────────
// The selection
// ─────────────────────────────────────────────────────────────────────────────
export type MonthBefore = {
  period: string;
  label: string;
  /** The whole selection that month, as the API sends it. */
  block: Block;
  /** That month in the trend: its IP and OP Blocks. Null when the trend lacks it. */
  row: TrendRow | null;
};

export type RevScope = {
  d: RevenueOverview;
  /** The filters `d` answers (answeredFilters), not the ones just picked. */
  filters: Filters;
  plant: string;
  basis: Basis;
  /** "HCG KR, Bangalore", or "All hospitals". */
  where: string;
  /** "Aug-26", or "Jun-26 – Aug-26". */
  when: string;
  /** "HCG KR, Bangalore · Aug-26": the context after a panel's title. */
  context: string;
  network: boolean;
  asOf: string | null;
  /** Set when exactly one month is selected and a published month precedes it. */
  prev: MonthBefore | null;
  /** The patient types the selection covers, in HCG's order. */
  types: TypeKey[];
  /** Every published month, oldest first. */
  trend: TrendRow[];
  /** Moves to another tab of the page. */
  onOpen: (v: View) => void;
};

/** "Aug-26" for '2026-08', from the answer's own labels. */
export const monthLabelOf = (d: RevenueOverview | null, m: string) => d?.month_labels?.[m] ?? m;

/** "Jun-26 – Aug-26" for a run of periods; one label for one period. */
export function monthsLabelOf(d: RevenueOverview | null, months: string[]): string {
  if (!months.length) return "—";
  const s = [...months].sort();
  return s.length === 1 ? monthLabelOf(d, s[0]) : `${monthLabelOf(d, s[0])} – ${monthLabelOf(d, s[s.length - 1])}`;
}

/** The hospital in words: HCG's own (HIS) name where the API has one. */
export function whereOf(d: RevenueOverview, fallback: string): string {
  const sc = d.scope;
  return !sc?.plant || sc.plant === "ALL" ? "All hospitals" : sc.his_name || sc.plant_name || sc.plant || fallback;
}

const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]): T | "ALL" => (allowed.includes(v as T) ? (v as T) : "ALL");

/** The filters an answer was computed under, from its own scope: while the next answer loads,
 *  the panels keep describing (and the top-items request keeps matching) the one on screen. */
export function answeredFilters(d: RevenueOverview): Filters {
  const sc = d.scope;
  return {
    month: (sc?.months ?? []).join(","),
    type: oneOf(sc?.type, ["IP", "OP"] as const),
    segment: oneOf(sc?.segment, ["onco", "non-onco", "consumables"] as const),
    payer: oneOf(sc?.payer, ["CASH", "CASH(TPA)", "GOV"] as const),
  };
}

export function revScope(d: RevenueOverview, plant: string, basis: Basis, onOpen: (v: View) => void): RevScope {
  const filters = answeredFilters(d);
  const network = !d.scope?.plant || d.scope.plant === "ALL";
  const where = whereOf(d, plant);
  const when = monthsLabelOf(d, d.scope?.months ?? []);
  const trend = [...(d.trend ?? [])].sort((a, b) => a.period.localeCompare(b.period));
  const p = d.prev_period;
  const types = TYPES.filter((t) => filters.type === "ALL" || filters.type === t);
  return {
    d, filters, plant, basis, where, when, network, onOpen, types, trend,
    context: `${where} · ${when}`,
    asOf: dayLabel(d.data_as_of),
    prev: p && d.prev ? { period: p, label: monthLabelOf(d, p), block: d.prev, row: trend.find((r) => r.period === p) ?? null } : null,
  };
}

/** The filters a figure was computed under, for a drawer's header. A list of every unit leaves
 *  the hospital out; the trend says it covers every month. */
export function filterChips(s: RevScope, o: { hospital?: boolean; months?: string } = {}): DrawerFilter[] {
  const f = s.filters;
  return [
    ...(o.hospital === false ? [] : [{ label: "Hospital", value: s.where }]),
    { label: "Month", value: o.months ?? s.when },
    { label: "Patients", value: f.type === "ALL" ? "IP + OP" : f.type },
    { label: "Material", value: f.segment === "ALL" ? "All materials" : SEGMENT_LABEL[f.segment] ?? f.segment },
    { label: "Payer", value: f.payer === "ALL" ? "All payers" : payerLabel(f.payer) },
  ];
}

/** A change since the month before, for a chip; undefined without a month before. */
export function deltaOf(value: number | null | undefined, before: number | null | undefined, unit: DeltaProps["unit"], vs: string): DeltaProps | undefined {
  return isNum(value) && isNum(before) ? { value: value - before, unit, goodWhen: "up", vsLabel: `vs ${vs}` } : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// The revenue · margin · margin % switch
// ─────────────────────────────────────────────────────────────────────────────
export type Measure = "size" | "margin" | "margin_pct";

export const MEASURES: Measure[] = ["size", "margin_pct", "margin"];

export const measureLabel = (m: Measure, basis: Basis) => (m === "size" ? sizeWord(basis) : m === "margin" ? "Margin" : "Margin %");

/** A unit's figure on the measure (null where it has none: a margin % with no MRP). */
export function measureOf(b: Block, m: Measure, basis: Basis): number | null {
  return m === "size" ? sizeOf(b, basis) : m === "margin" ? b.margin : b.margin_pct;
}

/** The figure, short, for a chart face. */
export const measureShort = (v: number | null | undefined, m: Measure, basis: Basis) =>
  m === "size" ? sizeShort(v, basis) : m === "margin" ? lakhs(v) : pct(v, 1);

/** The figure, exact, for a drawer. */
export const measureExact = (v: number | null | undefined, m: Measure, basis: Basis) =>
  m === "size" ? sizeExact(v, basis) : m === "margin" ? rupeesExact(v) : pct(v);

/** A compact segmented switch for a panel's own control (the panel is `interactive`). Arrow
 *  keys move between its options, as in the page's tabs. */
export function MeasureSwitch({ value, onChange, basis, label }: { value: Measure; onChange: (m: Measure) => void; basis: Basis; label: string }) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: React.KeyboardEvent) => {
    const i = MEASURES.indexOf(value);
    const to = e.key === "ArrowRight" ? (i + 1) % MEASURES.length : e.key === "ArrowLeft" ? (i - 1 + MEASURES.length) % MEASURES.length : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(MEASURES[to]);
    refs.current[MEASURES[to]]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="inline-flex items-center rounded-full p-[2px] gap-0.5 flex-shrink-0"
      style={{ background: PILL_TRACK, border: `1px solid ${RULE}` }}>
      {MEASURES.map((m) => {
        const on = m === value;
        return (
          <button key={m} ref={(el) => { refs.current[m] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            onClick={() => { if (!on) onChange(m); }}
            className="px-2 h-5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2"
            style={{ background: on ? CARD : "transparent", color: on ? CORAL_INK : SUB, boxShadow: on ? PILL_SHADOW : undefined }}>
            {measureLabel(m, basis)}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer pieces
// ─────────────────────────────────────────────────────────────────────────────
export type MonthColumn = { key: string; label: string; value: (r: TrendRow, before: TrendRow | null) => string; strong?: boolean };

/** Every published month as a row (the months in the selection shaded), for a drawer's "By
 *  month" tab. Each column prints from the month's trend row and the one before it. */
export function MonthTable({ s, columns, caption }: { s: RevScope; columns: MonthColumn[]; caption: string }) {
  const rows = s.trend;
  const sel = new Set(s.d.scope?.months ?? []);
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>No months published yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
            <th scope="col" className="px-3 py-2 text-[10.5px] font-semibold uppercase text-left" style={{ letterSpacing: ".08em" }}>Month</th>
            {columns.map((c) => (
              <th key={c.key} scope="col" className="px-3 py-2 text-[10.5px] font-semibold uppercase text-right whitespace-nowrap" style={{ letterSpacing: ".08em" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const on = sel.has(r.period);
            return (
              <tr key={r.period} style={{ borderBottom: `1px solid ${LINE}`, background: on ? SEL_BG : undefined }}>
                <th scope="row" className="px-3 py-2 text-[12px] text-left whitespace-nowrap" style={{ color: INK, fontWeight: on ? 700 : 500 }}>
                  {r.label || monthLabelOf(s.d, r.period)}
                </th>
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-[12.5px] tabular-nums text-right whitespace-nowrap"
                    style={{ color: INK, fontWeight: c.strong ? 700 : 400 }}>{c.value(r, i ? rows[i - 1] : null)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] mt-2" style={{ color: SUB }}>Shaded = the months in your selection.</p>
    </div>
  );
}

/** The change in a month's figure from the month before, for a MonthTable column. */
export const changeOf = (get: (r: TrendRow) => number | null, fmt: (v: number) => string) =>
  (r: TrendRow, before: TrendRow | null) => {
    const a = get(r), b = before ? get(before) : null;
    return isNum(a) && isNum(b) ? withSign(a - b, fmt) : "—";
  };

/** A table of Blocks, one row per slice (a bucket, a material type, a patient type): MRP,
 *  cost, margin, margin %, units, lines and blank-cost lines, then the share of the whole. */
export function BlockTable({ rows, caption, shareLabel = "Share of revenue", total }: {
  rows: { key: string; label: React.ReactNode; b: Block; share?: number | null; strong?: boolean }[];
  caption: string;
  /** The share column's heading; null leaves the column out (the API sends no share there). */
  shareLabel?: string | null;
  /** A last row in bold: the whole the shares are of. */
  total?: { label: string; b: Block };
}) {
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p>;
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap text-right";
  const td = "px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap";
  const all = total ? [...rows, { key: "__total", label: total.label, b: total.b, share: null, strong: true }] : rows;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
            <th scope="col"><span className="sr-only">Slice</span></th>
            {["Revenue (MRP)", "Cost", "Margin", "Margin %", "Units sold", "Lines", "Blank-cost lines", ...(shareLabel ? [shareLabel] : [])].map((h) => (
              <th key={h} scope="col" className={th} style={{ letterSpacing: ".08em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {all.map((r) => (
            <tr key={r.key} style={{ borderBottom: `1px solid ${LINE}`, background: r.strong ? SEL_BG : undefined }}>
              <th scope="row" className="px-3 py-2 text-[12px] text-left whitespace-nowrap" style={{ color: INK, fontWeight: r.strong ? 700 : 600 }}>{r.label}</th>
              <td className={td} style={{ color: INK, fontWeight: 700 }}>{rupeesExact(r.b.mrp)}</td>
              <td className={td} style={{ color: INK }}>{rupeesExact(r.b.cost)}</td>
              <td className={td} style={{ color: INK }}>{rupeesExact(r.b.margin)}</td>
              <td className={td} style={{ color: INK, fontWeight: 700 }}>{pct(r.b.margin_pct)}</td>
              <td className={td} style={{ color: INK }}>{num(r.b.qty)}</td>
              <td className={td} style={{ color: SUB }}>{num(r.b.lines)}</td>
              <td className={td} style={{ color: SUB }}>{r.b.cost_missing_lines ? num(r.b.cost_missing_lines) : "—"}</td>
              {shareLabel && <td className={td} style={{ color: SUB }}>{r.strong ? "100%" : pct(r.share)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A margin % change in points, signed: "+3.53 pts". */
export const ptsChange = (v: number) => withSign(v, (x) => pts(x));

/** A short paragraph of method text inside a drawer tab. */
export function MethodText({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-[12.5px] leading-relaxed mb-7" style={{ color: SUB }}>{children}</div>;
}

/** "How these figures are built": the API's own notes (HCG's sheet method, the GST caveat, the
 *  bucket rule, which views ignore which filter, the blank-cost lines in this selection), and
 *  under the Quantity switch what keeps rupees. Every Overview drawer ends its Method tab on it. */
export function HowBuilt({ s }: { s: RevScope }) {
  const notes = Array.from(new Set(s.d.notes ?? []));
  return (
    <DrawerSection title="How these figures are built">
      <ul className="space-y-1.5 text-[12px] leading-relaxed list-disc pl-5" style={{ color: SUB }}>
        <li>Source: HIS IP + OP pharmacy sales lines, every material (drugs and consumables), one consolidated file per month, classed with that month&apos;s Item Master and the Payer Master.</li>
        {notes.map((t) => <li key={t}>{t}</li>)}
        {s.basis === "qty" && (
          <li>Quantity: the volume views (bucket sizes, hospitals by size, the material types&apos; size, the top items) count units sold — vials, tablets and bottles added together. Revenue, margin and margin % stay in rupees ({RUPEES_ONLY}).</li>
        )}
      </ul>
    </DrawerSection>
  );
}

/** The blank-cost lines of a Block in words, or null when it has none. */
export function blankCostWords(b: Block): string | null {
  if (!b.cost_missing_lines) return null;
  return `${num(b.cost_missing_lines)} ${b.cost_missing_lines === 1 ? "line has" : "lines have"} a blank cost price (MRP ${rupeesExact(b.mrp_cost_missing)}), counted as cost 0`;
}

/** The empty state of a panel whose selection sold nothing. */
export function NoSales({ s }: { s: RevScope }) {
  return <p className="text-[12px]" style={{ color: SUB }}>No pharmacy sales{s.network ? "" : ` at ${s.where}`} in this selection.</p>;
}

/** The start of a sentence about the selection: "At HCG KR, Bangalore, Aug-26" or "Across all
 *  hospitals, Aug-26". */
export const atWhere = (s: RevScope) => `${s.network ? "Across all hospitals" : `At ${s.where}`}, ${s.when}`;

/** "1 hospital", "23 hospitals". */
export const plural = (n: number, word: string) => `${num(n)} ${n === 1 ? word : `${word}s`}`;
