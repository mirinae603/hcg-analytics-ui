"use client";
// Spend Analysis — the month-by-month pieces every section's drawers share: HCG's table under
// each month chart, one row per month with the base amounts (Actual, Proposed, Loss, % missed),
// so a % never stands without the amounts it is a share of. The chart itself is the ledger's
// MonthCombo. Every month is our own figure from the HIS sales lines.
import React from "react";
import { INK, SUB, LINE, RULE, SEL_BG } from "@/components/portfolio/ledger/kit";

export type TrendRow = {
  period: string;
  label: string;
  actual: number | null;
  proposed: number | null;
  loss: number | null;
  pct: number | null;
};

/** One column of a month table. */
export type MonthCol<R> = { label: string; render: (r: R) => React.ReactNode };

/** HCG's table under each chart: one row per month, oldest first. */
export function MonthTable<R extends { period: string; label: string }>({ rows, cols, selected }: {
  rows: R[]; cols: MonthCol<R>[]; selected: Set<string>;
}) {
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>No months in this selection.</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[12px] tabular-nums" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 560 }}>
        <thead>
          <tr>
            <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase whitespace-nowrap" style={{ color: SUB, letterSpacing: ".08em", borderBottom: `1px solid ${RULE}` }}>Month</th>
            {cols.map((c, i) => (
              <th key={i} className="px-2 py-2 text-right text-[10px] font-semibold uppercase whitespace-nowrap" style={{ color: SUB, letterSpacing: ".06em", borderBottom: `1px solid ${RULE}` }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sel = selected.has(r.period);
            return (
              <tr key={r.period} style={{ background: sel ? SEL_BG : undefined }}>
                <td className="px-2 py-[7px] whitespace-nowrap" style={{ borderBottom: `1px solid ${LINE}` }}>
                  <span style={{ color: INK, fontWeight: sel ? 700 : 600 }}>{r.label}</span>
                </td>
                {cols.map((c, i) => (
                  <td key={i} className="px-2 py-[7px] text-right whitespace-nowrap align-top"
                    style={{ color: INK, borderBottom: `1px solid ${LINE}` }}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
