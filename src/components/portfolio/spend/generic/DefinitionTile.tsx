"use client";
// Spend Analysis (Generic vs branded) — the definition every figure of the section rests on, in
// plain words, with its "Estimated definition" badge: branded = made by the company that invented
// the medicine; everything else is generic. Under it, how much of the value each way of setting
// the class decided (a named override, the originator list, or neither). The drawer has the
// build's own wording, the brands named by hand and why, and the reference files HCG can edit.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB, LINE } from "@/components/portfolio/ledger/kit";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { DataTable, type Col } from "../DataTable";
import { DefinitionBadge, GENERIC_COL, GENERIC_SOURCE, Method, type Ctx, type Data } from "./context";

type Override = Data["definition"]["overrides"][number];
type ClassSource = Data["by_source"][number];

/** How each purchase got its class, in plain words on the face (the API's own words are the
 *  tooltip and the drawer's). */
const SOURCE_WORDS: Record<ClassSource["key"], string> = {
  override: "Named by hand (override list)",
  originator_list: "Made by an originator: branded",
  default: "Any other maker: generic",
};
const sourceWords = (s: ClassSource) => SOURCE_WORDS[s.key] ?? s.label;

const OVERRIDE_COLS: Col<Override>[] = [
  { label: "Material", align: "left", render: (o) => o.material },
  { label: "Class", align: "left", render: (o) => o.class },
  { label: "Why", align: "left", wrap: true, render: (o) => o.reason },
];

function DefinitionDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const def = c.d.definition;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={title}
      kpi={{ value: rupeesExact(c.d.headline.branded_value), comparator: `branded under this definition, ${pct(c.d.headline.branded_pct)} of the ${rupeesExact(c.d.headline.value)} bought, ${c.when}` }}
      source={GENERIC_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "definition", label: "Definition", render: () => (
            <>
              <DrawerSection title={def?.label ?? "Estimated definition"} note="The app's own reading until HCG confirms it: every figure of this section rests on it.">
                <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
                  <p>{c.w.plain}</p>
                  {def?.text && <p style={{ color: SUB }}>In the build&apos;s words: {def.text}</p>}
                </div>
              </DrawerSection>
              <DrawerSection title="How it is applied"
                note={`The GRN's manufacturer is matched against ${num(def?.originator_patterns ?? 0)} name patterns of ${num(def?.originator_companies ?? 0)} originator companies (${def?.files?.originators ?? "the originator list"}); ${def?.files?.overrides ?? "the override list"} names brands that list cannot see. HCG can edit both files; the next build picks the change up.`}>
                <DataTable rows={def?.overrides || []} rowKey={(o) => o.material} cols={OVERRIDE_COLS} caption="Brands whose class is set by hand" empty="No brand is set by hand." />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}><p>Under the definition, the value each way of setting the class decided in this selection, as the API sends it.</p></Method>
          ),
        },
      ]} />
  );
}

export function DefinitionTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const def = c.d.definition;
  const title = "What branded means here";
  const label = def?.label ?? "Estimated definition";
  return (
    <>
      <ChartPanel id="definition" title={title} accent={GENERIC_COL} place={place} source={GENERIC_SOURCE}
        label={[`${title}. ${label}`, c.w.plain, ...(c.d.by_source || []).map((s) => `${sourceWords(s)}: ${lakhs(s.value)}`)].join(". ")}
        onOpen={() => dr.show("definition")} onInfo={() => dr.show("method")}>
        <div className="flex flex-col h-full gap-2 overflow-hidden">
          <DefinitionBadge label={label} title={def?.text} />
          <p className="text-[13px] leading-snug" style={{ color: INK }}>{c.w.plain}</p>
          <dl className="mt-auto text-[11.5px] tabular-nums" style={{ color: SUB }}>
            {(c.d.by_source || []).map((s) => (
              <div key={s.key} className="flex items-baseline justify-between gap-3 py-0.5" style={{ borderTop: `1px solid ${LINE}` }}>
                <dt className="truncate" title={s.label}>{sourceWords(s)}</dt>
                <dd className="flex-shrink-0 font-semibold" style={{ color: INK }} title={rupeesExact(s.value)}>{lakhs(s.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </ChartPanel>
      <DefinitionDrawer c={c} dr={dr} title={title} />
    </>
  );
}
