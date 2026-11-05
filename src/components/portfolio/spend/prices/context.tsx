"use client";
// Spend Analysis (Prices) — what every tile of the price-variation overview shares: the data
// shape, the section's words, the selection the tiles are computed under, the chosen product,
// each supplier's colour, and the Method tab every drawer ends with.
//
// Price variation: the same product (one molecule, strength, form and kind: its brands are the
// same medicine) bought at different unit prices, after discount (GRN Total Amount without tax ÷
// GR Qty). Against the product's USUAL cheapest unit price in the selection (the lowest at which
// a set share of its units were reached, counting up from the cheapest: the API's `rule`), what
// each purchase paid above it is the extra paid (a purchase under it adds nothing, it never
// offsets another's); paid ÷ the same units at the usual cheapest is the price index (1.00 = at
// it on average, under 1 = paid less than it overall). A purchase far under it is listed to check, never taken
// as the benchmark. Every figure is the API's; nothing here recomputes one.
import React from "react";
import { INK, SERIES, tint } from "@/components/portfolio/ledger/kit";
import type { SourceSpec } from "@/components/portfolio/ledger/status";
import type { Filters, Meta, PriceProduct, PricesOverview, View } from "../api";
import { InsightMethod, checkLabel, insightBase, lowRatioWords, spreadWords, usualCheapestRule, type InsightBase } from "../insights";

export { PRODUCT_COL, EXTRA_COL, HOSPITAL_COL, RATE_COL, CHECK_COL } from "../insights";

export type Data = PricesOverview;
export type Product = PriceProduct;
export type Chosen = NonNullable<Data["molecule"]>;

/** The section's words, plain. */
export const WORDS = {
  section: "Prices",
  title: "Price variation",
  none: "No purchase to compare in this selection",
  extra: "Paid above the usual cheapest",
  // Each purchase on its own, as the API sums it: one bought under the usual cheapest adds
  // nothing, rather than taking off what another paid above it (the price index is the ratio
  // that nets them).
  extraNote: "Extra paid = what each purchase paid above the product's usual cheapest unit price in this selection (its value − its units × the usual cheapest; a purchase under it adds nothing); % = that ÷ what was paid for the products compared.",
  indexNote: "Price index = what was paid ÷ the same units at the usual cheapest price in this selection: 1.00× = paid the usual cheapest on average, 1.25× a quarter above it, below 1.00× = paid less than the usual cheapest overall (some purchases were under it).",
  checkNote: "Why check them: a price this far under the usual cheapest is likely a data-entry slip (a quantity or a price keyed wrong) or a free or bonus supply booked at a token price. They stay in the figures, and being under it, none of them can set the usual cheapest.",
};

/** Where every price figure comes from, in the badge's words: purchases, not sales lines. */
export const PRICES_SOURCE: SourceSpec = { kind: "computed", note: "Computed by the app from the group's purchases (GRN extracts): unit price after discount" };

/** A supplier outside the series' eight hues: one muted colour, its row names it. */
export const OTHER_VENDOR_COL = tint(INK, 0.35);

/** The selection every tile on the overview is computed under, worked out once. */
export type Ctx = InsightBase & {
  d: Data;
  w: typeof WORDS;
  /** The usual cheapest in one plain sentence, with the API's share (Method, once per drawer). */
  rule: string;
  /** "half the usual cheapest": how far under it a price is unusually low; null without the
   *  API's rule (the words then say "unusually low"). */
  low: string | null;
  /** The "to check" key on the chosen product's chart. */
  checkLabel: string;
  /** "by at least 1%": how far above the usual cheapest a product's dearest price must be for it
   *  to count as bought above it. */
  spread: string;
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
    rule: usualCheapestRule(d.rule), low: lowRatioWords(d.rule), checkLabel: checkLabel(d.rule), spread: spreadWords(d.rule),
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
        <li>Source: the GRN (goods receipt) extracts, in the scope the out-of-formulary workings count, every month with a GRN file and every formulary class; purchases have no payer, patient type or doctor.</li>
        <li>A product is one molecule, strength, form and kind, read from the brand&apos;s description: its brands are the same medicine, so their unit prices can be compared. Unit price = the price after discount (Total Amount without tax ÷ GR Qty).</li>
        <li>{c.rule} {c.low ? `A purchase under ${c.low}` : "A purchase far under it"} is unusually low: it stays in the figures and is listed to check (the To check tab).</li>
        <li>{WORDS.extraNote}</li>
        <li>{WORDS.indexNote}</li>
      </>
    )}>{children}</InsightMethod>
  );
}
