"use client";
// Spend Analysis — the Prices overview tab: price variation on HCG's purchases (GRN).
//
// The same product (one molecule, strength, form and kind) bought at different unit prices after
// discount, by supplier and hospital. One number runs the page: what was paid above the cheapest
// unit price paid in the selection for the same product (the extra paid). With one hospital the
// cheapest is its own; the hospital ranking sets every hospital against the cheapest any paid.
//
// One screen of charts (OneScreenGrid, 12 columns × 3 rows on a desktop):
//   r1  the extra paid | the products as a scatter (cheapest price × dearest ÷ cheapest, area =
//       spend; rows 1–2) | the extra paid by month
//   r2  the products with the most extra paid | (scatter) | every hospital ranked (rows 2–3)
//   r3  the chosen product's prices by supplier | the suppliers' price index
// A dot or a product's bar shows that product in detail; every panel opens its drawer, where the
// exact rupees and the method live. The tiles are in this folder. Below the fit size the same
// panels stack in DOM order.
import React from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import { Notice } from "../../formulary/parts";
import { insightParams, useOverview, type Filters, type Meta, type PricesOverview as Data, type View } from "../api";
import { WORDS, makeCtx } from "./context";
import { HeadlineTile } from "./HeadlineTile";
import { ScatterTile } from "./ScatterTile";
import { MonthTile } from "./MonthTile";
import { TopProductsTile } from "./TopProductsTile";
import { HospitalsTile } from "./HospitalsTile";
import { ProductTile } from "./ProductTile";
import { SuppliersTile } from "./SuppliersTile";

/** The ranking of every hospital, and the scatter, ask for room when the page stacks. */
const RANKING_MIN_H = 520;
const SCATTER_MIN_H = 380;

const PLACES = {
  headline: { col: 1, span: 3, row: 1 },
  scatter: { col: 4, span: 6, row: 1, rows: 2, minH: SCATTER_MIN_H },
  months: { col: 10, span: 3, row: 1 },
  top: { col: 1, span: 3, row: 2 },
  hospitals: { col: 10, span: 3, row: 2, rows: 2, minH: RANKING_MIN_H },
  product: { col: 1, span: 5, row: 3 },
  vendors: { col: 6, span: 4, row: 3 },
} satisfies Record<string, Place>;
const SKELETON: Place[] = Object.values(PLACES);

/** The panels' places until the first answer arrives. */
export function PricesOverviewSkeleton() {
  return <OneScreenGrid ariaLabel={`${WORDS.title}, loading`} loading skeleton={SKELETON}>{null}</OneScreenGrid>;
}

export default function PricesOverview({ meta, filters, plant, molecule, onMolecule, onOpen }: {
  meta: Meta;
  /** The page's filters as this section applies them (insightFilters: its own months). */
  filters: Filters;
  plant: string;
  /** The product shown in detail (a molecule key); null: the one with the most extra paid. */
  molecule: string | null;
  onMolecule: (key: string | null) => void;
  onOpen: (v: View) => void;
}) {
  const params = insightParams(filters);
  const { data, error, loading } = useOverview<Data>({ Plant: plant, ...params, ...(molecule ? { Molecule: molecule } : {}) }, "prices");
  if (error) return <Notice title="Couldn't load the price variation">{error}</Notice>;
  if (!data) return <PricesOverviewSkeleton />;

  const c = makeCtx(data, meta, filters, plant, params, onMolecule, onOpen);
  // DOM order is the order the panels stack in below a desktop size: the figure, the products,
  // the chosen product, the top list, the suppliers, then the months and the hospitals.
  return (
    <OneScreenGrid ariaLabel={`${WORDS.title}, ${c.context}`} stale={loading} skeleton={SKELETON}>
      <HeadlineTile c={c} place={PLACES.headline} />
      <ScatterTile c={c} place={PLACES.scatter} />
      <ProductTile c={c} place={PLACES.product} />
      <TopProductsTile c={c} place={PLACES.top} />
      <SuppliersTile c={c} place={PLACES.vendors} />
      <MonthTile c={c} place={PLACES.months} />
      <HospitalsTile c={c} place={PLACES.hospitals} />
    </OneScreenGrid>
  );
}
