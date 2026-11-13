"use client";
// Revenue & margin — Items tab: every item sold in the selection with its revenue (MRP), cost,
// margin, margin %, units and the hospitals that sold it, one row per item and formulary bucket
// (an item whose Item Master class changed between the selected months has a row per bucket,
// so the buckets add up to the Overview's). The material code and the item's name are separate
// columns, as HCG asked. The table pages, sorts, searches and filters on the server, and its
// Export CSV writes every row the filters and the search match.
import React from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head } from "@/components/portfolio/ledger/kit";
import { lakhs, pct } from "@/components/portfolio/ledger/format";
import { MATERIALS_PATH, filterParams, type Filters, type RevenueOverview } from "./api";
import { blankCostWords } from "./shared";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// Code first, then the name: HCG reads and exports the two as separate columns.
const ITEM_COLS: Col[] = [
  { field: "material", label: "Material code" },
  { field: "material_desc", label: "Item" },
  { field: "generic_name", label: "Generic" },
  { field: "manufacturer", label: "Manufacturer" },
  { field: "category", label: "Category" },
  { field: "bucket_label", label: "Formulary bucket" },
  { field: "mrp", label: "Revenue (MRP)", kind: "inr" },
  { field: "cost", label: "Cost", kind: "inr" },
  { field: "margin", label: "Margin", kind: "inr" },
  { field: "margin_pct", label: "Margin %", kind: "pct2" },
  { field: "qty", label: "Units sold", kind: "num" },
  { field: "lines", label: "Lines", kind: "num" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
  { field: "cost_missing_lines", label: "Blank-cost lines", kind: "num" },
];

export default function Items({ d, filters, plant }: {
  /** The overview for the very same filters: its headline is the total over the table, so the
   *  header stays put while the table is searched (the table's own Total row follows the search). */
  d: RevenueOverview | null;
  filters: Filters;
  plant: string;
}) {
  const h = d?.headline;
  const blank = h ? blankCostWords(h) : null;
  return (
    <Card delay={80}>
      <Head label="Items: revenue and margin"
        note={`Every item sold in the selection, drugs and consumables, largest revenue first. Revenue is MRP; margin is MRP − cost; margin % is margin ÷ MRP, per row. ${blank ? `${blank}, as the group's sheet does. ` : ""}The filters above the table narrow its rows and its Total row.`}
        badge={h ? `Revenue ${lakhs(h.mrp)} · margin ${lakhs(h.margin)} (${pct(h.margin_pct, 1)})` : undefined} />
      <KpiTable kpiKey="revenue-margin-items" endpoint={MATERIALS_PATH} plant={plant} columns={ITEM_COLS} extraParams={filterParams(filters)} />
    </Card>
  );
}
