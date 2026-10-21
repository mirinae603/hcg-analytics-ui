"use client";
// Spend Analysis, Scheme overview — the doctors to follow up first, as HCG's spend email
// asks the units to. The tile asks the very endpoint the Doctors tab pages through, for one page
// of five sorted by the margin missed (the ledger's useTopRows), so every figure matches that tab
// row for row, and ranks them as bars from zero; the drawer (TopListDrawer) lists the five in
// exact rupees and opens the full tab, where each doctor drills into the brands behind it.
import React from "react";
import { num } from "@/components/portfolio/ledger/kit";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { TOP_N, TopListDrawer, useTopRows } from "@/components/portfolio/ledger/toplist";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { sectionParams, type Filters, type Meta, type Overview, type View } from "../api";
import { DOCTOR_COL, WORDS, MethodTab, filterChips, type Scope } from "./context";

/** A row of /spend/scheme/doctors, the fields the tile and its drawer read. */
type DoctorRow = {
  doctor_id: string; doctor_name: string | null; plant: string; hospital_name: string | null;
  brands: number; used_value: number; suggested_value: number; saving_missed: number;
  saving_pct: number | null; share_pct: number | null; lines: number;
};

const rowKey = (r: DoctorRow) => `${r.plant}|${r.doctor_id}`;
const doctorOf = (r: DoctorRow) => r.doctor_name || r.doctor_id;

export function DoctorsTile({ d, meta, filters, plant, scope, place, onOpen }: {
  d: Overview; meta: Meta; filters: Filters; plant: string; scope: Scope; place: Place; onOpen: (v: View) => void;
}) {
  const dr = useDrawer();
  const w = WORDS;
  // The Doctors tab's query, first page of five by the margin missed.
  const { page, error } = useTopRows<DoctorRow>("/spend/scheme/doctors", { Plant: plant, ...sectionParams("scheme", filters) }, "saving_missed");
  const data = page?.data ?? [];
  const title = `Top ${TOP_N} doctors by ${w.loss.toLowerCase()}`;
  const none = `No scheme patient got a brand with ${w.aSug} suggestion in this selection.`;
  const ofLoss = `of the ${w.loss.toLowerCase()}`;
  const rows: RankRow[] = data.map((r) => ({
    key: rowKey(r), label: doctorOf(r),
    // The hospital matters only when the list spans several.
    sub: scope.network ? r.hospital_name || r.plant : undefined,
    value: r.saving_missed, valueLabel: lakhs(r.saving_missed),
    aside: isNum(r.share_pct) ? `${pct(r.share_pct, 1)} ${ofLoss}` : undefined,
  }));
  const total = page?.sums?.saving_missed;
  const label = [
    `${title}, ${scope.context}`,
    ...data.map((r, i) => `${i + 1}. ${doctorOf(r)}, ${lakhs(r.saving_missed)}, ${pct(r.share_pct, 1)} ${ofLoss}`),
    page ? `of ${num(page.total)} doctors` : null,
  ].filter(Boolean).join(". ");
  const go = (v: View) => { dr.close(); onOpen(v); };

  return (
    <>
      <ChartPanel id="doctors" title={title} context={page ? `of ${num(page.total)} doctors · ${scope.when}` : scope.context}
        accent={DOCTOR_COL} place={place} label={label} onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        <RankBars rows={rows} format={lakhs} color={DOCTOR_COL} ariaLabel={`${title}, ${scope.context}`}
          empty={error ? `Couldn't load the doctors: ${error}` : page ? none : "Loading the doctors…"} />
      </ChartPanel>

      <TopListDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab}
        eyebrow={`${w.section} · Overview`} title={`Doctors by ${w.loss.toLowerCase()} · ${scope.where}`}
        kpi={page && isNum(total) ? { value: rupeesExact(total), comparator: `${w.loss.toLowerCase()} across ${num(page.total)} doctors` } : undefined}
        asOf={scope.asOf} filters={filterChips(filters, scope, meta)}
        listTitle={`The ${TOP_N} with the largest ${w.loss.toLowerCase()}`}
        listNote={`${w.pct} = the doctor's ${w.loss.toLowerCase()} ÷ the doctor's ${w.actual.toLowerCase()}. Share = the doctor's part of the ${w.loss.toLowerCase()} in this selection.`}
        rows={data} rowKey={rowKey} empty={none}
        columns={[
          { label: "Doctor", value: doctorOf, text: true },
          { label: "Hospital", value: (r) => r.hospital_name || r.plant, text: true },
          { label: w.loss, value: (r) => rupeesExact(r.saving_missed), strong: true },
          { label: w.actual, value: (r) => rupeesExact(r.used_value) },
          { label: w.proposed, value: (r) => rupeesExact(r.suggested_value) },
          { label: w.pct, value: (r) => pct(r.saving_pct) },
          { label: "Share", value: (r) => pct(r.share_pct) },
          { label: "Brands", value: (r) => num(r.brands) },
          { label: "Lines", value: (r) => num(r.lines) },
        ]}
        linkTitle="Every doctor" linkNote="The Doctors tab lists them all, searchable; click a doctor there to see the brands behind the figure."
        linkLabel="All doctors" onOpenTab={() => go("doctors")}
        method={(
          <MethodTab d={d} meta={meta} lines={[
            `Doctors are the treating doctor on each HIS sales line for scheme (GOV) patients, keyed by their HIS ID within a hospital. Each doctor's ${w.actual.toLowerCase()} and ${w.proposed.toLowerCase()} are summed over the selection; the ${TOP_N} with the largest ${w.loss.toLowerCase()} are shown, the same first page the Doctors tab opens on.`,
            `The bars on the tile are each doctor's ${w.loss.toLowerCase()}, on one scale from zero.`,
          ]} />
        )} />
    </>
  );
}
