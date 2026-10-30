"use client";
// Spend Analysis — the Out of formulary section's two tables, on purchases:
//   OofBrands  — Brands tab: one row per brand bought out of formulary × the brand suggested for
//                it (and who suggested it: HCG's sheet or list, or the app's own match marked
//                Estimated), most margin missed first; brands parked by HCG or with no
//                alternative follow, by money spent. A brand opens the vendors it was bought from.
//   OofVendors — Vendors tab: one row per vendor (the GRN's goods supplier), most margin missed
//                first; a vendor opens the brands bought from it.
// Both are the shared KpiTable: server paging, search, the table's own filters (Suggested by,
// Molecule, Manufacturer, Category), a Total row (the API's `sums`) and a CSV of every matching
// row named after the filters. The header states the net total; the "Share" column is of what
// switching would gain (the "missed where switching gains" column's total), never negative. A
// Total is the sum of the rows as shown, each to the paisa, so it can differ from the overview's
// headline (HCG's figure) by a few paise; the headline is the figure of record.
import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head } from "@/components/portfolio/ledger/kit";
import { inr } from "@/lib/kpiFormat";
import { SlideOver } from "../formulary/parts";
import { sectionParams, useTableSums, type Filters } from "./api";
import { codesText } from "./shared";
import { SHARES_NOTE } from "../table/query";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const BRANDS = "/spend/oof/items";
const VENDORS = "/spend/oof/vendors";

// Margin missed, its % and the two margins come first after the two brands and who suggested
// the second, in plain words; the prices and per-unit margins behind them follow.
const BRAND_COLS: Col[] = [
  { field: "material_desc", label: "Brand bought" },
  { field: "material", label: "Material" },
  { field: "suggested_desc", label: "Suggested brand" },
  { field: "suggested_by_label", label: "Suggested by" },
  { field: "margin_loss", label: "Margin missed", kind: "inr" },
  { field: "loss_pct", label: "% missed", kind: "pct2" },
  { field: "actual_margin", label: "Margin earned", kind: "inr" },
  { field: "potential_margin", label: "Margin possible", kind: "inr" },
  { field: "purchase_value", label: "Spent", kind: "inr" },
  { field: "estimated", label: "Estimated", kind: "bool" },
  { field: "rule", label: "How the app matched" },
  { field: "minor_group", label: "Molecule" },
  { field: "manufacturer", label: "Manufacturer" },
  { field: "category", label: "Category" },
  { field: "suggested_material", label: "Suggested material" },
  { field: "base_price_min", label: "Price paid, lowest", kind: "inr" },
  { field: "base_price_max", label: "Price paid, highest", kind: "inr" },
  { field: "sug_price", label: "Suggested brand price", kind: "inr" },
  { field: "sug_mrp", label: "Suggested brand MRP", kind: "inr" },
  { field: "sug_gst", label: "Suggested brand GST %", kind: "num" },
  { field: "used_margin", label: "Margin / unit bought", kind: "inr" },
  { field: "used_margin_pct", label: "Bought margin %", kind: "pct2" },
  { field: "suggested_margin", label: "Margin / unit suggested", kind: "inr" },
  { field: "suggested_margin_pct", label: "Suggested margin %", kind: "pct2" },
  { field: "margin_gap", label: "Gap / unit", kind: "inr" },
  { field: "gain_loss", label: "Missed where switching gains", kind: "inr" },
  { field: "better_loss", label: "Where the brand bought earns more", kind: "inr" },
  { field: "qty", label: "Units", kind: "num" },
  { field: "value_after_discount", label: "Spent after discount", kind: "inr" },
  { field: "counted_value", label: "Spent, counted", kind: "inr" },
  { field: "share_pct", label: "Share of the switching gain", kind: "pct2" },
  { field: "vendors", label: "Vendors", kind: "num" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
  { field: "lines", label: "Receipts", kind: "num" },
];

const VENDOR_COLS: Col[] = [
  { field: "vendor_name", label: "Vendor" },
  { field: "vendor_codes", label: "SAP codes" },
  { field: "margin_loss", label: "Margin missed", kind: "inr" },
  { field: "loss_pct", label: "% missed", kind: "pct2" },
  { field: "actual_margin", label: "Margin earned", kind: "inr" },
  { field: "potential_margin", label: "Margin possible", kind: "inr" },
  { field: "purchase_value", label: "Spent", kind: "inr" },
  { field: "no_alternative_value", label: "Spent, no alternative", kind: "inr" },
  { field: "brands", label: "Brands", kind: "num" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
  { field: "gain_loss", label: "Missed where switching gains", kind: "inr" },
  { field: "better_loss", label: "Where the brand bought earns more", kind: "inr" },
  { field: "qty", label: "Units", kind: "num" },
  { field: "value_after_discount", label: "Spent after discount", kind: "inr" },
  { field: "counted_value", label: "Spent, counted", kind: "inr" },
  { field: "share_pct", label: "Share of the switching gain", kind: "pct2" },
  { field: "lines", label: "Receipts", kind: "num" },
];

const SHARE = "Share of the switching gain = the row's part of what switching would gain (the 'Missed where switching gains' total), never of the net margin missed, which brands that earn more can bring near or below zero.";
const METHOD = "Out-of-formulary purchases: every goods receipt of a drug the month's Item Master flags OUT OF FORMULARY. Spent = Base Price × units. Margin earned = units × (MRP excl GST − the price paid) of the brand bought; margin possible = the same units × (MRP excl GST − HCG Pharma price) of the suggested brand; margin missed = possible − earned, net as HCG counts it (a brand that earns more than its suggestion is negative); % missed = margin missed ÷ margin possible. Suggested by: HCG's worksheet of the month, else HCG's pair from another month, HCG's list, or the app's match on molecule, strength and form (Estimated). Parked receipts and brands with no alternative are listed, by money spent, and add nothing. Purchases have no payer or patient type.";

const NOTE_BRANDS = `${METHOD} ${SHARE} One row per brand bought and suggested brand: a brand partly parked, or with another suggestion in another month, has a row for each. Click a brand to see the vendors it was bought from.`;
const NOTE_VENDORS = `${METHOD} ${SHARE} A vendor is the GRN's goods supplier by name: one supplier can hold several SAP codes (one per region), listed beside it. Click a vendor to see the brands bought from it.`;

const badge = (total: number | undefined) => `purchases · HCG's method${total != null ? ` · ${inr(total)} margin missed in total` : ""}`;

type BrandRow = { material: string; material_desc: string | null; suggested_desc: string | null; suggested_by_label: string | null };
type VendorRow = { vendor: string; vendor_codes: string[]; vendor_name: string | null };

/** The query a table of this section takes: the section's filters (no payer or patient type). */
const paramsOf = (filters: Filters) => sectionParams("oof", filters);

export function OofBrands({ filters, plant }: { filters: Filters; plant: string }) {
  const params = paramsOf(filters);
  const [item, setItem] = useState<BrandRow | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const total = useTableSums(BRANDS, { Plant: plant, ...params })?.margin_loss;
  return (
    <>
      <Card delay={80}>
        <Head label="Out-of-formulary brands bought vs the suggested brand" note={`${NOTE_BRANDS} ${SHARES_NOTE}`} badge={badge(total)} />
        <KpiTable kpiKey="spend-oof-items" endpoint={BRANDS} plant={plant} columns={BRAND_COLS} extraParams={params}
          onRowClick={(r: BrandRow) => { setItem(r); setOpen(true); }} />
      </Card>
      <SlideOver open={open} onClose={close} eyebrow="Out-of-formulary brand bought"
        title={item?.material_desc || item?.material || ""}
        sub={item ? `Material ${item.material} · suggested brand ${item.suggested_desc ?? "none"}${item.suggested_by_label ? ` (${item.suggested_by_label})` : ""} · vendors it was bought from` : undefined}>
        {item && (
          <KpiTable key={`${item.material}|${plant}`} kpiKey="spend-oof-item-vendors" endpoint={VENDORS} plant={plant}
            columns={VENDOR_COLS} extraParams={{ ...params, Material: item.material }} />
        )}
      </SlideOver>
    </>
  );
}

export function OofVendors({ filters, plant }: { filters: Filters; plant: string }) {
  const params = paramsOf(filters);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const total = useTableSums(VENDORS, { Plant: plant, ...params })?.margin_loss;
  return (
    <>
      <Card delay={80}>
        <Head label="Vendors by out-of-formulary margin missed" note={`${NOTE_VENDORS} ${SHARES_NOTE}`} badge={badge(total)} />
        <KpiTable kpiKey="spend-oof-vendors" endpoint={VENDORS} plant={plant} columns={VENDOR_COLS} extraParams={params}
          onRowClick={(r: VendorRow) => { setVendor(r); setOpen(true); }} />
      </Card>
      <SlideOver open={open} onClose={close} eyebrow="Vendor"
        title={vendor?.vendor_name || vendor?.vendor || ""}
        sub={vendor ? `${codesText(vendor.vendor_codes)} · out-of-formulary brands bought from it` : undefined}>
        {vendor && (
          <KpiTable key={`${vendor.vendor}|${plant}`} kpiKey="spend-oof-vendor-items" endpoint={BRANDS} plant={plant}
            columns={BRAND_COLS} extraParams={{ ...params, Vendor: vendor.vendor }} />
        )}
      </SlideOver>
    </>
  );
}
