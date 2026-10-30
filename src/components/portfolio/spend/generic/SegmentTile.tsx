"use client";
// Spend Analysis (Generic vs branded) — onco and non-onco drugs, each as one 100% bar of generic
// and branded value (its whole bought after it), so the two material types' mix reads side by
// side. The row ignores the material-type filter: both always show. The drawer has the exact
// rupees and each type's cost of branded above the cheapest generic.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { StackBars, type StackSegment } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { DataTable, type Col } from "../DataTable";
import { BRANDED_COL, GENERIC_COL, GENERIC_SOURCE, Method, type Ctx, type Data } from "./context";

type Segment = Data["by_segment"][number];

const SEGMENTS: StackSegment[] = [
  { key: "generic", label: "Generic", color: GENERIC_COL },
  { key: "branded", label: "Branded", color: BRANDED_COL },
];
const NOTE = "Onco and non-onco drugs for the same hospital and months: this split ignores the material-type filter.";

const COLS: Col<Segment>[] = [
  { label: "Material type", align: "left", render: (s) => s.label },
  { label: "Generic", render: (s) => rupeesExact(s.generic_value) },
  { label: "Branded", render: (s) => rupeesExact(s.branded_value) },
  { label: "% branded", render: (s) => pct(s.branded_pct) },
  { label: "Branded compared", render: (s) => rupeesExact(s.compared_value) },
  { label: "Above the cheapest generic", render: (s) => <b>{rupeesExact(s.extra_vs_generic)}</b> },
  { label: "% above", render: (s) => pct(s.extra_vs_generic_pct) },
];

function SegmentDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(c.d.headline.extra_vs_generic), comparator: `branded above the cheapest generic, onco and non-onco together: ${pct(c.d.headline.extra_vs_generic_pct)} of the ${rupeesExact(c.d.headline.compared_value)} branded value compared, ${c.when}` }}
      source={GENERIC_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "split", label: "Breakdown", render: () => (
            <DrawerSection title="Generic and branded, onco and non-onco" note={`${NOTE} ${c.w.extraNote}`}>
              <DataTable rows={c.d.by_segment || []} rowKey={(s) => s.key} cols={COLS} caption="Generic and branded purchases by material type" minWidth={820} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}><p>{NOTE} Each bar is that material type&apos;s value bought, split into generic and branded; the shares are the API&apos;s, and the figure after the bar is the whole.</p></Method>
          ),
        },
      ]} />
  );
}

export function SegmentTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const rows = c.d.by_segment || [];
  const title = "Onco vs non-onco";
  return (
    <>
      <ChartPanel id="segment" title={title} context={c.context} accent={GENERIC_COL} place={place} source={GENERIC_SOURCE}
        label={[`${title}: generic and branded purchases, ${c.context}`, ...rows.map((s) => `${s.label}: ${pct(s.branded_pct, 1)} branded of ${lakhs(s.value)}`)].join(". ")}
        onOpen={() => dr.show("split")} onInfo={() => dr.show("method")}>
        <StackBars segments={SEGMENTS} ariaLabel={`${title}, ${c.context}`} format={lakhs} empty={`${c.w.none}.`}
          rows={rows.filter((s) => s.value > 0).map((s) => ({
            key: s.key, label: s.label, aside: lakhs(s.value), values: { generic: s.generic_value, branded: s.branded_value },
          }))} />
      </ChartPanel>
      <SegmentDrawer c={c} dr={dr} title={title} />
    </>
  );
}
