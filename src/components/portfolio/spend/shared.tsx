"use client";
// Spend Analysis — what the Summary and every section's tiles share, defined once so a figure
// reads the same wherever it is drawn: the colour each measure and each topic keeps, the words
// each section's loss is worked out by, and the small helpers the tile folders print with.
import { BLUE, BRONZE, JADE, LAVENDER, LEAF, PLUM, ROSE, PINE, INK, NEUTRAL } from "@/components/portfolio/ledger/kit";
import { OOF_COL } from "../formulary/parts";

export { payerLabel } from "../formulary/api";

// COLOUR LAW on every Spend view, on the kit's chart hues (ledger/kit.tsx) — one job per hue.
// MEASURES, the same on every tile, chart and drawer:
//   USED_COL     = the brand that was used: the margin it earned, or the spend on it (JADE).
//   (LOSS_COL is the missed part where a chart sets it against what was earned or possible: a
//   bridge's step, a bullet's gap. A chart of the missed rupees alone takes the colour of what it
//   is broken down by, below, so a page is not one colour.)
//   PROPOSED_COL = the same quantity at the suggested (or matched formulary) brand (BLUE).
//   LOSS_COL     = the margin missed or the extra spent, in rupees (ROSE).
//   RATE_COL     = the % missed, and only ever a rate (PLUM).
//   COUNT_COL    = quantities and brand counts, never rupees (NEUTRAL).
// TOPICS, the strip on top of a tile and the colour of a part wherever parts are compared:
//   CASH_COL = cash & insurance (TPA); OOF_COL = out of formulary (ORANGE, as on the Formulary
//   page); SCHEME_COL = scheme; ACROSS_COL = across sections.
export const USED_COL = JADE;
export const PROPOSED_COL = BLUE;
export const LOSS_COL = ROSE;
export const RATE_COL = PLUM;
export const COUNT_COL = NEUTRAL;
export const CASH_COL = BLUE;
export { OOF_COL };
export const SCHEME_COL = PINE;
export const ACROSS_COL = INK;
// BREAKDOWNS: a one-measure chart takes the colour of what its bars are. By month, its
// section's (sectionCol); by hospital, brand or doctor, these on every Spend and Formulary page.
export const HOSPITAL_COL = LAVENDER;
export const BRAND_COL = BRONZE;
export const DOCTOR_COL = LEAF;

/** The sections with a loss of their own. */
export type LossKind = "cash" | "oof" | "scheme";

/** A section's own colour: its topic strip, and its months' bars. */
export const sectionCol = (k: LossKind): string => (k === "cash" ? CASH_COL : k === "oof" ? OOF_COL : SCHEME_COL);

/** How a section's two sides are valued (`basis`) and how its loss and % missed follow from them
 *  (`formula`): one wording for the sections' drawers and the Summary's. */
export type LossMethod = { basis: string; formula: string };

/** `fy` is the financial year of the HCG price list the section reads ("26-27"). */
export function lossMethod(kind: LossKind, fy?: string | null): LossMethod {
  const list = fy ? `FY ${fy}` : "current";
  switch (kind) {
    case "cash":
      return {
        basis: `Margin per unit = MRP excl GST − HCG Pharma price, both from HCG's ${list} cash & TPA price list, for the brand used and the brand HCG's cash list suggests.`,
        formula: "Margin earned = units counted × the used brand's unit margin; margin possible = the same units × the suggested brand's; margin missed = margin possible − margin earned; % missed = margin missed ÷ margin possible (HCG's denominator, unlike the scheme %, which divides by spend). For a bifurcated brand only the units above HCG's allowance count.",
      };
    case "oof":
      return {
        basis: `Each out-of-formulary brand (the month's Item Master flag) given to cash & TPA patients is set against the formulary brand of the same molecule (Item Master 'Minor Group'), strength and form with the best margin in HCG's ${list} price list: the app's own match until HCG sends its list, hence the Estimated badge.`,
        formula: "Margin earned = the bill's MRP excl GST − the bill's cost; margin possible = the same units × the formulary brand's unit margin; margin missed = margin possible − margin earned; % missed = margin missed ÷ margin possible. A brand with no formulary match is listed in the section's Brands tab but adds nothing.",
      };
    case "scheme":
      return {
        basis: `For scheme (GOV) patients HCG's ${list} scheme list names a cheaper brand for each brand on it. Both sides are valued at HCG's FY list prices, as HCG's report is.`,
        formula: "Spent = units × the used brand's list price; suggested spend = the same units × the suggested brand's list price; margin missed = spent − suggested spend; % missed = margin missed ÷ spend, as in HCG's 'Scheme Margin Loss' table. Attis and J&J & Covidien → Healthium are HCG's two slices of this loss: parts of it, not added to it.",
      };
  }
}

/** The API's patient-type codes, spelt out for a reader. */
export const typeLabel = (t: string) => (t === "IP" ? "Inpatient (IP)" : t === "OP" ? "Outpatient (OP)" : t);

/** A ranked list's title from the rows it holds: "Top 5 brands to switch", or the bare noun for
 *  one row or none ("Brands to switch"). */
export const topTitle = (n: number, what: string) => (n > 1 ? `Top ${n} ${what}` : `${what[0].toUpperCase()}${what.slice(1)}`);
