// Typed access to GET /executive/overview (backend app/api/executive.py): HCG's pharmacy on one
// screen — sales and margin, formulary compliance, the margin and saving missed, what was paid
// above the usual cheapest, every unit side by side, and the insights and actions those figures
// support.
//
// The server works out every figure from each section's own handler (revenue, formulary, spend,
// prices), so every number here is the one that section's page shows for the same hospital,
// month and filters; nothing is recomputed in the browser. A link to that page carries this
// page's month and filters (shared.drillHref), but the page keeps its own filter strip, which
// is what its figures follow. A section without the month asked for, or not built, sends null (and a note says
// why): a null prints "—", never 0. Insights and actions are the server's fixed rules over the
// same figures, with exact numbers, so they read the same with or without the AI key.
import { useEffect, useState } from "react";
import { ApiError } from "@/utils/api";
import { basisParam, type Basis } from "@/context/BasisContext";
import { cachedFetch, toQuery } from "@/components/portfolio/formulary/api";

export type PatientType = "ALL" | "IP" | "OP";
/** Material type. Consumables have no formulary compliance: those figures come back null. */
export type Segment = "ALL" | "onco" | "non-onco" | "consumables";

/** Page-level filters. `month` is one 'YYYY-MM', 'ALL', or '' until one is picked (the server
 *  then answers for its latest sales month). */
export type Filters = { month: string; type: PatientType; segment: Segment };

export const DEFAULT_FILTERS: Filters = { month: "", type: "ALL", segment: "ALL" };

export type KpiKey = "sales" | "margin_pct" | "compliance" | "oof_share" | "losses" | "extra_paid";
/** Good or bad news, not the figure's direction: "up" = better, "down" = worse, "alert" =
 *  short of a target or money missed, "info" = for the record. */
export type Tone = "up" | "down" | "alert" | "info";
export type Status = "met" | "within" | "below";

export type SparkRow = { period: string; label: string; value: number | null };

/** Where a figure is counted: HIS sales lines, or HCG's purchases (goods receipts). */
export type FigureSource = "sales" | "purchases";

export type Kpi = {
  key: KpiKey;
  label: string;
  value: number | null;
  /** inr = rupees, pct = a %, qty = units sold (the Quantity basis). */
  unit: "inr" | "pct" | "qty";
  /** The same at the previous month with sales; null for the first month, ALL, or no figure. */
  prev: number | null;
  /** value − prev in points (a %), or as a % of prev (an amount); null without prev. */
  delta: number | null;
  delta_unit: "pct" | "pts";
  good_when: "up" | "down";
  /** HCG's budget, for compliance on one unit on the value basis only. */
  target: number | null;
  status: Status | null;
  /** Every month of the KPI's own section: lengths differ (sales three, purchases nine). */
  spark: SparkRow[];
  /** Where the figure is counted: the first of `sources`. */
  source: FigureSource;
  /** Every place its parts are counted, in order: the total missed is ["sales", "purchases"]
   *  (cash & TPA and scheme on sales lines, out of formulary on purchases) when its
   *  out-of-formulary part has figures. */
  sources: FigureSource[];
  /** What the figure is, and why it is blank when it is. */
  note: string;
  /** A few words the tile prints under the figure, or null: the margin %'s "incl. 560 lines
   *  with no cost" (lines with a blank cost price count as cost 0). */
  tag: string | null;
};

export type ExecMonth = { period: string; label: string; sales: boolean; purchases: boolean };

export type TrendRow = {
  period: string; label: string;
  ip_mrp: number; op_mrp: number; mrp: number; cost: number; margin: number; margin_pct: number | null;
  compliance_pct: number | null; qty: number;
};

export type BridgeStep = { key: string; label: string; value: number | null; kind: "total" | "delta"; source: FigureSource };

export type IpOpRow = { type: "IP" | "OP"; label: string; mrp: number; margin: number; margin_pct: number | null; qty: number; share_pct: number | null };

export type UnitRow = {
  plant: string;
  /** The SAP name (what the hospital selector sends back); his_name is HCG's own. */
  name: string;
  his_name: string | null;
  region: string | null;
  /** HCG's own order of its units; null for a unit with sales that HCG's list does not have. */
  pan_order: number | null;
  /** Sales at MRP (rupees on either basis); null when sales have no figures. */
  mrp: number | null;
  margin_pct: number | null;
  compliance_pct: number | null;
  budget_pct: number | null;
  /** Why the budget is blank although HCG sets one: the months selected have different budgets
   *  (the server's sentence); null otherwise. */
  budget_note: string | null;
  status: Status | null;
  /** Compliance change in points since the previous month. */
  delta_pts: number | null;
  formulary_share_pct: number | null;
  oof_share_pct: number | null;
  nf_share_pct: number | null;
  /** Each section's amount for the unit: 0 when the section has the month and the unit none,
   *  null when the section has no figures. */
  oof_loss: number | null;
  cash_loss: number | null;
  scheme_missed: number | null;
  extra_paid: number | null;
  selected: boolean;
};

export type Mix = {
  formulary: number | null; out_of_formulary: number | null; non_formulary: number | null; total: number | null;
  formulary_pct: number | null; oof_pct: number | null; nf_pct: number | null;
};

export type TreeChild = { key: string; label: string; value: number | null };
export type TreeGroupRow = TreeChild & { children: TreeChild[] };

export type FlowData = {
  nodes: { id: string; label: string; column: number }[];
  links: { source: string; target: string; value: number }[];
};

export type TopItem = { material: string; material_desc: string | null; generic_name: string | null; value: number | null; qty: number | null; share_pct: number | null };
export type TopUnit = { plant: string; name: string; value: number | null; qty: number | null; share_pct: number | null };
/** A bottom list's row: money whatever the basis. share_pct is of the selection's sales at MRP. */
type MarginRow = { mrp: number; margin: number; margin_pct: number | null; share_pct: number | null };
export type BottomItem = MarginRow & { material: string; material_desc: string | null; generic_name: string | null };
export type BottomUnit = MarginRow & { plant: string; name: string };

export type Insight = { id: string; tone: Tone; text: string; link: string | null };
export type Action = { id: string; text: string; impact: number | null; link: string | null };

export type ExecScope = {
  plant: string; plant_name: string | null; his_name: string | null;
  month: string; month_label: string;
  prev_month: string | null; prev_label: string | null;
  type: string; segment: string; basis: Basis;
  /** False on the Quantity basis and under a patient-type or material filter: no budget is
   *  compared then. */
  budget_judged: boolean;
};

export type ExecOverview = {
  scope: ExecScope;
  months: ExecMonth[];
  kpis: Kpi[];
  trend: TrendRow[];
  bridge: { steps: BridgeStep[]; note: string };
  ip_op: IpOpRow[];
  units: UnitRow[];
  mix: Mix | null;
  treemap: TreeGroupRow[];
  flow: FlowData;
  /** The ten biggest items (of the selection) and units (of every hospital) by consumption, and
   *  `bottom`: the ten with the lowest margin % among those with at least the server's minimum
   *  share of the sales at MRP (its notes say how much). */
  top: { items: TopItem[]; units: TopUnit[]; bottom: { items: BottomItem[]; units: BottomUnit[] } };
  insights: Insight[];
  actions: Action[];
  notes: string[];
  data_as_of: string | null;
};

/** The query for the filters: Plant always, the rest only when they narrow. Basis rides along
 *  only on Quantity, so a value request is the same URL (and cache entry) it always is. */
export function overviewParams(plant: string, f: Filters, basis: Basis): Record<string, string> {
  const p: Record<string, string> = { Plant: plant };
  if (f.month) p.Month = f.month;
  if (f.type !== "ALL") p.Type = f.type;
  if (f.segment !== "ALL") p.Segment = f.segment;
  return { ...p, ...basisParam(basis) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetching
// ─────────────────────────────────────────────────────────────────────────────
/** Why a request failed: the HTTP status when there was one (503 = a table is not built, 404 =
 *  a hospital the server does not know, 400 = a filter value it refuses) and the reason. */
export type LoadError = { status: number | null; message: string };
export type Loaded<T> = { data: T | null; error: LoadError | null; loading: boolean };

const loadError = (e: unknown): LoadError => ({
  status: e instanceof ApiError ? e.status : null,
  message: e instanceof Error && e.message ? e.message : "The request failed.",
});

// Answers are cached per request for the life of the page: switching a filter back is instant.
// A failure is dropped from the cache (cachedFetch), so a retry asks again.
const cache = new Map<string, Promise<ExecOverview>>();
const getOverview = (query: string) => cachedFetch(cache, `/executive/overview?${query}`);

/** The overview for `params`. Keeps the previous answer on screen while the next one loads, and
 *  keeps a failure's status so the page can say which failure it is. */
export function useExecOverview(params: Record<string, string>): Loaded<ExecOverview> {
  const query = toQuery(params);
  const [state, setState] = useState<Loaded<ExecOverview>>({ data: null, error: null, loading: true });
  useEffect(() => {
    let dead = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    getOverview(query)
      .then((d) => { if (!dead) setState({ data: d, error: null, loading: false }); })
      .catch((e) => { if (!dead) setState({ data: null, error: loadError(e), loading: false }); });
    return () => { dead = true; };
  }, [query]);
  return state;
}
