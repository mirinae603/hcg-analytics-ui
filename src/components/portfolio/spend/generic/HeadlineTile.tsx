"use client";
// Spend Analysis (Generic vs branded) — the headline tile: what was bought, as one 100% bar of
// generic and branded value, and the cost of branded: what branded purchases cost above the
// cheapest generic of the same product, as a share of the branded value that had a generic to
// compare with. The drawer has the written summary, the exact figures, how each purchase got its
// class, and the method.
import React from "react";
import { ChartPanel, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { PartBar } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { GenericOverview } from "../api";
import { DataTable, type Col } from "../DataTable";
import { plural } from "../insights";
import { BRANDED_COL, GENERIC_COL, GENERIC_SOURCE, Method, type Ctx } from "./context";

type Source = GenericOverview["by_source"][number];

function brief(c: Ctx): string[] {
  const h = c.d.headline;
  if (!h.lines) return [`${c.w.none} at ${c.where}, ${c.when}.`];
  return [
    `At ${c.where}, ${c.when}, HCG bought ${rupeesExact(h.value)} of drugs: ${rupeesExact(h.generic_value)} generic (${pct(h.generic_pct)}, ${plural(h.generic_brands, "brand")}) and ${rupeesExact(h.branded_value)} branded (${pct(h.branded_pct)}, ${plural(h.branded_brands, "brand")}).`,
    `${rupeesExact(h.compared_value)} of the branded purchases were of products also bought as a generic that month; they cost ${rupeesExact(h.extra_vs_generic)} above the cheapest generic, ${pct(h.extra_vs_generic_pct)} of their value.`,
    `The other ${rupeesExact(h.branded_not_compared)} of branded purchases had no generic bought that month to compare with.`,
    c.w.plain,
  ];
}

function figures(c: Ctx): KeyFigure[] {
  const h = c.d.headline;
  return [
    { label: "Generic", value: rupeesExact(h.generic_value), color: GENERIC_COL, note: `${pct(h.generic_pct)} of the value bought · ${plural(h.generic_brands, "brand")}` },
    { label: "Branded", value: rupeesExact(h.branded_value), color: BRANDED_COL, note: `${pct(h.branded_pct)} of the value bought · ${plural(h.branded_brands, "brand")}` },
    { label: c.w.extra, value: rupeesExact(h.extra_vs_generic), note: `${pct(h.extra_vs_generic_pct)} of the branded value compared` },
    { label: "Branded value compared", value: rupeesExact(h.compared_value), note: "products also bought as a generic that month" },
    { label: "Branded, no generic to compare", value: rupeesExact(h.branded_not_compared), note: "no generic of the product bought that month" },
    { label: "Value bought", value: rupeesExact(h.value), note: `${num(h.lines)} receipts · ${num(h.branded_lines)} branded` },
    { label: "Brands · hospitals", value: `${num(h.brands)} · ${num(h.hospitals)}`, note: "with a purchase in the selection" },
  ];
}

const SOURCE_COLS: Col<Source>[] = [
  { label: "How the class was set", align: "left", wrap: true, render: (s) => s.label },
  { label: "Value", render: (s) => rupeesExact(s.value) },
  { label: "Receipts", render: (s) => num(s.lines) },
];

function HeadlineDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.branded_value), comparator: h.lines ? `branded, ${pct(h.branded_pct)} of the ${rupeesExact(h.value)} bought, ${c.when}` : c.w.none }}
      source={GENERIC_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title="In brief">
                <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
                  {brief(c).map((t) => <p key={t}>{t}</p>)}
                </div>
              </DrawerSection>
              <DrawerSection title="Key figures" note="Exact rupees for the selection.">
                <KeyFigures figures={figures(c)} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "source", label: "How classed", render: () => (
            <DrawerSection title="How each purchase got its class" note={`The build reads the GRN's manufacturer against ${c.d.definition?.files?.originators ?? "the originator list"}; ${c.d.definition?.files?.overrides ?? "the override list"} names brands that list cannot see (an originator's brand sold by an Indian firm). Both are HCG-editable reference files.`}>
              <DataTable rows={c.d.by_source || []} rowKey={(s) => s.key} cols={SOURCE_COLS} caption="Purchase value by how its generic or branded class was set" />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>The bar is everything bought in the selection, split into generic and branded value, each part&apos;s share as the API sends it.</p>
              <p>{c.w.extraNote}</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function HeadlineTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const title = "Generic vs branded bought";
  return (
    <>
      <ChartPanel id="headline" title={title} context={c.context} accent={GENERIC_COL} place={place} source={GENERIC_SOURCE}
        label={h.lines ? [
          `${title}, ${c.context}`,
          `generic ${lakhs(h.generic_value)} (${pct(h.generic_pct, 1)}), branded ${lakhs(h.branded_value)} (${pct(h.branded_pct, 1)})`,
          `branded cost ${lakhs(h.extra_vs_generic)} above the cheapest generic, ${pct(h.extra_vs_generic_pct, 1)} of the ${lakhs(h.compared_value)} branded value that had one`,
        ].join(". ") : `${title}, ${c.context}. ${c.w.none}`}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        {h.lines ? (
          <div className="flex flex-col h-full">
            <PanelPart className="flex flex-col justify-center">
              <PartBar whole={`${lakhs(h.value)} bought`} ariaLabel={`${title}, ${c.context}`} parts={[
                { key: "generic", label: "Generic", share: h.generic_pct, valueLabel: lakhs(h.generic_value), color: GENERIC_COL },
                { key: "branded", label: "Branded", share: h.branded_pct, valueLabel: lakhs(h.branded_value), color: BRANDED_COL },
              ]} />
            </PanelPart>
            <p className="flex-shrink-0 text-[12px] leading-snug pt-1.5" style={{ color: SUB }}>
              <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" aria-hidden="true" style={{ background: BRANDED_COL }} />
              Branded cost <b className="tabular-nums" style={{ color: INK }}>{lakhs(h.extra_vs_generic)}</b> above the cheapest generic
              {" "}<span className="tabular-nums">({pct(h.extra_vs_generic_pct, 1)} of the {lakhs(h.compared_value)} that had one)</span>
            </p>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>{c.w.none}.</p>
        )}
      </ChartPanel>
      <HeadlineDrawer c={c} dr={dr} title={title} />
    </>
  );
}
