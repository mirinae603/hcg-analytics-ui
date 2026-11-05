"use client";
// Donut — a whole split into a few parts (inpatient and outpatient sales), drawn as a ring with
// the whole printed in its centre and every part named, with its share and figures, in the legend
// beside it: the ring shows the split, the words carry the numbers.
//
// The shares are the API's (the caller passes them); the ring only lays them out, closing any
// rounding gap between them, so no % is worked out here. A part with no share is listed and not
// drawn. Each slice is a button (pointer and keyboard alike) that opens the part's detail; on
// hover or focus it stands out, the others dim, and the centre names it.
//
// Panel-aware like the rest of the kit: in a ChartPanel it fills the body, the legend beside the
// ring when the body is wide and under it when it is tall; in a drawer it takes its own size.
import React, { useId, useState } from "react";
import { INK, SUB, CARD, RowStyles, hatchFill, tint, useArmed } from "./kit";
import { Swatch } from "./legend";
import { useWidth } from "./minis";
import { usePanel, usePanelReadout } from "./panel";
import { isNum, pct } from "./format";
import { clamp } from "./scale";

export type DonutSlice = {
  key: string;
  label: string;
  /** The part's share of the whole, % as the API sends it; null when it has none. */
  share: number | null;
  color: string;
  hatched?: boolean;
  /** The part's figure on the face: "₹ 8,647 L". */
  valueLabel: string;
  /** A second figure beside it: "margin 41.30%". */
  note?: string;
};

const LEGEND_ROW_H = 38;
const MIN_D = 72, MAX_D = 200;
/** A slice this many degrees or more prints its share on the ring. */
const LABEL_DEG = 28;

/** About how wide a short label prints, in em: 0.6 a glyph, half that for a space or a comma. */
const ems = (s: string) => Array.from(s).reduce((w, ch) => w + (/[\s,.:·]/.test(ch) ? 0.3 : 0.6), 0);

/** The ring between radii r0 and r1 from angle a0 to a1 (radians, clockwise from 12 o'clock). */
function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const full = a1 - a0 >= Math.PI * 2 - 1e-6;
  if (full) {
    // A whole ring: two half arcs each way, the hole cut out by the even-odd rule.
    return [
      `M${cx},${cy - r1}A${r1},${r1} 0 1 1 ${cx},${cy + r1}A${r1},${r1} 0 1 1 ${cx},${cy - r1}Z`,
      `M${cx},${cy - r0}A${r0},${r0} 0 1 0 ${cx},${cy + r0}A${r0},${r0} 0 1 0 ${cx},${cy - r0}Z`,
    ].join("");
  }
  const p = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)},${(cy - r * Math.cos(a)).toFixed(2)}`;
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1},${r1} 0 ${big} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0},${r0} 0 ${big} 0 ${p(r0, a0)}Z`;
}

export function Donut({ slices, centre, ariaLabel, onSlice, size = 168 }: {
  slices: DonutSlice[];
  /** The whole in the ring's centre: { value: "₹ 9,431 L", label: "Sales (MRP)" }. */
  centre: { value: string; label: string };
  ariaLabel: string;
  /** Opens a part's detail; each slice and legend row becomes a button. */
  onSlice?: (key: string) => void;
  /** Outside a panel: the ring's diameter in px. */
  size?: number;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(320);
  const [hi, setHi] = useState<string | null>(null);
  const uid = useId().replace(/:/g, "");
  const W = panel ? panel.size.w : measured;
  const H = panel ? panel.size.h : Infinity;
  const legendH = slices.length * LEGEND_ROW_H;
  // Beside when the body is wide enough for a ring and a legend of 150px; else under it.
  const beside = panel ? W >= Math.min(H, MAX_D) + 160 : W >= size + 180;
  // The ring's svg adds 4px each side (a lit slice grows 3px), and 8px part it from the legend.
  const RING_PAD = 8, GAP = 8;
  const D = panel
    ? clamp(Math.floor(beside ? Math.min(H, W - 160) - RING_PAD : Math.min(W, H - legendH - GAP) - RING_PAD), MIN_D, MAX_D)
    : size;
  const r1 = D / 2, r0 = r1 * 0.62, c = D / 2;
  // The centre figure's size: a ninth of the ring, smaller for a long figure so it stays inside
  // the hole (across 85% of it), never under 11px. A hole too small for the words at 11px (the
  // smallest ring) is left empty: the ring's name and the KPIs carry them.
  const centreFs = (s: string) => clamp(Math.min(D * 0.11, (r0 * 2 * 0.85) / Math.max(0.6, ems(s))), 11, 18);
  const inHole = (s: string, fs: number) => ems(s) * fs <= r0 * 2 * 0.9;

  const drawn = slices.filter((s) => isNum(s.share) && (s.share as number) > 0);
  const undrawn = slices.filter((s) => !drawn.includes(s));
  const sum = drawn.reduce((t, s) => t + (s.share as number), 0);
  let at = 0;
  const laid = drawn.map((s) => {
    const a0 = at;
    at += ((s.share as number) / sum) * Math.PI * 2;
    return { s, a0, a1: at };
  });
  const active = slices.find((s) => s.key === hi) ?? null;
  usePanelReadout(active ? active.key : null, () => (active
    ? <span><b>{active.label}</b> {pct(active.share, 1)} · {active.valueLabel}{active.note ? ` · ${active.note}` : ""}</span> : null));

  const said = (s: DonutSlice) => [s.label, pct(s.share, 1), s.valueLabel, s.note].filter(Boolean).join(", ");
  const press = (key: string) => (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onSlice?.(key);
  };
  const fillOf = (s: DonutSlice) => (s.hatched ? hatchFill(s.color) : s.color);

  if (!slices.length) return <div ref={ref}><p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p></div>;

  const ring = (
    <svg viewBox={`-4 -4 ${D + 8} ${D + 8}`} width={D + 8} height={D + 8} role="group" aria-label={[`${ariaLabel}. ${centre.label}: ${centre.value}`, ...undrawn.map(said)].join(". ")}
      style={{ display: "block", flexShrink: 0 }} onMouseLeave={() => setHi(null)}>
      {!laid.length && <circle cx={c} cy={c} r={(r0 + r1) / 2} fill="none" stroke={tint(INK, 0.08)} strokeWidth={r1 - r0} />}
      {laid.map(({ s, a0, a1 }, i) => {
        const lit = hi === s.key;
        const dim = hi != null && !lit;
        const grow = lit ? 3 : 0;
        const mid = (a0 + a1) / 2, rm = (r0 + r1) / 2;
        const deg = ((a1 - a0) * 180) / Math.PI;
        const interactive = onSlice ? {
          role: "button", tabIndex: 0, "aria-label": `${said(s)}. Opens details`,
          onClick: () => onSlice(s.key), onKeyDown: press(s.key),
        } : { role: "img", "aria-label": said(s) };
        return (
          <g key={s.key} {...interactive} className="hcg-slice" onMouseEnter={() => setHi(s.key)} onFocus={() => setHi(s.key)} onBlur={() => setHi(null)}
            style={{ cursor: onSlice ? "pointer" : "default", opacity: on ? (dim ? 0.45 : 1) : 0, transition: `opacity 300ms ease ${on && !hi ? 80 + i * 90 : 0}ms` }}>
            <title>{said(s)}</title>
            {s.hatched && (
              <defs>
                <pattern id={`dn-${uid}-${s.key}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="#fff" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke={s.color} strokeWidth="2" opacity={0.62} />
                </pattern>
              </defs>
            )}
            <path d={arc(c, c, r0, r1 + grow, a0, a1)} fill={s.hatched ? `url(#dn-${uid}-${s.key})` : s.color} fillRule="evenodd"
              stroke={CARD} strokeWidth={laid.length > 1 ? 2 : 0} />
            {deg >= LABEL_DEG && D >= 110 && (
              <text x={c + rm * Math.sin(mid)} y={c - rm * Math.cos(mid) + 3.5} textAnchor="middle" aria-hidden="true"
                style={{ fontSize: 11, fontWeight: 700, fill: s.hatched ? INK : "#fff", paintOrder: "stroke", stroke: s.hatched ? "#fff" : tint(INK, 0.25), strokeWidth: 2 }}>
                {Math.round(s.share as number)}%
              </text>
            )}
          </g>
        );
      })}
      <g aria-hidden="true">
        {inHole(active ? pct(active.share, 1) : centre.value, 11) && (
          <text x={c} y={c - 2} textAnchor="middle" style={{ fontSize: centreFs(active ? pct(active.share, 1) : centre.value), fontWeight: 700, fill: INK }}>
            {active ? pct(active.share, 1) : centre.value}
          </text>
        )}
        {inHole(active ? active.label : centre.label, 11) && (
          <text x={c} y={c + 14} textAnchor="middle" style={{ fontSize: 11, fill: SUB }}>
            {active ? active.label : centre.label}
          </text>
        )}
      </g>
    </svg>
  );

  const legend = (
    <ul aria-hidden="true" className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
      {slices.map((s) => {
        const lit = hi === s.key;
        const row = (
          <>
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="flex-shrink-0" style={{ display: "inline-flex" }}>
                {s.hatched ? <span className="inline-block w-3 h-3 rounded-[2.5px]" style={{ background: fillOf(s) }} /> : <Swatch color={s.color} />}
              </span>
              <span className="truncate text-[12px] font-semibold" style={{ color: INK }} title={s.label}>{s.label}</span>
              <span className="ml-auto pl-2 text-[12px] font-bold tabular-nums" style={{ color: INK }}>{pct(s.share, 1)}</span>
            </span>
            <span className="block truncate pl-[18px] text-[11px] tabular-nums" style={{ color: SUB }} title={[s.valueLabel, s.note].filter(Boolean).join(" · ")}>
              {[s.valueLabel, s.note].filter(Boolean).join(" · ")}
            </span>
          </>
        );
        return (
          <li key={s.key} onMouseEnter={() => setHi(s.key)} onMouseLeave={() => setHi(null)}
            className="rounded-[8px] px-2 py-1" style={{ background: lit ? tint(INK, 0.045) : undefined, minHeight: LEGEND_ROW_H - 2 }}>
            {row}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={ref} className={`flex ${beside ? "flex-row items-center gap-3" : "flex-col items-center gap-2"} h-full`}>
      {ring}
      <div className={beside ? "min-w-0 flex-1" : "w-full"}>{legend}</div>
      <RowStyles />
      <style jsx global>{`
        .hcg-slice:focus-visible{outline:none}
        .hcg-slice:focus-visible path{stroke:${INK};stroke-width:2px}
      `}</style>
    </div>
  );
}
