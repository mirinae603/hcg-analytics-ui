"use client";
// A scatter of things on two measures, drawn the ledger way (hand SVG, the kit's tokens, no
// chart library):
//   Scatter — each thing a dot at (x, y), its AREA proportional to `size` (spend, units), its
//             colour its series. Either axis can be logarithmic, for figures that spread over
//             orders of magnitude (a unit price from ₹1 to ₹3 L, a price ratio from 1× to 60×).
//             A `band` y axis gives each group (a supplier) a row of its own, its dots spread up
//             and down the row where they would overlap: a strip plot. Reference lines mark a
//             value on either axis (the cheapest price), labelled where they meet the plot.
// Reading it: the pointer names the NEAREST dot (within a finger's reach, not only the one under
// it) in the panel's header readout, or, in a drawer, the readout line under the chart. The dots
// are one keyboard stop: Tab reaches the chart, the arrow keys move from dot to dot in x order
// (Home / End: the ends), Enter or Space presses a dot that is a button. The chart's summary
// (how many dots, each axis's range, what a dot's area is) is its description, and the drawer
// beside it carries the same figures as a table: a value is never only in a readout.
// Panel-aware like the other ledger charts: in a one-screen panel it fills the body and hands
// its legend and readout to the header. A panel that holds a Scatter is `interactive`, since its
// dots take the keyboard; the panel's ↗ opens the drawer.
import React, { useId, useRef, useState } from "react";
import { Readout, useArmed, tint, CARD, INK, SUB, LINE } from "./kit";
import { Legend, type LegendItem } from "./legend";
import { useWidth } from "./minis";
import { MORE_H, MoreRows, fitRows, usePanel, usePanelLegend, usePanelReadout } from "./panel";
import { isNum } from "./format";
import { clamp, niceCeil, textW } from "./scale";

const TICK_FS = 9.5, TAG_FS = 10, TITLE_FS = 10, ROW_FS = 11.5;
/** The pointer names the nearest dot within this many px of its edge (a ~24px target, whatever
 *  the dot's own size). */
const REACH = 14;
/** A dot's least radius (an 8px marker) and its largest. */
const R_MIN = 4, R_MAX = 18;
/** A band row's least height (below it rows go to "+N more"), and its height in a drawer. */
const ROW_MIN = 18, ROW_H = 34;
/** Room for the titles: the y title over the plot; the x ticks and title under it. */
const TITLE_H = 14, X_AXIS_H = 28;
/** The swatch and gap before a band row's name. */
const SWATCH = 10, SWATCH_GAP = 5;
/** How much wider than textW() a tag may print (bold for the selected dot): it must not leave
 *  the plot. */
const TAG_SLACK = 1.1, TAG_SLACK_BOLD = 1.2;

export type ScatterSeries = { key: string; label: string; color: string };

export type ScatterPoint = {
  key: string;
  x: number;
  /** The value on a numeric y axis (unused on a band axis). */
  y?: number;
  /** The row on a band y axis: its key. */
  row?: string;
  /** What the dot's area stands for (≥ 0): spend, units. Equal dots without it. */
  size?: number;
  /** The series key: the dot's colour. */
  series: string;
  /** What the dot is: "CETUXIMAB 100MG INJ". */
  label: string;
  /** Its figures in words, for the readout and its accessible name: "₹5,100 a unit · 11 units". */
  detail: string;
  /** Printed beside the dot when there is room (the selected one, the few largest). */
  tag?: boolean;
  selected?: boolean;
  /** The dot is a button: choose that thing. */
  onClick?: () => void;
};

export type ScatterRef = { value: number; label: string };

export type NumAxis = {
  kind: "linear" | "log";
  /** What the axis measures, printed at its end: "Cheapest unit price". */
  label: string;
  /** A tick's label, compact: "₹1K", "2×". */
  tick: (v: number) => string;
  /** Where the axis starts at the least: a ratio's 1× (log), a price's ₹ 0 (linear). */
  floor?: number;
  /** Values marked across the plot with a dashed line. */
  refs?: ScatterRef[];
};

/** A band row: whose dots it holds, and its colour (a swatch before its name). `selected` keeps
 *  it on the chart when the rows that do not fit go to "+N more". */
export type BandRow = { key: string; label: string; color?: string; selected?: boolean };
export type BandAxis = { kind: "band"; label: string; rows: BandRow[] };

// ─────────────────────────────────────────────────────────────────────────────
// Scales
// ─────────────────────────────────────────────────────────────────────────────
const LADDER = [1, 2, 5];

const decade = (v: number) => Math.pow(10, Math.floor(Math.log10(v) + 1e-9));
/** The 1-2-5 step at or below `v` (> 0), and the one at or above it. */
const stepDown = (v: number) => ([...LADDER].reverse().find((s) => s <= v / decade(v) + 1e-9) ?? 1) * decade(v);
const stepUp = (v: number) => (LADDER.find((s) => s >= v / decade(v) - 1e-9) ?? 10) * decade(v);

type Scale = { lo: number; hi: number; at: (v: number) => number; ticks: number[] };

/** The ticks, in priority order, whose labels keep a 6px gap from every tick already kept. */
function keepTicks(cands: number[], pos: (t: number) => number, size: (t: number) => number): number[] {
  const kept: number[] = [];
  for (const t of cands) {
    if (kept.includes(t)) continue;
    if (kept.every((k) => Math.abs(pos(k) - pos(t)) >= (size(k) + size(t)) / 2 + 6)) kept.push(t);
  }
  return kept.sort((a, b) => a - b);
}

/** A numeric axis over `values` drawn on `span` px: its domain, a value's place on it (0–1),
 *  and the ticks whose labels (`size` px along the axis) have room. A log axis runs between
 *  1-2-5 steps; a linear one from zero (or its floor) to a round ceiling. */
function numScale(axis: NumAxis, values: number[], span: number, size: (t: number) => number): Scale {
  const vals = [...values, ...(axis.refs ?? []).map((r) => r.value)].filter((v) => isNum(v) && (axis.kind === "linear" || v > 0));
  if (axis.kind === "log") {
    let lo = vals.length ? stepDown(Math.min(...vals)) : 1;
    let hi = vals.length ? stepUp(Math.max(...vals)) : 10;
    if (isNum(axis.floor) && axis.floor > 0) lo = Math.max(lo, axis.floor);
    if (!(hi > lo)) hi = stepUp(lo * 1.5);
    const L0 = Math.log10(lo), L1 = Math.log10(hi);
    const at = (v: number) => (Math.log10(clamp(v, lo, hi)) - L0) / (L1 - L0 || 1);
    // Every 1-2-5 step in range, offered in priority order: the ends, the decades, the 5s, the 2s.
    const cands: number[] = [];
    for (let d = Math.floor(L0); d <= Math.ceil(L1); d++) {
      for (const m of LADDER) {
        const t = +(m * Math.pow(10, d)).toPrecision(6);
        if (t >= lo - 1e-9 && t <= hi + 1e-9) cands.push(t);
      }
    }
    const lead = (t: number) => Math.round(t / decade(t));
    const rank = (t: number) => (t === lo || t === hi ? 0 : lead(t) === 1 ? 1 : lead(t) === 5 ? 2 : 3);
    return { lo, hi, at, ticks: keepTicks(cands.sort((a, b) => rank(a) - rank(b)), (t) => at(t) * span, size) };
  }
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
  const lo = isNum(axis.floor) ? Math.min(axis.floor, min) : min < 0 ? -niceCeil(-min) : 0;
  const hi = Math.max(niceCeil(max), lo + 1);
  const at = (v: number) => (clamp(v, lo, hi) - lo) / (hi - lo || 1);
  const q = (hi - lo) / 4;
  const cands = [lo, hi, lo + 2 * q, lo + q, lo + 3 * q].map((t) => +t.toPrecision(6));
  return { lo, hi, at, ticks: keepTicks(cands, (t) => at(t) * span, size) };
}

/** `s` cut to about `px` wide at `fs`, with an ellipsis when it is cut. */
const fitText = (s: string, px: number, fs: number) => {
  const n = Math.max(1, Math.floor(px / (fs * 0.58)));
  return s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s;
};

// ─────────────────────────────────────────────────────────────────────────────
// Scatter
// ─────────────────────────────────────────────────────────────────────────────
type Placed = { p: ScatterPoint; cx: number; cy: number; r: number; color: string };
type Box = { x: number; y: number; w: number; h: number };
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h;

export function Scatter({ points, series, x, y, sizeLabel, ariaLabel, noun = "dots", legend, height, onMore, empty = "Nothing in this selection." }: {
  points: ScatterPoint[];
  series: ScatterSeries[];
  x: NumAxis;
  y: NumAxis | BandAxis;
  /** What a dot's area stands for, printed over the plot: "dot area = spend". */
  sizeLabel?: string;
  ariaLabel: string;
  /** What the dots are, in the chart's description: "products". */
  noun?: string;
  /** Print the series legend; by default when there are several series and no band rows (a
   *  band row's name says whose dots it holds). */
  legend?: boolean;
  /** A numeric chart outside a panel: its height (300 unless set). A band chart outside a panel
   *  takes a fixed height per row; in a panel every chart takes the body's height. */
  height?: number;
  /** A band chart in an interactive panel: opens the full list from "+N more". */
  onMore?: () => void;
  empty?: string;
}) {
  const panel = usePanel();
  const on = useArmed();
  const uid = useId().replace(/:/g, "");
  const [ref, measured] = useWidth<HTMLDivElement>(560);
  const [hi, setHi] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const dotRefs = useRef<Record<string, SVGGElement | null>>({});

  const band = y.kind === "band" ? y : null;
  const numY = y.kind === "band" ? null : y;
  const colorOf = new Map(series.map((s) => [s.key, s.color]));
  const legendItems: LegendItem[] = (legend ?? (series.length > 1 && !band))
    ? series.map((s) => ({ key: s.key, label: s.label, color: s.color, shape: "dot" as const })) : [];
  usePanelLegend(points.length && legendItems.length ? legendItems : null);

  // The frame. A band chart's rows are the ones that fit the panel (all of them in a drawer),
  // named in a label column; a numeric y axis prints its ticks there instead.
  const W = panel ? panel.size.w : measured;
  const PT = TITLE_H + 4, PB = X_AXIS_H, PR = 10;
  const H = panel ? panel.size.h : band ? PT + PB + band.rows.length * ROW_H : height ?? 300;
  const fit = band ? fitRows(band.rows, Math.max(0, H - PT - PB), { minH: ROW_MIN, maxH: panel ? 64 : ROW_H }) : null;
  const rows = fit?.shown ?? [];
  const rowKeys = new Set(rows.map((r) => r.key));
  const svgH = fit && fit.hidden > 0 ? H - MORE_H : H;
  // A log axis has no place for zero or less: such a dot is left out (and out of the summary).
  const onX = (p: ScatterPoint) => isNum(p.x) && (x.kind !== "log" || p.x > 0);
  const onY = (p: ScatterPoint) => isNum(p.y) && (numY?.kind !== "log" || p.y > 0);
  const shown = points.filter((p) => onX(p) && (band ? p.row != null && rowKeys.has(p.row) : onY(p)));
  const plotH = band && fit ? rows.length * fit.rowH : Math.max(1, svgH - PT - PB);

  // A dot's radius: its area proportional to its size, the largest one the plot's twelfth (half a
  // band row), never under R_MIN. The plot is inset by that much, so no dot leaves it.
  const rMax = band && fit ? clamp(fit.rowH / 2 - 2, R_MIN + 1, R_MAX) : clamp(Math.min(W - PR, plotH) / 12, R_MIN + 2, R_MAX);
  const maxSize = Math.max(0, ...shown.map((p) => (isNum(p.size) && p.size > 0 ? p.size : 0)));
  const radius = (p: ScatterPoint) => (maxSize > 0 && isNum(p.size) ? Math.max(R_MIN, rMax * Math.sqrt(Math.max(0, p.size) / maxSize)) : R_MIN + 1);
  const padY = band ? 0 : rMax;
  const yScale = numY ? numScale(numY, shown.map((p) => p.y as number), plotH - 2 * padY, () => TICK_FS + 2) : null;
  const PL = band
    ? clamp(Math.max(0, ...rows.map((r) => textW(r.label, ROW_FS) + (r.color ? SWATCH + SWATCH_GAP : 0))) + 10, 64, W * 0.36)
    : Math.ceil(Math.max(0, ...(yScale?.ticks ?? []).map((t) => textW(numY?.tick(t) ?? "", TICK_FS)))) + 10;
  const plotW = Math.max(1, W - PL - PR);
  const padX = rMax;
  const xScale = numScale(x, shown.map((p) => p.x), plotW - 2 * padX, (t) => textW(x.tick(t), TICK_FS));
  const X = (v: number) => PL + padX + xScale.at(v) * (plotW - 2 * padX);
  const Y = (v: number) => PT + padY + (1 - (yScale?.at(v) ?? 0)) * (plotH - 2 * padY);
  const xAxisY = PT + plotH;

  // Where every dot goes. In a band row the dots sit on its middle line, cheapest first; one
  // that would overlap a dot already placed steps up or down the row (alternately, nearest first)
  // until it is free or the row runs out. Large dots are drawn first, so a small one is never
  // hidden behind them; the selected one last.
  const placed: Placed[] = [];
  if (band && fit) {
    rows.forEach((row, i) => {
      const mid = PT + i * fit.rowH + fit.rowH / 2;
      const half = Math.max(0, fit.rowH / 2 - 2);
      const mine: Placed[] = [];
      for (const p of shown.filter((q) => q.row === row.key).sort((a, b) => a.x - b.x || radius(b) - radius(a))) {
        const r = radius(p), cx = X(p.x);
        let cy = mid;
        for (let k = 1; k < 40 && !mine.every((q) => Math.hypot(q.cx - cx, q.cy - cy) >= q.r + r + 1); k++) {
          const off = Math.ceil(k / 2) * 3 * (k % 2 ? -1 : 1);
          // Out of room (half the dot may overhang the row): it stays on the line, over the others.
          if (Math.abs(off) > half - r / 2) { cy = mid; break; }
          cy = mid + off;
        }
        mine.push({ p, cx, cy, r, color: colorOf.get(p.series) ?? row.color ?? SUB });
      }
      placed.push(...mine);
    });
  } else {
    for (const p of shown) placed.push({ p, cx: X(p.x), cy: Y(p.y as number), r: radius(p), color: colorOf.get(p.series) ?? SUB });
  }
  placed.sort((a, b) => Number(!!a.p.selected) - Number(!!b.p.selected) || b.r - a.r);

  // Reading order for the keyboard: by x, then y. The chart's one tab stop is the dot last
  // focused, else the selected one, else the first.
  const order = [...placed].sort((a, b) => a.cx - b.cx || a.cy - b.cy);
  const byKey = new Map(placed.map((d) => [d.p.key, d]));
  const active = hi ? byKey.get(hi) ?? null : null;
  const stop = focused ?? order.find((d) => d.p.selected)?.p.key ?? order[0]?.p.key ?? null;

  const readoutOf = (d: Placed) => <span><b>{d.p.label}</b> {d.p.detail}</span>;
  usePanelReadout(active ? active.p.key : null, () => (active ? readoutOf(active) : null));

  /** The dot nearest the pointer, within reach of its edge. */
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W, py = ((e.clientY - box.top) / box.height) * svgH;
    let best: Placed | null = null, bestD = Infinity;
    for (const d of placed) {
      const dist = Math.hypot(d.cx - px, d.cy - py) - d.r;
      if (dist < bestD) { best = d; bestD = dist; }
    }
    setHi(best && bestD <= REACH ? best.p.key : null);
  };
  const press = (d: Placed | null | undefined) => d?.p.onClick?.();
  const onKey = (e: React.KeyboardEvent) => {
    const i = order.findIndex((d) => d.p.key === focused);
    if (i < 0) return;
    const to = e.key === "ArrowRight" || e.key === "ArrowDown" ? order[Math.min(order.length - 1, i + 1)]
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? order[Math.max(0, i - 1)]
      : e.key === "Home" ? order[0] : e.key === "End" ? order[order.length - 1] : null;
    if (to) { e.preventDefault(); dotRefs.current[to.p.key]?.focus(); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(order[i]); }
  };

  // Tags beside their dots, the selected first, then the largest: each one right of its dot, else
  // left, kept only inside the plot and clear of the titles and the tags already placed.
  const taken: Box[] = [{ x: 0, y: 0, w: W, h: TITLE_H }];
  const tags: { key: string; x: number; y: number; anchor: "start" | "end"; text: string; strong: boolean }[] = [];
  for (const d of placed.filter((q) => q.p.tag || q.p.selected).sort((a, b) => Number(!!b.p.selected) - Number(!!a.p.selected) || b.r - a.r)) {
    const w = textW(d.p.label, TAG_FS) * (d.p.selected ? TAG_SLACK_BOLD : TAG_SLACK), h = TAG_FS + 2;
    for (const right of [true, false]) {
      const box = { x: right ? d.cx + d.r + 3 : d.cx - d.r - 3 - w, y: d.cy - h / 2, w, h };
      if (box.x < PL || box.x + w > W - PR || box.y < PT - 2 || box.y + h > xAxisY || !taken.every((b) => apart(box, b))) continue;
      taken.push(box);
      tags.push({ key: d.p.key, x: right ? box.x : box.x + w, y: d.cy + TAG_FS * 0.35, anchor: right ? "start" : "end", text: d.p.label, strong: !!d.p.selected });
      break;
    }
  }

  // The chart in words: its description for a screen reader.
  const xs = shown.map((p) => p.x), ys = shown.map((p) => p.y).filter(isNum);
  const range = (a: NumAxis, v: number[]) => `${a.label} from ${a.tick(Math.min(...v))} to ${a.tick(Math.max(...v))}${a.kind === "log" ? " on a log scale" : ""}`;
  const summary = [
    `${shown.length} ${noun}`,
    xs.length ? range(x, xs) : null,
    numY && ys.length ? range(numY, ys) : null,
    band ? `one row per ${band.label.toLowerCase()}: ${rows.map((r) => r.label).join(", ")}` : null,
    sizeLabel ?? null,
    ...(x.refs ?? []).map((r) => r.label),
    ...(numY?.refs ?? []).map((r) => r.label),
    // How to reach the dots: the chart is one Tab stop (inside a panel no line under it says so).
    `Tab to the chart, then the arrow keys move from dot to dot, Home and End to the first and last${shown.some((p) => p.onClick) ? "; Enter or Space chooses one" : ""}`,
  ].filter(Boolean).join("; ");

  const halo = { paintOrder: "stroke", stroke: CARD, strokeWidth: 3 } as const;
  // Where the two titles print, for the reference labels that share their row.
  const yTitle = `${y.label}${numY?.kind === "log" ? " (log scale)" : ""}`;
  const titleBoxes: Box[] = [
    { x: band ? 0 : PL, y: 0, w: textW(yTitle, TITLE_FS) * TAG_SLACK_BOLD + 6, h: TITLE_H },
    ...(sizeLabel ? [{ x: W - PR - textW(sizeLabel, TITLE_FS) * TAG_SLACK - 6, y: 0, w: textW(sizeLabel, TITLE_FS) * TAG_SLACK + 6, h: TITLE_H }] : []),
  ];

  // The measured wrapper always renders: its width is read once, on mount.
  if (!shown.length) return <div ref={ref}><p className="text-[12px]" style={{ color: SUB }}>{empty}</p></div>;

  return (
    <div ref={ref}>
      {!panel && legendItems.length > 0 && <div className="mb-2"><Legend items={legendItems} /></div>}
      <svg viewBox={`0 0 ${W} ${svgH}`} width="100%" height={svgH} role="group" aria-label={ariaLabel} aria-describedby={`${uid}-desc`}
        style={{ display: "block", cursor: active?.p.onClick ? "pointer" : "default" }}
        onMouseMove={onMove} onMouseLeave={() => setHi(null)} onClick={() => press(active)} onKeyDown={onKey}>
        <desc id={`${uid}-desc`}>{summary}</desc>

        <g aria-hidden="true">
          {/* The y title over the plot, what a dot's area is at its right. */}
          <text x={band ? 0 : PL} y={TITLE_FS} style={{ fontSize: TITLE_FS, fill: SUB, fontWeight: 600 }}>{yTitle}</text>
          {sizeLabel && <text x={W - PR} y={TITLE_FS} textAnchor="end" style={{ fontSize: TITLE_FS, fill: SUB }}>{sizeLabel}</text>}
          {/* Hairlines: the y ticks, or the band rows and their middle lines; the x ticks. */}
          {yScale?.ticks.map((t) => (
            <g key={`yt-${t}`}>
              <line x1={PL} y1={Y(t)} x2={PL + plotW} y2={Y(t)} stroke={LINE} strokeWidth={1} />
              <text x={PL - 6} y={Y(t) + 3.5} textAnchor="end" style={{ fontSize: TICK_FS, fill: SUB }}>{numY?.tick(t)}</text>
            </g>
          ))}
          {band && fit && rows.map((row, i) => {
            const mid = PT + i * fit.rowH + fit.rowH / 2;
            const room = PL - 10 - (row.color ? SWATCH + SWATCH_GAP : 0);
            return (
              <g key={`row-${row.key}`}>
                {i > 0 && <line x1={0} y1={PT + i * fit.rowH} x2={PL + plotW} y2={PT + i * fit.rowH} stroke={LINE} strokeWidth={1} />}
                <line x1={PL} y1={mid} x2={PL + plotW} y2={mid} stroke={tint(INK, 0.08)} strokeWidth={1} />
                {row.color && <rect x={0.5} y={mid - SWATCH / 2} width={SWATCH} height={SWATCH} rx={2.5} fill={row.color} />}
                <text x={row.color ? SWATCH + SWATCH_GAP : 0} y={mid + ROW_FS * 0.35} style={{ fontSize: ROW_FS, fill: INK }}>
                  <title>{row.label}</title>{fitText(row.label, room, ROW_FS)}
                </text>
              </g>
            );
          })}
          {xScale.ticks.map((t) => (
            <g key={`xt-${t}`}>
              <line x1={X(t)} y1={PT} x2={X(t)} y2={xAxisY} stroke={LINE} strokeWidth={1} />
              <text x={X(t)} y={xAxisY + 12} textAnchor="middle" style={{ fontSize: TICK_FS, fill: SUB }}>{x.tick(t)}</text>
            </g>
          ))}
          <line x1={PL} y1={xAxisY} x2={PL + plotW} y2={xAxisY} stroke={INK} strokeWidth={1} opacity={0.5} />
          <text x={PL + plotW} y={xAxisY + 24} textAnchor="end" style={{ fontSize: TITLE_FS, fill: SUB, fontWeight: 600 }}>{x.label}{x.kind === "log" ? " (log scale)" : ""}</text>
          {/* Reference lines, dashed, labelled where they meet the plot's top or right edge. */}
          {(x.refs ?? []).map((r) => {
            const lx = X(r.value), right = lx < PL + plotW * 0.6;
            const w = textW(r.label, TAG_FS) * TAG_SLACK;
            const box = { x: right ? lx + 4 : lx - 4 - w, y: 0, w, h: TITLE_H };
            // Over the plot, in the titles' row, where it clears both titles; else inside the
            // plot's top edge.
            const ly = titleBoxes.every((b) => apart(box, b)) && box.x >= 0 && box.x + w <= W ? TITLE_FS : PT + TAG_FS - 2;
            return (
              <g key={`rx-${r.label}`}>
                <line x1={lx} y1={ly === TITLE_FS ? TITLE_H - 2 : PT} x2={lx} y2={xAxisY} stroke={INK} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
                <text x={right ? lx + 4 : lx - 4} y={ly} textAnchor={right ? "start" : "end"} style={{ fontSize: TAG_FS, fill: INK, ...halo }}>{r.label}</text>
              </g>
            );
          })}
          {(numY?.refs ?? []).map((r) => (
            <g key={`ry-${r.label}`}>
              <line x1={PL} y1={Y(r.value)} x2={PL + plotW} y2={Y(r.value)} stroke={INK} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
              <text x={PL + plotW - 2} y={Y(r.value) - 4} textAnchor="end" style={{ fontSize: TAG_FS, fill: INK, ...halo }}>{r.label}</text>
            </g>
          ))}
        </g>

        {placed.map((d, i) => {
          const lit = hi === d.p.key || focused === d.p.key;
          const dim = hi != null && !lit && !d.p.selected;
          const name = `${d.p.label}: ${d.p.detail}${d.p.selected ? ", chosen" : ""}${d.p.onClick && !d.p.selected ? `. Press to choose ${d.p.label}` : ""}`;
          return (
            <g key={d.p.key} ref={(el) => { dotRefs.current[d.p.key] = el; }}
              role={d.p.onClick ? "button" : "img"} aria-label={name} aria-pressed={d.p.onClick ? !!d.p.selected : undefined}
              tabIndex={d.p.key === stop ? 0 : -1} style={{ outline: "none" }}
              onFocus={() => { setFocused(d.p.key); setHi(d.p.key); }} onBlur={() => { setFocused(null); setHi(null); }}>
              <circle cx={d.cx} cy={d.cy} r={d.r} fill={d.color}
                fillOpacity={d.p.selected || lit ? 0.95 : dim ? 0.3 : band ? 0.55 : 0.72}
                // A 1.5px surface ring parts overlapping dots; the chosen and the pointed-at one
                // wear an ink ring instead. In a band row, dots at one price can sit one inside
                // another (rings would read as a target): they go without, and a stack darkens.
                stroke={d.p.selected || lit ? INK : band ? "none" : CARD} strokeWidth={d.p.selected || lit ? 2 : 1.5}
                style={{ opacity: on ? 1 : 0, transition: `opacity 400ms ease ${80 + Math.min(i, 40) * 12}ms, fill-opacity .15s ease` }} />
              {focused === d.p.key && <circle cx={d.cx} cy={d.cy} r={d.r + 4} fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="3 2" />}
            </g>
          );
        })}

        <g aria-hidden="true" style={{ opacity: on ? 1 : 0, transition: "opacity 400ms ease 500ms" }}>
          {tags.map((t) => (
            <text key={`tag-${t.key}`} x={t.x} y={t.y} textAnchor={t.anchor} style={{ fontSize: TAG_FS, fill: INK, fontWeight: t.strong ? 700 : 500, ...halo }}>{t.text}</text>
          ))}
        </g>
      </svg>
      {fit && fit.hidden > 0 && <MoreRows n={fit.hidden} onMore={onMore} />}
      {!panel && (
        <Readout k={active?.p.key ?? "idle"} dark>
          {active ? readoutOf(active) : <span style={{ color: SUB }}>point at a dot (or Tab to the chart and use the arrow keys) to read it</span>}
        </Readout>
      )}
    </div>
  );
}
