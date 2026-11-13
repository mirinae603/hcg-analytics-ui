"use client";
// The spend filters, as one slim strip of chips (ledger/pagebar FilterStrip): month, patient
// type and material type on every tab. Payer depends on the tab: the Scheme views are GOV
// patients by definition (a locked chip), Cash & TPA offers cash and TPA, and the Summary shows
// every section at once, each over its own payers (locked to that). Out of formulary is
// purchases: its Month chip offers the purchase build's own months, Material type drugs only
// (the purchase scope), and Patient type and Payer are locked chips (a purchase has neither).
// The purchase analyses (Prices, Generic vs branded) are purchases too, with months of their own
// (every GRN month). Then the Brand
// filter (./BrandFilter), which narrows every tab with a brand switch to one brand used or
// bought; on the purchase analyses, which compare products, it is a locked chip. The hospital is
// the global selector in the header; the strip's right end says the whole selection in words,
// the hospital first, or, with a brand picked, what switching that brand would have added.
import React from "react";
import { FilterStrip, type FilterControl, type FilterOption } from "@/components/portfolio/ledger/pagebar";
import { monthLabel, monthsLabel } from "../formulary/api";
import { payerLabel } from "./shared";
import { BrandFilter, BrandGain, brandQuery } from "./BrandFilter";
import { oofMonths, purchaseMonthLabel, purchaseMonthsLabel, type Filters, type Meta, type Payer, type PatientType, type PurchaseMonth, type Section, type Segment } from "./api";

/** What the open tab counts: scheme (GOV) patients, cash & TPA patients, each section its own
 *  (the Summary), or purchases (out of formulary: no payer, no patient type). */
export type PayerMode = "gov" | "cash" | "section" | "purchases";

// The locked payer chips: what the figures count, and why it cannot be changed here.
const LOCKED: Partial<Record<PayerMode, { label: string; title: string }>> = {
  gov: { label: "Scheme patients (GOV)", title: "HCG's scheme rules are for scheme (GOV) patients, so these views count GOV-billed lines only." },
  section: {
    label: "Each section's own",
    title: "Scheme (with HCG's Attis and Healthium slices) counts scheme (GOV) patients; Cash & TPA counts cash and TPA patients; out of formulary counts purchases, which have no payer. Pick a payer in the Cash & TPA section.",
  },
  purchases: { label: "Not for purchases", title: "Out of formulary, Prices and Generic vs branded are read from HCG's purchases (GRN): a purchase has no payer." },
};
// The purchase tabs' patient-type chip: purchases have none.
const NO_TYPE = { label: "Not for purchases", title: "Out of formulary, Prices and Generic vs branded are read from HCG's purchases (GRN): a purchase has no patient type." };
// The purchase analyses' brand chip: they compare products and suppliers, not one brand's switch.
const NO_BRAND = { title: "Prices and Generic vs branded compare products and suppliers: the Brand filter applies to Scheme, Cash & TPA and Out of formulary. Pick a product on the Prices tab instead." };

// What an older API that sends no lists of its own offers.
const TYPES = ["IP", "OP"];
const CATEGORIES = [{ key: "onco", label: "Onco" }, { key: "non-onco", label: "Non-Onco" }, { key: "consumables", label: "Consumables" }];
const PAYERS = ["CASH", "CASH(TPA)", "GOV"];
const CASH_PAYERS = ["CASH", "CASH(TPA)"];

const ALL = "ALL";

export default function FilterBar({ meta, filters, onChange, payerMode = "gov", where, plant, section, inLakhs, insight = null }: {
  meta: Meta;
  filters: Filters;
  onChange: (f: Filters) => void;
  payerMode?: PayerMode;
  /** The header hospital in words: "HCG KR, Bangalore", or "All hospitals". */
  where: string;
  /** The header hospital's code (or ALL), for the Brand filter's list. */
  plant: string;
  /** The open section's tab (its brands alone are offered); null on the Summary. On out of
   *  formulary `filters` are the section's own (oofFilters: its month is a purchase month). */
  section: Section | null;
  /** The tab draws charts, whose faces print lakhs (their drawers exact rupees), not a table. */
  inLakhs: boolean;
  /** A purchase analysis's tab (Prices, Generic vs branded; its payerMode is "purchases"): the
   *  months its build holds, with their labels. Its Material type offers drugs only and its
   *  Brand chip is locked. Null elsewhere. */
  insight?: { months: PurchaseMonth[] } | null;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const purchases = payerMode === "purchases";
  // Purchases have months of their own: out of formulary the GRN months with that month's Item
  // Master, the purchase analyses every GRN month (labelled by their build).
  const published = insight ? insight.months.map((m) => m.period) : purchases ? oofMonths(meta) : meta.months;
  const labelOfMonth = (m: string) => (insight ? purchaseMonthLabel(insight.months, m) : monthLabel(meta, m));
  const months: FilterOption[] = [
    ...[...published].reverse().map((m) => ({ key: m, label: labelOfMonth(m) })),
    { key: ALL, label: "All months" },
  ];
  const types: FilterOption[] = [{ key: ALL, label: "All" }, ...(meta.types ?? TYPES).map((t) => ({ key: t, label: t }))];
  // Purchases are drugs (the purchase scope): consumables are not offered on their tabs.
  const segments: FilterOption[] = [{ key: ALL, label: "All" }, ...(meta.categories ?? CATEGORIES)
    .filter((s) => !purchases || s.key !== "consumables").map((s) => ({ key: s.key, label: s.label }))];
  const pool = payerMode === "cash" ? (meta.cash_payers ?? CASH_PAYERS) : (meta.payers ?? PAYERS);
  const payers: FilterOption[] = [{ key: ALL, label: payerMode === "cash" ? "Cash + TPA" : "All" }, ...pool.map((p) => ({ key: p, label: payerLabel(p) }))];
  // A payer chosen elsewhere that this tab does not offer (GOV on Cash & TPA) shows as All.
  const payer = payers.some((o) => o.key === filters.payer) ? filters.payer : ALL;
  const locked = LOCKED[payerMode];

  const controls: FilterControl[] = [
    { key: "month", label: "Month", value: filters.month, options: months, onChange: (v) => set({ month: v }) },
    purchases
      ? { key: "type", label: "Patient type", value: "locked", options: [{ key: "locked", label: NO_TYPE.label }], onChange: () => undefined, locked: NO_TYPE.title }
      : { key: "type", label: "Patient type", value: filters.type, options: types, onChange: (v) => set({ type: v as PatientType }) },
    { key: "segment", label: "Material type", value: filters.segment, options: segments, onChange: (v) => set({ segment: v as Segment }) },
    locked
      ? { key: "payer", label: "Payer", value: "locked", options: [{ key: "locked", label: locked.label }], onChange: () => undefined, locked: locked.title }
      : { key: "payer", label: "Payer", value: payer, options: payers, onChange: (v) => set({ payer: v as Payer }) },
    ...(insight ? [{
      key: "brand", label: "Brand", value: "locked", onChange: () => undefined, locked: NO_BRAND.title,
      options: [{ key: "locked", label: filters.brand ? `${filters.brand.name}: not applied here` : "Not for this section" }],
    }] : []),
  ];

  // The selection in words: the hospital and months always, then each filter that narrows it.
  const labelOf = (opts: FilterOption[], key: string) => opts.find((o) => o.key === key)?.label ?? key;
  const narrowed = [
    !purchases && filters.type !== ALL ? labelOf(types, filters.type) : null,
    filters.segment !== ALL ? labelOf(segments, filters.segment) : null,
    !locked && payer !== ALL ? labelOf(payers, payer) : null,
  ].filter((x): x is string => x != null).map((x) => `${x} only`);
  const selection = [
    where,
    filters.month === ALL ? (insight ? purchaseMonthsLabel(insight.months, published) : monthsLabel(meta, published)) : labelOfMonth(filters.month),
    ...narrowed,
    inLakhs ? "₹ in lakhs, exact rupees in details" : null,
  ].filter(Boolean).join(" · ");

  // The brands on offer follow every other filter the tab takes.
  const brandParams = brandQuery(filters, plant, section);

  if (insight) return <FilterStrip controls={controls} selection={selection} />;
  return (
    <FilterStrip controls={controls} selection={filters.brand ? <BrandGain brand={filters.brand} params={brandParams} section={section} /> : selection}>
      <BrandFilter value={filters.brand} params={brandParams} section={section} onChange={(brand) => set({ brand })} />
    </FilterStrip>
  );
}
