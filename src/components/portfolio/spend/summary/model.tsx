// Spend Summary — every section's overview in one shape, so the Summary's panels and drawers
// read cash & TPA, out of formulary and scheme alike. The server sends every amount and every
// %; these adapters only rename fields (nothing is recomputed), and they never add a loss of
// one section to another's: a margin lost on a cash patient and a spend above the suggested
// brand on a scheme patient are different measures. Each section carries its topic colour
// (../shared): CASH_COL, OOF_COL, SCHEME_COL. Out of formulary is purchases (HCG's GRN method):
// it has vendors instead of doctors and no payer or patient type.
import { dayLabel, rupeesExact, pct } from "@/components/portfolio/ledger/format";
import type { SourceOf } from "@/components/portfolio/ledger/status";
import type { KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { num } from "@/lib/kpiFormat";
import { monthLabel, monthsLabel } from "../../formulary/api";
import {
  type Block, type CashOverview, type Filters, type Margins, type Meta, type OofOverview, type Overview,
  type ScopeEcho, type Section, type SubBlock,
} from "../api";
import { CASH_COL, OOF_COL, SCHEME_COL, coverageWords, oofSourceOf, payerLabel, typeLabel, type LossKind } from "../shared";

export type { LossKind };

/** What was earned or spent, what HCG's list proposes, the loss between them and its %. */
export type Loss = { actual: number; proposed: number; loss: number; pct: number | null };
export type LossRow = Loss & { key: string; label: string };
export type MonthLoss = Loss & { period: string; label: string };
/** `rank` is the API's: most rupees lost first. */
export type HospitalLoss = Loss & { plant: string; name: string; label: string; selected: boolean; rank: number };
export type Split = { key: string; title: string; note: string; rows: LossRow[] };

export type KindWords = {
  section: Section;
  /** The section's figure, in HCG's words. */
  title: string;
  /** The section's name on a tag or a link. */
  short: string;
  accent: string;
  actual: string;
  proposed: string;
  loss: string;
  /** The amount the % missed is a share of: the margin possible (cash) or the spend (scheme). */
  whole: "proposed" | "actual";
  pctOf: string;
  /** The payer and patients the section counts, for a drawer's filter chips (null: the
   *  Patient type filter's own value). */
  payer: string;
  patients: string | null;
};

export const KIND: Record<LossKind, KindWords> = {
  cash: {
    section: "cash", title: "Cash & TPA: margin missed", short: "Cash & TPA", accent: CASH_COL,
    actual: "Margin earned", proposed: "Margin possible", loss: "Margin missed", whole: "proposed", pctOf: "of the margin possible",
    payer: "Cash + TPA", patients: null,
  },
  oof: {
    section: "oof", title: "Out of formulary: margin missed", short: "Out of formulary", accent: OOF_COL,
    actual: "Margin earned", proposed: "Margin possible", loss: "Margin missed", whole: "proposed", pctOf: "of the margin possible",
    payer: "Not applied (purchases)", patients: "Not applied (purchases)",
  },
  scheme: {
    section: "scheme", title: "Scheme: margin missed", short: "Scheme", accent: SCHEME_COL,
    actual: "Spent", proposed: "With suggested brands", loss: "Margin missed", whole: "actual", pctOf: "of the spend",
    payer: "Scheme (GOV)", patients: null,
  },
};

/** One section's overview in the shape the Summary's panels and drawers read. Bills have
 *  doctors, purchases vendors: each head counts the one its section has. */
export type SectionLoss = {
  kind: LossKind;
  scope: ScopeEcho;
  head: Loss & { brands: number; hospitals: number; doctors: number | null; vendors: number | null };
  trend: MonthLoss[];
  hospitals: HospitalLoss[];
  splits: Split[];
  facts: KeyFigure[];
  /** Sentences the section adds to its drawer's "In brief" (out of formulary: HCG's own sheet
   *  beside ours, and the two parts of its net figure). */
  remarks: string[];
  notes: string[];
  /** HCG's or the app's own figures, or partly the app's estimate (out of formulary's own match);
   *  out of formulary's in its own words (purchases, not sales lines). */
  source: SourceOf;
  asOf: string | null;
};

export const marginLoss = (b: Margins): Loss =>
  ({ actual: b.actual_margin, proposed: b.potential_margin, loss: b.margin_loss, pct: b.loss_pct });
export const spendLoss = (b: Block): Loss =>
  ({ actual: b.used_value, proposed: b.suggested_value, loss: b.saving_missed, pct: b.saving_pct });
/** A Healthium part: its % arrives as `pct` (Contract D) or as `saving_pct`. */
export const subLoss = (b: SubBlock): Loss =>
  ({ actual: b.used_value, proposed: b.suggested_value, loss: b.saving_missed, pct: b.pct ?? b.saving_pct ?? null });

const SPLIT_NOTES = {
  category: "Each material type's own figures (first digit of the material code). Ignores the Material type filter, so the three can be compared.",
  type: "The same figures per patient type.",
  payer: "Cash patients and insurance (TPA) patients.",
};

export function cashSection(d: CashOverview, meta: Meta): SectionLoss {
  const h = d.headline;
  return {
    kind: "cash",
    scope: d.scope,
    head: { ...marginLoss(h), brands: h.brands, doctors: h.doctors, hospitals: h.hospitals, vendors: null },
    trend: (d.trend || []).map((r) => ({ period: r.period, label: r.label || monthLabel(meta, r.period), ...marginLoss(r) })),
    hospitals: (d.by_hospital || []).map((r) => ({ plant: r.plant, name: r.name, label: r.his_name || r.name, selected: r.selected, rank: r.rank, ...marginLoss(r) })),
    splits: [
      { key: "category", title: "Onco, non-onco and consumables", note: SPLIT_NOTES.category, rows: (d.by_category || []).map((c) => ({ key: c.key, label: c.label, ...marginLoss(c) })) },
      { key: "type", title: "Inpatient vs outpatient", note: SPLIT_NOTES.type, rows: (d.by_type || []).map((t) => ({ key: t.type, label: typeLabel(t.type), ...marginLoss(t) })) },
      { key: "payer", title: "Cash vs TPA", note: SPLIT_NOTES.payer, rows: (d.by_payer || []).map((p) => ({ key: p.payer, label: payerLabel(p.payer), ...marginLoss(p) })) },
    ],
    facts: [
      { label: "MRP value, brands used", value: rupeesExact(h.used_mrp_value), note: h.used_margin_pct == null ? "MRP excl GST × qty" : `margin ${pct(h.used_margin_pct, 2)} of it` },
      { label: "MRP value, suggested brands", value: rupeesExact(h.suggested_mrp_value),
        note: h.suggested_margin_pct == null ? "MRP excl GST × qty" : `margin ${pct(h.suggested_margin_pct, 2)} of it` },
      { label: "MRP increase", value: rupeesExact(h.topline_increase), note: "revenue at MRP (excl GST) the switch would add" },
      { label: "Bill cost", value: rupeesExact(h.bill_cost), note: "what these lines cost HCG" },
      { label: "Units counted", value: num(h.qty, 3), note: `of ${num(h.cash_qty, 3)} used; the rest is HCG's allowance for bifurcated brands` },
      { label: "Brands · doctors · hospitals", value: `${num(h.brands)} · ${num(h.doctors)} · ${num(h.hospitals)}` },
    ],
    remarks: [],
    notes: d.notes || [],
    source: "computed",
    asOf: dayLabel(d.data_as_of ?? meta.built_at),
  };
}

/** Out of formulary, on purchases: one split (onco / non-onco: purchases have no payer or
 *  patient type), what was spent, the two parts of HCG's net figure, where the suggested brands
 *  came from, and HCG's own sheet beside ours. */
export function oofSection(d: OofOverview, meta: Meta): SectionLoss {
  const h = d.headline;
  const sources = coverageWords(h.coverage);
  return {
    kind: "oof",
    scope: d.scope,
    head: { ...marginLoss(h), brands: h.brands, hospitals: h.hospitals, doctors: null, vendors: h.vendors },
    trend: (d.trend || []).map((r) => ({ period: r.period, label: r.label || monthLabel(meta, r.period), ...marginLoss(r) })),
    hospitals: (d.by_hospital || []).map((r) => ({ plant: r.plant, name: r.name, label: r.his_name || r.name, selected: r.selected, rank: r.rank, ...marginLoss(r) })),
    splits: [
      { key: "category", title: "Onco and non-onco", note: SPLIT_NOTES.category, rows: (d.by_category || []).map((c) => ({ key: c.key, label: c.label, ...marginLoss(c) })) },
    ],
    facts: [
      { label: "Spent on out-of-formulary brands", value: rupeesExact(h.purchase_value), note: `Base Price × units; ${rupeesExact(h.value_after_discount)} after discount` },
      { label: "MRP value, brands bought", value: rupeesExact(h.used_mrp_value), note: h.used_margin_pct == null ? "MRP excl GST × qty" : `margin ${pct(h.used_margin_pct, 2)} of it` },
      { label: "MRP value, suggested brands", value: rupeesExact(h.suggested_mrp_value),
        note: h.suggested_margin_pct == null ? "MRP excl GST × qty" : `margin ${pct(h.suggested_margin_pct, 2)} of it` },
      { label: "Missed where the suggestion earns more", value: rupeesExact(h.gain_loss) },
      { label: "Where the brand bought earns more", value: rupeesExact(h.better_loss), note: "lowers the margin missed, as HCG counts it" },
      { label: "Units", value: num(h.qty, 3), note: `${num(h.lines)} receipts` },
      { label: "Brands · vendors · hospitals", value: `${num(h.brands)} · ${num(h.vendors)} · ${num(h.hospitals)}` },
    ],
    remarks: [
      ...(d.hcg ? [`HCG's own out-of-formulary sheet has ${rupeesExact(d.hcg.margin_loss)} for the same hospitals and months${d.hcg.matches ? ": the same figure." : `; ours differs by ${rupeesExact(d.hcg.diff)}.`}`] : []),
      ...(sources ? [`Where the suggested brands came from, by money spent: ${sources}.`] : []),
    ],
    notes: d.notes || [],
    source: oofSourceOf(h.coverage),
    asOf: dayLabel(d.data_as_of ?? meta.oof_built_at),
  };
}

export function schemeSection(d: Overview, meta: Meta): SectionLoss {
  const h = d.headline;
  return {
    kind: "scheme",
    scope: d.scope,
    head: { ...spendLoss(h), brands: h.brands, doctors: h.doctors, hospitals: h.hospitals, vendors: null },
    trend: (d.trend || []).map((r) => ({ period: r.period, label: r.label || monthLabel(meta, r.period), ...spendLoss(r) })),
    hospitals: (d.by_hospital || []).map((r) => ({ plant: r.plant, name: r.name, label: r.his_name || r.name, selected: r.selected, rank: r.rank, ...spendLoss(r) })),
    splits: [
      { key: "category", title: "Onco, non-onco and consumables", note: SPLIT_NOTES.category, rows: (d.by_category || []).map((c) => ({ key: c.key, label: c.label, ...spendLoss(c) })) },
      { key: "type", title: "Inpatient vs outpatient", note: SPLIT_NOTES.type, rows: (d.by_type || []).map((t) => ({ key: t.type, label: typeLabel(t.type), ...spendLoss(t) })) },
    ],
    facts: [
      { label: "Bill cost", value: rupeesExact(h.bill_cost), note: "what the bills for these lines came to" },
      { label: "Units", value: num(h.qty, 3) },
      { label: "Brands · doctors · hospitals", value: `${num(h.brands)} · ${num(h.doctors)} · ${num(h.hospitals)}` },
    ],
    remarks: [],
    notes: Array.from(new Set([...(d.notes || []), ...(meta.notes || [])])),
    source: "computed",
    asOf: dayLabel(d.data_as_of ?? meta.built_at),
  };
}

export const whereOf = (scope: ScopeEcho | undefined) =>
  !scope?.plant || scope.plant === "ALL" ? "All hospitals" : (scope.his_name || scope.plant_name || scope.plant);
export const whenOf = (meta: Meta, scope: ScopeEcho | undefined) => monthsLabel(meta, scope?.months || []);

/** The filters a drawer's figures were computed under, read-only in its header. `patients`
 *  overrides the Patient type filter's value where a section has none (purchases). */
export function filterChips(meta: Meta, filters: Filters, scope: ScopeEcho | undefined, payer: string, patients: string | null = null) {
  const material = filters.segment === "ALL" ? "All" : meta.categories?.find((c) => c.key === filters.segment)?.label ?? filters.segment;
  return [
    { label: "Hospital", value: whereOf(scope) },
    { label: "Month", value: whenOf(meta, scope) },
    { label: "Patients", value: patients ?? (filters.type === "ALL" ? "IP + OP" : filters.type) },
    { label: "Material", value: material },
    { label: "Payer", value: payer },
  ];
}
