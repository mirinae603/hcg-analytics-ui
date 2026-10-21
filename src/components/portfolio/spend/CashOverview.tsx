"use client";
// Spend Analysis — Cash & TPA overview tab, and the same tab for Out of formulary (kind "oof").
//
// One number runs the page: the margin HCG lost because cash and insurance patients got a
// brand for which HCG's cash list suggests one that earns more per unit (or, for out of
// formulary, a brand the Item Master flags OUT OF FORMULARY, against the formulary brand of
// the same molecule, strength and form). HCG's % divides the loss by the margin the suggested
// brands would have made, not by spend as the scheme % does.
//
// Laid out as HCG's own Power BI dashboards are (Oct-2026): eight charts on one screen, no
// number tiles. Each chart carries its key figures as labels, in lakhs, and opens its drawer
// (the written summary, exact rupees, HCG's tables and the method) on a click; the (i) opens
// the method. The page frame (PageBar, FilterStrip) is SpendPage's; the tiles, their drawers
// and the colour law are in ./cash-cards.
import React from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import { Notice } from "../formulary/parts";
import { sectionParams, useOverview, type Filters, type Meta, type Section, type View } from "./api";
import { makeCtx, type Data, type Kind } from "./cash-cards/context";
import { MarginTile } from "./cash-cards/MarginTile";
import { MonthTile } from "./cash-cards/MonthTile";
import { SplitTile } from "./cash-cards/SplitTile";
import { HospitalsTile } from "./cash-cards/HospitalsTile";
import { CombinedTile } from "./cash-cards/CombinedTile";
import { CoverageTile } from "./cash-cards/CoverageTile";
import { MrpTile } from "./cash-cards/MrpTile";
import { TopBrandsTile } from "./cash-cards/TopBrandsTile";
import { DoctorsTile } from "./cash-cards/DoctorsTile";

/** The ranking of every hospital asks for room when the page stacks, so all of them show. */
const RANKING_MIN_H = 520;

type Layout = {
  margin: Place; trend: Place; split: Place; hospitals: Place; mrp: Place; brands: Place; doctors: Place;
  /** The section's eighth tile: HCG's combined cash + out-of-formulary table (Cash & TPA, once
   *  the out-of-formulary table is built), or how far the brand match reaches (Out of
   *  formulary). Null without it: the brands then widen into its place. */
  extra: Place | null;
};

/** Where each tile sits on the 12 × 3 grid at a desktop size:
 *    r1  margin: proposed → actual  | margin missed by month (8 wide)
 *    r2  MRP (cash) / coverage (oof) | where the loss sits | hospitals
 *    r3  top brands | combined (cash) / MRP (oof) | top doctors */
function layoutOf(kind: Kind, extra: boolean, network: boolean): Layout {
  const brands: Place = extra ? { col: 1, span: 4, row: 3 } : { col: 1, span: 8, row: 3 };
  const common = {
    margin: { col: 1, span: 4, row: 1 },
    trend: { col: 5, span: 8, row: 1 },
    split: { col: 5, span: 4, row: 2 },
    hospitals: { col: 9, span: 4, row: 2, ...(network ? { minH: RANKING_MIN_H } : {}) },
    doctors: { col: 9, span: 4, row: 3 },
    brands,
  };
  return kind === "cash"
    ? { ...common, mrp: { col: 1, span: 4, row: 2 }, extra: extra ? { col: 5, span: 4, row: 3 } : null }
    : { ...common, mrp: extra ? { col: 5, span: 4, row: 3 } : { col: 1, span: 4, row: 2 }, extra: extra ? { col: 1, span: 4, row: 2 } : null };
}

const placesOf = (l: Layout) => [l.margin, l.trend, l.split, l.hospitals, l.extra, l.mrp, l.brands, l.doctors].filter((p): p is Place => p != null);

const SECTION: Record<Kind, string> = { cash: "Cash & TPA", oof: "Out of formulary" };

/** Until the answer arrives the tiles' places are drawn where they will sit: the combined table
 *  is there once the out-of-formulary table is built (assumed before the page's meta arrives,
 *  as it is once published); the coverage always is. */
export function CashOverviewSkeleton({ kind, meta, network }: { kind: Kind; meta: Meta | null; network: boolean }) {
  const guess = layoutOf(kind, kind === "oof" || (meta ? !!meta.oof_built : true), network);
  return <OneScreenGrid ariaLabel={`${SECTION[kind]} overview, loading`} loading skeleton={placesOf(guess)}>{null}</OneScreenGrid>;
}

export default function CashOverview({ meta, filters, plant, onOpen, kind = "cash", onSection }: {
  meta: Meta; filters: Filters; plant: string; onOpen: (v: View) => void; kind?: Kind; onSection?: (s: Section) => void;
}) {
  const params = { Plant: plant, ...sectionParams(kind, filters) };
  const { data, error, loading } = useOverview<Data>(params, kind);
  if (error) return <Notice title={kind === "oof" ? "Couldn't load the out-of-formulary analysis" : "Couldn't load the cash & TPA analysis"}>{error}</Notice>;
  if (!data) return <CashOverviewSkeleton kind={kind} meta={meta} network={plant === "ALL"} />;

  const c = makeCtx(data, meta, filters, kind, params, onOpen);
  const coverage = kind === "oof" ? data.headline.coverage ?? null : null;
  const withOof = kind === "cash" ? data.with_oof ?? null : null;
  const l = layoutOf(kind, !!(coverage || withOof), c.network);

  // DOM order is the order the tiles stack in below a desktop size: the key figure, the trend,
  // where the loss sits, the hospitals, then the lists.
  return (
    <OneScreenGrid ariaLabel={`${SECTION[kind]} overview, ${c.context}`} stale={loading}>
      <MarginTile c={c} place={l.margin} />
      <MonthTile c={c} place={l.trend} />
      <SplitTile c={c} place={l.split} />
      <HospitalsTile c={c} place={l.hospitals} />
      {l.extra && withOof && <CombinedTile c={c} w={withOof} place={l.extra} onSection={onSection} />}
      {l.extra && coverage && <CoverageTile c={c} cov={coverage} place={l.extra} />}
      <MrpTile c={c} place={l.mrp} />
      <TopBrandsTile c={c} place={l.brands} />
      <DoctorsTile c={c} place={l.doctors} />
    </OneScreenGrid>
  );
}
