"use client";
// Spend Analysis (Cash & TPA) — the hospitals. With all hospitals shown, the
// tile ranks them by margin missed in rupees, most first, as bars from zero (the ones that fit,
// then "+N more"). With one selected, it shows where that hospital stands among all of them on
// % missed (the OpenPrescribing pattern: every hospital a dot, this one large and labelled). A
// hospital's bar or dot selects it. The drawer has the ranked table with exact rupees and every
// hospital's margin possible as one 100% bar, split into the part lost and the part made.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import { DotStrip } from "@/components/portfolio/ledger/bullets";
import { StackBars } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { SUB } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { fitDomain } from "@/components/portfolio/ledger/scale";
import { useSelectHospital } from "@/context/RegionContext";
import { HOSPITAL_COL, LOSS_COL, USED_COL, type Ctx, type Hospital } from "./context";
import { DataTable, type Col } from "../DataTable";
import { Method } from "./parts";

const nameOf = (h: Hospital) => h.his_name || h.name;
const byRank = (rows: Hospital[]) => [...rows].sort((a, b) => a.rank - b.rank);

/** A % missed on the position axis: its ends are whole numbers ("40%"), a hospital's figure has
 *  two decimals ("42.77%"). */
const pctAxis = (v: number) => (Number.isInteger(v) ? `${v}%` : pct(v));

/** Every hospital ranked by margin missed, exact rupees. A hospital's name selects it. */
export function RankingTable({ c, onPicked }: { c: Ctx; onPicked?: () => void }) {
  const selectHospital = useSelectHospital();
  const rows = byRank(c.d.by_hospital || []);
  const here = rows.find((h) => h.selected);
  const cols: Col<Hospital>[] = [
    { label: "#", render: (h) => h.rank, align: "left" },
    {
      label: "Hospital", align: "left", wrap: true, render: (h) => (
        <button type="button" onClick={() => { selectHospital(h); onPicked?.(); }} title={`${h.name} (${h.plant})`}
          aria-label={h.selected ? `${nameOf(h)}, selected. Show all hospitals` : `Select ${nameOf(h)}`}
          className="text-left underline decoration-dotted underline-offset-2">{nameOf(h)}</button>
      ),
    },
    { label: "Margin earned", render: (h) => rupeesExact(h.actual_margin) },
    { label: "Margin possible", render: (h) => rupeesExact(h.potential_margin) },
    { label: "Margin missed", render: (h) => <b>{rupeesExact(h.margin_loss)}</b> },
    { label: "% missed", render: (h) => pct(h.loss_pct) },
  ];
  return (
    <DrawerSection title="Hospitals, most margin missed first"
      note={<>{here ? <><b>{nameOf(here)}</b> is number {here.rank} of {rows.length}. </> : null}{c.w.rankNote} Click a hospital to select it; click the selected one again for all hospitals.</>}>
      <DataTable rows={rows} rowKey={(h) => h.plant} cols={cols} strong={(h) => h.selected} minWidth={680}
        caption="Hospitals ranked by margin missed" empty={c.w.rankEmpty} />
    </DrawerSection>
  );
}

/** Every hospital's margin possible as one 100% bar: the part lost first, then the part made, so
 *  the lost part is the hospital's % missed; the amount lost follows the bar. */
function LostVsMade({ c, onPicked }: { c: Ctx; onPicked: () => void }) {
  const selectHospital = useSelectHospital();
  const rows = byRank(c.d.by_hospital || []);
  return (
    <DrawerSection title="Each hospital's margin possible: lost and made"
      note={`Each bar is a hospital's margin possible, split into the margin lost and the margin made (actual); the amount lost follows the bar. ${c.who}, ${c.when}. Click a hospital to select it.`}>
      <StackBars ariaLabel={`${c.w.title} by hospital, ${c.when}`} empty={c.w.rankEmpty} asideWidth={84}
        onRow={(plant) => { const h = rows.find((x) => x.plant === plant); if (h) { selectHospital(h); onPicked(); } }}
        segments={[{ key: "loss", label: "Margin missed", color: LOSS_COL }, { key: "base", label: "Margin earned", color: USED_COL }]}
        rows={rows.map((h) => ({
          key: h.plant, label: nameOf(h), selected: h.selected, aside: lakhs(h.margin_loss),
          values: { loss: h.margin_loss, base: h.actual_margin },
        }))} />
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
        { key: "bars", label: "Lost vs made", render: () => <LostVsMade c={c} onPicked={dr.close} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.rankNote}</p>
              <p>With all hospitals shown, the chart ranks them by rupees lost, most first, as bars from zero on one scale. With one hospital selected, it places every hospital on one % missed axis fitted to their figures: the selected one large and labelled with its rank by rupees lost{c.d.network ? ", the dashed line all hospitals together" : ""}.</p>
              <p>A hospital whose brands used made more than the suggested ones would (a negative loss) draws no bar; the figures keep the minus.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function HospitalsTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const selectHospital = useSelectHospital();
  const rows = byRank(c.d.by_hospital || []);
  const ranked = rows.filter((h) => h.lines > 0);
  const here = rows.find((h) => h.selected);
  const title = c.network ? "Margin missed by hospital" : "% missed among hospitals";
  const allUnits = c.d.network && isNum(c.d.network.loss_pct) ? { value: c.d.network.loss_pct, label: "All hospitals" } : null;
  const dots = ranked.filter((h) => isNum(h.loss_pct));
  const caption = here ? `No. ${here.rank} of ${rows.length} by rupees lost` : c.w.rankEmpty;
  const label = c.network
    ? [title, c.when, ...ranked.slice(0, 5).map((h) => `${h.rank}. ${nameOf(h)} ${lakhs(h.margin_loss)}, ${pct(h.loss_pct)} lost`)].join(". ")
    : [title, c.when, here ? `${nameOf(here)} ${pct(here.loss_pct)} of its margin possible lost, ${caption}` : c.w.rankEmpty,
      allUnits ? `All hospitals ${pct(allUnits.value)}` : null].filter(Boolean).join(". ");

  return (
    <>
      <ChartPanel id="hospitals" title={title} context={c.network ? c.when : c.context} accent={HOSPITAL_COL} place={place} source={c.source}
        label={label} interactive onOpen={() => dr.show("ranking")} onInfo={() => dr.show("method")}>
        {c.network ? (
          <RankBars format={lakhs} color={HOSPITAL_COL} ariaLabel={`${c.w.title} by hospital, ${c.when}, most first`} empty={c.w.rankEmpty}
            onMore={() => dr.show("ranking")}
            rows={ranked.map((h) => ({
              key: h.plant, label: nameOf(h), value: h.margin_loss, valueLabel: lakhs(h.margin_loss),
              aside: isNum(h.loss_pct) ? `${pct(h.loss_pct)} lost` : undefined, onClick: () => selectHospital(h),
            }))} />
        ) : dots.length ? (
          <DotStrip format={pctAxis} caption={caption} reference={allUnits}
            ariaLabel={`% missed of every hospital, ${c.when}; ${here ? nameOf(here) : "this hospital"} highlighted`}
            domain={fitDomain([...dots.map((h) => h.loss_pct as number), ...(allUnits ? [allUnits.value] : [])])}
            dots={dots.map((h) => ({ key: h.plant, label: nameOf(h), value: h.loss_pct, selected: h.selected, onClick: () => selectHospital(h) }))} />
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>{c.w.rankEmpty}</p>
        )}
      </ChartPanel>
      <HospitalsDrawer c={c} dr={dr} title={c.network ? title : "Hospitals, most margin missed first"} />
    </>
  );
}
