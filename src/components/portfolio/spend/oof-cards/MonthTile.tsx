"use client";
// Spend Analysis (Out of formulary) — the months on one chart, as HCG's "actual vs budget"
// charts draw them: the margin the brands bought earned and the margin the suggested brands
// would have made, one over the other from zero (the larger behind, so the gap between them is
// the margin missed), with the % missed as a line riding the bar tops. Every purchase month is
// drawn (the Month filter only shades). The drawer has the margin missed alone by month, and
// the month-by-month table with HCG's own figure beside ours.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { MonthCombo, type ComboMonth, type ComboSeries } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { monthLabel } from "../../formulary/api";
import { MonthTable, type MonthCol } from "../Trend";
import { OOF_COL, PROPOSED_COL, RATE_COL, USED_COL, Method, prevMonth, type Ctx, type Month } from "./context";

const PAIR: ComboSeries[] = [{ key: "actual", label: "Margin earned", color: USED_COL }, { key: "proposed", label: "Margin possible", color: PROPOSED_COL }];
const LOSS: ComboSeries[] = [{ key: "loss", label: "Margin missed", color: OOF_COL }];
const PCT_LINE = { label: "% missed", color: RATE_COL, decimals: 2 };

/** Every purchase month; a month with no purchase has no bars (rather than bars at zero). */
function comboMonths(c: Ctx): ComboMonth[] {
  const sel = new Set(c.d.scope?.months || []);
  return (c.d.trend || []).map((r) => {
    const any = r.lines > 0;
    return {
      key: r.period, label: r.label || monthLabel(c.meta, r.period), selected: sel.has(r.period),
      pct: r.loss_pct ?? r.pct ?? null,
      values: { actual: any ? r.actual_margin : null, proposed: any ? r.potential_margin : null, loss: any ? r.margin_loss : null },
    };
  });
}

const TABLE_COLS: MonthCol<Month>[] = [
  { label: "Spent", render: (r) => rupeesExact(r.purchase_value) },
  { label: "Margin earned", render: (r) => rupeesExact(r.actual_margin) },
  { label: "Margin possible", render: (r) => rupeesExact(r.potential_margin) },
  { label: "Margin missed", render: (r) => <b>{rupeesExact(r.margin_loss)}</b> },
  { label: "% missed", render: (r) => pct(r.loss_pct ?? r.pct) },
  { label: "HCG's sheet", render: (r) => rupeesExact(r.hcg_loss) },
];

const pairAria = (c: Ctx) => `Margin earned and margin possible on out-of-formulary purchases by month, ${c.where}, with the % missed as a line on the bar tops`;

/** Every month for a drawer: the chart and HCG's month table under it. */
export function MonthPanel({ c }: { c: Ctx }) {
  const sel = new Set(c.d.scope?.months || []);
  return (
    <>
      <DrawerSection title="Margin earned and possible by month" note="The two bars stand one over the other from zero, the larger behind: the gap between them is the margin missed. The line joins the bar tops; each point is labelled with that month's % missed. Months in your selection are shaded.">
        <MonthCombo months={comboMonths(c)} layout="alternatives" series={PAIR} line={PCT_LINE} ariaLabel={pairAria(c)} />
      </DrawerSection>
      <DrawerSection title="Month by month"
        note={`${c.w.monthNote} HCG's sheet = the margin missed in HCG's own out-of-formulary Summary for the same hospitals ("—" where HCG has none, or under a material type or brand filter).`}>
        <MonthTable rows={c.d.trend || []} cols={TABLE_COLS} selected={sel} />
      </DrawerSection>
    </>
  );
}

function MonthDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.margin_loss), comparator: `margin missed, ${pct(h.loss_pct)} of the margin possible, ${c.when}` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        { key: "months", label: "Every month", render: () => <MonthPanel c={c} /> },
        {
          key: "missed", label: "Margin missed", render: () => (
            <DrawerSection title="Margin missed by month" note="Bars from zero: the margin missed, net (a month where the brands bought earned more than their suggestions would fall below zero). The line joins the bar tops, each point labelled with the % missed. Months in your selection are shaded.">
              <MonthCombo months={comboMonths(c)} series={LOSS} line={PCT_LINE} ariaLabel={`Out-of-formulary margin missed by month, ${c.where}, with the % missed as a line`} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.monthNote}</p>
              <p>Every month with out-of-formulary purchase data is drawn (a GRN month that has its own Item Master); the Month filter only shades its months, the other filters apply. Bars start from zero on one scale; the % missed is read from the labels on the line, never from a second scale.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function MonthTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const prev = prevMonth(c.d);
  const title = "Margin earned vs possible by month";
  return (
    <>
      <ChartPanel id="trend" title={title} context={c.where} accent={OOF_COL} place={place} source={c.source}
        label={[
          pairAria(c),
          `${c.when}: earned ${lakhs(h.actual_margin)}, possible ${lakhs(h.potential_margin)}, ${pct(h.loss_pct)} missed`,
          prev ? `${prev.label}: ${lakhs(prev.margin_loss)} missed, ${pct(prev.loss_pct)}` : null,
        ].filter(Boolean).join(". ")}
        onOpen={() => dr.show("months")} onInfo={() => dr.show("method")}>
        <MonthCombo months={comboMonths(c)} layout="alternatives" series={PAIR} line={PCT_LINE} ariaLabel={pairAria(c)} />
      </ChartPanel>
      <MonthDrawer c={c} dr={dr} title={title} />
    </>
  );
}
