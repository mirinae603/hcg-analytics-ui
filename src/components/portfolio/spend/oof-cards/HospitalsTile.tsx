"use client";
// Spend Analysis (Out of formulary) — every hospital ranked by margin missed, most first, as
// bars from one zero line: a hospital whose brands bought earned more than their suggestions
// has a negative margin missed (HCG's net figure), drawn left of zero in the margin-earned
// colour and ranked last. With one hospital selected the same ranking shows it highlighted,
// where it stands among them. A hospital's bar selects it (the selected one again: all
// hospitals). The drawer has the ranking with exact rupees and HCG's own figure beside ours.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { useSelectHospital } from "@/context/RegionContext";
import { DataTable, type Col } from "../DataTable";
import { HOSPITAL_COL, USED_COL, Method, ofPossible, type Ctx, type Hospital } from "./context";

const nameOf = (h: Hospital) => h.his_name || h.name;
const byRank = (rows: Hospital[]) => [...rows].sort((a, b) => a.rank - b.rank);
/** A hospital on the ranking: any purchase in the selection, or a figure in HCG's sheet. */
const ranked = (h: Hospital) => h.lines > 0 || (h.hcg_loss != null && h.hcg_loss !== 0);

/** Every hospital ranked by margin missed, exact rupees, with HCG's own figure where it has
 *  one. A hospital's name selects it. */
export function RankingTable({ c, onPicked }: { c: Ctx; onPicked?: () => void }) {
  const selectHospital = useSelectHospital();
  const rows = byRank(c.d.by_hospital || []).filter(ranked);
  const here = rows.find((h) => h.selected);
  const hcg = rows.some((h) => h.hcg_loss != null);
  const cols: Col<Hospital>[] = [
    { label: "#", render: (h) => h.rank, align: "left" },
    {
      label: "Hospital", align: "left", wrap: true, render: (h) => (
        <button type="button" onClick={() => { selectHospital(h); onPicked?.(); }} title={`${h.name} (${h.plant})`}
          aria-label={h.selected ? `${nameOf(h)}, selected. Show all hospitals` : `Select ${nameOf(h)}`}
          className="text-left underline decoration-dotted underline-offset-2">{nameOf(h)}</button>
      ),
    },
    { label: "Spent", render: (h) => rupeesExact(h.purchase_value) },
    { label: "Margin earned", render: (h) => rupeesExact(h.actual_margin) },
    { label: "Margin possible", render: (h) => rupeesExact(h.potential_margin) },
    { label: "Margin missed", render: (h) => <b>{rupeesExact(h.margin_loss)}</b> },
    { label: "% missed", render: (h) => pct(h.loss_pct) },
    ...(hcg ? [{ label: "HCG's sheet", render: (h: Hospital) => rupeesExact(h.hcg_loss) }] : []),
  ];
  return (
    <DrawerSection title="Hospitals, most margin missed first"
      note={<>{here ? <><b>{nameOf(here)}</b> is number {here.rank} of {rows.length}. </> : null}{c.w.rankNote}{hcg ? " HCG's sheet = the margin missed in HCG's own out-of-formulary Summary for the same months." : ""} Click a hospital to select it; click the selected one again for all hospitals.</>}>
      <DataTable rows={rows} rowKey={(h) => h.plant} cols={cols} strong={(h) => h.selected} minWidth={hcg ? 820 : 720}
        caption="Hospitals ranked by out-of-formulary margin missed" empty={`${c.w.none}.`} />
    </DrawerSection>
  );
}

function HospitalsDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.when}`}
      kpi={{ value: rupeesExact(h.margin_loss), comparator: `margin missed, ${c.where}; ${pct(h.loss_pct)} of the margin possible` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        { key: "ranking", label: "Ranking", render: () => <RankingTable c={c} onPicked={dr.close} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.rankNote}</p>
              <p>On the chart every hospital&apos;s margin missed is a bar from one zero line on one scale, most first; a negative one runs left of zero in the margin-earned colour. The figure after each bar is its % of the margin possible{c.d.network?.loss_pct != null ? `; all hospitals together miss ${pct(c.d.network.loss_pct)}` : ""}.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function HospitalsTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const selectHospital = useSelectHospital();
  const rows = byRank(c.d.by_hospital || []).filter(ranked);
  const here = rows.find((h) => h.selected);
  const title = "Margin missed by hospital";
  const context = here ? `${nameOf(here)}: No. ${here.rank} of ${rows.length}` : c.when;
  return (
    <>
      <ChartPanel id="hospitals" title={title} context={context} accent={HOSPITAL_COL} place={place} source={c.source}
        label={[title, c.when, here ? `${nameOf(here)} is number ${here.rank} of ${rows.length}` : null,
          ...rows.slice(0, 5).map((h) => `${h.rank}. ${nameOf(h)} ${lakhs(h.margin_loss)}, ${pct(h.loss_pct)} missed`)].filter(Boolean).join(". ")}
        interactive onOpen={() => dr.show("ranking")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={HOSPITAL_COL} signed negativeColor={USED_COL} onMore={() => dr.show("ranking")}
          ariaLabel={`Out-of-formulary margin missed by hospital, ${c.when}, most first`} empty={`${c.w.none}.`}
          rows={rows.map((h) => ({
            key: h.plant, label: nameOf(h), value: h.margin_loss, valueLabel: lakhs(h.margin_loss),
            aside: ofPossible(h.loss_pct), selected: h.selected, onClick: () => selectHospital(h),
          }))} />
      </ChartPanel>
      <HospitalsDrawer c={c} dr={dr} title={title} />
    </>
  );
}
