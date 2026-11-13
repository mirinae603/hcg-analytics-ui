"use client";
// Revenue & margin — by month: IP and OP revenue (MRP) stacked into one bar per month from zero,
// and the margin % as a line that rides the bar tops, each point labelled, as HCG's own
// "Actual vs Budget" charts are drawn. Every published month is drawn whatever the Month filter
// says (the months in the selection are shaded); the other filters and the hospital apply.
// The drawer has the chart at full size, every month in exact rupees, and the method.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { MonthCombo, type ComboMonth, type ComboSeries } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, pts, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import {
  ACCENT, RATE_COL, RUPEES_ONLY, TYPE_COL, HowBuilt, MethodText, MonthTable, changeOf, filterChips, monthsLabelOf,
  type RevScope,
} from "./shared";
import type { TrendRow, TypeKey } from "./api";

/** A trend panel shows a year at most, ending at the selected month (MonthCombo's window). */
const TREND_MONTHS = 12;

function comboOf(s: RevScope): { series: ComboSeries[]; months: ComboMonth[] } {
  const sel = new Set(s.d.scope?.months ?? []);
  // Inpatient at the bottom: it is most of the revenue, so OP sits on top where it reads.
  const series: ComboSeries[] = s.types.map((t: TypeKey) => ({ key: t, label: t, color: TYPE_COL[t] }));
  const months: ComboMonth[] = s.trend.map((r) => ({
    key: r.period, label: r.label, pct: r.margin_pct, selected: sel.has(r.period),
    // A published month with no sales here has no bars, rather than bars of zero.
    values: r.lines ? { IP: r.ip.mrp, OP: r.op.mrp } : { IP: null, OP: null },
  }));
  return { series, months };
}

export function TrendTile({ s, place }: { s: RevScope; place: Place }) {
  const dr = useDrawer();
  const { series, months } = comboOf(s);
  const last = months.filter((m) => m.selected).pop() ?? months[months.length - 1];
  const span = months.length > TREND_MONTHS && last ? `the ${TREND_MONTHS} months to ${last.label}` : "every month";
  const title = "Revenue by month, IP and OP";
  const label = `${title}, with margin %, ${s.where}: `
    + s.trend.map((r) => `${r.label} ${lakhs(r.mrp)}, margin ${pct(r.margin_pct, 1)}`).join("; ");
  return (
    <>
      <ChartPanel id="trend" title={title} context={`${s.where} · ${span}${s.basis === "qty" ? ` · ${RUPEES_ONLY}` : ""}`} accent={ACCENT}
        place={place} label={label} onOpen={() => dr.show("month")} onInfo={() => dr.show("method")}>
        <MonthCombo ariaLabel={`${title}, with the margin % riding the bar tops, ${s.where}`} series={series} months={months}
          line={{ label: "Margin %", color: RATE_COL, decimals: 1 }} window={TREND_MONTHS} />
      </ChartPanel>
      <TrendDrawer s={s} dr={dr} />
    </>
  );
}

function TrendDrawer({ s, dr }: { s: RevScope; dr: DrawerCtl }) {
  const { series, months } = comboOf(s);
  const every = monthsLabelOf(s.d, s.trend.map((r) => r.period));
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow="Revenue & margin · Overview" title={`Revenue by month · ${s.where}`}
      source="computed" asOf={s.asOf} filters={filterChips(s, { months: `${every} (every month)` })}
      tabs={[
        {
          key: "month", label: "By month", render: () => (
            <>
              <DrawerSection title="IP and OP revenue, with the margin %" note="Bars from ₹0, IP below OP; the line joins the bar tops and each point is that month's margin %.">
                <MonthCombo ariaLabel={`Revenue by month, IP and OP, with margin %, ${s.where}`} series={series} months={months}
                  line={{ label: "Margin %", color: RATE_COL, decimals: 2 }} height={300} />
              </DrawerSection>
              <DrawerSection title="Every month" note="Exact rupees, as the group's sheets carry them.">
                <MonthTable s={s} caption={`Revenue and margin by month, ${s.where}`} columns={[
                  ...s.types.map((t) => ({ key: t, label: `${t} revenue`, value: (r: TrendRow) => rupeesExact(t === "IP" ? r.ip.mrp : r.op.mrp) })),
                  { key: "mrp", label: "Revenue", value: (r) => rupeesExact(r.mrp), strong: true },
                  { key: "change", label: "Change", value: changeOf((r) => r.mrp, rupeesExact) },
                  { key: "cost", label: "Cost", value: (r) => rupeesExact(r.cost) },
                  { key: "margin", label: "Margin", value: (r) => rupeesExact(r.margin) },
                  { key: "pct", label: "Margin %", value: (r) => pct(r.margin_pct), strong: true },
                  { key: "pts", label: "Change, pts", value: changeOf((r) => r.margin_pct, (v) => pts(v)) },
                  { key: "qty", label: "Units sold", value: (r) => num(r.qty) },
                ]} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>One bar per published month from zero: inpatient (IP) revenue at the bottom, outpatient (OP) on top, so the bar is the month&apos;s whole revenue at MRP. The line joins the bar tops; each point is labelled with that month&apos;s margin % (margin ÷ MRP, a ratio of the month&apos;s sums). There is one scale, rupees; the % is read from its labels, never from a second axis.</p>
                <p>The chart draws every published month whatever the Month filter says; the months in your selection are shaded. Hospital, Patients, Material and Payer apply. A month with no sales for this selection has no bar. The panel shows a year at most, ending at the month selected; this drawer shows them all.</p>
                <p>Revenue and margin are rupees whatever the Value ↔ Quantity switch says.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}
