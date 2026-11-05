"use client";
// Revenue & margin — by material type (onco drugs, other drugs, consumables): each type's MRP
// as one 100% bar split into the margin and the cost it was taken from, so the margin part,
// from the left, IS the type's margin %; after the bar, the type's revenue and its share of the
// selection's. Read down the rows it says which type earns most on each rupee of MRP; the
// figures after them say how much of the revenue each type is.
//
// Under the Quantity switch the figure after the bar is units sold (a volume view); the bar is a
// split of rupees and stays one. The drawer has every figure in exact rupees and the method.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { StackBars, type StackRow } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct } from "@/components/portfolio/ledger/format";
import {
  ACCENT, COST_COL, MARGIN_COL, RUPEES_ONLY, BlockTable, HowBuilt, MethodText, NoSales, filterChips, sizeOf, sizeShort,
  type RevScope,
} from "./shared";
import type { CategoryRow } from "./api";

/** The material types the selection has sales in (all three, or the one the Material filter picks). */
const typesOf = (s: RevScope): CategoryRow[] => (s.d.by_category ?? []).filter((c) => c.lines > 0);

export function MaterialTile({ s, place }: { s: RevScope; place: Place }) {
  const dr = useDrawer();
  const cats = typesOf(s);
  const rows: StackRow[] = cats.map((c) => ({
    key: c.key, label: c.label,
    values: { margin: c.margin, cost: c.cost },
    // The share is of revenue, so it is printed beside revenue only: beside units it would
    // read as a share of units.
    aside: s.basis === "qty" ? `${sizeShort(sizeOf(c, s.basis), s.basis)} units` : `${lakhs(c.mrp)} · ${pct(c.share_pct, 0)}`,
  }));
  const title = "Margin by material type";
  const label = [
    `${title}, ${s.context}: each type's MRP split into margin and cost`,
    ...cats.map((c) => `${c.label} margin ${pct(c.margin_pct, 1)} of ${lakhs(c.mrp)}, ${pct(c.share_pct, 1)} of revenue`),
  ].join(". ");
  return (
    <>
      <ChartPanel id="material" title={title} context={`${s.context}${s.basis === "qty" ? ` · bars ${RUPEES_ONLY}, units after` : ""}`} accent={ACCENT}
        place={place} label={label} onOpen={() => dr.show("types")} onInfo={() => dr.show("method")}>
        {rows.length ? (
          <StackBars ariaLabel={`${title}, ${s.context}`} rows={rows} format={lakhs} asideWidth={96} labelWidth={110}
            segments={[{ key: "margin", label: "Margin", color: MARGIN_COL }, { key: "cost", label: "Cost", color: COST_COL }]} />
        ) : <NoSales s={s} />}
      </ChartPanel>
      <MaterialDrawer s={s} dr={dr} />
    </>
  );
}

function MaterialDrawer({ s, dr }: { s: RevScope; dr: DrawerCtl }) {
  const h = s.d.headline;
  const cats = s.d.by_category ?? [];
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow="Revenue & margin · Overview" title={`Margin by material type · ${s.where}`}
      kpi={{ value: pct(h.margin_pct), comparator: `margin on ${lakhs(h.mrp)} of revenue` }}
      source="computed" asOf={s.asOf} filters={filterChips(s)}
      tabs={[
        {
          key: "types", label: "By material type", render: () => (
            <DrawerSection title="Onco, non-onco and consumables" note="Exact rupees. Each share is of the selection's revenue (MRP).">
              <BlockTable caption={`Revenue and margin by material type, ${s.context}`}
                rows={cats.map((c) => ({ key: c.key, label: c.label, b: c, share: c.share_pct }))}
                total={{ label: "All materials", b: h }} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Material type is the item&apos;s material category: Onco Drugs, Other Drugs (non-onco) and Consumables. Unlike the Formulary page, which counts drugs only, revenue counts consumables too.</p>
                <p>Each bar is one type&apos;s MRP as a whole (100%), split into its margin and its cost, so the margin part, from the left, is the type&apos;s margin % (margin ÷ MRP, a ratio of its sums). After the bar: the type&apos;s revenue and its share of the selection&apos;s revenue (under the Quantity switch, its units sold).</p>
                <p>Under the Quantity switch the figure after the bar counts units sold; the bar splits rupees whatever the switch says.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}
