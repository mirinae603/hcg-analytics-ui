"use client";
// Spend Analysis — what the Summary and every section's tiles share, defined once so a figure
// reads the same wherever it is drawn: the colour each measure and each topic keeps, the words
// each section's loss is worked out by, and the small helpers the tile folders print with.
import { BLUE, BRONZE, JADE, LAVENDER, LEAF, PLUM, ROSE, PINE, INK, NEUTRAL } from "@/components/portfolio/ledger/kit";
import { pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { Source, SourceSpec } from "@/components/portfolio/ledger/status";
import { OOF_COL } from "../formulary/parts";
import type { OofBucket, OofCoverage, SuggestedBy } from "./api";

export { payerLabel } from "../formulary/api";

// COLOUR LAW on every Spend view, on the kit's chart hues (ledger/kit.tsx) — one job per hue.
// MEASURES, the same on every tile, chart and drawer:
//   USED_COL     = the brand that was used: the margin it earned, or the spend on it (JADE).
//   (LOSS_COL is the missed part where a chart sets it against what was earned or possible: a
//   bridge's step, a bullet's gap. A chart of the missed rupees alone takes the colour of what it
//   is broken down by, below, so a page is not one colour.)
//   PROPOSED_COL = the same quantity at the suggested brand (BLUE).
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
// section's (sectionCol); by hospital, brand or doctor, these on every Spend and Formulary page;
// vendors, which have no hue of their own, each take the next hue of the kit's SERIES.
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
        basis: "HCG's own method, on purchases: every goods receipt (GRN) of a drug that the month's Item Master flags OUT OF FORMULARY, set against the brand HCG suggests for it: HCG's own worksheet for the month; for a month without one, HCG's pair from another month, then HCG's out-of-formulary list, then the app's match on molecule, strength and form (marked Estimated).",
        formula: "Margin earned = units × (MRP excl GST − the price paid) of the brand bought; margin possible = the same units × (MRP excl GST − HCG Pharma price) of the suggested brand; margin missed = margin possible − margin earned, added up over every receipt as HCG does, so a brand that earns more than its suggestion lowers it; % missed = margin missed ÷ margin possible. Receipts HCG parked and brands with no suggested brand are listed but add nothing.",
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
/** "1 brand", "3 brands"; `many` for a word whose plural is not +s ("products were"). */
export const plural = (n: number, word: string, many = `${word}s`) => `${num(n)} ${n === 1 ? word : many}`;
/** A supplier's SAP codes in words: 'code 50001' or 'codes 50790, 50990'. */
export const codesText = (codes: string[]) => `${codes.length === 1 ? "code" : "codes"} ${codes.join(", ")}`;

export const topTitle = (n: number, what: string) => (n > 1 ? `Top ${n} ${what}` : `${what[0].toUpperCase()}${what.slice(1)}`);

// ─────────────────────────────────────────────────────────────────────────────
// Out of formulary: where its suggested brands came from
// ─────────────────────────────────────────────────────────────────────────────
/** The buckets with any purchase value, in the API's order (HCG's worksheet first). */
export const coverageParts = (cov: OofCoverage | null | undefined): [SuggestedBy, OofBucket][] =>
  (Object.entries(cov ?? {}) as [SuggestedBy, OofBucket | undefined][])
    .filter((e): e is [SuggestedBy, OofBucket] => !!e[1] && e[1].value > 0);

/** Out-of-formulary figures are HCG's own method; they are an estimate only where part of the
 *  purchase value rests on the app's own match (the Estimated suggestions). */
export const oofSource = (cov: OofCoverage | null | undefined): Source =>
  coverageParts(cov).some(([, b]) => b.estimated) ? "estimate" : "computed";

/** Out of formulary's source in words, for its badge: read from purchases, not sales lines. */
export const OOF_SOURCE: Record<"computed" | "estimate", SourceSpec> = {
  computed: { kind: "computed", note: "Worked out by the app from HCG's purchases (GRN), HCG's own method, with the brands HCG's worksheets suggest" },
  estimate: {
    kind: "estimate",
    note: "HCG's purchase (GRN) method with the brands HCG's worksheets suggest; Estimated only where the app matched a brand itself. The (i) says how.",
  },
};
export const oofSourceOf = (cov: OofCoverage | null | undefined): SourceSpec => OOF_SOURCE[oofSource(cov) === "estimate" ? "estimate" : "computed"];

/** The source of figures that set sections read from bills (`sales`: "Cash & TPA") beside out of
 *  formulary, read from purchases: the badge says where each part comes from. */
export const salesAndPurchasesSource = (sales: string, estimated: boolean): SourceSpec => ({
  kind: estimated ? "estimate" : "computed",
  note: `${sales} recomputed by the app from HCG's HIS sales lines; out of formulary from HCG's purchases (GRN), HCG's own method${estimated ? ", Estimated only where the app matched a brand itself" : ""}`,
});

/** "HCG's worksheet ₹16,88,305.41 (99.83%); No alternative mapped ₹2,865.00 (0.17%)": the
 *  purchase value by where its suggested brand came from, in the API's own words. */
export const coverageWords = (cov: OofCoverage | null | undefined): string =>
  coverageParts(cov).map(([, b]) => `${b.label} ${rupeesExact(b.value)} (${pct(b.share_pct)})`).join("; ");

