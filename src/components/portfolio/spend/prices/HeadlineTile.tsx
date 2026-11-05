"use client";
// Spend Analysis (Prices) — the headline tile: how many products were bought above their usual
// cheapest price, and what was paid above it, as its share of what was paid for the products
// compared (the rest of the bar is what was paid up to the usual cheapest). With one hospital, the
// usual cheapest is that hospital's own; a line under the bar sets it against the usual cheapest
// of every hospital's purchases together. When some purchases were priced unusually low (far
// under the usual cheapest), one more line says how many, to check. The drawer has the written
// summary, the exact figures, the purchases to check (the furthest under; the section's To check
// tab pages through every one, with a CSV), what could not be compared and why, and the method. The tile's last line states the usual cheapest's rule in short, so the benchmark
// every figure on the page rests on is read on screen, not only in a Method tab.
import React from "react";
import { TbReceipt2 } from "react-icons/tb";
import { ChartPanel, LinkButton, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { PartBar } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { Swatch } from "@/components/portfolio/ledger/legend";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { LowPriceItem, NotCompared } from "../api";
import { DataTable, type Col } from "../DataTable";
import { plural, productName, unitPrice, usualCheapestShort } from "../insights";
import { CHECK_COL, EXTRA_COL, PRODUCT_COL, PRICES_SOURCE, Method, type Ctx } from "./context";

/** "3 purchases under half the usual cheapest" (the API's ratio; "unusually low" without it). */
const lowWords = (c: Ctx, n: number) => `${plural(n, "purchase")} ${c.low ? `under ${c.low}` : "priced unusually low"}`;

/** The tile's figures in sentences, for the drawer's "In brief". */
function brief(c: Ctx): string[] {
  const h = c.d.headline;
  if (!h.molecules) return [`${c.w.none} at ${c.where}, ${c.when}.`];
  return [
    `At ${c.where}, ${c.when}, the group bought ${rupeesExact(h.value)} of drugs from ${plural(h.vendors, "supplier")}${c.network ? ` for ${plural(h.hospitals, "hospital")}` : ""}. ${rupeesExact(h.compared_value)} of it (${pct(h.compared_pct)}) is ${plural(h.molecules, "product")} whose unit prices can be compared.`,
    `${plural(h.molecules_with_spread, "product was", "products were")} bought above the usual cheapest price.`,
    `Against each product's usual cheapest unit price${c.network ? " across the hospitals" : ` at ${c.where}`} in the selection, ${rupeesExact(h.extra_paid_vs_cheapest)} was paid above it: ${pct(h.extra_pct)} of what the products compared cost.`,
    ...(isNum(h.extra_paid_vs_network_cheapest) ? [`Against the usual cheapest of every hospital's purchases together, ${c.where} paid ${rupeesExact(h.extra_paid_vs_network_cheapest)} above it.`] : []),
    ...(c.d.low_prices?.rows ? [`${lowWords(c, c.d.low_prices.rows)} cost ${rupeesExact(c.d.low_prices.value)}: they are listed to check (the To check tab).`] : []),
  ];
}

function figures(c: Ctx): KeyFigure[] {
  const h = c.d.headline;
  return [
    { label: c.w.extra, value: rupeesExact(h.extra_paid_vs_cheapest), color: EXTRA_COL, note: `${pct(h.extra_pct)} of the value compared` },
    ...(isNum(h.extra_paid_vs_network_cheapest) ? [{ label: "Above all hospitals' usual cheapest", value: rupeesExact(h.extra_paid_vs_network_cheapest), note: "this hospital's row of the hospital ranking" }] : []),
    { label: "Value compared", value: rupeesExact(h.compared_value), note: `${pct(h.compared_pct)} of the value bought` },
    { label: "Value bought", value: rupeesExact(h.value), note: "every receipt in the selection, compared or not" },
    { label: "Products compared", value: num(h.molecules), color: PRODUCT_COL, note: "molecule, strength, form and kind" },
    { label: "Bought above the usual cheapest", value: num(h.molecules_with_spread), note: `products whose dearest price is above their usual cheapest ${c.spread}` },
    { label: "To check", value: num(c.d.low_prices?.rows ?? 0), color: CHECK_COL, note: c.d.low_prices?.rows ? `${lowWords(c, c.d.low_prices.rows)}, ${rupeesExact(c.d.low_prices.value)} paid` : "no purchase priced unusually low" },
    { label: "Brands · suppliers · hospitals", value: `${num(h.brands)} · ${num(h.vendors)} · ${num(h.hospitals)}`, note: "with any purchase in the selection" },
    { label: "Receipts", value: num(h.lines), note: "GRN lines in the selection" },
  ];
}

/** The purchases to check, furthest under the usual cheapest first; a product's name shows it
 *  in detail on the overview (its dot is marked on the prices-by-supplier chart). */
function CheckTable({ c, onPicked }: { c: Ctx; onPicked: () => void }) {
  const cols: Col<LowPriceItem>[] = [
    {
      label: "Product", align: "left", wrap: true, render: (r) => (
        <button type="button" onClick={() => { c.choose(r.molecule_key); onPicked(); }}
          aria-label={r.molecule_key === c.chosen ? `${productName(r)}, shown in detail` : `Show ${productName(r)} in detail`}
          className="text-left underline decoration-dotted underline-offset-2" style={{ color: INK }}>{productName(r)}</button>
      ),
      raw: (r) => productName(r),
    },
    { label: "Hospital", align: "left", wrap: true, render: (r) => <span title={r.plant}>{r.plant_name || r.plant}</span>, raw: (r) => r.plant_name || r.plant },
    // HCG keys a brand by its material code: the code and the name each in a column of its own.
    { label: "Material code", align: "left", render: (r) => r.material },
    { label: "Brand", align: "left", wrap: true, render: (r) => r.material_desc },
    {
      label: "Supplier", align: "left", wrap: true, render: (r) => (
        <span className="inline-flex items-center gap-1.5"><Swatch color={c.vendorCol(r.vendor_name)} />{r.vendor_name}</span>
      ),
      raw: (r) => r.vendor_name,
    },
    { label: "Price paid", render: (r) => <b>{unitPrice(r.unit_price)}</b>, raw: (r) => r.unit_price, unit: "₹" },
    { label: "Usual cheapest", render: (r) => unitPrice(r.cheapest_price), raw: (r) => r.cheapest_price, unit: "₹" },
    { label: "Units", render: (r) => num(r.qty), raw: (r) => r.qty },
    { label: "Below the usual cheapest", render: (r) => rupeesExact(r.below_cheapest), raw: (r) => r.below_cheapest, unit: "₹" },
  ];
  return (
    <DataTable context={c.context} rows={c.d.low_prices?.items || []} rowKey={(r) => `${r.molecule_key}|${r.plant}|${r.material}|${r.vendor_name}`} cols={cols}
      caption={`Purchases ${c.low ? `under ${c.low}` : "priced unusually low"}, furthest under first`} minWidth={1180}
      empty={`No purchase in this selection was priced ${c.low ? `under ${c.low}` : "unusually low"}.`} />
  );
}

/** The To check tab's heading: how many, of how many products, what they cost, and how many the
 *  table holds when the API sends only the furthest under (the section's To check tab has all). */
function checkHead(c: Ctx): { title: string; note: string } {
  const lp = c.d.low_prices;
  if (!lp?.rows) return { title: "Purchases to check", note: c.w.checkNote };
  const shown = lp.items.length < lp.rows ? ` The ${num(lp.items.length)} furthest under it are listed here; the To check tab lists all ${num(lp.rows)}, with a CSV.` : "";
  return {
    title: `${lowWords(c, lp.rows)}, of ${plural(lp.products, "product")}`,
    note: `${rupeesExact(lp.value)} was paid for them. Below the usual cheapest = the same units at the usual cheapest − what was paid.${shown} ${c.w.checkNote}`,
  };
}

const NOT_COMPARED_COLS: Col<NotCompared>[] = [
  { label: "Why", align: "left", wrap: true, render: (r) => r.label },
  { label: "Receipts", render: (r) => num(r.lines), raw: (r) => r.lines },
  { label: "Value", render: (r) => rupeesExact(r.value), raw: (r) => r.value, unit: "₹" },
];

function HeadlineDrawer({ c, dr }: { c: Ctx; dr: DrawerCtl }) {
  const h = c.d.headline;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${c.w.extra} · ${c.where}`}
      kpi={{ value: rupeesExact(h.extra_paid_vs_cheapest), comparator: h.molecules ? `${pct(h.extra_pct)} of the ${rupeesExact(h.compared_value)} paid for the products compared, ${c.when}` : c.w.none }}
      source={PRICES_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title="In brief">
                <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
                  {brief(c).map((t) => <p key={t}>{t}</p>)}
                </div>
              </DrawerSection>
              <DrawerSection title="Key figures" note="Exact rupees for the selection.">
                <KeyFigures figures={figures(c)} />
              </DrawerSection>
              <DrawerSection title="Behind the figures">
                <LinkButton onClick={() => { dr.close(); c.onOpen("products"); }}>Every product</LinkButton>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "check", label: "To check", render: () => {
            const head = checkHead(c);
            return (
              <>
                <DrawerSection title={head.title} note={head.note}>
                  <CheckTable c={c} onPicked={dr.close} />
                </DrawerSection>
                {c.d.low_prices?.rows ? (
                  <DrawerSection title="Every purchase to check">
                    <LinkButton onClick={() => { dr.close(); c.onOpen("check"); }}>The To check tab: every one, searchable, with a CSV</LinkButton>
                  </DrawerSection>
                ) : null}
              </>
            );
          },
        },
        {
          key: "excluded", label: "Not compared", render: () => (
            <DrawerSection title="Purchases that could not be compared"
              note="Counted in the value bought, left out of the comparison: a unit price can only be set against the same product's.">
              <DataTable context={c.context} rows={c.d.not_compared || []} rowKey={(r) => r.reason} cols={NOT_COMPARED_COLS} caption="Purchases not compared, by reason" empty="Every purchase in this selection was compared." />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.extraNote}</p>
              <p>On the chart the whole bar is what was paid for the products compared; the coloured part is the share paid above the usual cheapest, as the API sends it, and the rest what was paid up to the usual cheapest (every purchase's value, less what it paid above it). A product counts as bought above the usual cheapest when its dearest unit price is above its usual cheapest {c.spread} (prices a hair apart count as one price).</p>
              {!c.network && <p>With one hospital selected, the usual cheapest is that hospital&apos;s own; the line under the bar sets its purchases against the usual cheapest of every hospital&apos;s purchases together.</p>}
              <p>To check: each hospital, brand and supplier whose purchases of a product were {c.low ? `under ${c.low}` : "priced unusually low"}, counted once over the selected months. {c.w.checkNote}</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function HeadlineTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const title = c.w.extra;
  const words = `${num(h.molecules_with_spread)} of ${plural(h.molecules, "product")} bought above the usual cheapest`;
  const low = c.d.low_prices;
  return (
    <>
      <ChartPanel id="headline" title={title} context={c.context} icon={TbReceipt2} place={place}
        label={h.molecules ? [
          `${title}, ${c.context}`, words,
          `${lakhs(h.extra_paid_vs_cheapest)} paid above the usual cheapest price, ${pct(h.extra_pct)} of the ${lakhs(h.compared_value)} paid for the products compared`,
          isNum(h.extra_paid_vs_network_cheapest) ? `${lakhs(h.extra_paid_vs_network_cheapest)} above the usual cheapest of all hospitals` : null,
          low?.rows ? `${lowWords(c, low.rows)}, ${lakhs(low.value)}, to check` : null,
        ].filter(Boolean).join(". ") : `${title}, ${c.context}. ${c.w.none}`}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        {h.molecules ? (
          <div className="flex flex-col h-full">
            <p className="flex-shrink-0 text-[12px] leading-snug pb-1" style={{ color: SUB }}>
              <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" aria-hidden="true" style={{ background: PRODUCT_COL }} />
              <b className="tabular-nums" style={{ color: INK }}>{num(h.molecules_with_spread)}</b> of {plural(h.molecules, "product")} bought above the usual cheapest;
              {" "}<b className="tabular-nums" style={{ color: INK }}>{lakhs(h.extra_paid_vs_cheapest)}</b> paid above it
            </p>
            <PanelPart className="flex flex-col justify-center">
              <PartBar whole={`${lakhs(h.compared_value)} paid for the products compared`} ariaLabel={`${title}, ${c.context}`}
                parts={[{ key: "extra", label: "Above the usual cheapest", share: h.extra_pct, valueLabel: lakhs(h.extra_paid_vs_cheapest), color: EXTRA_COL }]} />
            </PanelPart>
            {isNum(h.extra_paid_vs_network_cheapest) && (
              <p className="flex-shrink-0 truncate text-[11.5px] pt-1 tabular-nums" style={{ color: SUB }}>
                Above all hospitals&apos; usual cheapest <b style={{ color: INK }}>{lakhs(h.extra_paid_vs_network_cheapest)}</b>
              </p>
            )}
            {low?.rows ? (
              <p className="flex-shrink-0 truncate text-[11.5px] pt-1 tabular-nums" style={{ color: SUB }} title={`${lowWords(c, low.rows)}: ${lakhs(low.value)}, to check`}>
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" aria-hidden="true" style={{ background: CHECK_COL }} />
                <b style={{ color: INK }}>{num(low.rows)}</b> {low.rows === 1 ? "purchase" : "purchases"} {c.low ? `under ${c.low}` : "priced unusually low"} · <b style={{ color: INK }}>{lakhs(low.value)}</b>, to check
              </p>
            ) : null}
            <p className="flex-shrink-0 truncate text-[11px] pt-1" style={{ color: SUB }} title={c.rule}>{usualCheapestShort(c.d.rule)}</p>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>{c.w.none}.</p>
        )}
      </ChartPanel>
      <HeadlineDrawer c={c} dr={dr} />
    </>
  );
}
