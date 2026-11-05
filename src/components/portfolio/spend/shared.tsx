"use client";
// Spend Analysis — what the Summary and every section's tiles share, defined once so a figure
// reads the same wherever it is drawn: the colour each measure and each topic keeps, the words
// each section's loss is worked out by, and the small helpers the tile folders print with.
import { SAGE, CORAL_SOFT, CORAL_MARK, TEAL, MAUVE, INK, NEUTRAL } from "@/components/portfolio/ledger/kit";
import { pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { Source, SourceSpec } from "@/components/portfolio/ledger/status";
import { OOF_COL } from "../formulary/parts";
import type { OofBucket, OofCoverage, SuggestedBy } from "./api";

export { payerLabel } from "../formulary/api";

// COLOUR LAW on every Spend view, on the kit's WARM hues (ledger/kit.tsx) — one job per hue.
// MEASURES, the same on every tile, chart and drawer:
//   USED_COL     = the brand that was used: the margin it earned, or the spend on it (SAGE).
//   (LOSS_COL is the missed part where a chart sets it against what was earned or possible: a
//   bridge's step, a bullet's gap. A chart of the missed rupees alone takes the colour of what it
//   is broken down by, below.)
//   PROPOSED_COL = the same quantity at the suggested brand (CORAL_SOFT: the pale whole behind
//                  what was earned, so the gap between them is the missed part).
//   LOSS_COL     = the margin missed or the extra spent, in rupees (CORAL_MARK).
//   RATE_COL     = the % missed, and only ever a rate (INK).
//   COUNT_COL    = quantities and brand counts, never rupees (NEUTRAL).
// TOPICS, the dot before a tile's title and the colour of a part wherever parts are compared:
//   CASH_COL = cash & insurance (TPA, TEAL); OOF_COL = out of formulary (CORAL_MARK, as on the
//   Formulary page); SCHEME_COL = scheme (MAUVE); ACROSS_COL = across sections (INK).
export const USED_COL = SAGE;
export const PROPOSED_COL = CORAL_SOFT;
export const LOSS_COL = CORAL_MARK;
export const RATE_COL = INK;
export const COUNT_COL = NEUTRAL;
export const CASH_COL = TEAL;
export { OOF_COL };
export const SCHEME_COL = MAUVE;
export const ACROSS_COL = INK;
// BREAKDOWNS: a one-measure chart by month takes its section's colour (sectionCol); a one-measure
// ranking by hospital, brand or doctor is drawn in the coral, as the stock-value page draws its
// breakdown, on every Spend and Formulary page; vendors, which have no hue of their own, each take
// the next hue of the kit's SERIES.
export const HOSPITAL_COL = CORAL_MARK;
export const BRAND_COL = CORAL_MARK;
export const DOCTOR_COL = CORAL_MARK;

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
        basis: `Margin per unit = MRP excl GST − Pharma price, both from the ${list} cash & TPA price list, for the brand used and the brand the cash list suggests.`,
        formula: "Margin earned = units counted × the used brand's unit margin; margin possible = the same units × the suggested brand's; margin missed = margin possible − margin earned; % missed = margin missed ÷ margin possible (the report's denominator, unlike the scheme %, which divides by spend). For a bifurcated brand only the units above the allowance count.",
      };
    case "oof":
      return {
        basis: "The group's own method, on purchases: every goods receipt (GRN) of a drug that the month's Item Master flags OUT OF FORMULARY, set against the brand the group suggests for it: the group's own worksheet for the month; for a month without one, its pair from another month, then its out-of-formulary list, then the app's match on molecule, strength and form (marked Estimated).",
        formula: "Margin earned = units × (MRP excl GST − the price paid) of the brand bought; margin possible = the same units × (MRP excl GST − Pharma price) of the suggested brand; margin missed = margin possible − margin earned, added up over every receipt as the group does, so a brand that earns more than its suggestion lowers it; % missed = margin missed ÷ margin possible. Receipts the group parked and brands with no suggested brand are listed but add nothing.",
      };
    case "scheme":
      return {
        basis: `For scheme (GOV) patients the ${list} scheme list names a cheaper brand for each brand on it. Both sides are valued at the FY list prices, as the report is.`,
        formula: "Spent = units × the used brand's list price; suggested spend = the same units × the suggested brand's list price; saving missed = spent − suggested spend; % missed = saving missed ÷ spend, as in the 'Scheme Margin Loss' table. Attis and J&J & Covidien → Healthium are the two slices of this loss: parts of it, not added to it.",
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
  computed: { kind: "computed", note: "Worked out by the app from the purchases (GRN), the group's own method, with the brands its worksheets suggest" },
  estimate: {
    kind: "estimate",
    note: "The group's purchase (GRN) method with the brands its worksheets suggest; Estimated only where the app matched a brand itself. The (i) says how.",
  },
};
export const oofSourceOf = (cov: OofCoverage | null | undefined): SourceSpec => OOF_SOURCE[oofSource(cov) === "estimate" ? "estimate" : "computed"];

/** The source of figures that set sections read from bills (`sales`: "Cash & TPA") beside out of
 *  formulary, read from purchases: the badge says where each part comes from. */
export const salesAndPurchasesSource = (sales: string, estimated: boolean): SourceSpec => ({
  kind: estimated ? "estimate" : "computed",
  note: `${sales} recomputed by the app from the HIS sales lines; out of formulary from the purchases (GRN), the group's own method${estimated ? ", Estimated only where the app matched a brand itself" : ""}`,
});

/** "HCG's worksheet ₹16,88,305.41 (99.83%); No alternative mapped ₹2,865.00 (0.17%)": the
 *  purchase value by where its suggested brand came from, in the API's own words. */
export const coverageWords = (cov: OofCoverage | null | undefined): string =>
  coverageParts(cov).map(([, b]) => `${b.label} ${rupeesExact(b.value)} (${pct(b.share_pct)})`).join("; ");

