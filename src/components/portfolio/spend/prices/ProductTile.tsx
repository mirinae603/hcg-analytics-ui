"use client";
// Spend Analysis (Prices) — the chosen product's prices by supplier: one row per supplier (most
// bought from first), each of its purchases a dot at the unit price paid (a hospital, a brand,
// that supplier, summed over the selected months), its area the units bought, in the supplier's
// colour (the same on the suppliers tile); a dashed line marks the cheapest price paid. Dots at
// one price at several hospitals spread up and down their row. The product is the one picked on
// the scatter or the top list, else the one with the most paid above the cheapest. The drawer
// lists every purchase and every supplier with exact rupees.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { Scatter, type ScatterPoint } from "@/components/portfolio/ledger/scatter";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { Swatch } from "@/components/portfolio/ledger/legend";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { PricePoint, PriceVendor } from "../api";
import { DataTable, type Col } from "../DataTable";
import { plural, priceTick, productName, times, unitPrice } from "../insights";
import { PRODUCT_COL, PRICES_SOURCE, Method, type Chosen, type Ctx } from "./context";

const range = (p: PricePoint) => (p.unit_price_min === p.unit_price_max ? null : `${unitPrice(p.unit_price_min)}–${unitPrice(p.unit_price_max)}`);

function PointsTable({ c, m }: { c: Ctx; m: Chosen }) {
  const cols: Col<PricePoint>[] = [
    { label: "Hospital", align: "left", wrap: true, render: (p) => <span title={p.plant}>{p.plant_name || p.plant}</span> },
    { label: "Brand", align: "left", wrap: true, render: (p) => <span title={`Material ${p.material}`}>{p.material_desc}</span> },
    {
      label: "Supplier", align: "left", wrap: true, render: (p) => (
        <span className="inline-flex items-center gap-1.5"><Swatch color={c.vendorCol(p.vendor_name)} />{p.vendor_name}</span>
      ),
    },
    { label: "Unit price", render: (p) => <b>{unitPrice(p.unit_price)}</b> },
    { label: "Range paid", render: (p) => range(p) ?? "one price" },
    { label: "Units", render: (p) => num(p.qty) },
    { label: "Value", render: (p) => rupeesExact(p.value) },
    { label: "Receipts", render: (p) => num(p.lines) },
  ];
  return (
    <DataTable rows={m.points || []} rowKey={(p) => `${p.plant}|${p.material}|${p.vendor_name}`} cols={cols} strong={(p) => p.unit_price_min === m.cheapest_price}
      caption={`Purchases of ${productName(m)}, cheapest first`} minWidth={980} />
  );
}

function VendorTable({ c, m }: { c: Ctx; m: Chosen }) {
  const cols: Col<PriceVendor>[] = [
    {
      label: "Supplier", align: "left", wrap: true, render: (v) => (
        <span className="inline-flex items-center gap-1.5"><Swatch color={c.vendorCol(v.vendor_name)} />{v.vendor_name}</span>
      ),
    },
    { label: "Paid", render: (v) => rupeesExact(v.value) },
    { label: "At the cheapest", render: (v) => rupeesExact(v.at_cheapest) },
    { label: "Paid above it", render: (v) => <b>{rupeesExact(v.extra_paid)}</b> },
    { label: "Price index", render: (v) => times(v.price_index) },
    { label: "Average price", render: (v) => unitPrice(v.wavg_price) },
    { label: "Units", render: (v) => num(v.qty ?? 0) },
    { label: "Share", render: (v) => pct(v.share_pct, 1) },
    { label: "Hospitals", render: (v) => num(v.plants) },
  ];
  return <DataTable rows={m.by_vendor || []} rowKey={(v) => v.vendor_name} cols={cols} caption={`Suppliers of ${productName(m)}`} minWidth={900} />;
}

function ProductDrawer({ c, dr, m }: { c: Ctx; dr: DrawerCtl; m: Chosen }) {
  const name = productName(m);
  const cheapestAt = m.cheapest_plant ? (m.points || []).find((p) => p.plant === m.cheapest_plant)?.plant_name || m.cheapest_plant : null;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${name} · ${c.where}`}
      kpi={{ value: rupeesExact(m.extra_paid), comparator: `paid above the cheapest (${unitPrice(m.cheapest_price)}), ${pct(m.extra_pct)} of the ${rupeesExact(m.value)} spent, ${c.when}` }}
      source={PRICES_SOURCE} asOf={c.asOf} filters={[...c.chips, { label: "Product", value: name }]}
      tabs={[
        {
          key: "points", label: "Purchases", render: () => (
            <>
              <DrawerSection title="In brief">
                <p className="text-[13.5px] leading-relaxed" style={{ color: INK }}>
                  {name} was bought from {plural(m.vendors, "supplier")} at {plural(m.plants, "hospital")}, as {plural(m.brands, "brand")}, between {unitPrice(m.min_price)} and {unitPrice(m.max_price)} a unit ({times(m.spread_ratio)} the cheapest).
                  {m.cheapest_brand ? ` The cheapest was ${m.cheapest_brand}${m.cheapest_vendor ? ` from ${m.cheapest_vendor}` : ""}${cheapestAt ? ` at ${cheapestAt}` : ""}.` : ""}
                  {` Paid above that price: ${rupeesExact(m.extra_paid)}.`}
                </p>
              </DrawerSection>
              <DrawerSection title="Every purchase, cheapest first" note="One row per hospital, brand and supplier, summed over the selected months: unit price = value ÷ units; the range is the lowest and highest unit price of its receipts. The rows with a receipt at the cheapest price are in bold.">
                <PointsTable c={c} m={m} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "vendors", label: "Suppliers", render: () => (
            <DrawerSection title="Suppliers of this product" note={`${c.w.indexNote} At the cheapest = the same units at ${unitPrice(m.cheapest_price)}. Share = the supplier's part of what was paid for this product.`}>
              <VendorTable c={c} m={m} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>Each row of the chart is a supplier of {name}, most paid first; each dot one hospital&apos;s purchases of one brand from it, at the unit price paid (value ÷ units over the selected months), its area the units bought. The dashed line is the cheapest unit price paid in the selection. Dots at the same price spread up and down their row so each one shows.</p>
              <p>The suppliers take the same colours as on the suppliers tile (the largest suppliers of the selection, in order); one outside them is grey, its row names it.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function ProductTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const m = c.d.molecule;
  if (!m) {
    return (
      <ChartPanel id="product" title="Prices by supplier" context={c.context} accent={PRODUCT_COL} place={place}
        label={`Prices by supplier, ${c.context}. The product picked was not bought in this selection.`}
        interactive onOpen={() => c.onOpen("products")}>
        <div className="flex flex-col items-start gap-2">
          <p className="text-[12px]" style={{ color: SUB }}>{c.d.molecules?.length ? "The product picked was not bought in this selection." : `${c.w.none}.`}</p>
          {c.d.molecules?.length ? <LinkButton onClick={() => c.choose(null)}>Show the product with the most extra paid</LinkButton> : null}
        </div>
      </ChartPanel>
    );
  }
  const name = productName(m);
  const title = `${name}: price by supplier`;
  const points: ScatterPoint[] = (m.points || []).map((p) => ({
    key: `${p.plant}|${p.material}|${p.vendor_name}`, x: p.unit_price, row: p.vendor_name, size: p.qty, series: p.vendor_name,
    label: `${p.plant_name || p.plant} · ${p.material_desc}`,
    detail: `${unitPrice(p.unit_price)} a unit${range(p) ? ` (${range(p)})` : ""} from ${p.vendor_name} · ${num(p.qty)} units · ${lakhs(p.value)}`,
  }));
  const vendors = m.by_vendor || [];
  return (
    <>
      <ChartPanel id="product" title={title} context={`${unitPrice(m.min_price)} to ${unitPrice(m.max_price)} · ${c.context}`} accent={PRODUCT_COL} place={place}
        label={[`${title}, ${c.context}`, `cheapest ${unitPrice(m.cheapest_price)}, dearest ${unitPrice(m.max_price)}, ${times(m.spread_ratio)}`,
          `${lakhs(m.extra_paid)} paid above the cheapest`, ...vendors.map((v) => `${v.vendor_name}: ${lakhs(v.value)} paid, price index ${times(v.price_index)}`)].join(". ")}
        interactive onOpen={() => dr.show("points")} onInfo={() => dr.show("method")}>
        <Scatter points={points} noun="purchases" ariaLabel={`${title}, ${c.context}`} onMore={() => dr.show("vendors")}
          series={vendors.map((v) => ({ key: v.vendor_name, label: v.vendor_name, color: c.vendorCol(v.vendor_name) }))}
          x={{ kind: "linear", label: "Unit price paid", tick: priceTick, floor: 0, refs: [{ value: m.cheapest_price, label: `cheapest ${unitPrice(m.cheapest_price)}` }] }}
          y={{ kind: "band", label: "Supplier", rows: vendors.map((v) => ({ key: v.vendor_name, label: v.vendor_name, color: c.vendorCol(v.vendor_name) })) }}
          sizeLabel="dot area = units" />
      </ChartPanel>
      <ProductDrawer c={c} dr={dr} m={m} />
    </>
  );
}
