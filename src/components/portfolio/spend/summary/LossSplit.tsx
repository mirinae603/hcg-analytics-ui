"use client";
// Spend Summary — "Where margin was missed": the cash & TPA margin missed and the scheme margin missed side by
// side, each split by material type (onco · non-onco · consumables) and by patient type (IP ·
// OP). They are different measures for different patients, so each column has its own scale
// from zero (printed under it) and nothing is added across columns. One label column serves
// both, which keeps the bars long enough to read in a third of a one-screen row. Each column is
// a button that opens its section's breakdown, with exact rupees.
//
// Panel-aware like the ledger charts: in a ChartPanel the rows share the body's height; outside
// one they take their full height.
import React from "react";
import { RowStyles, useArmed, INK, SUB, LINE, TRACK, EASE } from "@/components/portfolio/ledger/kit";
import { usePanel } from "@/components/portfolio/ledger/panel";
import { useWidth } from "@/components/portfolio/ledger/minis";
import { isNum } from "@/components/portfolio/ledger/format";
import { clamp, niceCeil, textW } from "@/components/portfolio/ledger/scale";

export type SplitRow = {
  key: string;
  /** On the face: "Onco", "IP". */
  label: string;
  /** In full, for the tooltip and the accessible name: "Inpatient (IP)". */
  title: string;
  /** Rows of one group sit together, a hairline away from the next group. */
  group: string;
};

export type SplitColumn = {
  key: string;
  /** "Cash & TPA". */
  title: string;
  color: string;
  /** Each row's amount by row key; missing where the section has none. */
  values: Record<string, number | null | undefined>;
  format: (v: number) => string;
  /** Opens the column's breakdown. */
  onOpen: () => void;
};

const LABEL_FS = 11.5, VALUE_FS = 11, HEAD_FS = 11, AXIS_FS = 10;
const HEAD_H = 18, AXIS_H = 14, GROUP_GAP = 7;
const ROW_MIN = 14, ROW_MAX = 28;
/** Between the label column and each figure column; inside a column, its padding and the gap
 *  between a bar and its figure. */
const COL_GAP = 10, COL_PAD = 6, CELL_GAP = 6;

const said = (c: SplitColumn, v: number | null | undefined) => (isNum(v) ? c.format(v) : "—");

/** The hairline between two groups of rows, in every column at the same height. */
function GroupGap() {
  return <span aria-hidden="true" className="block" style={{ height: GROUP_GAP, background: `linear-gradient(${LINE},${LINE}) center / 100% 1px no-repeat` }} />;
}

export function LossSplit({ rows, columns, ariaLabel, empty = "Nothing in this selection." }: {
  rows: SplitRow[];
  columns: SplitColumn[];
  ariaLabel: string;
  empty?: string;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(360);
  const W = panel ? panel.size.w : measured;
  const breaks = rows.map((r, i) => i > 0 && r.group !== rows[i - 1].group);
  const room = panel ? panel.size.h - HEAD_H - AXIS_H - breaks.filter(Boolean).length * GROUP_GAP : Infinity;
  const rowH = clamp(Math.floor(room / Math.max(1, rows.length)), ROW_MIN, ROW_MAX);
  const barH = clamp(Math.round(rowH * 0.42), 6, 12);
  const labelW = clamp(Math.max(0, ...rows.map((r) => textW(r.label, LABEL_FS))) + 6, 32, W * 0.3);
  const inner = Math.max(0, (W - labelW - COL_GAP * columns.length) / Math.max(1, columns.length) - 2 * COL_PAD);

  if (!rows.length) return <div ref={ref}><p className="text-[12px]" style={{ color: SUB }}>{empty}</p></div>;

  const lines = (cell: (r: SplitRow, i: number) => React.ReactNode) => rows.map((r, i) => (
    <React.Fragment key={r.key}>
      {breaks[i] && <GroupGap />}
      {cell(r, i)}
    </React.Fragment>
  ));

  return (
    <div ref={ref} role="group" aria-label={ariaLabel} className="flex" style={{ gap: COL_GAP }}>
      <span aria-hidden="true" className="block flex-shrink-0" style={{ width: labelW }}>
        <span className="block" style={{ height: HEAD_H }} />
        {lines((r) => (
          <span className="block truncate" title={r.title} style={{ height: rowH, lineHeight: `${rowH}px`, fontSize: LABEL_FS, color: INK, fontWeight: 500 }}>{r.label}</span>
        ))}
      </span>
      {columns.map((c, ci) => {
        const max = niceCeil(Math.max(0, ...rows.map((r) => c.values[r.key]).filter(isNum)));
        const valueW = clamp(Math.max(0, ...rows.map((r) => textW(said(c, c.values[r.key]), VALUE_FS))) + 4, 28, inner * 0.55);
        const barW = inner - valueW - CELL_GAP;
        // The scale's start is printed only when both ends have room; bars start at zero anyway.
        const zero = barW >= textW(c.format(0), AXIS_FS) + textW(c.format(max), AXIS_FS) + 8;
        const name = `${c.title}: ${rows.map((r) => `${r.title} ${said(c, c.values[r.key])}`).join(", ")}. Bars from ${c.format(0)} to ${c.format(max)}. Opens the breakdown`;
        return (
          <button key={c.key} type="button" onClick={c.onOpen} aria-label={name} aria-haspopup="dialog"
            className="hcg-row block flex-1 min-w-0 text-left rounded-[8px]" style={{ paddingLeft: COL_PAD, paddingRight: COL_PAD }}>
            <span className="block truncate font-semibold" title={c.title} style={{ height: HEAD_H, lineHeight: `${HEAD_H}px`, fontSize: HEAD_FS, color: INK }}>{c.title}</span>
            {lines((r, i) => {
              const v = c.values[r.key];
              const w = isNum(v) && v > 0 ? (v / max) * 100 : 0;
              return (
                <span className="flex items-center" title={`${r.title}: ${said(c, v)}`} style={{ height: rowH, gap: CELL_GAP }}>
                  <span className="relative block flex-1 min-w-0 rounded-[3px]" style={{ height: barH, background: TRACK }}>
                    <span className="absolute left-0 top-0 bottom-0 rounded-[3px]"
                      style={{ width: on ? `${w}%` : "0%", background: c.color, transition: `width 620ms ${EASE} ${80 + (ci * rows.length + i) * 30}ms` }} />
                  </span>
                  <span className="flex-shrink-0 truncate text-right font-semibold tabular-nums" style={{ width: valueW, fontSize: VALUE_FS, color: INK }}>{said(c, v)}</span>
                </span>
              );
            })}
            <span className="flex" style={{ height: AXIS_H, gap: CELL_GAP }}>
              <span className="relative block flex-1 min-w-0 tabular-nums" style={{ borderTop: `1px solid ${LINE}`, fontSize: AXIS_FS, color: SUB }}>
                {zero && <span className="absolute left-0 top-[1px] whitespace-nowrap">{c.format(0)}</span>}
                <span className="absolute right-0 top-[1px] whitespace-nowrap">{c.format(max)}</span>
              </span>
              <span className="block flex-shrink-0" style={{ width: valueW }} />
            </span>
          </button>
        );
      })}
      <RowStyles />
    </div>
  );
}
