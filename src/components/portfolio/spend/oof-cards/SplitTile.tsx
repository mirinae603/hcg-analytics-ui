"use client";
// Spend Analysis (Out of formulary) — where the margin missed sits by material type: onco and
// non-onco drugs (the material types the purchases have; the first digit of the material code).
// Each type's margin missed is a bar from one zero line in the section's colour, its % of the
// margin possible after it. The split ignores the Material type filter, so the types compare.
// The drawer lists them with exact rupees.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { DataTable, type Col } from "../DataTable";
import { OOF_COL, USED_COL, Method, ofPossible, type Ctx } from "./context";

type Slice = Ctx["d"]["by_category"][number];

const IGNORES = "Every material type, whatever the Material type filter says: the types add up to the whole for the other filters.";

/** Every material type with exact rupees: the Breakdown of this tile's drawer. */
export function SliceTable({ c }: { c: Ctx }) {
  const cols: Col<Slice>[] = [
    { label: "Material type", render: (r) => r.label, align: "left" },
    { label: "Spent", render: (r) => rupeesExact(r.purchase_value) },
    { label: "Margin earned", render: (r) => rupeesExact(r.actual_margin) },
    { label: "Margin possible", render: (r) => rupeesExact(r.potential_margin) },
    { label: "Margin missed", render: (r) => <b>{rupeesExact(r.margin_loss)}</b> },
    { label: "% missed", render: (r) => pct(r.loss_pct) },
    { label: "Units", render: (r) => num(r.qty) },
  ];
  return (
    <DrawerSection title="Onco and non-onco" note={IGNORES}>
      <DataTable rows={c.d.by_category || []} rowKey={(r) => r.key} cols={cols} caption="Out-of-formulary margin missed by material type" minWidth={680} />
    </DrawerSection>
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
        { key: "breakdown", label: "Breakdown", render: () => <SliceTable c={c} /> },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>The material type is the first digit of the material code: 1 onco drugs, 2 other (non-onco) drugs. HCG&apos;s out-of-formulary workings cover drugs only, so purchases have no consumables.</p>
              <p>{IGNORES} Each type&apos;s margin missed = its margin possible − its margin earned, net; its % missed = its margin missed ÷ its margin possible. The bars share one scale from zero.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function SplitTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const rows = c.d.by_category || [];
  const title = "Onco vs non-onco";
  return (
    <>
      <ChartPanel id="split" title={title} context={c.context} accent={OOF_COL} place={place} source={c.source}
        label={[`${title}: out-of-formulary margin missed by material type`, c.context,
          ...rows.map((r) => `${r.label} ${lakhs(r.margin_loss)} missed${r.loss_pct != null ? `, ${pct(r.loss_pct)} of ${lakhs(r.potential_margin)} possible` : ""}`)].join(". ")}
        onOpen={() => dr.show("breakdown")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={OOF_COL} signed negativeColor={USED_COL} ariaLabel={`Out-of-formulary margin missed by material type, ${c.context}`}
          rows={rows.map((r) => ({
            key: r.key, label: r.label, sub: `${lakhs(r.purchase_value)} spent`,
            value: r.lines ? r.margin_loss : null, valueLabel: lakhs(r.margin_loss), aside: ofPossible(r.loss_pct) ?? "no purchase",
          }))} />
      </ChartPanel>
      <SplitDrawer c={c} dr={dr} title={title} />
    </>
  );
}
