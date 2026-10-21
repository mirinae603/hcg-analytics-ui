"use client";
// Spend Analysis (Out of formulary) — how much of the out-of-formulary use found a formulary
// brand to compare with. HCG has not sent its own replacement list, so the app matches each
// brand to a formulary brand of the same molecule, strength and form: every figure in this
// section rests on that match, and this tile says how far it reaches: the bill cost as one 100%
// bar, matched and not, and under it the biggest brands that found no match. Marked Estimate.
import React from "react";
import { ChartPanel, LinkButton, MoreRows, fitRows } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { PartBar } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { useSize } from "@/components/portfolio/ledger/minis";
import { INK, SUB, TRACK } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { niceCeil } from "@/components/portfolio/ledger/scale";
import { num } from "@/lib/kpiFormat";
import { X_COL } from "../../formulary/parts";
import type { OofCoverage, View } from "../api";
import { COUNT_COL, PROPOSED_COL, type Ctx } from "./context";
import { DataTable, Method, type Col } from "./parts";

type Unmatched = NonNullable<Ctx["d"]["unmatched"]>[number];

const MATCH_RULE = "A match needs a formulary brand with the same molecule (Item Master 'Minor Group'), the same strength and the same form, priced in HCG's CASH&TPA list; of several, the one with the best margin. Brands without one are listed in the Brands tab but add nothing to the margins.";

// The list under the coverage bar: one 18px line per brand under a 14px caption. It shares the
// panel body with the bar, so it fits itself to the room it is given (RankBars would size
// itself to the whole body).
const ROW_H = 18;
const CAPTION_H = 14;

/** The biggest brands without a match that fit, bill cost as bars from zero on one scale. */
function UnmatchedRows({ rows }: { rows: Unmatched[] }) {
  const [ref, size] = useSize<HTMLDivElement>({ w: 0, h: 0 });
  const items = rows.map((u) => ({ key: u.material, label: u.material_desc ?? u.material, value: u.actual_cost, selected: false }));
  const fit = fitRows(items, Math.max(0, size.h - CAPTION_H), { minH: ROW_H, maxH: ROW_H });
  const max = niceCeil(Math.max(0, ...items.map((r) => r.value)));
  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-hidden mt-2" aria-hidden="true">
      {items.length > 0 && (
        <div className="flex items-end justify-between text-[10px] font-semibold uppercase whitespace-nowrap" style={{ height: CAPTION_H, color: SUB, letterSpacing: ".08em" }}>
          <span>Largest without a match</span><span className="normal-case tracking-normal font-normal tabular-nums">bill cost, ₹ 0 – {lakhs(max)}</span>
        </div>
      )}
      {fit.shown.map((r) => (
        <div key={r.key} className="grid items-center gap-x-2.5" style={{ gridTemplateColumns: "minmax(0,1fr) 30% auto", height: ROW_H }} title={`${r.label}: ${lakhs(r.value)}`}>
          <span className="truncate text-[11.5px]" style={{ color: INK }}>{r.label}</span>
          <span className="relative block h-[6px] rounded-[3px]" style={{ background: TRACK }}>
            <span className="absolute left-0 top-0 bottom-0 rounded-[3px]" style={{ width: `${(Math.max(0, r.value) / max) * 100}%`, background: X_COL }} />
          </span>
          <span className="text-[11px] font-semibold tabular-nums text-right whitespace-nowrap" style={{ color: INK }}>{lakhs(r.value)}</span>
        </div>
      ))}
      <MoreRows n={fit.hidden} />
    </div>
  );
}

function CoverageDrawer({ c, cov, dr, title }: { c: Ctx; cov: OofCoverage; dr: DrawerCtl; title: string }) {
  const un = c.d.unmatched || [];
  const goTo = (v: View) => { dr.close(); c.onOpen(v); };
  const brands = `${num(cov.matched_brands)} of ${num(cov.brands)} brands`;
  const cols: Col<Unmatched>[] = [
    {
      label: "Brand used", align: "left", wrap: true, render: (u) => (
        <span className="block" title={`${u.material_desc ?? u.material} (${u.material})`}>
          <span className="block font-semibold" style={{ color: INK }}>{u.material_desc ?? u.material}</span>
          {u.molecule && <span className="block text-[11px]" style={{ color: SUB }}>{u.molecule}</span>}
        </span>
      ),
    },
    { label: "Qty", render: (u) => num(u.qty) },
    { label: "Bill cost", render: (u) => rupeesExact(u.actual_cost) },
  ];
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab}
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: pct(cov.matched_cost_pct, 2), comparator: `of ${rupeesExact(cov.bill_cost)} bill cost matched; ${brands}` }}
      source="estimate" asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <DrawerSection title="Key figures" note="The bills' cost of the out-of-formulary brands used for cash and TPA patients in the selection.">
              <KeyFigures figures={[
                { label: "Bill cost", value: rupeesExact(cov.bill_cost), note: `${num(cov.brands)} out-of-formulary brands` },
                { label: "Matched", value: rupeesExact(cov.matched_cost), color: PROPOSED_COL, note: `${num(cov.matched_brands)} brands, ${pct(cov.matched_cost_pct, 2)} of the cost` },
                { label: "No match", value: rupeesExact(cov.unmatched_cost), color: X_COL, note: `${num(cov.unmatched_brands)} brands, listed but adding nothing` },
              ]} />
            </DrawerSection>
          ),
        },
        {
          key: "unmatched", label: "Without a match", render: () => (
            <DrawerSection title="The biggest brands without a match" note="By bill cost. Every brand, matched or not, is in the Brands tab.">
              <DataTable rows={un} rowKey={(u) => u.material} cols={cols} caption="Out-of-formulary brands with no formulary match, by bill cost" minWidth={480}
                empty="Every out-of-formulary brand in this selection found a formulary match." />
              <div className="mt-4"><LinkButton onClick={() => goTo("items")}>All brands</LinkButton></div>
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{MATCH_RULE}</p>
              <p>A brand matched in some of the selected months counts as matched; the cost of its unmatched months does not. Matched = the share of the bill cost, so a few costly brands weigh more than many cheap ones.</p>
              <p>On the chart the whole bar is the bill cost; under it, the biggest brands with no match, as bars from zero on their own scale.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function CoverageTile({ c, cov, place }: { c: Ctx; cov: OofCoverage; place: Place }) {
  const dr = useDrawer();
  const un = c.d.unmatched || [];
  const title = "Brand match coverage";
  const brands = `${num(cov.matched_brands)} of ${num(cov.brands)} brands matched`;
  return (
    <>
      <ChartPanel id="coverage" title={title} context={c.context} accent={COUNT_COL} place={place} source="estimate"
        label={[
          title, c.context, `${pct(cov.matched_cost_pct, 1)} of the bill cost matched, ${lakhs(cov.matched_cost)}`, brands,
          `${lakhs(cov.unmatched_cost)} found no match`,
          ...un.slice(0, 3).map((u) => `${u.material_desc ?? u.material} ${lakhs(u.actual_cost)}`),
        ].join(". ")}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        <div className="flex flex-col h-full">
          <PartBar ariaLabel={`Bill cost of the out-of-formulary brands, ${c.context}`}
            whole={`${lakhs(cov.bill_cost)} bill cost · ${brands}`}
            parts={[
              { key: "matched", label: "Matched", share: cov.matched_cost_pct, valueLabel: lakhs(cov.matched_cost), color: PROPOSED_COL },
              // The rest of the same whole: the complement of the API's matched share.
              { key: "none", label: "No match", share: isNum(cov.matched_cost_pct) ? 100 - cov.matched_cost_pct : null, valueLabel: lakhs(cov.unmatched_cost), color: X_COL },
            ]} />
          <UnmatchedRows rows={un} />
        </div>
      </ChartPanel>
      <CoverageDrawer c={c} cov={cov} dr={dr} title={title} />
    </>
  );
}
