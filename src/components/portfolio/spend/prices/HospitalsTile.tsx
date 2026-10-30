"use client";
// Spend Analysis (Prices) — every hospital ranked by what it paid above the cheapest price ANY
// hospital paid for the same product in the selection (so the hospitals add up to the network's
// figure), as bars from zero; its % of what it paid under each figure. With one hospital
// selected the ranking shows it highlighted, where it stands. A hospital's bar selects it (the
// selected one again: all hospitals). The drawer has the ranking with exact rupees.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { useSelectHospital } from "@/context/RegionContext";
import type { PriceHospital } from "../api";
import { DataTable, type Col } from "../DataTable";
import { times } from "../insights";
import { HOSPITAL_COL, PRICES_SOURCE, Method, type Ctx } from "./context";

const byRank = (rows: PriceHospital[]) => [...rows].sort((a, b) => a.rank - b.rank);
const NOTE = "Every hospital for the same months and material type, each against the cheapest unit price any hospital paid for the same product: this list ignores the hospital selector, and its rows add up to all hospitals' figure.";

function RankingTable({ c, onPicked }: { c: Ctx; onPicked?: () => void }) {
  const selectHospital = useSelectHospital();
  const rows = byRank(c.d.by_hospital || []);
  const here = rows.find((h) => h.selected);
  const cols: Col<PriceHospital>[] = [
    { label: "#", render: (h) => h.rank, align: "left" },
    {
      label: "Hospital", align: "left", wrap: true, render: (h) => (
        <button type="button" onClick={() => { selectHospital(h); onPicked?.(); }} title={`${h.name} (${h.plant})`}
          aria-label={h.selected ? `${h.name}, selected. Show all hospitals` : `Select ${h.name}`}
          className="text-left underline decoration-dotted underline-offset-2">{h.name}</button>
      ),
    },
    { label: "Paid", render: (h) => rupeesExact(h.value) },
    { label: "At the cheapest", render: (h) => rupeesExact(h.at_cheapest) },
    { label: "Paid above it", render: (h) => <b>{rupeesExact(h.extra_paid)}</b> },
    { label: "% above", render: (h) => pct(h.extra_pct) },
    { label: "Price index", render: (h) => times(h.price_index) },
    { label: "Products", render: (h) => num(h.molecules) },
  ];
  return (
    <DrawerSection title="Hospitals, most paid above the cheapest first"
      note={<>{here ? <><b>{here.name}</b> is number {here.rank} of {rows.length}. </> : null}{NOTE} Click a hospital to select it; click the selected one again for all hospitals.</>}>
      <DataTable rows={rows} rowKey={(h) => h.plant} cols={cols} strong={(h) => h.selected} minWidth={860}
        caption="Hospitals ranked by what they paid above the cheapest price any hospital paid" empty={`${c.w.none}.`} />
    </DrawerSection>
  );
}

function HospitalsDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  const rows = c.d.by_hospital || [];
  const here = rows.find((x) => x.selected);
  // The selected hospital against the cheapest any hospital paid (its row), else every hospital
  // together (the ranking's rows add up to it).
  const kpi = here
    ? { value: rupeesExact(here.extra_paid), comparator: `${here.name} paid above the cheapest any hospital paid, ${pct(here.extra_pct)} of what it paid; No. ${here.rank} of ${rows.length}, ${c.when}` }
    : { value: rupeesExact(h.extra_paid_vs_cheapest), comparator: `paid above the cheapest by every hospital together, ${pct(h.extra_pct)} of the ${rupeesExact(h.compared_value)} compared, ${c.when}` };
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.when}`} kpi={kpi}
      source={PRICES_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        { key: "ranking", label: "Ranking", render: () => <RankingTable c={c} onPicked={dr.close} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{NOTE}</p>
              <p>On the chart every hospital&apos;s figure is a bar from zero on one scale, most first; the % after it is of what that hospital paid for the products compared. With one hospital selected, the headline sets it against its own cheapest instead, so its row here is never below the headline&apos;s figure.</p>
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
  const title = "Paid above the cheapest, by hospital";
  return (
    <>
      <ChartPanel id="hospitals" title={title} context={here ? `${here.name}: No. ${here.rank} of ${rows.length}` : c.when} accent={HOSPITAL_COL} place={place}
        label={[title, c.when, here ? `${here.name} is number ${here.rank} of ${rows.length}` : null,
          ...rows.slice(0, 5).map((h) => `${h.rank}. ${h.name} ${lakhs(h.extra_paid)}, ${pct(h.extra_pct)} above`)].filter(Boolean).join(". ")}
        interactive onOpen={() => dr.show("ranking")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={HOSPITAL_COL} onMore={() => dr.show("ranking")}
          ariaLabel={`What each hospital paid above the cheapest price any hospital paid, ${c.when}, most first`} empty={`${c.w.none}.`}
          rows={rows.map((h) => ({
            key: h.plant, label: h.name, value: h.extra_paid, valueLabel: lakhs(h.extra_paid),
            aside: `${pct(h.extra_pct, 1)} above`, selected: h.selected, onClick: () => selectHospital(h),
          }))} />
      </ChartPanel>
      <HospitalsDrawer c={c} dr={dr} title={title} />
    </>
  );
}
