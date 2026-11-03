"use client";
// Spend Analysis — what the two purchase analyses (Prices, Generic vs branded) share: their
// colours, how a product and a unit price are printed, the selection every tile is computed
// under, and the Method tab every drawer ends with.
//
// Both read HCG's purchases (GRN) in the scope HCG's out-of-formulary workings count, every GRN
// month: no payer, no patient type, and no brand switch, so the page's Brand filter does not
// apply. The server does every sum and every %: nothing here recomputes a figure.
//
// COLOUR LAW, on the kit's WARM hues (ledger/kit.tsx), with the Spend pages' own (./shared):
//   PRODUCT_COL  = products, the topic of Prices: its months, its product lists and dots
//                  (CORAL_MARK, a one-measure ranking's coral, as brands are).
//   EXTRA_COL    = what was paid above the usual cheapest price (CORAL_MARK, the missed part).
//   GENERIC_COL / BRANDED_COL = generic and branded purchases (TEAL / MAUVE), on every chart of
//                  that section; the extra branded purchases cost over generics is branded's.
//   CHECK_COL    = a purchase priced unusually low, to check (INK: no supplier takes it, so a
//                  dot in a supplier's row stands apart from that supplier's own hue).
//   Hospitals the coral and suppliers the kit's SERIES, as on every Spend page; every % INK.
// Each pair a chart draws side by side was checked with the data-viz palette validator.
//
// THE BENCHMARK: every comparison is against the USUAL cheapest price (the price reached once a
// set share of the units has been counted, cheapest purchase first), never the lowest price
// anyone paid, so one odd cheap purchase cannot set it. The share and the "unusually low" ratio are the API's `rule`; the
// words below print them, and leave them out rather than guess when an older API sends none.
import React from "react";
import { CORAL_MARK, INK, MAUVE, SUB, TEAL } from "@/components/portfolio/ledger/kit";
import { DrawerSection, type DrawerFilter } from "@/components/portfolio/ledger/DetailDrawer";
import { dayLabel, isNum } from "@/components/portfolio/ledger/format";
import { purchaseMonthsLabel, type Filters, type InsightScope, type Meta, type PriceRule, type PurchaseMonth } from "./api";

export { HOSPITAL_COL, RATE_COL, plural } from "./shared";

export const PRODUCT_COL = CORAL_MARK;
export const EXTRA_COL = CORAL_MARK;
export const GENERIC_COL = TEAL;
export const BRANDED_COL = MAUVE;
export const CHECK_COL = INK;

// ─────────────────────────────────────────────────────────────────────────────
// How products and prices print
// ─────────────────────────────────────────────────────────────────────────────
type ProductName = { minor_group: string | null; molecule?: string | null; strength: string | null; form: string | null; kind?: string | null };

/** "CETUXIMAB 100MG INJ", in HCG's own molecule name; a combination's strengths joined with
 *  "+" ("CEFTAZIDIME+AVIBACTAM 0.5MG + 2000MG INJ"). */
export const productName = (p: ProductName) => [
  p.minor_group || p.molecule || "Unnamed product",
  p.strength ? p.strength.split("|").filter(Boolean).join(" + ") : null,
  p.form,
  p.kind,
].filter(Boolean).join(" ");

/** A unit price as paid: "₹5,100", "₹18,938.10", "₹0.76" (paise when it has them). */
export function unitPrice(v: number | null | undefined): string {
  if (!isNum(v)) return "—";
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** A price axis tick (a 1-2-5 step): "₹0.5", "₹20", "₹5K", "₹2L". */
export function priceTick(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e5) return `₹${+(v / 1e5).toPrecision(3)}L`;
  if (a >= 1e3) return `₹${+(v / 1e3).toPrecision(3)}K`;
  return `₹${+v.toPrecision(3)}`;
}

/** A ratio of two prices: "3.71×" (`d` decimals), "—" without one. */
export const times = (v: number | null | undefined, d = 2) => (isNum(v) ? `${v.toFixed(d)}×` : "—");

/** A ratio axis tick: "1×", "2.5×". */
export const ratioTick = (v: number) => `${+v.toPrecision(3)}×`;

// ─────────────────────────────────────────────────────────────────────────────
// The benchmark's rule in words
// ─────────────────────────────────────────────────────────────────────────────
/** A rule % as printed: "10", "12.5" (no trailing zeros). */
const rulePct = (v: number) => `${+v.toFixed(2)}`;

/** The share of the units the usual cheapest is reached at: "at least 10% of the units"; "a set
 *  share of the units" without the API's rule. */
const ruleShare = (rule: PriceRule | null | undefined, units: string) =>
  rule && isNum(rule.usual_share_pct) ? `at least ${rulePct(rule.usual_share_pct)}% of ${units}` : `a set share of ${units}`;

/** The usual cheapest in one plain sentence, for a Method: "The usual cheapest is the price
 *  reached once at least 10% of the units have been counted, cheapest purchase first, so one odd
 *  cheap purchase cannot set it." The API counts up from the cheapest (its purchase_validation
 *  words: "counting up from the cheapest"), so the price it names can itself hold under 10% of
 *  the units: "the lowest price at which 10% were bought" would name a dearer one. `what`,
 *  `price` and `units` name it for a section ("usual cheapest generic", "generic price",
 *  "that month's generic units"). Without the API's rule the share is not printed. */
export function usualCheapestRule(rule: PriceRule | null | undefined,
  { what = "usual cheapest", price = "price", units = "the units" }: { what?: string; price?: string; units?: string } = {}): string {
  const known = !!rule && isNum(rule.usual_share_pct);
  return `The ${what} is the ${price} reached once ${ruleShare(rule, units)} ${known ? "have" : "has"} been counted, cheapest purchase first, so one odd cheap purchase cannot set it.`;
}

/** The same rule as a short line for a tile's face (the full sentence is its tooltip): "Usual
 *  cheapest = the price reached at 10% of a product's units, cheapest first". */
export function usualCheapestShort(rule: PriceRule | null | undefined,
  { what = "usual cheapest", units = "a product's units" }: { what?: string; units?: string } = {}): string {
  const at = rule && isNum(rule.usual_share_pct) ? `${rulePct(rule.usual_share_pct)}% of ${units}` : `a set share of ${units}`;
  return `${what.charAt(0).toUpperCase()}${what.slice(1)} = the price reached at ${at}, cheapest first`;
}

/** Ratios that read better in words than as a %: "under half the usual cheapest". */
const RATIO_WORDS: Record<number, string> = { 25: "a quarter of", 50: "half" };

/** How far under the usual cheapest a price counts as unusually low, as a phrase to follow
 *  "under": "half the usual cheapest", "40% of the usual cheapest"; null without the API's rule. */
export function lowRatioWords(rule: PriceRule | null | undefined): string | null {
  if (!rule || !isNum(rule.low_ratio_pct)) return null;
  const word = RATIO_WORDS[rule.low_ratio_pct];
  return word ? `${word} the usual cheapest` : `${rulePct(rule.low_ratio_pct)}% of the usual cheapest`;
}

/** How far above the usual cheapest a product's dearest price must be for it to count as bought
 *  above it (`varies`): "by at least 1%"; the build's threshold, unnamed, without the API's rule. */
export const spreadWords = (rule: PriceRule | null | undefined) =>
  rule && isNum(rule.spread_min_pct) ? `by at least ${rulePct(rule.spread_min_pct)}%` : "by more than the purchase build's threshold";

/** The "to check" key on the chosen product's chart: "Holds a receipt under 50% of the usual
 *  cheapest — to check" (the API's ratio), else "Holds an unusually low receipt — to check". A
 *  dot is one hospital × brand × supplier summed over the selected months, and the API marks it
 *  when ANY of its receipts is that low; the dot itself sits at the average price of all of them,
 *  which can be well above the threshold (or above the usual cheapest line), so the key names
 *  the receipt, not the dot's price. */
export const checkLabel = (rule: PriceRule | null | undefined) =>
  rule && isNum(rule.low_ratio_pct) ? `Holds a receipt under ${rulePct(rule.low_ratio_pct)}% of the usual cheapest — to check` : "Holds an unusually low receipt — to check";

// ─────────────────────────────────────────────────────────────────────────────
// The selection a purchase analysis's tiles are computed under
// ─────────────────────────────────────────────────────────────────────────────
export type InsightBase = {
  /** "HCG KR, Bangalore" or "All hospitals". */
  where: string;
  /** "Aug-26", or "Dec-25 – Aug-26" for a run. */
  when: string;
  /** The line after every tile's title: "HCG KR, Bangalore · Aug-26". */
  context: string;
  /** All hospitals together, rather than one. */
  network: boolean;
  /** Every month the build holds, with its label. */
  months: PurchaseMonth[];
  asOf: string | null;
  /** The filters, read-only, in every drawer's header. */
  chips: DrawerFilter[];
  /** The overview's own query (the hospital and the section's filters): the tables' too. */
  params: Record<string, string>;
};

export function insightBase(d: { scope: InsightScope; months_available: PurchaseMonth[]; data_as_of: string | null },
  meta: Meta, filters: Filters, params: Record<string, string>): InsightBase {
  const network = !d.scope?.plant || d.scope.plant === "ALL";
  const where = network ? "All hospitals" : d.scope.plant_name || d.scope.plant;
  const months = d.months_available || [];
  const when = purchaseMonthsLabel(months, d.scope?.months || []);
  const segment = filters.segment === "ALL" ? "All drugs"
    : meta.categories?.find((c) => c.key === filters.segment)?.label ?? filters.segment;
  return {
    where, when, network, months, params,
    context: `${where} · ${when}`,
    asOf: dayLabel(d.data_as_of),
    chips: [
      { label: "Hospital", value: where },
      { label: "Month", value: when },
      { label: "Material", value: segment },
      { label: "Patients · payer", value: "not applied: purchases" },
      ...(filters.brand ? [{ label: "Brand", value: `${filters.brand.name}: not applied here` }] : []),
    ],
  };
}

/** A drawer's Method tab: what this tile's figure is, then how every figure of the section is
 *  built (`basis`: the section's own lines), the API's notes for the selection last. */
export function InsightMethod({ base, notes, basis, children }: {
  base: InsightBase; notes: string[]; basis: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <>
      <DrawerSection title="This figure">
        <div className="space-y-3 text-[12.5px] leading-relaxed" style={{ color: SUB }}>{children}</div>
      </DrawerSection>
      <DrawerSection title="How these figures are built">
        <ul className="space-y-1.5 text-[12.5px] leading-relaxed list-disc pl-5" style={{ color: SUB }}>
          {basis}
          <li>Every figure is summed for the selection and the % is taken once, never an average of hospital, product or monthly percentages.</li>
          <li>Charts print rupees in lakhs and unit prices in rupees; the drawers print exact rupees with paise.</li>
          {notes.map((t) => <li key={t}>{t}</li>)}
          {base.asOf && <li>Purchase data as of {base.asOf}.</li>}
        </ul>
      </DrawerSection>
    </>
  );
}
