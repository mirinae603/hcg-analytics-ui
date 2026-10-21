"use client";
// Spend Analysis, Scheme overview — the brands to switch first. The tile ranks the five
// brands with the largest margin missed (the brand used → the brand HCG's list suggests) as bars
// from zero, as HCG's dashboards show a top five; the drawer carries HCG's "Top 10 materials
// list contribution in margin missed" table with both values, the quantity and each brand's share
// of the total, and the way to every brand.
import React from "react";
import { INK, SUB, LINE, RULE, num } from "@/components/portfolio/ledger/kit";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import { GRID_COLS, type Place } from "@/components/portfolio/ledger/onescreen";
import { TOP_N } from "@/components/portfolio/ledger/toplist";
import DetailDrawer, { DrawerSection, useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { LinkButton } from "../../formulary/parts";
import type { Filters, Meta, Overview, View } from "../api";
import { topTitle } from "../shared";
import { BRAND_COL, PROPOSED_COL, WORDS, MethodTab, filterChips, type Scope } from "./context";

const WHAT = "brands to switch";

type TopItem = Overview["top_items"][number];
const brandOf = (r: TopItem) => r.material_desc ?? r.material;
const suggestedOf = (r: TopItem) => r.suggested_desc ?? r.suggested_material;

export function TopBrandsTile({ d, meta, filters, scope, place, onOpen }: {
  d: Overview; meta: Meta; filters: Filters; scope: Scope; place: Place; onOpen: (v: View) => void;
}) {
  const drawer = useDrawer();
  const w = WORDS;
  const items = (d.top_items || []).slice(0, TOP_N);
  const title = topTitle(items.length, WHAT);
  // A panel half the grid wide or more has the room to name both brands on the row; a narrower
  // one names the brand used and puts the suggested one under it (shown when the row has a
  // second line, and always in its tooltip and accessible name).
  const wide = place.span >= GRID_COLS / 2;
  const ofLoss = `of the ${w.loss.toLowerCase()}`;
  const rows: RankRow[] = items.map((r) => ({
    key: r.material,
    label: wide ? `${brandOf(r)} → ${suggestedOf(r)}` : brandOf(r),
    sub: wide ? undefined : `→ ${suggestedOf(r)}`,
    value: r.saving_missed, valueLabel: lakhs(r.saving_missed),
    aside: isNum(r.share_of_total_pct) ? `${pct(r.share_of_total_pct, 1)} ${ofLoss}` : undefined,
  }));
  const label = [
    title, scope.context,
    ...items.map((r, i) => `${i + 1}. ${brandOf(r)} to ${suggestedOf(r)}: ${lakhs(r.saving_missed)}, ${pct(r.saving_pct, 1)} ${w.pctWord}`),
    `of ${num(d.headline.brands)} brands in all`,
  ].join(". ");
  const goTo = (v: View) => { drawer.close(); onOpen(v); };

  return (
    <>
      <ChartPanel id="brands" title={title} context={`brand used → ${w.sug} brand · ${num(d.headline.brands)} brands in all`} accent={BRAND_COL} place={place}
        label={label} onOpen={() => drawer.show("top")} onInfo={() => drawer.show("method")}>
        <RankBars rows={rows} format={lakhs} color={BRAND_COL} ariaLabel={`${w.loss} by brand, largest first`} />
      </ChartPanel>

      <DetailDrawer open={drawer.open} onClose={drawer.close} initialTab={drawer.tab} size="wide"
        eyebrow={`${w.section} · Overview`} title={`Brands to switch · ${scope.where}`}
        kpi={{ value: rupeesExact(d.headline.saving_missed), comparator: `${w.loss.toLowerCase()} on ${num(d.headline.brands)} brands` }}
        source="computed" asOf={scope.asOf} filters={filterChips(filters, scope, meta)}
        tabs={[
          { key: "top", label: "Brands", render: () => <TopTable d={d} onAll={() => goTo("items")} /> },
          {
            key: "method", label: "Method", render: () => (
              <MethodTab d={d} meta={meta} lines={[
                `The brands used for scheme patients where the ${w.sug} brand would have saved the most.`,
                `${w.actual} = qty × the used brand's list price; ${w.proposed.toLowerCase()} = the same qty × the ${w.sug} brand's price; ${w.pct} = ${w.loss.toLowerCase()} ÷ ${w.actual.toLowerCase()}; share = the brand's part of the ${w.loss.toLowerCase()} in this selection.`,
              ]} />
            ),
          },
        ]} />
    </>
  );
}

/** HCG's "Top 10 materials list contribution in margin missed", in exact rupees. */
function TopTable({ d, onAll }: { d: Overview; onAll: () => void }) {
  const w = WORDS;
  const rows = d.top_items || [];
  const cols = "24px minmax(0,2.2fr) 64px 124px 124px 124px 64px 60px";
  return (
    <DrawerSection title={topTitle(rows.length, WHAT)}
      note={`Brand used → the brand HCG's list suggests. Share = the brand's part of the ${rupeesExact(d.headline.saving_missed)} ${w.loss.toLowerCase()} in this selection.`}>
      {!rows.length ? <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p> : (
        <div className="overflow-x-auto -mx-1"><div className="flex flex-col" style={{ minWidth: 820 }}>
          <div className="grid gap-3 px-2 pb-2 text-[10px] font-semibold uppercase" style={{ gridTemplateColumns: cols, color: SUB, letterSpacing: ".06em", borderBottom: `1px solid ${RULE}` }}>
            <span>#</span><span>Brand used → {w.sug} brand</span><span className="text-right">Qty</span>
            <span className="text-right">{w.actual}</span><span className="text-right">{w.proposed}</span><span className="text-right">{w.loss}</span>
            <span className="text-right">{w.pct}</span><span className="text-right">Share</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.material} className="grid items-baseline gap-3 px-2 py-[7px] text-[12px] tabular-nums" style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${LINE}` }}>
              <span className="text-[11px]" style={{ color: SUB }}>{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-semibold truncate" style={{ color: INK }} title={`${brandOf(r)} (${r.material})`}>{brandOf(r)}</span>
                <span className="block truncate text-[11px]" style={{ color: SUB }}>→ <span style={{ color: PROPOSED_COL, fontWeight: 600 }}>{suggestedOf(r)}</span></span>
              </span>
              <span className="text-right" style={{ color: SUB }}>{num(r.qty)}</span>
              <span className="text-right" style={{ color: INK }}>{rupeesExact(r.used_value)}</span>
              <span className="text-right" style={{ color: SUB }}>{rupeesExact(r.suggested_value)}</span>
              <span className="text-right font-bold" style={{ color: INK }}>{rupeesExact(r.saving_missed)}</span>
              <span className="text-right" style={{ color: SUB }}>{pct(r.saving_pct)}</span>
              <span className="text-right" style={{ color: INK }}>{pct(r.share_of_total_pct, 1)}</span>
            </div>
          ))}
        </div></div>
      )}
      <div className="mt-4"><LinkButton onClick={onAll}>All {num(d.headline.brands)} brands</LinkButton></div>
    </DrawerSection>
  );
}
