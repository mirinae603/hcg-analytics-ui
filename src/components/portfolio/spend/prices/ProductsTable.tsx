"use client";
// Spend Analysis (Prices) — the Products tab: one row per product (molecule, strength, form and
// kind) bought in the selection, most paid above its cheapest price first, and the supplier drill
// the overview's suppliers tile opens. Both are the shared KpiTable on /spend/prices/molecules:
// server paging, search, the table's own filters (Category, Form, Bought at more than one price),
// a Total row (the API's `sums`: value, extra paid, receipts) and a CSV of every matching row
// named after the filters. The header states the total the "Share" column divides by.
//   PricesProducts — the tab; a product's row shows it in detail on the Overview.
//   VendorProducts — one supplier's products, set against the cheapest price anyone paid in the
//                    selection (Vendor= narrows whose purchases count, never the cheapest).
import React from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head } from "@/components/portfolio/ledger/kit";
import { inr } from "@/lib/kpiFormat";
import { SHARES_NOTE } from "../../table/query";
import { insightParams, useTableSums, type Filters } from "../api";
import { WORDS } from "./context";

const KpiTable = dynamic(() => import("../../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

export const PRODUCTS = "/spend/prices/molecules";

// What was paid above the cheapest and the prices behind it come first after the product's
// name, in plain words; unit prices print to the paisa ("num"), totals in rupees ("inr").
const COLS: Col[] = [
  { field: "minor_group", label: "Molecule" },
  { field: "strength", label: "Strength" },
  { field: "form", label: "Form" },
  { field: "extra_paid", label: "Paid above the cheapest", kind: "inr" },
  { field: "extra_pct", label: "% above the cheapest", kind: "pct2" },
  { field: "cheapest_price", label: "Cheapest unit price (₹)", kind: "num" },
  { field: "max_price", label: "Dearest unit price (₹)", kind: "num" },
  { field: "spread_ratio", label: "Dearest ÷ cheapest", kind: "num" },
  { field: "price_index", label: "Price index", kind: "num" },
  { field: "value", label: "Spent", kind: "inr" },
  { field: "share_pct", label: "Share of the extra", kind: "pct2" },
  { field: "vendors", label: "Suppliers", kind: "num" },
  { field: "plants", label: "Hospitals", kind: "num" },
  { field: "brands", label: "Brands", kind: "num" },
  { field: "cheapest_brand", label: "Cheapest brand" },
  { field: "cheapest_vendor", label: "Cheapest supplier" },
  { field: "cheapest_plant", label: "Cheapest at (plant)" },
  { field: "category", label: "Category" },
  { field: "kind", label: "Kind" },
  { field: "varies", label: "Bought at more than one price", kind: "bool" },
  { field: "min_price", label: "Lowest unit price paid (₹)", kind: "num" },
  { field: "wavg_price", label: "Average unit price (₹)", kind: "num" },
  { field: "qty", label: "Units", kind: "num" },
  { field: "lines", label: "Receipts", kind: "num" },
  { field: "molecule_key", label: "Product key" },
];

const METHOD = `A product is one molecule, strength, form and kind: its brands are the same medicine. Unit price = the price after discount (GRN Total Amount without tax ÷ GR Qty). ${WORDS.extraNote} ${WORDS.indexNote} Units are not totalled: different products' units differ. Purchases have no payer or patient type.`;

const badge = (total: number | undefined) => `purchases${total != null ? ` · ${inr(total)} paid above the cheapest in total` : ""}`;

type ProductRow = { molecule_key: string };

export function PricesProducts({ filters, plant, onPick }: {
  /** The page's filters as this section applies them (insightFilters: its own months). */
  filters: Filters;
  plant: string;
  /** Shows a product in detail on the Overview. */
  onPick: (moleculeKey: string) => void;
}) {
  const params = insightParams(filters);
  const total = useTableSums(PRODUCTS, { Plant: plant, ...params })?.extra_paid;
  return (
    <Card delay={80}>
      <Head label="Products bought at different prices" badge={badge(total)}
        note={`${METHOD} Click a product to see its prices by supplier on the Overview. ${SHARES_NOTE}`} />
      <KpiTable kpiKey="spend-prices-products" endpoint={PRODUCTS} plant={plant} columns={COLS} extraParams={params}
        onRowClick={(r: ProductRow) => onPick(r.molecule_key)} />
    </Card>
  );
}

/** One supplier's products: its purchases against the cheapest price anyone paid. */
export function VendorProducts({ vendor, plant, params }: { vendor: string; plant: string; params: Record<string, string> }) {
  return (
    <KpiTable key={`${vendor}|${plant}`} kpiKey="spend-prices-vendor-products" endpoint={PRODUCTS} plant={plant}
      columns={COLS} extraParams={{ ...params, Vendor: vendor }} />
  );
}
