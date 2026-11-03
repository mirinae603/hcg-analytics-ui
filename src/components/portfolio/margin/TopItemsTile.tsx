"use client";
// Revenue & margin — the items that bring in the most (one hospital selected): the five largest
// by revenue (by units sold under the Quantity switch), each a bar from zero in its formulary
// bucket's colour with its margin % beside it. It asks /revenue/materials, the very list the
// Items tab pages through, for one page of five sorted by that figure, so every figure matches
// that tab row for row; the drawer lists them in exact rupees and moves to the full tab.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import type { LegendItem } from "@/components/portfolio/ledger/legend";
import { TOP_N, TopListDrawer, useTopRows, type TopColumn } from "@/components/portfolio/ledger/toplist";
import { useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { SUB } from "@/components/portfolio/ledger/kit";
import { pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { ACCENT, RUPEES_ONLY, BUCKET_COL, HowBuilt, MethodText, bucketCol, filterChips, sizeOf, sizeShort, sizeWord, type RevScope } from "./shared";
import { MATERIALS_PATH, filterParams, type BucketKey, type MaterialRow } from "./api";

const COLUMNS: TopColumn<MaterialRow>[] = [
  { label: "Material code", value: (r) => r.material, text: true },
  { label: "Item", value: (r) => r.material_desc || "—", text: true },
  { label: "Bucket", value: (r) => r.bucket_label, text: true },
  { label: "Revenue (MRP)", value: (r) => rupeesExact(r.mrp) },
  { label: "Margin", value: (r) => rupeesExact(r.margin) },
  { label: "Margin %", value: (r) => pct(r.margin_pct) },
  { label: "Units sold", value: (r) => num(r.qty) },
];

export function TopItemsTile({ s, place }: { s: RevScope; place: Place }) {
  const dr = useDrawer();
  const sortField = s.basis === "qty" ? "qty" : "mrp";
  const { page, error } = useTopRows<MaterialRow>(MATERIALS_PATH, { Plant: s.plant, ...filterParams(s.filters) }, sortField);
  const items = page?.data ?? [];
  const rows: RankRow[] = items.map((r) => {
    const v = sizeOf(r, s.basis);
    return {
      key: `${r.material}-${r.bucket}`, label: r.material_desc || r.material, sub: r.material, value: v, color: bucketCol(r.bucket),
      valueLabel: `${sizeShort(v, s.basis)} · ${pct(r.margin_pct, 1)}`,
    };
  });
  // The colour is the item's bucket, which the bars do not print: the legend names it.
  const present = new Set(items.map((r) => r.bucket));
  const legend: LegendItem[] = (Object.keys(BUCKET_COL) as BucketKey[]).filter((k) => present.has(k))
    .map((k) => ({ key: k, label: items.find((r) => r.bucket === k)?.bucket_label ?? k, color: BUCKET_COL[k] }));
  const word = sizeWord(s.basis).toLowerCase();
  const title = `Top ${TOP_N} items by ${word}`;
  const label = [`${title}, ${s.context}`, ...rows.map((r) => `${r.label} (${r.sub}) ${r.valueLabel}`)].join(". ");
  const goItems = () => { dr.close(); s.onOpen("items"); };
  return (
    <>
      <ChartPanel id="items" title={title} context={`${s.context} · margin % beside${s.basis === "qty" ? ` (${RUPEES_ONLY})` : ""}`} accent={ACCENT}
        place={place} legend={legend} label={label} onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        {error ? <p className="text-[12px]" style={{ color: SUB }}>Couldn&apos;t load the items: {error}</p>
          : page == null ? <p className="text-[12px]" style={{ color: SUB }}>Loading…</p>
          : <RankBars ariaLabel={`${title}, ${s.context}`} rows={rows} format={(v) => sizeShort(v, s.basis)} color={ACCENT} empty="No item sold in this selection." />}
      </ChartPanel>
      <TopListDrawer<MaterialRow> open={dr.open} onClose={dr.close} initialTab={dr.tab}
        eyebrow="Revenue & margin · Overview" title={`${title} · ${s.where}`}
        kpi={{ value: rupeesExact(s.d.headline.mrp), comparator: `revenue of every item · margin ${pct(s.d.headline.margin_pct)}` }}
        asOf={s.asOf} filters={filterChips(s)}
        listTitle={`The ${TOP_N} largest by ${word}`} listNote="Exact rupees. An item whose Item Master class changed between the selected months has a row per bucket."
        rows={items} rowKey={(r) => `${r.material}-${r.bucket}`} columns={COLUMNS} empty="No item sold in this selection."
        linkTitle="Every item" linkNote="The Items tab lists every item with its code, revenue, cost, margin and units, searchable, filterable and exportable to CSV."
        linkLabel="Items tab" onOpenTab={goItems}
        method={(
          <>
            <MethodText>
              <p>The {TOP_N} items with the largest {word} for the selection, from the same list the Items tab shows, sorted by that figure. Each bar runs from zero on one scale and takes the colour of the item&apos;s formulary bucket; beside it is the item&apos;s margin % (its margin ÷ its MRP).</p>
            </MethodText>
            <HowBuilt s={s} />
          </>
        )} />
    </>
  );
}
