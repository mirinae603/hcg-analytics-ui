"use client";
// Spend Analysis (Cash & TPA / Out of formulary) — the MRP the margins are earned on: the MRP
// value of the brands used against the MRP value of the suggested (or matched formulary)
// brands on the same qty, two bars from zero on one scale. Each carries its margin % (HCG's S6:
// margin ÷ MRP value) and the second the MRP increase the switch would bring.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { isNum, lakhs, pct, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { PROPOSED_COL, USED_COL, type Ctx } from "./context";
import { Method } from "./parts";
import { SliceTables } from "./SplitTile";

/** "margin 23.45% of MRP", when the API sends the margin %. */
const marginOf = (v: number | null | undefined) => (isNum(v) ? `margin ${pct(v)} of MRP` : undefined);

function MrpDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  const marginNote = (v: number | null | undefined, what: string) => (isNum(v) ? `${what} margin ${pct(v)} of it` : "MRP excl GST × qty");
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.topline_increase), comparator: `MRP increase with the ${c.w.sug}, ${c.when}` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <DrawerSection title="Key figures" note="Exact rupees for the selection; MRP excl GST × qty.">
              <KeyFigures figures={[
                { label: `MRP · ${c.w.used}`, value: rupeesExact(h.used_mrp_value), color: USED_COL, note: marginNote(h.used_margin_pct, "actual") },
                { label: `MRP · ${c.w.sug}`, value: rupeesExact(h.suggested_mrp_value), color: PROPOSED_COL, note: marginNote(h.suggested_margin_pct, "proposed") },
                { label: "MRP increase", value: rupeesExact(h.topline_increase), note: c.w.increaseNote },
                { label: "Qty counted", value: num(h.qty), note: `${num(h.lines)} sales lines` },
                { label: "Margin earned", value: rupeesExact(h.actual_margin), color: USED_COL, note: `on the ${c.w.used}` },
                { label: "Margin possible", value: rupeesExact(h.potential_margin), color: PROPOSED_COL, note: `with the ${c.w.sug}` },
              ]} />
            </DrawerSection>
          ),
        },
        { key: "breakdown", label: "Breakdown", render: () => <SliceTables c={c} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              {c.kind === "oof" ? (
                <p>MRP value = MRP excl GST × qty. For the out-of-formulary brands it is the bill&apos;s MRP excl GST (they have no FY list price; the GST is the matched brand&apos;s); for the matched formulary brands, their list MRP excl GST on the same qty.</p>
              ) : (
                <p>MRP value = MRP excl GST (MRP ÷ (1 + GST%)) × the qty counted, from HCG&apos;s FY price list: for the brands used, and for the {c.w.sug} on the same qty.</p>
              )}
              <p>MRP increase = {c.w.increaseNote}: the revenue HCG would also gain with the switch, beside the margin.</p>
              <p>Margin % = margin ÷ MRP value, as in HCG&apos;s S6 Summary: the margin earned on the MRP of the brands used, the margin possible on the MRP of the {c.w.sug}.</p>
              <p>On the chart both bars start from zero on one scale.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function MrpTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const title = `MRP value: ${c.w.versus}`;
  const increase = `${withSign(h.topline_increase, lakhs)} MRP`;
  return (
    <>
      <ChartPanel id="mrp" title={title} context={c.context} accent={USED_COL} place={place} source={c.source}
        label={[
          `${title}, excl GST`, c.context,
          `${c.w.usedShort} ${lakhs(h.used_mrp_value)}${marginOf(h.used_margin_pct) ? `, ${marginOf(h.used_margin_pct)}` : ""}`,
          `${c.w.sugShort} ${lakhs(h.suggested_mrp_value)}${marginOf(h.suggested_margin_pct) ? `, ${marginOf(h.suggested_margin_pct)}` : ""}`,
          `${increase} with the switch`,
        ].join(". ")}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={USED_COL} ariaLabel={`MRP value excl GST, ${c.w.versus}, ${c.context}`}
          rows={[
            { key: "used", label: c.w.usedShort, sub: marginOf(h.used_margin_pct), value: h.used_mrp_value, valueLabel: lakhs(h.used_mrp_value), color: USED_COL },
            { key: "sug", label: c.w.sugShort, sub: marginOf(h.suggested_margin_pct), value: h.suggested_mrp_value, valueLabel: lakhs(h.suggested_mrp_value), aside: increase, color: PROPOSED_COL },
          ]} />
      </ChartPanel>
      <MrpDrawer c={c} dr={dr} title="MRP value" />
    </>
  );
}
