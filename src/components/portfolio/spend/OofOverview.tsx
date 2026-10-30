"use client";
// Spend Analysis — the Out of formulary overview tab, on purchases.
//
// HCG's own out-of-formulary method (decision D1): every goods receipt (GRN) of a drug that the
// month's Item Master flags OUT OF FORMULARY, set against the brand HCG suggests for it. One
// number runs the page: the margin missed, HCG's NET figure (a brand that earns more than its
// suggestion lowers it), shown beside HCG's own sheet for the same hospitals and months.
// Purchases have no payer, patient type or doctor: the vendor is who the brand came from.
//
// One screen of charts (OneScreenGrid, 12 columns × 3 rows on a desktop):
//   r1  the figure as a bridge, with what was spent and HCG's figure | earned vs possible by
//       month | onco vs non-onco
//   r2  the brands to switch (wide: both names on a row) | where the brand bought earns more |
//       every hospital ranked, negative ones below zero (this panel runs down rows 2 and 3)
//   r3  where the suggested brands came from | the vendors
// Every panel opens its drawer, where the exact rupees, HCG's sheet and the method live. The
// tiles are in ./oof-cards. Below the fit size the same panels stack in DOM order.
import React from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import { Notice } from "../formulary/parts";
import { sectionParams, useOverview, type Filters, type Meta, type OofOverview as Data, type View } from "./api";
import { WORDS, makeCtx } from "./oof-cards/context";
import { MarginTile } from "./oof-cards/MarginTile";
import { MonthTile } from "./oof-cards/MonthTile";
import { SplitTile } from "./oof-cards/SplitTile";
import { SwitchesTile } from "./oof-cards/SwitchesTile";
import { BetterTile } from "./oof-cards/BetterTile";
import { HospitalsTile } from "./oof-cards/HospitalsTile";
import { CoverageTile } from "./oof-cards/CoverageTile";
import { VendorsTile } from "./oof-cards/VendorsTile";

/** The ranking of every hospital asks for room when the page stacks, so all of them show. */
const RANKING_MIN_H = 520;

const PLACES = {
  margin: { col: 1, span: 4, row: 1 },
  trend: { col: 5, span: 5, row: 1 },
  split: { col: 10, span: 3, row: 1 },
  brands: { col: 1, span: 6, row: 2 },
  better: { col: 7, span: 3, row: 2 },
  hospitals: { col: 10, span: 3, row: 2, rows: 2, minH: RANKING_MIN_H },
  coverage: { col: 1, span: 4, row: 3 },
  vendors: { col: 5, span: 5, row: 3 },
} satisfies Record<string, Place>;
const SKELETON: Place[] = Object.values(PLACES);

/** The panels' places until the first answer arrives. */
export function OofOverviewSkeleton() {
  return <OneScreenGrid ariaLabel={`${WORDS.title}, loading`} loading skeleton={SKELETON}>{null}</OneScreenGrid>;
}

export default function OofOverview({ meta, filters, plant, onOpen }: {
  meta: Meta;
  /** The page's filters as this section applies them (oofFilters: its own months). */
  filters: Filters;
  plant: string;
  onOpen: (v: View) => void;
}) {
  const params = { Plant: plant, ...sectionParams("oof", filters) };
  const { data, error, loading } = useOverview<Data>(params, "oof", !!meta.oof_built);
  if (!meta.oof_built) {
    return <Notice title="Out-of-formulary purchases aren't published yet">The build step reads HCG&apos;s GRN extracts, each month&apos;s Item Master and HCG&apos;s out-of-formulary workbooks: run python -m app.etl.purchase.</Notice>;
  }
  if (error) return <Notice title="Couldn't load the out-of-formulary analysis">{error}</Notice>;
  if (!data) return <OofOverviewSkeleton />;

  const c = makeCtx(data, meta, filters, params, onOpen);
  // DOM order is the order the panels stack in below a desktop size: the figure, its months,
  // the brands to switch, the hospitals, then the splits and lists.
  return (
    <OneScreenGrid ariaLabel={`${WORDS.title}, ${c.context}`} stale={loading} skeleton={SKELETON}>
      <MarginTile c={c} place={PLACES.margin} />
      <MonthTile c={c} place={PLACES.trend} />
      <SwitchesTile c={c} place={PLACES.brands} />
      <HospitalsTile c={c} place={PLACES.hospitals} />
      <SplitTile c={c} place={PLACES.split} />
      <CoverageTile c={c} place={PLACES.coverage} />
      <VendorsTile c={c} place={PLACES.vendors} />
      <BetterTile c={c} place={PLACES.better} />
    </OneScreenGrid>
  );
}
