"use client";
// Spend Analysis — the Scheme overview tab.
//
// One number runs the page: the margin HCG missed because scheme (GOV) patients got a brand
// for which HCG's scheme list suggests a cheaper one (with HCG's Attis and J&J & Covidien →
// Healthium slices). Both sides are valued at HCG's FY price list, as HCG's own report is.
//
// One screen of charts, as HCG's own Power BI dashboards and the hospital spend dashboards it
// pointed to show them (OneScreenGrid, 12 columns × 3 rows on a desktop):
//   row 1  the figure as a bridge (spent − margin missed = with the suggested brands), and the
//          margin missed every month;
//   row 2  its parts (HCG's Attis and Healthium slices), where it was missed (material and
//          patient type), and the hospitals (all hospitals: ranked; one hospital: its place
//          among them);
//   row 3  the brands to switch and the doctors.
// Every panel opens its drawer, where the exact rupees, HCG's tables and the method live. The
// tiles are in ./scheme-cards. Below the fit size the same panels stack in this order.
import React from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import { useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { Notice } from "../formulary/parts";
import { sectionParams, useOverview, type Filters, type Meta, type Overview as OverviewData, type View } from "./api";
import { WORDS, scopeOf } from "./scheme-cards/context";
import { HeadlineDrawer, HeadlineTile } from "./scheme-cards/HeadlineTile";
import { MonthTile } from "./scheme-cards/MonthTile";
import { SplitTile } from "./scheme-cards/SplitTile";
import { TopBrandsTile } from "./scheme-cards/TopBrandsTile";
import { DoctorsTile } from "./scheme-cards/DoctorsTile";
import { HospitalsTile } from "./scheme-cards/HospitalsTile";
import { SlicesDrawer, SlicesTile } from "./scheme-cards/SliceTiles";

/** Where each panel sits; `slices` only when the answer carries them. */
type Layout = { headline: Place; month: Place; split: Place; hospitals: Place; brands: Place; doctors: Place; slices?: Place };

/** The places for an answer. An older API may send no slices: the panels beside the gap widen
 *  to fill it. Before the answer arrives (`d` null) the newer API's full set is assumed, for
 *  the skeleton. */
function layoutOf(d: OverviewData | null): Layout {
  const slices = d ? !!d.groups : true;
  return {
    headline: { col: 1, span: 4, row: 1 },
    month: { col: 5, span: 8, row: 1 },
    ...(slices ? { slices: { col: 1, span: 4, row: 2 } } : {}),
    split: { col: slices ? 5 : 1, span: 4, row: 2 },
    hospitals: slices ? { col: 9, span: 4, row: 2 } : { col: 5, span: 8, row: 2 },
    brands: { col: 1, span: 8, row: 3 },
    doctors: { col: 9, span: 4, row: 3 },
  };
}

const placesOf = (l: Layout): Place[] => Object.values(l).filter((p): p is Place => p != null);

/** The panels' places before the page's first answer (the newer API's full set). */
export function OverviewSkeleton() {
  return <OneScreenGrid ariaLabel={`${WORDS.title}, loading`} loading skeleton={placesOf(layoutOf(null))}>{null}</OneScreenGrid>;
}

export default function Overview({ meta, filters, plant, onOpen }: {
  meta: Meta; filters: Filters; plant: string; onOpen: (v: View) => void;
}) {
  const { data, error, loading } = useOverview({ Plant: plant, ...sectionParams("scheme", filters) }, "scheme");
  // Lifted here: the month tile opens the headline tile's drawer, and the slices tile's rows
  // open the slices drawer on their own tabs.
  const head = useDrawer();
  const slices = useDrawer();
  if (error) return <Notice title="Couldn't load the scheme analysis">{error}</Notice>;

  const at = layoutOf(data);
  const scope = data ? scopeOf(data, meta) : null;
  return (
    <OneScreenGrid ariaLabel={scope ? `${WORDS.title}, ${scope.context}` : WORDS.title} loading={!data} stale={loading && !!data} skeleton={placesOf(at)}>
      {data && scope && (
        <>
          {/* DOM order is the stacking order below the fit size: the figure, its months, its
              parts, where it was missed, the hospitals, then the lists. */}
          <HeadlineTile d={data} scope={scope} place={at.headline} drawer={head} />
          <MonthTile d={data} meta={meta} scope={scope} place={at.month}
            onOpen={() => head.show("mail")} onInfo={() => head.show("method")} />
          {at.slices && data.groups && (
            <SlicesTile groups={data.groups} total={data.headline.saving_missed} scope={scope} place={at.slices} drawer={slices} />
          )}
          <SplitTile d={data} meta={meta} filters={filters} scope={scope} place={at.split} />
          <HospitalsTile d={data} meta={meta} filters={filters} scope={scope} place={at.hospitals} />
          <TopBrandsTile d={data} meta={meta} filters={filters} scope={scope} place={at.brands} onOpen={onOpen} />
          <DoctorsTile d={data} meta={meta} filters={filters} plant={plant} scope={scope} place={at.doctors} onOpen={onOpen} />

          <HeadlineDrawer d={data} meta={meta} filters={filters} scope={scope} drawer={head} onOpen={onOpen} />
          <SlicesDrawer d={data} meta={meta} filters={filters} scope={scope} drawer={slices} />
        </>
      )}
    </OneScreenGrid>
  );
}
