"use client";
// The chips the Formulary & Spend panels and drawer headers carry beside a figure: the change
// since the comparison period (DeltaChip, and deltaText for an accessible name), where the
// figure stands against its budget (StatusChip) and where it comes from (SourceBadge). Spans
// only, so each can sit inside a panel's button. All three are the stock-value page's pills: a
// rounded-full wash of their hue with the words in its text shade, no outline.
import React from "react";
import { SUB, HONEY_INK, HONEY_TINT, LEDGER_2, tint } from "./kit";
import {
  DELTA_THRESHOLD, SOURCE_LABEL, STATUS_COLOR, STATUS_INK, STATUS_LABEL, TONE_COLOR, TONE_WORD, deltaTone, sourceKind, sourceNote,
  type DeltaUnit, type GoodWhen, type SourceOf, type Status,
} from "./status";
import { lakhs } from "./format";

export type DeltaProps = {
  /** Current minus comparison, in `unit`. */
  value: number;
  unit: DeltaUnit;
  goodWhen: GoodWhen;
  /** "vs Jul-26". */
  vsLabel: string;
  threshold?: number;
};

// Rupee changes in lakhs, as the cards print their figures.
const magnitude = (v: number, unit: DeltaUnit) =>
  unit === "pts" ? `${v.toFixed(2)} pts` : unit === "pct" ? `${v.toFixed(1)}%` : lakhs(v);

/** The words a delta chip says, for the chip itself and for a card's accessible name. */
export function deltaText({ value, unit, goodWhen, vsLabel, threshold }: DeltaProps): string {
  const tone = deltaTone(value, goodWhen, threshold ?? DELTA_THRESHOLD[unit]);
  if (tone === "flat") return `no change ${vsLabel}`;
  return `${value > 0 ? "up" : "down"} ${magnitude(Math.abs(value), unit)} ${vsLabel}${tone === "neutral" ? "" : `, ${TONE_WORD[tone]}`}`;
}

/** A delta's words on the dark hero card: the tone hues lightened to read on charcoal. */
const TONE_ON_DARK = { good: "#9FD6C1", bad: "#EDC7BA", flat: "rgba(255,255,255,.72)", neutral: "rgba(255,255,255,.72)" } as const;

/** A change since the comparison period. Arrow and words carry the direction; colour adds
 *  whether that direction is good for this measure. `dark` draws it for the dark hero card. */
export function DeltaChip(props: DeltaProps & { dark?: boolean }) {
  const { value, unit, goodWhen, vsLabel, threshold, dark = false } = props;
  const tone = deltaTone(value, goodWhen, threshold ?? DELTA_THRESHOLD[unit]);
  const color = dark ? TONE_ON_DARK[tone] : TONE_COLOR[tone];
  const flat = tone === "flat";
  // The same 22px as the outlined chip it replaced: 4px above and below 14px of words.
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-[4px] text-[11px] font-semibold tabular-nums whitespace-nowrap"
      style={{ color, background: dark ? "rgba(255,255,255,.10)" : tone === "flat" || tone === "neutral" ? LEDGER_2 : tint(color, 0.09) }}>
      <span aria-hidden="true">{flat ? "=" : value > 0 ? "▲" : "▼"}</span>
      <span aria-hidden="true">{flat ? `no change ${vsLabel}` : `${magnitude(Math.abs(value), unit)} ${vsLabel}`}</span>
      <span className="sr-only">{deltaText(props)}</span>
    </span>
  );
}

export function StatusChip({ status, label }: { status: Status; label?: string }) {
  if (status === "none") return null;
  const c = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[4px] text-[11px] font-semibold whitespace-nowrap"
      style={{ color: STATUS_INK[status], background: tint(c, 0.16) }}>
      <span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

/** Where a figure comes from. Computed is the default; figures from HCG's MIS and the app's
 *  estimates are marked so they are never mistaken for recomputed ones. A SourceSpec gives the
 *  tooltip its section's own words (purchases, an estimated definition). */
export function SourceBadge({ source, asOf }: { source: SourceOf; asOf?: string | null }) {
  const kind = sourceKind(source);
  const c = kind === "estimate" ? HONEY_INK : SUB;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[11px] font-semibold whitespace-nowrap" title={sourceNote(source)}
      style={{ color: c, background: kind === "estimate" ? HONEY_TINT : LEDGER_2 }}>
      <span aria-hidden="true" className="inline-block w-[7px] h-[7px] rounded-full"
        style={{ border: `1px ${kind === "computed" ? "solid" : "dashed"} ${c}`, background: kind === "computed" ? c : "transparent" }} />
      {SOURCE_LABEL[kind]}
      {asOf && <span className="font-medium">· data as of {asOf}</span>}
    </span>
  );
}
