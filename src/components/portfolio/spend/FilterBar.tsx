"use client";
// The spend filters, as one slim strip of chips (ledger/pagebar FilterStrip): month, patient
// type and material type on every tab. Payer depends on the tab: the Scheme views are GOV
// patients by definition (a locked chip), Cash & TPA and out of formulary offer cash and TPA,
// and the Summary shows every section at once, each over its own payers (locked to that). Then
// the Brand filter (./BrandFilter), which narrows every tab to one brand used. The hospital is
// the global selector in the header; the strip's right end says the whole selection in words,
// the hospital first, or, with a brand picked, what switching that brand would have added.
import React from "react";
import { FilterStrip, type FilterControl, type FilterOption } from "@/components/portfolio/ledger/pagebar";
import { monthLabel, monthsLabel } from "../formulary/api";
import { payerLabel } from "./shared";
import { BrandFilter, BrandGain, brandQuery } from "./BrandFilter";
import type { Filters, Meta, Payer, PatientType, Section, Segment } from "./api";

export type PayerMode = "gov" | "cash" | "section";

// The locked payer chips: what the figures count, and why it cannot be changed here.
const LOCKED: Partial<Record<PayerMode, { label: string; title: string }>> = {
  gov: { label: "Scheme patients (GOV)", title: "HCG's scheme rules are for scheme (GOV) patients, so these views count GOV-billed lines only." },
  section: {
    label: "Each section's own",
    title: "Scheme (with HCG's Attis and Healthium slices) counts scheme (GOV) patients; Cash & TPA and out of formulary count cash and TPA patients. Pick a payer in the Cash & TPA section.",
  },
};

// What an older API that sends no lists of its own offers.
const TYPES = ["IP", "OP"];
const CATEGORIES = [{ key: "onco", label: "Onco" }, { key: "non-onco", label: "Non-Onco" }, { key: "consumables", label: "Consumables" }];
const PAYERS = ["CASH", "CASH(TPA)", "GOV"];
const CASH_PAYERS = ["CASH", "CASH(TPA)"];

const ALL = "ALL";

export default function FilterBar({ meta, filters, onChange, payerMode = "gov", where, plant, section, inLakhs }: {
  meta: Meta;
  filters: Filters;
  onChange: (f: Filters) => void;
  payerMode?: PayerMode;
  /** The header hospital in words: "HCG KR, Bangalore", or "All hospitals". */
  where: string;
  /** The header hospital's code (or ALL), for the Brand filter's list. */
  plant: string;
  /** The open section's tab (its brands alone are offered); null on the Summary. */
  section: Section | null;
  /** The tab draws charts, whose faces print lakhs (their drawers exact rupees), not a table. */
  inLakhs: boolean;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const months: FilterOption[] = [
    ...[...meta.months].reverse().map((m) => ({ key: m, label: monthLabel(meta, m) })),
    { key: ALL, label: "All months" },
  ];
  const types: FilterOption[] = [{ key: ALL, label: "All" }, ...(meta.types ?? TYPES).map((t) => ({ key: t, label: t }))];
  const segments: FilterOption[] = [{ key: ALL, label: "All" }, ...(meta.categories ?? CATEGORIES).map((s) => ({ key: s.key, label: s.label }))];
  const pool = payerMode === "cash" ? (meta.cash_payers ?? CASH_PAYERS) : (meta.payers ?? PAYERS);
  const payers: FilterOption[] = [{ key: ALL, label: payerMode === "cash" ? "Cash + TPA" : "All" }, ...pool.map((p) => ({ key: p, label: payerLabel(p) }))];
  // A payer chosen elsewhere that this tab does not offer (GOV on Cash & TPA) shows as All.
  const payer = payers.some((o) => o.key === filters.payer) ? filters.payer : ALL;
  const locked = LOCKED[payerMode];

  const controls: FilterControl[] = [
    { key: "month", label: "Month", value: filters.month, options: months, onChange: (v) => set({ month: v }) },
    { key: "type", label: "Patient type", value: filters.type, options: types, onChange: (v) => set({ type: v as PatientType }) },
    { key: "segment", label: "Material type", value: filters.segment, options: segments, onChange: (v) => set({ segment: v as Segment }) },
    locked
      ? { key: "payer", label: "Payer", value: "locked", options: [{ key: "locked", label: locked.label }], onChange: () => undefined, locked: locked.title }
      : { key: "payer", label: "Payer", value: payer, options: payers, onChange: (v) => set({ payer: v as Payer }) },
  ];

  // The selection in words: the hospital and months always, then each filter that narrows it.
  const labelOf = (opts: FilterOption[], key: string) => opts.find((o) => o.key === key)?.label ?? key;
  const narrowed = [
    filters.type !== ALL ? labelOf(types, filters.type) : null,
    filters.segment !== ALL ? labelOf(segments, filters.segment) : null,
    !locked && payer !== ALL ? labelOf(payers, payer) : null,
  ].filter((x): x is string => x != null).map((x) => `${x} only`);
  const selection = [
    where,
    filters.month === ALL ? monthsLabel(meta, meta.months) : monthLabel(meta, filters.month),
    ...narrowed,
    inLakhs ? "₹ in lakhs, exact rupees in details" : null,
  ].filter(Boolean).join(" · ");

  // The brands on offer follow every other filter; the payer only where the tab takes one.
  const brandParams = brandQuery(filters, plant, payerMode === "cash");

  return (
    <FilterStrip controls={controls} selection={filters.brand ? <BrandGain brand={filters.brand} params={brandParams} section={section} /> : selection}>
      <BrandFilter value={filters.brand} params={brandParams} section={section} onChange={(brand) => set({ brand })} />
    </FilterStrip>
  );
}
