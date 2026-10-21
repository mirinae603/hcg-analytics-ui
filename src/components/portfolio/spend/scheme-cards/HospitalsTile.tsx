"use client";
// Spend Analysis, Scheme overview — the margin missed hospital by hospital, for the
// same months, patient type and material type (the list ignores the hospital selector).
//   All hospitals: every hospital's margin missed as a bar from zero, most first, the rows that
//                  fit and "+N more"; a row selects that hospital.
//   One hospital:  where its % missed sits among every hospital's (DotStrip): the selected one
//                  large and labelled with its place, all hospitals together a dashed line when
//                  the API sends that figure; a dot selects that hospital.
// The drawer has the exact table, HCG's "Unit Inventory Distribution" bars (each hospital's
// spend on these brands split into the margin missed and what the suggested brands would have
// cost) and the method.
import React from "react";
import { useArmed, INK, SUB, TRACK, EASE, SEL_BG } from "@/components/portfolio/ledger/kit";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { RankBars } from "@/components/portfolio/ledger/bars";
import { DotStrip } from "@/components/portfolio/ledger/bullets";
import { StackBars } from "@/components/portfolio/ledger/charts";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { DrawerSection, useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { fitDomain, niceMax } from "@/components/portfolio/ledger/scale";
import { useSelectHospital } from "@/context/RegionContext";
import type { Filters, Meta, Overview } from "../api";
import { HOSPITAL_COL, LOSS_COL, PROPOSED_COL, MethodTab, WORDS, filterChips, type Scope } from "./context";

type HospitalRow = Overview["by_hospital"][number];

const nameOf = (r: HospitalRow) => r.his_name || r.name;

/** Hospitals named in a tile's accessible name; the drawer has them all. */
const SAID = 5;

function hospitalMethod(): React.ReactNode[] {
  const w = WORDS;
  return [
    "Every hospital for the same months, patient type and material type: this list ignores the hospital selector.",
    `${w.actual} = spend on the brands used; ${w.proposed.toLowerCase()} = the same quantity at the ${w.sug} brand's price; ${w.pct} = the difference ÷ ${w.actual.toLowerCase()}.`,
    `With all hospitals selected the tile ranks every hospital by its ${w.loss.toLowerCase()}, largest first, on one scale from zero; with one hospital selected it places that hospital's ${w.pct} among every hospital's, highest first, and the dashed line is all hospitals together (the ratio of their sums, not an average of the hospitals' %).`,
    `The spend split bars are each hospital's spend on these brands, split into the ${w.loss.toLowerCase()} and what the ${w.sug} brands would have cost; the figure after a bar is the ${w.loss.toLowerCase()}.`,
    "Click a hospital to select it; click the selected one again for all hospitals.",
  ];
}

export function HospitalsTile({ d, meta, filters, scope, place }: {
  d: Overview; meta: Meta; filters: Filters; scope: Scope; place: Place;
}) {
  const drawer = useDrawer();
  const selectHospital = useSelectHospital();
  const w = WORDS;
  const rows = d.by_hospital || [];
  const empty = `No scheme patient got a brand with ${w.aSug} suggestion in this selection.`;
  const title = scope.network ? `${w.loss} by hospital` : "Position among hospitals";

  // One hospital: its place among the hospitals that have a %, highest first.
  const rated = rows.filter((r) => isNum(r.saving_pct));
  const sel = rated.find((r) => r.selected) ?? null;
  const rank = sel ? rated.filter((r) => (r.saving_pct as number) > (sel.saving_pct as number)).length + 1 : null;
  const caption = sel ? `${rank} of ${rated.length}, highest ${w.pct.toLowerCase()} first` : `${scope.where} has none in this selection`;
  const allUnits = d.network && isNum(d.network.saving_pct) ? { value: d.network.saving_pct, label: "All hospitals" } : null;

  const label = scope.network
    ? [`${title}, ${scope.when}, most first`, ...rows.slice(0, SAID).map((r, i) => `${i + 1}. ${nameOf(r)} ${lakhs(r.saving_missed)}, ${pct(r.saving_pct, 1)} ${w.pctWord}`), `${rows.length} hospitals in all`].join(". ")
    : `${title} by ${w.pct}, ${scope.when}. ${sel ? `${nameOf(sel)} ${pct(sel.saving_pct)}, ${caption}` : caption}${allUnits ? `. All hospitals ${pct(allUnits.value)}` : ""}`;

  return (
    <>
      <ChartPanel id="hospitals" title={title} context={scope.network ? `${scope.when} · most first` : `${w.pct} · every hospital · ${scope.when}`}
        accent={HOSPITAL_COL} place={place} label={label} interactive onOpen={() => drawer.show("table")} onInfo={() => drawer.show("method")}>
        {scope.network ? (
          <RankBars format={lakhs} color={HOSPITAL_COL} ariaLabel={`${w.loss} by hospital, ${scope.when}, most first`} empty={empty}
            onMore={() => drawer.show("table")}
            rows={rows.map((r) => ({
              key: r.plant, label: nameOf(r), value: r.saving_missed, valueLabel: lakhs(r.saving_missed),
              aside: isNum(r.saving_pct) ? `${pct(r.saving_pct, 1)} ${w.pctWord}` : undefined,
              selected: r.selected, onClick: () => selectHospital(r),
            }))} />
        ) : rated.length ? (
          <DotStrip ariaLabel={`${w.pct} of every hospital, ${scope.when}`} caption={caption} format={(v) => pct(v)} reference={allUnits}
            domain={fitDomain([...rated.map((r) => r.saving_pct as number), ...(allUnits ? [allUnits.value] : [])], { cap: 100 })}
            dots={rated.map((r) => ({ key: r.plant, label: nameOf(r), value: r.saving_pct, selected: r.selected, onClick: () => selectHospital(r) }))} />
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>{empty}</p>
        )}
      </ChartPanel>

      <DetailDrawer open={drawer.open} onClose={drawer.close} initialTab={drawer.tab} size="wide"
        eyebrow={`${w.section} · Overview`} title={`${w.loss} by hospital`}
        source="computed" asOf={scope.asOf} filters={filterChips(filters, { ...scope, where: "Every hospital" }, meta)}
        tabs={[
          { key: "table", label: "Hospitals", render: () => <HospitalTable d={d} onPicked={drawer.close} /> },
          {
            key: "split", label: "Spend split", render: () => (
              <DrawerSection title="Spend on these brands, hospital by hospital"
                note={`HCG's Unit Inventory Distribution: each bar is one hospital's spend on these brands (100%), split into the ${w.loss.toLowerCase()} (from the left: its ${w.pct}) and what the ${w.sug} brands would have cost. The figure after it is the ${w.loss.toLowerCase()}. Click a hospital to select it.`}>
                <StackBars ariaLabel={`${w.loss} by hospital, ${scope.when}, most first`} empty={empty} asideWidth={84}
                  onRow={(plant) => { const r = rows.find((x) => x.plant === plant); if (r) { drawer.close(); selectHospital(r); } }}
                  segments={[{ key: "loss", label: w.loss, color: LOSS_COL }, { key: "base", label: w.proposed, color: PROPOSED_COL }]}
                  rows={rows.map((r) => ({ key: r.plant, label: nameOf(r), selected: r.selected, aside: lakhs(r.saving_missed), values: { loss: r.saving_missed, base: r.suggested_value } }))} />
              </DrawerSection>
            ),
          },
          { key: "method", label: "Method", render: () => <MethodTab d={d} meta={meta} lines={hospitalMethod()} /> },
        ]} />
    </>
  );
}

/** Every hospital with its exact figures, most missed first; a row selects the hospital
 *  (`onPicked` runs first, so the drawer it sits in closes before the page reloads). */
export function HospitalTable({ d, onPicked }: { d: Overview; onPicked: () => void }) {
  const on = useArmed();
  const selectHospital = useSelectHospital();
  const w = WORDS;
  const rows = d.by_hospital || [];
  const vmax = niceMax(Math.max(1, ...rows.map((r) => Math.max(0, r.saving_missed))));
  const cols = "28px minmax(0,1.3fr) minmax(0,.7fr) 128px 128px 64px 128px";
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>No scheme patient got a brand with {w.aSug} suggestion in this selection.</p>;
  return (
    <DrawerSection title="Every hospital" note={`Exact rupees at HCG's FY list prices. The bar is the ${w.loss.toLowerCase()}, on one scale from 0 to ${lakhs(vmax)}.`}>
      <div className="overflow-x-auto -mx-1"><div className="flex flex-col" style={{ minWidth: 760 }}>
        <div className="grid gap-3 px-2 pb-2 text-[10px] font-semibold uppercase" style={{ gridTemplateColumns: cols, color: SUB, letterSpacing: ".08em" }}>
          <span>#</span><span>Hospital</span><span>{w.loss}</span><span className="text-right">{w.actual}</span>
          <span className="text-right">{w.proposed}</span><span className="text-right">{w.pct}</span><span className="text-right">{w.loss}</span>
        </div>
        {rows.map((r, i) => (
          <button key={r.plant} type="button" onClick={() => { onPicked(); selectHospital(r); }} title={`${r.name} (${r.plant})`}
            aria-label={`${r.his_name || r.name}: ${w.loss.toLowerCase()} ${rupeesExact(r.saving_missed)}, ${pct(r.saving_pct)}. ${r.selected ? "Selected; click for all hospitals" : "Select this hospital"}`}
            className="grid items-center gap-3 px-2 py-[7px] rounded-lg text-left transition-colors hover:bg-[#F5F1E7]"
            style={{ gridTemplateColumns: cols, background: r.selected ? SEL_BG : undefined }}>
            <span className="text-[11px] tabular-nums" style={{ color: SUB }}>{r.rank}</span>
            <span className="text-[12.5px] truncate" style={{ color: INK, fontWeight: r.selected ? 700 : 500 }}>{r.his_name || r.name}</span>
            <span className="relative h-[7px] rounded-full overflow-hidden" style={{ background: TRACK }}>
              <span className="absolute left-0 top-0 bottom-0 rounded-full"
                style={{ width: on ? `${(Math.max(0, r.saving_missed) / vmax) * 100}%` : "0%", background: HOSPITAL_COL, transition: `width 600ms ${EASE} ${100 + Math.min(i, 20) * 25}ms` }} />
            </span>
            <span className="text-[12px] tabular-nums text-right" style={{ color: INK }}>{rupeesExact(r.used_value)}</span>
            <span className="text-[12px] tabular-nums text-right" style={{ color: SUB }}>{rupeesExact(r.suggested_value)}</span>
            <span className="text-[12px] tabular-nums text-right" style={{ color: SUB }}>{pct(r.saving_pct)}</span>
            <span className="text-[12.5px] font-bold tabular-nums text-right" style={{ color: INK }}>{rupeesExact(r.saving_missed)}</span>
          </button>
        ))}
      </div></div>
    </DrawerSection>
  );
}
