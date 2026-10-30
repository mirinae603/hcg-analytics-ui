"use client";
// Spend Analysis (Generic vs branded) — every hospital ranked by what its branded purchases cost
// above the cheapest generic of the same product, as bars from zero; its % branded under each
// figure. With one hospital selected the ranking shows it highlighted. A hospital's bar selects
// it (the selected one again: all hospitals). The drawer has the ranking with exact rupees.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { useSelectHospital } from "@/context/RegionContext";
import { DataTable, type Col } from "../DataTable";
import { HOSPITAL_COL, GENERIC_SOURCE, Method, type Ctx, type Data } from "./context";

type Hospital = Data["by_hospital"][number];
const byRank = (rows: Hospital[]) => [...rows].sort((a, b) => a.rank - b.rank);
const NOTE = "Every hospital for the same months and material type: this list ignores the hospital selector. Each hospital's branded purchases are set against the cheapest generic of the same product that month, bought at any hospital.";

function RankingTable({ c, onPicked }: { c: Ctx; onPicked?: () => void }) {
  const selectHospital = useSelectHospital();
  const rows = byRank(c.d.by_hospital || []);
  const here = rows.find((h) => h.selected);
  const cols: Col<Hospital>[] = [
    { label: "#", render: (h) => h.rank, align: "left" },
    {
      label: "Hospital", align: "left", wrap: true, render: (h) => (
        <button type="button" onClick={() => { selectHospital(h); onPicked?.(); }} title={`${h.name} (${h.plant})`}
          aria-label={h.selected ? `${h.name}, selected. Show all hospitals` : `Select ${h.name}`}
          className="text-left underline decoration-dotted underline-offset-2">{h.name}</button>
      ),
    },
    { label: "Generic", render: (h) => rupeesExact(h.generic_value) },
    { label: "Branded", render: (h) => rupeesExact(h.branded_value) },
    { label: "% branded", render: (h) => pct(h.branded_pct) },
    { label: "Above the cheapest generic", render: (h) => <b>{rupeesExact(h.extra_vs_generic)}</b> },
    { label: "% above", render: (h) => pct(h.extra_vs_generic_pct) },
  ];
  return (
    <DrawerSection title="Hospitals, most branded cost above generic first"
      note={<>{here ? <><b>{here.name}</b> is number {here.rank} of {rows.length}. </> : null}{NOTE} Click a hospital to select it; click the selected one again for all hospitals.</>}>
      <DataTable rows={rows} rowKey={(h) => h.plant} cols={cols} strong={(h) => h.selected} minWidth={860}
        caption="Hospitals ranked by what branded purchases cost above the cheapest generic" empty={`${c.w.none}.`} />
    </DrawerSection>
  );
}

function HospitalsDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const rows = c.d.by_hospital || [];
  const b = rows.find((x) => x.selected) ?? c.d.headline;
  const who = rows.find((x) => x.selected)?.name ?? "every hospital together";
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.when}`}
      kpi={{ value: rupeesExact(b.extra_vs_generic), comparator: `branded above the cheapest generic, ${who}: ${pct(b.extra_vs_generic_pct)} of the ${rupeesExact(b.compared_value)} branded value compared, ${c.when}` }}
      source={GENERIC_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        { key: "ranking", label: "Ranking", render: () => <RankingTable c={c} onPicked={dr.close} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{NOTE}</p>
              <p>On the chart every hospital&apos;s figure is a bar from zero on one scale, most first; the % after it is the branded share of what that hospital bought.</p>
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
  const here = rows.find((h) => h.selected);
  const title = "Branded above generic, by hospital";
  return (
    <>
      <ChartPanel id="hospitals" title={title} context={here ? `${here.name}: No. ${here.rank} of ${rows.length}` : c.when} accent={HOSPITAL_COL} place={place} source={GENERIC_SOURCE}
        label={[title, c.when, here ? `${here.name} is number ${here.rank} of ${rows.length}` : null,
          ...rows.slice(0, 5).map((h) => `${h.rank}. ${h.name} ${lakhs(h.extra_vs_generic)}, ${pct(h.branded_pct, 1)} branded`)].filter(Boolean).join(". ")}
        interactive onOpen={() => dr.show("ranking")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={HOSPITAL_COL} onMore={() => dr.show("ranking")}
          ariaLabel={`What branded purchases cost above the cheapest generic, by hospital, ${c.when}, most first`} empty={`${c.w.none}.`}
          rows={rows.map((h) => ({
            key: h.plant, label: h.name, value: h.extra_vs_generic, valueLabel: lakhs(h.extra_vs_generic),
            aside: `${pct(h.branded_pct, 1)} branded`, selected: h.selected, onClick: () => selectHospital(h),
          }))} />
      </ChartPanel>
      <HospitalsDrawer c={c} dr={dr} title={title} />
    </>
  );
}
