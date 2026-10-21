"use client";
// The two "where is the out-of-formulary spend" panels on the Overview: the five brands and the
// five doctors with the most out-of-formulary spend, as bars from zero in lakhs, each with its
// share of all out-of-formulary spend in the selection. They ask the very endpoints the Items
// and Doctors tabs page through, for one page of five sorted by that spend (the ledger's
// useTopRows), so every figure matches those tabs row for row. The drawer (TopListDrawer) lists
// the five in exact rupees and opens the full tab, where each row drills further.
import React from "react";
import { useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { TOP_N, TopListDrawer, useTopRows, type TablePage } from "@/components/portfolio/ledger/toplist";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { SKELETON, SUB } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { OOF_COL } from "../parts";
import { HowBuilt, MethodText, filterChips, type OverviewScope } from "./shared";
import { effectiveMethod, filterParams, type View } from "../api";

type ItemRow = {
  material: string; material_desc: string | null; generic_name: string | null; manufacturer: string | null;
  formulary_class: string; cost: number; qty: number; lines: number; share_pct: number | null; hospitals: number;
};
type DoctorRow = {
  doctor_id: string; doctor_name: string | null; plant: string; hospital_name: string | null;
  formulary: number; out_of_formulary: number; non_formulary: number; total?: number | null; compliance_pct: number | null;
  oof_share_pct: number | null; lines: number;
};

/** A ranked row before it is drawn: the label, an optional second line, the value, its share. */
type Ranked = { key: string; label: string; sub?: string | null; value: number; share: number | null };

// The share prints beside the amount, not under it: a row of a 1440×900 panel has one line.
const toBars = (rows: Ranked[]): RankRow[] => rows.map((r) => ({
  key: r.key, label: r.label, sub: r.sub ?? undefined, value: r.value, valueLabel: `${lakhs(r.value)} · ${pct(r.share, 1)}`,
}));

/** The panel's body while the page of five loads, or when it fails. */
function TopBody({ rows, error, loading, empty, ariaLabel }: { rows: Ranked[]; error: string | null; loading: boolean; empty: string; ariaLabel: string }) {
  if (error) return <p className="text-[12px]" style={{ color: SUB }}>Couldn&apos;t load: {error}</p>;
  if (loading) {
    return (
      <div aria-hidden="true" className="flex flex-col justify-around h-full">
        {Array.from({ length: TOP_N }, (_, i) => <div key={i} className="h-[12px] rounded-md animate-pulse" style={{ background: SKELETON }} />)}
      </div>
    );
  }
  return <RankBars ariaLabel={ariaLabel} rows={toBars(rows)} format={lakhs} color={OOF_COL} empty={empty} />;
}

function rankedLabel(title: string, context: string, rows: Ranked[], tail: string | null): string {
  return [title, context, ...rows.map((r, i) => `${i + 1}. ${r.label}, ${lakhs(r.value)}, ${pct(r.share, 1)} of all out-of-formulary spend`), tail]
    .filter(Boolean).join(". ");
}

/** What the five are compared with: how many rows hold all out-of-formulary spend, and the
 *  amount each row's % is a share of ("top 5 of 312 items · % of ₹ 16.39 L"). */
function tailOf(page: TablePage<unknown> | null, field: string, noun: string): string | null {
  if (!page || !page.total) return null;
  const all = page.sums?.[field];
  return `top ${Math.min(TOP_N, page.data.length)} of ${num(page.total)} ${noun}${isNum(all) ? ` · % of ${lakhs(all)}` : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brands
// ─────────────────────────────────────────────────────────────────────────────
export function TopItemsTile({ s, place }: { s: OverviewScope; place: Place }) {
  const dr = useDrawer();
  // The Items tab's query for out-of-formulary items (group B), first page of five.
  const { page, error } = useTopRows<ItemRow>("/formulary/items", { Plant: s.plant, ...filterParams(s.filters), Group: "B" }, "cost");
  const rows: Ranked[] = (page?.data ?? []).map((r) => ({
    key: `${r.material}|${r.formulary_class}`, label: r.material_desc || r.material, sub: r.generic_name, value: r.cost, share: r.share_pct,
  }));
  const tail = tailOf(page, "cost", "items");
  const title = "Top out-of-formulary brands";
  const go = (v: View) => { dr.close(); s.onOpen(v); };

  return (
    <>
      <ChartPanel id="top-brands" title={title} context={tail ?? s.context} accent={OOF_COL} place={place}
        label={rankedLabel(title, s.context, rows, tail)} onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        <TopBody rows={rows} error={error} loading={!page && !error} empty="No out-of-formulary spend in this selection."
          ariaLabel={`${title}, ${s.context}`} />
      </ChartPanel>

      <TopListDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab}
        eyebrow="Out of formulary · Overview" title={`${title} · ${s.where}`}
        kpi={isNum(page?.sums?.cost) ? { value: rupeesExact(page?.sums?.cost), comparator: `out of formulary across ${num(page?.total)} items` } : undefined}
        asOf={s.asOf} filters={filterChips(s, { method: false })}
        listTitle={`The ${TOP_N} largest`} listNote="Share = the item's value ÷ all out-of-formulary spend in this selection."
        rows={page?.data ?? []} rowKey={(r) => `${r.material}|${r.formulary_class}`} empty="No out-of-formulary spend in this selection."
        columns={[
          { label: "Item", value: (r) => r.material_desc || r.material, text: true },
          { label: "Generic", value: (r) => r.generic_name || "—", text: true },
          { label: "Manufacturer", value: (r) => r.manufacturer || "—", text: true },
          { label: "Class", value: (r) => r.formulary_class, text: true },
          { label: "Value", value: (r) => rupeesExact(r.cost), strong: true },
          { label: "Share", value: (r) => pct(r.share_pct) },
          { label: "Lines", value: (r) => num(r.lines) },
          { label: "Hospitals", value: (r) => num(r.hospitals) },
        ]}
        linkTitle="Every item" linkNote="The Items tab lists them all, searchable; click an item there to see the doctors who prescribed it."
        linkLabel="All out-of-formulary items" onOpenTab={() => go("items")}
        method={(
          <>
            <MethodText>
              <p>Out-of-formulary items are drugs whose Item Master class is in group B. Each item is summed over the selection; the five with the largest value are shown, the same first page the Items tab opens on.</p>
              <p>On the Overview each item is a bar from zero in lakhs, on one scale; the % beside its amount is its share of all out-of-formulary spend.</p>
            </MethodText>
            <HowBuilt s={s} />
          </>
        )} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Doctors
// ─────────────────────────────────────────────────────────────────────────────
export function TopDoctorsTile({ s, place }: { s: OverviewScope; place: Place }) {
  const dr = useDrawer();
  // The Doctors tab's query, first page of five by out-of-formulary spend.
  const { page, error } = useTopRows<DoctorRow>("/formulary/doctors", { Plant: s.plant, ...filterParams(s.filters, { method: true }) }, "out_of_formulary");
  const rows: Ranked[] = (page?.data ?? []).map((r) => ({
    key: `${r.plant}|${r.doctor_id}`, label: r.doctor_name || r.doctor_id,
    // The hospital matters only when the list spans several.
    sub: s.network ? r.hospital_name || r.plant : null,
    value: r.out_of_formulary, share: r.oof_share_pct,
  }));
  const tail = tailOf(page, "out_of_formulary", "doctors");
  const title = "Out of formulary by doctor";
  const go = (v: View) => { dr.close(); s.onOpen(v); };
  const method = effectiveMethod(s.filters) === "mean" ? "mean of onco & non-onco" : "pooled";

  return (
    <>
      <ChartPanel id="top-doctors" title={title} context={tail ?? s.context} accent={OOF_COL} place={place}
        label={rankedLabel(title, s.context, rows, tail)} onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        <TopBody rows={rows} error={error} loading={!page && !error} empty="No out-of-formulary spend in this selection."
          ariaLabel={`${title}, ${s.context}`} />
      </ChartPanel>

      <TopListDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab}
        eyebrow="Out of formulary · Overview" title={`${title} · ${s.where}`}
        kpi={isNum(page?.sums?.out_of_formulary) ? { value: rupeesExact(page?.sums?.out_of_formulary), comparator: `out of formulary across ${num(page?.total)} doctors` } : undefined}
        asOf={s.asOf} filters={filterChips(s)}
        listTitle={`The ${TOP_N} with the most out-of-formulary spend`}
        listNote={`Compliance = Formulary ÷ (Formulary + Out of formulary) for that doctor (${method}). Share = the doctor's out-of-formulary spend ÷ all of it in this selection.`}
        rows={page?.data ?? []} rowKey={(r) => `${r.plant}|${r.doctor_id}`} empty="No out-of-formulary spend in this selection."
        columns={[
          { label: "Doctor", value: (r) => r.doctor_name || r.doctor_id, text: true },
          { label: "Hospital", value: (r) => r.hospital_name || r.plant, text: true },
          { label: "Total consumption", value: (r) => rupeesExact(r.total) },
          { label: "Out of formulary", value: (r) => rupeesExact(r.out_of_formulary), strong: true },
          { label: "Non formulary", value: (r) => rupeesExact(r.non_formulary) },
          { label: "Formulary", value: (r) => rupeesExact(r.formulary) },
          { label: "Compliance", value: (r) => pct(r.compliance_pct) },
          { label: "Share", value: (r) => pct(r.oof_share_pct) },
          { label: "Lines", value: (r) => num(r.lines) },
        ]}
        linkTitle="Every doctor" linkNote="The Doctors tab lists them all, searchable; click a doctor there to see the items behind the figure."
        linkLabel="All doctors" onOpenTab={() => go("doctors")}
        method={(
          <>
            <MethodText>
              <p>Doctors are the treating doctor on each HIS sales line, keyed by their HIS ID within a hospital. Each doctor&apos;s drug spend is summed over the selection; the five with the most out-of-formulary spend are shown, the same first page the Doctors tab opens on.</p>
              <p>On the Overview each doctor is a bar from zero in lakhs, on one scale; the % beside the amount is the doctor&apos;s share of all out-of-formulary spend.</p>
            </MethodText>
            <HowBuilt s={s} />
          </>
        )} />
    </>
  );
}
