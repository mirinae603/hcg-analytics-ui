"use client";
// Spend Analysis — what every tile on the Out of formulary overview shares: the data shape, the
// section's words, the selection the tiles are computed under, how each "suggested by" bucket is
// named and drawn, and the Method tab every drawer ends with.
//
// Out of formulary is HCG's own purchase (GRN) method: every receipt of a brand the month's
// Item Master flags OUT OF FORMULARY, against the brand HCG suggests for it. Purchases have no
// payer, patient type or doctor; the vendor is who the brand came from. The figures are HCG's
// (its own worksheet's suggestions) unless part rests on the app's own match: then the tile is
// marked Estimated. The colours are the Spend pages' own (../shared): the margin on the brands
// bought (USED_COL), the margin the suggested brands would make (PROPOSED_COL), the missed part
// beside them (LOSS_COL), every % (RATE_COL); one-measure charts take the colour of what their
// bars are: months and material types the section's (OOF_COL), hospitals HOSPITAL_COL, brands
// BRAND_COL, vendors the kit's SERIES.
import React from "react";
import { BRASS, BRONZE, LEAF, SUB } from "@/components/portfolio/ledger/kit";
import { Swatch } from "@/components/portfolio/ledger/legend";
import { DrawerSection, type DrawerFilter } from "@/components/portfolio/ledger/DetailDrawer";
import type { SourceOf } from "@/components/portfolio/ledger/status";
import { dayLabel, isNum, pct } from "@/components/portfolio/ledger/format";
import { X_COL, NF_COL } from "../../formulary/parts";
import { monthBefore, monthsLabel } from "../../formulary/api";
import type { Filters, Meta, OofOverview, OofSwitch, SuggestedBy, View } from "../api";
import { OOF_COL, PROPOSED_COL, oofSourceOf } from "../shared";

export { USED_COL, PROPOSED_COL, LOSS_COL, RATE_COL, HOSPITAL_COL, BRAND_COL, OOF_COL } from "../shared";

export type Data = OofOverview;
export type Month = Data["trend"][number];
export type Hospital = Data["by_hospital"][number];

/** The section's words, plain (HCG's own are Actual / Proposed / Margin loss / Loss %). */
export const WORDS = {
  section: "Out of formulary",
  title: "Out-of-formulary margin missed",
  sug: "suggested brands",
  none: "No out-of-formulary purchase in this selection",
  rankNote: "Every hospital for the same months and material type: this list ignores the hospital selector. Earned = margin on the brands bought; possible = the margin the suggested brands would make on the same units; % missed = margin missed ÷ margin possible. A hospital whose brands earned more than their suggestions has a negative margin missed, drawn left of zero and ranked last.",
  monthNote: "Margin earned on the out-of-formulary brands bought, the margin the suggested brands would have made on the same units (margin possible), the margin missed and % missed (= margin missed ÷ margin possible), per month.",
};

/** How each "suggested by" bucket is named on a chart face and drawn. HCG's own suggestions take
 *  the proposed colour and its neighbours of the validated series (worksheet of the month BLUE,
 *  another month's LEAF, its list BRONZE); the app's own match is the section's colour, hatched
 *  (Estimated); lines left out of the margins are grey, as "outside the ratio" is on the
 *  Formulary page (parked by HCG hatched). Adjacent pairs checked with the data-viz validator. */
export const SUGGESTED: Record<SuggestedBy, { short: string; color: string; hatched?: boolean }> = {
  hcg_sheet: { short: "HCG sheet", color: PROPOSED_COL },
  hcg_sheet_pair: { short: "HCG sheet, other month", color: LEAF },
  hcg_list: { short: "HCG list", color: BRONZE },
  formulary_rule: { short: "Estimated", color: OOF_COL, hatched: true },
  parked: { short: "Parked by HCG", color: NF_COL, hatched: true },
  none: { short: "No alternative", color: X_COL },
};

/** "HCG sheet", or "Estimated" for the app's own match. */
export const sourceText = (r: Pick<OofSwitch, "suggested_by">) => SUGGESTED[r.suggested_by]?.short ?? r.suggested_by;

/** Where a suggested brand came from, as a tag in a drawer's table: the bucket's key and its
 *  short name; an Estimated one (the app's own match) in the estimate colour, with the app's
 *  rule as its tooltip. */
export function SourceTag({ by, rule }: { by: SuggestedBy; rule?: string | null }) {
  const s = SUGGESTED[by];
  const estimated = by === "formulary_rule";
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px]" title={estimated && rule ? `Estimated: ${rule}` : s?.short}
      style={{ color: estimated ? BRASS : SUB, fontWeight: estimated ? 600 : undefined }}>
      <Swatch color={s?.color ?? SUB} hatched={s?.hatched} />{s?.short ?? by}
    </span>
  );
}

/** The selection every tile on the overview is computed under, worked out once. */
export type Ctx = {
  d: Data;
  meta: Meta;
  w: typeof WORDS;
  /** "HCG KR, Bangalore" or "All hospitals". */
  where: string;
  /** "Aug-26", or "Jun-26 – Aug-26" for a run. */
  when: string;
  /** The line after every tile's title: "HCG KR, Bangalore · Aug-26". */
  context: string;
  /** All hospitals together, rather than one. */
  network: boolean;
  /** HCG's purchase method throughout; an estimate where part rests on the app's own match. */
  source: SourceOf;
  asOf: string | null;
  /** The filters, read-only, in every drawer's header. */
  chips: DrawerFilter[];
  /** The overview's own query (the hospital and the section's filters): the tables' too. */
  params: Record<string, string>;
  /** Moves to another tab of the section (Brands, Vendors). */
  onOpen: (v: View) => void;
};

export function makeCtx(d: Data, meta: Meta, filters: Filters, params: Record<string, string>, onOpen: (v: View) => void): Ctx {
  const network = !d.scope?.plant || d.scope.plant === "ALL";
  const where = network ? "All hospitals" : (d.scope.his_name || d.scope.plant_name || d.scope.plant || "");
  const when = monthsLabel(meta, d.scope?.months || []);
  const segment = filters.segment === "ALL" ? "All material types"
    : meta.categories?.find((c) => c.key === filters.segment)?.label ?? filters.segment;
  return {
    d, meta, w: WORDS, where, when, network, params,
    context: `${where} · ${when}`,
    source: oofSourceOf(d.headline.coverage),
    asOf: dayLabel(d.data_as_of || meta.oof_built_at),
    chips: [
      { label: "Hospital", value: where },
      { label: "Month", value: when },
      { label: "Material", value: segment },
      ...(filters.brand ? [{ label: "Brand", value: filters.brand.name }] : []),
      { label: "Patients · payer", value: "not applied: purchases" },
    ],
    onOpen,
  };
}

/** The month before a single selected month, when it had any purchase: what a tile's figure is
 *  compared with. Null for a run of months. */
export function prevMonth(d: Data): Month | null {
  const prev = monthBefore(d.trend || [], d.scope?.months || []);
  return prev && prev.lines > 0 ? prev : null;
}

/** "same as ours", or how far ours is from HCG's own sheet. */
export const hcgVerdict = (matches: boolean, diff: number, fmt: (v: number) => string) =>
  matches ? "same as ours" : `ours is ${fmt(Math.abs(diff))} ${diff > 0 ? "more" : "less"}`;

/** A drawer's Method tab: what this tile's figure is, then how every figure here is built. */
export function Method({ c, children }: { c: Ctx; children: React.ReactNode }) {
  return (
    <>
      <DrawerSection title="This figure">
        <div className="space-y-3 text-[12.5px] leading-relaxed" style={{ color: SUB }}>{children}</div>
      </DrawerSection>
      <DrawerSection title="How these figures are built">
        <ul className="space-y-1.5 text-[12.5px] leading-relaxed list-disc pl-5" style={{ color: SUB }}>
          <li>Source: HCG&apos;s GRN (goods receipt) extracts, each month&apos;s Item Master (its OUT OF FORMULARY flag) and HCG&apos;s monthly out-of-formulary workbooks, in HCG&apos;s purchase scope; purchases have no payer, patient type or doctor.</li>
          <li>Every figure is summed for the selection and the % is taken once, never an average of hospital or monthly percentages.</li>
          <li>Charts print rupees in lakhs; the drawers print exact rupees with paise.</li>
          {(c.d.notes || []).map((t) => <li key={t}>{t}</li>)}
          {c.asOf && <li>Purchase data as of {c.asOf}.</li>}
        </ul>
      </DrawerSection>
    </>
  );
}

/** A row's share as the API gives it: its part of what switching would gain in the selection
 *  (the margin missed where the suggested brand earns more), never of the net figure, which a
 *  brand that earns more than its suggestion can bring near or below zero. */
export const gainShare = (v: number | null | undefined) => (isNum(v) ? `${pct(v, 1)} of what switching gains` : undefined);
export const GAIN_SHARE_NOTE = "Share = the row's part of what switching would gain in this selection (the margin missed where the suggested brand earns more): never negative, and every row's share adds up to 100%.";

/** A % missed as a face's aside: "72.87% of possible". */
export const ofPossible = (v: number | null | undefined) => (isNum(v) ? `${pct(v)} of possible` : undefined);
