"use client";
// Spend Analysis (Generic vs branded) — what every tile of the overview shares: the data shape,
// the section's words, the selection the tiles are computed under, the formulary classes'
// colours, and the Method tab every drawer ends with.
//
// Branded = a product of the company that invented the medicine (an originator: Roche, MSD …);
// every other product is generic (Indian brands, biosimilars, hospital and generic makers). That
// split is the app's own until HCG confirms it, so every tile carries the Estimated badge and
// the definition tile says it in plain words. Two measures follow: the cost (what branded
// purchases cost above the cheapest generic of the same product) and where each class sits in
// the Item Master (formulary, non formulary, out of formulary). Every figure is the API's.
import React from "react";
import { BRASS } from "@/components/portfolio/ledger/kit";
import type { SourceSpec } from "@/components/portfolio/ledger/status";
import { F_COL, NF_COL, OOF_COL, X_COL } from "../../formulary/parts";
import type { Filters, GenericOverview, Meta } from "../api";
import { InsightMethod, insightBase, type InsightBase } from "../insights";

export { GENERIC_COL, BRANDED_COL, HOSPITAL_COL, RATE_COL } from "../insights";

export type Data = GenericOverview;
export type Month = Data["by_month"][number];
export type Block = Data["headline"];

/** The section's words, plain. */
export const WORDS = {
  section: "Generic vs branded",
  title: "Generic vs branded purchases",
  none: "No purchase in this selection",
  /** The definition as a reader needs it; the API's own wording is in the definition's drawer. */
  plain: "Branded = made by the company that invented the medicine (e.g. Roche, MSD); everything else counts as generic.",
  extra: "Branded above the cheapest generic",
  extraNote: "Above the cheapest generic = for a branded purchase of a product also bought as a generic that month (at any hospital), its unit price above the cheapest generic's, × the units bought; % = that ÷ the branded value that had a generic to compare with.",
};

/** Every figure here rests on the estimated definition: the badge says so in its own words. */
export const GENERIC_SOURCE: SourceSpec = {
  kind: "estimate",
  note: "Estimated definition: branded = a product of the company that invented the medicine (an originator), until HCG confirms it; the values are HCG's purchases (GRN). The (i) says how.",
};

/** The Item Master's flags in the Formulary page's colours: formulary JADE, non formulary
 *  (outside the compliance ratio) hatched slate, not in the master grey. Out of formulary keeps
 *  its ORANGE but hatched, and names its source: on this screen solid ORANGE is branded
 *  (BRANDED_COL), and one hue does one job. `label` replaces the API's on the chart. */
export const FLAG_STYLE: Record<string, { color: string; hatched?: boolean; label?: string }> = {
  "FORMULARY": { color: F_COL },
  "NON FORMULARY": { color: NF_COL, hatched: true },
  "OUT OF FORMULARY": { color: OOF_COL, hatched: true, label: "Out of formulary (Item Master)" },
  "NOT IN MASTER": { color: X_COL },
};

/** The selection every tile on the overview is computed under, worked out once. */
export type Ctx = InsightBase & { d: Data; w: typeof WORDS };

export function makeCtx(d: Data, meta: Meta, filters: Filters, params: Record<string, string>): Ctx {
  return { ...insightBase(d, meta, filters, params), d, w: WORDS };
}

/** A drawer's Method tab: what this tile's figure is, then how every figure here is built. */
export function Method({ c, children }: { c: Ctx; children: React.ReactNode }) {
  return (
    <InsightMethod base={c} notes={c.d.notes || []} basis={(
      <>
        <li>Source: HCG&apos;s GRN (goods receipt) extracts, in the scope HCG&apos;s out-of-formulary workings count, every month with a GRN file; value = Total Amount without tax (the price after discount). Purchases have no payer, patient type or doctor.</li>
        <li>{c.d.definition?.label ?? "Estimated definition"}: {WORDS.plain} In the build&apos;s words: {c.d.definition?.text}</li>
        <li>{WORDS.extraNote}</li>
        <li>The formulary split uses each month&apos;s own Item Master (its flag, and the formulary tier from its category), so it covers the months that have one.</li>
      </>
    )}>{children}</InsightMethod>
  );
}

/** "Estimated definition", in the estimate badge's style (ledger/KpiCard SourceBadge): the split
 *  rests on the app's reading of who invented each medicine, until HCG confirms it. */
export function DefinitionBadge({ label, title }: { label: string; title?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase whitespace-nowrap" title={title}
      style={{ color: BRASS, letterSpacing: ".08em" }}>
      <span aria-hidden="true" className="inline-block w-[7px] h-[7px] rounded-full" style={{ border: `1px dashed ${BRASS}` }} />
      {label}
    </span>
  );
}
