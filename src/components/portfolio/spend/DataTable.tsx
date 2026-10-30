"use client";
// Spend Analysis — the exact-rupee table every overview drawer carries (a hospital ranking, a
// split, a top list): words left, figures right, a row printed bold on a wash for a total or the
// selected hospital. The faces of the tiles are the ledger's charts; the drawers print these.
import React from "react";
import { INK, SUB, LINE, RULE, SEL_BG } from "@/components/portfolio/ledger/kit";

export type Col<R> = {
  label: string;
  render: (r: R) => React.ReactNode;
  /** Text columns read left; figures right. */
  align?: "left" | "right";
  /** Long names wrap instead of widening the table. */
  wrap?: boolean;
};

export function DataTable<R>({ rows, rowKey, cols, caption, strong, minWidth = 560, empty = "Nothing in this selection." }: {
  rows: R[];
  rowKey: (r: R) => string;
  cols: Col<R>[];
  /** What the table lists, for screen readers. */
  caption: string;
  /** A row printed bold on a wash: a total, or the selected hospital. */
  strong?: (r: R) => boolean;
  minWidth?: number;
  empty?: string;
}) {
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>{empty}</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[12.5px] tabular-nums" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.label} scope="col" className={`px-2 py-2 text-[10px] font-semibold uppercase whitespace-nowrap ${c.align === "left" ? "text-left" : "text-right"}`}
                style={{ color: SUB, letterSpacing: ".06em", borderBottom: `1px solid ${RULE}` }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = strong?.(r) ?? false;
            return (
              <tr key={rowKey(r)} style={{ background: s ? SEL_BG : undefined }}>
                {cols.map((c) => (
                  <td key={c.label} className={`px-2 py-[7px] align-top ${c.align === "left" ? "text-left" : "text-right"} ${c.wrap ? "min-w-[180px]" : "whitespace-nowrap"}`}
                    style={{ color: INK, fontWeight: s ? 700 : undefined, borderBottom: `1px solid ${LINE}` }}>{c.render(r)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
