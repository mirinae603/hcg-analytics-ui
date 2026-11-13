"use client";
// Every unit side by side, in full: the heat-map of every unit in HCG's list (and every unit with
// sales), in HCG's own order — its revenue, margin %, compliance against its budget, the
// consumption split, and its part of each figure missed. The first tab of the Hospitals tile's
// drawer (HospitalsTile), whose face prints the short version of the same rows; both build their
// rows here (unitRows), so a unit's figures, marks and blank reasons read the same in each.
//
// Each rate column is washed green to red by where a unit stands in it (best to worst).
// Compliance, when it is judged against a budget, takes its status instead: a mark before the
// figure (✓ met, ~ within, ✕ below) and the status tint, and a unit without a budget is left
// unwashed. The rupee columns (revenue, each amount missed, extra paid) are washed by size in
// their own colour, not green to red: a big hospital misses more rupees because it is big, and
// red would read as the worst run. Extra paid is set against the usual cheapest of all hospitals,
// and its header says so. Every cell prints its figure. A row selects that unit in the header
// (the selected row goes back to all hospitals); the table ignores the hospital selector, so the
// selected unit is always seen among the others.
import React from "react";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { Heatmap, HEAT_LEGEND, heatTone, type HeatColumn, type HeatRow } from "@/components/portfolio/ledger/heatmap";
import { Legend, type LegendItem } from "@/components/portfolio/ledger/legend";
import { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import { STATUS_COLOR, STATUS_LABEL, WITHIN_PTS } from "@/components/portfolio/ledger/status";
import { isNum, lakhs, pct, pts, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import { ExactTable, KPI_COL, MethodText, PAGES, QUANTITY, QUANTITY_LC, RUPEES_ONLY, unitName, type ExecCtx } from "./shared";
import type { Status, UnitRow } from "./api";

/** The mark before a judged compliance figure: the status without its colour. */
export const STATUS_MARK: Record<Status, string> = { met: "✓", within: "~", below: "✕" };
export const STATUS_KEY: Record<Status, string> = { met: "Met budget", within: `Within ${WITHIN_PTS} pts`, below: "Below budget" };

/** The UnitRow fields that hold a number. */
type NumKey = { [K in keyof UnitRow]: UnitRow[K] extends number | null ? K : never }[keyof UnitRow];

/** A column of a units table: how the heat-map draws it, the unit's figure for it, and how the
 *  drawer's exact table prints it. */
export type UnitCol = HeatColumn & {
  /** The unit's figure: the server's own, or (the total missed) the sum of its parts. */
  get: (u: UnitRow) => number | null;
  /** The tooltip of a cell that has a figure (the total missed's parts), when it needs one. */
  note?: (u: UnitRow) => string | null;
  exact: (v: number) => string;
  unit: "₹" | "%";
};

/** A unit's figure straight from its row. */
export const field = (key: NumKey) => (u: UnitRow): number | null => { const v = u[key]; return isNum(v) ? v : null; };

/** Column widths, padding included: each fits its header's longest word and its widest figure
 *  (the heat-map gives the unit names what they leave). Eleven figures and the names fit the
 *  drawer's width. */
function columnsOf(c: ExecCtx): UnitCol[] {
  const share = c.units ? "of units sold" : "of drug cost";
  // Compliance is washed by status alone where any unit is judged against a budget.
  const statuses = c.d.units.some((u) => u.status != null);
  // A rupee column is a size, washed in its own colour: biggest deepest, never good or bad.
  const money = (key: NumKey, label: string, title: string, color: string, width: number): UnitCol =>
    ({ key, get: field(key), label, title: `${title}. Washed by size: the deepest is the most rupees, not the worst run.`, format: lakhs, exact: rupeesExact, unit: "₹", good: null, color, width });
  const rate = (key: NumKey, label: string, title: string, good: "up" | "down" | null, width: number, extra: Partial<UnitCol> = {}): UnitCol =>
    ({ key, get: field(key), label, title, format: (v) => pct(v, 1), exact: (v) => pct(v), unit: "%", good, width, ...extra });
  return [
    { key: "mrp", get: field("mrp"), label: "Revenue", title: `Revenue at MRP${c.units ? ` (${RUPEES_ONLY})` : ""}`, format: lakhs, exact: rupeesExact, unit: "₹", good: null, color: KPI_COL.sales, width: 60 },
    rate("margin_pct", "Margin %", "Margin ÷ MRP", "up", 52),
    rate("compliance_pct", "Compliance", `Formulary compliance, pooled, ${c.units ? "on quantity (units sold)" : "on drug cost"}${statuses ? `: ✓ met budget, ~ within ${WITHIN_PTS} pts, ✕ below` : ""}`, "up", 78, { toneOnly: statuses }),
    rate("budget_pct", "Budget", "Compliance budget for the unit (its PAN MIS)", null, 52, { format: (v) => pct(v, 0) }),
    rate("formulary_share_pct", "Formulary %", `Formulary's share ${share}`, "up", 72),
    rate("oof_share_pct", "OOF %", `Out of formulary's share ${share}`, "down", 48),
    rate("nf_share_pct", "Non-form. %", `Non-formulary's share ${share}`, "down", 56),
    money("oof_loss", "OOF missed", "Out-of-formulary margin missed, on purchases", KPI_COL.losses, 58),
    money("cash_loss", "Cash & TPA missed", "Cash & TPA margin missed", KPI_COL.losses, 58),
    money("scheme_missed", "Scheme missed", "Scheme saving missed", KPI_COL.losses, 58),
    // Always against all hospitals' usual cheapest, so it says so: with one hospital selected the
    // Extra paid KPI above is set against that hospital's own, a different figure.
    money("extra_paid", "Extra paid vs all hospitals", "Paid above the usual cheapest of all hospitals, on purchases", KPI_COL.extra_paid, 82),
  ];
}

/** What the green-to-red wash means, and the status marks where compliance is judged. */
function legendOf(c: ExecCtx): LegendItem[] {
  return [...HEAT_LEGEND, ...statusLegend(c)];
}

/** One key per compliance status a unit has in this selection: its mark and its tint. */
export function statusLegend(c: ExecCtx): LegendItem[] {
  const seen = (["met", "within", "below"] as const).filter((st) => c.d.units.some((u) => u.status === st));
  return seen.map((st) => ({ key: st, label: `${STATUS_MARK[st]} ${STATUS_KEY[st]}`, color: heatTone(STATUS_COLOR[st]) }));
}

/** Why a unit's budget cell is blank: the server's own reason when it gives one (the months
 *  selected have different budgets), else the page's. */
function noBudget(c: ExecCtx, u: UnitRow): string {
  if (u.budget_note) return u.budget_note;
  if (c.units) return `No budget on ${QUANTITY_LC}: the budget is a drug-cost target`;
  if (!c.judged) return "Not compared under the Patients or Material filter: the budget is set for the whole drug spend";
  if (u.pan_order == null) return "Not in the unit list, so it has no budget";
  return "The MIS sets no budget for this unit";
}

/** Why any other cell is blank. */
function blank(c: ExecCtx, key: string): string {
  if (key === "compliance_pct" || key.endsWith("share_pct")) {
    return c.d.scope.segment === "consumables" ? "Consumables have no formulary compliance" : "No drug consumption in this selection";
  }
  if (key === "margin_pct") return "No sales in this selection";
  return "That section has no figures for this selection (see Method)";
}

/** A unit can be selected when there is something to show for it (or to go back to all). */
const selectable = (u: UnitRow) => u.selected || (isNum(u.mrp) && u.mrp > 0) || isNum(u.compliance_pct);

/** Every unit as a heat-map row for `cols`: its figures, the reason for each blank, compliance's
 *  status (its tint, its mark and its words), and the selection of that hospital. A split bar
 *  under the names draws figures of the row, so its parts must be columns too. */
export function unitRows(c: ExecCtx, cols: UnitCol[]): HeatRow[] {
  return c.d.units.map((u) => {
    const values: HeatRow["values"] = {};
    const notes: Record<string, string | null> = {};
    for (const col of cols) {
      const v = col.get(u);
      values[col.key] = v;
      if (!isNum(v)) notes[col.key] = col.key === "budget_pct" ? noBudget(c, u) : blank(c, col.key);
      else if (col.note) notes[col.key] = col.note(u);
    }
    if (isNum(u.compliance_pct)) {
      notes.compliance_pct = [
        u.status ? STATUS_LABEL[u.status] : null,
        isNum(u.budget_pct) ? `budget ${pct(u.budget_pct, 0)}` : u.budget_note,
        isNum(u.delta_pts) && c.prevLabel ? `${withSign(u.delta_pts, (v) => pts(v))} vs ${c.prevLabel}` : null,
      ].filter(Boolean).join(" · ") || null;
    }
    return {
      key: u.plant, label: unitName(u), sub: u.region ?? undefined, values, notes, selected: u.selected,
      tones: u.status ? { compliance_pct: STATUS_COLOR[u.status] } : undefined,
      marks: u.status ? { compliance_pct: STATUS_MARK[u.status] } : undefined,
      onClick: selectable(u) ? () => c.select(u) : undefined,
      why: selectable(u) ? undefined : "No sales or drug consumption in this selection",
    };
  });
}

/** The drawer tab: the heat-map of every unit, then its exact figures with a CSV. */
export function UnitsView({ c }: { c: ExecCtx }) {
  const cols = columnsOf(c);
  const units = c.d.units;
  const cell = (col: UnitCol) => (u: UnitRow) => { const v = col.get(u); return isNum(v) ? col.exact(v) : "—"; };
  return (
    <>
      <DrawerSection title="Every unit at a glance" note="Each figure washed by where the unit stands in its column. Select a row to show that hospital; shaded = the hospital selected in the header.">
        <div className="mb-2"><Legend items={legendOf(c)} /></div>
        <Heatmap columns={cols} rows={unitRows(c, cols)} ariaLabel={`Every unit, ${c.when}`} maxHeight={520} empty="No units in this selection." />
      </DrawerSection>
      <DrawerSection title="Every unit, exact" note="In the group's own order, exact figures. Shaded = the hospital selected in the header.">
        <ExactTable rows={units} rowKey={(u) => u.plant} caption={`Every unit, ${c.when}`} selected={(u) => u.selected}
          columns={[
            { label: "Unit", value: (u) => unitName(u), text: true },
            { label: "Region", value: (u) => u.region ?? "—", raw: (u) => u.region, text: true },
            ...cols.map((col) => ({ label: col.label, value: cell(col), raw: col.get, unit: col.unit, strong: col.key === "compliance_pct" })),
            { label: "Status", value: (u: UnitRow) => (u.status ? STATUS_LABEL[u.status] : "—"), raw: (u: UnitRow) => (u.status ? STATUS_LABEL[u.status] : null), text: true },
            { label: c.prevLabel ? `vs ${c.prevLabel}` : "Change", value: (u: UnitRow) => (isNum(u.delta_pts) ? withSign(u.delta_pts, (v) => pts(v)) : "—"), raw: (u: UnitRow) => u.delta_pts, unit: "pts" as const },
          ]} />
      </DrawerSection>
      <LinkButton onClick={() => c.go(PAGES.formulary.href)}>Open {PAGES.formulary.name}</LinkButton>
    </>
  );
}

/** How the heat-map is washed and why a cell is blank, for the drawer's Method tab. */
export function UnitsMethod({ c }: { c: ExecCtx }) {
  return (
    <MethodText>
      <p>One row per unit: every unit in the unit list and every unit with sales, in the group&apos;s own order. The table ignores the hospital selector (the selected unit is shaded) and follows the other filters.</p>
      <p>Each rate column is washed on its own scale, by where a unit stands among the others: the best value in the column the deepest green, the worst the deepest red, the middle nearly white. Higher is better for margin %, compliance and the formulary share; lower is better for the out-of-formulary and non-formulary shares.</p>
      <p>The rupee columns — revenue, each amount missed and extra paid — are washed by size alone, in their own colour: the deepest is the most rupees. A bigger hospital buys and sells more, so it misses more rupees too; a green-to-red wash would paint it the worst run for its size. Compare the rates, or open a unit, to judge how it is run. The budget is not washed.</p>
      <p>Where compliance is judged against the budget it shows the unit&apos;s status instead: a mark before the figure (✓ met, ~ within {WITHIN_PTS} pts, ✕ below) on a tint of its status colour; a unit with no budget is left unwashed, so it never reads as judged. Every cell prints its figure, so the colour is never the only cue.</p>
      <p>A blank cell (—) has a reason in its tooltip: {[
        "a unit with no drug consumption in the selection has no compliance or split",
        `a unit the MIS sets no budget for, or whose months selected have different budgets, has no budget, and so has every unit on the ${QUANTITY} basis or with Consumables picked`,
        "a section without figures for the month leaves its column blank for every unit",
      ].join("; ")}. A money column is ₹ 0 where the section has the month and the unit has nothing in it.</p>
      <p>Revenue is sales at MRP; the shares are of drug consumption ({c.units ? "units sold" : "drug cost"}); out of formulary and extra paid are counted on purchases. A unit&apos;s extra paid is set against the usual cheapest of all hospitals, as its header says, so that every row is on one yardstick; with one hospital selected, the Extra paid KPI above sets it against that hospital&apos;s own usual cheapest instead, a different figure. Margin and every amount missed stay in rupees on the {QUANTITY} basis.</p>
    </MethodText>
  );
}
