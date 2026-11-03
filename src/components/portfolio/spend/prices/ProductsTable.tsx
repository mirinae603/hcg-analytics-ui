"use client";
// Spend Analysis (Prices) — the Products tab: one row per product (molecule, strength, form and
// kind) bought in the selection, most paid above its usual cheapest price first, and the supplier
// drill the overview's suppliers tile opens. Both are the shared KpiTable on
// /spend/prices/molecules: server paging, search, the table's own filters (Category, Form,
// Dearest above the usual cheapest), a Total row (the API's `sums`: value, extra paid, receipts)
// and a CSV of every matching row named after the filters. The header states the total the
// "Share" column divides by, and its Method prints the benchmark's thresholds as the list's
// answer gives them.
//   PricesProducts — the tab; a product's row shows it in detail on the Overview.
//   VendorProducts — one supplier's products, set against the usual cheapest of the selection
//                    (Vendor= narrows whose purchases count, never the usual cheapest).
//   useListHead    — what a Prices list's header reads from one row of it (its totals and the
//                    rule); the To check tab (CheckList) reads its own the same way.
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head } from "@/components/portfolio/ledger/kit";
import { inr } from "@/lib/kpiFormat";
import { apiFetch } from "@/utils/api";
import { SHARES_NOTE } from "../../table/query";
import { toQuery } from "../../formulary/api";
import { insightParams, type Filters, type PriceRule } from "../api";
import { lowRatioWords, spreadWords, usualCheapestRule } from "../insights";
import { WORDS } from "./context";

const KpiTable = dynamic(() => import("../../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

export const PRODUCTS = "/spend/prices/molecules";

// What was paid above the usual cheapest and the prices behind it come first after the product's
// name, in plain words; unit prices print to the paisa ("num"), totals in rupees ("inr"). The
// lowest price paid ("min_price") is its own column: the usual cheapest is not it.
const COLS: Col[] = [
  { field: "minor_group", label: "Molecule" },
  { field: "strength", label: "Strength" },
  { field: "form", label: "Form" },
  { field: "extra_paid", label: "Paid above the usual cheapest", kind: "inr" },
  // extra_paid ÷ value: the extra's share of what the product cost, not how far its price was
  // above the usual cheapest (a product bought at twice it everywhere shows 50%, not 100%).
  { field: "extra_pct", label: "Extra as % of spend", kind: "pct2" },
  { field: "cheapest_price", label: "Usual cheapest unit price (₹)", kind: "num" },
  { field: "max_price", label: "Dearest unit price (₹)", kind: "num" },
  { field: "spread_ratio", label: "Dearest ÷ usual cheapest", kind: "num" },
  { field: "price_index", label: "Price index", kind: "num" },
  { field: "value", label: "Spent", kind: "inr" },
  { field: "share_pct", label: "Share of the extra", kind: "pct2" },
  { field: "vendors", label: "Suppliers", kind: "num" },
  { field: "plants", label: "Hospitals", kind: "num" },
  { field: "brands", label: "Brands", kind: "num" },
  { field: "cheapest_brand", label: "Brand that set the usual cheapest" },
  { field: "cheapest_vendor", label: "Supplier that set the usual cheapest" },
  { field: "cheapest_plant", label: "Hospital that set the usual cheapest (plant)" },
  { field: "category", label: "Category" },
  { field: "kind", label: "Kind" },
  { field: "varies", label: "Dearest above the usual cheapest", kind: "bool" },
  { field: "min_price", label: "Lowest unit price paid (₹)", kind: "num" },
  { field: "wavg_price", label: "Average unit price (₹)", kind: "num" },
  { field: "qty", label: "Units", kind: "num" },
  { field: "low_rows", label: "Purchases to check", kind: "num" },
  { field: "low_value", label: "Paid for purchases to check", kind: "inr" },
  { field: "lines", label: "Receipts", kind: "num" },
  { field: "molecule_key", label: "Product key" },
];

/** The tab's Method, with the benchmark's figures from the list answer's `rule` block (the same
 *  block the overview carries, so both tabs state one rule). Until the first answer arrives, or
 *  from an API without the block, the sentences say the same without the figures. */
function productsMethod(rule: PriceRule | null): string {
  const low = lowRatioWords(rule);
  return `A product is one molecule, strength, form and kind: its brands are the same medicine. Unit price = the price after discount (GRN Total Amount without tax ÷ GR Qty). ${usualCheapestRule(rule)} ${WORDS.extraNote} ${WORDS.indexNote} Dearest above the usual cheapest = the product's dearest unit price is above its usual cheapest ${spreadWords(rule)}. Purchases to check = hospital, brand and supplier purchases priced ${low ? `under ${low}` : "far under the usual cheapest"} (the To check tab lists them). Units are not totalled: different products' units differ. Purchases have no payer or patient type.`;
}

const badge = (total: number | undefined) => `purchases${total != null ? ` · ${inr(total)} paid above the usual cheapest in total` : ""}`;

type ProductRow = { molecule_key: string };

/** What a Prices list's header reads from ONE row of it (page_size=1, the request useTableSums
 *  makes): the column totals (Contract A `sums`) and the row count, null until they arrive, and
 *  the API's `rule`, which a list tab has no overview answer to read. One request serves all
 *  three. The rule is the build's constant, so the last one received is kept while the next
 *  selection loads: the Method's figures do not drop back to words each time a filter changes. */
export function useListHead(endpoint: string, params: Record<string, string>) {
  const url = `${endpoint}?${toQuery({ ...params, page: "0", page_size: "1" })}`;
  const [head, setHead] = useState<{ sums: Record<string, number> | null; total: number | null }>({ sums: null, total: null });
  const [rule, setRule] = useState<PriceRule | null>(null);
  useEffect(() => {
    let dead = false;
    setHead({ sums: null, total: null });
    apiFetch<{ sums?: Record<string, number> | null; total?: number | null; rule?: PriceRule | null }>(url)
      .then((d) => {
        if (dead) return;
        setHead({ sums: d?.sums ?? null, total: typeof d?.total === "number" ? d.total : null });
        if (d?.rule) setRule(d.rule);
      })
      .catch(() => { if (!dead) setHead({ sums: null, total: null }); });
    return () => { dead = true; };
  }, [url]);
  return { ...head, rule };
}

export function PricesProducts({ filters, plant, onPick }: {
  /** The page's filters as this section applies them (insightFilters: its own months). */
  filters: Filters;
  plant: string;
  /** Shows a product in detail on the Overview. */
  onPick: (moleculeKey: string) => void;
}) {
  const params = insightParams(filters);
  const { sums, rule } = useListHead(PRODUCTS, { Plant: plant, ...params });
  return (
    <Card delay={80}>
      <Head label="Products bought at different prices" badge={badge(sums?.extra_paid)}
        note={`${productsMethod(rule)} Click a product to see its prices by supplier on the Overview. ${SHARES_NOTE}`} />
      <KpiTable kpiKey="spend-prices-products" endpoint={PRODUCTS} plant={plant} columns={COLS} extraParams={params}
        onRowClick={(r: ProductRow) => onPick(r.molecule_key)} />
    </Card>
  );
}

/** One supplier's products: its purchases against the usual cheapest of the selection. */
export function VendorProducts({ vendor, plant, params }: { vendor: string; plant: string; params: Record<string, string> }) {
  return (
    <KpiTable key={`${vendor}|${plant}`} kpiKey="spend-prices-vendor-products" endpoint={PRODUCTS} plant={plant}
      columns={COLS} extraParams={{ ...params, Vendor: vendor }} />
  );
}
