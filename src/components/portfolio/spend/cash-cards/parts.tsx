"use client";
// Spend Analysis — the drawer pieces the Cash & TPA / Out of formulary tiles share:
//   DataTable — the exact-rupee tables the drawers carry.
//   Method    — a drawer's Method tab: the tile's own method, then how every figure is built.
// The tiles' faces are the ledger's charts (RankBars, Waterfall, MonthCombo, DotStrip, PartBar).
import React from "react";
import { INK, SUB, LINE, RULE, SEL_BG } from "@/components/portfolio/ledger/kit";
import { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import type { Ctx } from "./context";

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

/** A drawer's Method tab: what this tile's figure is, then how every figure here is built. */
export function Method({ c, children }: { c: Ctx; children: React.ReactNode }) {
  const list = c.meta.cash_list;
  return (
    <>
      <DrawerSection title="This figure">
        <div className="space-y-3 text-[12.5px] leading-relaxed" style={{ color: SUB }}>{children}</div>
      </DrawerSection>
      <DrawerSection title="How these figures are built">
        <ul className="space-y-1.5 text-[12.5px] leading-relaxed list-disc pl-5" style={{ color: SUB }}>
          <li>Source: HIS IP + OP pharmacy sales lines (the same monthly files as Formulary Compliance)
            {c.kind === "oof" ? <>, each month&apos;s Item Master (OUT OF FORMULARY flag and Minor Group) and the prices in </> : <> and </>}
            HCG&apos;s cash &amp; TPA suggested-brand list
            {list?.file ? <> ({list.file}, sheet CASH&amp;TPA{list.financial_year ? `, FY ${list.financial_year}` : ""})</> : null}.</li>
          <li>Every figure is summed for the selection and the % is taken once, never an average of hospital or monthly percentages.</li>
          <li>Charts print rupees in lakhs; the drawers print exact rupees with paise.</li>
          {(c.d.notes || []).map((t) => <li key={t}>{t}</li>)}
          {c.asOf && <li>Data as of {c.asOf}.</li>}
        </ul>
      </DrawerSection>
    </>
  );
}
