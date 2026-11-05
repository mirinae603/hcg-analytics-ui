// Typed access to the data exports (backend app/api/exports.py).
//
// GET /export/meta lists each dataset: the months it holds and its rows per month, its columns
// (field, label, kind), the filters it takes with the values it offers, where its rows come
// from and what they leave out. Each dataset's own endpoint (/export/sales, /export/grn) is a
// paged table on the shared contract ({data,total,sums,facets,scope}), so KpiTable's Export
// CSV writes the whole selection with no download code here. Nothing in this file sums a
// figure: it shapes the query and puts what meta says into words.
import { apiFetch } from "@/utils/api";
import type { Col, Kind } from "@/lib/kpiRegistry";
import { payerLabel } from "../formulary/api";

/** The datasets the page offers, one tab each, in HCG's words. The keys are meta's dataset
 *  keys; the tabs are drawn before meta arrives, so they are listed here. */
export type DatasetKey = "sales" | "grn";
export const TABS: { key: DatasetKey; label: string }[] = [
  { key: "sales", label: "IP & OP sales by item" },
  { key: "grn", label: "GRN purchases" },
];
export const DEFAULT_TAB: DatasetKey = "sales";

/** The tab named by a `?view=` query string; null when it names none (the page then opens on
 *  the first tab). */
export function readView(search: string): DatasetKey | null {
  const v = new URLSearchParams(search).get("view");
  return TABS.some((t) => t.key === v) ? (v as DatasetKey) : null;
}

export type ExportColumn = { field: string; label: string; kind: string };
export type Option = { key: string; label: string };
export type ExportDataset = {
  key: string;
  label: string;
  /** The list endpoint the table pages: "/export/sales". */
  endpoint: string;
  /** Where the rows come from, in words. */
  source: string;
  /** False when the table has not been built; `note` then says how to build it. */
  available: boolean;
  built_at: string | null;
  /** 'YYYY-MM' the table holds, oldest first. */
  months: string[];
  month_labels: Record<string, string>;
  latest: string | null;
  /** Rows per month over every hospital, before any filter. */
  rows_by_month: Record<string, number>;
  rows: number;
  columns: ExportColumn[];
  /** The page filters the endpoint takes: "Plant", "Month", "Type", "Segment", "Payer". */
  params: string[];
  /** The values each of those filters offers: codes ("IP", "CASH") or {key, label}. */
  options: Record<string, (string | Option)[]>;
  /** What one row is and what the rows leave out, in plain words. */
  note: string;
};
export type ExportMeta = {
  datasets: ExportDataset[];
  /** Notes for both datasets: no identifiers are exported, a file holds what its table shows,
   *  units add packs of every kind. */
  notes: string[];
  data_as_of: string | null;
};

export const getMeta = () => apiFetch<ExportMeta>("/export/meta");

/** The page filters on one dataset. `month` is a period ('2026-08'), 'ALL', or '' until one is
 *  picked (the dataset's latest month is then shown); the others are 'ALL' or one of the values
 *  meta offers. Kept per tab: the two tables hold different months. */
export type Filters = { month: string; type: string; segment: string; payer: string };
export const DEFAULT_FILTERS: Filters = { month: "", type: "ALL", segment: "ALL", payer: "ALL" };

type ChoiceField = "type" | "segment" | "payer";
/** A filter beyond hospital and month: its query param (as meta's `params` names it), the
 *  Filters field it reads, its chip label, the words for "no filter" and for one value. */
type Choice = {
  param: string;
  field: ChoiceField;
  label: string;
  all: string;
  /** A code's label when meta sends bare codes: payers are spelt out as on every other page. */
  name?: (code: string) => string;
  /** The value in the selection words on the right of the strip. */
  word: (o: Option) => string;
};
const CHOICES: Choice[] = [
  { param: "Type", field: "type", label: "Patients", all: "IP + OP", word: (o) => `${o.label} only` },
  { param: "Segment", field: "segment", label: "Material type", all: "All materials", word: (o) => o.label },
  { param: "Payer", field: "payer", label: "Payer", all: "All payers", name: payerLabel, word: (o) => o.label },
];
export type ChoiceControl = Choice & { options: Option[] };

/** The filters `ds` takes beyond hospital and month, each with the values meta offers for it;
 *  one meta offers no value for is left out rather than drawn as a chip with nothing in it. */
export function choicesOf(ds: ExportDataset): ChoiceControl[] {
  return CHOICES
    .filter((c) => ds.params.includes(c.param))
    .map((c) => ({
      ...c,
      options: (ds.options?.[c.param] ?? []).map((o) => (typeof o === "string" ? { key: o, label: c.name ? c.name(o) : o } : o)),
    }))
    .filter((c) => c.options.length > 0);
}

/** "Aug-26" for '2026-08' (from meta), else the period itself. */
export const monthLabel = (ds: ExportDataset, m: string) => ds.month_labels?.[m] ?? m;

/** "Jun-26 – Aug-26" for the months `ds` holds; one label for one month. */
export function monthsHeld(ds: ExportDataset): string {
  const first = ds.months[0], last = ds.months[ds.months.length - 1];
  if (!first) return "—";
  return first === last ? monthLabel(ds, first) : `${monthLabel(ds, first)} – ${monthLabel(ds, last)}`;
}

/** The month in words: "Aug-26", or the months held for 'ALL'. */
export const monthWords = (ds: ExportDataset, month: string) => (month === "ALL" ? monthsHeld(ds) : monthLabel(ds, month));

/** The filters as the page applies them to `ds`: a month the table no longer holds becomes its
 *  latest (until one is picked the page opens on the latest), and a value the table does not
 *  offer becomes 'ALL', so the chips, the words and the request always agree. */
export function fitFilters(ds: ExportDataset, f: Filters): Filters {
  const month = f.month === "ALL" || ds.months.includes(f.month) ? f.month : ds.latest ?? ds.months[ds.months.length - 1] ?? "ALL";
  const out: Filters = { ...f, month };
  const offered = choicesOf(ds);
  for (const c of CHOICES) {
    const v = out[c.field];
    if (v !== "ALL" && !offered.find((o) => o.field === c.field)?.options.some((o) => o.key === v)) out[c.field] = "ALL";
  }
  return out;
}

/** Query params for fitted filters, only those `ds` takes. Month is always sent as the month
 *  shown, so the table's scope and the file's name say which month it holds. Plant travels
 *  separately (KpiTable's `plant`). */
export function exportParams(ds: ExportDataset, f: Filters): Record<string, string> {
  const p: Record<string, string> = {};
  if (ds.params.includes("Month") && f.month) p.Month = f.month;
  for (const c of choicesOf(ds)) if (f[c.field] !== "ALL") p[c.param] = f[c.field];
  return p;
}

/** The filters beyond hospital and month that narrow `ds`, in words ("IP only · Onco · Cash"). */
export function narrowing(ds: ExportDataset, f: Filters): string[] {
  return choicesOf(ds).flatMap((c) => {
    const o = c.options.find((x) => x.key === f[c.field]);
    return o ? [c.word(o)] : [];
  });
}

/** Rows `ds` holds in `month` ('ALL' = every month), over every hospital, before any filter. */
export function rowsIn(ds: ExportDataset, month: string): number {
  const months = month === "ALL" ? ds.months : [month];
  return months.reduce((n, m) => n + (ds.rows_by_month?.[m] ?? 0), 0);
}

const KINDS: readonly Kind[] = ["inr", "num", "pct", "pct2", "date", "text", "bool"];
const toCol = (c: ExportColumn): Col => ({
  field: c.field, label: c.label,
  // meta sends the table's own kinds (inr | num | text | date); anything else reads as text.
  kind: (KINDS as readonly string[]).includes(c.kind) ? (c.kind as Kind) : "text",
});

/** The material code leads every export, with the item's name beside it in its own column: the
 *  code is the key HCG's masters and lists are matched on (never the description), so a file
 *  opened in Excel can be looked up on its first column. The other columns keep meta's order. */
const LEAD_FIELDS = ["material", "material_desc"];

/** meta's columns as the table's (and so the file's) columns. */
export function tableColumns(ds: ExportDataset): Col[] {
  const cols = ds.columns.map(toCol);
  const lead = LEAD_FIELDS.flatMap((f) => cols.filter((c) => c.field === f));
  return [...lead, ...cols.filter((c) => !LEAD_FIELDS.includes(c.field))];
}
