"use client";
// Spend Analysis (Prices) — the suppliers compared: the largest suppliers of the selection (by
// what they were paid for products that can be compared), each one's price index as a bar from
// zero with a tick at 1.00× (the usual cheapest of the selection): the part of a bar past the
// tick is how far above the usual cheapest it was paid, on average; a bar that stops short of the
// tick (under 1.00×) was paid less than the usual cheapest overall, which the usual cheapest
// allows (it is not the lowest price paid). Each supplier keeps its series colour on every tile.
// A supplier's bar opens its products, each set against the usual cheapest; the drawer lists the
// suppliers with exact rupees.
import React, { useCallback, useState } from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SERIES } from "@/components/portfolio/ledger/kit";
import { Swatch } from "@/components/portfolio/ledger/legend";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { SlideOver } from "../../formulary/parts";
import type { PriceVendor } from "../api";
import { DataTable, type Col } from "../DataTable";
import { plural, times } from "../insights";
import { PRODUCT_COL, PRICES_SOURCE, Method, type Ctx } from "./context";
import { VendorProducts } from "./ProductsTable";

/** The index of a supplier paid the usual cheapest on average: the tick on every bar. Below it
 *  the supplier was paid less than the usual cheapest overall (the scale always holds the tick). */
const AT_CHEAPEST = 1;

/** The supplier was paid less than the usual cheapest overall (its index under 1.00×). */
const below = (v: PriceVendor) => isNum(v.price_index) && v.price_index < AT_CHEAPEST;

function SuppliersDrawer({ c, dr, title, onVendor }: { c: Ctx; dr: DrawerCtl; title: string; onVendor: (v: PriceVendor) => void }) {
  const all = c.d.vendors || [];
  const h = c.d.headline;
  const cols: Col<PriceVendor>[] = [
    {
      label: "Supplier", align: "left", wrap: true, render: (v) => (
        <button type="button" onClick={() => onVendor(v)} aria-label={`Show the products bought from ${v.vendor_name}`}
          className="inline-flex items-center gap-1.5 text-left underline decoration-dotted underline-offset-2" style={{ color: INK }}>
          <Swatch color={c.vendorCol(v.vendor_name)} />{v.vendor_name}
        </button>
      ),
      raw: (v) => v.vendor_name,
    },
    { label: "Paid", render: (v) => rupeesExact(v.value), raw: (v) => v.value, unit: "₹" },
    { label: "At the usual cheapest", render: (v) => rupeesExact(v.at_cheapest), raw: (v) => v.at_cheapest, unit: "₹" },
    { label: "Paid above it", render: (v) => <b>{rupeesExact(v.extra_paid)}</b>, raw: (v) => v.extra_paid, unit: "₹" },
    { label: "Price index", render: (v) => times(v.price_index), raw: (v) => v.price_index },
    { label: "Share", render: (v) => pct(v.share_pct, 1), raw: (v) => v.share_pct, unit: "%" },
    { label: "Products", render: (v) => num(v.molecules), raw: (v) => v.molecules },
    { label: "Hospitals", render: (v) => num(v.plants), raw: (v) => v.plants },
    { label: "SAP codes", render: (v) => num(v.vendor_codes.length), raw: (v) => v.vendor_codes.length },
  ];
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.extra_paid_vs_cheapest), comparator: `paid above the usual cheapest, ${plural(c.d.vendors_total, "supplier")} with a purchase compared, ${c.when}` }}
      source={PRICES_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "vendors", label: all.length > 1 ? `Top ${all.length}` : "Suppliers", render: () => (
            <DrawerSection title={all.length < c.d.vendors_total ? `The ${all.length} suppliers paid the most, of ${num(c.d.vendors_total)}` : "Suppliers, most paid first"}
              note={`${c.w.indexNote} At the usual cheapest = the same units at each product's usual cheapest price. Share = the supplier's part of what was paid for the products compared. A supplier is one name, whatever its SAP codes. Click a supplier to see its products.`}>
              <DataTable context={c.context} rows={all} rowKey={(v) => v.vendor_name} cols={cols} caption="Suppliers by what they were paid, with their price index" minWidth={980} empty="No supplier in this selection." />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.indexNote}</p>
              <p>Each supplier&apos;s bar runs from zero to its price index on one scale; the tick on every bar is 1.00×, the usual cheapest. The part past the tick is how far above the usual cheapest the supplier was paid on average, weighted by what it was paid; the figure after it is what was paid above the usual cheapest in rupees. A bar that stops short of the tick (below 1.00×) means the supplier was paid less than the usual cheapest overall: its purchases under the usual cheapest outweigh the ones above it. That can happen because the usual cheapest is not the lowest price paid.</p>
              <p>A supplier is grouped by its name, so a supplier with an SAP code per region is one bar. The chart shows the suppliers paid the most for products that can be compared, as many as the series has colours; the drawer has the ten largest.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function SuppliersTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const [vendor, setVendor] = useState<PriceVendor | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const pick = (v: PriceVendor) => { setVendor(v); setOpen(true); dr.close(); };
  const all = c.d.vendors || [];
  // Plain words on the face; "price index" is named in the drawer and the method only.
  const title = "Suppliers: price paid vs the usual cheapest";
  return (
    <>
      <ChartPanel id="vendors" title={title} context={c.context} accent={PRODUCT_COL} place={place}
        legend={[{ key: "cheapest", label: "1.00× = the usual cheapest", color: INK, shape: "tick" }]}
        label={[`${title}, ${c.context}`,
          ...all.slice(0, 5).map((v) => `${v.vendor_name}: ${times(v.price_index)}${below(v) ? " (paid less than the usual cheapest overall)" : ""}, ${lakhs(v.extra_paid)} above the usual cheapest on ${lakhs(v.value)} paid`),
          `${plural(c.d.vendors_total, "supplier")} with a purchase compared`].join(". ")}
        interactive onOpen={() => dr.show("vendors")} onInfo={() => dr.show("method")}>
        <RankBars format={(v) => times(v, 1)} color={PRODUCT_COL} onMore={() => dr.show("vendors")} ariaLabel={`${title}, ${c.context}`} empty="No supplier in this selection."
          // One series hue each: as many suppliers as the series has hues; the drawer lists the rest.
          rows={all.slice(0, SERIES.length).map((v) => ({
            key: v.vendor_name, label: v.vendor_name,
            sub: `${plural(v.molecules, "product")} · ${lakhs(v.value)} paid${below(v) ? " · under the usual cheapest overall" : ""}`,
            value: isNum(v.price_index) ? v.price_index : null, valueLabel: times(v.price_index), aside: `${lakhs(v.extra_paid)} above`,
            tick: AT_CHEAPEST, tickLabel: "1.00× = the usual cheapest", color: c.vendorCol(v.vendor_name), onClick: () => pick(v),
          }))} />
      </ChartPanel>
      <SuppliersDrawer c={c} dr={dr} title={title} onVendor={pick} />
      <SlideOver open={open} onClose={close} eyebrow="Supplier"
        title={vendor?.vendor_name ?? ""}
        sub={vendor ? `${plural(vendor.vendor_codes.length, "SAP code")} · its products, each against the usual cheapest in ${c.context}` : undefined}>
        {vendor && <VendorProducts vendor={vendor.vendor_name} plant={c.plant} params={c.params} />}
      </SlideOver>
    </>
  );
}
