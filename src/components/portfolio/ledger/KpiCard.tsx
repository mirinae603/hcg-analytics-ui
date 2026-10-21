"use client";
// The chips the Formulary & Spend panels and drawer headers carry beside a figure: the change
// since the comparison period (DeltaChip, and deltaText for an accessible name), where the
// figure stands against its budget (StatusChip) and where it comes from (SourceBadge). Spans
// only, so each can sit inside a panel's button.
import React from "react";
import { SUB, BRASS } from "./kit";
import {
  DELTA_THRESHOLD, SOURCE_LABEL, SOURCE_NOTE, STATUS_COLOR, STATUS_LABEL, TONE_COLOR, TONE_WORD, deltaTone,
  type DeltaUnit, type GoodWhen, type Source, type Status,
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

/** A change since the comparison period. Arrow and words carry the direction; colour adds
 *  whether that direction is good for this measure. */
export function DeltaChip(props: DeltaProps) {
  const { value, unit, goodWhen, vsLabel, threshold } = props;
  const tone = deltaTone(value, goodWhen, threshold ?? DELTA_THRESHOLD[unit]);
  const color = TONE_COLOR[tone];
  const flat = tone === "flat";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-semibold tabular-nums whitespace-nowrap"
      style={{ color, border: `1px solid ${color}59` }}>
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
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap"
      style={{ color: c, background: `${c}14`, border: `1px solid ${c}40` }}>
      <span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

/** Where a figure comes from. Computed is the default; figures from HCG's MIS and the app's
 *  estimates are marked so they are never mistaken for recomputed ones. */
export function SourceBadge({ source, asOf }: { source: Source; asOf?: string | null }) {
  const c = source === "estimate" ? BRASS : SUB;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase whitespace-nowrap" title={SOURCE_NOTE[source]}
      style={{ color: c, letterSpacing: ".08em" }}>
      <span aria-hidden="true" className="inline-block w-[7px] h-[7px] rounded-full"
        style={{ border: `1px ${source === "computed" ? "solid" : "dashed"} ${c}`, background: source === "computed" ? c : "transparent" }} />
      {SOURCE_LABEL[source]}
      {asOf && <span className="normal-case font-medium" style={{ letterSpacing: 0 }}>· data as of {asOf}</span>}
    </span>
  );
}
