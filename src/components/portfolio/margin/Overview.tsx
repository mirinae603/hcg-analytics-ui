"use client";
// Revenue & margin — the Overview tab: one screen of charts, laid out like the Formulary and
// Spend overviews (HCG's Power BI dashboards: "most of the graphs on a single screen"). Each
// panel is a chart with its key figures as labels, in lakhs; a click opens its drawer (exact
// rupees, every month, the method) and its (i) opens the method.
//
// All hospitals (5 panels, 12 × 3 grid):
//   c1–4, r1–3  revenue by hospital, every hospital (switch: revenue · margin % · margin)
//   c5–8        revenue and margin (headline)     · by formulary bucket, IP and OP (r2–3)
//   c9–12       revenue by month, IP and OP       · margin by material type (r2–3)
// One hospital (6 panels):
//   r1  revenue and margin (c1–4)       · revenue by month, IP and OP (c5–12)
//   r2  by formulary bucket (c1–4, r2–3) · how this hospital compares · margin by material type (r2–3)
//   r3                                   · top items
// Below a desktop screen the panels stack in DOM order, which is their priority: the headline,
// the trend, the buckets, where the hospital stands, the material types, the items. A half-width
// panel comes before the full-width trend, so the two-column stack has no hole beside the
// headline.
import React from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import type { Basis } from "@/context/BasisContext";
import { HeadlineTile } from "./HeadlineTile";
import { TrendTile } from "./TrendTile";
import { BucketsTile } from "./BucketsTile";
import { PositionTile, UnitRankTile } from "./HospitalsTile";
import { MaterialTile } from "./MaterialTile";
import { TopItemsTile } from "./TopItemsTile";
import { revScope } from "./shared";
import type { RevenueOverview, View } from "./api";

const NETWORK = {
  // Every hospital takes the full height: 23 rows of ~26px at 1440×900. When the page stacks
  // it is at least 520px, and taller with more hospitals (unitsMinH).
  hospitals: { col: 1, span: 4, row: 1, rows: 3, minH: 520 },
  headline: { col: 5, span: 4, row: 1 },
  trend: { col: 9, span: 4, row: 1 },
  // IP and OP under their own captions, four buckets each: two rows of the grid.
  buckets: { col: 5, span: 4, row: 2, rows: 2, minH: 360 },
  material: { col: 9, span: 4, row: 2, rows: 2 },
} satisfies Record<string, Place>;

const ONE_UNIT = {
  headline: { col: 1, span: 4, row: 1 },
  trend: { col: 5, span: 8, row: 1 },
  buckets: { col: 1, span: 4, row: 2, rows: 2, minH: 360 },
  position: { col: 5, span: 4, row: 2 },
  material: { col: 9, span: 4, row: 2, rows: 2 },
  items: { col: 5, span: 4, row: 3 },
} satisfies Record<string, Place>;

const placesOf = (network: boolean): Place[] => Object.values(network ? NETWORK : ONE_UNIT);

/** The hospital ranking's height when the page stacks: a 22px row per hospital under the
 *  panel's header and the switch (80px), so every hospital shows as HCG adds units. */
const unitsMinH = (units: number) => Math.max(NETWORK.hospitals.minH, 80 + units * 22);

/** The grid's panels as placeholders, in their places, while the first answer loads. */
export function OverviewSkeleton({ network }: { network: boolean }) {
  return <OneScreenGrid ariaLabel="Revenue and margin, loading" loading skeleton={placesOf(network)}>{null}</OneScreenGrid>;
}

export default function Overview({ d, plant, basis, stale, onOpen }: {
  /** The overview answer; the panels describe the filters it was computed under. */
  d: RevenueOverview;
  plant: string;
  basis: Basis;
  /** A new answer is loading; the last one stays on screen, dimmed. */
  stale: boolean;
  onOpen: (v: View) => void;
}) {
  const s = revScope(d, plant, basis, onOpen);
  const ariaLabel = `Revenue and margin, ${s.context}`;
  if (s.network) {
    const P = NETWORK;
    return (
      <OneScreenGrid ariaLabel={ariaLabel} stale={stale}>
        <HeadlineTile s={s} place={P.headline} />
        <TrendTile s={s} place={P.trend} />
        <BucketsTile s={s} place={P.buckets} />
        <UnitRankTile s={s} place={{ ...P.hospitals, minH: unitsMinH(d.by_hospital?.length ?? 0) }} />
        <MaterialTile s={s} place={P.material} />
      </OneScreenGrid>
    );
  }
  const P = ONE_UNIT;
  return (
    <OneScreenGrid ariaLabel={ariaLabel} stale={stale}>
      <HeadlineTile s={s} place={P.headline} />
      <PositionTile s={s} place={P.position} />
      <TrendTile s={s} place={P.trend} />
      <BucketsTile s={s} place={P.buckets} />
      <MaterialTile s={s} place={P.material} />
      {/* Keyed on the basis: the list is fetched per sort field, and a remount drops the last
          one (shown as Loading…) rather than draw the revenue top five under the units title. */}
      <TopItemsTile key={s.basis} s={s} place={P.items} />
    </OneScreenGrid>
  );
}
