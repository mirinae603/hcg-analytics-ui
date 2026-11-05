"use client";
// Top and bottom 10, item-wise or hospital-wise:
//   Top    — the ten items, or the ten hospitals (HCG's units), that consumed the most, ranked
//            the way the formulary pages rank them — consumption at cost price, or units sold on
//            the Quantity basis — each with its share of the whole as the server sends it.
//   Bottom — the ten with the lowest margin % (margin ÷ MRP), among those with at least the
//            server's minimum share of the sales at MRP, so a line of a few rupees cannot fill the
//            list (its notes give the share). Margin is money, so this list is in rupees on
//            either basis and says so.
// The Hospitals tile's Items view draws the item lists (topRows), with its own Top | Bottom
// switch; its drawer's "Top & bottom 10" tab (TopView) has both lists of both kinds, the bars and
// the exact figures. Items follow the hospital selector; hospitals are every one's (the selected
// one shaded), and a row selects it.
//
// The top whole is the server's, and its note says what it holds. It is called "consumption at
// cost", never "drug cost": on this page drug cost is the mix's formulary + out of formulary +
// non-formulary, and a whole with consumables in it (or the Consumables filter's) is not that.
import React, { useState } from "react";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import { isNum, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { ExactTable, HOSPITAL_COL, ITEM_COL, MethodText, PAGES, QUANTITY, RUPEES_ONLY, Segmented, sizeExact, sizeShort, unitName, unitsExact, type ExactColumn, type ExecCtx } from "./shared";
import type { BottomItem, BottomUnit, TopItem, TopUnit } from "./api";

export type End = "top" | "bottom";
export type List = "items" | "units";
export const ENDS: { key: End; label: string }[] = [{ key: "top", label: "Top" }, { key: "bottom", label: "Bottom" }];
/** "Hospitals", not "Units": units sold are counted on the Quantity basis. */
const LISTS: { key: List; label: string }[] = [{ key: "items", label: "Items" }, { key: "units", label: "Hospitals" }];
const LIST_WORD: Record<List, string> = { items: "items", units: "hospitals" };
export const END_WORD: Record<End, string> = { top: "Top", bottom: "Bottom" };

/** What the top lists are ranked on, in words. */
export const rankedOn = (c: ExecCtx) => (c.units ? "units sold" : "consumption at cost");
/** What the bottom lists are ranked on: money on either basis. */
const LOWEST = "lowest margin %";
/** What a list is ranked on. */
export const onOf = (c: ExecCtx, end: End) => (end === "top" ? rankedOn(c) : LOWEST);

/** A bottom row's share of the selection's sales at MRP, under its figure. */
const revenueShare = (r: { share_pct: number | null }) => `${pct(r.share_pct, 1)} of revenue`;

/** A list's name: "Top 10 items by consumption at cost". */
export const listName = (c: ExecCtx, end: End, list: List) => `${END_WORD[end]} 10 ${LIST_WORD[list]} by ${onOf(c, end)}`;
/** The list's colour: items and hospitals in the coral of a one-measure ranking, as on the Spend
 *  pages. */
export const listColor = (list: List) => (list === "items" ? ITEM_COL : HOSPITAL_COL);
/** What the list's figures print: the size on the basis (top), or the margin % (bottom). */
export const listFormat = (c: ExecCtx, end: End) => (end === "top" ? (v: number) => sizeShort(v, c.units) : (v: number) => pct(v, 0));
export const listEmpty = (c: ExecCtx, end: End) => (end === "top" ? `No ${rankedOn(c)} in this selection.` : "No item or hospital has enough sales for a margin % in this selection.");

/** One list as ranked bars: each item (with its generic name) or hospital, its figure and what
 *  that is a share of. A hospital's row selects it in the header. */
export function topRows(c: ExecCtx, end: End, list: List): RankRow[] {
  const fmt = (v: number) => sizeShort(v, c.units);
  const on = onOf(c, end);
  // A unit by HCG's own name, as the units table prints it; selected by its SAP name.
  const named = new Map(c.d.units.map((u) => [u.plant, unitName(u)]));
  const select = (plant: string, name: string) => {
    const selected = plant === c.d.scope.plant;
    return { selected, onClick: () => c.select({ plant, name, selected }) };
  };
  if (end === "top") {
    return list === "items"
      ? c.d.top.items.map((r) => ({
        key: r.material, label: r.material_desc ?? r.material, sub: r.generic_name ?? undefined,
        value: r.value, valueLabel: fmt(r.value ?? 0), aside: `${pct(r.share_pct, 1)} of ${on}`,
      }))
      : c.d.top.units.map((r) => ({
        key: r.plant, label: named.get(r.plant) ?? r.name, value: r.value, valueLabel: fmt(r.value ?? 0),
        aside: `${pct(r.share_pct, 1)} of ${on}`, ...select(r.plant, r.name),
      }));
  }
  return list === "items"
    ? c.d.top.bottom.items.map((r) => ({
      key: r.material, label: r.material_desc ?? r.material, sub: r.generic_name ?? undefined,
      value: r.margin_pct, valueLabel: pct(r.margin_pct, 1), aside: revenueShare(r),
    }))
    : c.d.top.bottom.units.map((r) => ({
      key: r.plant, label: named.get(r.plant) ?? r.name, value: r.margin_pct, valueLabel: pct(r.margin_pct, 1),
      aside: revenueShare(r), ...select(r.plant, r.name),
    }));
}

/** An item sold below its cost has a margin % below zero: the bars then run either side of it. */
export const signedOf = (end: End, rows: RankRow[]) => end === "bottom" && rows.some((r) => isNum(r.value) && r.value < 0);

/** A bottom list's money columns: the selection's sales at MRP, the margin on them and its %,
 *  and the share of the sales — rupees on either basis. */
function bottomColumns<T extends BottomItem | BottomUnit>(): ExactColumn<T>[] {
  return [
    { label: "Revenue (MRP)", value: (r) => rupeesExact(r.mrp), raw: (r) => r.mrp, unit: "₹" },
    { label: "Margin", value: (r) => rupeesExact(r.margin), raw: (r) => r.margin, unit: "₹" },
    { label: "Margin %", value: (r) => pct(r.margin_pct), raw: (r) => r.margin_pct, unit: "%", strong: true },
    { label: "Share of revenue", value: (r) => pct(r.share_pct), raw: (r) => r.share_pct, unit: "%" },
  ];
}

/** The chosen list's exact figures, with a CSV. */
function ExactList({ c, end, list }: { c: ExecCtx; end: End; list: List }) {
  const on = rankedOn(c);
  const value = c.units ? "Units sold" : "Consumption at cost";
  const size = c.units ? "units" as const : "₹" as const;
  const hospital = (plant: string, name: string) => c.d.units.find((u) => u.plant === plant)?.his_name || name;
  const bottom = c.d.top.bottom;
  const bottomNote = `The lowest margin % first, among those with at least a minimum share of the sales at MRP (see Method). Exact rupees on either basis${c.units ? ` (${RUPEES_ONLY})` : ""}.`;
  const title = `${listName(c, end, list)} · ${list === "items" ? c.where : "every hospital"}`;
  if (end === "top" && list === "items") {
    return (
      <DrawerSection title={title} note={`Ranked on ${on}; the share is of the selection's whole ${on}, as the server works it out.`}>
        <ExactTable rows={c.d.top.items} rowKey={(r: TopItem) => r.material} caption={`Top 10 items by ${on}, ${c.context}`}
          columns={[
            { label: "Item", value: (r) => r.material_desc ?? r.material, text: true },
            { label: "Code", value: (r) => r.material, text: true },
            { label: "Generic", value: (r) => r.generic_name ?? "—", raw: (r) => r.generic_name, text: true },
            { label: value, value: (r) => sizeExact(r.value, c.units), raw: (r) => r.value, unit: size, strong: true },
            ...(c.units ? [] : [{ label: "Units sold", value: (r: TopItem) => unitsExact(r.qty), raw: (r: TopItem) => r.qty, unit: "units" as const }]),
            { label: "Share", value: (r) => pct(r.share_pct), raw: (r) => r.share_pct, unit: "%" },
          ]} />
      </DrawerSection>
    );
  }
  if (end === "top") {
    return (
      <DrawerSection title={title} note={`Ranked on ${on}; the share is of every hospital's ${on}. Shaded = the hospital selected in the header.`}>
        <ExactTable rows={c.d.top.units} rowKey={(r: TopUnit) => r.plant} caption={`Top 10 hospitals by ${on}, ${c.when}`}
          selected={(r) => r.plant === c.d.scope.plant}
          columns={[
            { label: "Hospital", value: (r) => hospital(r.plant, r.name), text: true },
            { label: value, value: (r) => sizeExact(r.value, c.units), raw: (r) => r.value, unit: size, strong: true },
            ...(c.units ? [] : [{ label: "Units sold", value: (r: TopUnit) => unitsExact(r.qty), raw: (r: TopUnit) => r.qty, unit: "units" as const }]),
            { label: "Share", value: (r) => pct(r.share_pct), raw: (r) => r.share_pct, unit: "%" },
          ]} />
      </DrawerSection>
    );
  }
  if (list === "items") {
    return (
      <DrawerSection title={title} note={bottomNote}>
        <ExactTable rows={bottom.items} rowKey={(r: BottomItem) => r.material} caption={`Bottom 10 items by ${LOWEST}, ${c.context}`}
          columns={[
            { label: "Item", value: (r: BottomItem) => r.material_desc ?? r.material, text: true },
            { label: "Code", value: (r: BottomItem) => r.material, text: true },
            { label: "Generic", value: (r: BottomItem) => r.generic_name ?? "—", raw: (r: BottomItem) => r.generic_name, text: true },
            ...bottomColumns<BottomItem>(),
          ]} empty="No item has enough sales for a margin % in this selection." />
      </DrawerSection>
    );
  }
  return (
    <DrawerSection title={title} note={`${bottomNote} Shaded = the hospital selected in the header.`}>
      <ExactTable rows={bottom.units} rowKey={(r: BottomUnit) => r.plant} caption={`Bottom 10 hospitals by ${LOWEST}, ${c.when}`}
        selected={(r) => r.plant === c.d.scope.plant}
        columns={[
          { label: "Hospital", value: (r: BottomUnit) => hospital(r.plant, r.name), text: true },
          ...bottomColumns<BottomUnit>(),
        ]} empty="No hospital has enough sales for a margin % in this selection." />
    </DrawerSection>
  );
}

/** The drawer tab: the two switches, the chosen list's bars and its exact figures. Starts on the
 *  list the tile's face shows. */
export function TopView({ c, end: startEnd = "top", list: startList = "items" }: { c: ExecCtx; end?: End; list?: List }) {
  const [end, setEnd] = useState<End>(startEnd);
  const [list, setList] = useState<List>(startList);
  const rows = topRows(c, end, list);
  const name = listName(c, end, list);
  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <Segmented label="Top or bottom" value={end} options={ENDS} onChange={setEnd} />
        <Segmented label={`${END_WORD[end]} 10 of`} value={list} options={LISTS} onChange={setList} />
      </div>
      <DrawerSection title={name} note={`${list === "items" ? c.where : "Every hospital"} · ${c.when}${end === "bottom" && c.units ? ` · ${RUPEES_ONLY}` : ""}.${list === "units" ? " Select a row to show that hospital." : ""}`}>
        <RankBars key={`${end}-${list}`} rows={rows} format={listFormat(c, end)} color={listColor(list)} signed={signedOf(end, rows)}
          ariaLabel={name} empty={listEmpty(c, end)} />
      </DrawerSection>
      <ExactList c={c} end={end} list={list} />
      <LinkButton onClick={() => c.go(end === "bottom" ? PAGES.revenue.href : list === "items" ? PAGES.items.href : PAGES.formulary.href)}>
        Open {end === "bottom" ? PAGES.revenue.name : list === "items" ? PAGES.items.name : PAGES.formulary.name}
      </LinkButton>
    </>
  );
}

export function TopMethod({ c }: { c: ExecCtx }) {
  return (
    <MethodText>
      <p>Top: the ten items, or the ten hospitals, that consumed the most in the selection, ranked on {c.units ? "units sold (tablets, vials and bottles added together)" : "consumption at cost price"} as the formulary pages rank consumption. The share is each one&apos;s part of the selection&apos;s whole consumption on the same basis, as the server works it out; &quot;How these figures are built&quot; below says what that whole holds. &quot;Drug cost&quot; on this page is the consumption mix&apos;s formulary + out of formulary + non-formulary, which leaves consumables out.</p>
      <p>Bottom: the ten with the lowest margin % (margin ÷ MRP, where margin = MRP − cost price, both summed first), the lowest first. Only items or hospitals with at least a minimum share of the selection&apos;s sales at MRP are ranked, so a line of a few rupees cannot fill the list; the server&apos;s note on the bottom lists, below, gives that share. A tie goes to the bigger seller. Margin is money, so this list is in rupees on the {QUANTITY} basis too, and its share is of revenue at MRP. A margin % below zero (sold below cost) draws its bar left of zero.</p>
      <p>Items follow the hospital selector; the hospitals lists are every hospital&apos;s (they ignore the selector, and the selected one is shaded). A hospital&apos;s row selects it in the header. The Top | Bottom and Items | Hospitals switches are the tile&apos;s own; the Value ↔ {QUANTITY} switch in the header is the dashboard&apos;s.</p>
    </MethodText>
  );
}
