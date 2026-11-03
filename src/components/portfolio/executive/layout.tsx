"use client";
// Where each panel of the Executive overview sits, and the grid that holds them.
//
// HCG's first screen, on ONE screen, as the Formulary and Spend overviews are: the page frame is
// OneScreenShell's fit frame (exactly the viewport below the app header), and the grid takes the
// height the page bar and the filter strip leave. Twelve columns, three rows:
//
//   r1      six KPI tiles, two columns each — a short row (KPI_ROW), the figures need little height
//   r2      revenue & margin by month (c1–3) · margin bridge (c4–6) · IP vs OP (c7–8)
//   r3      insights & recommended actions (c1–8)
//   r2–r3   hospitals side by side (c9–12): every unit's split, compliance, margin and missed, or
//           the top items; its drawer holds the full units heat-map, the consumption mix, the
//           compliance-vs-budget bullets, the top and bottom 10 and the flow of sales
//
// Rows 2 and 3 share what the KPI row leaves. At 1440 × 900 that is room for every unit's row of
// the hospitals table (23 units at ~21px); at 1280 × 800 the rows are 16–17px and still fit.
//
// The fit grid applies from 1280 × 760 (the `fit:` variant). A screen as wide but shorter (a
// 1366 × 768 laptop, a 1920 × 1080 screen at 125%) keeps the same grid at the rows' 1280 × 800
// heights and the page scrolls a little: the grid is marked data-scroll-grid, so its panels are
// placed from the width alone (the `scrollgrid:` variant), and only the rows' sizes differ (the
// --exec-rows variable, which the `fit:` copy overrides). Below 1280px wide the panels stack one
// or two abreast in DOM order, as on the other overviews, so the order in ExecutiveOverview is
// also the reading order on a phone.
import React from "react";
import { PanelSkeleton, type Place } from "@/components/portfolio/ledger/onescreen";

// The KPI row: 17% of the grid's height, between 128px (a figure, its change, a sparkline and two
// lines of notes) and 150px. The class names below carry these sizes as literals, because Tailwind
// only sees whole class names.
//   one screen:   clamp(128px, 17%, 150px)  then the two content rows share the rest
//   scrolling:    128px 236px 236px         the 1280 × 800 sizes
const ROWS = "[--exec-rows:128px_236px_236px] fit:[--exec-rows:clamp(128px,17%,150px)_minmax(0,1fr)_minmax(0,1fr)]";

const kpi = (i: number): Place => ({ col: 1 + i * 2, span: 2, row: 1, minH: 132 });

export const PLACES = {
  kpis: [0, 1, 2, 3, 4, 5].map(kpi),
  trend: { col: 1, span: 3, row: 2, minH: 280 } as Place,
  bridge: { col: 4, span: 3, row: 2, minH: 260 } as Place,
  ipop: { col: 7, span: 2, row: 2, minH: 260 } as Place,
  insights: { col: 1, span: 8, row: 3, minH: 300 } as Place,
  // Two rows tall: every unit in HCG's list, one row each, under a sticky header. When the page
  // stacks it is tall enough for 23 units at 20px.
  hospitals: { col: 9, span: 4, row: 2, rows: 2, minH: 580 } as Place,
};

export const ALL_PLACES: Place[] = [...PLACES.kpis, PLACES.trend, PLACES.bridge, PLACES.ipop, PLACES.hospitals, PLACES.insights];

/** The page's grid: twelve columns × three rows that fill the screen in fit mode (or keep fixed
 *  heights on a wide but short screen), a one- or two-column stack below 1280px. `loading` draws
 *  the skeleton in the panels' own places; `stale` dims the last answer while the next one loads.
 *  In fit mode it fills its parent: the content row of OneScreenShell, or what the no-sales line
 *  leaves of it (a flex column, hence flex-1). */
export function ExecGrid({ ariaLabel, loading = false, stale = false, children }: {
  ariaLabel: string;
  loading?: boolean;
  stale?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div role="region" aria-label={ariaLabel} aria-busy={loading || stale || undefined} data-scroll-grid=""
      className={`grid gap-3 grid-cols-1 md:grid-cols-2 md:grid-flow-dense scrollgrid:grid-cols-12 scrollgrid:[grid-template-rows:var(--exec-rows)] fit:h-full fit:flex-1 fit:min-h-0 ${ROWS}`}
      style={{ opacity: stale ? 0.6 : 1, transition: "opacity .2s ease" }}>
      {loading ? ALL_PLACES.map((p) => <PanelSkeleton key={`${p.row}-${p.col}`} place={p} />) : children}
    </div>
  );
}
