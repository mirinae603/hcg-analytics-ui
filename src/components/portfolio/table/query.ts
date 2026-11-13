// The list contract every table endpoint answers (backend: app/core/table_query.py), in one
// place for KpiTable, its FacetBar and the CSV export:
//   request   scope params (Plant, Month, Group …, applied before aggregation), then the
//             table's own filters as f.<field>=<value> (repeated: OR within a field, AND across
//             fields) or f.<field>.from / .to for a range, then global_filter + search_fields.
//   answer    { data, total, sums? } and, only when asked with facets=1 (or facets=only for a
//             typeahead), the options of each filter with row counts and the scope in words.
// An endpoint that has not adopted the contract ignores the new params and sends no `facets`,
// so the table simply shows no filter buttons.
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

/** One option of a facet; `count` = the rows it would match given every OTHER filter. */
export type FacetValue = { value: string; label: string; count: number };
/** Inclusive bounds of a range facet, as ISO dates or numbers in text. */
export type Range = { from?: string; to?: string };
export type Facet = {
  field: string;
  label: string;
  kind: "multi" | "range";
  /** Month newest first, Hospital by name, the rest by count; selected values always listed. */
  values?: FacetValue[];
  /** Values not listed (over the server's limit, or not matching the fq.<field> text). */
  more?: number;
  range?: { min: string | number | null; max: string | number | null };
  selected: string[] | Range;
};
/** A filter applied upstream of the table, in words and as a file-name token
 *  ("Hospital: KR Bangalore" / HC05, "Aug-26" / 2026-08). */
export type ScopeChip = { param: string; label: string; value: string; value_label: string; token: string };
/** The table's own filters: values ticked per multi facet, bounds per range facet. */
export type Selection = Record<string, string[] | Range>;
export type Row = Record<string, unknown>;
export type TableAnswer = {
  data: Row[];
  total: number;
  sums?: Record<string, number> | null;
  facets?: Facet[];
  scope?: ScopeChip[];
};
export type Params = [string, string][];

/** For a table with a share column: the server works shares out over the whole selection
 *  before the table's own filters apply, so a filtered table's shares no longer add to 100%. */
export const SHARES_NOTE = "The filters above the table narrow its rows and its Total row; shares stay of the whole selection.";

/** True when a facet's entry in a selection filters anything. */
export const isActive = (v: string[] | Range | undefined): boolean =>
  !!v && (Array.isArray(v) ? v.length > 0 : !!(v.from || v.to));

/** `sel` with `field` set to `v`, or without it when `v` filters nothing. */
export function setField(sel: Selection, field: string, v: string[] | Range): Selection {
  const rest = { ...sel };
  delete rest[field];
  return isActive(v) ? { ...rest, [field]: v } : rest;
}

/** The f.* params of a selection. */
export function selectionParams(sel: Selection): Params {
  const out: Params = [];
  for (const [field, v] of Object.entries(sel)) {
    if (Array.isArray(v)) {
      for (const x of v) out.push([`f.${field}`, x]);
    } else {
      if (v.from) out.push([`f.${field}.from`, v.from]);
      if (v.to) out.push([`f.${field}.to`, v.to]);
    }
  }
  return out;
}

export const tableUrl = (base: string, params: Params): string =>
  `${DASHBOARD_API_BASE_URL}${base}?${new URLSearchParams(params).toString()}`;

/** A failed table request, with the server's own words when it sent a string `detail` (an
 *  unknown f.<field> names the fields the table offers). */
export class TableError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** One answer of a list endpoint. A 4xx/5xx body is {detail}, not {data,total}: without the
 *  status check it rendered as an empty table, indistinguishable from "no rows match". */
export async function getTable(base: string, params: Params, signal?: AbortSignal): Promise<TableAnswer> {
  const res = await fetch(tableUrl(base, params), { signal });
  if (!res.ok) {
    let detail: unknown = null;
    try { detail = (await res.json())?.detail; } catch { /* not JSON */ }
    throw new TableError(res.status, typeof detail === "string" ? detail : `HTTP ${res.status}`);
  }
  return (await res.json()) as TableAnswer;
}

export const isAbort = (e: unknown): boolean => (e as { name?: unknown } | null)?.name === "AbortError";

// ─────────────────────────────────────────────────────────────────────────────
// Export file name
// ─────────────────────────────────────────────────────────────────────────────
/** Longest file name, extension included: long enough for a few filters, short enough for
 *  every file system and for a mail attachment list. */
const MAX_NAME = 120;
/** Longest single value inside a name, so one long manufacturer cannot crowd out the rest. */
const MAX_VALUE = 32;

/** A file-name-safe form of `s`: ASCII letters, digits and single hyphens, case kept (HC05,
 *  FORMULARYO). `_` separates the parts of a name, so it never appears inside one. */
export const slug = (s: string): string =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const clip = (s: string) => s.slice(0, MAX_VALUE).replace(/-+$/, "");
/** A value inside a file name; the server lists blank cells as the value "". */
const valueToken = (s: string) => clip(slug(s)) || "blank";

/** Today as YYYY-MM-DD on the reader's clock (toISOString would give yesterday before 05:30 IST). */
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The scope to name a file by. The server's echo when the answer carried one: it names every
 *  narrowing it applied and leaves out defaults (pooled method). An endpoint that has not
 *  adopted the contract echoes nothing; its file is named by the request's own params, as
 *  param-value, so it still says which hospital, month or group it holds. */
export function namedScope(echoed: ScopeChip[] | null, sent: Params): ScopeChip[] {
  return echoed ?? sent.map(([k, v]) => ({ param: k, label: k, value: v, value_label: v, token: `${k.toLowerCase()}-${v}` }));
}

/** One token per filtered facet: label-value, label-a+b for two values, label-n for more;
 *  ranges as label-from-to. In the facets' own order. */
function facetTokens(facets: Facet[], sel: Selection): string[] {
  const label = new Map(facets.map((f) => [f.field, f.label]));
  const fields = [...facets.map((f) => f.field).filter((f) => f in sel), ...Object.keys(sel).filter((f) => !label.has(f))];
  return fields.flatMap((field) => {
    const v = sel[field];
    if (!isActive(v)) return [];
    const name = slug(label.get(field) ?? field).toLowerCase();
    if (Array.isArray(v)) return [`${name}-${v.length <= 2 ? v.map(valueToken).join("+") : v.length}`];
    const from = v.from ? valueToken(v.from) : "", to = v.to ? valueToken(v.to) : "";
    return [`${name}-${from && to ? `${from}-to-${to}` : from ? `from-${from}` : `to-${to}`}`];
  });
}

/** `<kpiKey>_<scope tokens>_<facet tokens>_<search>_<YYYY-MM-DD>.csv`, at most 120 characters,
 *  with "all" in the middle when nothing narrows the table. The date always survives the cut.
 *  Every scope token is kept, even one the kpiKey happens to spell (Payer CASH in
 *  spend-cash-items): a kpiKey names the table, never a filter.
 *  e.g. formulary-items_HC05_2026-08_onco_B_class-FORMULARYO_2026-10-15.csv */
export function exportFileName(kpiKey: string, scope: ScopeChip[], facets: Facet[], sel: Selection, search: string, today: string): string {
  const key = slug(kpiKey);
  const parts = [
    ...scope.map((c) => clip(slug(c.token))),
    ...facetTokens(facets, sel),
    ...(search ? [`search-${clip(slug(search))}`] : []),
  ].filter(Boolean);
  const tail = `_${today}.csv`;
  const stem = `${key || "table"}_${parts.length ? parts.join("_") : "all"}`;
  return `${stem.slice(0, MAX_NAME - tail.length).replace(/[-_+]+$/, "")}${tail}`;
}
