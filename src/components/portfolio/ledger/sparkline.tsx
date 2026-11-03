"use client";
// Sparkline — a figure's months as one small line under the figure on a KPI tile: where it has
// been, at a glance, with no axis to read. The selected month carries a dot (the latest when
// none is selected), a target the figure is judged against is a dashed line, and the pointer
// names the month under it (in the panel header inside a ChartPanel, under the line elsewhere).
// The first and last months are named under the line when there is room, because KPIs keep
// different months (sales three, purchases nine) and a line alone cannot say which.
//
// The vertical range is fitted to the values (and the target), as a sparkline's is: it shows
// the shape of the change, never a size, so it never stands in for a bar. Exact figures live in
// the tile's drawer. A missing month breaks the line rather than dropping to zero.
//
// Panel-aware like the rest of the kit: inside a ChartPanel (or a PanelPart) it fills the room
// it is given; in a drawer it takes its own height.
import React, { useId, useState } from "react";
import { INK, SUB, CARD, tint, useArmed } from "./kit";
import { useWidth } from "./minis";
import { ON_DARK_SUB, usePanel, usePanelDark, usePanelReadout } from "./panel";
import { isNum } from "./format";
import { textW } from "./scale";

export type SparkPoint = {
  key: string;
  /** "Aug-26". */
  label: string;
  /** Null where the month has no figure: the line breaks there. */
  value: number | null;
  /** The month the tile is about; its point carries the dot. */
  selected?: boolean;
};

const AXIS_FS = 9.5;
/** The month names under the line need this much height to be worth their room. */
const AXIS_MIN_H = 40;
const AXIS_H = 12;
const DOT_R = 3;

export function Sparkline({ points, format, color = INK, target, ariaLabel, height = 48 }: {
  points: SparkPoint[];
  /** Prints a month's value in the readout and the accessible name. */
  format: (v: number) => string;
  color?: string;
  /** The figure's target (a budget), a dashed line: { value: 100, label: "Budget 100%" }. */
  target?: { value: number; label: string } | null;
  /** What the line shows, for screen readers: "Sales by month". */
  ariaLabel: string;
  /** Outside a panel; a panel's line takes the room it is given. */
  height?: number;
}) {
  const panel = usePanel();
  // On the dark hero card the target, the pointer's rule and the month names draw light.
  const dark = usePanelDark();
  const ink = dark ? "#fff" : INK;
  const on = useArmed();
  const uid = useId().replace(/:/g, "");
  const [ref, measured] = useWidth<HTMLDivElement>(160);
  const [hi, setHi] = useState<number | null>(null);
  const W = Math.max(40, panel ? panel.size.w : measured);
  const H = Math.max(18, panel ? panel.size.h : height);
  const n = points.length;
  const values = points.map((p) => p.value).filter(isNum);
  const named = H >= AXIS_MIN_H && n > 1;
  const sel = (() => { for (let i = n - 1; i >= 0; i--) if (points[i].selected && isNum(points[i].value)) return i; return -1; })();
  const lastIdx = (() => { for (let i = n - 1; i >= 0; i--) if (isNum(points[i].value)) return i; return -1; })();
  const dotIdx = sel >= 0 ? sel : lastIdx;

  // Fitted range, padded so the line never touches the edges; a flat line sits in the middle.
  const all = [...values, ...(target && isNum(target.value) ? [target.value] : [])];
  let lo = all.length ? Math.min(...all) : 0, up = all.length ? Math.max(...all) : 1;
  if (up - lo < 1e-9) { const pad = Math.abs(up) * 0.05 || 1; lo -= pad; up += pad; }
  const PL = DOT_R + 1, PR = DOT_R + 1, PT = DOT_R + 2, PB = (named ? AXIS_H : 0) + DOT_R + 2;
  const plotH = Math.max(4, H - PT - PB);
  const X = (i: number) => (n <= 1 ? W / 2 : PL + (i / (n - 1)) * (W - PL - PR));
  const Y = (v: number) => PT + ((up - v) / (up - lo)) * plotH;

  // One path per run of months that have figures: a missing month breaks the line.
  const runs: { i: number; v: number }[][] = [];
  points.forEach((p, i) => {
    if (!isNum(p.value)) { runs.push([]); return; }
    if (!runs.length) runs.push([]);
    runs[runs.length - 1].push({ i, v: p.value });
  });
  const lines = runs.filter((r) => r.length > 0);
  const d = (r: { i: number; v: number }[]) => r.map((p, k) => `${k ? "L" : "M"}${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join("");
  const area = (r: { i: number; v: number }[]) => (r.length > 1
    ? `${d(r)}L${X(r[r.length - 1].i).toFixed(1)},${(PT + plotH).toFixed(1)}L${X(r[0].i).toFixed(1)},${(PT + plotH).toFixed(1)}Z` : "");

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (n < 1) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = n <= 1 ? 0 : Math.round(((x - PL) / (W - PL - PR)) * (n - 1));
    setHi(Math.max(0, Math.min(n - 1, i)));
  };
  const a = hi != null ? points[hi] : null;
  const said = (p: SparkPoint) => `${p.label} ${isNum(p.value) ? format(p.value) : "no figure"}`;
  usePanelReadout(a ? a.key : null, () => (a ? <span><b>{a.label}</b> {isNum(a.value) ? format(a.value) : "—"}</span> : null));

  const name = `${ariaLabel}: ${points.map(said).join(", ")}${target ? `. ${target.label}` : ""}`;
  const first = points[0], last = points[n - 1];

  // The measured wrapper always renders: its width is read once, on mount.
  if (!values.length) return <div ref={ref} />;

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={name} style={{ display: "block", overflow: "visible" }}
        onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
        <defs>
          <linearGradient id={`sp-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {target && isNum(target.value) && (
          <line x1={PL} x2={W - PR} y1={Y(target.value)} y2={Y(target.value)} stroke={ink} strokeWidth={1} strokeDasharray="3 3" opacity={0.55}>
            <title>{target.label}</title>
          </line>
        )}
        <g style={{ opacity: on ? 1 : 0, transition: "opacity 420ms ease 120ms" }}>
          {lines.map((r) => r.length > 1 && <path key={`a-${r[0].i}`} d={area(r)} fill={`url(#sp-${uid})`} />)}
          {lines.map((r) => (r.length > 1
            ? <path key={`l-${r[0].i}`} d={d(r)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
            : <circle key={`l-${r[0].i}`} cx={X(r[0].i)} cy={Y(r[0].v)} r={1.6} fill={color} />))}
        </g>
        {a && isNum(a.value) && (
          <line x1={X(hi as number)} x2={X(hi as number)} y1={PT - 2} y2={PT + plotH} stroke={tint(ink, 0.35)} strokeWidth={1} />
        )}
        {dotIdx >= 0 && isNum(points[dotIdx].value) && (
          <circle cx={X(dotIdx)} cy={Y(points[dotIdx].value as number)} r={DOT_R} fill={color} stroke={CARD} strokeWidth={1.5} />
        )}
        {a && isNum(a.value) && hi !== dotIdx && (
          <circle cx={X(hi as number)} cy={Y(a.value)} r={DOT_R} fill={CARD} stroke={color} strokeWidth={1.5} />
        )}
        {named && first && last && (
          <g aria-hidden="true" style={{ fontSize: AXIS_FS, fill: dark ? ON_DARK_SUB : SUB }}>
            <text x={0} y={H - 1} textAnchor="start">{first.label}</text>
            {W > textW(first.label, AXIS_FS) + textW(last.label, AXIS_FS) + 8 && <text x={W} y={H - 1} textAnchor="end">{last.label}</text>}
          </g>
        )}
      </svg>
      {!panel && (
        <div aria-hidden="true" className="h-4 text-[11px] tabular-nums truncate" style={{ color: a ? INK : SUB }}>
          {a ? said(a) : `${n} month${n === 1 ? "" : "s"}${target ? ` · dashed: ${target.label}` : ""}`}
        </div>
      )}
    </div>
  );
}
