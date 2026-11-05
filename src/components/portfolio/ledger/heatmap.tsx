"use client";
// Heatmap — a table whose cells are washed by where each figure stands in its own column: HCG's
// unit table (every unit's sales, margin, compliance and what it missed) read at a glance. Every
// cell prints its figure; the wash only says how it compares with the other rows, never stands
// in for the number.
//
// Each column is scaled on its own (rupees and percentages are never on one scale), and the wash
// follows the column's good direction:
//   good "up"   — the best value in the column the deepest SAGE, the worst the deepest coral,
//                 the middle of the column's range nearly white;
//   good "down" — the same, the other way round (a loss: the largest is the worst);
//   no direction, with a colour — a size: the largest the deepest wash of that colour;
//   neither     — no wash (a budget, a label).
// A cell can carry its own tone instead (a compliance status from status.ts), and a short mark
// printed before its figure (✓ met, ~ within, ✕ below), because two status tints can be too
// close to tell apart: the mark is what reads, the tone only backs it. A column of statuses can
// be washed by its tones alone (`toneOnly`), so a cell with no status is left white instead of
// taking a rank wash that would read as one. Text on a wash is ink or white, whichever reads
// (inkOn). A missing figure is "—", never washed.
//
// The header sticks to the top and the row names to the left while the table scrolls inside a
// one-screen panel; in a drawer the table takes its natural height up to `maxHeight`. A row with
// `onClick` is a button (its name is the focusable control; the whole row takes the pointer).
//
// Inside a panel the table is sized to fit it: the row names take the width the figure columns
// leave (between NAME_MIN and `labelWidth`, the name truncating with its full form as a tooltip),
// so the last column is never cut by a few pixels; and the rows share the height the header
// leaves, measured, since a long header wraps to a third line. Only a panel narrower than the
// figure columns themselves scrolls sideways.
//
// For a table on the face of a one-screen overview, two options:
//   dense — a header in sentence case, 11px figures and rows down to 16px, so a whole list (every
//           unit in HCG's list) fits a panel two rows tall. Only when the rows do not fit even
//           then does the body scroll, under its header. A column can print its unit on a second
//           header line (`sub`: "%", "₹ L"), so its figures need not repeat it: the header, not
//           the figure, is then what sets a column's width, and the names keep the rest.
//   split — a 100% bar under each row's name, of figures of the row that are columns of the
//           table too (a unit's formulary, out-of-formulary and non-formulary shares): the split
//           at a glance, the figures beside it. Those columns carry the bar's colour key as a
//           strip under their header (`swatch`), so no separate legend is needed. The bar takes
//           the name's width, which a column of its own would have to take from the names.
import React from "react";
import { INK, SUB, LINE, RULE, CARD, SAGE, CORAL_MARK, SEL_BG, TRACK, RowStyles, hatchFill, inkOn, tint } from "./kit";
import { usePanel } from "./panel";
import { useSize } from "./minis";
import { isNum } from "./format";
import { clamp } from "./scale";

/** One part of a row's split bar: a figure of the row (by its key in `values`), a share of the
 *  whole the bar stands for, in its series colour (hatched for a part outside a ratio). */
export type HeatPart = { key: string; label: string; color: string; hatched?: boolean };

export type HeatColumn = {
  key: string;
  /** The header, short: "OOF %". `title` has the long form. */
  label: string;
  title?: string;
  format: (v: number) => string;
  /** Which way is better in this column; null for a size or a reference figure. */
  good?: "up" | "down" | null;
  /** The wash of a size column (good null). Ignored when the column has a direction. */
  color?: string;
  /** Washed only by its cells' own tones (a status); a cell without one is not washed. */
  toneOnly?: boolean;
  /** Min width in px, its padding included; the figures are right-aligned in it. Inside a panel
   *  the row names get what these leave, so a column narrower than its header's longest word or
   *  its widest figure takes width the names were promised and cuts the last column: set it to
   *  fit both. */
  width?: number;
  /** A colour key under the header: the part of the split bar this column's figures are. */
  swatch?: { color: string; hatched?: boolean };
  /** A second header line under the label: the unit the figures are in ("%", "₹ L"). */
  sub?: string;
};

export type HeatRow = {
  key: string;
  label: string;
  /** A second line under the name (its region), shown when the row has room. */
  sub?: string;
  values: Record<string, number | null | undefined>;
  /** A cell's own wash colour (a status), in place of the column's scale. */
  tones?: Record<string, string | null | undefined>;
  /** A short mark printed before a cell's figure ("✓"): the status in a form that reads
   *  without its colour. Decorative to a screen reader, which hears the cell's note. */
  marks?: Record<string, string | null | undefined>;
  /** A cell's tooltip: why it is blank, what its status is. */
  notes?: Record<string, string | null | undefined>;
  selected?: boolean;
  /** Selects the row (a hospital); the name becomes a button. */
  onClick?: () => void;
  /** Why the row cannot be selected, as its tooltip, when it has no onClick. */
  why?: string;
};

/** The deepest wash a cell gets: ink still reads on it (inkOn picks white past it). */
const MAX_ALPHA = 0.62;
/** A status tone is a flat wash: it says a state, not a position. */
const TONE_ALPHA = 0.2;
/** A status tone's wash, for a legend key that matches the cells. */
export const heatTone = (color: string) => tint(color, TONE_ALPHA);
/** The header's least height (two lines of 10px capitals); a longer header is measured. */
const HEAD_H = 34;
const ROW_MIN = 19, ROW_MAX = 30;
/** The same in a dense table: one line of 11px header (a second for units is measured), rows
 *  from 16px to 28px. */
const DENSE_HEAD_H = 22;
const DENSE_ROW_MIN = 16, DENSE_ROW_MAX = 28;
/** A header's colour key: a strip this tall along its foot. */
const SWATCH_H = 3;
/** A column's width when it sets none. */
const COL_W = 64;
/** The narrowest the row names get inside a panel before the table scrolls sideways instead
 *  (a dense table's names give a little more, for its figures). */
const NAME_MIN = 96, DENSE_NAME_MIN = 84;
/** Kept free beside the columns' widths: browsers set the same text a few pixels apart. */
const NAME_SLACK = 8;
/** Kept free as well when the rows will scroll: a classic scrollbar's width (an overlay one takes
 *  none, and the names lose only these few pixels), so the vertical scroll never brings a
 *  sideways one with it. */
const SCROLLBAR_W = 16;

type Range = { lo: number; hi: number };

/** Each column's spread over the rows that have a figure. */
function rangesOf(columns: HeatColumn[], rows: HeatRow[]): Record<string, Range | null> {
  const out: Record<string, Range | null> = {};
  for (const c of columns) {
    const v = rows.map((r) => r.values[c.key]).filter(isNum);
    out[c.key] = v.length ? { lo: Math.min(...v), hi: Math.max(...v) } : null;
  }
  return out;
}

/** A cell's wash, or null for none. */
function washOf(c: HeatColumn, v: number | null | undefined, range: Range | null, tone?: string | null): string | null {
  if (!isNum(v)) return null;
  if (tone) return tint(tone, TONE_ALPHA);
  if (c.toneOnly || !range || range.hi - range.lo < 1e-9) return null;
  const t = (v - range.lo) / (range.hi - range.lo);
  if (c.good === "up" || c.good === "down") {
    // How good the cell is, 0 (worst in the column) to 1 (best); the middle of the range is white.
    const g = c.good === "up" ? t : 1 - t;
    const k = Math.abs(g - 0.5) * 2;
    return k < 0.04 ? null : tint(g >= 0.5 ? SAGE : CORAL_MARK, k * MAX_ALPHA);
  }
  return c.color ? tint(c.color, Math.max(0.04, t * MAX_ALPHA)) : null;
}

/** A row's split bar: each part's share of their sum, laid end to end on a track, a 1px surface
 *  gap between neighbours, the hatched ones (outside a ratio) outlined. A row with none of the
 *  parts draws the bare track. Decorative: the figures are the row's own columns. */
function SplitBar({ parts, values, height }: { parts: readonly HeatPart[]; values: HeatRow["values"]; height: number }) {
  const amounts = parts.map((p) => { const v = values[p.key]; return { p, v: isNum(v) && v > 0 ? v : 0 }; });
  const total = amounts.reduce((t, a) => t + a.v, 0);
  let at = 0;
  const laid = amounts.map((a) => { const share = total > 0 ? (a.v / total) * 100 : 0; const left = at; at += share; return { ...a, share, left }; });
  const lastKey = [...laid].reverse().find((a) => a.share > 0)?.p.key;
  return (
    <span aria-hidden="true" className="relative block w-full rounded-[3px] overflow-hidden" style={{ height, background: TRACK }}>
      {laid.map((a) => a.share > 0 && (
        <span key={a.p.key} className="absolute top-0 bottom-0" style={{
          left: `${a.left}%`, width: `${a.share}%`, background: a.p.hatched ? hatchFill(a.p.color) : a.p.color,
          boxShadow: [a.p.key !== lastKey ? "inset -1px 0 0 #fff" : null, a.p.hatched ? `inset 0 0 0 1px ${tint(a.p.color, 0.7)}` : null].filter(Boolean).join(", ") || undefined,
        }} />
      ))}
    </span>
  );
}

/** A header's colour key, as a strip along its foot: solid, or hatched for a part outside a ratio. */
const swatchFill = (s: { color: string; hatched?: boolean }) => (s.hatched ? hatchFill(s.color) : s.color);

export function Heatmap({ columns, rows, ariaLabel, labelHeader = "Unit", labelWidth = 168, maxHeight = 560, dense = false, split, empty = "Nothing in this selection." }: {
  columns: HeatColumn[];
  rows: HeatRow[];
  /** The table's caption, for screen readers: "Every unit, Aug-26". */
  ariaLabel: string;
  /** The row names' column header. */
  labelHeader?: string;
  labelWidth?: number;
  /** Outside a panel: the table scrolls inside this height (px). */
  maxHeight?: number;
  /** One-line header, 11px figures and shorter rows: a whole list on one screen. */
  dense?: boolean;
  /** A 100% bar under each row's name, of these figures of the row. */
  split?: readonly HeatPart[];
  empty?: string;
}) {
  const panel = usePanel();
  const headMin = dense ? DENSE_HEAD_H : HEAD_H;
  // The header row's own height, as drawn: a header wrapped to a third line is taller than HEAD_H.
  const [headRef, head] = useSize<HTMLTableCellElement>({ w: 0, h: headMin });
  const ranges = rangesOf(columns, rows);
  const room = panel ? panel.size.h - Math.max(headMin, head.h) : Infinity;
  const [rowMin, rowMax] = dense ? [DENSE_ROW_MIN, DENSE_ROW_MAX] : [ROW_MIN, ROW_MAX];
  const rowH = Number.isFinite(room) ? clamp(Math.floor(room / Math.max(1, rows.length)), rowMin, rowMax) : dense ? 22 : 26;
  const twoLine = !dense && rowH >= 30;
  const figuresW = columns.reduce((t, c) => t + (c.width ?? COL_W), 0);
  const scrolls = Number.isFinite(room) && room < rows.length * rowMin;
  const nameW = panel ? clamp(Math.floor(panel.size.w - figuresW - NAME_SLACK - (scrolls ? SCROLLBAR_W : 0)), dense ? DENSE_NAME_MIN : NAME_MIN, labelWidth) : labelWidth;
  // The split bar under a name: thinner in a short row, so the name keeps its line.
  const splitH = split ? (rowH >= 20 ? 4 : rowH >= 18 ? 3 : 2) : 0;
  const headCls = dense ? "text-[11px] font-semibold leading-[12px] whitespace-nowrap" : "text-[10px] font-semibold leading-[1.15] uppercase";
  const headSpacing = dense ? undefined : ".04em";
  // A dense row is as tall as rowH says, not as the page's line height would make it.
  const cellFs = dense ? "text-[11px] leading-[13px]" : "text-[10.5px]";
  const cellPx = dense ? "px-[3px]" : "px-1";

  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>{empty}</p>;

  return (
    <div className={`hcg-heat ${panel ? "absolute inset-0" : "relative"} overflow-auto rounded-[8px]`} style={panel ? undefined : { maxHeight }}
      tabIndex={0} role="region" aria-label={`${ariaLabel} (scrolls)`}>
      <table className="border-separate tabular-nums" style={{ borderSpacing: 0, minWidth: "100%" }}>
        <caption className="sr-only">{ariaLabel}. Each figure is washed by where it stands in its column: green to red, best to worst, where the column has a better direction; deeper for more where it is an amount.</caption>
        <thead>
          <tr>
            <th ref={headRef} scope="col" className={`sticky top-0 left-0 z-[3] text-left align-bottom px-2 ${dense ? `pb-1 ${headCls}` : "pb-1.5 text-[10px] font-semibold uppercase"}`}
              style={{ background: CARD, color: SUB, height: headMin, minWidth: nameW, maxWidth: nameW, letterSpacing: dense ? undefined : ".06em", borderBottom: `1px solid ${RULE}` }}>
              {labelHeader}
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" title={c.title ?? c.label}
                className={`sticky top-0 z-[2] text-right align-bottom ${cellPx} ${dense ? "pb-1" : "pb-1.5"} ${headCls}`}
                style={{ background: CARD, color: SUB, height: headMin, minWidth: c.width ?? COL_W, letterSpacing: headSpacing, borderBottom: `1px solid ${RULE}` }}>
                {c.label}
                {c.sub && <span className="block font-normal">{c.sub}</span>}
                {c.swatch && <span aria-hidden="true" className="absolute left-1 right-1 bottom-0 rounded-full" style={{ height: SWATCH_H, background: swatchFill(c.swatch) }} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const bg = r.selected ? SEL_BG : CARD;
            return (
              <tr key={r.key} onClick={r.onClick} className={r.onClick ? "hcg-heat-row cursor-pointer" : undefined}
                title={r.onClick ? undefined : r.why}>
                <th scope="row" className={`sticky left-0 z-[1] text-left font-normal px-0 ${dense ? "leading-[13px]" : ""}`} style={{ background: bg, height: rowH, minWidth: nameW, maxWidth: nameW, borderBottom: `1px solid ${LINE}` }}>
                  {r.onClick ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); r.onClick?.(); }} aria-pressed={!!r.selected}
                      aria-label={`${r.label}${r.selected ? " (selected): show all hospitals" : ": select this hospital"}`}
                      className={`hcg-row flex flex-col justify-center w-full text-left rounded-[6px] ${dense ? "px-1.5" : "px-2"}`} style={{ height: rowH - 2 }}>
                      <RowName r={r} twoLine={twoLine} split={split} splitH={splitH} />
                    </button>
                  ) : (
                    <span className={`block ${dense ? "px-1.5" : "px-2"}`}><RowName r={r} twoLine={twoLine} split={split} splitH={splitH} /></span>
                  )}
                </th>
                {columns.map((c) => {
                  const v = r.values[c.key];
                  const wash = washOf(c, v, ranges[c.key], r.tones?.[c.key]);
                  const note = r.notes?.[c.key];
                  const mark = isNum(v) ? r.marks?.[c.key] : null;
                  return (
                    <td key={c.key} title={note ?? undefined} className={`text-right ${cellPx} ${cellFs} whitespace-nowrap`}
                      style={{
                        height: rowH, background: wash ?? bg, color: wash ? inkOn(wash) : isNum(v) ? INK : SUB,
                        fontWeight: r.selected ? 700 : 500, borderBottom: `1px solid ${LINE}`, boxShadow: wash ? "inset 0 0 0 1px #fff" : undefined,
                      }}>
                      {mark && <span aria-hidden="true" className="mr-1 font-bold">{mark}</span>}
                      {isNum(v) ? c.format(v) : "—"}
                      {note && <span className="sr-only">. {note}</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <RowStyles />
      <style jsx global>{`
        .hcg-heat:focus-visible{outline:2px solid ${INK};outline-offset:-2px}
        .hcg-heat-row:hover td{filter:brightness(.97)}
      `}</style>
    </div>
  );
}

function RowName({ r, twoLine, split, splitH }: { r: HeatRow; twoLine: boolean; split?: readonly HeatPart[]; splitH: number }) {
  return (
    // With a split bar the name keeps a 12px line: room for its descenders, and with the bar
    // still inside a 16px row.
    <span className={`block min-w-0 ${split ? "leading-[12px]" : "leading-tight"}`}>
      <span className="block truncate text-[11.5px]" title={r.label} style={{ color: INK, fontWeight: r.selected ? 700 : 500 }}>{r.label}</span>
      {split && <span className="block mt-px"><SplitBar parts={split} values={r.values} height={splitH} /></span>}
      {twoLine && r.sub && <span className="block truncate text-[10px]" style={{ color: SUB }}>{r.sub}</span>}
    </span>
  );
}

/** The legend a heat-map's panel prints: what the washes mean. */
export const HEAT_LEGEND = [
  { key: "good", label: "Better in its column", color: tint(SAGE, MAX_ALPHA) },
  { key: "bad", label: "Worse", color: tint(CORAL_MARK, MAX_ALPHA) },
];
