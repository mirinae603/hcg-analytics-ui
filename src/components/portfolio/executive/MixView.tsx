"use client";
// Consumption mix by unit (task 13): each unit's drug consumption as one bar of 100% — formulary,
// out of formulary and non-formulary, the shares the server sends — in HCG's own order or with
// the highest out-of-formulary share first. A tab of the Hospitals tile's drawer; the tile's face
// draws the same split as a mini bar on every unit's row, with the three shares beside it, and
// takes its parts (MIX_PARTS) from here.
//
// No budget tick: HCG's budget is set for the compliance ratio, not for these shares.
// Non-formulary sits outside that ratio, so it is hatched, as on the Formulary page. Each row
// prints its three shares to one decimal after the bar (formulary · out of formulary ·
// non-formulary, the bar's own order), so one screenshot carries every figure. A row selects that
// unit in the header.
import React, { useState } from "react";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { StackBars, type StackRow, type StackSegment } from "@/components/portfolio/ledger/charts";
import type { HeatPart } from "@/components/portfolio/ledger/heatmap";
import { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import { SUB } from "@/components/portfolio/ledger/kit";
import { isNum, pct } from "@/components/portfolio/ledger/format";
import { F_COL, NF_COL, OOF_COL } from "@/components/portfolio/formulary/parts";
import { ExactTable, MethodText, PAGES, Segmented, sizeExact, unitName, type ExecCtx } from "./shared";
import type { UnitRow } from "./api";

/** The split's three parts, by the UnitRow share each one is, in the bar's order. */
export const MIX_PARTS = [
  { key: "formulary_share_pct", label: "Formulary", color: F_COL },
  { key: "oof_share_pct", label: "Out of formulary", color: OOF_COL },
  { key: "nf_share_pct", label: "Non-formulary", color: NF_COL, hatched: true },
] as const satisfies readonly (HeatPart & { key: keyof UnitRow })[];

const SEGMENTS: StackSegment[] = MIX_PARTS.map((p) => ({ key: p.key, label: p.label, color: p.color, hatched: "hatched" in p ? p.hatched : undefined }));

type Order = "pan" | "oof";
const ORDERS: { key: Order; label: string }[] = [{ key: "pan", label: "Group order" }, { key: "oof", label: "Highest OOF first" }];

const hasMix = (u: UnitRow) => isNum(u.formulary_share_pct) || isNum(u.oof_share_pct) || isNum(u.nf_share_pct);

/** A share after the bar: one decimal, no % sign (the column's heading has it). */
const share1 = (v: number | null | undefined) => (isNum(v) ? v.toFixed(1) : "—");
/** The three shares after a unit's bar, in the bar's order. */
const asideOf = (u: UnitRow) => `${share1(u.formulary_share_pct)} · ${share1(u.oof_share_pct)} · ${share1(u.nf_share_pct)}`;
/** The heading over those figures. */
const ASIDE_HEAD = "Form. · OOF · Non-form. %";

/** The units with a split, in the order asked for (units without one are counted, not drawn). */
function unitsOf(c: ExecCtx, order: Order): UnitRow[] {
  const withMix = c.d.units.filter(hasMix);
  if (order === "pan") return withMix;
  return [...withMix].sort((a, b) => (b.oof_share_pct ?? -1) - (a.oof_share_pct ?? -1) || unitName(a).localeCompare(unitName(b)));
}

/** The drawer tab: every unit's bar, in the order picked, then the exact shares with a CSV. */
export function MixView({ c }: { c: ExecCtx }) {
  const [order, setOrder] = useState<Order>("pan");
  const units = unitsOf(c, order);
  const consumables = c.d.scope.segment === "consumables";
  // Under the Consumables filter no unit has a split (consumables have none), which the empty
  // text says: they are not units "with no drug consumption".
  const left = consumables ? 0 : c.d.units.length - units.length;
  const rows: StackRow[] = units.map((u) => ({
    key: u.plant, label: unitName(u), selected: u.selected,
    values: { formulary_share_pct: u.formulary_share_pct, oof_share_pct: u.oof_share_pct, nf_share_pct: u.nf_share_pct },
    aside: asideOf(u),
  }));
  const byKey = new Map(units.map((u) => [u.plant, u]));
  const m = c.d.mix;
  const size = c.units ? "units" as const : "₹" as const;
  return (
    <>
      <DrawerSection title="Each unit as 100%" note={`Drug consumption ${c.units ? "in units sold" : "at cost"}; the three figures after each bar are its shares (${ASIDE_HEAD}). Select a row to show that hospital.`}>
        <div className="flex items-center gap-2 mb-2">
          <Segmented label="Order the units" value={order} options={ORDERS} onChange={setOrder} />
          {left > 0 && <span className="ml-auto text-[11px]" style={{ color: SUB }}>+{left} with no drug consumption</span>}
        </div>
        <StackBars segments={SEGMENTS} rows={rows} onRow={(key) => { const u = byKey.get(key); if (u) c.select(u); }}
          format={(v) => pct(v, 1)} asideWidth={112} labelWidth={220} maxHeight={480}
          empty={consumables ? "Consumables have no formulary split." : "No drug consumption in this selection."}
          ariaLabel={`Each unit's drug consumption${c.units ? " in units sold" : ""} as 100%: formulary, out of formulary, non-formulary`} />
      </DrawerSection>
      {m && (
        <DrawerSection title={c.network ? "All units together" : `${c.where}`} note={`Drug consumption ${c.units ? "in units sold" : "at cost"}; the shares are the server's.`}>
          <ExactTable rows={[m]} rowKey={() => "mix"} caption={`Consumption mix, ${c.where}`}
            columns={[
              { label: "Selection", value: () => c.where, text: true },
              { label: "Formulary", value: (r) => sizeExact(r.formulary, c.units), raw: (r) => r.formulary, unit: size },
              { label: "Total", value: (r) => sizeExact(r.total, c.units), raw: (r) => r.total, unit: size, strong: true },
              { label: "Out of formulary", value: (r) => sizeExact(r.out_of_formulary, c.units), raw: (r) => r.out_of_formulary, unit: size },
              { label: "Non-formulary", value: (r) => sizeExact(r.non_formulary, c.units), raw: (r) => r.non_formulary, unit: size },
              { label: "Formulary %", value: (r) => pct(r.formulary_pct), raw: (r) => r.formulary_pct, unit: "%" },
              { label: "OOF %", value: (r) => pct(r.oof_pct), raw: (r) => r.oof_pct, unit: "%" },
              { label: "Non-formulary %", value: (r) => pct(r.nf_pct), raw: (r) => r.nf_pct, unit: "%" },
            ]} />
        </DrawerSection>
      )}
      <DrawerSection title="Every unit, exact" note="In the group's own order. Shaded = the hospital selected in the header; — = no drug consumption in this selection.">
        <ExactTable rows={c.d.units} rowKey={(u) => u.plant} caption={`Consumption mix by unit, ${c.when}`} selected={(u) => u.selected}
          columns={[
            { label: "Unit", value: (u) => unitName(u), text: true },
            { label: "Formulary %", value: (u) => pct(u.formulary_share_pct), raw: (u) => u.formulary_share_pct, unit: "%", strong: true },
            { label: "Out of formulary %", value: (u) => pct(u.oof_share_pct), raw: (u) => u.oof_share_pct, unit: "%" },
            { label: "Non-formulary %", value: (u) => pct(u.nf_share_pct), raw: (u) => u.nf_share_pct, unit: "%" },
          ]} />
      </DrawerSection>
      <LinkButton onClick={() => c.go(PAGES.formulary.href)}>Open {PAGES.formulary.name}</LinkButton>
    </>
  );
}

export function MixMethod({ c }: { c: ExecCtx }) {
  return (
    <MethodText>
      <p>Each unit&apos;s drug consumption (formulary + out of formulary + non-formulary{c.units ? ", in units sold" : ", at cost"}) as one bar of 100%, with each part&apos;s share of it as the server works it out. The shares follow the page&apos;s filters, like the units table. Non-formulary is inside these shares, unlike the compliance ratio (formulary ÷ formulary + out of formulary), so it is hatched; no budget is ticked, because the budget is set for the ratio, not for these shares.</p>
      <p>The three figures after each bar — and the three columns beside the mini bar on the page — are its shares to one decimal, in the bar&apos;s order: formulary, out of formulary, non-formulary (they add up to 100, give or take the rounding).</p>
      <p>&quot;Group order&quot; lists the units as the group&apos;s own reports do; &quot;Highest OOF first&quot; puts the largest out-of-formulary share at the top. Units with no drug consumption in the selection are counted beside the switch, not drawn.</p>
    </MethodText>
  );
}
