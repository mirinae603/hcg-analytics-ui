"use client";
// Spend Analysis — the Cash & TPA overview tab.
//
// One number runs the page: the margin HCG lost because cash and insurance patients got a
// brand for which HCG's cash list suggests one that earns more per unit. HCG's % divides the
// loss by the margin the suggested brands would have made, not by spend as the scheme % does.
//
// Laid out as HCG's own Power BI dashboards are (Oct-2026): eight charts on one screen, no
// number tiles. Each chart carries its key figures as labels, in lakhs, and opens its drawer
// (the written summary, exact rupees, HCG's tables and the method) on a click; the (i) opens
// the method. The page frame (PageBar, FilterStrip) is SpendPage's; the tiles, their drawers
// and the colour law are in ./cash-cards. (Out of formulary, on purchases, is OofOverview.)
import React from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import { Notice } from "../formulary/parts";
import { sectionParams, useOverview, type Filters, type Meta, type Section, type View } from "./api";
import { makeCtx, type Data } from "./cash-cards/context";
import { MarginTile } from "./cash-cards/MarginTile";
import { MonthTile } from "./cash-cards/MonthTile";
import { SplitTile } from "./cash-cards/SplitTile";
import { HospitalsTile } from "./cash-cards/HospitalsTile";
import { CombinedTile } from "./cash-cards/CombinedTile";
import { MrpTile } from "./cash-cards/MrpTile";
import { TopBrandsTile } from "./cash-cards/TopBrandsTile";
import { DoctorsTile } from "./cash-cards/DoctorsTile";

/** The ranking of every hospital asks for room when the page stacks, so all of them show. */
const RANKING_MIN_H = 520;

type Layout = {
  margin: Place; trend: Place; split: Place; hospitals: Place; mrp: Place; brands: Place; doctors: Place;
  /** HCG's combined cash + out-of-formulary table, once the purchase build has run. Null
   *  without it: the brands then widen into its place. */
  combined: Place | null;
};

/** Where each tile sits on the 12 × 3 grid at a desktop size:
 *    r1  margin: possible → earned  | margin missed by month (8 wide)
 *    r2  MRP | where the loss sits | hospitals
 *    r3  top brands | combined with out of formulary | top doctors */
function layoutOf(combined: boolean, network: boolean): Layout {
  return {
    margin: { col: 1, span: 4, row: 1 },
    trend: { col: 5, span: 8, row: 1 },
    mrp: { col: 1, span: 4, row: 2 },
    split: { col: 5, span: 4, row: 2 },
    hospitals: { col: 9, span: 4, row: 2, ...(network ? { minH: RANKING_MIN_H } : {}) },
    brands: combined ? { col: 1, span: 4, row: 3 } : { col: 1, span: 8, row: 3 },
    combined: combined ? { col: 5, span: 4, row: 3 } : null,
    doctors: { col: 9, span: 4, row: 3 },
  };
}

const placesOf = (l: Layout) => [l.margin, l.trend, l.split, l.hospitals, l.combined, l.mrp, l.brands, l.doctors].filter((p): p is Place => p != null);

const SECTION = "Cash & TPA";

/** Until the answer arrives the tiles' places are drawn where they will sit: the combined table
 *  is there once the purchase build has run (assumed before the page's meta arrives, as it is
 *  once published). */
export function CashOverviewSkeleton({ meta, network }: { meta: Meta | null; network: boolean }) {
  const guess = layoutOf(meta ? !!meta.oof_built : true, network);
  return <OneScreenGrid ariaLabel={`${SECTION} overview, loading`} loading skeleton={placesOf(guess)}>{null}</OneScreenGrid>;
}

export default function CashOverview({ meta, filters, plant, onOpen, onSection }: {
  meta: Meta; filters: Filters; plant: string; onOpen: (v: View) => void; onSection?: (s: Section) => void;
}) {
  const params = { Plant: plant, ...sectionParams("cash", filters) };
  const { data, error, loading } = useOverview<Data>(params, "cash");
  if (error) return <Notice title="Couldn't load the cash & TPA analysis">{error}</Notice>;
  if (!data) return <CashOverviewSkeleton meta={meta} network={plant === "ALL"} />;

  const c = makeCtx(data, meta, filters, params, onOpen);
  // HCG's combined table only where the selection has out-of-formulary purchases: a sales month
  // without a GRN would otherwise show a ₹0 out-of-formulary loss (the Summary's rule too).
  const withOof = data.with_oof?.oof_months?.length ? data.with_oof : null;
  const l = layoutOf(!!withOof, c.network);

  // DOM order is the order the tiles stack in below a desktop size: the key figure, the trend,
  // where the loss sits, the hospitals, then the lists.
  return (
    <OneScreenGrid ariaLabel={`${SECTION} overview, ${c.context}`} stale={loading}>
      <MarginTile c={c} place={l.margin} />
      <MonthTile c={c} place={l.trend} />
      <SplitTile c={c} place={l.split} />
      <HospitalsTile c={c} place={l.hospitals} />
      {l.combined && withOof && <CombinedTile c={c} w={withOof} place={l.combined} onSection={onSection} />}
      <MrpTile c={c} place={l.mrp} />
      <TopBrandsTile c={c} place={l.brands} />
      <DoctorsTile c={c} place={l.doctors} />
    </OneScreenGrid>
  );
}
