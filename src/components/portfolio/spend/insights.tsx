"use client";
// Spend Analysis — what the two purchase analyses (Prices, Generic vs branded) share: their
// colours, how a product and a unit price are printed, the selection every tile is computed
// under, and the Method tab every drawer ends with.
//
// Both read HCG's purchases (GRN) in the scope HCG's out-of-formulary workings count, every GRN
// month: no payer, no patient type, and no brand switch, so the page's Brand filter does not
// apply. The server does every sum and every %: nothing here recomputes a figure.
//
// COLOUR LAW, on the kit's chart hues (ledger/kit.tsx), with the Spend pages' own (./shared):
//   PRODUCT_COL  = products, the topic of Prices: its months, its product lists and dots (BRONZE,
//                  the brands' hue: a product is the medicine its brands sell).
//   EXTRA_COL    = what was paid above the cheapest price (ROSE, the missed part).
//   GENERIC_COL / BRANDED_COL = generic and branded purchases (BLUE / ORANGE), on every chart of
//                  that section; the extra branded purchases cost over generics is branded's.
//   Hospitals LAVENDER and suppliers the kit's SERIES, as on every Spend page; every % PLUM.
// Each pair a chart draws side by side was checked with the data-viz palette validator.
import React from "react";
import { BLUE, BRONZE, ORANGE, ROSE, SUB } from "@/components/portfolio/ledger/kit";
import { DrawerSection, type DrawerFilter } from "@/components/portfolio/ledger/DetailDrawer";
import { dayLabel, isNum } from "@/components/portfolio/ledger/format";
import { purchaseMonthsLabel, type Filters, type InsightScope, type Meta, type PurchaseMonth } from "./api";

export { HOSPITAL_COL, RATE_COL, plural } from "./shared";

export const PRODUCT_COL = BRONZE;
export const EXTRA_COL = ROSE;
export const GENERIC_COL = BLUE;
export const BRANDED_COL = ORANGE;

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
