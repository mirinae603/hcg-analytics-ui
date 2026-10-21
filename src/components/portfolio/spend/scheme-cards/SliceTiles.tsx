"use client";
// Spend Analysis — HCG's slices of the scheme saving. On the Scheme overview: the Attis line and
// the J&J & Covidien → Healthium line of HCG's report (Healthium split into Sutures and Endo,
// as HCG's S6 Summary does), each as used − at the suggested price = margin missed, drawn as
// bullet rows; they are parts of the scheme total, not added to it.
import React from "react";
import { INK, SUB, LINE, RULE, num } from "@/components/portfolio/ledger/kit";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { BulletRows, type BulletRow } from "@/components/portfolio/ledger/bullets";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { DrawerSection, type DrawerCtl, KeyFigures, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import type { Block, Filters, Meta, Overview, SubBlock } from "../api";
import {
  LOSS_COL, PROPOSED_COL, SCHEME_COL, USED_COL, WORDS, MethodTab, filterChips,
  type Scope,
} from "./context";

type Groups = NonNullable<Overview["groups"]>;
type SliceKey = keyof Groups;

// HCG's report words for each slice's two values, and the slice's name on the tile's rows (the
// tile's title names both slices; the API's full label goes in the drawer and the row's name).
const SLICE: Record<SliceKey, { used: string; sug: string; face: string }> = {
  attis: { used: "Brands used", sug: "At Attis price", face: "Attis" },
  healthium: { used: "J&J & Covidien used", sug: "At Healthium price", face: "Healthium" },
};

/** A Healthium part's %: it may arrive as `pct` (Contract D) or as `saving_pct`. */
const subPct = (b: SubBlock) => b.pct ?? b.saving_pct ?? null;

/** The Healthium line's Sutures and Endo parts, those the API sent. */
function healthiumParts(g: Groups): { key: string; label: string; b: SubBlock }[] {
  const out: { key: string; label: string; b: SubBlock }[] = [];
  if (g.healthium.sutures) out.push({ key: "sutures", label: g.healthium.sutures.label ?? "Sutures", b: g.healthium.sutures });
  if (g.healthium.endo) out.push({ key: "endo", label: g.healthium.endo.label ?? "Endo", b: g.healthium.endo });
  return out;
}

const TITLE = "Attis & Healthium slices";

/** The Scheme overview's slices: each one's spend on the brands used (the bar, its overspend
 *  shaded as the loss) against the suggested brands' price for the same quantity (the
 *  marker), all on one rupee scale from zero, so the slices compare. Healthium's Sutures and
 *  Endo follow it as "of which" rows. A row opens its slice's tab of the drawer. */
export function SlicesTile({ groups, total, scope, place, drawer }: {
  groups: Groups;
  /** The scheme margin missed the slices are parts of. */
  total: number;
  scope: Scope; place: Place; drawer: DrawerCtl;
}) {
  const w = WORDS;
  const ofLoss = `of the scheme ${w.loss.toLowerCase()}`;
  // Each row, with its words for the panel's accessible name (they use the API's full label).
  // The figure beside a bar is the loss alone, so the bar keeps its length; the % goes in the
  // row's note (printed when the row has the room) and in its words.
  const row =(key: string, label: string, full: string, b: Pick<Block, "used_value" | "suggested_value" | "saving_missed">, p: number | null, slice: SliceKey, share?: string): [BulletRow, string] => [
    {
      key, label, value: b.used_value, target: b.suggested_value,
      valueLabel: `${lakhs(b.saving_missed)} lost`,
      targetLabel: `${SLICE[slice].sug} ${lakhs(b.suggested_value)}`,
      note: [`${pct(p, 1)} ${w.pctWord}`, share].filter(Boolean).join(" · "),
      onClick: () => drawer.show(slice),
    },
    `${full}: spend ${lakhs(b.used_value)}, ${SLICE[slice].sug.toLowerCase()} ${lakhs(b.suggested_value)}, ${w.loss.toLowerCase()} ${lakhs(b.saving_missed)}, ${pct(p, 1)} of the spend${share ? `, ${share}` : ""}`,
  ];
  const entries = [
    row("attis", SLICE.attis.face, groups.attis.label, groups.attis, groups.attis.saving_pct, "attis", `${pct(groups.attis.share_pct, 1)} ${ofLoss}`),
    row("healthium", SLICE.healthium.face, groups.healthium.label, groups.healthium, groups.healthium.saving_pct, "healthium", `${pct(groups.healthium.share_pct, 1)} ${ofLoss}`),
    ...healthiumParts(groups).map((p) => row(p.key, `of which ${p.label}`, `${groups.healthium.label}, ${p.label}`, p.b, subPct(p.b), "healthium")),
  ];
  const label = [`${TITLE}, ${scope.context}: parts of the ${lakhs(total)} scheme ${w.loss.toLowerCase()}, not added to it`, ...entries.map(([, words]) => words)].join(". ");

  return (
    <ChartPanel id="slices" title={TITLE} context={`parts of the ${lakhs(total)} ${w.loss.toLowerCase()}`} accent={SCHEME_COL} place={place}
      label={label} interactive onOpen={() => drawer.show("attis")} onInfo={() => drawer.show("method")}>
      <BulletRows rows={entries.map(([r]) => r)} ariaLabel={`${TITLE}: spend on the brands used against the suggested brands' price`}
        scale={{
          kind: "rupee", perRow: false, format: lakhs,
          bar: { label: "Spend used", color: USED_COL },
          marker: { label: "Suggested price", color: INK },
          gap: { label: w.loss, color: LOSS_COL },
        }} />
    </ChartPanel>
  );
}

/** The drawer the slices tile opens, on the tab of the row clicked. */
export function SlicesDrawer({ d, meta, filters, scope, drawer }: {
  d: Overview; meta: Meta; filters: Filters; scope: Scope; drawer: DrawerCtl;
}) {
  const g = d.groups;
  if (!g) return null;
  const w = WORDS;
  const parts = healthiumParts(g);
  return (
    <DetailDrawer open={drawer.open} onClose={drawer.close} initialTab={drawer.tab}
      eyebrow="Scheme · Overview" title={`HCG's slices of the scheme ${w.loss.toLowerCase()} · ${scope.where}`}
      kpi={{ value: rupeesExact(d.headline.saving_missed), comparator: `scheme ${w.loss.toLowerCase()}; the slices are parts of it, not added to it` }}
      source="computed" asOf={scope.asOf} filters={filterChips(filters, scope, meta)}
      tabs={[
        { key: "attis", label: g.attis.label, render: () => <SliceFigures b={g.attis} slice="attis" /> },
        {
          key: "healthium", label: g.healthium.label, render: () => (
            <>
              <SliceFigures b={g.healthium} slice="healthium" />
              {parts.length > 0 && (
                <DrawerSection title={`${g.healthium.label}, by group`} note="The scheme list's SUTURES and Endo rows, as HCG's S6 Summary shows them.">
                  <SliceTable rows={parts} />
                </DrawerSection>
              )}
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <MethodTab d={d} meta={meta} lines={[
              "The two lines HCG's report shows under the scheme total. They are parts of it, not added to it.",
              `Each slice: ${SLICE.attis.used.toLowerCase()} (qty × list price), the same quantity at the suggested brand's price, the ${w.loss.toLowerCase()} between them and its % of the spend; share = the slice's part of the scheme ${w.loss.toLowerCase()}.`,
            ]} />
          ),
        },
      ]} />
  );
}

function SliceFigures({ b, slice }: { b: Block & { share_pct: number | null }; slice: SliceKey }) {
  const s = SLICE[slice];
  const w = WORDS;
  const figures: KeyFigure[] = [
    { label: s.used, value: rupeesExact(b.used_value), color: USED_COL, note: "qty × list price" },
    { label: s.sug, value: rupeesExact(b.suggested_value), color: PROPOSED_COL, note: "same qty × suggested price" },
    { label: w.loss, value: rupeesExact(b.saving_missed), color: LOSS_COL, note: `${pct(b.saving_pct)} of their spend` },
    { label: "Share", value: pct(b.share_pct, 2), note: `of the scheme ${w.loss.toLowerCase()}` },
    { label: "Units · lines", value: `${num(b.qty)} · ${num(b.lines)}`, note: "scheme patients' use" },
    { label: "Billed", value: rupeesExact(b.bill_cost), note: "the bills' cost for these lines" },
  ];
  return (
    <DrawerSection title="Key figures" note="Exact rupees at HCG's FY list prices.">
      <KeyFigures figures={figures} />
    </DrawerSection>
  );
}

/** HCG's S6 rows for the Healthium line: J&J / Covidien spend, at Healthium price, missed, %. */
function SliceTable({ rows }: { rows: { key: string; label: string; b: SubBlock }[] }) {
  const cols = "minmax(0,1fr) 128px 128px 128px 60px";
  return (
    <div className="overflow-x-auto -mx-1"><div className="flex flex-col text-[12px] tabular-nums" style={{ minWidth: 560 }}>
      <div className="grid gap-2 pb-1 text-[10px] font-semibold uppercase" style={{ gridTemplateColumns: cols, color: SUB, letterSpacing: ".06em", borderBottom: `1px solid ${RULE}` }}>
        <span /><span className="text-right">J&amp;J / Cov.</span><span className="text-right">Healthium</span><span className="text-right">Missed</span><span className="text-right">%</span>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="grid gap-2 py-[6px]" style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${LINE}`, color: INK }}>
          <span className="truncate font-semibold">{r.label}</span>
          <span className="text-right">{rupeesExact(r.b.used_value)}</span>
          <span className="text-right">{rupeesExact(r.b.suggested_value)}</span>
          <span className="text-right font-semibold">{rupeesExact(r.b.saving_missed)}</span>
          <span className="text-right">{pct(subPct(r.b))}</span>
        </div>
      ))}
    </div></div>
  );
}
