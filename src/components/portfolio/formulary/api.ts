// Typed access to the /formulary/* endpoints (backend app/api/formulary.py).
//
// The server does every sum and every percentage (ratio of sums, never an average of
// percentages), so nothing here recomputes a compliance figure — it only shapes the query
// and carries the answer. Percentages arrive as null when their denominator is 0 and must
// render as "—", never 0% or 100%.
//
// Every amount is cost in rupees, or units sold when the header's Value ↔ Quantity switch asks for
// units (Basis=qty): the field names stay the same, and the answer's scope says which it is
// (measure.ts prints it accordingly).
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";
import type { Region } from "@/context/RegionContext";
import { basisParam, type Basis } from "@/context/BasisContext";

export type View = "overview" | "doctors" | "items" | "scheme" | "rules";
export type PatientType = "ALL" | "IP" | "OP";
export type Segment = "ALL" | "onco" | "non-onco";
export type Payer = "ALL" | "CASH" | "CASH(TPA)" | "GOV";
export type Method = "pooled" | "mean";
export type Group = "A" | "B" | "C";
export type SchemeKind = "restricted" | "preferred";

export const VIEWS: { key: View; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "doctors", label: "Doctors" },
  { key: "items", label: "Items" },
  { key: "scheme", label: "Scheme brands" },
  { key: "rules", label: "Brand rules" },
];

/** The tab named by a `?view=` query string; null when it names none, and the page then opens
 *  on the Overview. A link to a tab that no longer exists (the PAN units tab's `?view=pan`)
 *  names none. */
export function readView(search: string): View | null {
  const v = new URLSearchParams(search).get("view");
  return VIEWS.some((x) => x.key === v) ? (v as View) : null;
}

/** Page-level filters. `month` is a period ('2026-08') or 'ALL'. `basis` is the header's
 *  Value ↔ Quantity switch, copied in by the page (never set from the filter strip): value when
 *  absent, so a caller that predates the switch asks for what it always did. */
export type Filters = { month: string; type: PatientType; segment: Segment; payer: Payer; method: Method; basis?: Basis };

export type Meta = {
  months: string[];
  latest: string | null;
  month_labels?: Record<string, string>;
  hospitals?: { plant: string; name: string; his_code: string; his_name: string }[];
  types?: string[];
  segments?: { key: string; label: string }[];
  payers?: string[];
  methods?: { key: string; label: string }[];
  /** The default budget, used for every hospital until HCG's PAN MIS has been read. */
  target_pct?: number;
  /** The PAN MIS workbook the unit budgets come from; null until it is read. */
  hcg_mis?: { file: string | null; period: string | null; built_at: string | null } | null;
  built_at?: string | null;
  sources?: Record<string, unknown>;
  /** The page's general notes, worded for drug cost; /formulary/meta?Basis=qty words the same
   *  notes for units (and adds the units note). The overview's ratio and method notes are these
   *  same strings for its basis, so a list of both drops the repeats. */
  notes?: string[];
};

/** Formulary (A) / Out of Formulary (B) / Non Formulary (C) for one slice: cost, or units on
 *  the units view. */
export type Split = {
  compliance_pct: number | null;
  formulary: number;
  out_of_formulary: number;
  non_formulary: number;
  lines: number;
};
export type SchemeBlock = {
  cost: number;
  lines: number;
  share_pct: number | null;
  onco?: { cost: number; share_pct: number | null };
  non_onco?: { cost: number; share_pct: number | null };
};

/** One row of HCG's "Onco and Non Onco Formulary Consumption" table. Unlike the compliance %,
 *  every % here is value ÷ that row's total (Formulary + Out of formulary + Non formulary). */
export type ConsumptionRow = {
  segment: "onco" | "non-onco" | "all";
  formulary: number | null;
  out_of_formulary: number | null;
  non_formulary: number | null;
  total: number | null;
  formulary_pct: number | null;
  oof_pct: number | null;
  nf_pct: number | null;
  restricted_scheme: number | null;
  restricted_scheme_pct: number | null;
  preferred_scheme: number | null;
  preferred_scheme_pct: number | null;
  restricted_cash_tpa: number | null;
  restricted_cash_tpa_pct: number | null;
};

/** The unit split over every hospital together (by_hospital's own rows and filters, on the
 *  basis): the Total row under each unit's split. Its shares are the server's, a ratio of the
 *  summed amounts; null when the sum is 0. */
export type UnitMixTotal = {
  formulary: number;
  out_of_formulary: number;
  non_formulary: number;
  total: number;
  formulary_share_pct: number | null;
  oof_share_pct: number | null;
  nf_share_pct: number | null;
};

/** One payer's consumption (the spend email's payer-wise view; HCG's S5 'Summary' sheet). */
export type PayerRow = {
  payer: "CASH" | "CASH(TPA)" | "GOV" | "ALL" | string;
  onco: number; non_onco: number; consumables: number; drugs: number; total: number;
  share_pct: number | null;
  onco_ip: number; onco_op: number; non_onco_ip: number; non_onco_op: number;
  formulary: number; out_of_formulary: number; non_formulary: number;
  compliance_pct: number | null;
};
export type PayerClassRow = {
  formulary_class: string; payer: string;
  onco_ip: number; onco_op: number; onco: number;
  non_onco_ip: number; non_onco_op: number; non_onco: number; total: number;
};

export type TrendRow = Split & {
  period: string; label: string; pooled_pct: number | null; mean_pct: number | null;
  budget_pct?: number | null; in_ratio?: number; total?: number;
};

/** Where a hospital's budget comes from: HCG's PAN MIS, or the default before it is read.
 *  "differs": the MIS sets the hospital a budget, but not one budget for the months selected (a
 *  mid-year change, or a span across the April financial-year boundary), so budget_pct is null
 *  and the answer's notes name each month's budget. Not the same as "no budget for this unit". */
export type BudgetSource = "hcg_mis" | "default" | "differs";

export type Overview = {
  /** `basis` is what every amount counts; `budget_judged` is false on units (no budget then,
   *  anywhere). Both are absent from an API that predates the switch: value, judged. */
  scope: {
    plant: string | null; plant_name: string | null; his_name: string | null; months: string[]; type: string; segment: string; payer: string; method: string;
    basis?: Basis; budget_judged?: boolean;
  };
  /** budget_pct is null for all hospitals together (HCG budgets each unit) and for a unit
   *  HCG sets no budget for. */
  headline: Split & { pooled_pct: number | null; mean_pct: number | null; onco_pct: number | null; non_onco_pct: number | null; total: number; in_ratio?: number; budget_pct?: number | null; budget_source?: BudgetSource | null };
  trend: TrendRow[];
  segments: (Split & { key: string; label: string })[];
  by_type: (Split & { type: string })[];
  /** Every unit for the same filters, whatever the hospital selector says. `total` and the three
   *  shares are the unit split: formulary, out of formulary and non formulary as parts of their
   *  sum (A + B + C), on the basis; null shares when that sum is 0. Absent from an older API. */
  by_hospital: (Split & {
    plant: string; name: string; his_code: string; his_name: string; rank: number; selected: boolean; budget_pct?: number | null;
    total?: number; formulary_share_pct?: number | null; oof_share_pct?: number | null; nf_share_pct?: number | null;
  })[];
  by_class: { formulary_class: string; formulary_group: string; cost: number; lines: number; share_pct: number | null }[];
  scheme: {
    restricted: SchemeBlock; preferred: SchemeBlock; restricted_cash_tpa?: SchemeBlock; gov_total: number;
    /** The drug spend (every payer) each scheme % divides by. */
    base?: { all: number; onco: number; non_onco: number };
  };
  // Added for the email-coverage work; absent on an older API, so every reader checks.
  consumption?: { scope_note?: string | null; rows: ConsumptionRow[] };
  by_payer?: { rows: PayerRow[]; classes: PayerClassRow[] };
  /** The same measure over every hospital for the same filters (a ratio of sums, as the
   *  headline is): the reference line where one unit is drawn among all of them. Absent from an
   *  API that does not send it, and the line is then not drawn. */
  network?: { compliance_pct: number | null } | null;
  /** Every unit together, for the Mix by unit table's Total row. Absent from an older API: no
   *  Total row then (it is never worked out here). */
  unit_mix_total?: UnitMixTotal | null;
  notes?: string[];
  data_as_of?: string | null;
};

export const DEFAULT_FILTERS: Filters = { month: "", type: "ALL", segment: "ALL", payer: "ALL", method: "pooled", basis: "value" };

/** The global hospital selector as a `Plant=` value: the SAP code when there is one (HIS and
 *  SAP names differ for most sites), and 'ALL' for "All Plants". */
export function plantParam(region: Region): string {
  const v = region.code || region.name;
  return !v || v === "All Plants" ? "ALL" : v;
}

/** The month the page shows for the month picked: kept when it is published (or 'ALL'),
 *  otherwise the latest. Until a month is picked the page opens on the latest. */
export function monthFor(meta: Meta, month: string): string {
  if (month === "ALL") return month;
  return month && meta.months.includes(month) ? month : meta.months[meta.months.length - 1] ?? "ALL";
}

/** Mean-of-ratios only exists across both segments; with one segment chosen it IS pooled. */
export const effectiveMethod = (f: Filters): Method => (f.segment === "ALL" ? f.method : "pooled");

/** Query params for the current filters. Plant travels separately (KpiTable's `plant`). The
 *  basis rides along only when it is units, so a value request is the same URL (and the same
 *  cache entry) it always was. */
export function filterParams(f: Filters, opts: { method?: boolean; payer?: boolean } = {}): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.month) p.Month = f.month;
  if (f.type !== "ALL") p.Type = f.type;
  if (f.segment !== "ALL") p.Segment = f.segment;
  if (opts.payer !== false && f.payer !== "ALL") p.Payer = f.payer;
  if (opts.method) p.Method = effectiveMethod(f);
  return { ...p, ...basisParam(f.basis ?? "value") };
}

/** The filters in value, whatever the header switch says. Brand rules are rupee measures (HCG
 *  sets them on spend, and their endpoints have no quantity version), so the Brand rules tab and
 *  its guidelines card always ask in rupees. */
export const valueOnly = (f: Filters): Filters => (f.basis && f.basis !== "value" ? { ...f, basis: "value" } : f);

export function toQuery(params: Record<string, string>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  return q.toString();
}

/** A readable reason from an apiFetch failure (FastAPI sends {detail}). */
export function errText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "The request failed.";
}

export const getMeta = () => apiFetch<Meta>("/formulary/meta");

// Answers are cached per request for the life of the page, so moving between tabs that read
// the same answer (Overview and Scheme) does not refetch. A failure is dropped from the cache
// so the next visit retries.
export function cachedFetch<T>(cache: Map<string, Promise<T>>, path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    p = apiFetch<T>(path);
    cache.set(path, p);
    p.catch(() => cache.delete(path));
    if (cache.size > 40) cache.delete(cache.keys().next().value as string);
  }
  return p;
}

export type Fetched<T> = { data: T | null; error: string | null; loading: boolean };

/** `get(query)` as state; keeps the previous answer on screen while a new one loads.
 *  `enabled: false` holds the request back (a drawer tab that is not open yet). `get` must be
 *  a module-level function: it is an effect dependency. */
export function useFetched<T>(get: (query: string) => Promise<T>, query: string, enabled = true): Fetched<T> {
  const [state, setState] = useState<Fetched<T>>({ data: null, error: null, loading: enabled });
  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    get(query)
      .then((d) => { if (!dead) setState({ data: d, error: null, loading: false }); })
      .catch((e) => { if (!dead) setState({ data: null, error: errText(e), loading: false }); });
    return () => { dead = true; };
  }, [get, query, enabled]);
  return state;
}

const overviewCache = new Map<string, Promise<Overview>>();
export const getOverview = (query: string) => cachedFetch(overviewCache, `/formulary/overview?${query}`);

/** The overview for `params`; `enabled: false` holds the request back. */
export const useOverview = (params: Record<string, string>, enabled = true) => useFetched(getOverview, toQuery(params), enabled);

// ── Brand rules (/formulary/rules/*, Task 4) ──────────────────────────────────
export type Verdict = "breach" | "watch" | "info";
export type RuleMeasure = {
  measure: string; label: string; verdict: Verdict; by_doctor: boolean;
  letters: string[]; payers: string[]; patient_types: string[]; alternatives: string[];
  rule_ref?: string | null; note?: string | null;
  cost: number; lines: number; share_pct: number | null;
  onco: { cost: number; share_pct: number | null };
  non_onco: { cost: number; share_pct: number | null };
  alternative: { yes: number; no: number; "not in list": number } | null;
};
export type RulesOverview = {
  scope: { plant: string | null; plant_name: string | null; his_name: string | null; months: string[]; type: string; segment: string };
  drug_spend: { total: number; onco: number; non_onco: number };
  measures: RuleMeasure[];
  selected: string;
  /** drug_spend = that month's / hospital's drug spend (every payer), the base of share_pct. */
  trend: { period: string; label: string; cost: number; share_pct: number | null; drug_spend?: number }[];
  by_hospital: { plant: string; name: string; his_code: string | null; his_name: string | null; cost: number; lines: number; share_pct: number | null; rank: number; selected: boolean; drug_spend?: number }[];
  notes?: string[];
  data_as_of?: string | null;
};

const rulesCache = new Map<string, Promise<RulesOverview>>();
const getRulesOverview = (query: string) => cachedFetch(rulesCache, `/formulary/rules/overview?${query}`);

/** The brand-rules overview for `params` (+ Measure); keeps the last answer while loading. */
export const useRulesOverview = (params: Record<string, string>) => useFetched(getRulesOverview, toQuery(params));

/** A payer code from HIS, spelt out for a reader: both pages' filters, charts and drawers name
 *  CASH(TPA) as "Insurance (TPA)". GOV schemes keep their code, as HCG's reports print it. */
export const payerLabel = (p: string) => (p === "CASH" ? "Cash" : p === "CASH(TPA)" ? "Insurance (TPA)" : p);

/** "Aug-26" for '2026-08' (from meta), else the period itself. */
export const monthLabel = (meta: Meta | null, m: string) => meta?.month_labels?.[m] ?? m;

/** "Jun-26 – Aug-26" for a run of periods; one label for one period. */
export function monthsLabel(meta: Meta | null, months: string[]): string {
  if (!months.length) return "—";
  const s = [...months].sort();
  return s.length === 1 ? monthLabel(meta, s[0]) : `${monthLabel(meta, s[0])} – ${monthLabel(meta, s[s.length - 1])}`;
}

/** The row of the month before the selection's only month, from rows of every published month
 *  (oldest first); null when the selection is several months, or its first. What a figure is
 *  compared with when there is no budget. */
export function monthBefore<T extends { period: string }>(rows: T[], months: string[]): T | null {
  if (months.length !== 1) return null;
  const i = rows.findIndex((r) => r.period === months[0]);
  return i > 0 ? rows[i - 1] : null;
}

/** Points short of the 100% target — the out-of-formulary share for pooled. */
export const gapOf = (pct: number | null | undefined) => (pct == null ? null : Math.max(0, 100 - pct));

/** "FY 26-27" for '2026-08' (HCG's financial year runs April to March). */
export function fyOf(period: string): string {
  const y = Number(period.slice(0, 4)), m = Number(period.slice(5, 7));
  const s = m >= 4 ? y : y - 1;
  const yy = (n: number) => String(((n % 100) + 100) % 100).padStart(2, "0");
  return `FY ${yy(s)}-${yy(s + 1)}`;
}

/** Formulary + out of formulary: the amount the compliance % is a share of. The API sends it
 *  as `in_ratio`; an older API does not, and then the two terms are added here (a sum, not a ratio). */
export const inRatioOf = (s: { formulary: number; out_of_formulary: number; in_ratio?: number }) =>
  s.in_ratio ?? (Number(s.formulary) || 0) + (Number(s.out_of_formulary) || 0);

// The axis ceiling is shared with the ledger charts; re-exported so existing imports stand.
export { niceMax } from "@/components/portfolio/ledger/scale";
