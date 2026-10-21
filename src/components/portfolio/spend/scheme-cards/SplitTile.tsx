"use client";
// Spend Analysis, Scheme overview — where the saving was missed: onco, non-onco and
// consumables, and inpatient vs outpatient. The tile ranks each part's saving in lakhs as a bar
// from zero, both lists on one scale, with its % missed; the drawer has the exact amounts
// behind each. Each list ignores its own filter (the API cuts it that way), so its parts can be
// compared.
import React from "react";
import { useArmed, INK, SUB, TRACK, EASE, num } from "@/components/portfolio/ledger/kit";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { DrawerSection, useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { niceMax } from "@/components/portfolio/ledger/scale";
import { Swatch } from "../../formulary/parts";
import type { Block, Filters, Meta, Overview } from "../api";
import { typeLabel } from "../shared";
import { PROPOSED_COL, SCHEME_COL, USED_COL, WORDS, MethodTab, filterChips, type Scope } from "./context";

type Part = { key: string; label: string; b: Block };
type Group = { key: string; title: string; parts: Part[] };

const TITLE = "By material and patient type";

function groupsOf(d: Overview): Group[] {
  return [
    { key: "material", title: "Material type", parts: (d.by_category || []).map((c) => ({ key: c.key, label: c.label, b: c })) },
    { key: "type", title: "Patient type", parts: (d.by_type || []).map((t) => ({ key: t.type, label: typeLabel(t.type), b: t })) },
  ];
}

export function SplitTile({ d, meta, filters, scope, place }: {
  d: Overview; meta: Meta; filters: Filters; scope: Scope; place: Place;
}) {
  const drawer = useDrawer();
  const w = WORDS;
  const groups = groupsOf(d);
  const filtered = filters.segment !== "ALL" || filters.type !== "ALL";
  const rows: RankRow[] = groups.flatMap((g) => g.parts.map((p) => ({
    key: `${g.key}-${p.key}`, label: p.label, group: g.title, value: p.b.saving_missed, valueLabel: lakhs(p.b.saving_missed),
    aside: isNum(p.b.saving_pct) ? `${pct(p.b.saving_pct, 1)} ${w.pctWord}` : undefined,
  })));
  const label = [
    `${TITLE}, ${w.loss.toLowerCase()}, ${scope.context}${filtered ? "; each list ignores its own filter" : ""}`,
    ...groups.map((g) => `${g.title}: ${g.parts.map((p) => `${p.label} ${lakhs(p.b.saving_missed)}, ${pct(p.b.saving_pct, 1)} ${w.pctWord}`).join(", ")}`),
  ].join(". ");

  return (
    <>
      <ChartPanel id="split" title={TITLE} context={filtered ? "each list ignores its own filter" : scope.context} accent={SCHEME_COL} place={place}
        label={label} onOpen={() => drawer.show("breakdown")} onInfo={() => drawer.show("method")}>
        <RankBars rows={rows} format={lakhs} color={SCHEME_COL} ariaLabel={`${w.loss} by material type and by patient type, on one scale`} />
      </ChartPanel>

      <DetailDrawer open={drawer.open} onClose={drawer.close} initialTab={drawer.tab}
        eyebrow={`${w.section} · Overview`} title={`${TITLE} · ${scope.where}`}
        source="computed" asOf={scope.asOf} filters={filterChips(filters, scope, meta)}
        tabs={[
          {
            key: "breakdown", label: "Breakdown", render: () => groups.map((g) => (
              <DrawerSection key={g.key} title={g.title}
                note={g.key === "material"
                  ? "Material type = the first digit of the material code: 1 onco, 2 non-onco, 3 consumables. This list ignores the Material type filter."
                  : "Scheme patients are counted in IP and OP alike. This list ignores the Patient type filter."}>
                <PartRows parts={g.parts} />
              </DrawerSection>
            )),
          },
          {
            key: "method", label: "Method", render: () => (
              <MethodTab d={d} meta={meta} lines={[
                `Each part: ${w.actual.toLowerCase()} (qty × list price), the same quantity at the ${w.sug} brand's price, the difference (${w.loss.toLowerCase()}) and ${w.pct} = the difference ÷ ${w.actual.toLowerCase()}.`,
                "Each list ignores its own filter, so its parts can be compared: the material list ignores the Material type filter, the patient list the Patient type filter. Every other filter applies.",
                "The bars on the tile share one scale from zero, across both lists.",
              ]} />
            ),
          },
        ]} />
    </>
  );
}

/** One row per part, in exact rupees: the margin missed as a bar from zero (shared scale),
 *  then the two values it is the difference of. */
function PartRows({ parts }: { parts: Part[] }) {
  const on = useArmed();
  const w = WORDS;
  const vmax = niceMax(Math.max(1, ...parts.map((p) => Math.max(0, p.b.saving_missed))));
  if (!parts.length) return <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p>;
  return (
    <div className="flex flex-col gap-5">
      {parts.map((p, i) => (
        <div key={p.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold" style={{ color: INK }}>{p.label}</span>
            <span className="text-[17px] font-bold tabular-nums leading-none" style={{ color: INK }}>{rupeesExact(p.b.saving_missed)}</span>
          </div>
          <div className="relative h-[8px] rounded-full mt-2 overflow-hidden" style={{ background: TRACK }}>
            <div className="absolute left-0 top-0 bottom-0 rounded-full"
              style={{ width: on ? `${(Math.max(0, p.b.saving_missed) / vmax) * 100}%` : "0%", background: SCHEME_COL, transition: `width 620ms ${EASE} ${140 + i * 80}ms` }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11.5px] tabular-nums" style={{ color: SUB }}>
            <span className="inline-flex items-center gap-1.5"><Swatch color={USED_COL} />{w.actual} <b style={{ color: INK }}>{rupeesExact(p.b.used_value)}</b></span>
            <span className="inline-flex items-center gap-1.5"><Swatch color={PROPOSED_COL} />{w.proposed} <b style={{ color: INK }}>{rupeesExact(p.b.suggested_value)}</b></span>
            <span>{pct(p.b.saving_pct)} {w.pctWord}</span>
            <span>{num(p.b.qty)} units</span>
          </div>
        </div>
      ))}
      <div className="text-[10.5px]" style={{ color: SUB }}>bar = {w.loss.toLowerCase()}, on one scale from 0 to {rupeesExact(vmax)}</div>
    </div>
  );
}
