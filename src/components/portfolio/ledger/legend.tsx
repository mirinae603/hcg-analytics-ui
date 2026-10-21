"use client";
// The legend every ledger chart prints, and its 12px key. Its own module because both the
// charts and the one-screen panel draw it (a panel prints its chart's legend in its header), and
// the charts read the panel: a shared leaf keeps the two from importing each other.
// A legend always prints, and words stay in ink: colour only says which series a mark is.
import React, { useId } from "react";
import { Hatch, SUB } from "./kit";
import { textW } from "./scale";

/** A 12px legend key; `hatched` draws the 45° hatch of a figure outside the ratio. */
export function Swatch({ color, hatched = false }: { color: string; hatched?: boolean }) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}>
      {hatched && <defs><Hatch id={`sw-${uid}`} color={color} opacity={0.85} /></defs>}
      <rect x="0.5" y="0.5" width="11" height="11" rx="2.5" fill={hatched ? `url(#sw-${uid})` : color} stroke={hatched ? color : "none"} strokeWidth="1" />
    </svg>
  );
}

export type LegendItem = {
  key: string;
  label: string;
  color: string;
  hatched?: boolean;
  /** box = a bar or segment, line = a % line, dashed = a target line, tick = a target tick,
   *  dot = a value drawn as a dot (a % on an axis that does not start at zero). */
  shape?: "box" | "line" | "dashed" | "tick" | "dot";
};

/** The key's width: a line (and a tick, centred in the same box) needs room; a dot less. */
const keyW = (it: LegendItem) => (it.shape === "dot" ? 10 : !it.shape || it.shape === "box" ? 12 : 18);

function Key({ it }: { it: LegendItem }) {
  if (!it.shape || it.shape === "box") return <Swatch color={it.color} hatched={it.hatched} />;
  const w = keyW(it);
  return (
    <svg width={w} height="12" viewBox={`0 0 ${w} 12`} aria-hidden="true" style={{ flexShrink: 0 }}>
      {it.shape === "dot" && <circle cx={w / 2} cy="6" r="4" fill={it.color} />}
      {it.shape === "tick" && <line x1={w / 2} y1="0" x2={w / 2} y2="12" stroke={it.color} strokeWidth="2" />}
      {(it.shape === "line" || it.shape === "dashed") && (
        <line x1="1" y1="6" x2="17" y2="6" stroke={it.color} strokeWidth={it.shape === "dashed" ? 1.4 : 1.8}
          strokeDasharray={it.shape === "dashed" ? "4 3" : undefined} />
      )}
      {it.shape === "line" && <circle cx="9" cy="6" r="3" fill="#fff" stroke={it.color} strokeWidth="1.6" />}
    </svg>
  );
}

/** Spans only, so a legend can also sit inside a card's button. `dense` keeps it on one line
 *  with tighter gaps, for a panel header. */
export function Legend({ items, dense = false }: { items: LegendItem[]; dense?: boolean }) {
  return (
    <span className={`flex items-center text-[11px] ${dense ? "flex-nowrap gap-x-2.5" : "flex-wrap gap-x-4 gap-y-1.5"}`} style={{ color: SUB }}>
      {items.map((it) => (
        <span key={it.key} className={`inline-flex items-center whitespace-nowrap ${dense ? "gap-1" : "gap-1.5"}`}>
          <Key it={it} />
          {it.label}
        </span>
      ))}
    </span>
  );
}

/** Roughly how wide a dense legend prints (key, 4px, label, 10px to the next), to decide
 *  whether it fits a panel header. */
export const legendWidth = (items: LegendItem[]) => items.reduce((w, it) => w + keyW(it) + 4 + textW(it.label, 11) + 10, 0);
