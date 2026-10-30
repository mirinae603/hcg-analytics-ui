"use client";
// Spend Analysis (Cash & TPA) — the brands to switch first: the five with the
// most margin missed, each with the brand it should be and its share of the selection's loss,
// ranked as bars from zero on one scale. The drawer carries HCG's "Top 10 materials list
// contribution in margin missed" table with exact rupees, and the way to every brand and doctor.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import { GRID_COLS, type Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { View } from "../api";
import { topTitle } from "../shared";
import { BRAND_COL, type Ctx, type TopItem } from "./context";
import { DataTable, type Col } from "../DataTable";
import { Method } from "./parts";

/** HCG's report lists ten; the tile shows the first five and the drawer all of them. */
const ON_FACE = 5;

const brandOf = (r: TopItem) => r.material_desc ?? r.material;
const switchOf = (r: TopItem) => r.suggested_desc ?? r.suggested_material;
const shareText = (r: TopItem) => (isNum(r.share_of_total_pct) ? `${pct(r.share_of_total_pct, 1)} of the loss` : undefined);

type Ranked = { n: number; r: TopItem };

function TopBrandsDrawer({ c, dr }: { c: Ctx; dr: DrawerCtl }) {
  const all = c.d.top_items || [];
  const h = c.d.headline;
  const goTo = (v: View) => { dr.close(); c.onOpen(v); };
  const cols: Col<Ranked>[] = [
    { label: "#", render: (x) => x.n, align: "left" },
    {
      label: `Brand used → ${c.w.arrow}`, align: "left", wrap: true, render: ({ r }) => (
        <span className="block min-w-0">
          <span className="block font-semibold" style={{ color: INK }} title={`${brandOf(r)} (${r.material})`}>{brandOf(r)}</span>
          <span className="block text-[11px] font-normal" style={{ color: SUB }}>
            → <span style={{ color: INK }}>{switchOf(r)}</span>{r.bifurcated ? " · bifurcated" : ""}{r.molecule ? ` · ${r.molecule}` : ""}
          </span>
        </span>
      ),
    },
    { label: "Qty counted", render: ({ r }) => num(r.qty) },
    { label: "Margin earned", render: ({ r }) => rupeesExact(r.actual_margin) },
    { label: "Margin possible", render: ({ r }) => rupeesExact(r.potential_margin) },
    { label: "Margin missed", render: ({ r }) => <b>{rupeesExact(r.margin_loss)}</b> },
    { label: "% missed", render: ({ r }) => pct(r.loss_pct) },
    { label: "Share", render: ({ r }) => pct(r.share_of_total_pct, 1) },
  ];
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${topTitle(all.length, c.w.topTitle)} · ${c.where}`}
      kpi={{ value: rupeesExact(h.margin_loss), comparator: `margin missed across ${num(h.brands)} brands, ${c.when}` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "top", label: all.length > 1 ? `Top ${all.length}` : "Brands", render: () => (
            <>
              <DrawerSection title={all.length > 1 ? `The ${all.length} brands with the most margin missed` : "Brands with a margin missed"}
                note={`Share = the brand's part of the ${rupeesExact(h.margin_loss)} margin missed in this selection.`}>
                <DataTable rows={all.map((r, i) => ({ n: i + 1, r }))} rowKey={(x) => x.r.material} cols={cols}
                  caption={`${topTitle(all.length, c.w.topTitle)} by margin missed`} minWidth={860} />
              </DrawerSection>
              <DrawerSection title="Every brand and doctor">
                <div className="flex flex-wrap gap-2">
                  <LinkButton onClick={() => goTo("items")}>All brands</LinkButton>
                  <LinkButton onClick={() => goTo("doctors")}>By doctor</LinkButton>
                </div>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.topNote}</p>
              <p>On the chart each brand&apos;s margin missed is a bar from zero on one scale; under the brand, the {c.w.arrow} it should be.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function TopBrandsTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const top = (c.d.top_items || []).slice(0, ON_FACE);
  const h = c.d.headline;
  const title = topTitle(top.length, c.w.topTitle);
  // As on the Scheme overview: a panel half the grid wide or more names both brands on the row;
  // a narrower one names the brand used and puts the switch under it (shown when the row has a
  // second line, and always in its tooltip and accessible name).
  const wide = place.span >= GRID_COLS / 2;
  return (
    <>
      <ChartPanel id="brands" title={title} context={c.context} accent={BRAND_COL} place={place} source={c.source}
        label={[
          title, c.context,
          ...top.map((r, i) => `${i + 1}. ${brandOf(r)}, switch to ${switchOf(r)}: ${lakhs(r.margin_loss)} lost${shareText(r) ? `, ${shareText(r)}` : ""}`),
          `${num(h.brands)} brands in all`,
        ].join(". ")}
        onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={BRAND_COL} ariaLabel={`${title} by margin missed, ${c.context}`}
          rows={top.map((r) => ({
            key: r.material, label: wide ? `${brandOf(r)} → ${switchOf(r)}` : brandOf(r),
            sub: wide ? undefined : `→ ${switchOf(r)}`,
            value: r.margin_loss, valueLabel: lakhs(r.margin_loss), aside: shareText(r),
          }))} />
      </ChartPanel>
      <TopBrandsDrawer c={c} dr={dr} />
    </>
  );
}
