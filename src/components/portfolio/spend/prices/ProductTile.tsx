"use client";
// Spend Analysis (Prices) — the chosen product's prices by supplier: one row per supplier (most
// bought from first), each of its purchases a dot at the unit price paid (a hospital, a brand,
// that supplier, summed over the selected months), its area the units bought, in the supplier's
// colour (the same on the suppliers tile); a dashed line marks the usual cheapest price (not the
// lowest paid: one odd cheap purchase cannot set it). A dot holding a receipt priced unusually
// low, far under that line, is drawn in the "to check" ink instead of its supplier's colour,
// named beside it and keyed in the legend; the dot stays at its own average price, which the
// other receipts can lift well above the threshold. Dots at one price at several hospitals spread up and down their
// row. The product is the one picked on the scatter or the top list, else the one with the most
// paid above the usual cheapest. The drawer lists every purchase (the ones that set the usual
// cheapest in bold) and every supplier with exact rupees.
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
import { CHECK_COL, PRODUCT_COL, PRICES_SOURCE, Method, type Chosen, type Ctx } from "./context";

const range = (p: PricePoint) => (p.unit_price_min === p.unit_price_max ? null : `${unitPrice(p.unit_price_min)}–${unitPrice(p.unit_price_max)}`);

/** The series the unusually low purchases are drawn in, apart from every supplier's. */
const LOW_SERIES = "__to_check__";
const pointKey = (p: PricePoint) => `${p.plant}|${p.material}|${p.vendor_name}`;

function PointsTable({ c, m }: { c: Ctx; m: Chosen }) {
  const cols: Col<PricePoint>[] = [
    { label: "Hospital", align: "left", wrap: true, render: (p) => <span title={p.plant}>{p.plant_name || p.plant}</span>, raw: (p) => p.plant_name || p.plant },
    // HCG keys a brand by its material code: the code and the name each in a column of its own.
    { label: "Material code", align: "left", render: (p) => p.material },
    { label: "Brand", align: "left", wrap: true, render: (p) => p.material_desc },
    {
      label: "Supplier", align: "left", wrap: true, render: (p) => (
        <span className="inline-flex items-center gap-1.5"><Swatch color={c.vendorCol(p.vendor_name)} />{p.vendor_name}</span>
      ),
      raw: (p) => p.vendor_name,
    },
    {
      label: "Unit price", render: (p) => (
        <span className="inline-flex items-center justify-end gap-1.5">
          {p.unusually_low && (
            <span className="text-[10px] font-semibold uppercase whitespace-nowrap" style={{ color: CHECK_COL, letterSpacing: ".06em" }}
              title={c.checkLabel}>to check</span>
          )}
          <b>{unitPrice(p.unit_price)}</b>
        </span>
      ),
      raw: (p) => p.unit_price, unit: "₹",
    },
    // In the CSV the two ends as plain figures ("1180.5–1420"), so a spreadsheet can split them.
    { label: "Range paid", render: (p) => range(p) ?? "one price", raw: (p) => (p.unit_price_min === p.unit_price_max ? "one price" : `${p.unit_price_min}–${p.unit_price_max}`), unit: "₹" },
    { label: "Units", render: (p) => num(p.qty), raw: (p) => p.qty },
    { label: "Value", render: (p) => rupeesExact(p.value), raw: (p) => p.value, unit: "₹" },
    { label: "Receipts", render: (p) => num(p.lines), raw: (p) => p.lines },
  ];
  return (
    <DataTable context={c.context} rows={m.points || []} rowKey={pointKey} cols={cols} strong={(p) => p.sets_cheapest}
      caption={`Purchases of ${productName(m)}, cheapest first`} minWidth={1080} />
  );
}

function VendorTable({ c, m }: { c: Ctx; m: Chosen }) {
  const cols: Col<PriceVendor>[] = [
    {
      label: "Supplier", align: "left", wrap: true, render: (v) => (
        <span className="inline-flex items-center gap-1.5"><Swatch color={c.vendorCol(v.vendor_name)} />{v.vendor_name}</span>
      ),
      raw: (v) => v.vendor_name,
    },
    { label: "Paid", render: (v) => rupeesExact(v.value), raw: (v) => v.value, unit: "₹" },
    { label: "At the usual cheapest", render: (v) => rupeesExact(v.at_cheapest), raw: (v) => v.at_cheapest, unit: "₹" },
    { label: "Paid above it", render: (v) => <b>{rupeesExact(v.extra_paid)}</b>, raw: (v) => v.extra_paid, unit: "₹" },
    { label: "Price index", render: (v) => times(v.price_index), raw: (v) => v.price_index },
    { label: "Average price", render: (v) => unitPrice(v.wavg_price), raw: (v) => v.wavg_price, unit: "₹" },
    { label: "Units", render: (v) => num(v.qty ?? 0), raw: (v) => v.qty ?? 0 },
    { label: "Share", render: (v) => pct(v.share_pct, 1), raw: (v) => v.share_pct, unit: "%" },
    { label: "Hospitals", render: (v) => num(v.plants), raw: (v) => v.plants },
  ];
  return <DataTable context={c.context} rows={m.by_vendor || []} rowKey={(v) => v.vendor_name} cols={cols} strong={(v) => !!v.sets_cheapest} caption={`Suppliers of ${productName(m)}`} minWidth={900} />;
}

function ProductDrawer({ c, dr, m }: { c: Ctx; dr: DrawerCtl; m: Chosen }) {
  const name = productName(m);
  const low = (m.points || []).filter((p) => p.unusually_low).length;
  const cheapestAt = m.cheapest_plant ? (m.points || []).find((p) => p.plant === m.cheapest_plant)?.plant_name || m.cheapest_plant : null;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${name} · ${c.where}`}
      kpi={{ value: rupeesExact(m.extra_paid), comparator: `paid above the usual cheapest (${unitPrice(m.cheapest_price)}), ${pct(m.extra_pct)} of the ${rupeesExact(m.value)} spent, ${c.when}` }}
      source={PRICES_SOURCE} asOf={c.asOf} filters={[...c.chips, { label: "Product", value: name }]}
      tabs={[
        {
          key: "points", label: "Purchases", render: () => (
            <>
              <DrawerSection title="In brief">
                <p className="text-[13.5px] leading-relaxed" style={{ color: INK }}>
                  {name} was bought from {plural(m.vendors, "supplier")} at {plural(m.plants, "hospital")}, as {plural(m.brands, "brand")}, between {unitPrice(m.min_price)} and {unitPrice(m.max_price)} a unit.
                  {` Its usual cheapest is ${unitPrice(m.cheapest_price)}`}{m.cheapest_brand ? `, set by ${m.cheapest_brand}${m.cheapest_vendor ? ` from ${m.cheapest_vendor}` : ""}${cheapestAt ? ` at ${cheapestAt}` : ""}` : ""}{`; the dearest was ${times(m.spread_ratio)} that.`}
                  {` Paid above the usual cheapest: ${rupeesExact(m.extra_paid)}.`}
                  {low > 0 ? ` ${plural(low, "purchase holds", "purchases hold")} a receipt ${c.low ? `under ${c.low}` : "priced unusually low"}: marked "to check".` : ""}
                </p>
              </DrawerSection>
              <DrawerSection title="Every purchase, cheapest first" note={`One row per hospital, brand and supplier, summed over the selected months: unit price = value ÷ units; the range is the lowest and highest unit price of its receipts. The rows that set the usual cheapest (a receipt priced at it) are in bold; "to check" marks a row with a receipt ${c.low ? `under ${c.low}` : "priced unusually low"}, whatever the row's own unit price, so one row can be both.`}>
                <PointsTable c={c} m={m} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "vendors", label: "Suppliers", render: () => (
            <DrawerSection title="Suppliers of this product" note={`${c.w.indexNote} At the usual cheapest = the same units at ${unitPrice(m.cheapest_price)}. Share = the supplier's part of what was paid for this product. The supplier that set the usual cheapest is in bold.`}>
              <VendorTable c={c} m={m} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>Each row of the chart is a supplier of {name}, most paid first; each dot one hospital&apos;s purchases of one brand from it, at the unit price paid (value ÷ units over the selected months), its area the units bought. The dashed line is the usual cheapest unit price of the selection ({unitPrice(m.cheapest_price)}), not the lowest price paid ({unitPrice(m.min_price)}). Dots at the same price spread up and down their row so each one shows.</p>
              <p>The suppliers take the same colours as on the suppliers tile (the largest suppliers of the selection, in order); one outside them is grey, its row names it. A dot holding a receipt {c.low ? `under ${c.low}` : "priced unusually low"} is drawn in ink instead of its supplier&apos;s colour and named beside it, to check (the headline&apos;s To check tab lists every one). The dot stays at its own average unit price, so when its other receipts were dearer it can sit well above that threshold, even above the usual cheapest line.</p>
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
  // A purchase holding an unusually low receipt keeps its supplier's row but takes the "to
  // check" series (its own colour, keyed in the legend) and is named beside its dot.
  const points: ScatterPoint[] = (m.points || []).map((p) => ({
    key: pointKey(p), x: p.unit_price, row: p.vendor_name, size: p.qty,
    series: p.unusually_low ? LOW_SERIES : p.vendor_name, tag: p.unusually_low,
    label: `${p.plant_name || p.plant} · ${p.material_desc}`,
    detail: `${unitPrice(p.unit_price)} a unit${range(p) ? ` (${range(p)})` : ""} from ${p.vendor_name} · ${num(p.qty)} units · ${lakhs(p.value)}${p.unusually_low ? ` · ${c.checkLabel.toLowerCase()}` : ""}`,
  }));
  const low = points.filter((p) => p.series === LOW_SERIES).length;
  const vendors = m.by_vendor || [];
  const refLabel = `usual cheapest ${unitPrice(m.cheapest_price)}`;
  return (
    <>
      <ChartPanel id="product" title={title} context={`${unitPrice(m.min_price)} to ${unitPrice(m.max_price)} · ${c.context}`} accent={PRODUCT_COL} place={place}
        legend={low > 0 ? [{ key: "check", label: c.checkLabel, color: CHECK_COL, shape: "dot" }] : undefined}
        label={[`${title}, ${c.context}`, `usual cheapest ${unitPrice(m.cheapest_price)}, dearest ${unitPrice(m.max_price)}, ${times(m.spread_ratio)} the usual cheapest`,
          `${lakhs(m.extra_paid)} paid above the usual cheapest`, ...vendors.map((v) => `${v.vendor_name}: ${lakhs(v.value)} paid, price index ${times(v.price_index)}`),
          low > 0 ? `${plural(low, "purchase")} marked: ${c.checkLabel.toLowerCase()}` : null].filter(Boolean).join(". ")}
        interactive onOpen={() => dr.show("points")} onInfo={() => dr.show("method")}>
        <Scatter points={points} noun="purchases" ariaLabel={`${title}, ${c.context}`} onMore={() => dr.show("vendors")}
          series={[...vendors.map((v) => ({ key: v.vendor_name, label: v.vendor_name, color: c.vendorCol(v.vendor_name) })),
            { key: LOW_SERIES, label: c.checkLabel, color: CHECK_COL }]}
          x={{ kind: "linear", label: "Unit price paid", tick: priceTick, floor: 0, refs: [{ value: m.cheapest_price, label: refLabel }] }}
          y={{ kind: "band", label: "Supplier", rows: vendors.map((v) => ({ key: v.vendor_name, label: v.vendor_name, color: c.vendorCol(v.vendor_name) })) }}
          sizeLabel="dot area = units" />
      </ChartPanel>
      <ProductDrawer c={c} dr={dr} m={m} />
    </>
  );
}
