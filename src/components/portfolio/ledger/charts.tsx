"use client";
// The charts HCG's own dashboards are built from, drawn the ledger way (divs and hand SVG, no
// chart library):
//   StackBars  — every hospital (or segment, or payer) as one 100% bar split into its parts,
//                HCG's "Unit Inventory Distribution". A row is a button that opens that row.
//   MonthCombo — a bar per month from zero (its parts stacked, or two alternatives one over the
//                other), with the month's % as a line that rides the bar tops, each point
//                labelled: HCG's "Actual vs Budget" charts, the line on top of the bars.
// Both are panel-aware: inside a one-screen ChartPanel they fill the panel's body, hand their
// legend (and MonthCombo its hover readout) to the panel header, and a list shows the rows that
// fit and ends on "+N more". In a drawer they keep their own legend, readout and height.
// A legend always prints, and words stay in ink: colour only says which series a mark is.
import React from "react";
import { Hatch, Readout, RowStyles, hatchFill, useArmed, useSlots, inkOn, tint, CARD, INK, SUB, LINE, TRACK, EASE, SEL_BG } from "./kit";
import { Legend, type LegendItem } from "./legend";
import { useWidth } from "./minis";
import { MoreRows, fitRows, groupHeads, headH, GroupCaption, usePanel, usePanelLegend, usePanelReadout } from "./panel";
import { isNum, lakhs, pct } from "./format";
import { clamp, niceCeil, niceMax, textW } from "./scale";

// The legend now lives in its own module (the panel draws it too); re-exported so existing
// imports stand.
export { Swatch, Legend, type LegendItem } from "./legend";

// ─────────────────────────────────────────────────────────────────────────────
// StackBars
// ─────────────────────────────────────────────────────────────────────────────
export type StackSegment = { key: string; label: string; color: string; hatched?: boolean };
export type StackRow = {
  key: string;
  label: string;
  /** Each segment's amount by segment key (rupees, counts); the bar shows each one's share of
   *  their sum. A negative amount has no share of a whole and is drawn as nothing. */
  values: Record<string, number | null | undefined>;
  /** A % the row is judged against (its budget), ticked on the 0–100% axis. */
  target?: number | null;
  /** A short figure after the bar: the row's total, or its own %. */
  aside?: string;
  selected?: boolean;
  /** Rows of one group sit together under its name ("Material", "Payer"), a hairline apart. */
  group?: string;
};

const LABEL_MIN_PX = 28;
/** The 0% · 50% · 100% axis under the rows: 4px above, 14px of labels, 2px below. */
const STACK_AXIS_H = 20;
/** The least height of a row in a panel. */
const STACK_ROW_MIN = 16;

type Share = { seg: StackSegment; v: number; share: number; left: number };

/** Each segment's amount, its share of the row's total (%) and where it starts on the bar. */
function sharesOf(segments: StackSegment[], values: StackRow["values"]): { total: number; shares: Share[] } {
  const amounts = segments.map((seg) => { const raw = values[seg.key]; return { seg, v: isNum(raw) && raw > 0 ? raw : 0 }; });
  const total = amounts.reduce((t, a) => t + a.v, 0);
  let at = 0;
  const shares = amounts.map((a) => {
    const share = total > 0 ? (a.v / total) * 100 : 0;
    const left = at;
    at += share;
    return { ...a, share, left };
  });
  return { total, shares };
}

/** One row's 100% bar and its target tick. Decorative: the row carries the words. */
function StackBar({ shares, target, targetLabel, barPx, barH, format, on, index }: {
  shares: Share[]; target?: number | null; targetLabel: string; barPx: number; barH: number; format: (v: number) => string; on: boolean; index: number;
}) {
  const lastKey = [...shares].reverse().find((p) => p.share > 0)?.seg.key;
  return (
    <span aria-hidden="true" className="relative block" style={{ height: barH }}>
      <span className="absolute inset-0 rounded-[4px] overflow-hidden" style={{ background: TRACK }}>
        <span className="absolute inset-0 block" style={{
          transformOrigin: "left", transform: on ? "scaleX(1)" : "scaleX(0)",
          transition: `transform 620ms ${EASE} ${Math.min(index, 12) * 25}ms`,
        }}>
          {shares.map((p) => p.share > 0 && (
            <span key={p.seg.key} title={`${p.seg.label}: ${pct(p.share, 1)} · ${format(p.v)}`}
              className="absolute top-0 bottom-0 flex items-center justify-center overflow-hidden text-[10.5px] font-semibold tabular-nums"
              style={{
                left: `${p.left}%`, width: `${p.share}%`,
                background: p.seg.hatched ? hatchFill(p.seg.color) : p.seg.color,
                color: p.seg.hatched ? INK : inkOn(p.seg.color),
                // A 2px surface gap between neighbouring segments; a hatched one is outlined.
                boxShadow: [p.seg.key !== lastKey ? "inset -2px 0 0 #fff" : null, p.seg.hatched ? `inset 0 0 0 1px ${tint(p.seg.color, 0.7)}` : null]
                  .filter(Boolean).join(", ") || undefined,
              }}>
              {(p.share / 100) * barPx >= LABEL_MIN_PX && barH >= 12 ? `${Math.round(p.share)}%` : null}
            </span>
          ))}
        </span>
      </span>
      {isNum(target) && (
        <span className="absolute w-[2px] -top-[3px] -bottom-[3px]" title={`${targetLabel} ${target}%`}
          style={{ left: `calc(${clamp(target, 0, 100)}% - 1px)`, background: INK }} />
      )}
    </span>
  );
}

export function StackBars({
  segments, rows, onRow, onMore, format = lakhs, ariaLabel, targetLabel = "Budget", maxHeight = 440, labelWidth = 176, asideWidth = 68,
  empty = "Nothing in this selection.",
}: {
  segments: StackSegment[];
  rows: StackRow[];
  /** Opens a row (a hospital); every row becomes a button. */
  onRow?: (key: string) => void;
  /** In an interactive panel: opens the full list from "+N more". */
  onMore?: () => void;
  /** Prints an amount in a row's accessible name and tooltips. */
  format?: (v: number) => string;
  /** What the list shows, for screen readers. */
  ariaLabel: string;
  /** What the target tick is, in the legend and each row's name. */
  targetLabel?: string;
  /** Outside a panel (a drawer): the rows scroll inside this height (px), the axis pinned
   *  under them. In a panel the rows fit the body instead. */
  maxHeight?: number;
  labelWidth?: number;
  asideWidth?: number;
  empty?: string;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(640);
  const W = panel ? panel.size.w : measured;
  const hasTarget = rows.some((r) => isNum(r.target));
  const hasAside = rows.some((r) => r.aside);
  const legend: LegendItem[] = [
    ...segments.map((s) => ({ key: s.key, label: s.label, color: s.color, hatched: s.hatched })),
    ...(hasTarget ? [{ key: "__target", label: targetLabel, color: INK, shape: "tick" as const }] : []),
  ];
  usePanelLegend(rows.length ? legend : null);

  // Fixed tracks, so every row's bar starts and ends at the same x.
  const labelPx = clamp(W * 0.3, 96, labelWidth);
  const cols = `${labelPx}px minmax(0,1fr)${hasAside ? ` ${asideWidth}px` : ""}`;
  // The bar's own width: the row less its label, aside and the 12px gaps between them.
  const barPx = Math.max(0, W - labelPx - (hasAside ? asideWidth + 24 : 12));
  // In a panel the rows that fit the body over the axis; in a drawer every row, 30px each.
  const room = panel ? panel.size.h - STACK_AXIS_H : Infinity;
  const headsH = (withNames: boolean) => groupHeads(rows, rows, withNames).reduce((h, g) => h + headH(g), 0);
  // Where every row fits without the group names over them but not with them (a 1440×900
  // screen: Onco, Non-onco, Cash, TPA, GOV under "Material" and "Payer"), the groups keep only
  // their hairline: each row's label already says which cut it is, and no payer goes to "+N more".
  const named = rows.length * STACK_ROW_MIN + headsH(true) <= room || rows.length * STACK_ROW_MIN + headsH(false) > room;
  const fit = fitRows(rows, room, {
    minH: STACK_ROW_MIN, maxH: 30, extra: (shown) => groupHeads(shown, rows, named).reduce((h, g) => h + headH(g), 0),
  });
  const heads = groupHeads(fit.shown, rows, named);
  const barH = clamp(fit.rowH - 8, 10, 20);
  const rowCls = "relative grid items-center gap-x-3 w-full text-left rounded-[8px] px-2";

  const list = (
    <>
      {!panel && <div className="mb-3"><Legend items={legend} /></div>}
      <div role="list" aria-label={ariaLabel} tabIndex={onRow || panel ? undefined : 0}
        className={`-mx-2 rounded-[8px] focus-visible:outline focus-visible:outline-2 ${panel ? "overflow-hidden" : "overflow-y-auto"}`}
        style={panel ? undefined : { maxHeight }}>
        {fit.shown.map((r, i) => {
          const { total, shares } = sharesOf(segments, r.values);
          const name = [
            r.label,
            total > 0 ? shares.filter((p) => p.v > 0).map((p) => `${p.seg.label} ${pct(p.share, 1)} (${format(p.v)})`).join(", ") : "nothing recorded",
            isNum(r.target) ? `${targetLabel} ${r.target}%` : null,
            r.aside ?? null,
          ].filter(Boolean).join(". ");
          const cells = (
            <>
              <span aria-hidden="true" className="truncate text-[12px]" title={r.label} style={{ color: INK, fontWeight: r.selected ? 700 : 500 }}>{r.label}</span>
              <StackBar shares={shares} target={r.target} targetLabel={targetLabel} barPx={barPx} barH={barH} format={format} on={on} index={i} />
              {hasAside && <span aria-hidden="true" className="text-[11.5px] text-right tabular-nums whitespace-nowrap" style={{ color: INK }}>{r.aside ?? "—"}</span>}
            </>
          );
          const rowStyle: React.CSSProperties = { gridTemplateColumns: cols, height: fit.rowH, background: r.selected ? SEL_BG : undefined };
          const head = heads[i];
          return (
            <div role="listitem" key={r.key}>
              {head && <GroupCaption head={head} />}
              {onRow ? (
                <button type="button" onClick={() => onRow(r.key)} aria-label={`${name}. Opens ${r.label}`}
                  className={`hcg-row ${rowCls}`} style={rowStyle}>{cells}</button>
              ) : (
                <div className={rowCls} style={rowStyle}><span className="sr-only">{name}</span>{cells}</div>
              )}
            </div>
          );
        })}
        {fit.hidden > 0 && <div className="px-2"><MoreRows n={fit.hidden} onMore={onMore} /></div>}
        <div aria-hidden="true" className={`grid gap-x-3 px-2 ${panel ? "pt-1 pb-0.5" : "pt-1.5 pb-1 sticky bottom-0"}`} style={{ gridTemplateColumns: cols, background: CARD }}>
          <span />
          <span className="relative block h-[14px] text-[10px] tabular-nums" style={{ color: SUB, borderTop: `1px solid ${LINE}` }}>
            <span className="absolute left-0 top-[2px]">0%</span>
            <span className="absolute left-1/2 top-[2px] -translate-x-1/2">50%</span>
            <span className="absolute right-0 top-[2px]">100%</span>
          </span>
          {hasAside && <span />}
        </div>
      </div>
    </>
  );

  // The measured wrapper always renders: its width is read once, on mount.
  return (
    <div ref={ref}>
      {rows.length ? list : <p className="text-[12px]" style={{ color: SUB }}>{empty}</p>}
      <RowStyles />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MonthCombo
// ─────────────────────────────────────────────────────────────────────────────
export type ComboSeries = { key: string; label: string; color: string; hatched?: boolean };
export type ComboMonth = {
  key: string;
  label: string;
  /** Each series' value this month, by series key; null where the month has none. */
  values: Record<string, number | null | undefined>;
  /** The month's % for the line (e.g. compliance %, % missed). */
  pct?: number | null;
  selected?: boolean;
};
export type ComboLine = {
  label: string;
  color?: string;
  /** Decimals in the point labels; 1 unless set. */
  decimals?: number;
};
/** A constant target. On the bars' scale it is drawn dashed across the plot; a % target (the
 *  line's) has no scale to be drawn on, so the line's legend names it. */
export type ComboTarget = { value: number; label: string; axis: "bars" | "line" };
/** How a month's series make its bar:
 *    parts        — they add up, stacked into one bar (formulary + out of formulary);
 *    alternatives — two measures of one thing (margin earned vs margin possible), drawn over
 *                   each other from zero, the larger behind, so the gap between them shows;
 *    group        — side by side. */
export type ComboLayout = "parts" | "alternatives" | "group";

const PILL_H = 15;
const BAR_FS = 10;
const MONTH_FS = 10.5;
const TICK_FS = 9.5;
/** Months a trend panel shows: a year, ending at the selected month. */
const PANEL_WINDOW = 12;

/** The `n` months ending at the last selected one (or the latest), keeping `n` when the
 *  selection is near the start. */
function trailing<T extends { selected?: boolean }>(rows: T[], n: number): T[] {
  if (rows.length <= n) return rows;
  let end = rows.length - 1;
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].selected) { end = i; break; }
  const start = Math.max(0, end - n + 1);
  return rows.slice(start, start + n);
}

type Seg = { key: string; x: number; w: number; from: number; to: number; color: string; hatched?: boolean };

/** Bars per month with the month's % as a line that RIDES THE BAR TOPS: each point sits on top of
 *  its month's bar and is labelled with that month's %, so the line and the bars always move
 *  together (HCG asked for the line "on top of the bar"). The bars are read on the left scale;
 *  the % is read from the labels, never from a second scale. */
export function MonthCombo({ months: every, series, layout = "parts", format = lakhs, line, target, ariaLabel, height, window: span }: {
  months: ComboMonth[];
  /** One to three series, in the order they stack (bottom first) or stand. */
  series: ComboSeries[];
  layout?: ComboLayout;
  /** Prints a bar's value, its axis ticks and the readout. */
  format?: (v: number) => string;
  line?: ComboLine;
  target?: ComboTarget | null;
  ariaLabel: string;
  /** Outside a panel; 300 unless set. A panel's chart takes the body's height. */
  height?: number;
  /** How many months to draw, ending at the selected one: 12 in a panel, all of them elsewhere. */
  window?: number;
}) {
  const panel = usePanel();
  const on = useArmed();
  const uid = React.useId().replace(/:/g, "");
  // Drawn at its real width, so text stays 10–11px however wide the card is.
  const [ref, measured] = useWidth<HTMLDivElement>(640);
  const months = trailing(every, span ?? (panel ? PANEL_WINDOW : every.length));
  const W = panel ? panel.size.w : measured;
  const H = panel ? panel.size.h : height ?? 300;
  const n = Math.max(months.length, 1), k = Math.max(series.length, 1);
  const dec = line?.decimals ?? 1;
  const lineCol = line?.color ?? INK;

  // Each month's bar: its values, how far it reaches up and down, and its top (where the line
  // point sits): the stack's end for parts, the largest value otherwise.
  const bars = months.map((m) => {
    const vals = series.map((s) => m.values[s.key]);
    const nums = vals.filter(isNum);
    const up = nums.filter((v) => v > 0).reduce((a, b) => a + b, 0);
    const down = nums.filter((v) => v < 0).reduce((a, b) => a + b, 0);
    const top = !nums.length ? null
      : layout === "parts" ? (up > 0 ? up : down)
      : nums.some((v) => v > 0) ? Math.max(...nums) : Math.min(...nums);
    return { vals, nums, up, down, top };
  });
  const any = bars.some((b) => b.nums.length > 0);

  // Bars from zero; a negative value extends the axis below it. A panel rounds the axis on the
  // finer ladder: its height is scarce.
  const ceil = panel ? niceCeil : niceMax;
  const reach = layout === "parts" ? bars.flatMap((b) => [b.up, b.down]) : bars.flatMap((b) => b.nums);
  const onBars = target?.axis === "bars" ? [target.value] : [];
  const top = ceil(Math.max(0, ...reach, ...onBars));
  const low = Math.min(0, ...reach, ...onBars);
  const bottom = low < 0 ? -ceil(-low) : 0;
  const ticks = [...(bottom < 0 ? [bottom] : []), 0, top / 2, top].filter((t, i, a) => a.indexOf(t) === i);

  const points = months.map((m, i) => (line && isNum(m.pct) && bars[i].top != null ? { pct: m.pct, top: bars[i].top as number } : null));
  const hasLine = points.some((p) => p != null);

  // A panel sizes its margins to what they hold; a drawer keeps the fixed ones it always had. With
  // a line the top keeps room for the value box over the highest point.
  const PL = panel ? Math.ceil(Math.max(...ticks.map((t) => textW(format(t), TICK_FS)))) + 12 : 66;
  const PR = panel ? 8 : 14;
  const PT = hasLine ? PILL_H + 10 : panel ? 18 : 30;
  const slotW = Math.max(1, (W - PL - PR) / n);
  // Month labels that do not fit their slot tilt in a drawer; in a panel, where height is
  // scarce, every k-th one prints instead (counted back from the latest), and the readout
  // names the month under the pointer.
  const labelW = Math.max(0, ...months.map((m) => textW(m.label, MONTH_FS)));
  const tilt = !panel && slotW < 46;
  const stride = panel && labelW + 6 > slotW ? Math.ceil((labelW + 6) / slotW) : 1;
  const PB = panel ? 20 : tilt ? 50 : 28;
  const PH = Math.max(1, H - PT - PB);
  const { hi, onMove, onLeave } = useSlots(W, PL, slotW, n);
  const Y = (v: number) => PT + ((top - v) / (top - bottom || 1)) * PH;
  const y0 = Y(0);
  const showTarget = target?.axis === "bars";

  // One bar per month for parts and alternatives; a group of bars side by side otherwise.
  const colW = layout === "group" ? Math.min(slotW * 0.74, k * 46) : Math.min(slotW * 0.62, 44);
  const gap = layout === "group" && k > 1 ? clamp(colW * 0.05, 1, 4) : 0;
  const bw = layout === "group" ? Math.max(1, (colW - gap * (k - 1)) / k) : colW;
  const cx = (i: number) => PL + i * slotW + slotW / 2;

  /** A month's bars as segments from one value to another, in drawing order. */
  const segsOf = (i: number): Seg[] => {
    const b = bars[i];
    const left = cx(i) - colW / 2;
    if (layout === "parts") {
      let upAt = 0, downAt = 0;
      return series.flatMap((s, j) => {
        const v = b.vals[j];
        if (!isNum(v) || v === 0) return [];
        const from = v > 0 ? upAt : downAt;
        if (v > 0) upAt += v; else downAt += v;
        return [{ key: s.key, x: left, w: colW, from, to: from + v, color: s.color, hatched: s.hatched }];
      });
    }
    if (layout === "alternatives") {
      // The larger behind at full width, each smaller one narrower in front of it.
      const order = series.map((s, j) => ({ s, v: b.vals[j] })).filter((x): x is { s: ComboSeries; v: number } => isNum(x.v))
        .sort((a, c) => Math.abs(c.v) - Math.abs(a.v));
      return order.map(({ s, v }, r) => {
        const w = colW * (order.length > 1 ? 1 - (0.5 * r) / (order.length - 1) : 1);
        return { key: s.key, x: cx(i) - w / 2, w, from: 0, to: v, color: s.color, hatched: s.hatched };
      });
    }
    return series.flatMap((s, j) => {
      const v = b.vals[j];
      return isNum(v) ? [{ key: s.key, x: left + j * (bw + gap), w: bw, from: 0, to: v, color: s.color, hatched: s.hatched }] : [];
    });
  };

  // Without a line, a bar's figure goes above it when it fits its share of the month, else
  // upright inside a bar tall enough, else it is left to the readout; every month is labelled only
  // when every label fits. With a line the points carry the month's %, and the rupees are in the
  // readout and the drawer, so the bars stay unlabelled.
  const aboveW = layout === "group" && k > 1 ? bw + gap : slotW - 6;
  const place = (sg: Seg): "above" | "inside" | "none" => {
    const v = sg.to - sg.from;
    const tw = textW(format(v), BAR_FS);
    if (layout !== "parts" || series.length === 1) { if (tw <= aboveW) return "above"; }
    if (sg.w >= BAR_FS + 3 && Math.abs(Y(sg.to) - Y(sg.from)) >= tw + 10) return "inside";
    return "none";
  };
  const fits = !hasLine && months.every((_, i) => segsOf(i).every((sg) => place(sg) !== "none"));
  const anySel = months.some((m) => m.selected);
  // The month that keeps its figures, name and % where the others' are left out: the hovered
  // one, else the latest selected. Only one: under "All months" every month is selected, and
  // each keeping its own would overprint its neighbours in a narrow panel.
  const lastSel = months.map((m) => !!m.selected).lastIndexOf(true);
  const lastPoint = points.map((p) => p != null).lastIndexOf(true);
  const focus = hi ?? (lastSel >= 0 ? lastSel : null);
  const labelled = (i: number) => !hasLine && (fits || i === focus);
  const pillW = (p: number) => textW(pct(p, dec), TICK_FS) + 10;
  const pillsAll = hasLine && points.every((p) => p == null || pillW(p.pct) <= slotW - 2);
  const pillShown = (i: number) => pillsAll || i === (focus ?? lastPoint);
  const strideShows = (i: number) => (n - 1 - i) % stride === 0;
  const monthShown = (i: number) => stride === 1 || (focus != null ? i === focus || (Math.abs(i - focus) >= stride && strideShows(i)) : strideShows(i));
  const a = hi != null ? months[hi] : null;
  const fmt = (v: number | null | undefined) => (isNum(v) ? format(v) : "—");
  const fillOf = (sg: Seg) => (sg.hatched ? `url(#mc-${uid}-${sg.key})` : sg.color);

  const legend: LegendItem[] = [
    ...series.map((s) => ({ key: s.key, label: s.label, color: s.color, hatched: s.hatched })),
    ...(hasLine && line ? [{ key: "__line", label: target?.axis === "line" ? `${line.label} · ${target.label}` : line.label, color: lineCol, shape: "line" as const }] : []),
    ...(showTarget && target ? [{ key: "__target", label: target.label, color: INK, shape: "dashed" as const }] : []),
  ];
  usePanelLegend(any ? legend : null);
  const readoutOf = (m: ComboMonth) => (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <b>{m.label}</b>
      <span>—{" "}
        {series.map((s, j) => <React.Fragment key={s.key}>{j ? " · " : ""}{s.label} <b>{fmt(m.values[s.key])}</b></React.Fragment>)}
        {hasLine && line && <> · {line.label} <b>{pct(m.pct, dec)}</b></>}
      </span>
    </span>
  );
  usePanelReadout(a ? a.key : null, () => (a ? readoutOf(a) : null));

  // The line: from each month's point to the next month's, both on their bar tops.
  const segs: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 1; i < months.length; i++) {
    const p = points[i - 1], q = points[i];
    if (p && q) segs.push({ key: months[i].key, x1: cx(i - 1), y1: Y(p.top), x2: cx(i), y2: Y(q.top) });
  }

  // The measured wrapper always renders: its width is read once, on mount.
  if (!any) return <div ref={ref}><p className="text-[12px]" style={{ color: SUB }}>No months in this selection.</p></div>;

  return (
    <div ref={ref}>
      {!panel && <Legend items={legend} />}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", marginTop: panel ? 0 : 8, cursor: "crosshair" }}
        onMouseMove={onMove} onMouseLeave={onLeave} role="img" aria-label={ariaLabel}>
        {series.some((s) => s.hatched) && (
          <defs>{series.filter((s) => s.hatched).map((s) => <Hatch key={s.key} id={`mc-${uid}-${s.key}`} color={s.color} opacity={0.85} />)}</defs>
        )}
        {months.map((m, i) => m.selected && (
          <rect key={`s-${m.key}`} x={PL + i * slotW + 2} y={4} width={slotW - 4} height={PT + PH + (panel ? 18 : tilt ? 14 : 22) - 4} rx={8} fill="rgba(22,32,28,.045)" />
        ))}
        {ticks.map((t) => (
          <g key={`t-${t}`}>
            <line x1={PL} y1={Y(t)} x2={W - PR} y2={Y(t)} stroke={LINE} strokeWidth="1" />
            <text x={PL - 8} y={Y(t) + 3.5} textAnchor="end" style={{ fontSize: TICK_FS, fill: SUB }}>{format(t)}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const act = hi === i;
          const isSel = !!m.selected;
          const labelStyle = { fontWeight: isSel || act ? 700 : 500, fill: isSel || act ? INK : SUB };
          const delay = 80 + i * 35;
          const txt = { fontSize: BAR_FS, fontWeight: 700, opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" } as const;
          return (
            <g key={m.key} style={{ opacity: hi == null || act ? 1 : 0.5, transition: "opacity 170ms" }}>
              {segsOf(i).map((sg) => {
                const y1 = Y(Math.max(sg.from, sg.to)), y2 = Y(Math.min(sg.from, sg.to));
                const where = labelled(i) ? place(sg) : "none";
                const v = sg.to - sg.from;
                return (
                  <g key={sg.key}>
                    {/* A 1px card-coloured edge parts the stacked and overlaid bars. */}
                    <rect x={sg.x} y={on ? y1 : y0} width={sg.w} height={on ? y2 - y1 : 0} rx={Math.min(3, sg.w / 3)} fill={fillOf(sg)}
                      stroke={CARD} strokeWidth={layout === "group" ? 0 : 1} opacity={!anySel || isSel ? 1 : 0.45}
                      style={{ transition: `y 640ms ${EASE} ${delay}ms, height 640ms ${EASE} ${delay}ms` }} />
                    {where === "above" && (
                      <text x={sg.x + sg.w / 2} y={v >= 0 ? y1 - 5 : y2 + BAR_FS + 3} textAnchor="middle" style={{ ...txt, fill: INK }}>{format(v)}</text>
                    )}
                    {where === "inside" && (
                      <text x={sg.x + sg.w / 2 + BAR_FS * 0.36} y={v >= 0 ? y2 - 6 : y1 + 6} textAnchor={v >= 0 ? "start" : "end"}
                        transform={`rotate(-90 ${sg.x + sg.w / 2 + BAR_FS * 0.36} ${v >= 0 ? y2 - 6 : y1 + 6})`}
                        style={{ ...txt, fill: sg.hatched ? INK : inkOn(sg.color) }}>{format(v)}</text>
                    )}
                  </g>
                );
              })}
              {tilt ? (
                <text x={cx(i)} y={PT + PH + 12} textAnchor="end" transform={`rotate(-40 ${cx(i)} ${PT + PH + 12})`}
                  style={{ fontSize: TICK_FS, ...labelStyle }}>{m.label}</text>
              ) : monthShown(i) && (
                <text x={cx(i)} y={PT + PH + (panel ? 14 : 17)} textAnchor="middle" style={{ fontSize: MONTH_FS, ...labelStyle }}>{m.label}</text>
              )}
            </g>
          );
        })}
        <line x1={PL} y1={y0} x2={W - PR} y2={y0} stroke={INK} strokeWidth="1" />
        {showTarget && target && (
          <g>
            <line x1={PL} y1={Y(target.value)} x2={W - PR} y2={Y(target.value)} stroke={INK} strokeWidth="1" strokeDasharray="5 4" opacity={0.7} />
            <text x={W - PR - 2} y={Y(target.value) - 5} textAnchor="end" style={{ fontSize: 10, fill: INK, fontWeight: 600 }}>{target.label}</text>
          </g>
        )}
        {hasLine && (
          <g style={{ opacity: on ? 1 : 0, transition: "opacity 500ms ease 650ms" }}>
            {segs.map((sg) => <line key={sg.key} x1={sg.x1} y1={sg.y1} x2={sg.x2} y2={sg.y2} stroke={lineCol} strokeWidth={2} strokeLinecap="round" />)}
            {points.map((p, i) => {
              if (!p) return null;
              const px = cx(i), py = Y(p.top), txt = pct(p.pct, dec), pw = pillW(p.pct);
              // The month's % in a box just above its point, on top of its bar.
              const by = py - 6 - PILL_H;
              return (
                <g key={`l-${months[i].key}`}>
                  <circle cx={px} cy={py} r={3.8} fill={CARD} stroke={lineCol} strokeWidth={2} />
                  {pillShown(i) && (
                    <g>
                      <rect x={px - pw / 2} y={by} width={pw} height={PILL_H} rx={4} fill={CARD} stroke={lineCol} strokeOpacity={0.45} strokeWidth={0.8} />
                      <text x={px} y={by + PILL_H - 4} textAnchor="middle" style={{ fontSize: TICK_FS, fontWeight: 700, fill: INK }}>{txt}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </svg>
      {!panel && (
        <Readout k={hi ?? "idle"} dark>
          {a ? readoutOf(a) : (
            <span style={{ color: SUB }}>
              bars from 0{layout === "parts" && k > 1 ? ", parts stacked" : layout === "alternatives" ? ", the larger behind" : ""}
              {hasLine && line ? ` · the line joins the bar tops; each point is labelled with ${line.label}` : ""}
              {anySel ? " · shaded = months in your selection" : ""}
            </span>
          )}
        </Readout>
      )}
    </div>
  );
}
