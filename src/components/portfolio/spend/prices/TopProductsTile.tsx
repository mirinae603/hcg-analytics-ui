"use client";
// Spend Analysis (Prices) — the products with the most paid above their cheapest price, as bars
// from zero in the products' colour, the cheapest-to-dearest ratio and the number of suppliers
// under each figure. A product's bar shows it in detail (its prices by supplier, on the tile
// below); the chosen one is highlighted. The drawer (shared with the scatter) lists the products
// the chart holds with exact rupees, and opens the Products tab, which has them all.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { DataTable, type Col } from "../DataTable";
import { plural, productName, times, unitPrice } from "../insights";
import { PRODUCT_COL, PRICES_SOURCE, Method, type Ctx, type Product } from "./context";

type Ranked = { n: number; p: Product };

/** The products the overview holds, most paid above the cheapest first, exact rupees; a
 *  product's name shows it in detail. */
export function ProductTable({ c, onPicked }: { c: Ctx; onPicked?: () => void }) {
  const rows = (c.d.molecules || []).map((p, i) => ({ n: i + 1, p }));
  const cols: Col<Ranked>[] = [
    { label: "#", render: (x) => x.n, align: "left" },
    {
      label: "Product", align: "left", wrap: true, render: ({ p }) => (
        <button type="button" onClick={() => { c.choose(p.molecule_key); onPicked?.(); }}
          aria-label={p.molecule_key === c.chosen ? `${productName(p)}, shown in detail` : `Show ${productName(p)} in detail`}
          className="text-left underline decoration-dotted underline-offset-2" style={{ color: INK }}>{productName(p)}</button>
      ),
    },
    { label: "Spent", render: ({ p }) => rupeesExact(p.value) },
    { label: "Paid above the cheapest", render: ({ p }) => <b>{rupeesExact(p.extra_paid)}</b> },
    { label: "% above", render: ({ p }) => pct(p.extra_pct) },
    { label: "Cheapest", render: ({ p }) => unitPrice(p.cheapest_price) },
    { label: "Dearest", render: ({ p }) => unitPrice(p.max_price) },
    { label: "Dearest ÷ cheapest", render: ({ p }) => times(p.spread_ratio) },
    { label: "Price index", render: ({ p }) => times(p.price_index) },
    { label: "Suppliers", render: ({ p }) => num(p.vendors) },
    { label: "Hospitals", render: ({ p }) => num(p.plants) },
    { label: "Brands", render: ({ p }) => num(p.brands) },
  ];
  return (
    <DataTable rows={rows} rowKey={(x) => x.p.molecule_key} cols={cols} strong={(x) => x.p.molecule_key === c.chosen}
      caption="Products by what was paid above their cheapest price" minWidth={1080} empty={`${c.w.none}.`} />
  );
}

/** The drawer of the products tiles: the list, the way to every product, and the method. */
export function ProductsDrawer({ c, dr, title, method }: { c: Ctx; dr: DrawerCtl; title: string; method: React.ReactNode }) {
  const h = c.d.headline;
  const n = (c.d.molecules || []).length;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.extra_paid_vs_cheapest), comparator: `paid above the cheapest across ${plural(h.molecules, "product")}, ${c.when}` }}
      source={PRICES_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "products", label: n > 1 ? `Top ${n}` : "Products", render: () => (
            <>
              <DrawerSection title={n < c.d.molecules_total ? `The ${n} products with the most paid above the cheapest, of ${num(c.d.molecules_total)}` : "Products by what was paid above the cheapest"}
                note={`Click a product to see its prices by supplier on the overview. The Products tab has every one, with its share of the ${rupeesExact(h.extra_paid_vs_cheapest)} paid above the cheapest in this selection.`}>
                <ProductTable c={c} onPicked={dr.close} />
              </DrawerSection>
              <DrawerSection title="Every product" note="The Products tab lists them all: searchable, filtered by category, form and whether it was bought at more than one price, with a Total row and a CSV.">
                <LinkButton onClick={() => { dr.close(); c.onOpen("products"); }}>All products</LinkButton>
              </DrawerSection>
            </>
          ),
        },
        { key: "method", label: "Method", render: () => <Method c={c}>{method}</Method> },
      ]} />
  );
}

export function TopProductsTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const all = c.d.molecules || [];
  const title = "Products with the most extra paid";
  return (
    <>
      <ChartPanel id="top" title={title} context={c.context} accent={PRODUCT_COL} place={place}
        label={[title, c.context, ...all.slice(0, 5).map((p, i) => `${i + 1}. ${productName(p)}: ${lakhs(p.extra_paid)} above the cheapest, dearest ${times(p.spread_ratio)} the cheapest`)].join(". ")}
        interactive onOpen={() => dr.show("products")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={PRODUCT_COL} onMore={() => dr.show("products")} ariaLabel={`${title}, ${c.context}`} empty={`${c.w.none}.`}
          rows={all.map((p) => ({
            key: p.molecule_key, label: productName(p), sub: `${times(p.spread_ratio)} cheapest to dearest · ${plural(p.vendors, "supplier")}`,
            value: p.extra_paid, valueLabel: lakhs(p.extra_paid), aside: `${pct(p.extra_pct, 1)} above`,
            selected: p.molecule_key === c.chosen, onClick: () => c.choose(p.molecule_key),
          }))} />
      </ChartPanel>
      <ProductsDrawer c={c} dr={dr} title={title} method={(
        <>
          <p>{c.w.extraNote}</p>
          <p>Each product&apos;s bar runs from zero on one scale: what was paid above its cheapest unit price in the selection. Under it, how many times its cheapest the dearest price was, and how many suppliers sold it. Click a product to see its prices by supplier.</p>
          <p style={{ color: SUB }}>The chart holds the products with the most paid above the cheapest; the Products tab has every one.</p>
        </>
      )} />
    </>
  );
}
