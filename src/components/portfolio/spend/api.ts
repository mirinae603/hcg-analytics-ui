// Typed access to the /spend/* endpoints (backend app/api/spend.py, and app/api/purchase_insights.py
// for /spend/prices/* and /spend/generic/*).
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

/** The sections read from patients' bills (HIS sales lines): they have doctors, payers and
 *  patient types. Out of formulary is read from purchases (GRN) and has vendors instead. */
export type PatientSection = "scheme" | "cash";
export type Section = PatientSection | "oof";
/** The purchase analyses beside the margin sections (backend app/api/purchase_insights.py):
 *  what the same product cost from different suppliers and hospitals, and what branded
 *  (originator) purchases cost against generics. Read from purchases too, with months of their
 *  own (every GRN month), and no margin to switch: the Brand filter does not apply. */
export type InsightSection = "prices" | "generic";
export type View = "overview" | "items" | "doctors" | "vendors" | "products";
export type PatientType = "ALL" | "IP" | "OP";
export type Segment = "ALL" | "onco" | "non-onco" | "consumables";
export type Payer = "ALL" | "CASH" | "CASH(TPA)" | "GOV";

// HCG's Spend Margin Loss report, each part a section of this page with its own tabs. HCG's
// Attis line is a slice of the scheme section (and an option of its Brands tab); any one brand,
// Attis or not, is the page's Brand filter.
export const SECTIONS: { key: Section; label: string; title: string }[] = [
  { key: "scheme", label: "Scheme", title: "Scheme (govt) patients: margin missed when a costlier brand was used than the one HCG suggests" },
  { key: "cash", label: "Cash & TPA", title: "Cash and insurance (TPA) patients: margin missed when a lower-margin brand was used" },
  { key: "oof", label: "Out of formulary", title: "Out of formulary purchases: margin missed by buying brands outside the formulary" },
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
  // Purchases have no doctor: the vendor (the GRN's goods supplier) is who the brand came from.
  oof: [
    { key: "overview", label: "Overview" },
    { key: "items", label: "Brands" },
    { key: "vendors", label: "Vendors" },
  ],
};

/** Out of formulary is read from purchases: no payer, no patient type, months of its own. */
export const isPurchases = (s: Section | null) => s === "oof";

export const INSIGHT_SECTIONS: { key: InsightSection; label: string; title: string }[] = [
  { key: "prices", label: "Prices", title: "Price variation: the same product bought at different prices, by supplier and hospital" },
  { key: "generic", label: "Generic vs branded", title: "Generic vs branded purchases: what originator brands cost, and where they sit in the formulary" },
];
export const INSIGHT_VIEWS: Record<InsightSection, { key: View; label: string }[]> = {
  prices: [
    { key: "overview", label: "Overview" },
    { key: "products", label: "Products" },
  ],
  generic: [{ key: "overview", label: "Overview" }],
};
export const isInsight = (s: string | null): s is InsightSection => s === "prices" || s === "generic";

/** What the page's section tabs offer: the Summary first (HCG's KR spend mail on one screen of
 *  charts, read from the margin sections' overviews), the three margin sections, then the two
 *  purchase analyses. `Section` stays the three with a margin of their own, so the tables keyed
 *  on it need no Summary or purchase-analysis entry. */
export type PageSection = "summary" | Section | InsightSection;
export const PAGE_SECTIONS: { key: PageSection; label: string; title: string }[] = [
  { key: "summary", label: "Summary", title: "Every part of HCG's spend margin missed report, on one screen" },
  ...SECTIONS,
  ...INSIGHT_SECTIONS,
];
const SUMMARY_VIEWS: { key: View; label: string }[] = [{ key: "overview", label: "Summary" }];
export const pageViews = (s: PageSection) => (s === "summary" ? SUMMARY_VIEWS : isInsight(s) ? INSIGHT_VIEWS[s] : VIEWS[s]);

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
 *  TPA section (CASH / CASH(TPA)); the scheme views are GOV patients by definition, and out of
 *  formulary is purchases, which have neither a payer nor a patient type. `brand` narrows every
 *  view to one brand used or bought (null: every brand). */
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
  /** The out-of-formulary purchase build (python -m app.etl.purchase): whether it has run, its
   *  own months (GRN months with that month's Item Master; they need not be the sales months),
   *  when it ran, and where a suggested brand can come from, in order. */
  oof_built?: boolean;
  oof_months?: string[];
  oof_latest?: string | null;
  oof_built_at?: string | null;
  oof_suggested_by?: { key: SuggestedBy; label: string; counted: boolean; estimated: boolean }[];
  /** Price variation and generic vs branded, from the same purchase build: each section's months
   *  (every GRN month; `item_master` where the month has its own) and when the build ran. Empty
   *  until the build has run; absent from an API older than these sections. */
  prices_months?: PurchaseMonth[];
  generic_months?: PurchaseMonth[];
  purchase_built_at?: string | null;
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

/** The selection an overview was computed for, as the API echoes it. */
export type ScopeEcho = { plant: string | null; plant_name: string | null; his_name: string | null; months: string[] };

export type Overview = {
  scope: ScopeEcho & { type: string; category: string };
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

/** The four figures every margin row carries (HCG's actual, proposed, loss and loss %). */
export type Margins = {
  actual_margin: number;
  potential_margin: number;
  margin_loss: number;
  loss_pct: number | null;
};

/** Cash & TPA, at FY list prices: margin = MRP excl GST − HCG Pharma price. */
export type CashBlock = Margins & {
  used_mrp_value: number;
  suggested_mrp_value: number;
  topline_increase: number;
  qty: number;
  cash_qty: number;
  allowance_qty: number;
  lines: number;
  bill_cost: number;
};
/** HCG's 'CASH(TPA) & OUT OF FORMULARY' table: the cash & TPA row, the out-of-formulary
 *  purchase row for the same hospitals and months, their total (the % taken once), and the
 *  total for every sales month with each part's loss. Null until the purchase build has run. */
export type WithOof = {
  cash: CashBlock; oof: OofBlock; total: Margins;
  trend: (Margins & { period: string; label: string; pct?: number | null; cash_loss: number; oof_loss: number; has_oof: boolean })[];
  coverage: OofCoverage;
  /** The selected months that have out-of-formulary purchase data. */
  oof_months?: string[];
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
// ─────────────────────────────────────────────────────────────────────────────
// Out of formulary: HCG's purchase (GRN) method
// ─────────────────────────────────────────────────────────────────────────────
/** Where a purchase line's suggested brand came from, or why it has none: HCG's worksheet of
 *  the month, HCG's pair from another month, HCG's out-of-formulary list, the app's own match
 *  (Estimated); then the lines HCG parked and those with no alternative, shown but not counted. */
export type SuggestedBy = "hcg_sheet" | "hcg_sheet_pair" | "hcg_list" | "formulary_rule" | "parked" | "none";

/** One cut of the out-of-formulary purchases (HCG's method, per GRN line, then summed).
 *  `purchase_value` is every line's Base Price × qty; the margins count only the lines with a
 *  suggested brand. `margin_loss` is HCG's NET figure (it can be negative): `gain_loss` (the
 *  lines where the suggestion earns more, ≥ 0) + `better_loss` (where the brand bought earns
 *  more, ≤ 0). */
export type OofBlock = Margins & {
  purchase_value: number;
  value_after_discount: number;
  counted_value: number;
  used_mrp_value: number;
  suggested_value: number;
  suggested_mrp_value: number;
  gain_loss: number;
  better_loss: number;
  used_margin_pct: number | null;
  suggested_margin_pct: number | null;
  qty: number;
  lines: number;
};

/** One "suggested by" bucket of the purchase value. */
export type OofBucket = { label: string; value: number; lines: number; brands: number; share_pct: number | null; counted: boolean; estimated: boolean };
/** The purchase value by where its suggested brand came from, in the API's order. */
export type OofCoverage = Partial<Record<SuggestedBy, OofBucket>>;

/** HCG's own Summary sheet for the same hospitals and months, beside ours. */
export type HcgCheck = Margins & { months: string[]; centres: number; diff: number; matches: boolean };

/** One brand bought out of formulary and the brand suggested for it. `rule` says, in words, how
 *  the app matched an Estimated suggestion (null for HCG's own). */
export type OofSwitch = {
  material: string; material_desc: string | null; minor_group: string | null;
  suggested_material: string | null; suggested_desc: string | null;
  suggested_by: SuggestedBy; suggested_by_label: string; estimated: boolean; rule: string | null;
  purchase_value: number; actual_margin: number; potential_margin: number; margin_loss: number;
  loss_pct: number | null; share_of_total_pct: number | null; qty: number;
};
/** A vendor is the GRN's goods supplier by name (`vendor`, spacing and case aside): one supplier
 *  can hold several SAP supplier codes (`vendor_codes`), e.g. one per region. */
export type OofVendor = {
  vendor: string; vendor_codes: string[]; vendor_name: string | null; brands: number; hospitals: number;
  purchase_value: number; actual_margin: number; potential_margin: number; margin_loss: number;
  loss_pct: number | null; share_of_total_pct: number | null; no_alternative_value: number;
};
export type OofNoAlternative = {
  material: string; material_desc: string | null; minor_group: string | null; manufacturer: string | null;
  status: "no_alternative" | "unpriced"; suggested_material: string | null; suggested_desc: string | null;
  qty: number; purchase_value: number; hospitals: number; vendors: number; lines: number;
};

export type OofOverview = {
  /** No patient type: purchases have none. `not_applied` names the filters sent but not used. */
  scope: ScopeEcho & { category: string; material?: string | null; not_applied?: string[] };
  headline: OofBlock & { brands: number; vendors: number; hospitals: number; coverage: OofCoverage; hcg_figure: number | null };
  /** Null under a material type or brand filter, or for a month HCG has no Summary for. */
  hcg: HcgCheck | null;
  /** Every out-of-formulary month (the Month filter only shades); `hcg_loss` is HCG's figure. */
  trend: (OofBlock & { period: string; label: string; pct?: number | null; hcg_loss: number | null })[];
  /** Every hospital, most missed first, negative losses last. */
  by_hospital: (OofBlock & { plant: string; name: string; his_code: string | null; his_name: string | null; hcg_loss: number | null; rank: number; selected: boolean })[];
  network?: { loss_pct: number | null } | null;
  by_category: (OofBlock & { key: string; label: string })[];
  top_items: OofSwitch[];
  better_items: OofSwitch[];
  top_vendors: OofVendor[];
  no_alternative: OofNoAlternative[];
  notes?: string[];
  data_as_of?: string | null;
};

/** The months the out-of-formulary section shows: the purchase build's own. */
export const oofMonths = (meta: Meta): string[] => meta.oof_months ?? [];

/** The Month param of the out-of-formulary endpoints for the page's month: the month itself when
 *  the purchase build has it, ALL for every month, else null (no purchases for that month). */
export function oofMonthOf(meta: Meta, month: string): string | null {
  if (!meta.oof_built) return null;
  return month === "ALL" || oofMonths(meta).includes(month) ? month : null;
}

/** The page's filters as the out-of-formulary section applies them: a month the purchase build
 *  does not have becomes its latest (the section's own Month picker offers its months only), and
 *  consumables, which purchases do not hold (the purchase scope is drugs), every material type. */
export function oofFilters(meta: Meta, f: Filters): Filters {
  return { ...f, month: oofMonthOf(meta, f.month) ?? meta.oof_latest ?? f.month, segment: f.segment === "consumables" ? "ALL" : f.segment };
}

/** The page's filters as the sections read from bills apply them (the Summary, Scheme, Cash &
 *  TPA): a month picked on a purchase tab that the sales do not have (purchases run on past and
 *  before the sales months) becomes the latest sales month. */
export function salesFilters(meta: Meta, f: Filters): Filters {
  if (f.month === "ALL" || meta.months.includes(f.month)) return f;
  return { ...f, month: meta.latest ?? meta.months[meta.months.length - 1] ?? "ALL" };
}

/** Query params for the current filters. Plant travels separately (KpiTable's `plant`).
 *  `cash` passes the payer (CASH / CASH(TPA)), which only the Cash & TPA section takes;
 *  `patients: false` leaves out the patient type, which purchases do not have. */
export function filterParams(f: Filters, { cash = false, patients = true }: { cash?: boolean; patients?: boolean } = {}): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.month) p.Month = f.month;
  if (patients && f.type !== "ALL") p.Type = f.type;
  if (f.segment !== "ALL") p.Segment = f.segment;
  if (f.brand) p.Material = f.brand.material;
  if (cash && (f.payer === "CASH" || f.payer === "CASH(TPA)")) p.Payer = f.payer;
  return p;
}

/** The query params a section's endpoints take (out of formulary: give it oofFilters). */
export const sectionParams = (section: Section, f: Filters) =>
  filterParams(f, { cash: section === "cash", patients: !isPurchases(section) });

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

/** A section's overview for `params` (Scheme -> Overview, Cash -> CashOverview, Out of
 *  formulary -> OofOverview, Prices -> PricesOverview, Generic vs branded -> GenericOverview);
 *  keeps the previous answer on screen while a new one loads. `enabled: false` holds the request
 *  back (out of formulary before its purchase build, or for a month it has no purchases for). */
export function useOverview<T = Overview>(params: Record<string, string>, section: Section | InsightSection = "scheme", enabled = true) {
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

/** What switching one brand used (or bought) to the brand HCG's list names would have added, in
 *  one section: the margin (cash & TPA, out of formulary) or the spend saved (scheme). Out of
 *  formulary offers every brand bought, one with no alternative missing nothing (`missed` 0, no
 *  suggestion); its `missed` is HCG's net figure and can be negative. */
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

// ─────────────────────────────────────────────────────────────────────────────
// Prices and generic vs branded: purchase analyses (backend app/api/purchase_insights.py)
// ─────────────────────────────────────────────────────────────────────────────
/** A month the purchase build holds. `item_master`: the month has its own Item Master, which
 *  the formulary split of generic vs branded needs. */
export type PurchaseMonth = { period: string; label: string; item_master: boolean };

/** The selection a purchase analysis was computed for, as the API echoes it. `ignored` names the
 *  filters sent that a purchase cannot apply; `molecule` is the product shown in detail. */
export type InsightScope = {
  plant: string; plant_name: string; months: string[]; category: string;
  vendor?: string; material?: string; molecule?: string; ignored?: string[];
};

/** One product: a molecule, strength, form and kind (CETUXIMAB 100MG injection), whose brands
 *  are the same medicine. `cheapest_price` is the lowest unit price (after discount) paid in the
 *  selection; `extra_paid` what was paid above the same units at that price; `price_index` paid ÷
 *  the same units at the cheapest (1.00 = always the cheapest); `spread_ratio` dearest ÷ cheapest;
 *  `varies` bought at least 1% apart. `minor_group` is HCG's own name for the molecule: shown. */
export type PriceProduct = {
  molecule_key: string; minor_group: string | null; molecule: string | null; strength: string | null;
  form: string | null; kind: string | null; category?: string | null;
  cheapest_price: number; min_price: number; max_price: number; wavg_price: number;
  spread_ratio: number; price_index: number; varies: boolean;
  qty: number; value: number; extra_paid: number; extra_pct: number | null; share_pct: number | null;
  brands: number; vendors: number; plants: number; lines?: number;
  cheapest_brand?: string | null; cheapest_vendor?: string | null; cheapest_plant?: string | null;
};
/** A supplier, by name (one supplier can hold several SAP codes): what it was paid, the same
 *  units at the cheapest price anyone paid, the extra and the price index. */
export type PriceVendor = {
  vendor_name: string; vendor_codes: string[]; value: number; at_cheapest: number; extra_paid: number;
  price_index: number | null; share_pct: number | null; molecules: number; brands: number; plants: number; lines: number;
  qty?: number; wavg_price?: number;
};
/** The chosen product's purchases at one hospital, of one brand, from one supplier, summed over
 *  the selected months: its unit price (value ÷ units) and the range it was bought at. */
export type PricePoint = {
  plant: string; plant_name: string; material: string; material_desc: string; vendor_name: string;
  unit_price: number; unit_price_min: number; unit_price_max: number; qty: number; value: number; lines: number;
};
export type PriceHospital = {
  plant: string; name: string; value: number; at_cheapest: number; extra_paid: number; extra_pct: number | null;
  price_index: number | null; molecules: number; lines: number; rank: number; selected: boolean;
};
export type PriceMonthRow = {
  period: string; label: string; value: number; compared_value: number; extra_paid: number; extra_pct: number | null;
  molecules: number; molecules_with_spread: number; lines: number;
};
/** Purchases left out of the comparison, by why (counted in the value only). */
export type NotCompared = { reason: "no_product" | "no_price" | "token" | "other_unit"; label: string; lines: number; value: number };

export type PricesOverview = {
  headline: {
    molecules: number; molecules_with_spread: number; extra_paid_vs_cheapest: number; extra_pct: number | null;
    value: number; compared_value: number; compared_pct: number | null; lines: number; brands: number; vendors: number;
    hospitals: number;
    /** With one hospital: what it paid above the cheapest price ANY hospital paid (its row of
     *  `by_hospital`); null for all hospitals. */
    extra_paid_vs_network_cheapest: number | null;
  };
  scope: InsightScope;
  /** The products with the most extra paid (the chart's), of `molecules_total`. */
  molecules: PriceProduct[];
  molecules_total: number;
  /** The chosen product, with its purchases and suppliers; null when it was not bought in the
   *  selection (a note says so). */
  molecule: (PriceProduct & { points: PricePoint[]; by_vendor: PriceVendor[] }) | null;
  /** The ten suppliers with the most value compared, of `vendors_total`. */
  vendors: PriceVendor[];
  vendors_total: number;
  /** Every hospital against the cheapest price any hospital paid (ignores the hospital
   *  selector; `selected` marks it), most extra first. */
  by_hospital: PriceHospital[];
  /** Every month against its own cheapest (ignores the Month filter). */
  by_month: PriceMonthRow[];
  not_compared: NotCompared[];
  months_available: PurchaseMonth[];
  notes: string[];
  data_as_of: string | null;
};

/** One cut of the generic vs branded split. `extra_vs_generic` is what branded purchases cost
 *  above the cheapest generic of the same product that month; `compared_value` the branded value
 *  that had a generic to compare with (`extra_vs_generic_pct` is of it); `branded_not_compared`
 *  the branded value with no generic bought that month. */
export type GenericBlock = {
  value: number; generic_value: number; branded_value: number; generic_pct: number | null; branded_pct: number | null;
  extra_vs_generic: number; compared_value: number; extra_vs_generic_pct: number | null; branded_not_compared: number;
  lines: number; branded_lines: number;
};
export type GenericShare = { key: string; label: string; value: number; share_pct: number | null };
/** One class's value by the Item Master's formulary flag, and its formulary part by tier. */
export type GenericClass = { class: "generic" | "branded"; label: string; value: number; flags: GenericShare[]; tiers: GenericShare[] };
/** A branded product a generic of the same product undercut: the brands and their companies,
 *  the extra over that generic, and the generic itself (its name and price, of `generic_period`). */
export type GenericTop = {
  molecule_key: string; minor_group: string | null; strength: string | null; form: string | null;
  brands: string[]; companies: string[]; branded_value: number; compared_value: number;
  extra_vs_generic: number; extra_vs_generic_pct: number | null; share_pct: number | null;
  generic_material: string | null; generic_desc: string | null; generic_price: number | null; generic_period: string | null;
  plants: number;
};

export type GenericOverview = {
  headline: GenericBlock & { brands: number; generic_brands: number; branded_brands: number; hospitals: number };
  scope: InsightScope;
  /** Every month (ignores the Month filter); `item_master` as in months_available. */
  by_month: (GenericBlock & { period: string; label: string; item_master: boolean })[];
  /** Every hospital (ignores the hospital selector), most extra over generics first. */
  by_hospital: (GenericBlock & { plant: string; name: string; rank: number; selected: boolean })[];
  /** Onco and non-onco (ignores the material-type filter). */
  by_segment: (GenericBlock & { key: "onco" | "non-onco"; label: string })[];
  /** How each purchase got its class: a named override, the originator list, or neither. */
  by_source: { key: "override" | "originator_list" | "default"; label: string; value: number; lines: number }[];
  /** The formulary split, over the selected months that have their own Item Master only. */
  compliance: { months: string[]; months_without_item_master: string[]; available: boolean; by_class: GenericClass[] };
  top_molecules: GenericTop[];
  definition: {
    text: string; estimated: boolean; label: string; originator_companies: number | null; originator_patterns: number | null;
    overrides: { material: string; class: string; reason: string }[]; files: Record<string, string>; class_sources: Record<string, string>;
  };
  estimated: boolean;
  months_available: PurchaseMonth[];
  notes: string[];
  data_as_of: string | null;
};

/** The months a purchase analysis offers (every GRN month of its build), from /spend/meta: []
 *  until the build has run, null from an API older than these sections. */
export const purchaseMonthsOf = (meta: Meta, kind: InsightSection): PurchaseMonth[] | null =>
  (kind === "prices" ? meta.prices_months : meta.generic_months) ?? null;

/** The page's filters as a purchase analysis applies them: a month its build does not have
 *  becomes its latest (its Month chip offers its own months), and consumables, which purchases
 *  do not hold (the purchase scope is drugs), every material type. */
export function insightFilters(months: PurchaseMonth[], f: Filters): Filters {
  const periods = months.map((m) => m.period);
  const month = f.month === "ALL" || periods.includes(f.month) ? f.month : periods[periods.length - 1] ?? "ALL";
  return { ...f, month, segment: f.segment === "consumables" ? "ALL" : f.segment };
}

/** A purchase analysis's query params: month and material type only. A purchase has no patient
 *  type or payer, and these views compare products, not one brand's switch. */
export const insightParams = (f: Filters): Record<string, string> => filterParams({ ...f, brand: null }, { patients: false });

/** A purchase month's label ("Aug-26"), from the build's own list. */
export const purchaseMonthLabel = (months: PurchaseMonth[], period: string) => months.find((m) => m.period === period)?.label ?? period;

/** "Aug-26", or "Dec-25 – Aug-26" for a run of months. */
export function purchaseMonthsLabel(months: PurchaseMonth[], periods: string[]): string {
  if (!periods.length) return "—";
  const s = [...periods].sort();
  return s.length === 1 ? purchaseMonthLabel(months, s[0]) : `${purchaseMonthLabel(months, s[0])} – ${purchaseMonthLabel(months, s[s.length - 1])}`;
}
