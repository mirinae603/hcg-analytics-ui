"use client";
// Spend Analysis (Prices) — every product with much paid above its cheapest price, as one dot:
// across, its cheapest unit price; up, how many times that the dearest price was; the dot's area,
// what was spent on it. Both axes are logarithmic (prices run from under a rupee to lakhs, ratios
// from 1× to tens of ×), so the cheap and the dear sit on one chart. Up and to the right is a
// costly product bought at very different prices. A dot shows that product in detail (its prices
// by supplier, below); the chosen one is ringed and named, and the largest few are named too.
// The drawer (shared with the top products tile) lists them with exact rupees.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { Scatter, type ScatterPoint } from "@/components/portfolio/ledger/scatter";
import { useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { plural, priceTick, productName, ratioTick, times, unitPrice } from "../insights";
import { PRODUCT_COL, type Ctx } from "./context";
import { ProductsDrawer } from "./TopProductsTile";

/** How many of the largest products (by extra paid) are named on the chart. */
const TAGGED = 5;
const SERIES_KEY = "products";

export function ScatterTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const all = c.d.molecules || [];
  const title = "Same product, different prices";
  const shown = all.length < c.d.molecules_total ? `the ${num(all.length)} with the most extra paid, of ${num(c.d.molecules_total)}` : plural(all.length, "product");
  const points: ScatterPoint[] = all.map((p, i) => ({
    key: p.molecule_key, x: p.cheapest_price, y: p.spread_ratio, size: p.value, series: SERIES_KEY,
    label: productName(p),
    detail: `cheapest ${unitPrice(p.cheapest_price)}, dearest ${unitPrice(p.max_price)} (${times(p.spread_ratio)}) · ${lakhs(p.extra_paid)} paid above the cheapest · ${lakhs(p.value)} spent · ${plural(p.vendors, "supplier")}, ${plural(p.plants, "hospital")}`,
    tag: i < TAGGED, selected: p.molecule_key === c.chosen, onClick: () => c.choose(p.molecule_key),
  }));
  return (
    <>
      <ChartPanel id="scatter" title={title} context={`${c.where} · ${shown}`} accent={PRODUCT_COL} place={place}
        label={[`${title}: products by cheapest unit price and how many times that the dearest was, ${c.context}`, shown,
          ...all.slice(0, 3).map((p) => `${productName(p)}: ${unitPrice(p.cheapest_price)} to ${unitPrice(p.max_price)}`)].join(". ")}
        interactive onOpen={() => dr.show("products")} onInfo={() => dr.show("method")}>
        <Scatter points={points} noun="products" ariaLabel={`${title}, ${c.context}`} empty={`${c.w.none}.`}
          series={[{ key: SERIES_KEY, label: "Products", color: PRODUCT_COL }]}
          x={{ kind: "log", label: "Cheapest unit price", tick: priceTick }}
          y={{ kind: "log", label: "Dearest ÷ cheapest", tick: ratioTick, floor: 1 }}
          sizeLabel="dot area = spend" />
      </ChartPanel>
      <ProductsDrawer c={c} dr={dr} title={title} method={(
        <>
          <p>Each dot is a product: across, its cheapest unit price in the selection; up, its dearest unit price ÷ its cheapest; its area, what was spent on it. Both axes are logarithmic, so equal steps are equal ratios (₹10 to ₹100 as far as ₹1K to ₹10K; 1× to 2× as far as 2× to 4×).</p>
          <p>A dot high up was bought at very different prices; a large one far right is a costly product. The chart holds the products with the most paid above their cheapest price (the Products tab has every one). The largest few are named, the chosen one ringed; click a dot to see that product&apos;s prices by supplier.</p>
          <p>{c.w.extraNote}</p>
        </>
      )} />
    </>
  );
}
