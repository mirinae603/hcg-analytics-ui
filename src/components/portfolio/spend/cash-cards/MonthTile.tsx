"use client";
// Spend Analysis (Cash & TPA / Out of formulary) — the months on one chart, as HCG's spend email
// draws them: the margin missed as bars from zero (left axis) and the % missed as a line on its own
// fitted axis (right). The tile shows the year ending at the selected month, shaded. Its drawer
// has every month: the same chart, HCG's "actual vs budget" pairing (actual and margin possible
// side by side under the same % missed line) and the month-by-month table with exact rupees.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { MonthCombo, type ComboMonth, type ComboSeries } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { monthLabel } from "../../formulary/api";
import { MonthTable, type MonthCol } from "../Trend";
import { PROPOSED_COL, RATE_COL, USED_COL, prevMonth, type Ctx, type Month } from "./context";
import { Method } from "./parts";

/** The margin missed every month, in the section's colour. */
const lossSeries = (c: Ctx): ComboSeries[] => [{ key: "loss", label: "Margin missed", color: c.tone }];
const PAIR_SERIES: ComboSeries[] = [{ key: "actual", label: "Margin earned", color: USED_COL }, { key: "proposed", label: "Margin possible", color: PROPOSED_COL }];
const PCT_LINE = { label: "% missed", color: RATE_COL, decimals: 2 };

/** Every published month, whatever the Month filter says; the selected ones are shaded. A
 *  month with no use has no bars (rather than bars at zero). */
function comboMonths(c: Ctx): ComboMonth[] {
  const sel = new Set(c.d.scope?.months || []);
  return (c.d.trend || []).map((r) => {
    const used = r.lines > 0;
    return {
      key: r.period, label: r.label || monthLabel(c.meta, r.period), selected: sel.has(r.period),
      pct: r.loss_pct ?? r.pct ?? null,
      values: { loss: used ? r.margin_loss : null, actual: used ? r.actual_margin : null, proposed: used ? r.potential_margin : null },
    };
  });
}

const TABLE_COLS: MonthCol<Month>[] = [
  { label: "Margin earned", render: (r) => rupeesExact(r.actual_margin) },
  { label: "Margin possible", render: (r) => rupeesExact(r.potential_margin) },
  { label: "Margin missed", render: (r) => <b>{rupeesExact(r.margin_loss)}</b> },
  { label: "% missed", render: (r) => pct(r.loss_pct ?? r.pct) },
];

const lossAria = (c: Ctx) => `${c.w.title} by month, ${c.where}, with the % missed as a line`;

/** Every month for a drawer: the loss chart and the table under it. */
export function MonthPanel({ c }: { c: Ctx }) {
  const sel = new Set(c.d.scope?.months || []);
  return (
    <>
      <DrawerSection title="Margin missed by month" note="Bars from zero: margin missed. The line joins the bar tops; each point is labelled with that month's % missed. Months in your selection are shaded.">
        <MonthCombo months={comboMonths(c)} series={lossSeries(c)} line={PCT_LINE} ariaLabel={lossAria(c)} />
      </DrawerSection>
      <DrawerSection title="Month by month" note={c.w.monthNote}>
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
      kpi={{ value: rupeesExact(h.margin_loss), comparator: `${pct(h.loss_pct)} of the margin possible, ${c.when}` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        { key: "months", label: "Every month", render: () => <MonthPanel c={c} /> },
        {
          key: "pair", label: "Earned vs possible", render: () => (
            <DrawerSection title="Actual and margin possible by month"
              note="HCG's actual vs budget pairing: the margin the brands used made beside the margin the suggested brands would have made, from zero (left scale), under the same % missed line (right axis). Months in your selection are shaded.">
              <MonthCombo months={comboMonths(c)} layout="alternatives" series={PAIR_SERIES} line={PCT_LINE}
                ariaLabel={`Actual and margin possible by month, ${c.where}, with the % missed as a line`} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.monthNote}</p>
              <p>The overview&apos;s chart shows the twelve months ending at the selected one; this drawer shows every published month. The Month filter only shades its months; the other filters apply. Bars start from zero; the % missed line has its own axis on the right, fitted to its values and labelled.</p>
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
  const title = "Margin missed by month";
  return (
    <>
      <ChartPanel id="trend" title={title} context={c.where} accent={c.tone} place={place} source={c.source}
        label={[
          `${c.w.title} by month, ${c.where}, bars with the % missed as a line`,
          `${c.when}: ${lakhs(h.margin_loss)} lost, ${pct(h.loss_pct)} of the margin possible`,
          prev ? `${prev.label}: ${lakhs(prev.margin_loss)}, ${pct(prev.loss_pct)}` : null,
        ].filter(Boolean).join(". ")}
        onOpen={() => dr.show("months")} onInfo={() => dr.show("method")}>
        <MonthCombo months={comboMonths(c)} series={lossSeries(c)} line={PCT_LINE} ariaLabel={lossAria(c)} />
      </ChartPanel>
      <MonthDrawer c={c} dr={dr} title={title} />
    </>
  );
}
