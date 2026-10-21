"use client";
// The formulary filters, as the one slim FilterStrip row under the page bar. Page-level on
// purpose (like ScopeToggle, not CardCategoryFilter): each one changes what "compliance" MEANS,
// so every chart on the Overview must always be answering the same question. Options come from
// /formulary/meta; the hospital is the global selector in the header, named in the words on the
// right. A filter the open tab does not apply shows as a locked chip whose title says why.
import React from "react";
import { FilterStrip, type FilterControl } from "@/components/portfolio/ledger/pagebar";
import { effectiveMethod, monthLabel, monthsLabel, payerLabel, type Filters, type Meta, type Method, type Payer, type PatientType, type Segment, type View } from "./api";

const METHOD_SHORT: Record<string, string> = { pooled: "Pooled", mean: "Mean of onco & non-onco" };

/** Why a filter is fixed on a tab, as the locked chip's title. */
const SCHEME_PAYER = "Scheme brand views count GOV-billed spend only; the Payer filter does not apply here.";
const RULES_PAYER = "Each brand rule names its own payers (e.g. scheme patients only); the Payer filter does not apply here.";
const RULES_METHOD = "Brand rules are amounts and shares of spend, not a compliance ratio.";
const ONE_SEGMENT = "With one material type chosen there is a single ratio, so pooled and mean are the same.";

/** The filters that narrow the tab, in words ("IP only · GOV"); empty when none does. What
 *  the tab applies, not the raw state: Scheme brands is GOV-only, each brand rule sets its own
 *  payers, and rules have no method. */
function narrowing(f: Filters, view: View): string {
  return [
    f.type !== "ALL" ? `${f.type} only` : null,
    f.segment === "onco" ? "Onco" : f.segment === "non-onco" ? "Non-onco" : null,
    view === "scheme" ? "GOV schemes" : view === "rules" ? null : f.payer !== "ALL" ? payerLabel(f.payer) : null,
    view !== "rules" && effectiveMethod(f) === "mean" ? "Mean of onco & non-onco" : null,
  ].filter(Boolean).join(" · ");
}

export default function FilterBar({ meta, filters, onChange, view, where }: {
  meta: Meta;
  filters: Filters;
  onChange: (f: Filters) => void;
  /** The open tab: Scheme brands fixes the payer, Brand rules the payer and the method. */
  view: View;
  /** The header hospital in words: "HCG KR, Bangalore", or "All hospitals". */
  where: string;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const payerFixed = view === "scheme" ? { key: "GOV", label: "GOV schemes only", why: SCHEME_PAYER }
    : view === "rules" ? { key: "ALL", label: "Set by each rule", why: RULES_PAYER } : null;
  const methodWhy = view === "rules" ? RULES_METHOD : filters.segment !== "ALL" ? ONE_SEGMENT : undefined;

  const controls: FilterControl[] = [
    {
      key: "month", label: "Month", value: filters.month,
      options: [...[...meta.months].reverse().map((m) => ({ key: m, label: monthLabel(meta, m) })), { key: "ALL", label: "All months" }],
      onChange: (v) => set({ month: v }),
    },
    {
      key: "type", label: "Patients", value: filters.type,
      options: [{ key: "ALL", label: "IP + OP" }, ...(meta.types ?? ["IP", "OP"]).map((t) => ({ key: t, label: t }))],
      onChange: (v) => set({ type: v as PatientType }),
    },
    {
      key: "segment", label: "Material", value: filters.segment,
      options: [{ key: "ALL", label: "All drugs" }, ...(meta.segments ?? [{ key: "onco", label: "Onco" }, { key: "non-onco", label: "Non-Onco" }])],
      onChange: (v) => set({ segment: v as Segment }),
    },
    {
      key: "payer", label: "Payer", value: payerFixed ? payerFixed.key : filters.payer, locked: payerFixed?.why,
      options: payerFixed ? [{ key: payerFixed.key, label: payerFixed.label }]
        : [{ key: "ALL", label: "All" }, ...(meta.payers ?? ["CASH", "CASH(TPA)", "GOV"]).map((p) => ({ key: p, label: payerLabel(p) }))],
      onChange: (v) => set({ payer: v as Payer }),
    },
    {
      key: "method", label: "Method", value: effectiveMethod(filters), locked: methodWhy,
      options: (meta.methods ?? [{ key: "pooled", label: "Pooled" }, { key: "mean", label: "Mean of Onco & Non-Onco" }])
        .map((m) => ({ key: m.key, label: METHOD_SHORT[m.key] ?? m.label })),
      onChange: (v) => set({ method: v as Method }),
    },
  ];

  const when = filters.month === "ALL" ? monthsLabel(meta, meta.months) : monthLabel(meta, filters.month);
  const narrowed = narrowing(filters, view);
  // Charts print lakhs and drawers exact rupees: said once here instead of under every chart.
  const selection = [where, when, narrowed, view === "overview" ? "₹ in lakhs, exact rupees in details" : null].filter(Boolean).join(" · ");

  return <FilterStrip controls={controls} selection={selection} />;
}
