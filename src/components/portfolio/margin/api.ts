// Typed access to the /revenue/* endpoints (backend app/api/revenue.py): HIS pharmacy sales at
// MRP (revenue), their cost and the margin between, IP and OP, in HCG's formulary buckets.
//
// The server does every sum and every percentage (a ratio of sums, never an average of
// percentages), so nothing here recomputes a figure: it shapes the query and carries the
// answer. A % arrives as null when its MRP is 0 and must print as "—", never 0%.
//
//   GET /revenue/overview   — the Overview tab: headline, previous month, IP / OP, buckets,
//                             material types, every hospital, the trend, what HCG still owes.
//   GET /revenue/materials  — the Items tab: one row per item and bucket, paged (KpiTable), so
//                             its Export CSV pages through every row. (/revenue/items is the
//                             older Dec–May page's endpoint and answers in another shape.)
import { useEffect, useState } from "react";
import { ApiError } from "@/utils/api";
import { cachedFetch, toQuery } from "@/components/portfolio/formulary/api";

export type View = "overview" | "items";
export type PatientType = "ALL" | "IP" | "OP";
/** Material type. Unlike the Formulary page, revenue counts consumables too. */
export type Segment = "ALL" | "onco" | "non-onco" | "consumables";
export type Payer = "ALL" | "CASH" | "CASH(TPA)" | "GOV";
export type BucketKey = "formulary" | "out_of_formulary" | "non_formulary" | "consumables" | "not_in_master";
export type TypeKey = "IP" | "OP";

export const VIEWS: { key: View; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "items", label: "Items" },
];

/** The tab named by a `?view=` query string; null when it names none (the page then opens on
 *  the Overview). */
export function readView(search: string): View | null {
  const v = new URLSearchParams(search).get("view");
  return VIEWS.some((x) => x.key === v) ? (v as View) : null;
}

/** Page-level filters. `month` is a period ('2026-08'), 'ALL', or '' until one is picked (the
 *  server then answers for the latest month it holds). */
export type Filters = { month: string; type: PatientType; segment: Segment; payer: Payer };

export const DEFAULT_FILTERS: Filters = { month: "", type: "ALL", segment: "ALL", payer: "ALL" };

/** The figures every breakdown carries: MRP (revenue), cost, margin = MRP − cost, margin % =
 *  margin ÷ MRP (null when MRP is 0), units sold, sales lines, and the lines whose cost price
 *  was blank in the HIS file (counted as cost 0, as HCG's sheet does) with their MRP. */
export type Block = {
  mrp: number;
  cost: number;
  margin: number;
  margin_pct: number | null;
  qty: number;
  lines: number;
  cost_missing_lines: number;
  mrp_cost_missing: number;
};
/** A Block with its inpatient and outpatient Blocks beside it. */
export type IpOp = Block & { ip: Block; op: Block };

export type TypeRow = Block & { type: TypeKey; label: string; share_pct: number | null };
export type BucketRow = IpOp & { key: BucketKey; label: string; share_pct: number | null };
export type CategoryRow = Block & { key: Exclude<Segment, "ALL">; label: string; share_pct: number | null };
export type HospitalRow = IpOp & {
  plant: string; name: string; his_code: string | null; his_name: string | null;
  /** The unit's MRP ÷ the MRP of every listed unit. */
  share_pct: number | null;
  /** By MRP, largest first; null for a unit with no MRP under the filters (listed last). */
  rank: number | null;
  selected: boolean;
  /** The unit's own figures by HCG's bucket (HCG's unit × category view), cut on the same rows as
   *  the unit's, so they add up to it; `share_pct` is a share of the unit's MRP. Every unit lists
   *  the same buckets, in the same order, so a unit × bucket table lines up. Absent from an API
   *  older than the unit split. */
  buckets?: BucketRow[];
};
export type TrendRow = IpOp & { period: string; label: string };

export type RevenueOverview = {
  scope: { plant: string; plant_name: string | null; his_name: string | null; months: string[]; type: string; segment: string; payer: string };
  months_available: string[];
  month_labels: Record<string, string>;
  headline: Block;
  /** The previous published month for the same selection; only when ONE month is selected. */
  prev_period: string | null;
  prev: Block | null;
  by_type: TypeRow[];
  by_bucket: BucketRow[];
  by_category: CategoryRow[];
  /** Every unit with sales in the selected months, whatever the hospital selector says. */
  by_hospital: HospitalRow[];
  /** Every published month, whatever the Month filter says. */
  trend: TrendRow[];
  notes: string[];
  data_as_of: string | null;
};

/** One row of the Items tab: an item in one bucket over the selection. */
export type MaterialRow = {
  material: string; material_desc: string | null; generic_name: string | null; manufacturer: string | null;
  category: string | null; bucket: BucketKey; bucket_label: string;
  mrp: number; cost: number; margin: number; margin_pct: number | null; qty: number; lines: number;
  hospitals: number; cost_missing_lines: number;
};

/** The global hospital selector travels separately (KpiTable's `plant`); these are the rest. */
export function filterParams(f: Filters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.month) p.Month = f.month;
  if (f.type !== "ALL") p.Type = f.type;
  if (f.segment !== "ALL") p.Segment = f.segment;
  if (f.payer !== "ALL") p.Payer = f.payer;
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetching
// ─────────────────────────────────────────────────────────────────────────────
/** Why a request failed: the HTTP status when there was one (503 = the table is not built,
 *  404 = a hospital the server does not know, 400 = a filter value it refuses) and the reason. */
export type LoadError = { status: number | null; message: string };

/** `settled` is the request the data or the failure answers (null until one has), so a page can
 *  tell the answer to the request it just made from one it already had. */
export type Loaded<T> = { data: T | null; error: LoadError | null; loading: boolean; settled: string | null };

const loadError = (e: unknown): LoadError => ({
  status: e instanceof ApiError ? e.status : null,
  message: e instanceof Error && e.message ? e.message : "The request failed.",
});

/** `get(query)` as state; keeps the previous answer on screen while a new one loads, and the
 *  failure's status so the page can say which failure it is. `get` must be a module-level
 *  function: it is an effect dependency. `enabled: false` holds the request back (a page that
 *  has not read its URL yet would otherwise ask for its defaults first). */
function useLoaded<T>(get: (query: string) => Promise<T>, query: string, enabled = true): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ data: null, error: null, loading: true, settled: null });
  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    get(query)
      .then((d) => { if (!dead) setState({ data: d, error: null, loading: false, settled: query }); })
      .catch((e) => { if (!dead) setState({ data: null, error: loadError(e), loading: false, settled: query }); });
    return () => { dead = true; };
  }, [get, query, enabled]);
  return state;
}

// Answers are cached per request for the life of the page, so moving between the tabs (both
// read the overview) does not refetch. A failure is dropped from the cache so a retry asks again.
const overviewCache = new Map<string, Promise<RevenueOverview>>();
const getOverview = (query: string) => cachedFetch(overviewCache, `/revenue/overview?${query}`);

/** The query string the overview is asked with for `params`: what Loaded.settled names. */
export const overviewQuery = (params: Record<string, string>) => toQuery(params);

/** The revenue overview for `params` (Plant plus the filters); held back while `enabled` is false. */
export const useRevenueOverview = (params: Record<string, string>, enabled = true) => useLoaded(getOverview, overviewQuery(params), enabled);

/** The endpoint the Items tab and the top-items tile page through. */
export const MATERIALS_PATH = "/revenue/materials";
