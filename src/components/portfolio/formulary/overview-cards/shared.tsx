"use client";
// What every panel on the Formulary Overview shares: the selection it answers (hospital, months,
// filters, the month before, what the amounts count) worked out once, and the pieces several
// drawers print (a month table, the split rows, the method notes). A panel's drawer state is the
// ledger's useDrawer.
import React from "react";
import { useArmed, INK, SUB, LINE, RULE, TRACK, EASE, SEL_BG } from "@/components/portfolio/ledger/kit";
import { DrawerSection, type DrawerFilter } from "@/components/portfolio/ledger/DetailDrawer";
import { dayLabel, pct } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { F_COL, OOF_COL, NF_COL, Swatch, fmtPts, RATE_COL, FORMULARY_PAGE } from "../parts";
import { DownloadCsv, type CsvColumn } from "@/components/portfolio/table/DownloadCsv";
import { complianceMonths, type CompMonth } from "../HcgTables";
import { measureOf, type Measure } from "../measure";
import {
  effectiveMethod, filterParams, gapOf, inRatioOf, monthBefore, monthLabel, monthsLabel, niceMax, payerLabel, useOverview,
  type Filters, type Meta, type Overview as OverviewData, type Split, type TrendRow, type View,
} from "../api";

// ─────────────────────────────────────────────────────────────────────────────
// The selection
// ─────────────────────────────────────────────────────────────────────────────
export type MonthBefore = {
  period: string;
  label: string;
  /** That month in this selection's trend: its compliance and its A / B / C spend. */
  row: TrendRow;
  /** The whole overview for that month, same filters (its segments, scheme figures); null
   *  until it arrives. */
  data: OverviewData | null;
};

export type OverviewScope = {
  d: OverviewData;
  meta: Meta;
  filters: Filters;
  plant: string;
  /** "KR Bangalore", or "All hospitals". */
  where: string;
  /** "Aug-26", or "Apr-26 – Sep-26". */
  when: string;
  /** "KR Bangalore · Aug-26": the context after a panel's title. */
  context: string;
  /** All hospitals together: HCG budgets each unit, so there is no budget to compare with. */
  network: boolean;
  /** "2026-10-10". */
  asOf: string | null;
  /** Every published month, oldest first, with its compliance and budget. */
  months: CompMonth[];
  /** Set when exactly one month is selected and a month precedes it. */
  prev: MonthBefore | null;
  /** What the answer's amounts count (rupees or units) and how they print. `filters.basis` is
   *  the same basis, so a panel's own request (a top-five list) asks in the unit on screen. */
  m: Measure;
  /** Moves to another tab of the page. */
  onOpen: (v: View) => void;
};

/** The period before `month` among the published ones; none for "All months" or the first. */
const periodBefore = (meta: Meta, month: string): string | null =>
  monthBefore([...(meta.months || [])].sort().map((period) => ({ period })), [month])?.period ?? null;

/** The overview for the month before the selected one, same hospital and filters. It is the
 *  same cached query the page sends when that month is picked, so moving back costs nothing. */
export function useMonthBefore(meta: Meta, filters: Filters, plant: string): OverviewData | null {
  const period = periodBefore(meta, filters.month);
  const q = useOverview({ Plant: plant, ...filterParams({ ...filters, month: period ?? "" }, { method: true }) }, period != null);
  // useOverview keeps its last answer while a new one loads and after it is switched off:
  // only a settled answer for exactly that month counts.
  return period && !q.loading && q.data?.scope?.months?.length === 1 && q.data.scope.months[0] === period ? q.data : null;
}

export function overviewScope(
  d: OverviewData, meta: Meta, filters: Filters, plant: string, before: OverviewData | null, onOpen: (v: View) => void,
): OverviewScope {
  const network = !d.scope?.plant || d.scope.plant === "ALL";
  const where = network ? "All hospitals" : (d.scope.his_name || d.scope.plant_name || d.scope.plant || plant);
  const sel = d.scope?.months || [];
  const when = monthsLabel(meta, sel);
  const trend = [...(d.trend || [])].sort((a, b) => a.period.localeCompare(b.period));
  const row = monthBefore(trend, sel);
  // The answer's basis, not the switch's: just after the switch moves, the answer on screen is
  // still the one before it, and its figures keep their own unit until the new one lands.
  const m = measureOf(d);
  const shown: Filters = (filters.basis ?? "value") === m.basis ? filters : { ...filters, basis: m.basis };
  return {
    d, meta, filters: shown, plant, where, when, network, onOpen, m,
    context: `${where} · ${when}`,
    asOf: dayLabel(d.data_as_of || meta.built_at),
    months: complianceMonths(d, meta, shown),
    prev: row ? {
      period: row.period, label: row.label || monthLabel(meta, row.period), row,
      // Only an answer for that month in the same unit: a rupee figure is no month before a count.
      data: before?.scope?.months?.[0] === row.period && measureOf(before).basis === m.basis ? before : null,
    } : null,
  };
}

/** HCG sets a hospital's budget for its whole drug spend, pooled. Under a narrower filter the
 *  figure is not the one the budget was set for, so it is not judged against it. */
export const wholeSpend = (f: Filters) =>
  f.type === "ALL" && f.segment === "ALL" && f.payer === "ALL" && effectiveMethod(f) === "pooled";

/** What formulary's share of Formulary + Out of formulary is, for a note beside that amount.
 *  Under the mean method the compliance % averages the onco and non-onco ratios and is no
 *  share of it, so the pooled % is named instead. */
export function shareOfRatio(s: OverviewScope): string {
  const h = s.d.headline;
  return effectiveMethod(s.filters) === "mean"
    ? `pooled compliance ${pct(h.pooled_pct)} is formulary's share`
    : `compliance ${pct(h.compliance_pct)} is formulary's share`;
}

export type BudgetView = {
  value: number | null;
  /** True when the figure on screen is the one the budget was set for. */
  applies: boolean;
  /** Why it is not compared: the figure counts units sold (the budget is a drug-cost target),
   *  all hospitals have none, HCG set none for this unit, HCG set it different budgets in the
   *  months selected (no one budget for the span), or a filter narrows the figure. */
  why: "units" | "network" | "unit" | "differs" | "filters" | null;
};

export function budgetOf(s: OverviewScope): BudgetView {
  // Units are never judged: there is no budget to show, whatever HCG set for the unit.
  if (!s.m.budgetJudged) return { value: null, applies: false, why: "units" };
  const b = s.d.headline.budget_pct;
  // An API that sends no budget field at all predates the PAN MIS: the default target.
  const value = b === undefined ? (s.meta.target_pct ?? null) : b;
  const why = value == null
    ? (s.network ? "network" : s.d.headline.budget_source === "differs" ? "differs" : "unit")
    : !wholeSpend(s.filters) ? "filters" : null;
  return { value, applies: value != null && why == null, why };
}

/** The filters a figure was computed under, for a drawer's header. A figure that ignores a
 *  filter says what it uses instead (`payer`, `material`); a list of every unit leaves the
 *  hospital out, and an amount no compliance method touches leaves Method out. On units a
 *  "Counted in: Units" chip says so, as the list endpoints' own scope chips do. */
export function filterChips(s: OverviewScope, o: { payer?: string; material?: string; hospital?: boolean; method?: boolean } = {}): DrawerFilter[] {
  const f = s.filters;
  return [
    ...(o.hospital === false ? [] : [{ label: "Hospital", value: s.where }]),
    { label: "Month", value: s.when },
    { label: "Patients", value: f.type === "ALL" ? "IP + OP" : f.type },
    { label: "Material", value: o.material ?? (f.segment === "ALL" ? "Onco + non-onco" : f.segment === "onco" ? "Onco" : "Non-onco") },
    { label: "Payer", value: o.payer ?? (f.payer === "ALL" ? "All payers" : payerLabel(f.payer)) },
    ...(o.method === false ? [] : [{ label: "Method", value: effectiveMethod(f) === "mean" ? "Mean of onco & non-onco" : "Pooled" }]),
    ...(s.m.units ? [{ label: "Counted in", value: s.m.label }] : []),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer pieces
// ─────────────────────────────────────────────────────────────────────────────
/** One column of a month table: what it prints from the month's trend row and the one before it,
 *  and (`raw`, `unit`) the figure its CSV holds: exact rupees or units, a % as a number. */
export type MonthColumn = {
  key: string; label: string; value: (r: TrendRow, before: TrendRow | null) => string; strong?: boolean;
  raw?: (r: TrendRow, before: TrendRow | null) => number | string | null | undefined;
  unit?: CsvColumn<unknown>["unit"];
};

/** Every published month as a row (the months in the selection shaded), for a drawer's "By
 *  month" tab. Each column prints from the month's trend row and the one before it; the table
 *  downloads as CSV (table/DownloadCsv). */
export function MonthTable({ s, columns, caption }: { s: OverviewScope; columns: MonthColumn[]; caption: string }) {
  const rows = [...(s.d.trend || [])].sort((a, b) => a.period.localeCompare(b.period));
  const sel = new Set(s.d.scope?.months || []);
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>No months in this selection.</p>;
  // Each row with the month before it, so a change column writes the same figure it prints.
  const paired = rows.map((r, i) => ({ r, before: i ? rows[i - 1] : null }));
  const csv: CsvColumn<(typeof paired)[number]>[] = [
    { label: "Month", value: ({ r }) => r.label || monthLabel(s.meta, r.period), text: true },
    { label: "Period", value: ({ r }) => r.period, text: true },
    ...columns.map((c): CsvColumn<(typeof paired)[number]> => {
      const raw = c.raw;
      return { label: c.label, value: ({ r, before }) => c.value(r, before), raw: raw && (({ r, before }) => raw(r, before)), unit: c.unit };
    }),
  ];
  return (
    <div className="overflow-x-auto">
      <DownloadCsv rows={paired} columns={csv} page={FORMULARY_PAGE} caption={caption} />
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
                  {r.label || monthLabel(s.meta, r.period)}
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

/** One row per slice (segment, patient type): its own compliance, the gap from 100% as a bar
 *  from zero on one shared scale, and the exact amounts behind it, in `m`'s unit. */
export function SplitRows({ rows, m }: { rows: { key: string; label: string; s: Split }[]; m: Measure }) {
  const on = useArmed();
  const gmax = niceMax(Math.max(0.5, ...rows.map((r) => gapOf(r.s.compliance_pct) ?? 0)));
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p>;
  return (
    <div className="flex flex-col gap-5">
      {rows.map((r, i) => {
        const g = gapOf(r.s.compliance_pct);
        return (
          <div key={r.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold" style={{ color: INK }}>{r.label}</span>
              <span className="text-[20px] font-bold tabular-nums leading-none" style={{ color: RATE_COL }}>{pct(r.s.compliance_pct)}</span>
            </div>
            <div className="relative h-[8px] rounded-full mt-2 overflow-hidden" style={{ background: TRACK }}>
              <div className="absolute left-0 top-0 bottom-0 rounded-full"
                style={{ width: on && g != null ? `${(g / gmax) * 100}%` : "0%", background: OOF_COL, transition: `width 620ms ${EASE} ${140 + i * 80}ms` }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11.5px] tabular-nums" style={{ color: SUB }}>
              <span className="inline-flex items-center gap-1.5"><Swatch color={F_COL} />Formulary <b style={{ color: INK }}>{m.exact(r.s.formulary)}</b></span>
              <span className="inline-flex items-center gap-1.5"><Swatch color={OOF_COL} />Out of formulary <b style={{ color: INK }}>{m.exact(r.s.out_of_formulary)}</b></span>
              <span className="inline-flex items-center gap-1.5"><Swatch color={NF_COL} hatched />Non formulary {m.exact(r.s.non_formulary)}</span>
              <span>in the ratio <b style={{ color: INK }}>{m.exact(inRatioOf(r.s))}</b>{m.units ? " units" : null}</span>
              <span>{num(r.s.lines)} lines</span>
            </div>
          </div>
        );
      })}
      <div className="text-[10.5px]" style={{ color: SUB }}>bar = points short of 100%, on one scale from 0 to {fmtPts(gmax)}</div>
    </div>
  );
}

/** "How these figures are built": the method notes every Overview drawer ends its Method tab on.
 *  The answer's own notes are worded for its basis; the page's general notes (meta) are worded
 *  for value ("on drug cost"), so on units only the answer's are shown. */
export function HowBuilt({ s }: { s: OverviewScope }) {
  const notes = Array.from(new Set([...(s.d.notes || []), ...(s.m.units ? [] : s.meta.notes || [])]));
  return (
    <DrawerSection title="How these figures are built">
      <ul className="space-y-1.5 text-[12px] leading-relaxed list-disc pl-5" style={{ color: SUB }}>
        <li>Source: HIS IP + OP pharmacy sales lines, one consolidated file per month. Each month is classified with that month&apos;s Item Master, and payers are bucketed with the Payer Master.</li>
        <li>
          {s.m.units
            ? <>Amounts are units sold (QTY): tablets, vials and bottles added together, because the sales files keep no unit of measure. A quantity figure is never set against the budget, which is a drug-cost target; switch the header to Value for the budgeted figures.</>
            : <>Values are cost (TOTALCOSTPRICE).</>}
          {" "}Every percentage is a ratio of sums, recomputed for the selection — never an average of hospital or monthly percentages.
        </li>
        {notes.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </DrawerSection>
  );
}

/** A short paragraph of method text inside a drawer tab. */
export function MethodText({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-[12.5px] leading-relaxed mb-7" style={{ color: SUB }}>{children}</div>;
}
