"use client";
// Formulary Compliance — the Overview tab: one screen of charts, the way HCG's own Power BI
// dashboards and the hospital formulary-compliance dashboards it pointed to are laid out (Oct-
// 2026: "most of the graphs on a single screen, graphs and charts, not cards of numbers"). Each
// panel is a chart with its key figures as labels, in lakhs; a click opens its drawer (exact
// rupees, every month, HCG's own tables, the method), and its (i) opens the method.
//
// One unit (8 panels, 12 × 3 grid):
//   r1  compliance vs budget (c1–4)     · formulary vs out of formulary by month (c5–12)
//   r2  drug spend by group (c1–4)      · mix by segment and payer (c5–8)  · position among units (c9–12)
//   r3  top out-of-formulary brands     · out of formulary by doctor       · spend by Item Master class
// All hospitals (7 panels; the unit ranking replaced the PAN units tab):
//   c1–4, r1–3  compliance by unit vs its budget, every unit
//   c5–8        network compliance · drug spend by group · top out-of-formulary brands
//   c9–12       by month           · mix by segment and payer · out of formulary by doctor
// Below a desktop screen the panels stack in DOM order, which is their priority: the key figure,
// the composition, the trend, the split, where the unit stands, the lists. Two half-width panels
// come before the full-width trend, so the two-column stack has no hole beside the first one.
//
// One number runs the page: the share of drug spend that went to FORMULARY items, out of
// formulary + out-of-formulary spend. Non formulary spend (group C) is real money but sits
// outside HCG's ratio, so it is drawn beside the number (hatched) and never inside it.
// Consumables are outside the ratio too.
import React from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import { Notice } from "./parts";
import ComplianceTile from "./ComplianceCard";
import { ClassesTile, DrugSpendTile, MonthTrendTile } from "./overview-cards/DrugSpend";
import { MixTile } from "./overview-cards/Consumption";
import { PositionTile, UnitRankTile } from "./overview-cards/UnitsCard";
import { TopDoctorsTile, TopItemsTile } from "./overview-cards/TopLists";
import { overviewScope, useMonthBefore } from "./overview-cards/shared";
import { filterParams, useOverview, type Filters, type Meta, type View } from "./api";

const ONE_UNIT = {
  compliance: { col: 1, span: 4, row: 1 },
  spend: { col: 1, span: 4, row: 2 },
  trend: { col: 5, span: 8, row: 1 },
  mix: { col: 5, span: 4, row: 2 },
  position: { col: 9, span: 4, row: 2 },
  brands: { col: 1, span: 4, row: 3 },
  doctors: { col: 5, span: 4, row: 3 },
  classes: { col: 9, span: 4, row: 3 },
} satisfies Record<string, Place>;

const NETWORK = {
  compliance: { col: 5, span: 4, row: 1 },
  trend: { col: 9, span: 4, row: 1 },
  // Every unit takes the full height: 23 rows of ~23px at 1440×900. When the page stacks it is
  // at least 520px, and taller with more units (unitsMinH).
  units: { col: 1, span: 4, row: 1, rows: 3, minH: 520 },
  spend: { col: 5, span: 4, row: 2 },
  mix: { col: 9, span: 4, row: 2 },
  brands: { col: 5, span: 4, row: 3 },
  doctors: { col: 9, span: 4, row: 3 },
} satisfies Record<string, Place>;

const placesOf = (network: boolean): Place[] => Object.values(network ? NETWORK : ONE_UNIT);

/** The unit ranking's height when the page stacks: a 22px row per unit under the panel's header
 *  (50px), a legend line and the axis (36px), so every unit shows as HCG adds units; never less
 *  than the grid plans for. */
const unitsMinH = (units: number) => Math.max(NETWORK.units.minH, 86 + units * 22);

/** The grid's panels as placeholders, in their places, while the first answer loads. */
export function OverviewSkeleton({ network }: { network: boolean }) {
  return <OneScreenGrid ariaLabel="Formulary compliance, loading" loading skeleton={placesOf(network)}>{null}</OneScreenGrid>;
}

export default function Overview({ meta, filters, plant, onOpen }: { meta: Meta; filters: Filters; plant: string; onOpen: (v: View) => void }) {
  const { data, error, loading } = useOverview({ Plant: plant, ...filterParams(filters, { method: true }) });
  const before = useMonthBefore(meta, filters, plant);
  if (error) return <Notice title="Couldn't load formulary compliance">{error}</Notice>;
  if (!data) return <OverviewSkeleton network={plant === "ALL"} />;
  const s = overviewScope(data, meta, filters, plant, before, onOpen);
  const ariaLabel = `Formulary compliance, ${s.context}`;

  if (s.network) {
    const P = NETWORK;
    return (
      <OneScreenGrid ariaLabel={ariaLabel} stale={loading}>
        <ComplianceTile s={s} place={P.compliance} />
        <MonthTrendTile s={s} place={P.trend} />
        <UnitRankTile s={s} place={{ ...P.units, minH: unitsMinH(s.d.by_hospital?.length ?? 0) }} />
        <DrugSpendTile s={s} place={P.spend} />
        <MixTile s={s} place={P.mix} />
        <TopItemsTile s={s} place={P.brands} />
        <TopDoctorsTile s={s} place={P.doctors} />
      </OneScreenGrid>
    );
  }
  const P = ONE_UNIT;
  return (
    <OneScreenGrid ariaLabel={ariaLabel} stale={loading}>
      <ComplianceTile s={s} place={P.compliance} />
      <DrugSpendTile s={s} place={P.spend} />
      <MonthTrendTile s={s} place={P.trend} />
      <MixTile s={s} place={P.mix} />
      <PositionTile s={s} place={P.position} />
      <TopItemsTile s={s} place={P.brands} />
      <TopDoctorsTile s={s} place={P.doctors} />
      <ClassesTile s={s} place={P.classes} />
    </OneScreenGrid>
  );
}
