"use client";
// The export filters, as the one slim FilterStrip row under the page bar: Month on both tabs
// (the months the open table holds, newest first, then All months) and, on the sales tab,
// Patients, Material type (consumables included) and Payer. Which of these a tab shows and the
// values each offers come from /export/meta (each dataset's `params` and `options`), so a chip
// never offers a value the server would refuse. The hospital is the global header selector,
// named in the words on the right.
import React from "react";
import { FilterStrip, type FilterControl } from "@/components/portfolio/ledger/pagebar";
import { choicesOf, monthLabel, monthWords, narrowing, type ExportDataset, type Filters } from "./api";

export default function FilterBar({ ds, filters, onChange, where }: {
  ds: ExportDataset;
  /** Already fitted to `ds` (fitFilters): every value is one the chips offer. */
  filters: Filters;
  onChange: (f: Filters) => void;
  /** The header hospital in words: "HCG KR, Bangalore", or "All hospitals". */
  where: string;
}) {
  const controls: FilterControl[] = [
    {
      key: "month", label: "Month", value: filters.month,
      options: [...[...ds.months].reverse().map((m) => ({ key: m, label: monthLabel(ds, m) })), { key: "ALL", label: "All months" }],
      onChange: (v) => onChange({ ...filters, month: v }),
    },
    ...choicesOf(ds).map((c): FilterControl => ({
      key: c.field, label: c.label, value: filters[c.field],
      options: [{ key: "ALL", label: c.all }, ...c.options],
      onChange: (v) => onChange({ ...filters, [c.field]: v }),
    })),
  ];
  const selection = [where, monthWords(ds, filters.month), ...narrowing(ds, filters)].join(" · ");
  return <FilterStrip controls={controls} selection={selection} />;
}
