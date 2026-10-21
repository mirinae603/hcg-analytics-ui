"use client";
// Figures read against something: their budget, their proposed amount, or every other unit.
//   BulletRows — Stephen Few's bullet graph, one row per figure. On a % scale (fitted, so it need
//                not start at zero) the figure is a DOT, never a bar: its colour is its status
//                against the budget, the black marker is the budget, the grey tick the month
//                before, and met / within / below bands sit behind the rows judged against that
//                budget. On a rupee scale (from zero) the bar is the actual, the marker the
//                proposed amount, and the gap between them, a shortfall or an overspend, is
//                shaded in the loss colour. Rows that do not fit end on "+N more".
//   DotStrip   — one unit among all units (the OpenPrescribing pattern): every unit a dot on a
//                fitted axis, the selected one large and labelled, the network figure a dashed
//                line and the unit's budget a tick. A dot is a button that selects that unit.
// Both are panel-aware: in a one-screen panel they fill its body and hand their legend and
// readout to its header; in a drawer they print their own legend and take their natural height.
// A status colour comes only from status.ts, through the caller's `status`; words stay in ink.
import React, { useState } from "react";
import { RowStyles, hatchFill, tint, useArmed, INK, SUB, LINE, TRACK, EASE, SEL_BG } from "./kit";
import { Legend, type LegendItem } from "./legend";
import { useWidth } from "./minis";
import { MoreRows, fitRows, usePanel, usePanelLegend, usePanelReadout } from "./panel";
import { STATUS_COLOR, STATUS_LABEL, WITHIN_PTS, statusBands, type Status } from "./status";
import { isNum, pct } from "./format";
import { clamp, niceCeil, niceMax, textW } from "./scale";

const LABEL_FS = 12, VALUE_FS = 11.5, NOTE_FS = 10.5, ANN_FS = 10;
/** Below this width the rows drop their notes. */
const NARROW_W = 320;

/** The status words a legend has room for: short enough that a span-4 panel's legend takes
 *  one line, not three (STATUS_LABEL has the long forms, for the rows' names). */
const STATUS_SHORT: Record<Exclude<Status, "none">, string> = {
  met: "Met budget",
  within: `Within ${WITHIN_PTS} pts`,
  below: `Below by ${WITHIN_PTS}+ pts`,
};
const STATUSES = ["met", "within", "below"] as const;

const said = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(", ");

// ─────────────────────────────────────────────────────────────────────────────
// BulletRows
// ─────────────────────────────────────────────────────────────────────────────
export type PctScale = {
  kind: "pct";
  /** The fitted axis (fitDomain): a % drawn as a dot need not start at zero. */
  min: number;
  max: number;
  /** Each % as a bar from the axis start instead of a dot: what a reader expects of a headline %
   *  ("98% is a bar 98% full"). Only on an axis from 0 to 100, where a bar's length is honest;
   *  no status bands are drawn behind it. */
  bars?: boolean;
  /** A bar's colour where its row has no status (no budget to judge it by). */
  color?: string;
  /** Bands are drawn behind the rows judged against this budget (the rows whose target it is).
   *  Left out where each row has its own budget: one band set per row would be noise. */
  bandsFor?: number | null;
};
export type RupeeMark = { label: string; color: string };
export type RupeeScale = {
  kind: "rupee";
  /** Each row on its own scale from zero, its end printed: parts that are never summed. False:
   *  one scale for every row. */
  perRow: boolean;
  format: (v: number) => string;
  /** What the bar, the marker and the gap between them stand for, in the legend:
   *  "Actual margin", "Proposed margin", "Margin loss". */
  bar: RupeeMark;
  marker: RupeeMark;
  gap: RupeeMark;
};

export type BulletRow = {
  key: string;
  label: string;
  value: number | null;
  /** The figure on the face: "98.42%", "loss ₹ 78.08 L". */
  valueLabel: string;
  /** The budget (a % scale) or the proposed amount (a rupee scale). */
  target?: number | null;
  /** Printed at the marker: "budget 100%". */
  targetLabel?: string;
  /** The month before, ticked on the same scale: { value: 99.16, label: "Jul-26" }. */
  prior?: { value: number | null; label: string } | null;
  status?: Status;
  /** A short line beside the label: "within 2 pts of budget". */
  note?: string;
  selected?: boolean;
  /** An estimate: the bar is hatched. */
  hatched?: boolean;
  /** The row becomes a button (select that hospital, open that part's drawer). */
  onClick?: () => void;
};

/** One annotation under a track, at x% of it; `short` is printed when `text` has no room. */
type Ann = { key: string; x: number; text: string; short?: string; strong?: boolean };

/** How far a label may sit from its own mark when it has to make way for another. */
const ANN_REACH = 24;

/** Puts each annotation at its mark (centred, else just right or left of it, else beside a
 *  label already placed while still within reach of its mark), in priority order, in its
 *  short form if the long one has no room; drops it if neither fits. */
function placeAnns(anns: Ann[], width: number): (Ann & { left: number })[] {
  const placed: (Ann & { left: number; w: number })[] = [];
  for (const a of anns) {
    const x = (a.x / 100) * width;
    for (const text of a.short ? [a.text, a.short] : [a.text]) {
      const w = textW(text, ANN_FS);
      const left = [x - w / 2, x + 4, x - 4 - w, ...placed.flatMap((p) => [p.left - 4 - w, p.left + p.w + 4])]
        .map((l) => clamp(l, 0, Math.max(0, width - w)))
        .find((l) => x >= l - ANN_REACH && x <= l + w + ANN_REACH
          && placed.every((p) => l + w + 4 <= p.left || l >= p.left + p.w + 4));
      if (left != null) { placed.push({ ...a, text, left, w }); break; }
    }
  }
  return placed;
}

/** Tick values for a % axis from `lo` to `hi`, both ends included, the ones between kept only
 *  where their label has room on `width` px. */
function pctTicks(lo: number, hi: number, width: number): number[] {
  const step = niceMax(Math.max(hi - lo, 0.5) / 4);
  const px = (t: number) => ((t - lo) / (hi - lo || 1)) * width;
  const room = textW("100.5%", ANN_FS) + 8;
  const out = [lo];
  for (let t = Math.ceil(lo / step) * step; t < hi - 1e-9; t += step) {
    const v = +t.toFixed(6);
    if (v > lo + 1e-9 && px(v) - px(out[out.length - 1]) >= room && width - px(v) >= room) out.push(v);
  }
  out.push(hi);
  return out;
}

const pctTick = (t: number) => `${Number.isInteger(t) ? t : t.toFixed(1)}%`;

function pctLegend(rows: BulletRow[], shape: "dot" | "box"): LegendItem[] {
  // A ranking (more than three rows) counts its units per status in the legend.
  const counted = rows.length > 3;
  const items: LegendItem[] = STATUSES.flatMap((st) => {
    const n = rows.filter((r) => r.status === st).length;
    return n ? [{ key: st, label: counted ? `${STATUS_SHORT[st]} · ${n}` : STATUS_SHORT[st], color: STATUS_COLOR[st], shape }] : [];
  });
  if (rows.some((r) => isNum(r.target))) items.push({ key: "__target", label: "Budget", color: INK, shape: "tick" });
  const prior = rows.find((r) => r.prior && isNum(r.prior.value))?.prior;
  if (prior) items.push({ key: "__prior", label: prior.label, color: SUB, shape: "tick" });
  return items;
}

function rupeeLegend(scale: RupeeScale, rows: BulletRow[]): LegendItem[] {
  return [
    { key: "__bar", label: scale.bar.label, color: scale.bar.color, hatched: rows.length > 0 && rows.every((r) => r.hatched) },
    ...(rows.some((r) => isNum(r.target)) ? [{ key: "__marker", label: scale.marker.label, color: scale.marker.color, shape: "tick" as const }] : []),
    { key: "__gap", label: scale.gap.label, color: scale.gap.color },
  ];
}

// The track: a box tall enough for the marker, with the band (or bar) centred in it.
const BOX_H = 16, BAND_H = 8, BAR_H = 10;
/** The axis (or the per-row scale's caption) under the rows. */
const AXIS_H = 16;
/** Row heights: a stacked row (16px label line, 4px, the track); a stacked row with the line
 *  naming its marks (2px, 12px); a one-line row with that line under its track (the label's
 *  18px line, 2px, 12px). */
const STACKED_H = 36, STACKED_ANN_H = 50, ONE_LINE_ANN_H = 32;

export function BulletRows({ rows, scale, ariaLabel, legend = "status", onMore, empty = "Nothing in this selection." }: {
  rows: BulletRow[];
  scale: PctScale | RupeeScale;
  ariaLabel: string;
  /** "status" prints what the marks and colours mean; "none" when the panel's own legend does. */
  legend?: "status" | "none";
  /** In an interactive panel: opens the full list from "+N more". */
  onMore?: () => void;
  empty?: string;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(360);
  const W = panel ? panel.size.w : measured;
  const items = legend === "none" ? [] : scale.kind === "pct" ? pctLegend(rows, scale.bars ? "box" : "dot") : rupeeLegend(scale, rows);
  usePanelLegend(items.length ? items : null);

  const shared = scale.kind === "rupee" && !scale.perRow ? niceCeil(Math.max(0, ...rows.flatMap((r) => [r.value, r.target]).filter(isNum))) : 0;
  const domainOf = (r: BulletRow): [number, number] => (scale.kind === "pct" ? [scale.min, scale.max]
    : [0, scale.perRow ? niceCeil(Math.max(0, r.value ?? 0, r.target ?? 0)) : shared]);
  const at = (v: number, [lo, hi]: [number, number]) => ((clamp(v, lo, hi) - lo) / (hi - lo || 1)) * 100;
  const fmt = (v: number) => (scale.kind === "pct" ? pct(v) : scale.format(v));

  /** What the marks under a row say, in the order they claim room: a row's own scale
   *  end (without it the bar's length cannot be read), the target, the month before. */
  const annsOf = (r: BulletRow): Ann[] => {
    const dom = domainOf(r);
    return [
      ...(scale.kind === "rupee" && scale.perRow ? [{ key: "e", x: 100, text: scale.format(dom[1]) }] : []),
      ...(isNum(r.target) ? [{ key: "t", x: at(r.target, dom), text: r.targetLabel ?? `${scale.kind === "pct" ? "budget" : scale.marker.label} ${fmt(r.target)}`, short: fmt(r.target), strong: true }] : []),
      ...(r.prior && isNum(r.prior.value) ? [{ key: "p", x: at(r.prior.value, dom), text: `${r.prior.label} ${fmt(r.prior.value)}`, short: fmt(r.prior.value) }] : []),
    ];
  };

  // A few rows stack (label and figure above a full-width track, the marks named under it); many
  // rows take one line each. In a drawer: stacked up to six rows. Where a stacked row would have
  // no room to name its marks (a 1440×900 screen's three compliance rows), the rows stay on one
  // line and name them under the track: otherwise the budget and the month before are unlabelled
  // ticks.
  const fit = fitRows(rows, panel ? panel.size.h - AXIS_H : Infinity, { minH: 20, maxH: panel ? 64 : rows.length <= 6 ? 52 : 26 });
  const marked = fit.shown.some((r) => annsOf(r).length > 0);
  const stacked = W >= 240 && (fit.rowH >= STACKED_ANN_H || (fit.rowH >= STACKED_H && !marked));
  const annotated = marked && fit.rowH >= (stacked ? STACKED_ANN_H : ONE_LINE_ANN_H);
  const labelW = clamp(Math.max(0, ...fit.shown.map((r) => textW(r.label, LABEL_FS))) + 8, 56, W * 0.36);
  const valueW = clamp(Math.max(0, ...fit.shown.map((r) => textW(r.valueLabel, VALUE_FS))) + 4, 36, W * 0.38);
  const cols = `${labelW}px minmax(0,1fr) ${valueW}px`;
  const trackPx = stacked ? W : Math.max(0, W - labelW - valueW - 20);

  const track = (r: BulletRow, i: number) => {
    const dom = domainOf(r);
    const delay = `${100 + i * 40}ms`;
    const marker = isNum(r.target) && (
      <span className="absolute top-0 bottom-0 w-[2px]" style={{ left: `calc(${at(r.target, dom)}% - 1px)`, background: scale.kind === "pct" ? INK : scale.marker.color }} />
    );
    if (scale.kind === "pct" && scale.bars) {
      const c = r.status && r.status !== "none" ? STATUS_COLOR[r.status] : scale.color ?? INK;
      return (
        <span aria-hidden="true" className="relative block" style={{ height: BOX_H }}>
          <span className="absolute inset-x-0 rounded-[3px] overflow-hidden" style={{ top: (BOX_H - BAR_H) / 2, height: BAR_H, background: TRACK }}>
            {isNum(r.value) && (
              <span className="absolute left-0 top-0 bottom-0 rounded-r-[3px]" style={{
                background: c, width: on ? `${at(r.value, dom)}%` : "0%", transition: `width 640ms ${EASE} ${delay}`,
              }} />
            )}
          </span>
          {r.prior && isNum(r.prior.value) && (
            <span className="absolute w-[1.5px]" style={{ left: `calc(${at(r.prior.value, dom)}% - 0.75px)`, top: 1, bottom: 1, background: SUB }} />
          )}
          {marker}
        </span>
      );
    }
    if (scale.kind === "pct") {
      const bands = isNum(scale.bandsFor) && r.target === scale.bandsFor ? statusBands(scale.bandsFor, dom[0], dom[1]) : [];
      const d = r.selected ? 12 : 10;
      return (
        <span aria-hidden="true" className="relative block" style={{ height: BOX_H }}>
          <span className="absolute inset-x-0 rounded-[3px] overflow-hidden" style={{ top: (BOX_H - BAND_H) / 2, height: BAND_H, background: TRACK }}>
            {bands.map((b) => (
              <span key={b.status} className="absolute top-0 bottom-0"
                style={{ left: `${at(b.from, dom)}%`, width: `${at(b.to, dom) - at(b.from, dom)}%`, background: tint(STATUS_COLOR[b.status], 0.16) }} />
            ))}
          </span>
          {r.prior && isNum(r.prior.value) && (
            <span className="absolute w-[1.5px]" style={{ left: `calc(${at(r.prior.value, dom)}% - 0.75px)`, top: 2, bottom: 2, background: SUB }} />
          )}
          {marker}
          {isNum(r.value) && (
            <span className="absolute rounded-full" style={{
              width: d, height: d, top: (BOX_H - d) / 2, left: `calc(${on ? at(r.value, dom) : 0}% - ${d / 2}px)`,
              background: r.status && r.status !== "none" ? STATUS_COLOR[r.status] : INK, boxShadow: "0 0 0 2px #fff",
              transition: `left 640ms ${EASE} ${delay}`,
            }} />
          )}
        </span>
      );
    }
    // Rupees: the bar runs to the smaller of actual and proposed; the gap to the larger is shaded.
    const xv = isNum(r.value) && r.value > 0 ? at(r.value, dom) : 0;
    const xt = isNum(r.target) && r.target > 0 ? at(r.target, dom) : null;
    const lo = Math.min(xv, xt ?? xv), hi = Math.max(xv, xt ?? xv);
    const fill = (color: string) => (r.hatched ? { background: hatchFill(color), boxShadow: `inset 0 0 0 1px ${tint(color, 0.7)}` } : { background: color });
    return (
      <span aria-hidden="true" className="relative block" style={{ height: BOX_H }}>
        <span className="absolute inset-x-0 rounded-[3px] overflow-hidden" style={{ top: (BOX_H - BAR_H) / 2, height: BAR_H, background: TRACK }}>
          <span className="absolute left-0 top-0 bottom-0" style={{ ...fill(scale.bar.color), width: on ? `${lo}%` : "0%", transition: `width 620ms ${EASE} ${delay}` }} />
          {hi > lo && (
            <span className="absolute top-0 bottom-0" style={{
              ...fill(scale.gap.color), left: `${lo}%`, width: on ? `${hi - lo}%` : "0%", boxShadow: "inset 2px 0 0 #fff",
              transition: `width 520ms ${EASE} calc(${delay} + 300ms)`,
            }} />
          )}
        </span>
        {marker}
      </span>
    );
  };

  if (!rows.length) return <div ref={ref}><p className="text-[12px]" style={{ color: SUB }}>{empty}</p></div>;

  const axisLabel = scale.kind === "pct" ? `Axis from ${pctTick(scale.min)} to ${pctTick(scale.max)}`
    : scale.perRow ? "Each row on its own scale from zero" : `Bars from ${scale.format(0)} to ${scale.format(shared)}`;
  const axis = scale.kind === "pct" ? (
    pctTicks(scale.min, scale.max, trackPx).map((t, i, all) => (
      <span key={t} className={`absolute top-[2px] ${i === 0 ? "" : i === all.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
        style={{ left: `${at(t, [scale.min, scale.max])}%` }}>{pctTick(t)}</span>
    ))
  ) : scale.perRow ? (
    <span className="absolute left-0 top-[2px] whitespace-nowrap">each row on its own scale, from {scale.format(0)}</span>
  ) : (
    <>
      <span className="absolute left-0 top-[2px]">{scale.format(0)}</span>
      <span className="absolute right-0 top-[2px]">{scale.format(shared)}</span>
    </>
  );

  return (
    <div ref={ref}>
      {!panel && items.length > 0 && <div className="mb-2"><Legend items={items} /></div>}
      <div role="list" aria-label={`${ariaLabel}. ${axisLabel}.`} className="-mx-2">
        {fit.shown.map((r, i) => {
          const name = said(
            `${r.label}: ${r.valueLabel}`, r.note,
            isNum(r.target) ? r.targetLabel ?? `${scale.kind === "pct" ? "budget" : scale.marker.label} ${fmt(r.target)}` : null,
            r.prior && isNum(r.prior.value) ? `${r.prior.label} ${fmt(r.prior.value)}` : null,
            r.status && r.status !== "none" ? STATUS_LABEL[r.status] : null,
          );
          const style: React.CSSProperties = { height: fit.rowH, background: r.selected ? SEL_BG : undefined };
          const label = <span className="truncate" title={r.label} style={{ fontSize: LABEL_FS, color: INK, fontWeight: r.selected ? 700 : 600 }}>{r.label}</span>;
          const value = <span className="truncate font-semibold tabular-nums whitespace-nowrap" title={r.valueLabel} style={{ fontSize: VALUE_FS, color: INK }}>{r.valueLabel}</span>;
          const marks = annotated && (
            // On one line the words take the grid's second row, under the track's column.
            <span aria-hidden="true" className="relative block h-3 mt-0.5 tabular-nums whitespace-nowrap"
              style={{ fontSize: ANN_FS, color: SUB, ...(stacked ? {} : { gridColumn: 2 }) }}>
              {placeAnns(annsOf(r), trackPx).map((a) => (
                <span key={a.key} className="absolute top-0 leading-3" style={{ left: a.left, color: a.strong ? INK : SUB, fontWeight: a.strong ? 600 : 400 }}>{a.text}</span>
              ))}
            </span>
          );
          const cells = stacked ? (
            <>
              <span aria-hidden="true" className="flex items-baseline gap-2 min-w-0 leading-4">
                {label}
                {r.note && W >= NARROW_W && <span className="truncate min-w-0" title={r.note} style={{ fontSize: NOTE_FS, color: SUB }}>{r.note}</span>}
                <span className="ml-auto flex-shrink-0 max-w-[45%] flex">{value}</span>
              </span>
              <span className="block mt-1">{track(r, i)}</span>
              {marks}
            </>
          ) : (
            <>
              <span aria-hidden="true" className="flex min-w-0">{label}</span>
              {track(r, i)}
              <span aria-hidden="true" className="flex justify-end min-w-0">{value}</span>
              {marks}
            </>
          );
          const cls = `${stacked ? "flex flex-col justify-center" : "grid items-center gap-x-2.5"} w-full text-left rounded-[8px] px-2`;
          const gridStyle = stacked ? style : { ...style, gridTemplateColumns: cols };
          return (
            <div role="listitem" key={r.key}>
              {r.onClick ? (
                <button type="button" onClick={r.onClick} aria-label={name} title={name} className={`hcg-row ${cls}`} style={gridStyle}>{cells}</button>
              ) : (
                <div className={cls} style={gridStyle} title={name}><span className="sr-only">{name}</span>{cells}</div>
              )}
            </div>
          );
        })}
        {fit.hidden > 0 && <div className="px-2"><MoreRows n={fit.hidden} onMore={onMore} /></div>}
        <div aria-hidden="true" className={stacked ? "px-2" : "grid gap-x-2.5 px-2"} style={{ height: AXIS_H, ...(stacked ? {} : { gridTemplateColumns: cols }) }}>
          {!stacked && <span />}
          <span className="relative block h-full text-[10px] tabular-nums" style={{ color: SUB, borderTop: `1px solid ${LINE}` }}>{axis}</span>
          {!stacked && <span />}
        </div>
      </div>
      <RowStyles />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DotStrip
// ─────────────────────────────────────────────────────────────────────────────
export type Dot = {
  key: string;
  label: string;
  value: number | null;
  selected?: boolean;
  status?: Status;
  /** The dot becomes a button: select that hospital. */
  onClick?: () => void;
};

const DOT_R = 4.5, SEL_R = 7;
const LABEL_Y = 12, CAPTION_Y = 25, BAND_TOP = 34;
/** The line the network figure's label takes at the top of the band, which no dot enters. */
const REF_ROW_H = 12;

export function DotStrip({ dots, domain, format, reference, target, caption, ariaLabel }: {
  dots: Dot[];
  /** The fitted axis: [lo, hi]. */
  domain: [number, number];
  format: (v: number) => string;
  /** The network figure, a dashed line: { value: 97.55, label: "All units" }. */
  reference?: { value: number; label: string } | null;
  /** The selected unit's budget, a tick on the axis. */
  target?: { value: number; label: string } | null;
  /** Under the selected unit's label: "3 of 23, lowest first". */
  caption: string;
  ariaLabel: string;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(360);
  const [hover, setHover] = useState<string | null>(null);
  const W = panel ? panel.size.w : measured;
  // The dots start under the network figure's label, so however many units crowd round that
  // figure none is drawn over its words.
  const bandTop = BAND_TOP + (reference ? REF_ROW_H : 0);
  const H = panel ? Math.max(panel.size.h, bandTop + 40) : 132 + (reference ? REF_ROW_H : 0);
  const [lo, hi] = domain;
  const PL = 10, PR = 10;
  const yAxis = H - 18;
  const X = (v: number) => PL + ((clamp(v, lo, hi) - lo) / (hi - lo || 1)) * (W - PL - PR);
  const sel = dots.find((d) => d.selected && isNum(d.value)) ?? null;

  const others = dots.filter((d) => !d.selected && isNum(d.value));
  // Only what the face does not already say: the selected unit is named at its dot and the
  // network figure on its line, so the legend keys the status colours (the selected dot's too)
  // and the budget tick, and fits a span-4 panel's header or one line under it.
  const drawn = sel ? [...others, sel] : others;
  const legend: LegendItem[] = [
    ...STATUSES.filter((st) => drawn.some((d) => d.status === st)).map((st) => ({ key: st, label: STATUS_SHORT[st], color: STATUS_COLOR[st], shape: "dot" as const })),
    ...(others.some((d) => !d.status || d.status === "none") ? [{ key: "__all", label: sel ? "Other units" : "Units", color: tint(INK, 0.35), shape: "dot" as const }] : []),
    ...(target ? [{ key: "__target", label: `${target.label} ${format(target.value)}`, color: INK, shape: "tick" as const }] : []),
  ];
  usePanelLegend(legend);
  const hovered = dots.find((d) => d.key === hover) ?? null;
  usePanelReadout(hovered ? hovered.key : null, () => (hovered ? <span><b>{hovered.label}</b> {isNum(hovered.value) ? format(hovered.value) : "—"}</span> : null));

  // Units that would overlap step into lanes above and below the axis line, nearest first.
  const lanes = Math.max(1, Math.floor((yAxis - 6 - bandTop) / (2 * DOT_R + 1.5)));
  const yMid = (bandTop + yAxis - 6) / 2;
  const lastX: Record<number, number> = {};
  const placed = [...others]
    .sort((a, b) => (a.value as number) - (b.value as number))
    .map((d) => {
      const x = X(d.value as number);
      let lane = 0;
      for (let k = 0; k < lanes; k++) {
        const cand = k % 2 ? (k + 1) / 2 : -k / 2;
        if (lastX[cand] == null || x - lastX[cand] >= 2 * DOT_R + 1) { lane = cand; break; }
      }
      lastX[lane] = x;
      return { d, x, y: yMid + lane * (2 * DOT_R + 1.5) };
    });

  const selLabel = sel ? `${sel.label} ${format(sel.value as number)}` : "";
  const anchorAt = (x: number, w: number): "start" | "middle" | "end" => (x - w / 2 < PL ? "start" : x + w / 2 > W - PR ? "end" : "middle");
  const sx = sel ? X(sel.value as number) : 0;
  const refX = reference ? X(reference.value) : 0;
  const refText = reference ? `${reference.label} ${format(reference.value)}` : "";
  const refAnchor = reference && refX > W / 2 ? "end" : "start";
  const button = (d: Dot) => (d.onClick ? {
    role: "button", tabIndex: 0, "aria-label": `${d.label} ${isNum(d.value) ? format(d.value) : "—"}. Select ${d.label}`,
    onClick: d.onClick,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); d.onClick?.(); } },
    onFocus: () => setHover(d.key), onBlur: () => setHover(null), style: { cursor: "pointer", outline: "none" },
  } : {});

  return (
    <div ref={ref}>
      {!panel && <div className="mb-2"><Legend items={legend} /></div>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="group" aria-label={`${ariaLabel}. ${caption}`} style={{ display: "block" }}
        onMouseLeave={() => setHover(null)}>
        {sel && (
          <>
            <text x={sx} y={LABEL_Y} textAnchor={anchorAt(sx, textW(selLabel, 11.5))} style={{ fontSize: 11.5, fontWeight: 700, fill: INK }}>{selLabel}</text>
            <text x={sx} y={CAPTION_Y} textAnchor={anchorAt(sx, textW(caption, 10))} style={{ fontSize: 10, fill: SUB }}>{caption}</text>
            <line x1={sx} y1={CAPTION_Y + 3} x2={sx} y2={yMid - SEL_R} stroke={INK} strokeWidth={1} opacity={0.35} />
          </>
        )}
        <line x1={PL} y1={yAxis} x2={W - PR} y2={yAxis} stroke={LINE} strokeWidth={1} />
        <text x={PL} y={H - 4} textAnchor="start" style={{ fontSize: 10, fill: SUB }}>{format(lo)}</text>
        <text x={W - PR} y={H - 4} textAnchor="end" style={{ fontSize: 10, fill: SUB }}>{format(hi)}</text>
        {/* The label is read out: the legend no longer names the network figure. */}
        {reference && (
          <g>
            <line aria-hidden="true" x1={refX} y1={BAND_TOP} x2={refX} y2={yAxis} stroke={INK} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
            <text x={refAnchor === "end" ? refX - 4 : refX + 4} y={BAND_TOP + REF_ROW_H - 3} textAnchor={refAnchor}
              style={{ fontSize: 10, fill: INK, paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>{refText}</text>
          </g>
        )}
        {target && <line aria-hidden="true" x1={X(target.value)} y1={yAxis - 7} x2={X(target.value)} y2={yAxis + 4} stroke={INK} strokeWidth={2} />}
        {placed.map(({ d, x, y }, i) => (
          <g key={d.key} {...button(d)} onMouseEnter={() => setHover(d.key)}>
            <title>{`${d.label}: ${format(d.value as number)}`}</title>
            <circle cx={x} cy={y} r={9} fill="transparent" />
            <circle cx={x} cy={y} r={hover === d.key ? DOT_R + 1.5 : DOT_R}
              fill={d.status && d.status !== "none" ? STATUS_COLOR[d.status] : tint(INK, 0.35)} fillOpacity={hover && hover !== d.key ? 0.45 : 0.85}
              stroke={hover === d.key ? INK : "#fff"} strokeWidth={1}
              style={{ opacity: on ? 1 : 0, transition: `opacity 400ms ease ${80 + i * 15}ms` }} />
          </g>
        ))}
        {sel && (
          <g {...button(sel)} onMouseEnter={() => setHover(sel.key)}>
            <title>{`${sel.label}: ${format(sel.value as number)}`}</title>
            <circle cx={sx} cy={yMid} r={SEL_R} fill={sel.status && sel.status !== "none" ? STATUS_COLOR[sel.status] : INK} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  );
}
