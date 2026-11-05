"use client";
// Spend Analysis (Prices) — the To check tab: EVERY purchase of the selection priced unusually
// low (under the API's low_ratio_pct of its product's usual cheapest), one row per hospital ×
// brand × supplier summed over the selected months, furthest under the usual cheapest first.
// The headline's drawer previews the furthest under; this is the whole list HCG checks, a likely
// keying slip or a free / bonus supply booked at a token price.
//
// The shared KpiTable on /spend/prices/low: server paging, search, the table's own filters
// (Hospital, Product, Supplier), a Total row (the API's `sums`: units, paid, below the usual
// cheapest, receipts) and a CSV of every matching row named after the filters. HCG keys a brand
// by its material code, so the code is the first column and the brand's name a column of its
// own. A row shows its product in detail on the Overview, where its dot is marked.
import React from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head } from "@/components/portfolio/ledger/kit";
import { inr } from "@/lib/kpiFormat";
import { insightParams, type Filters, type PriceRule } from "../api";
import { lowRatioWords, plural, usualCheapestRule } from "../insights";
import { WORDS } from "./context";
import { useListHead } from "./ProductsTable";

const KpiTable = dynamic(() => import("../../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

export const LOW = "/spend/prices/low";

// The code first (HCG's key), then what was bought and where, then the price against the usual
// cheapest and what that came to. Unit prices print to the paisa ("num"), totals in rupees.
const COLS: Col[] = [
  { field: "material", label: "Material code" },
  { field: "material_desc", label: "Brand" },
  { field: "minor_group", label: "Molecule" },
  { field: "strength", label: "Strength" },
  { field: "form", label: "Form" },
  { field: "plant_name", label: "Hospital" },
  { field: "plant", label: "Plant" },
  { field: "vendor_name", label: "Supplier" },
  { field: "unit_price", label: "Price paid (₹ per unit)", kind: "num" },
  { field: "cheapest_price", label: "Usual cheapest (₹ per unit)", kind: "num" },
  { field: "below_cheapest", label: "Below the usual cheapest", kind: "inr" },
  { field: "value", label: "Paid", kind: "inr" },
  { field: "qty", label: "Units", kind: "num" },
  { field: "lines", label: "Receipts", kind: "num" },
  { field: "molecule_key", label: "Product key" },
];

/** The words for the rule's threshold: "under half the usual cheapest" (the API's ratio), or
 *  "priced unusually low" until the list's answer brings the rule. */
const under = (rule: PriceRule | null) => {
  const low = lowRatioWords(rule);
  return low ? `under ${low}` : "priced unusually low";
};

/** The tab's note: what a row is, how its figure is worked out, the rule it rests on and why the
 *  rows are worth a check (the same words as the headline drawer's preview). */
function checkMethod(rule: PriceRule | null): string {
  return `Each row is one hospital, brand and supplier whose purchases of a product were ${under(rule)}, counted once over the selected months (its figures are those purchases only). Below the usual cheapest = the same units at the usual cheapest − what was paid. ${usualCheapestRule(rule)} ${WORDS.checkNote} Purchases have no payer or patient type.`;
}

/** The header's badge: how many, and what they came to below the usual cheapest. */
const badge = (total: number | null, sums: Record<string, number> | null, rule: PriceRule | null) =>
  total == null ? `purchases ${under(rule)}`
    : `${plural(total, "purchase")} ${under(rule)}${sums?.below_cheapest != null ? ` · ${inr(sums.below_cheapest)} below the usual cheapest` : ""}${sums?.value != null ? ` · ${inr(sums.value)} paid` : ""}`;

type LowRow = { molecule_key: string };

export function PricesCheck({ filters, plant, onPick }: {
  /** The page's filters as this section applies them (insightFilters: its own months). */
  filters: Filters;
  plant: string;
  /** Shows a purchase's product in detail on the Overview. */
  onPick: (moleculeKey: string) => void;
}) {
  const params = insightParams(filters);
  const { sums, total, rule } = useListHead(LOW, { Plant: plant, ...params });
  return (
    <Card delay={80}>
      <Head label="Purchases to check" badge={badge(total, sums, rule)}
        note={`${checkMethod(rule)} ${total === 0 ? "No purchase in this selection is that far under it. " : ""}Click a row to see its product's prices by supplier on the Overview; Export CSV saves every row the table's filters match.`} />
      <KpiTable kpiKey="spend-prices-low" endpoint={LOW} plant={plant} columns={COLS} extraParams={params}
        onRowClick={(r: LowRow) => onPick(r.molecule_key)} />
    </Card>
  );
}
