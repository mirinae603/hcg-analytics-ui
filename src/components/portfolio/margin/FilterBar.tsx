"use client";
// The Revenue & margin filters, as the one slim FilterStrip row under the page bar. Page-level,
// as on the Formulary page: each changes what every panel counts, so all of them answer the
// same question. Months come from the overview's own answer (the months its sales table
// holds); the hospital is the global selector in the header, named in the words on the right.
import React from "react";
import { FilterStrip, type FilterControl } from "@/components/portfolio/ledger/pagebar";
import { payerLabel } from "@/components/portfolio/formulary/api";
import type { Basis } from "@/context/BasisContext";
import { SEGMENT_LABEL, RUPEES_ONLY, monthLabelOf, monthsLabelOf } from "./shared";
import type { Filters, PatientType, Payer, RevenueOverview, Segment, View } from "./api";

const TYPES: PatientType[] = ["IP", "OP"];
const SEGMENTS: Exclude<Segment, "ALL">[] = ["onco", "non-onco", "consumables"];
const PAYERS: Exclude<Payer, "ALL">[] = ["CASH", "CASH(TPA)", "GOV"];

/** The filters that narrow the page, in words ("IP only · Onco"); empty when none does. */
function narrowing(f: Filters): string {
  return [
    f.type !== "ALL" ? `${f.type} only` : null,
    f.segment !== "ALL" ? SEGMENT_LABEL[f.segment] : null,
    f.payer !== "ALL" ? payerLabel(f.payer) : null,
  ].filter(Boolean).join(" · ");
}

export default function FilterBar({ d, filters, onChange, view, where, basis }: {
  /** The overview answer: its months and their labels, and the months it shows. */
  d: RevenueOverview;
  filters: Filters;
  onChange: (f: Filters) => void;
  view: View;
  /** The header hospital in words: "HCG KR, Bangalore", or "All hospitals". */
  where: string;
  basis: Basis;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const months = d.months_available ?? [];
  // Until a month is picked the server answers for its latest: the chip shows the one it chose.
  const shown = filters.month || d.scope?.months?.[0] || "";

  const controls: FilterControl[] = [
    {
      key: "month", label: "Month", value: shown,
      options: [...[...months].reverse().map((m) => ({ key: m, label: monthLabelOf(d, m) })), { key: "ALL", label: "All months" }],
      onChange: (v) => set({ month: v }),
    },
    {
      key: "type", label: "Patients", value: filters.type,
      options: [{ key: "ALL", label: "IP + OP" }, ...TYPES.map((t) => ({ key: t, label: t }))],
      onChange: (v) => set({ type: v as PatientType }),
    },
    {
      key: "segment", label: "Material", value: filters.segment,
      options: [{ key: "ALL", label: "All" }, ...SEGMENTS.map((s) => ({ key: s, label: SEGMENT_LABEL[s] }))],
      onChange: (v) => set({ segment: v as Segment }),
    },
    {
      key: "payer", label: "Payer", value: filters.payer,
      options: [{ key: "ALL", label: "All" }, ...PAYERS.map((p) => ({ key: p, label: payerLabel(p) }))],
      onChange: (v) => set({ payer: v as Payer }),
    },
  ];

  const when = shown === "ALL" ? monthsLabelOf(d, months) : monthLabelOf(d, shown);
  // Charts print lakhs and drawers exact rupees: said once here instead of under every chart.
  // Under the Quantity switch the volume views count units; money stays in rupees.
  // The Items tab reads no basis (its table prints revenue and units side by side), so there the
  // switch is answered in words rather than left to change nothing silently.
  const unitsNote = basis === "qty" ? `units sold in the size views, revenue and margin ${RUPEES_ONLY}` : "₹ in lakhs, exact rupees in details";
  const itemsNote = basis === "qty" ? "Items show revenue and units sold side by side: the Quantity switch applies to the Overview" : null;
  const selection = [where, when, narrowing(filters), view === "overview" ? unitsNote : itemsNote].filter(Boolean).join(" · ");

  return <FilterStrip controls={controls} selection={selection} />;
}
