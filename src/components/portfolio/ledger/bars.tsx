"use client";
// Horizontal bars for the one-screen overviews, each labelled on its face (lakhs on the chart,
// exact rupees in the drawer):
//   RankBars  — rows ranked on ONE scale from zero (niceCeil): spend by group, the top brands,
//               loss by hospital, where the loss sits. Optional month-before ticks; groups of
//               rows a hairline apart. Shows the rows that fit, then "+N more".
//   Waterfall — a bridge read top to bottom: totals from zero, each change floating from where
//               the step before ended (proposed − loss = actual). A gain is drawn in JADE.
//   PartBar   — one whole as a 100% bar of labelled parts, the shares as the API sends them.
// All three are panel-aware (usePanel): in a one-screen panel they fill its body, in a drawer
// they take their natural height. Bars never start anywhere but zero, and a negative value
// draws no bar and keeps its minus in the label.
import React from "react";
import { RowStyles, hatchFill, useArmed, tint, inkOn, INK, SUB, LINE, TRACK, EASE, SEL_BG, JADE } from "./kit";
import { Swatch } from "./legend";
import { useWidth } from "./minis";
import { GroupCaption, MoreRows, fitRows, groupHeads, headH, usePanel } from "./panel";
import { isNum, pct } from "./format";
import { clamp, niceCeil, textW } from "./scale";

const LABEL_FS = 12, VALUE_FS = 11.5, SUB_FS = 10.5;
/** The least height RankBars gives a row, in px; below it a row goes to "+N more". A chart
 *  that decides what to hand RankBars from the room it has (SplitTile) reads it from here. */
export const RANK_ROW_MIN = 18;
/** Below this width a chart drops its secondary labels (a row's sub-line and aside). */
const NARROW_W = 320;

/** A bar's fill: its colour, or the hatch of a figure that is an estimate or outside a ratio. */
const fillOf = (color: string, hatched?: boolean): React.CSSProperties => (hatched
  ? { background: hatchFill(color), boxShadow: `inset 0 0 0 1px ${tint(color, 0.7)}` }
  : { background: color });

/** A row's words for a screen reader. */
const said = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(", ");

// ─────────────────────────────────────────────────────────────────────────────
// RankBars
// ─────────────────────────────────────────────────────────────────────────────
export type RankRow = {
  key: string;
  label: string;
  /** A second line under the label: the hospital, the section, the generic name. */
  sub?: string;
  /** Null when there is nothing to draw ("—"). */
  value: number | null;
  /** The figure on the face, already formatted: "₹ 16.39 L". */
  valueLabel: string;
  /** What the figure is a share of, under it: "1.58% of drug spend". */
  aside?: string;
  /** Overrides the chart's colour (a group's own colour). */
  color?: string;
  hatched?: boolean;
  /** The month before, ticked on the same scale. */
  tick?: number | null;
  tickLabel?: string;
  /** Rows of one group sit together under its name, a hairline apart. */
  group?: string;
  selected?: boolean;
  /** The row becomes a button (select that hospital, open that row's drawer). */
  onClick?: () => void;
};

export function RankBars({ rows, format, color, ariaLabel, onMore, empty = "Nothing in this selection." }: {
  rows: RankRow[];
  /** Prints the scale's end. */
  format: (v: number) => string;
  /** The bars' colour unless a row sets its own. */
  color: string;
  ariaLabel: string;
  /** In an interactive panel: opens the full list from "+N more". */
  onMore?: () => void;
  empty?: string;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(360);
  const W = panel ? panel.size.w : measured;
  const narrow = W < NARROW_W;
  const hasSecond = !narrow && rows.some((r) => r.sub || r.aside);
  const fit = fitRows(rows, panel ? panel.size.h : Infinity, {
    minH: RANK_ROW_MIN, maxH: hasSecond ? 34 : 26, extra: (shown) => groupHeads(shown, rows).reduce((h, g) => h + headH(g), 0),
  });
  const heads = groupHeads(fit.shown, rows);
  // Sub-lines and asides need a second line; a short row keeps them for its tooltip.
  const twoLine = hasSecond && fit.rowH >= 30;
  // One scale for every row, shown or not, so "+N more" never changes a bar's length.
  const max = niceCeil(Math.max(0, ...rows.flatMap((r) => [r.value, r.tick]).filter(isNum)));
  const labelW = clamp(Math.max(0, ...fit.shown.map((r) => textW(r.label, LABEL_FS))) + 8, 56, W * 0.4);
  const valueW = clamp(Math.max(0, ...fit.shown.map((r) => Math.max(textW(r.valueLabel, VALUE_FS), twoLine && r.aside ? textW(r.aside, SUB_FS) : 0))) + 4, 36, W * 0.38);
  const barH = clamp(Math.round(fit.rowH * 0.42), 6, 14);
  const cols = `${labelW}px minmax(0,1fr) ${valueW}px`;

  if (!rows.length) return <div ref={ref}><p className="text-[12px]" style={{ color: SUB }}>{empty}</p></div>;

  return (
    <div ref={ref}>
      <div role="list" aria-label={`${ariaLabel}. Bars from ${format(0)} to ${format(max)}.`} className="-mx-2">
        {fit.shown.map((r, i) => {
          const c = r.color ?? color;
          const w = isNum(r.value) && r.value > 0 ? (r.value / max) * 100 : 0;
          const name = said(r.label, r.sub, r.valueLabel, r.aside, r.tickLabel);
          const cells = (
            <>
              <span className="block min-w-0" aria-hidden="true">
                <span className="block truncate" title={r.label} style={{ fontSize: LABEL_FS, color: INK, fontWeight: r.selected ? 700 : 500 }}>{r.label}</span>
                {twoLine && r.sub && <span className="block truncate" title={r.sub} style={{ fontSize: SUB_FS, color: SUB }}>{r.sub}</span>}
              </span>
              <span aria-hidden="true" className="relative block rounded-[3px]" style={{ height: barH, background: TRACK }}>
                <span className="absolute left-0 top-0 bottom-0 rounded-[3px]" style={{
                  ...fillOf(c, r.hatched), width: on ? `${w}%` : "0%", transition: `width 620ms ${EASE} ${80 + i * 40}ms`,
                }} />
                {isNum(r.tick) && r.tick >= 0 && (
                  <span className="absolute w-[2px] -top-[3px] -bottom-[3px]" title={r.tickLabel}
                    style={{ left: `calc(${(r.tick / max) * 100}% - 1px)`, background: INK, opacity: 0.75 }} />
                )}
              </span>
              <span aria-hidden="true" className="block min-w-0 text-right tabular-nums">
                <span className="block truncate font-semibold" title={r.valueLabel} style={{ fontSize: VALUE_FS, color: INK }}>{r.valueLabel}</span>
                {twoLine && r.aside && <span className="block truncate" title={r.aside} style={{ fontSize: SUB_FS, color: SUB }}>{r.aside}</span>}
              </span>
            </>
          );
          const cls = "grid items-center gap-x-2.5 w-full text-left rounded-[8px] px-2";
          const style: React.CSSProperties = { gridTemplateColumns: cols, height: fit.rowH, background: r.selected ? SEL_BG : undefined };
          const head = heads[i];
          return (
            <div role="listitem" key={r.key}>
              {head && <GroupCaption head={head} />}
              {r.onClick ? (
                <button type="button" onClick={r.onClick} aria-label={name} className={`hcg-row ${cls}`} style={style}>{cells}</button>
              ) : (
                <div className={cls} style={style} title={name}><span className="sr-only">{name}</span>{cells}</div>
              )}
            </div>
          );
        })}
        {fit.hidden > 0 && <div className="px-2"><MoreRows n={fit.hidden} onMore={onMore} /></div>}
      </div>
      <RowStyles />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Waterfall
// ─────────────────────────────────────────────────────────────────────────────
export type WaterStep = {
  key: string;
  label: string;
  /** A total's amount, or a change's (negative for a loss). */
  value: number;
  /** A total starts at zero; a delta floats from where the step before it ended. */
  kind: "total" | "delta";
  color: string;
  hatched?: boolean;
  /** The figure on the face: "₹ 182.55 L", "−₹ 78.08 L". */
  valueLabel: string;
  /** A short line under the figure: "42.77% of proposed". */
  note?: string;
  /** The step becomes a button (open that part's drawer). */
  onClick?: () => void;
};

/** The ₹ 0 · end axis under the bridge. */
const WATER_AXIS_H = 16;

export function Waterfall({ steps, format, ariaLabel }: {
  steps: WaterStep[];
  /** Prints the axis ends. */
  format: (v: number) => string;
  ariaLabel: string;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(360);
  const W = panel ? panel.size.w : measured;

  // Where each bar runs: a total from zero to its amount; a change from the running total.
  let run = 0;
  const spans = steps.map((s) => {
    if (s.kind === "total") { run = s.value; return { from: 0, to: s.value }; }
    const from = run;
    run += s.value;
    return { from, to: run };
  });
  const ends = spans.flatMap((sp) => [sp.from, sp.to]);
  const top = niceCeil(Math.max(0, ...ends));
  const least = Math.min(0, ...ends);
  const bottom = least < 0 ? -niceCeil(-least) : 0;
  const X = (v: number) => ((v - bottom) / (top - bottom)) * 100;
  // Every step shows: a bridge with a step missing would not add up.
  const rowH = panel ? clamp(Math.floor((panel.size.h - WATER_AXIS_H) / Math.max(1, steps.length)), 16, 44) : 36;
  const twoLine = rowH >= 30 && W >= NARROW_W && steps.some((s) => s.note);
  const barH = clamp(Math.round(rowH * 0.46), 8, 18);
  const labelW = clamp(Math.max(0, ...steps.map((s) => textW(s.label, LABEL_FS))) + 8, 56, W * 0.34);
  const valueW = clamp(Math.max(0, ...steps.map((s) => Math.max(textW(s.valueLabel, VALUE_FS), twoLine && s.note ? textW(s.note, SUB_FS) : 0))) + 4, 40, W * 0.34);
  const cols = `${labelW}px minmax(0,1fr) ${valueW}px`;
  const gapTop = (rowH - barH) / 2;
  // The dashed line that carries one step's end down to the next step's start, drawn half in
  // each row: from the bar's edge to the row's edge.
  const connector = (x: number, edge: "top" | "bottom") => (
    <span aria-hidden="true" className="absolute w-0" style={{
      left: `${x}%`, height: gapTop, borderLeft: `1px dashed ${tint(INK, 0.45)}`, ...(edge === "top" ? { top: -gapTop } : { bottom: -gapTop }),
    }} />
  );
  const zeroX = X(0);

  if (!steps.length) return <div ref={ref} />;

  return (
    <div ref={ref}>
      <div role="list" aria-label={`${ariaLabel}. Bars from ${format(bottom)} to ${format(top)}.`} className="-mx-2">
        {steps.map((s, i) => {
          const sp = spans[i];
          const lo = Math.min(sp.from, sp.to), hi = Math.max(sp.from, sp.to);
          // A change that adds is a gain, whatever the step's own colour says.
          const c = s.kind === "delta" && s.value > 0 ? JADE : s.color;
          const name = said(s.label, s.valueLabel, s.note);
          const cells = (
            <>
              <span aria-hidden="true" className="truncate" title={s.label} style={{ fontSize: LABEL_FS, color: INK, fontWeight: s.kind === "total" ? 600 : 500 }}>{s.label}</span>
              <span aria-hidden="true" className="relative block" style={{ height: barH }}>
                {i > 0 && connector(X(spans[i - 1].to), "top")}
                <span className="absolute top-0 bottom-0 rounded-[3px]" style={{
                  ...fillOf(c, s.hatched), left: `${X(lo)}%`, width: on ? `${X(hi) - X(lo)}%` : "0%",
                  transition: `width 620ms ${EASE} ${120 + i * 140}ms`,
                }} />
                {i < steps.length - 1 && connector(X(sp.to), "bottom")}
              </span>
              <span aria-hidden="true" className="block min-w-0 text-right tabular-nums">
                <span className="block truncate font-semibold" style={{ fontSize: VALUE_FS, color: INK }}>{s.valueLabel}</span>
                {twoLine && s.note && <span className="block truncate" title={s.note} style={{ fontSize: SUB_FS, color: SUB }}>{s.note}</span>}
              </span>
            </>
          );
          const cls = "grid items-center gap-x-2.5 w-full text-left rounded-[8px] px-2";
          const style: React.CSSProperties = { gridTemplateColumns: cols, height: rowH };
          return (
            <div role="listitem" key={s.key}>
              {s.onClick ? (
                <button type="button" onClick={s.onClick} aria-label={name} className={`hcg-row ${cls}`} style={style}>{cells}</button>
              ) : (
                <div className={cls} style={style} title={name}><span className="sr-only">{name}</span>{cells}</div>
              )}
            </div>
          );
        })}
        <div aria-hidden="true" className="grid gap-x-2.5 px-2" style={{ gridTemplateColumns: cols, height: WATER_AXIS_H }}>
          <span />
          <span className="relative block text-[10px] tabular-nums" style={{ color: SUB, borderTop: `1px solid ${LINE}` }}>
            {bottom < 0 && <span className="absolute left-0 top-[2px]">{format(bottom)}</span>}
            {bottom === 0 ? <span className="absolute left-0 top-[2px]">{format(0)}</span>
              : zeroX > 15 && zeroX < 85 && <span className="absolute top-[2px] -translate-x-1/2" style={{ left: `${zeroX}%` }}>{format(0)}</span>}
            <span className="absolute right-0 top-[2px]">{format(top)}</span>
          </span>
          <span />
        </div>
      </div>
      <RowStyles />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PartBar
// ─────────────────────────────────────────────────────────────────────────────
export type Part = {
  key: string;
  label: string;
  /** The part's share of the whole, % as the API sends it; null when it has none. */
  share: number | null;
  /** The part's amount on the face: "₹ 11.86 L". */
  valueLabel: string;
  color: string;
  hatched?: boolean;
};

/** A part's share is printed inside it when it has this many px. */
const PART_LABEL_PX = 30;

export function PartBar({ parts, whole, ariaLabel }: {
  parts: Part[];
  /** What the whole bar stands for: "the bill cost of out-of-formulary brands". */
  whole: string;
  ariaLabel: string;
}) {
  const on = useArmed();
  const [ref, W] = useWidth<HTMLDivElement>(360);
  // Shares that do not add up to 100% leave the rest of the bar as track: nothing is invented.
  let at = 0;
  const laid = parts.map((p) => {
    const share = isNum(p.share) ? clamp(p.share, 0, 100 - at) : 0;
    const left = at;
    at += share;
    return { ...p, share, left };
  });
  const lastKey = [...laid].reverse().find((p) => p.share > 0)?.key;

  return (
    <div ref={ref} role="img" aria-label={`${ariaLabel}: ${parts.map((p) => `${p.label} ${pct(p.share, 1)}, ${p.valueLabel}`).join("; ")}. The whole bar is ${whole}.`}>
      <div aria-hidden="true" className="relative h-[18px] rounded-[4px] overflow-hidden" style={{ background: TRACK }}>
        {laid.map((p, i) => p.share > 0 && (
          <span key={p.key} className="absolute top-0 bottom-0 flex items-center justify-center text-[10.5px] font-semibold tabular-nums overflow-hidden"
            style={{
              ...fillOf(p.color, p.hatched), left: `${p.left}%`, width: on ? `${p.share}%` : "0%",
              color: p.hatched ? INK : inkOn(p.color),
              // A 2px surface gap where two parts meet.
              boxShadow: [p.key !== lastKey ? "inset -2px 0 0 #fff" : null, p.hatched ? `inset 0 0 0 1px ${tint(p.color, 0.7)}` : null].filter(Boolean).join(", ") || undefined,
              transition: `width 620ms ${EASE} ${120 + i * 80}ms`,
            }}>
            {(p.share / 100) * W >= PART_LABEL_PX ? `${Math.round(p.share)}%` : null}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] tabular-nums" style={{ color: SUB }}>
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Swatch color={p.color} hatched={p.hatched} />
            <span style={{ color: INK }}>{p.label}</span>
            <b style={{ color: INK }}>{pct(p.share, 1)}</b>
            <span>· {p.valueLabel}</span>
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="text-[10.5px] mt-1" style={{ color: SUB }}>whole bar = {whole}</div>
    </div>
  );
}
