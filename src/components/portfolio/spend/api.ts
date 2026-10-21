// Typed access to the /spend/* endpoints (backend app/api/spend.py).
//
// The server does every sum and every percentage (ratio of sums, never an average of
// percentages), so nothing here recomputes a figure — it only shapes the query and carries
// the answer. Percentages arrive as null when their denominator is 0 and render as "—".
//
// Fields marked "optional" below were added for the email-coverage work (HCG's monthly
// spend email in the app). They are optional on purpose: a page served by an older API must
// still render — the cards that need them hide.
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";
import { errText, toQuery } from "../formulary/api";

export type Section = "scheme" | "cash" | "oof";
export type View = "overview" | "items" | "doctors";
export type PatientType = "ALL" | "IP" | "OP";
export type Segment = "ALL" | "onco" | "non-onco" | "consumables";
export type Payer = "ALL" | "CASH" | "CASH(TPA)" | "GOV";

// HCG's Spend Margin Loss report, each part a section of this page with its own tabs. HCG's
// Attis line is a slice of the scheme section (and an option of its Brands tab); any one brand,
// Attis or not, is the page's Brand filter.
export const SECTIONS: { key: Section; label: string; title: string }[] = [
  { key: "scheme", label: "Scheme", title: "Scheme (govt) patients: margin missed when a costlier brand was used than the one HCG suggests" },
  { key: "cash", label: "Cash & TPA", title: "Cash and insurance (TPA) patients: margin missed when a lower-margin brand was used" },
  { key: "oof", label: "Out of formulary", title: "Cash and insurance (TPA) patients: margin missed on brands outside the formulary" },
];
export const VIEWS: Record<Section, { key: View; label: string }[]> = {
  scheme: [
    { key: "overview", label: "Overview" },
    { key: "items", label: "Brands" },
    { key: "doctors", label: "Doctors" },
  ],
  cash: [
    { key: "overview", label: "Overview" },
    { key: "items", label: "Brands" },
    { key: "doctors", label: "Doctors" },
  ],
  oof: [
    { key: "overview", label: "Overview" },
    { key: "items", label: "Brands" },
    { key: "doctors", label: "Doctors" },
  ],
};

/** The sections whose figures are margins (cash and TPA patients pay MRP): Cash & TPA and
 *  out of formulary share their shapes, payer filter and tables. */
export const isMargin = (s: Section) => s === "cash" || s === "oof";

/** What the page's section tabs offer: the Summary first (HCG's KR spend mail on one screen of
 *  charts, read from the four sections' overviews), then the four sections. `Section` stays the
 *  four with endpoints of their own, so the tables keyed on it need no Summary entry. */
export type PageSection = "summary" | Section;
export const PAGE_SECTIONS: { key: PageSection; label: string; title: string }[] = [
  { key: "summary", label: "Summary", title: "Every part of HCG's spend margin missed report, on one screen" },
  ...SECTIONS,
];
const SUMMARY_VIEWS: { key: View; label: string }[] = [{ key: "overview", label: "Summary" }];
export const pageViews = (s: PageSection) => (s === "summary" ? SUMMARY_VIEWS : VIEWS[s]);

/** `?section=&view=` as the page's state. No section is the Summary. A link written while the
 *  page had an Attis section ('?section=attis', or '?view=consumption' from when it was the
 *  default) opens Scheme, which carries HCG's Attis slice. Anything unknown falls back to the
 *  section's first tab. */
export function readLocation(search: string): { section: PageSection; view: View } {
  const q = new URLSearchParams(search);
  const s = q.get("section");
  const v = q.get("view");
  const section: PageSection = PAGE_SECTIONS.some((x) => x.key === s) ? (s as PageSection)
    : s === "attis" || v === "consumption" ? "scheme" : "summary";
  const view: View = pageViews(section).some((x) => x.key === v) ? (v as View) : "overview";
  return { section, view };
}

/** The page state written back as `?section=&view=`: the Summary and each section's first
 *  tab are the defaults and leave their parameter out. */
export function writeLocation(url: URL, loc: { section: PageSection; view: View }): void {
  if (loc.section === "summary") url.searchParams.delete("section"); else url.searchParams.set("section", loc.section);
  if (loc.view === "overview") url.searchParams.delete("view"); else url.searchParams.set("view", loc.view);
}

/** One brand used, as the Brand filter holds it: the code the API filters on and its name. */
export type BrandPick = { material: string; name: string };

/** Page-level filters. `month` is a period ('2026-08') or 'ALL'. Payer applies to the Cash &
 *  TPA and out-of-formulary sections (CASH / CASH(TPA)); the scheme views are GOV patients by
 *  definition. `brand` narrows every view to one brand used (null: every brand). */
export type Filters = { month: string; type: PatientType; segment: Segment; payer: Payer; brand: BrandPick | null };
export const DEFAULT_FILTERS: Filters = { month: "", type: "ALL", segment: "ALL", payer: "ALL", brand: null };

export type SchemeList = { file?: string | null; financial_year?: string | null; switches?: number | null; attis_switches?: number | null; attis_brands?: number | null };

export type Meta = {
  months: string[];
  latest: string | null;
  month_labels?: Record<string, string>;
  hospitals?: { plant: string; name: string; his_code: string; his_name: string }[];
  types?: string[];
  categories?: { key: string; label: string; note?: string | null }[];
  payers?: string[];
  scheme_list?: SchemeList;
  cash_list?: { file?: string | null; financial_year?: string | null; switches?: number | null; bifurcated_brands?: number | null; bifurcation_source?: string | null };
  cash_payers?: string[];
  oof_built?: boolean;
  built_at?: string | null;
  notes?: string[];
};

/** Used brand vs suggested (Attis) brand for one slice, at FY list prices. */
export type Block = {
  used_value: number;
  suggested_value: number;
  saving_missed: number;
  saving_pct: number | null;
  qty: number;
  lines: number;
  bill_cost: number;
};
/** A slice inside HCG's Healthium line (SUTURES or ENDO rows of the scheme list). Its % may
 *  arrive as `pct` (Contract D) or as `saving_pct` like every other block. */
export type SubBlock = { label?: string; used_value: number; suggested_value: number; saving_missed: number; pct?: number | null; saving_pct?: number | null };

export type Overview = {
  scope: { plant: string | null; plant_name: string | null; his_name: string | null; months: string[]; type: string; category: string };
  headline: Block & { brands: number; doctors: number; hospitals: number; scheme_saving_missed: number; share_of_scheme_pct: number | null };
  trend: (Block & { period: string; label: string; pct?: number | null })[];
  by_hospital: (Block & { plant: string; name: string; his_code: string | null; his_name: string | null; rank: number; selected: boolean })[];
  by_category: (Block & { key: string; label: string })[];
  by_type: (Block & { type: string })[];
  // Top 10 (was 5); used_value / suggested_value / share_of_total_pct are optional (newer API).
  top_items: { material: string; material_desc: string | null; suggested_material: string; suggested_desc: string | null; saving_missed: number; saving_pct: number | null; qty: number; used_value?: number | null; suggested_value?: number | null; share_of_total_pct?: number | null }[];
  groups?: {
    attis: Block & { label: string; share_pct: number | null };
    healthium: Block & { label: string; share_pct: number | null; sutures?: SubBlock | null; endo?: SubBlock | null };
  };
  scheme_list?: SchemeList;
  /** The same measure over every hospital for the same filters (ratio of sums), for the line a
   *  one-hospital position chart draws. Optional (newer API): without it there is no line. */
  network?: { saving_pct: number | null } | null;
  notes?: string[];
  data_as_of?: string | null;
};

/** Cash & TPA, at FY list prices: margin = MRP excl GST − HCG Pharma price. */
export type CashBlock = {
  actual_margin: number;
  potential_margin: number;
  margin_loss: number;
  loss_pct: number | null;
  used_mrp_value: number;
  suggested_mrp_value: number;
  topline_increase: number;
  qty: number;
  cash_qty: number;
  allowance_qty: number;
  lines: number;
  bill_cost: number;
};
/** How much of the out-of-formulary use found a formulary brand to compare with. */
export type OofCoverage = {
  brands: number; matched_brands: number; unmatched_brands: number;
  bill_cost: number; matched_cost: number; unmatched_cost: number; matched_cost_pct: number | null;
};
/** HCG's 'CASH(TPA) & OUT OF FORMULARY' table: the two rows and their total, and the total
 *  for every month (with each part's loss). Null until the out-of-formulary table is built. */
export type WithOof = {
  cash: CashBlock; oof: CashBlock; total: CashBlock;
  trend: (CashBlock & { period: string; label: string; pct?: number | null; cash_loss: number; oof_loss: number })[];
  coverage: OofCoverage;
  note?: string;
};
export type CashOverview = {
  scope: Overview["scope"] & { payer?: string };
  // used_margin_pct = used brand margin ÷ used brand MRP value (HCG's S6 definition);
  // suggested_margin_pct = potential margin ÷ suggested MRP value. Optional (newer API).
  headline: CashBlock & { brands: number; doctors: number; hospitals: number; used_margin_pct?: number | null; suggested_margin_pct?: number | null };
  trend: (CashBlock & { period: string; label: string; pct?: number | null })[];
  by_hospital: (CashBlock & { plant: string; name: string; his_code: string | null; his_name: string | null; rank: number; selected: boolean })[];
  by_category: (CashBlock & { key: string; label: string })[];
  by_type: (CashBlock & { type: string })[];
  by_payer: (CashBlock & { payer: string })[];
  top_items: { material: string; material_desc: string | null; suggested_material: string; suggested_desc: string | null; margin_loss: number; loss_pct: number | null; qty: number; bifurcated?: boolean; molecule?: string | null; suggested_category?: string | null; actual_margin?: number | null; potential_margin?: number | null; share_of_total_pct?: number | null }[];
  allowance?: { brands: number; cash_qty: number; allowed_qty: number; counted_qty: number };
  with_oof?: WithOof | null;
  cash_list?: Meta["cash_list"];
  /** As Overview.network: the % missed over every hospital for the same filters. */
  network?: { loss_pct: number | null } | null;
  notes?: string[];
  data_as_of?: string | null;
};
/** The out-of-formulary overview: the cash shapes, without the bifurcation allowance, with
 *  the match coverage and the biggest brands that found no formulary brand. */
export type OofOverview = Omit<CashOverview, "headline" | "allowance" | "with_oof"> & {
  headline: CashOverview["headline"] & { coverage: OofCoverage };
  unmatched: { material: string; material_desc: string | null; molecule: string | null; qty: number; actual_cost: number }[];
};

/** Query params for the current filters. Plant travels separately (KpiTable's `plant`).
 *  `cash` passes the payer (CASH / CASH(TPA)), which only the margin sections take. */
export function filterParams(f: Filters, { cash = false }: { cash?: boolean } = {}): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.month) p.Month = f.month;
  if (f.type !== "ALL") p.Type = f.type;
  if (f.segment !== "ALL") p.Segment = f.segment;
  if (f.brand) p.Material = f.brand.material;
  if (cash && (f.payer === "CASH" || f.payer === "CASH(TPA)")) p.Payer = f.payer;
  return p;
}

/** The query params a section's endpoints take. */
export const sectionParams = (section: Section, f: Filters) => filterParams(f, { cash: isMargin(section) });

export const getMeta = () => apiFetch<Meta>("/spend/meta");

/** The column totals a list endpoint returns (Contract A `sums`), for a header that states the
 *  total. Asks for one row only; null until it arrives, or when the API sends no sums. */
export function useTableSums(endpoint: string, params: Record<string, string>) {
  const url = `${endpoint}?${toQuery({ ...params, page: "0", page_size: "1" })}`;
  const [sums, setSums] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let dead = false;
    setSums(null);
    apiFetch<{ sums?: Record<string, number> | null }>(url)
      .then((d) => { if (!dead) setSums(d?.sums ?? null); })
      .catch(() => { if (!dead) setSums(null); });
    return () => { dead = true; };
  }, [url]);
  return sums;
}

// Overview answers are cached per URL for the life of the page (tab switches don't refetch);
// a failure is dropped from the cache so the next visit retries.
const overviewCache = new Map<string, Promise<unknown>>();
function getOverview<T>(url: string): Promise<T> {
  let p = overviewCache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = apiFetch<T>(url);
    overviewCache.set(url, p);
    p.catch(() => overviewCache.delete(url));
    if (overviewCache.size > 40) overviewCache.delete(overviewCache.keys().next().value as string);
  }
  return p;
}

/** A section's overview for `params` (Scheme -> Overview, Cash -> CashOverview); keeps
 *  the previous answer on screen while a new one loads. `enabled: false` holds the request
 *  back (the out-of-formulary overview before its table has been built). */
export function useOverview<T = Overview>(params: Record<string, string>, section: Section = "scheme", enabled = true) {
  const url = `/spend/${section}/overview?${toQuery(params)}`;
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: enabled });
  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    getOverview<T>(url)
      .then((d) => { if (!dead) setState({ data: d, error: null, loading: false }); })
      .catch((e) => { if (!dead) setState({ data: null, error: errText(e), loading: false }); });
    return () => { dead = true; };
  }, [url, enabled]);
  return state;
}

/** What switching one brand used to the brand HCG's list names would have added, in one
 *  section: the margin (cash & TPA, out of formulary) or the spend saved (scheme). */
export type BrandSide = { suggested_material: string | null; suggested_desc: string | null; missed: number; pct: number | null; qty: number };
/** A brand the Brand filter offers, with each section it was used in (null where it was not). */
export type BrandOption = { material: string; material_desc: string | null } & Record<Section, BrandSide | null>;
export type BrandList = { brands: BrandOption[]; total: number };

/** The brands the Brand filter offers under the page's other filters (biggest switch first);
 *  `q` searches names and codes, `material` asks for that one brand, `section` keeps the brands
 *  used in that section, ranked by its own gain (what that section's tab can show). */
export function getBrands(params: Record<string, string>, opts: { q?: string; material?: string; limit?: number; section?: Section | null } = {}) {
  const p: Record<string, string> = { ...params };
  if (opts.q) p.q = opts.q;
  if (opts.material) p.Material = opts.material;
  if (opts.limit) p.limit = String(opts.limit);
  if (opts.section) p.Section = opts.section;
  return apiFetch<BrandList>(`/spend/brands?${toQuery(p)}`);
}

// One brand's row, cached per query for the life of the page like the overviews: the filter
// strip's "If switched" line and the page's "not used here" check ask for the same row.
const brandCache = new Map<string, Promise<BrandOption | null>>();

/** One brand's row under the page's other filters; null when it has no use in them. */
export function getBrand(params: Record<string, string>, material: string): Promise<BrandOption | null> {
  const key = `${toQuery(params)}|${material}`;
  let p = brandCache.get(key);
  if (!p) {
    p = getBrands(params, { material, limit: 1 }).then((d) => d.brands[0] ?? null);
    brandCache.set(key, p);
    p.catch(() => brandCache.delete(key));
    if (brandCache.size > 40) brandCache.delete(brandCache.keys().next().value as string);
  }
  return p;
}
