"use client";
// Spend Analysis (Prices) — what was paid above the cheapest price, month by month, each month
// set against its own cheapest (so a month's figure is the build report's for that month), with
// that as a % of what the products compared cost as a line riding the bar tops. Every purchase
// month is drawn; the Month filter only shades its months. The drawer has the month table.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { MonthCombo, type ComboMonth, type ComboSeries } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { PriceMonthRow } from "../api";
import { MonthTable, type MonthCol } from "../Trend";
import { PRODUCT_COL, RATE_COL, PRICES_SOURCE, Method, type Ctx } from "./context";

const SERIES: ComboSeries[] = [{ key: "extra", label: "Paid above the cheapest", color: PRODUCT_COL }];
const PCT_LINE = { label: "% above", color: RATE_COL, decimals: 1 };

/** Every purchase month; a month with nothing compared has no bar (rather than a bar at zero). */
function comboMonths(c: Ctx): ComboMonth[] {
  const sel = new Set(c.d.scope?.months || []);
  return (c.d.by_month || []).map((r) => ({
    key: r.period, label: r.label, selected: sel.has(r.period), pct: r.extra_pct,
    values: { extra: r.lines > 0 ? r.extra_paid : null },
  }));
}

const TABLE_COLS: MonthCol<PriceMonthRow>[] = [
  { label: "Bought", render: (r) => rupeesExact(r.value) },
  { label: "Compared", render: (r) => rupeesExact(r.compared_value) },
  { label: "Paid above the cheapest", render: (r) => <b>{rupeesExact(r.extra_paid)}</b> },
  { label: "% above", render: (r) => pct(r.extra_pct) },
  { label: "Products", render: (r) => num(r.molecules) },
  { label: "At more than one price", render: (r) => num(r.molecules_with_spread) },
  { label: "Receipts", render: (r) => num(r.lines) },
];

const aria = (c: Ctx) => `What was paid above the cheapest price by month, ${c.where}, each month against its own cheapest, with the % above as a line on the bar tops`;

function MonthDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  const sel = new Set(c.d.scope?.months || []);
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.extra_paid_vs_cheapest), comparator: `paid above the cheapest, ${pct(h.extra_pct)} of the value compared, ${c.when}` }}
      source={PRICES_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "months", label: "Every month", render: () => (
            <>
              <DrawerSection title="Paid above the cheapest, by month" note="Bars from zero; the line joins the bar tops, each point labelled with that month's % above the cheapest. Months in your selection are shaded.">
                <MonthCombo months={comboMonths(c)} series={SERIES} line={PCT_LINE} format={lakhs} ariaLabel={aria(c)} />
              </DrawerSection>
              <DrawerSection title="Month by month" note="Each month against its own cheapest unit price. Selected together, months share one cheapest (the lowest of any of them), so the selection's figure can be more than its months added up.">
                <MonthTable rows={c.d.by_month || []} cols={TABLE_COLS} selected={sel} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>Every month with a GRN file is drawn, each set against its own cheapest unit price; the Month filter only shades its months, the other filters apply. Bars start from zero on one scale; the % above the cheapest (of what the products compared cost) is read from the labels on the line, never from a second scale.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function MonthTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const title = "Paid above the cheapest, by month";
  const last = (c.d.by_month || []).filter((r) => r.lines > 0).slice(-1)[0];
  return (
    <>
      <ChartPanel id="months" title={title} context={c.where} accent={PRODUCT_COL} place={place}
        label={[aria(c), last ? `${last.label}: ${lakhs(last.extra_paid)} above the cheapest, ${pct(last.extra_pct)}` : null].filter(Boolean).join(". ")}
        onOpen={() => dr.show("months")} onInfo={() => dr.show("method")}>
        <MonthCombo months={comboMonths(c)} series={SERIES} line={PCT_LINE} format={lakhs} ariaLabel={aria(c)} />
      </ChartPanel>
      <MonthDrawer c={c} dr={dr} title={title} />
    </>
  );
}
