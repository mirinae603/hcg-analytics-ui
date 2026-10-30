"use client";
// Spend Analysis (Prices) — the headline tile: how many products were bought at more than one
// price, and what was paid above the cheapest price, as its share of what was paid for the
// products compared (the rest of the bar is the same units at the cheapest). With one hospital,
// the cheapest is that hospital's own; the line under the bar sets it against the cheapest price
// any hospital paid. The drawer has the written summary, the exact figures, what could not be
// compared and why, and the method.
import React from "react";
import { ChartPanel, LinkButton, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { PartBar } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { NotCompared } from "../api";
import { DataTable, type Col } from "../DataTable";
import { plural } from "../insights";
import { EXTRA_COL, PRODUCT_COL, PRICES_SOURCE, Method, type Ctx } from "./context";

/** The tile's figures in sentences, for the drawer's "In brief". */
function brief(c: Ctx): string[] {
  const h = c.d.headline;
  if (!h.molecules) return [`${c.w.none} at ${c.where}, ${c.when}.`];
  return [
    `At ${c.where}, ${c.when}, HCG bought ${rupeesExact(h.value)} of drugs from ${plural(h.vendors, "supplier")}${c.network ? ` for ${plural(h.hospitals, "hospital")}` : ""}. ${rupeesExact(h.compared_value)} of it (${pct(h.compared_pct)}) is ${plural(h.molecules, "product")} whose unit prices can be compared.`,
    `${plural(h.molecules_with_spread, "product was", "products were")} bought at more than one price.`,
    `Against the cheapest unit price paid${c.network ? " anywhere" : ` at ${c.where}`} in the selection, ${rupeesExact(h.extra_paid_vs_cheapest)} was paid above it: ${pct(h.extra_pct)} of what the products compared cost.`,
    ...(isNum(h.extra_paid_vs_network_cheapest) ? [`Against the cheapest price any hospital paid, ${c.where} paid ${rupeesExact(h.extra_paid_vs_network_cheapest)} above it.`] : []),
  ];
}

function figures(c: Ctx): KeyFigure[] {
  const h = c.d.headline;
  return [
    { label: c.w.extra, value: rupeesExact(h.extra_paid_vs_cheapest), color: EXTRA_COL, note: `${pct(h.extra_pct)} of the value compared` },
    ...(isNum(h.extra_paid_vs_network_cheapest) ? [{ label: "Above the cheapest any hospital paid", value: rupeesExact(h.extra_paid_vs_network_cheapest), note: "this hospital's row of the hospital ranking" }] : []),
    { label: "Value compared", value: rupeesExact(h.compared_value), note: `${pct(h.compared_pct)} of the value bought` },
    { label: "Value bought", value: rupeesExact(h.value), note: "every receipt in the selection, compared or not" },
    { label: "Products compared", value: num(h.molecules), color: PRODUCT_COL, note: "molecule, strength, form and kind" },
    { label: "Bought at more than one price", value: num(h.molecules_with_spread), note: "its dearest price above its cheapest" },
    { label: "Brands · suppliers · hospitals", value: `${num(h.brands)} · ${num(h.vendors)} · ${num(h.hospitals)}`, note: "with any purchase in the selection" },
    { label: "Receipts", value: num(h.lines), note: "GRN lines in the selection" },
  ];
}

const NOT_COMPARED_COLS: Col<NotCompared>[] = [
  { label: "Why", align: "left", wrap: true, render: (r) => r.label },
  { label: "Receipts", render: (r) => num(r.lines) },
  { label: "Value", render: (r) => rupeesExact(r.value) },
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
          key: "excluded", label: "Not compared", render: () => (
            <DrawerSection title="Purchases that could not be compared"
              note="Counted in the value bought, left out of the comparison: a unit price can only be set against the same product's.">
              <DataTable rows={c.d.not_compared || []} rowKey={(r) => r.reason} cols={NOT_COMPARED_COLS} caption="Purchases not compared, by reason" empty="Every purchase in this selection was compared." />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.extraNote}</p>
              <p>On the chart the whole bar is what was paid for the products compared; the coloured part is the share paid above the cheapest, as the API sends it, and the rest the same units at the cheapest price. A product counts as bought at more than one price when its dearest unit price is above its cheapest by more than the purchase build&apos;s threshold (prices a hair apart count as one price).</p>
              {!c.network && <p>With one hospital selected, the cheapest is that hospital&apos;s own; the line under the bar sets its purchases against the cheapest price any hospital paid.</p>}
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
  const words = `${num(h.molecules_with_spread)} of ${plural(h.molecules, "product")} bought at more than one price`;
  return (
    <>
      <ChartPanel id="headline" title={title} context={c.context} accent={PRODUCT_COL} place={place}
        label={h.molecules ? [
          `${title}, ${c.context}`, words,
          `${lakhs(h.extra_paid_vs_cheapest)} paid above the cheapest price, ${pct(h.extra_pct)} of the ${lakhs(h.compared_value)} paid for the products compared`,
          isNum(h.extra_paid_vs_network_cheapest) ? `${lakhs(h.extra_paid_vs_network_cheapest)} above the cheapest any hospital paid` : null,
        ].filter(Boolean).join(". ") : `${title}, ${c.context}. ${c.w.none}`}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        {h.molecules ? (
          <div className="flex flex-col h-full">
            <p className="flex-shrink-0 text-[12px] leading-snug pb-1" style={{ color: SUB }}>
              <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" aria-hidden="true" style={{ background: PRODUCT_COL }} />
              <b className="tabular-nums" style={{ color: INK }}>{num(h.molecules_with_spread)}</b> of {plural(h.molecules, "product")} bought at more than one price;
              {" "}<b className="tabular-nums" style={{ color: INK }}>{lakhs(h.extra_paid_vs_cheapest)}</b> paid above the cheapest
            </p>
            <PanelPart className="flex flex-col justify-center">
              <PartBar whole={`${lakhs(h.compared_value)} paid for the products compared`} ariaLabel={`${title}, ${c.context}`}
                parts={[{ key: "extra", label: "Above the cheapest", share: h.extra_pct, valueLabel: lakhs(h.extra_paid_vs_cheapest), color: EXTRA_COL }]} />
            </PanelPart>
            {isNum(h.extra_paid_vs_network_cheapest) && (
              <p className="flex-shrink-0 truncate text-[11.5px] pt-1 tabular-nums" style={{ color: SUB }}>
                Above the cheapest any hospital paid <b style={{ color: INK }}>{lakhs(h.extra_paid_vs_network_cheapest)}</b>
              </p>
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>{c.w.none}.</p>
        )}
      </ChartPanel>
      <HeadlineDrawer c={c} dr={dr} />
    </>
  );
}
