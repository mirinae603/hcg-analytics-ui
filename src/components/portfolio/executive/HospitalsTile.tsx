"use client";
// Hospitals side by side: the tile that sets HCG's units against each other on the one-screen
// overview, two rows tall at the right of the page. Its switch has two views:
//   Hospitals — every unit in HCG's list (and every unit with sales), one compact row each, in
//               HCG's own order: its drug consumption split out of 100 (a 100% bar under its
//               name, and the formulary, out-of-formulary and non-formulary shares beside it, so
//               a screenshot carries the figures), its compliance in its budget status (mark and
//               tint), its margin % and its total missed. Every figure is printed; a row selects
//               that unit in the header (the selected row, shaded, goes back to all hospitals).
//               The rows are unitRows', as in the full heat-map, so a unit reads the same in both.
//   Items     — the ten items that consumed the most, or the ten with the lowest margin %
//               (Top | Bottom), from the top lists (TopView).
// The face is the short version of five panels the page used to show one under the other; they
// are this tile's drawer, a tab each, with their exact tables and CSVs: every unit as the full
// eleven-figure heat-map, the consumption mix by unit, compliance against budget, the top and
// bottom 10 (items and hospitals) and the flow of sales. Its Method tab has each one's method.
// (The treemap of where the money goes is in the IP vs OP tile's drawer, beside the same sales.)
//
// The total missed is the three parts the server sends for each unit, added as the Total missed
// tile adds them for the selection (missedOf); the drawer's heat-map has each part on its own.
import React, { useState } from "react";
import { ChartPanel, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { Heatmap } from "@/components/portfolio/ledger/heatmap";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { SUB } from "@/components/portfolio/ledger/kit";
import { WITHIN_PTS } from "@/components/portfolio/ledger/status";
import { pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { HOSPITAL_COL, HowBuilt, ITEM_COL, MISSED_PARTS, MethodText, QUANTITY, QUANTITY_LC, RUPEES_ONLY, Segmented, filterChips, inLakhs, missedNote, missedOf, pctBare, type ExecCtx } from "./shared";
import { STATUS_MARK, STATUS_KEY, UnitsMethod, UnitsView, field, unitRows, type UnitCol } from "./UnitsView";
import { MIX_PARTS, MixMethod, MixView } from "./MixView";
import { BudgetMethod, BudgetView } from "./BudgetView";
import { ENDS, END_WORD, TopMethod, TopView, listEmpty, listFormat, listName, onOf, signedOf, topRows, type End } from "./TopView";
import { FLOW_TITLE, FlowMethod, FlowView } from "./FlowView";

const TITLE = "Hospitals side by side";

type View = "units" | "items";
const VIEWS: { key: View; label: string }[] = [{ key: "units", label: "Hospitals" }, { key: "items", label: "Items" }];

/** The face's columns: the split's three shares (each keyed to its part of the bar under the
 *  names), compliance in its status, margin % and the total missed. Each header gives its unit
 *  on a second line, so the figures print bare and the header sets the width: six columns in
 *  ~240px at 11px, which leaves the names ~105px on a 1280px screen and ~160px at 1440px. */
function faceColumns(c: ExecCtx): UnitCol[] {
  const of = c.units ? "of units sold" : "of drug cost";
  const statuses = c.d.units.some((u) => u.status != null);
  const share = (p: (typeof MIX_PARTS)[number], label: string, width: number): UnitCol => ({
    key: p.key, get: field(p.key), label, sub: "%", title: `${p.label}'s share ${of}, %`, format: (v) => pctBare(v), exact: (v) => pct(v), unit: "%",
    good: null, width, swatch: { color: p.color, hatched: "hatched" in p ? p.hatched : undefined },
  });
  return [
    share(MIX_PARTS[0], "Form.", 40),
    share(MIX_PARTS[1], "OOF", 30),
    share(MIX_PARTS[2], "Non-F.", 40),
    {
      key: "compliance_pct", get: field("compliance_pct"), label: "Compl.", sub: "%", format: (v) => pctBare(v), exact: (v) => pct(v), unit: "%", good: null, toneOnly: true, width: 44,
      title: `Formulary compliance, ${c.units ? "on quantity (units sold)" : "on drug cost"}, %${statuses ? `: ✓ met budget, ~ within ${WITHIN_PTS} pts, ✕ below, tinted in its status colour` : ""}`,
    },
    { key: "margin_pct", get: field("margin_pct"), label: "Margin", sub: "%", title: "Margin % (margin ÷ MRP)", format: (v) => pctBare(v), exact: (v) => pct(v), unit: "%", good: null, width: 43 },
    {
      key: "missed", get: missedOf, note: missedNote, label: "Missed", sub: "₹ L", format: inLakhs, exact: rupeesExact, unit: "₹", good: null, width: 44,
      title: `Total missed, ₹ in lakhs: ${MISSED_PARTS.map((p) => p.label.toLowerCase()).join(" + ")}, as the Total missed tile${c.units ? ` (${RUPEES_ONLY})` : ""}`,
    },
  ];
}

/** What the compliance tints mean, in words beside the switch: the statuses this selection has,
 *  or why compliance is not judged against a budget. */
function statusNote(c: ExecCtx): string | null {
  const seen = (["met", "within", "below"] as const).filter((st) => c.d.units.some((u) => u.status === st));
  if (seen.length) return seen.map((st) => `${STATUS_MARK[st]} ${STATUS_KEY[st].toLowerCase()}`).join(" · ");
  if (c.units) return `No budget on ${QUANTITY_LC}`;
  if (!c.judged) return "No budget under these filters";
  return null;
}

export function HospitalsTile({ c, place }: { c: ExecCtx; place: Place }) {
  const dr = useDrawer();
  const [view, setView] = useState<View>("units");
  const [end, setEnd] = useState<End>("top");
  const units = view === "units";
  const cols = faceColumns(c);
  const items = topRows(c, end, "items");
  const note = statusNote(c);
  const title = units ? TITLE : `${END_WORD[end]} 10 items`;
  const context = units ? `every unit · ${c.when}` : `by ${onOf(c, end)}${end === "bottom" && c.units ? ` · ${RUPEES_ONLY}` : ""} · ${c.where}`;
  const label = units
    ? `${TITLE}, every unit, ${c.when}: ${c.d.units.length} units, each with its formulary, out-of-formulary and non-formulary shares, compliance, margin % and total missed. Select a row to show that hospital.`
    : `${listName(c, end, "items")}, ${c.context}: ${items.map((r) => `${r.label} ${r.valueLabel}`).join(", ")}`;
  return (
    <>
      <ChartPanel id="hospitals" title={title} context={context} accent={units ? HOSPITAL_COL : ITEM_COL} place={place}
        label={label} interactive onOpen={() => dr.show(units ? "units" : "top")} onInfo={() => dr.show("method")}>
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center gap-1.5 mb-1 flex-shrink-0 min-w-0">
            <Segmented label="Show" value={view} options={VIEWS} onChange={setView} />
            {!units && <Segmented label="Top or bottom 10 items" value={end} options={ENDS} onChange={setEnd} />}
            {units && note && <span className="ml-auto min-w-0 truncate text-[11px]" style={{ color: SUB }} title={note}>{note}</span>}
          </div>
          <PanelPart>
            {units ? (
              <Heatmap dense split={MIX_PARTS} columns={cols} rows={unitRows(c, cols)} labelWidth={220}
                ariaLabel={`Every unit, ${c.when}: drug consumption split, compliance, margin % and total missed`} empty="No units in this selection." />
            ) : (
              <RankBars key={end} rows={items} format={listFormat(c, end)} color={ITEM_COL} signed={signedOf(end, items)}
                onMore={() => dr.show("top")} ariaLabel={listName(c, end, "items")} empty={listEmpty(c, end)} />
            )}
          </PanelPart>
        </div>
      </ChartPanel>
      <HospitalsDrawer c={c} dr={dr} end={end} />
    </>
  );
}

function HospitalsDrawer({ c, dr, end }: { c: ExecCtx; dr: DrawerCtl; end: End }) {
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow="Executive overview" title={`${TITLE} · ${c.when}`}
      source="computed" asOf={c.asOf} filters={filterChips(c, { counted: "mixed" })}
      tabs={[
        { key: "units", label: "Every unit", render: () => <UnitsView c={c} /> },
        { key: "mix", label: "Consumption mix", render: () => <MixView c={c} /> },
        { key: "budget", label: "Compliance vs budget", render: () => <BudgetView c={c} /> },
        { key: "top", label: "Top & bottom 10", render: () => <TopView c={c} end={end} list="items" /> },
        { key: "flow", label: FLOW_TITLE, render: () => <FlowView c={c} /> },
        {
          key: "method", label: "Method", render: () => (
            <>
              <DrawerSection title="The tile"><FaceMethod c={c} /></DrawerSection>
              <DrawerSection title="Every unit"><UnitsMethod c={c} /></DrawerSection>
              <DrawerSection title="Consumption mix"><MixMethod c={c} /></DrawerSection>
              <DrawerSection title="Compliance vs budget"><BudgetMethod /></DrawerSection>
              <DrawerSection title="Top & bottom 10"><TopMethod c={c} /></DrawerSection>
              <DrawerSection title={FLOW_TITLE}><FlowMethod c={c} /></DrawerSection>
              <HowBuilt c={c} />
            </>
          ),
        },
      ]} />
  );
}

function FaceMethod({ c }: { c: ExecCtx }) {
  return (
    <MethodText>
      <p>Hospitals: one row per unit, every unit in HCG&apos;s unit list and every unit with sales, in HCG&apos;s own order. The rows ignore the hospital selector (the selected unit is shaded) and follow the other filters. Select a row to show that hospital in the header, and the selected row again to go back to all hospitals.</p>
      <p>The bar under each name is the unit&apos;s drug consumption ({c.units ? "units sold" : "at cost"}) as 100%: formulary, out of formulary and non-formulary (hatched: it sits outside the compliance ratio), in that order. The three columns after the name are the same shares, as the server works them out, each keyed by the colour strip under its header; they add up to 100, give or take the rounding.</p>
      <p>Compliance is formulary ÷ (formulary + out of formulary), pooled{c.units ? ` on units sold on the ${QUANTITY} basis, where no budget applies` : ""}. Where HCG&apos;s budget applies (the Value basis, every patient and material) it carries the unit&apos;s status: ✓ met, ~ within {WITHIN_PTS} pts, ✕ below, on a tint of its colour; the Compliance vs budget tab draws each gap. Margin % is margin ÷ MRP.</p>
      <p>Missed is the unit&apos;s total missed, as the Total missed tile counts it for the selection: the cash &amp; TPA margin missed, the scheme saving missed and the out-of-formulary margin missed (on purchases), each its section&apos;s figure for the unit, added. A part whose section has no figures for the selection is left out; one below zero (brands that earned more than the suggested ones) takes away. The Every unit tab has each part in its own column. It is in rupees on either basis.</p>
      <p>Items: the ten items that consumed the most, or the ten with the lowest margin %, for the hospital in the header; the Top &amp; bottom 10 tab has the hospitals&apos; lists too.</p>
    </MethodText>
  );
}
