"use client";
// The two consumption views as one panel: each segment's drug consumption (onco, non-onco)
// and each payer's (cash, insurance (TPA), GOV) as one 100% bar split into formulary, out of
// formulary and non formulary, with the amount after it in lakhs. Both ignore the Payer and
// Material type filters, and the panel says so. A segment row opens the segments' drawer, a payer
// row the payers' (how each is built). On the quantity view every bar splits units sold.
import React from "react";
import { StackBars, type StackRow } from "@/components/portfolio/ledger/charts";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { pct } from "@/components/portfolio/ledger/format";
import { F_COL, OOF_COL, NF_COL } from "../parts";
import { payerLabel } from "../api";
import { SEG_LABEL, consumptionRows, consumptionScope, payerRows } from "../HcgTables";
import { HowBuilt, MethodText, filterChips, type OverviewScope } from "./shared";

const SEGMENT_ROW = "seg:";
const PAYER_ROW = "pay:";

export function MixTile({ s, place }: { s: OverviewScope; place: Place }) {
  const cons = useDrawer();
  const pay = useDrawer();
  const { m } = s;
  const segments = consumptionRows(s.d).filter((r) => r.segment !== "all");
  const payers = payerRows(s.d).filter((r) => r.payer !== "ALL");
  const rows: StackRow[] = [
    ...segments.map((r) => ({
      key: `${SEGMENT_ROW}${r.segment}`, label: SEG_LABEL[r.segment] ?? r.segment, group: "Material", aside: m.short(r.total),
      values: { f: r.formulary, oof: r.out_of_formulary, nf: r.non_formulary },
    })),
    // A payer's split is of its drugs: its consumables are in neither group.
    ...payers.map((r) => ({
      key: `${PAYER_ROW}${r.payer}`, label: payerLabel(r.payer), group: "Payer", aside: m.short(r.drugs),
      values: { f: r.formulary, oof: r.out_of_formulary, nf: r.non_formulary },
    })),
  ];
  const open = (key: string) => (key.startsWith(PAYER_ROW) ? pay.show() : cons.show());
  const title = m.units ? "Formulary mix by segment and payer, units" : "Formulary mix by segment and payer";
  const label = [
    `${title}, ${s.when}, every payer and both material types. Each bar is the whole drug consumption${m.units ? " in units sold" : ""} of the row`,
    ...segments.map((r) => `${SEG_LABEL[r.segment] ?? r.segment} ${m.short(r.total)}: formulary ${pct(r.formulary_pct, 1)}, out of formulary ${pct(r.oof_pct, 1)}, non formulary ${pct(r.nf_pct, 1)}`),
    ...payers.map((r) => `${payerLabel(r.payer)} drugs ${m.short(r.drugs)}, compliance ${pct(r.compliance_pct)}`),
  ].join(". ");

  return (
    <>
      <ChartPanel id="mix" title={title} context={`${s.when} · every payer, onco + non-onco`} accent={F_COL} place={place}
        label={label} interactive onOpen={() => cons.show()} onInfo={() => cons.show("method")}>
        {/* Rows that do not fit are the last ones, the payers: "+N more" opens their drawer. */}
        <StackBars ariaLabel={`Formulary, out-of-formulary and non formulary consumption${m.units ? " in units sold" : ""} by segment and by payer, ${s.when}`}
          onRow={open} onMore={() => pay.show()} labelWidth={112} asideWidth={76} format={m.short}
          empty="No drug consumption in this selection."
          segments={[
            { key: "f", label: "Formulary", color: F_COL },
            { key: "oof", label: "Out of formulary", color: OOF_COL },
            { key: "nf", label: "Non formulary", color: NF_COL, hatched: true },
          ]}
          rows={rows} />
      </ChartPanel>
      <ConsumptionDrawer s={s} open={cons.open} first={cons.tab} onClose={cons.close} />
      <PayerDrawer s={s} open={pay.open} first={pay.tab} onClose={pay.close} />
    </>
  );
}

export function ConsumptionDrawer({ s, open, first, onClose }: { s: OverviewScope; open: boolean; first?: string; onClose: () => void }) {
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={first}
      eyebrow="Formulary consumption · Overview" title={`Onco and non-onco formulary consumption${s.m.units ? ", units" : ""} · ${s.where}`}
      source="computed" asOf={s.asOf} filters={filterChips(s, { payer: "Every payer", material: "Onco + non-onco", method: false })}
      tabs={[
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>{consumptionScope(s.d)}</p>
                <p>On the Overview each segment is one bar of its total consumption (formulary + out of formulary + non formulary) split into its three parts; the figure after it is that total{s.m.units ? ", in units sold" : ""}. Non formulary is inside these bars, unlike the compliance %.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}

export function PayerDrawer({ s, open, first, onClose }: { s: OverviewScope; open: boolean; first?: string; onClose: () => void }) {
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={first}
      eyebrow="Consumption · Overview" title={`Consumption by payer${s.m.units ? ", units" : ""} · ${s.where}`}
      source="computed" asOf={s.asOf} filters={filterChips(s, { payer: "Every payer", material: "Onco + non-onco" })}
      tabs={[
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Payers are bucketed with HCG&apos;s Payer Master into cash, cash (TPA) and GOV schemes.</p>
                <p>On the Overview each payer is one bar of its drug consumption split into formulary, out of formulary and non formulary; the figure after it is that drug consumption{s.m.units ? " in units sold" : ""}; consumables are left out.</p>
                <p>Compliance = Formulary ÷ (Formulary + Out of formulary) on that payer&apos;s drugs, by the selected method. These figures show every payer and both material types whatever the Payer and Material type filters say.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}
