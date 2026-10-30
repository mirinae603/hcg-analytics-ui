"use client";
// Spend Analysis (Prices) — what every tile of the price-variation overview shares: the data
// shape, the section's words, the selection the tiles are computed under, the chosen product,
// each supplier's colour, and the Method tab every drawer ends with.
//
// Price variation: the same product (one molecule, strength, form and kind: its brands are the
// same medicine) bought at different unit prices, after discount (GRN Total Amount without tax ÷
// GR Qty). Against the cheapest unit price paid in the selection, what was paid above it is the
// extra paid; paid ÷ the same units at the cheapest is the price index (1.00 = always the
// cheapest). Every figure is the API's; nothing here recomputes one.
import React from "react";
import { INK, SERIES, tint } from "@/components/portfolio/ledger/kit";
import type { SourceSpec } from "@/components/portfolio/ledger/status";
import type { Filters, Meta, PriceProduct, PricesOverview, View } from "../api";
import { InsightMethod, insightBase, type InsightBase } from "../insights";

export { PRODUCT_COL, EXTRA_COL, HOSPITAL_COL, RATE_COL } from "../insights";

export type Data = PricesOverview;
export type Product = PriceProduct;
export type Chosen = NonNullable<Data["molecule"]>;

/** The section's words, plain. */
export const WORDS = {
  section: "Prices",
  title: "Price variation",
  none: "No purchase to compare in this selection",
  extra: "Paid above the cheapest",
  extraNote: "Extra paid = what was paid − the same units at the cheapest unit price paid in this selection; % = that ÷ what was paid for the products compared.",
  indexNote: "Price index = what was paid ÷ the same units at the cheapest price anyone paid in this selection: 1.00× is always the cheapest, 1.25× a quarter above it.",
};

/** Where every price figure comes from, in the badge's words: purchases, not sales lines. */
export const PRICES_SOURCE: SourceSpec = { kind: "computed", note: "Computed by the app from HCG's purchases (GRN extracts): unit price after discount" };

/** A supplier outside the series' eight hues: one muted colour, its row names it. */
export const OTHER_VENDOR_COL = tint(INK, 0.35);

/** The selection every tile on the overview is computed under, worked out once. */
export type Ctx = InsightBase & {
  d: Data;
  w: typeof WORDS;
  /** The header hospital's code (or ALL): the tables' `plant`. */
  plant: string;
  /** The product shown in detail: the one picked, else the API's (the most extra paid). */
  chosen: string | null;
  /** Shows a product in detail; null goes back to the one with the most extra paid. */
  choose: (key: string | null) => void;
  /** A supplier's colour on every tile: the eight largest suppliers of the selection take the
   *  kit's eight series hues in their order, the rest a muted one. */
  vendorCol: (name: string) => string;
  /** Moves to another tab of the section (Products). */
  onOpen: (v: View) => void;
};

export function makeCtx(d: Data, meta: Meta, filters: Filters, plant: string, params: Record<string, string>,
  choose: (key: string | null) => void, onOpen: (v: View) => void): Ctx {
  const hue = new Map((d.vendors || []).slice(0, SERIES.length).map((v, i) => [v.vendor_name, SERIES[i]]));
  const chosen = d.molecule?.molecule_key ?? d.scope?.molecule ?? null;
  return {
    ...insightBase(d, meta, filters, params),
    d, w: WORDS, plant, onOpen, chosen,
    // Picking the product already shown asks for nothing.
    choose: (key) => { if (key == null || key !== chosen) choose(key); },
    vendorCol: (name) => hue.get(name) ?? OTHER_VENDOR_COL,
  };
}

/** A drawer's Method tab: what this tile's figure is, then how every price figure is built. */
export function Method({ c, children }: { c: Ctx; children: React.ReactNode }) {
  return (
    <InsightMethod base={c} notes={c.d.notes || []} basis={(
      <>
        <li>Source: HCG&apos;s GRN (goods receipt) extracts, in the scope HCG&apos;s out-of-formulary workings count, every month with a GRN file and every formulary class; purchases have no payer, patient type or doctor.</li>
        <li>A product is one molecule, strength, form and kind, read from the brand&apos;s description: its brands are the same medicine, so their unit prices can be compared. Unit price = the price after discount (Total Amount without tax ÷ GR Qty).</li>
        <li>{WORDS.extraNote}</li>
        <li>{WORDS.indexNote}</li>
      </>
    )}>{children}</InsightMethod>
  );
}
