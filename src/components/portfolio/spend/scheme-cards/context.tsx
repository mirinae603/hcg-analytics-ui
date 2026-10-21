"use client";
// Spend Analysis — what every tile on the Scheme overview shares: its words, the selection a
// tile is computed under, and the Method tab every drawer ends with. The colours are the Spend
// pages' own (../shared): the spend on the brand used (USED_COL), the same quantity at the
// suggested brand's price (PROPOSED_COL), the margin missed in rupees (LOSS_COL) and its %
// (RATE_COL). The strip on top of a tile says its topic.
import React from "react";
import { SUB, num } from "@/components/portfolio/ledger/kit";
import { DrawerSection, type DrawerFilter } from "@/components/portfolio/ledger/DetailDrawer";
import { dayLabel } from "@/components/portfolio/ledger/format";
import { monthLabel, monthsLabel } from "../../formulary/api";
import type { TrendRow } from "../Trend";
import type { Filters, Meta, Overview } from "../api";

export { USED_COL, PROPOSED_COL, LOSS_COL, RATE_COL, SCHEME_COL, HOSPITAL_COL, BRAND_COL, DOCTOR_COL } from "../shared";

// The tiles' words, in plain terms (spent, with suggested brands, margin missed); HCG's own
// report calls them Actual, Proposed, Margin loss and Loss %.
type Words = {
  section: string;
  title: string;
  /** The headline tile's bridge, from the spend on the brands used to the suggested brands'. */
  bridge: string;
  /** The spend on the brands used, and the same quantity at the suggested brand's price. */
  actual: string;
  proposed: string;
  /** The difference and its %. */
  loss: string;
  pct: string;
  /** After a %: "36.55% missed". */
  pctWord: string;
  /** The brand the list names. */
  sug: string;
  /** For "a brand with a suggestion". */
  aSug: string;
};

export const WORDS: Words = {
  section: "Scheme", title: "Scheme patients: margin missed", bridge: "Spent vs with suggested brands",
  actual: "Spent", proposed: "With suggested brands", loss: "Margin missed", pct: "% missed", pctWord: "missed",
  sug: "suggested", aSug: "a",
};

/** The selection a tile's figures are computed under, in the words a tile prints. */
export type Scope = {
  where: string;
  when: string;
  /** All hospitals together (no hospital selected). */
  network: boolean;
  /** A tile's context line: "KR Bangalore · Aug-26 · scheme patients". */
  context: string;
  asOf: string | null;
};

export function scopeOf(d: Overview, meta: Meta): Scope {
  const plant = d.scope?.plant;
  const network = !plant || plant === "ALL";
  const where = !plant || plant === "ALL" ? "All hospitals" : (d.scope.his_name || d.scope.plant_name || plant);
  const when = monthsLabel(meta, d.scope?.months || []);
  return { where, when, network, context: `${where} · ${when} · scheme patients`, asOf: dayLabel(d.data_as_of || meta.built_at) };
}

/** The filters a drawer's figure was computed under, shown read-only in its header. */
export function filterChips(f: Filters, s: Scope, meta: Meta, payer = "Scheme patients (GOV)"): DrawerFilter[] {
  const material = f.segment === "ALL" ? "All types" : (meta.categories?.find((c) => c.key === f.segment)?.label ?? f.segment);
  return [
    { label: "Hospital", value: s.where },
    { label: "Month", value: s.when },
    { label: "Patients", value: f.type === "ALL" ? "IP + OP" : f.type },
    { label: "Material", value: material },
    { label: "Payer", value: payer },
  ];
}

/** Every published month as HCG's trend rows: the trend ignores the Month filter, and the
 *  months in the selection are shaded wherever it is drawn. A month's % may arrive as
 *  `saving_pct` or, from an older API, as `pct`. */
export function monthRows(d: Overview, meta: Meta): TrendRow[] {
  return (d.trend || []).map((r) => ({
    period: r.period, label: r.label || monthLabel(meta, r.period),
    actual: r.used_value, proposed: r.suggested_value, loss: r.saving_missed, pct: r.saving_pct ?? r.pct ?? null,
  }));
}

/** The Method tab every drawer on these pages ends with: what this figure counts, then how
 *  every figure on the page is built (sources, sums, the API's own notes). */
export function MethodTab({ d, meta, lines }: { d: Overview; meta: Meta; lines: React.ReactNode[] }) {
  const notes = Array.from(new Set([...(d.notes || []), ...(meta.notes || [])]));
  const sl = meta.scheme_list;
  const list = (items: React.ReactNode[]) => (
    <ul className="space-y-1.5 text-[12.5px] leading-relaxed list-disc pl-5" style={{ color: SUB }}>
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
  return (
    <>
      <DrawerSection title="This figure">{list(lines)}</DrawerSection>
      <DrawerSection title="How these figures are built">
        {list([
          <>Source: HIS IP + OP pharmacy sales lines (the same monthly files as Formulary Compliance) and HCG&apos;s scheme suggested-brand list
            {sl?.file ? <> ({sl.file}, sheet SCHEME{sl.financial_year ? `, FY ${sl.financial_year}` : ""})</> : null}
            {sl?.switches != null ? <>, which names a cheaper brand for {num(sl.switches)} brands{sl.attis_switches != null ? <> ({num(sl.attis_switches)} of them Attis)</> : null}</> : null}.</>,
          "Every figure is summed for the selection and the % is taken once — never an average of hospital or monthly percentages.",
          ...notes,
        ])}
      </DrawerSection>
    </>
  );
}

