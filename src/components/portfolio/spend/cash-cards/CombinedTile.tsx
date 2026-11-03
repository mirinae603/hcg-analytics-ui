"use client";
// Spend Analysis (Cash & TPA) — HCG's 'CASH(TPA) & OUT OF FORMULARY' table as a bridge: the
// total margin possible, less the cash & TPA loss, less the out-of-formulary loss, is the total
// margin earned; the % is taken on the totals. The out-of-formulary row is HCG's purchase (GRN)
// method for the same hospitals and months (purchases have no payer or patient type); it is
// hatched and the tile marked Estimated only where part of it rests on the app's own brand
// match. The drawer has the month chart of the two losses and their total, the month-by-month
// table and the method.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { Waterfall } from "@/components/portfolio/ledger/bars";
import { MonthCombo } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { OOF_COL } from "../../formulary/parts";
import { CASH_COL, coverageWords, oofSource, salesAndPurchasesSource } from "../shared";
import { monthLabel } from "../../formulary/api";
import { MonthTable, type MonthCol } from "../Trend";
import type { Margins, Section, WithOof } from "../api";
import { LOSS_COL, PROPOSED_COL, RATE_COL, USED_COL, type Ctx } from "./context";
import { Method } from "./parts";

type WithOofMonth = WithOof["trend"][number];

const lossNote = (b: Margins) => (isNum(b.loss_pct) ? `${pct(b.loss_pct)} of ${lakhs(b.potential_margin)} possible` : "no use");

function CombinedDrawer({ c, w, dr, title, onSection }: { c: Ctx; w: WithOof; dr: DrawerCtl; title: string; onSection?: (s: Section) => void }) {
  const sel = new Set(c.d.scope?.months || []);
  const estimated = oofSource(w.coverage) === "estimate";
  const monthCols: MonthCol<WithOofMonth>[] = [
    { label: "Total margin earned", render: (r) => rupeesExact(r.actual_margin), raw: (r) => r.actual_margin, unit: "₹" },
    { label: "Total margin possible", render: (r) => rupeesExact(r.potential_margin), raw: (r) => r.potential_margin, unit: "₹" },
    { label: "Cash & TPA missed", render: (r) => rupeesExact(r.cash_loss), raw: (r) => r.cash_loss, unit: "₹" },
    { label: "Out of formulary missed", render: (r) => (r.has_oof ? rupeesExact(r.oof_loss) : "no purchases"), raw: (r) => (r.has_oof ? r.oof_loss : null), unit: "₹" },
    { label: "Total margin missed", render: (r) => <b>{rupeesExact(r.margin_loss)}</b>, raw: (r) => r.margin_loss, unit: "₹" },
    { label: "% missed", render: (r) => pct(r.loss_pct ?? r.pct), raw: (r) => r.loss_pct ?? r.pct, unit: "%" },
  ];
  const sources = coverageWords(w.coverage);
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(w.total.margin_loss), comparator: `total margin missed, ${pct(w.total.loss_pct)} of the total margin possible` }}
      source={salesAndPurchasesSource("Cash & TPA", estimated)} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "trend", label: "Trend", render: () => (
            <>
              <DrawerSection title="Every month · the two losses and the total % missed"
                note="One bar per month, the two parts stacked, from zero. The line joins the bar tops; each point is labelled with the total % missed. Months in your selection are shaded; a month without out-of-formulary purchase data has the cash & TPA part only.">
                <MonthCombo ariaLabel={`Cash and TPA and out-of-formulary margin missed by month, ${c.where}, with the total % missed as a line`}
                  series={[{ key: "cash", label: "Cash & TPA missed", color: CASH_COL }, { key: "oof", label: "Out of formulary missed", color: OOF_COL, hatched: estimated }]}
                  line={{ label: "Total % missed", color: RATE_COL, decimals: 2 }}
                  months={(w.trend || []).map((r) => ({
                    key: r.period, label: r.label || monthLabel(c.meta, r.period), selected: sel.has(r.period),
                    pct: r.loss_pct ?? r.pct ?? null,
                    values: { cash: r.cash_loss, oof: r.has_oof ? r.oof_loss : null },
                  }))} />
              </DrawerSection>
              <DrawerSection title="Month by month">
                <MonthTable rows={w.trend || []} cols={monthCols} selected={sel} caption={`Cash & TPA + out of formulary: margin missed by month, ${c.where}`} />
              </DrawerSection>
              {onSection && (
                <DrawerSection title="Behind the figures">
                  <div className="flex flex-wrap gap-2">
                    <LinkButton onClick={() => { dr.close(); onSection("oof"); }}>Out-of-formulary section</LinkButton>
                  </div>
                </DrawerSection>
              )}
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{w.note ?? "Cash & TPA and out of formulary together, each margin added up and the % taken on the totals."}</p>
              {sources && <p>Where the out-of-formulary suggested brands came from, by purchase value: {sources}.</p>}
              <p>On the chart the total margin possible runs from zero, each part&apos;s loss is taken off it in turn, and what is left is the total margin earned.{estimated ? " The out-of-formulary step is hatched: part of it rests on the app's own brand match (Estimated)." : ""}</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function CombinedTile({ c, w, place, onSection }: { c: Ctx; w: WithOof; place: Place; onSection?: (s: Section) => void }) {
  const dr = useDrawer();
  const title = "Cash & TPA + out of formulary";
  const estimated = oofSource(w.coverage) === "estimate";
  const source = salesAndPurchasesSource("Cash & TPA", estimated);
  // A selection whose months only partly have purchase data says which ones the out-of-formulary
  // step covers, so its smaller figure is not read as the whole selection's.
  const months = c.d.scope?.months || [];
  const bought = w.oof_months ?? months;
  const partly = bought.length > 0 && bought.length < months.length
    ? `purchases: ${[...bought].sort().map((m) => monthLabel(c.meta, m)).join(", ")} only` : null;
  return (
    <>
      <ChartPanel id="combined" title={title} context={c.context} accent={CASH_COL} place={place} source={source}
        label={[
          `${title}, ${c.context}`,
          `total margin possible ${lakhs(w.total.potential_margin)}`,
          `cash & TPA loss ${lakhs(w.cash.margin_loss)}, ${lossNote(w.cash)}`,
          `out-of-formulary purchases loss ${lakhs(w.oof.margin_loss)}, ${lossNote(w.oof)}${estimated ? ", partly estimated" : ""}${partly ? `, ${partly}` : ""}`,
          `total margin earned ${lakhs(w.total.actual_margin)}; total loss ${pct(w.total.loss_pct)}`,
        ].join(". ")}
        onOpen={() => dr.show("trend")} onInfo={() => dr.show("method")}>
        <Waterfall format={lakhs} ariaLabel={`${title}: the total margin possible, less each part's loss, is the total margin earned`}
          steps={[
            { key: "proposed", label: "Margin possible", value: w.total.potential_margin, kind: "total", color: PROPOSED_COL, valueLabel: lakhs(w.total.potential_margin), note: "both parts" },
            { key: "cash", label: "Cash & TPA", value: -w.cash.margin_loss, kind: "delta", color: LOSS_COL, valueLabel: lakhs(-w.cash.margin_loss), note: `missed ${pct(w.cash.loss_pct)}` },
            { key: "oof", label: "Out of formulary", value: -w.oof.margin_loss, kind: "delta", color: OOF_COL, hatched: estimated, valueLabel: lakhs(-w.oof.margin_loss), note: `missed ${pct(w.oof.loss_pct)} · ${partly ?? "purchases"}${estimated ? " · estimated" : ""}` },
            { key: "actual", label: "Margin earned", value: w.total.actual_margin, kind: "total", color: USED_COL, valueLabel: lakhs(w.total.actual_margin), note: `missed ${pct(w.total.loss_pct)}` },
          ]} />
      </ChartPanel>
      <CombinedDrawer c={c} w={w} dr={dr} title={title} onSection={onSection} />
    </>
  );
}
