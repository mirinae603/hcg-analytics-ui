"use client";
// Spend Analysis (Cash & TPA) — the headline tile. HCG's "actual | budget" pair drawn as a
// bridge: the margin the suggested brands would have made (there is no budget; the suggestion is
// what the figure is judged against), less the margin missed, is the margin the brands used
// made. The drawer carries the written summary, the exact figures, every month, the splits,
// every hospital, HCG's allowance for bifurcated brands and the method.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { Waterfall, type WaterStep } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { View } from "../api";
import { lossMethod } from "../shared";
import { COUNT_COL, LOSS_COL, PROPOSED_COL, RATE_COL, USED_COL, prevMonth, type Ctx, type Month } from "./context";
import { Method } from "./parts";
import { MonthPanel } from "./MonthTile";
import { SliceTables } from "./SplitTile";
import { RankingTable } from "./HospitalsTile";

const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const were = (n: number) => (n === 1 ? "was" : "were");

/** The tile's figures in sentences, for the drawer's "In brief". */
function brief(c: Ctx, prev: Month | null): string[] {
  const h = c.d.headline;
  if (!isNum(h.loss_pct)) return [`${c.w.none} at ${c.where}, ${c.when}.`];
  return [
    `For ${c.who} at ${c.where}, ${c.when}, the ${c.w.used} made ${rupeesExact(h.actual_margin)} of margin; the ${c.w.sug} would have made ${rupeesExact(h.potential_margin)}. The margin missed is ${rupeesExact(h.margin_loss)}, ${pct(h.loss_pct)} of the margin possible.`,
    ...(prev ? [`In ${prev.label} it was ${rupeesExact(prev.margin_loss)}, ${pct(prev.loss_pct)} of the margin possible.`] : []),
    `${plural(h.brands, "such brand")} ${were(h.brands)} used for ${num(h.cash_qty)} units by ${plural(h.doctors, "doctor")}; ${num(h.qty)} units count after HCG's allowance for bifurcated brands.`,
    `With the ${c.w.sug}, revenue at MRP (excl GST) would also rise by ${rupeesExact(h.topline_increase)}.`,
  ];
}

function figures(c: Ctx): KeyFigure[] {
  const h = c.d.headline;
  return [
    { label: "Margin earned", value: rupeesExact(h.actual_margin), color: USED_COL,
      note: `on the ${c.w.used}${isNum(h.used_margin_pct) ? `, ${pct(h.used_margin_pct)} of their MRP` : ""}` },
    { label: "Margin possible", value: rupeesExact(h.potential_margin), color: PROPOSED_COL,
      note: `with the ${c.w.sug}${isNum(h.suggested_margin_pct) ? `, ${pct(h.suggested_margin_pct)} of their MRP` : ""}` },
    { label: "Margin missed", value: rupeesExact(h.margin_loss), color: LOSS_COL, note: "proposed − actual" },
    { label: "% missed", value: pct(h.loss_pct), color: RATE_COL, note: "margin missed ÷ margin possible" },
    { label: `MRP · ${c.w.used}`, value: rupeesExact(h.used_mrp_value), note: "MRP excl GST × qty" },
    { label: `MRP · ${c.w.sug}`, value: rupeesExact(h.suggested_mrp_value), note: "MRP excl GST × the same qty" },
    { label: "MRP increase", value: rupeesExact(h.topline_increase), note: c.w.increaseNote },
    { label: "Qty counted", value: num(h.qty), note: `of ${num(h.cash_qty)} units used, after HCG's allowance` },
    { label: "Bill cost", value: rupeesExact(h.bill_cost), note: `${num(h.lines)} sales lines` },
    { label: "Brands · doctors · hospitals", value: `${num(h.brands)} · ${num(h.doctors)} · ${num(h.hospitals)}`, note: "with any use in the selection" },
  ];
}

/** HCG's allowance for bifurcated brands. For these brands HCG allows a share
 *  (SHARING) of the molecule's volume at the hospital each month, and only the use above it
 *  counts towards the margin missed. Quantities, not rupees. Allowed and counted are worked out
 *  per brand, hospital and month, so used − allowed is not counted wherever a brand stayed
 *  under its share; nothing here is a difference of the figures shown. */
function Allowance({ c, onOpen }: { c: Ctx; onOpen: (v: View) => void }) {
  const a = c.d.allowance;
  if (!a) return null;
  const listed = c.d.cash_list?.bifurcated_brands ?? c.meta.cash_list?.bifurcated_brands;
  return (
    <>
      <DrawerSection title="Bifurcated brands" note="Units of the bifurcated brands, for the hospital, month and material type selected.">
        <KeyFigures figures={[
          { label: "Units used", value: num(a.cash_qty), color: COUNT_COL, note: "cash + TPA, IP + OP" },
          { label: "Units allowed", value: num(a.allowed_qty), color: COUNT_COL, note: "SHARING × the molecule group's volume" },
          { label: "Units counted", value: num(a.counted_qty), color: COUNT_COL, note: "the use above the allowance" },
          { label: "Bifurcated brands", value: num(a.brands), note: listed ? `used here, of ${num(listed)} listed so far` : "used here" },
        ]} />
      </DrawerSection>
      <DrawerSection title="How the allowance works">
        <div className="space-y-2 text-[12.5px] leading-relaxed" style={{ color: SUB }}>
          <p>For these brands HCG allows a share (SHARING) of the molecule&apos;s volume at the hospital each month; only the use above that counts towards the margin missed. It is worked out per hospital and month on the whole brand (IP + OP, cash + TPA together, as HCG does), so it follows the hospital, month and material type filters only.</p>
          <p>Which brands are bifurcated{listed ? ` (${num(listed)} so far)` : ""}, and their molecule groups, come from HCG&apos;s KR spend report until HCG sends the full rules.</p>
        </div>
      </DrawerSection>
      <DrawerSection title="Per brand" note="The Brands tab carries HCG's SHARING, Group qty, Allowed qty and Excess qty for each bifurcated brand.">
        <LinkButton onClick={() => onOpen("items")}>Brands behind it</LinkButton>
      </DrawerSection>
    </>
  );
}

function MarginDrawer({ c, dr }: { c: Ctx; dr: DrawerCtl }) {
  const h = c.d.headline;
  const prev = prevMonth(c.d);
  const has = isNum(h.loss_pct);
  const goTo = (v: View) => { dr.close(); c.onOpen(v); };
  // The words the Summary's drawer for this section uses too.
  const method = lossMethod("cash", c.meta.cash_list?.financial_year);
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${c.w.title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.margin_loss), comparator: has ? `${pct(h.loss_pct)} of the margin possible, ${rupeesExact(h.potential_margin)}` : c.w.none }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title="In brief">
                <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
                  {brief(c, prev).map((t) => <p key={t}>{t}</p>)}
                </div>
              </DrawerSection>
              <DrawerSection title="Key figures" note="Exact rupees for the selection.">
                <KeyFigures figures={figures(c)} />
              </DrawerSection>
              <DrawerSection title="Behind the figures">
                <div className="flex flex-wrap gap-2">
                  <LinkButton onClick={() => goTo("items")}>Brands behind it</LinkButton>
                  <LinkButton onClick={() => goTo("doctors")}>By doctor</LinkButton>
                </div>
              </DrawerSection>
            </>
          ),
        },
        { key: "trend", label: "Trend", render: () => <MonthPanel c={c} /> },
        { key: "breakdown", label: "Breakdown", render: () => <SliceTables c={c} /> },
        { key: "hospitals", label: "Hospitals", render: () => <RankingTable c={c} onPicked={dr.close} /> },
        { key: "allowance", label: "Allowance", hidden: !c.d.allowance, render: () => <Allowance c={c} onOpen={goTo} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{method.basis}</p>
              <p>{method.formula}</p>
              <p>There is no budget for this figure: the margin possible is what it is compared with. On the chart the margin possible runs from zero, the margin missed is taken off it, and what is left is the margin earned. With one month selected, the summary gives the month before.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function MarginTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const prev = prevMonth(c.d);
  const has = isNum(h.loss_pct);
  const title = "Margin: possible → earned";
  const steps: WaterStep[] = [
    { key: "proposed", label: "Margin possible", value: h.potential_margin, kind: "total", color: PROPOSED_COL, valueLabel: lakhs(h.potential_margin), note: c.w.sugShort.toLowerCase() },
    // Actual − proposed is minus the loss: the API's loss, never a recomputed one.
    { key: "loss", label: "Margin missed", value: -h.margin_loss, kind: "delta", color: LOSS_COL, valueLabel: lakhs(-h.margin_loss), note: `${pct(h.loss_pct)} of possible` },
    { key: "actual", label: "Margin earned", value: h.actual_margin, kind: "total", color: USED_COL, valueLabel: lakhs(h.actual_margin), note: c.w.usedShort.toLowerCase() },
  ];
  return (
    <>
      <ChartPanel id="margin" title={title} context={c.context} accent={USED_COL} place={place} source={c.source}
        label={has ? [
          `${c.w.section} margin, ${c.context}`,
          `proposed ${lakhs(h.potential_margin)}, margin missed ${lakhs(h.margin_loss)} (${pct(h.loss_pct)} of proposed), actual ${lakhs(h.actual_margin)}`,
          prev ? `${prev.label}: ${lakhs(prev.margin_loss)} lost, ${pct(prev.loss_pct)}` : null,
        ].filter(Boolean).join(". ") : `${c.w.section} margin, ${c.context}. ${c.w.none}`}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        {has ? (
          <Waterfall steps={steps} format={lakhs} ariaLabel={`${c.w.section} margin, ${c.context}: proposed, less the margin missed, is the margin earned`} />
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>{c.w.none}.</p>
        )}
      </ChartPanel>
      <MarginDrawer c={c} dr={dr} />
    </>
  );
}
