"use client";
// The two consumption views of HCG's spend email as one panel: each segment's drug consumption
// (onco, non-onco) and each payer's (cash, insurance (TPA), GOV) as one 100% bar split into
// formulary, out of formulary and non formulary, with the amount after it in lakhs. Both ignore
// the Payer and Material type filters, as HCG's tables do, and the panel says so. A segment row
// opens HCG's "Onco and Non Onco Formulary Consumption" table, a payer row its payer-wise
// consumption table (HCG's S5 'Summary' sheet).
import React from "react";
import { StackBars, type StackRow } from "@/components/portfolio/ledger/charts";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct } from "@/components/portfolio/ledger/format";
import { F_COL, OOF_COL, NF_COL } from "../parts";
import { payerLabel } from "../api";
import { ConsumptionTable, PayerTable, SEG_LABEL, consumptionRows, consumptionScope, payerRows } from "../HcgTables";
import { HowBuilt, MethodText, filterChips, type OverviewScope } from "./shared";

const SEGMENT_ROW = "seg:";
const PAYER_ROW = "pay:";

export function MixTile({ s, place }: { s: OverviewScope; place: Place }) {
  const cons = useDrawer();
  const pay = useDrawer();
  const segments = consumptionRows(s.d).filter((r) => r.segment !== "all");
  const payers = payerRows(s.d).filter((r) => r.payer !== "ALL");
  const rows: StackRow[] = [
    ...segments.map((r) => ({
      key: `${SEGMENT_ROW}${r.segment}`, label: SEG_LABEL[r.segment] ?? r.segment, group: "Material", aside: lakhs(r.total),
      values: { f: r.formulary, oof: r.out_of_formulary, nf: r.non_formulary },
    })),
    // A payer's split is of its drugs: its consumables are in neither group.
    ...payers.map((r) => ({
      key: `${PAYER_ROW}${r.payer}`, label: payerLabel(r.payer), group: "Payer", aside: lakhs(r.drugs),
      values: { f: r.formulary, oof: r.out_of_formulary, nf: r.non_formulary },
    })),
  ];
  const open = (key: string) => (key.startsWith(PAYER_ROW) ? pay.show("mail") : cons.show("mail"));
  const title = "Formulary mix by segment and payer";
  const label = [
    `${title}, ${s.when}, every payer and both material types. Each bar is the whole drug consumption of the row`,
    ...segments.map((r) => `${SEG_LABEL[r.segment] ?? r.segment} ${lakhs(r.total)}: formulary ${pct(r.formulary_pct, 1)}, out of formulary ${pct(r.oof_pct, 1)}, non formulary ${pct(r.nf_pct, 1)}`),
    ...payers.map((r) => `${payerLabel(r.payer)} drugs ${lakhs(r.drugs)}, compliance ${pct(r.compliance_pct)}`),
  ].join(". ");

  return (
    <>
      <ChartPanel id="mix" title={title} context={`${s.when} · every payer, onco + non-onco`} accent={F_COL} place={place}
        label={label} interactive onOpen={() => cons.show("mail")} onInfo={() => cons.show("method")}>
        {/* Rows that do not fit are the last ones, the payers: "+N more" opens their table. */}
        <StackBars ariaLabel={`Formulary, out-of-formulary and non formulary consumption by segment and by payer, ${s.when}`}
          onRow={open} onMore={() => pay.show("mail")} labelWidth={112} asideWidth={76}
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
    <DetailDrawer open={open} onClose={onClose} initialTab={first} size="wide"
      eyebrow="Formulary consumption · Overview" title={`Onco and non-onco formulary consumption · ${s.where}`}
      source="computed" asOf={s.asOf} filters={filterChips(s, { payer: "Every payer", material: "Onco + non-onco", method: false })}
      tabs={[
        { key: "mail", label: "As in HCG mail", render: () => <ConsumptionTable d={s.d} /> },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>{consumptionScope(s.d)}</p>
                <p>On the Overview each segment is one bar of its total consumption (formulary + out of formulary + non formulary) split into its three parts; the figure after it is that total. Non formulary is inside these bars, unlike the compliance %.</p>
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
    <DetailDrawer open={open} onClose={onClose} initialTab={first} size="wide"
      eyebrow="Consumption · Overview" title={`Consumption by payer · ${s.where}`}
      source="computed" asOf={s.asOf} filters={filterChips(s, { payer: "Every payer", material: "Onco + non-onco + consumables" })}
      tabs={[
        { key: "mail", label: "As in HCG mail", render: () => <PayerTable d={s.d} /> },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Payers are bucketed with HCG&apos;s Payer Master into cash, cash (TPA) and GOV schemes. Total consumption includes consumables; each payer&apos;s share is its total ÷ all payers&apos; total.</p>
                <p>On the Overview each payer is one bar of its drug consumption split into formulary, out of formulary and non formulary; the figure after it is that drug consumption (consumables are in the table, not the bar).</p>
                <p>Compliance = Formulary ÷ (Formulary + Out of formulary) on that payer&apos;s drugs, by the selected method. These figures show every payer and both material types whatever the Payer and Material type filters say.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}
