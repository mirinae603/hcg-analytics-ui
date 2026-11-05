"use client";
// The Executive overview's filters, as the one slim FilterStrip row under the page bar: Month,
// Patients and Material type. Page-level, as on the Formulary page: each changes what every panel
// counts, so they all answer the same question. The months come from the overview's own answer
// (its sales months and its purchase months); the hospital is the global selector in the header
// and the Value ↔ Quantity switch the global basis, both named in the words on the right.
import React from "react";
import { FilterStrip, type FilterControl } from "@/components/portfolio/ledger/pagebar";
import { SEGMENT_LABEL, spanOf } from "./shared";
import type { ExecOverview, Filters, PatientType, Segment } from "./api";

const TYPES: Exclude<PatientType, "ALL">[] = ["IP", "OP"];
const SEGMENTS: Exclude<Segment, "ALL">[] = ["onco", "non-onco", "consumables"];

/** The filters that narrow the page, in words ("IP only · Onco"); empty when none does. */
export function narrowing(f: Pick<Filters, "type" | "segment">): string {
  return [f.type !== "ALL" ? `${f.type} only` : null, f.segment !== "ALL" ? SEGMENT_LABEL[f.segment] : null].filter(Boolean).join(" · ");
}

export default function FilterBar({ d, filters, onChange, where, units }: {
  /** The last overview answer: its months, and the month it was asked for. */
  d: ExecOverview;
  filters: Filters;
  onChange: (f: Filters) => void;
  /** The header hospital in words: "HCG KR, Bangalore", or "All hospitals". */
  where: string;
  /** The header's Value ↔ Quantity switch is on Quantity. */
  units: boolean;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  // Until a month is picked the server answers for its latest sales month: the chip shows it.
  const shown = filters.month || d.scope.month;
  const month = (m: ExecOverview["months"][number]) => (m.sales ? m.label : `${m.label} (purchases only)`);

  const controls: FilterControl[] = [
    {
      key: "month", label: "Month", value: shown,
      options: [...[...d.months].reverse().map((m) => ({ key: m.period, label: month(m) })), { key: "ALL", label: "All months" }],
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
  ];

  const when = shown === "ALL" ? `All months (${spanOf(d.months)})` : d.months.find((m) => m.period === shown)?.label ?? shown;
  // Faces print lakhs and drawers exact rupees: said once here instead of under every chart. Short
  // enough to stay whole beside the filters on a 1280px screen.
  const counted = units ? "units sold where a figure counts them, money in ₹" : "₹ in lakhs, exact rupees in details";
  const selection = [where, when, narrowing(filters), counted].filter(Boolean).join(" · ");
  return <FilterStrip controls={controls} selection={selection} />;
}
