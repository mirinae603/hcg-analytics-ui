"use client";
// Spend Analysis — the Generic vs branded overview tab, on HCG's purchases (GRN).
//
// Branded = made by the company that invented the medicine (an originator); everything else is
// generic. The app's own definition until HCG confirms it, so every tile is marked Estimated and
// one tile says it in plain words. Two questions run the page: what branded costs (what branded
// purchases cost above the cheapest generic of the same product) and where each class sits in
// the formulary (the Item Master's flag, for the months that have one).
//
// One screen of charts (OneScreenGrid, 12 columns × 3 rows on a desktop):
//   r1  generic vs branded bought, and the cost of branded | generic and branded by month |
//       each class by formulary flag
//   r2  the branded products a generic undercut (wide: brand and generic on a row) | the cost of
//       branded by month | every hospital ranked (rows 2–3)
//   r3  onco vs non-onco | the definition
// Every panel opens its drawer, where the exact rupees and the method live. The tiles are in this
// folder. Below the fit size the same panels stack in DOM order.
import React from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import { Notice } from "../../formulary/parts";
import { insightParams, useOverview, type Filters, type GenericOverview as Data, type Meta } from "../api";
import { WORDS, makeCtx } from "./context";
import { HeadlineTile } from "./HeadlineTile";
import { DefinitionTile } from "./DefinitionTile";
import { MonthTile, ExtraTile } from "./MonthTile";
import { ComplianceTile } from "./ComplianceTile";
import { TopBrandedTile } from "./TopBrandedTile";
import { HospitalsTile } from "./HospitalsTile";
import { SegmentTile } from "./SegmentTile";

/** The ranking of every hospital asks for room when the page stacks, so all of them show. */
const RANKING_MIN_H = 520;

const PLACES = {
  headline: { col: 1, span: 4, row: 1 },
  months: { col: 5, span: 5, row: 1 },
  compliance: { col: 10, span: 3, row: 1 },
  top: { col: 1, span: 6, row: 2 },
  extra: { col: 7, span: 3, row: 2 },
  hospitals: { col: 10, span: 3, row: 2, rows: 2, minH: RANKING_MIN_H },
  segment: { col: 1, span: 4, row: 3 },
  definition: { col: 5, span: 5, row: 3 },
} satisfies Record<string, Place>;
const SKELETON: Place[] = Object.values(PLACES);

/** The panels' places until the first answer arrives. */
export function GenericOverviewSkeleton() {
  return <OneScreenGrid ariaLabel={`${WORDS.title}, loading`} loading skeleton={SKELETON}>{null}</OneScreenGrid>;
}

export default function GenericOverview({ meta, filters, plant }: {
  meta: Meta;
  /** The page's filters as this section applies them (insightFilters: its own months). */
  filters: Filters;
  plant: string;
}) {
  const params = insightParams(filters);
  const { data, error, loading } = useOverview<Data>({ Plant: plant, ...params }, "generic");
  if (error) return <Notice title="Couldn't load generic vs branded">{error}</Notice>;
  if (!data) return <GenericOverviewSkeleton />;

  const c = makeCtx(data, meta, filters, params);
  // DOM order is the order the panels stack in below a desktop size: the figure and what it
  // rests on, its months, the formulary split, the products, then the rankings and splits.
  return (
    <OneScreenGrid ariaLabel={`${WORDS.title}, ${c.context}`} stale={loading} skeleton={SKELETON}>
      <HeadlineTile c={c} place={PLACES.headline} />
      <DefinitionTile c={c} place={PLACES.definition} />
      <MonthTile c={c} place={PLACES.months} />
      <ComplianceTile c={c} place={PLACES.compliance} />
      <TopBrandedTile c={c} place={PLACES.top} />
      <ExtraTile c={c} place={PLACES.extra} />
      <HospitalsTile c={c} place={PLACES.hospitals} />
      <SegmentTile c={c} place={PLACES.segment} />
    </OneScreenGrid>
  );
}
