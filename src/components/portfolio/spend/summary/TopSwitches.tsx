"use client";
// Spend Summary — the brand switches worth the most, across sections: each section's top ten
// (HCG's "Top 10 materials list contribution in margin missed") in one list, most rupees lost
// first. The lists are ranked together, never added: a cash & TPA loss is margin, a scheme
// loss is spend, each for different patients.
//   SwitchesTile   — the panel: as many switches as fit, bars from zero on one scale in lakhs,
//                    each in its section's colour (out of formulary hatched: an estimate).
//   SwitchesDrawer — every switch with exact rupees, ranked together and section by section.
import React from "react";
import { INK, SUB, LINE, RULE } from "@/components/portfolio/ledger/kit";
import { Swatch, type LegendItem } from "@/components/portfolio/ledger/legend";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { RankBars } from "@/components/portfolio/ledger/bars";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { DrawerSection, type DrawerTab } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import type { Source } from "@/components/portfolio/ledger/status";
import { num } from "@/lib/kpiFormat";
import type { CashOverview, Filters, Meta, OofOverview, Overview } from "../api";
import { BRAND_COL } from "../shared";
import { KIND, filterChips, whereOf, type LossKind } from "./model";
import { GoLinks, MethodText, type Go } from "./pieces";

/** How many switches the panel's accessible name reads out; the drawer lists every one. */
const SAID = 5;

export type BrandSwitch = {
  key: string;
  kind: LossKind;
  used: string;
  suggested: string;
  qty: number;
  actual: number | null;
  proposed: number | null;
  loss: number;
  pct: number | null;
  /** The brand's part of its own section's loss. */
  share: number | null;
};

const brand = (desc: string | null | undefined, code: string) => desc || code;

export function schemeSwitches(d: Overview): BrandSwitch[] {
  return (d.top_items || []).map((r) => ({
    key: `scheme-${r.material}-${r.suggested_material}`, kind: "scheme",
    used: brand(r.material_desc, r.material), suggested: brand(r.suggested_desc, r.suggested_material), qty: r.qty,
    actual: r.used_value ?? null, proposed: r.suggested_value ?? null, loss: r.saving_missed, pct: r.saving_pct, share: r.share_of_total_pct ?? null,
  }));
}

export function marginSwitches(d: CashOverview | OofOverview, kind: "cash" | "oof"): BrandSwitch[] {
  return (d.top_items || []).map((r) => ({
    key: `${kind}-${r.material}-${r.suggested_material}`, kind,
    used: brand(r.material_desc, r.material), suggested: brand(r.suggested_desc, r.suggested_material), qty: r.qty,
    actual: r.actual_margin ?? null, proposed: r.potential_margin ?? null, loss: r.margin_loss, pct: r.loss_pct, share: r.share_of_total_pct ?? null,
  }));
}

/** Every section's list in one, most rupees lost first. */
export const rankSwitches = (lists: BrandSwitch[][]) => lists.flat().sort((a, b) => b.loss - a.loss);

/** A list of switches is an estimate as soon as one of them is (out of formulary). */
const sourceOf = (rows: BrandSwitch[]): Source => (rows.some((r) => KIND[r.kind].source === "estimate") ? "estimate" : "computed");

const isEstimate = (kind: LossKind) => KIND[kind].source === "estimate";

const ORDER: LossKind[] = ["scheme", "cash", "oof"];

function Tag({ kind }: { kind: LossKind }) {
  const w = KIND[kind];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px]" style={{ color: SUB }}>
      <Swatch color={w.accent} hatched={isEstimate(kind)} />{w.short}{isEstimate(kind) ? " · estimated" : ""}
    </span>
  );
}

export function SwitchesTile({ rows, place, context, missing, onOpen, onInfo }: {
  /** Already ranked. */
  rows: BrandSwitch[];
  place: Place;
  context: string;
  /** Why a section's list is not in the ranking yet (still loading, or failed), if one is not. */
  missing?: string | null;
  onOpen: () => void;
  onInfo: () => void;
}) {
  const title = "Top brand switches";
  // Colour says which section a switch belongs to, which no bar prints: the panel's legend does.
  const legend: LegendItem[] = ORDER.filter((k) => rows.some((r) => r.kind === k))
    .map((k) => ({ key: k, label: KIND[k].short, color: KIND[k].accent, hatched: isEstimate(k) }));
  const label = [
    `${title}, ranked by rupees lost, never added`,
    ...rows.slice(0, SAID).map((r, i) => `${i + 1}. ${r.used} to ${r.suggested}, ${KIND[r.kind].short}, ${lakhs(r.loss)}`),
    ...(missing ? [missing] : []),
  ].join(". ");
  return (
    <ChartPanel id="switches" title={title} context={missing ?? context} accent={BRAND_COL} place={place}
      source={sourceOf(rows)} legend={legend} label={label} onOpen={onOpen} onInfo={onInfo}>
      <RankBars ariaLabel="Brand switches, most rupees lost first" format={lakhs} color={BRAND_COL}
        empty="No brand switch has a loss in this selection."
        rows={rows.map((r) => ({
          key: r.key,
          label: `${r.used} → ${r.suggested}`,
          sub: `${KIND[r.kind].short}${isEstimate(r.kind) ? " · estimated" : ""}`,
          value: r.loss,
          valueLabel: lakhs(r.loss),
          aside: r.share == null ? undefined : `${pct(r.share, 1)} of ${KIND[r.kind].short}`,
          color: KIND[r.kind].accent,
          hatched: isEstimate(r.kind),
        }))} />
    </ChartPanel>
  );
}

/** A brand switch table. `kind` set: one section's list, in its own words and columns;
 *  unset: every section ranked together, with only the figures that mean the same in each. */
function SwitchTable({ rows, kind }: { rows: BrandSwitch[]; kind?: LossKind }) {
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p>;
  const w = kind ? KIND[kind] : null;
  const head = ["#", "Brand used → suggested", ...(w ? ["Qty", w.actual, w.proposed] : ["Section"]), "Loss", "% missed", "Share of its section"];
  const td = "px-2 py-[7px] text-right whitespace-nowrap align-top";
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[12px] tabular-nums" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 640 }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={`px-2 py-2 text-[10px] font-semibold uppercase whitespace-nowrap ${i < 2 || (!w && i === 2) ? "text-left" : "text-right"}`}
                style={{ color: SUB, letterSpacing: ".06em", borderBottom: `1px solid ${RULE}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} style={{ color: INK }}>
              <td className="px-2 py-[7px] align-top text-[11px]" style={{ color: SUB, borderBottom: `1px solid ${LINE}` }}>{i + 1}</td>
              <td className="px-2 py-[7px] align-top" style={{ borderBottom: `1px solid ${LINE}`, maxWidth: 320 }}>
                <span className="block font-semibold truncate" title={r.used}>{r.used}</span>
                <span className="block truncate text-[11px]" style={{ color: SUB }} title={r.suggested}>→ {r.suggested}</span>
              </td>
              {w ? (
                <>
                  <td className={td} style={{ borderBottom: `1px solid ${LINE}` }}>{num(r.qty, 3)}</td>
                  <td className={td} style={{ borderBottom: `1px solid ${LINE}` }}>{rupeesExact(r.actual)}</td>
                  <td className={td} style={{ borderBottom: `1px solid ${LINE}` }}>{rupeesExact(r.proposed)}</td>
                </>
              ) : (
                <td className="px-2 py-[7px] align-top" style={{ borderBottom: `1px solid ${LINE}` }}><Tag kind={r.kind} /></td>
              )}
              <td className={`${td} font-bold`} style={{ borderBottom: `1px solid ${LINE}` }}>{rupeesExact(r.loss)}</td>
              <td className={td} style={{ borderBottom: `1px solid ${LINE}` }}>{pct(r.pct, 2)}</td>
              <td className={td} style={{ borderBottom: `1px solid ${LINE}` }}>{pct(r.share, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SwitchesDrawer({ lists, ranked, meta, filters, scope, asOf, open, initialTab, onClose, onGo }: {
  /** Each section's own top ten, as the API ranks it; a section still loading is absent. */
  lists: Partial<Record<LossKind, BrandSwitch[]>>;
  ranked: BrandSwitch[];
  meta: Meta; filters: Filters; scope: Overview["scope"]; asOf: string | null;
  open: boolean; initialTab?: string; onClose: () => void; onGo: Go;
}) {
  const sectionTabs: DrawerTab[] = ORDER.flatMap((k) => {
    const rows = lists[k];
    if (!rows) return [];
    const w = KIND[k];
    return [{
      key: k, label: w.short, render: () => (
        <DrawerSection title={`${w.short}: top ${rows.length} brands`}
          note={`${w.actual} and ${w.proposed.toLowerCase()} for the units used; % missed is ${w.pctOf}; share is the brand's part of the section's whole loss.`}>
          <SwitchTable rows={rows} kind={k} />
          <div className="mt-4"><GoLinks onGo={onGo} links={[{ label: `Every ${w.short} brand`, section: w.section, view: "items" }]} /></div>
        </DrawerSection>
      ),
    }];
  });
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={initialTab} size="wide"
      eyebrow="Spend summary · across sections" title={`Top brand switches · ${whereOf(scope)}`}
      kpi={ranked[0] ? { value: rupeesExact(ranked[0].loss), comparator: `the largest: ${ranked[0].used} → ${ranked[0].suggested} (${KIND[ranked[0].kind].short})` } : undefined}
      source={sourceOf(ranked)} asOf={asOf} filters={filterChips(meta, filters, scope, "Each section's own")}
      tabs={[
        {
          key: "ranked", label: "All sections", render: () => (
            <DrawerSection title="Ranked together" note="Each section's top ten in one list, most rupees lost first. The losses are each section's own measure, so the list ranks them and never adds them.">
              <SwitchTable rows={ranked} />
            </DrawerSection>
          ),
        },
        ...sectionTabs,
        {
          key: "method", label: "Method", render: () => (
            <MethodText lines={[
              "Each section's top ten brands by loss, as its overview ranks them (HCG's 'Top 10 materials list contribution in margin missed'), put in one list by rupees lost.",
              "Scheme: the loss is the spend above the suggested brand's for scheme (GOV) patients. Cash & TPA: the margin the suggested brand would have added for cash and TPA patients. Out of formulary: the margin the matched formulary brand would have added, the app's estimate.",
              "The lists measure different things for different patients, so they are ranked together and never added.",
            ]} />
          ),
        },
      ]} />
  );
}
