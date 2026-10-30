"use client";
// Spend Analysis (Cash & TPA) — where the margin missed sits: cash vs TPA
// patients, onco / non-onco / consumables, and inpatient vs outpatient. The tile ranks every
// slice's loss as a bar from zero on ONE scale, so a slice of one cut compares with a slice of
// another; the drawer lists the same slices with exact rupees.
import React from "react";
import { ChartPanel, groupHeads, headH, usePanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RANK_ROW_MIN, RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { CashBlock } from "../api";
import { payerLabel, typeLabel, type Ctx } from "./context";
import { DataTable, type Col } from "../DataTable";
import { Method } from "./parts";

type Slice = { key: string; label: string; b: CashBlock };
type Cut = { key: "payer" | "category" | "type"; name: string; slices: Slice[] };

const payerSlices = (c: Ctx): Slice[] => (c.d.by_payer || []).map((p) => ({ key: p.payer, label: payerLabel(p.payer), b: p }));
const categorySlices = (c: Ctx): Slice[] => (c.d.by_category || []).map((s) => ({ key: s.key, label: s.label, b: s }));
const typeSlices = (c: Ctx): Slice[] => (c.d.by_type || []).map((t) => ({ key: t.type, label: typeLabel(t.type), b: t }));

const cutsOf = (c: Ctx): Cut[] => [
  { key: "payer", name: "Payer", slices: payerSlices(c) },
  { key: "category", name: "Material type", slices: categorySlices(c) },
  { key: "type", name: "Patient type", slices: typeSlices(c) },
];

// The API takes each split over every value of its own filter (and only that one), so its
// slices always add up to the whole for the other filters, whichever value is picked.
const IGNORES = {
  payer: "Both payers, whatever the Payer filter says.",
  category: "Every material type (first digit of the material code), whatever the Material type filter says.",
  type: "Both patient types, whatever the Patient type filter says.",
};

/** A slice's loss and what it is a share of, in words. */
const sliceWords = (r: Slice) =>
  `${r.label} ${lakhs(r.b.margin_loss)} lost${isNum(r.b.loss_pct) ? `, ${pct(r.b.loss_pct)} of ${lakhs(r.b.potential_margin)} possible` : ""}`;

/** The three cuts as one ranking. Each cut adds up to the whole loss, so the cuts are groups
 *  under their names, a hairline apart. Where the panel has no room for the names (a 1440×900
 *  screen fits the seven rows but not the three captions), the rows run in the same order
 *  without them: their labels (Cash, Onco, Inpatient …) say which cut each one is, and every
 *  row stays on the face instead of the last cut going to "+N more". */
function SplitBars({ cuts, color, ariaLabel }: { cuts: Cut[]; color: string; ariaLabel: string }) {
  const room = usePanel()?.size.h ?? Infinity;
  const named: RankRow[] = cuts.flatMap((cut) => cut.slices.map((s) => ({
    key: `${cut.key}:${s.key}`, label: s.label, group: cut.name,
    value: s.b.margin_loss, valueLabel: lakhs(s.b.margin_loss),
    aside: isNum(s.b.loss_pct) ? `${pct(s.b.loss_pct)} of ${lakhs(s.b.potential_margin)}` : "no use",
  })));
  const captions = groupHeads(named).reduce((h, g) => h + headH(g), 0);
  const rows = named.length * RANK_ROW_MIN + captions <= room ? named : named.map((r) => ({ ...r, group: undefined }));
  return <RankBars rows={rows} format={lakhs} color={color} ariaLabel={ariaLabel} />;
}

const sliceCols = (first: string): Col<Slice>[] => [
  { label: first, render: (r) => r.label, align: "left" },
  { label: "Margin earned", render: (r) => rupeesExact(r.b.actual_margin) },
  { label: "Margin possible", render: (r) => rupeesExact(r.b.potential_margin) },
  { label: "Margin missed", render: (r) => <b>{rupeesExact(r.b.margin_loss)}</b> },
  { label: "% missed", render: (r) => pct(r.b.loss_pct) },
  { label: "MRP increase", render: (r) => rupeesExact(r.b.topline_increase) },
  { label: "Qty counted", render: (r) => num(r.b.qty) },
];

function SliceTable({ title, first, note, rows }: { title: string; first: string; note: string; rows: Slice[] }) {
  return (
    <DrawerSection title={title} note={note}>
      <DataTable rows={rows} rowKey={(r) => r.key} cols={sliceCols(first)} caption={`${title}: margin earned, possible and missed`} minWidth={680} />
    </DrawerSection>
  );
}

/** Every split with exact rupees: the Breakdown tab of this tile's drawer and of others. */
export function SliceTables({ c }: { c: Ctx }) {
  return (
    <>
      <SliceTable title="Cash vs TPA" first="Payer" note={IGNORES.payer} rows={payerSlices(c)} />
      <SliceTable title="Onco, non-onco and consumables" first="Material type" note={IGNORES.category} rows={categorySlices(c)} />
      <SliceTable title="Inpatient vs outpatient" first="Patient type" note={IGNORES.type} rows={typeSlices(c)} />
    </>
  );
}

function SplitDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.margin_loss), comparator: `margin missed in the selection, ${pct(h.loss_pct)} of the margin possible` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        { key: "breakdown", label: "Breakdown", render: () => <SliceTables c={c} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>Three cuts of the same margin missed: by payer (cash and insurance (TPA) patients), by material type (the first digit of the material code: 1 onco drugs, 2 other (non-onco) drugs, 3 consumables) and by patient type (IP and OP). Each cut adds up to the whole loss; the cuts are not added to one another.</p>
              <p>{IGNORES.payer} {IGNORES.category} {IGNORES.type}</p>
              <p>Each slice&apos;s margin missed = its margin possible − its margin earned; its % missed = its loss ÷ its margin possible. The bars share one scale from zero, so their lengths compare across slices and cuts.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function SplitTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const cuts = cutsOf(c);
  const title = "Where margin was missed";
  return (
    <>
      <ChartPanel id="split" title={title} context={c.context} accent={c.tone} place={place} source={c.source}
        label={[`${title}: margin missed by payer, material type and patient type`, c.context,
          ...cuts.map((cut) => `${cut.name}: ${cut.slices.map(sliceWords).join("; ")}`)].join(". ")}
        onOpen={() => dr.show("breakdown")} onInfo={() => dr.show("method")}>
        <SplitBars cuts={cuts} color={c.tone} ariaLabel={`Margin missed by payer, material type and patient type, ${c.context}`} />
      </ChartPanel>
      <SplitDrawer c={c} dr={dr} title={title} />
    </>
  );
}
