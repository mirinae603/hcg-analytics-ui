"use client";
// Spend Analysis — the drawer piece every Cash & TPA tile shares: Method, a drawer's Method tab
// (the tile's own method, then how every figure is built). The exact-rupee tables are the
// Spend pages' DataTable (../DataTable); the tiles' faces are the ledger's charts (RankBars,
// Waterfall, MonthCombo, DotStrip).
import React from "react";
import { SUB } from "@/components/portfolio/ledger/kit";
import { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import type { Ctx } from "./context";

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
          <li>Source: HIS IP + OP pharmacy sales lines (the same monthly files as Formulary Compliance) and
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
