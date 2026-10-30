"use client";
// Spend Analysis (Out of formulary) — the headline tile. What was spent on brands bought out of
// formulary, on one line; under it HCG's "actual | proposed" pair drawn as a bridge: the margin
// the suggested brands would have made, less the margin missed (HCG's NET figure: a brand that
// earns more than its suggestion lowers it), is the margin the brands bought made. Under the
// bridge, HCG's own figure from its out-of-formulary sheet for the same hospitals and months,
// when it has one, and whether ours is the same. The drawer carries the written summary, the
// exact figures, HCG's sheet beside ours, every month, every hospital and the method.
import React from "react";
import { ChartPanel, LinkButton, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { Waterfall, type WaterStep } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { TONE_COLOR } from "@/components/portfolio/ledger/status";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { HcgCheck, View } from "../api";
import { lossMethod, plural } from "../shared";
import { DataTable, type Col } from "../DataTable";
import { LOSS_COL, OOF_COL, PROPOSED_COL, RATE_COL, USED_COL, Method, WORDS, hcgVerdict, prevMonth, type Ctx, type Month } from "./context";
import { MonthPanel } from "./MonthTile";
import { RankingTable } from "./HospitalsTile";


/** The tile's figures in sentences, for the drawer's "In brief". */
function brief(c: Ctx, prev: Month | null): string[] {
  const h = c.d.headline;
  if (!h.lines) return [`${c.w.none} at ${c.where}, ${c.when}.`];
  return [
    `At ${c.where}, ${c.when}, HCG spent ${rupeesExact(h.purchase_value)} on ${plural(h.brands, "brand")} the Item Master flags out of formulary, from ${plural(h.vendors, "vendor")}${c.network ? ` at ${plural(h.hospitals, "hospital")}` : ""}.`,
    `Those brands earn ${rupeesExact(h.actual_margin)} of margin; the brands HCG suggests would earn ${rupeesExact(h.potential_margin)} on the same units. The margin missed is ${rupeesExact(h.margin_loss)}, ${pct(h.loss_pct)} of the margin possible.`,
    ...(h.better_loss < 0 ? [`That is net, as HCG counts it: ${rupeesExact(h.gain_loss)} missed where the suggested brand earns more, less ${rupeesExact(-h.better_loss)} where the brand bought earns more.`] : []),
    ...(prev ? [`In ${prev.label} it was ${rupeesExact(prev.margin_loss)}, ${pct(prev.loss_pct)} of the margin possible.`] : []),
    ...(c.d.hcg ? [`HCG's own out-of-formulary sheet has ${rupeesExact(c.d.hcg.margin_loss)} for the same hospitals and months: ${hcgVerdict(c.d.hcg.matches, c.d.hcg.diff, rupeesExact)}.`] : []),
  ];
}

function figures(c: Ctx): KeyFigure[] {
  const h = c.d.headline;
  return [
    { label: "Spent on out-of-formulary brands", value: rupeesExact(h.purchase_value), color: OOF_COL, note: `${num(h.lines)} receipts; ${rupeesExact(h.value_after_discount)} after discount` },
    { label: "Margin earned", value: rupeesExact(h.actual_margin), color: USED_COL,
      note: `on the brands bought${isNum(h.used_margin_pct) ? `, ${pct(h.used_margin_pct)} of their MRP` : ""}` },
    { label: "Margin possible", value: rupeesExact(h.potential_margin), color: PROPOSED_COL,
      note: `with the ${c.w.sug}${isNum(h.suggested_margin_pct) ? `, ${pct(h.suggested_margin_pct)} of their MRP` : ""}` },
    { label: "Margin missed", value: rupeesExact(h.margin_loss), color: LOSS_COL, note: "possible − earned, net" },
    { label: "% missed", value: pct(h.loss_pct), color: RATE_COL, note: "margin missed ÷ margin possible" },
    { label: "Missed where the suggestion earns more", value: rupeesExact(h.gain_loss), note: "the lines where switching gains" },
    { label: "Where the brand bought earns more", value: rupeesExact(h.better_loss), note: "lowers the margin missed" },
    { label: "Spent on brands with a suggestion", value: rupeesExact(h.counted_value), note: "the purchases the margins count" },
    { label: "MRP excl GST · brands bought", value: rupeesExact(h.used_mrp_value), note: "× the units counted" },
    { label: "MRP excl GST · suggested brands", value: rupeesExact(h.suggested_mrp_value), note: "× the same units" },
    { label: "Units", value: num(h.qty) },
    { label: "Brands · vendors · hospitals", value: `${num(h.brands)} · ${num(h.vendors)} · ${num(h.hospitals)}`, note: "with any purchase in the selection" },
  ];
}

/** HCG's own sheet beside ours: the same four figures, and the difference in the loss. */
function HcgTable({ c, hcg }: { c: Ctx; hcg: HcgCheck }) {
  const h = c.d.headline;
  type Row = { key: string; label: string; earned: number; possible: number; missed: number; pct: number | null };
  const rows: Row[] = [
    { key: "ours", label: "The app", earned: h.actual_margin, possible: h.potential_margin, missed: h.margin_loss, pct: h.loss_pct },
    { key: "hcg", label: "HCG's sheet", earned: hcg.actual_margin, possible: hcg.potential_margin, missed: hcg.margin_loss, pct: hcg.loss_pct },
  ];
  const cols: Col<Row>[] = [
    { label: "", align: "left", render: (r) => r.label },
    { label: "Margin earned", render: (r) => rupeesExact(r.earned) },
    { label: "Margin possible", render: (r) => rupeesExact(r.possible) },
    { label: "Margin missed", render: (r) => <b>{rupeesExact(r.missed)}</b> },
    { label: "% missed", render: (r) => pct(r.pct) },
  ];
  return (
    <>
      <DrawerSection title="HCG's sheet beside ours"
        note={`HCG's 'Summary' sheet of its monthly out-of-formulary workbook (its 'Margin Value Difference'), for the same ${plural(hcg.centres, "hospital")} and ${hcg.months.length === 1 ? "month" : "months"}. Difference in the margin missed: ${rupeesExact(hcg.diff)} (${hcgVerdict(hcg.matches, hcg.diff, rupeesExact)}; within ₹1 a hospital and month counts as the same).`}>
        <DataTable rows={rows} rowKey={(r) => r.key} cols={cols} strong={(r) => r.key === "hcg"} caption="The app's out-of-formulary figures beside HCG's own sheet" />
      </DrawerSection>
      <RankingTable c={c} />
    </>
  );
}

function MarginDrawer({ c, dr }: { c: Ctx; dr: DrawerCtl }) {
  const h = c.d.headline;
  const prev = prevMonth(c.d);
  const goTo = (v: View) => { dr.close(); c.onOpen(v); };
  const method = lossMethod("oof");
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${c.w.title} · ${c.where}`}
      kpi={{
        value: rupeesExact(h.margin_loss),
        comparator: h.lines ? `${pct(h.loss_pct)} of the margin possible, ${rupeesExact(h.potential_margin)}` : c.w.none,
        delta: prev ? { value: h.margin_loss - prev.margin_loss, unit: "rs", goodWhen: "down", vsLabel: `vs ${prev.label}` } : undefined,
      }}
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
              <DrawerSection title="Key figures" note="Exact rupees for the selection, as HCG's sheets carry them.">
                <KeyFigures figures={figures(c)} />
              </DrawerSection>
              <DrawerSection title="Behind the figures">
                <div className="flex flex-wrap gap-2">
                  <LinkButton onClick={() => goTo("items")}>Brands behind it</LinkButton>
                  <LinkButton onClick={() => goTo("vendors")}>By vendor</LinkButton>
                </div>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "hcg", label: "As in HCG sheet", render: () => (c.d.hcg ? <HcgTable c={c} hcg={c.d.hcg} /> : (
            <DrawerSection title="HCG's sheet">
              <p className="text-[12.5px] leading-relaxed" style={{ color: SUB }}>
                HCG&apos;s own figure is not shown for this selection: its sheet is per hospital and month only, so it has none under a material type or brand filter, nor for a month it has not sent. The Method tab says which applies.
              </p>
            </DrawerSection>
          )),
        },
        { key: "trend", label: "Trend", render: () => <MonthPanel c={c} /> },
        { key: "hospitals", label: "Hospitals", render: () => <RankingTable c={c} onPicked={dr.close} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{method.basis}</p>
              <p>{method.formula}</p>
              <p>Spent = Base Price × units of every receipt, whether or not it has a suggested brand (HCG&apos;s purchase value); the margins count only the receipts with one.</p>
              <p>There is no budget for this figure: the margin possible is what it is compared with. On the chart the margin possible runs from zero, the margin missed is taken off it, and what is left is the margin earned (a negative margin missed adds, in green). With one month selected, the header compares with the month before.</p>
            </Method>
          ),
        },
      ]} />
  );
}

/** The line over the bridge: what was spent, on how many brands, from how many vendors. */
function SpentLine({ c }: { c: Ctx }) {
  const h = c.d.headline;
  return (
    <p className="flex-shrink-0 truncate text-[12px] pb-1" style={{ color: SUB }} title={`${rupeesExact(h.purchase_value)} spent on out-of-formulary brands`}>
      <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" aria-hidden="true" style={{ background: OOF_COL }} />
      Spent <b className="tabular-nums" style={{ color: INK }}>{lakhs(h.purchase_value)}</b> on {plural(h.brands, "brand")} · {plural(h.vendors, "vendor")}
    </p>
  );
}

/** The line under the bridge: HCG's own figure for the selection, and whether ours is the same. */
function HcgLine({ hcg }: { hcg: HcgCheck }) {
  return (
    <p className="flex-shrink-0 truncate text-[11.5px] pt-1 tabular-nums" style={{ color: SUB }} title={`HCG's sheet ${rupeesExact(hcg.margin_loss)}: ${hcgVerdict(hcg.matches, hcg.diff, rupeesExact)}`}>
      HCG&apos;s sheet <b style={{ color: INK }}>{lakhs(hcg.margin_loss)}</b>
      <span className="font-semibold" style={{ color: TONE_COLOR[hcg.matches ? "good" : "bad"] }}> · {hcg.matches ? "✓ " : ""}{hcgVerdict(hcg.matches, hcg.diff, lakhs)}</span>
    </p>
  );
}

export function MarginTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const hcg = c.d.hcg;
  const prev = prevMonth(c.d);
  const title = "Margin: possible → earned";
  const steps: WaterStep[] = [
    { key: "proposed", label: "Margin possible", value: h.potential_margin, kind: "total", color: PROPOSED_COL, valueLabel: lakhs(h.potential_margin), note: "suggested brands" },
    // Earned − possible is minus the loss: the API's net loss, never a recomputed one.
    { key: "loss", label: "Margin missed", value: -h.margin_loss, kind: "delta", color: LOSS_COL, valueLabel: lakhs(-h.margin_loss), note: `${pct(h.loss_pct)} missed` },
    { key: "actual", label: "Margin earned", value: h.actual_margin, kind: "total", color: USED_COL, valueLabel: lakhs(h.actual_margin), note: "brands bought" },
  ];
  return (
    <>
      <ChartPanel id="margin" title={title} context={c.context} accent={OOF_COL} place={place} source={c.source}
        label={h.lines ? [
          `${WORDS.section} margin, ${c.context}`,
          `spent ${lakhs(h.purchase_value)} on ${plural(h.brands, "brand")}`,
          `margin possible ${lakhs(h.potential_margin)}, margin missed ${lakhs(h.margin_loss)} (${pct(h.loss_pct)}), margin earned ${lakhs(h.actual_margin)}`,
          prev ? `${prev.label}: ${lakhs(prev.margin_loss)} missed, ${pct(prev.loss_pct)}` : null,
          hcg ? `HCG's sheet ${lakhs(hcg.margin_loss)}, ${hcgVerdict(hcg.matches, hcg.diff, lakhs)}` : null,
        ].filter(Boolean).join(". ") : `${WORDS.section} margin, ${c.context}. ${c.w.none}`}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        {h.lines ? (
          <div className="flex flex-col h-full">
            <SpentLine c={c} />
            <PanelPart>
              <Waterfall steps={steps} format={lakhs} ariaLabel={`${WORDS.section} margin, ${c.context}: possible, less the margin missed, is the margin earned`} />
            </PanelPart>
            {hcg && <HcgLine hcg={hcg} />}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>{c.w.none}.</p>
        )}
      </ChartPanel>
      <MarginDrawer c={c} dr={dr} />
    </>
  );
}
