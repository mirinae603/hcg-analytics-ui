"use client";
// Spend Analysis (Cash & TPA / Out of formulary) — the five treating doctors with the most margin
// loss, the consultants HCG's spend email asks units to follow up with. The tile asks the very
// endpoint the Doctors tab pages through, for one page of five sorted by margin missed (the
// ledger's useTopRows), so every figure matches that tab row for row. The drawer lists the five
// in exact rupees and opens the Doctors tab, where each doctor drills to the brands behind it.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import { useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { TOP_N, TopListDrawer, useTopRows } from "@/components/portfolio/ledger/toplist";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { View } from "../api";
import { DOCTOR_COL, type Ctx } from "./context";
import { Method } from "./parts";

/** A row of /spend/{cash|oof}/doctors (the Doctors tab's columns). */
type DoctorRow = {
  doctor_id: string; doctor_name: string | null; plant: string; hospital_name: string | null;
  brands: number; qty: number; actual_margin: number; potential_margin: number;
  margin_loss: number; loss_pct: number | null; share_pct: number | null; lines: number;
};

const doctorOf = (r: DoctorRow) => r.doctor_name || r.doctor_id;
const shareText = (r: DoctorRow) => (isNum(r.share_pct) ? `${pct(r.share_pct, 1)} of the loss` : undefined);

export function DoctorsTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const { page, error } = useTopRows<DoctorRow>(`/spend/${c.kind}/doctors`, c.params, "margin_loss");
  const rows = page?.data ?? [];
  const all = page?.sums?.margin_loss;
  const title = `Top ${TOP_N} doctors by margin missed`;
  const go = (v: View) => { dr.close(); c.onOpen(v); };
  const none = `No doctor in this selection has ${c.kind === "oof" ? "an out-of-formulary" : "a"} margin missed.`;
  const empty = error ? `Couldn't load the doctors: ${error}` : page ? none : "Loading the doctors…";
  return (
    <>
      <ChartPanel id="doctors" title={title} context={c.context} accent={DOCTOR_COL} place={place} source={c.source}
        label={[
          title, c.context,
          ...rows.map((r, i) => `${i + 1}. ${doctorOf(r)}${c.network && r.hospital_name ? `, ${r.hospital_name}` : ""}: ${lakhs(r.margin_loss)} lost${shareText(r) ? `, ${shareText(r)}` : ""}`),
          page ? `${num(page.total)} doctors in all` : null,
        ].filter(Boolean).join(". ")}
        onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={DOCTOR_COL} ariaLabel={`${title}, ${c.context}`}
          empty={empty}
          rows={rows.map((r) => ({
            key: `${r.plant}|${r.doctor_id}`, label: doctorOf(r),
            // The hospital matters only when the list spans several.
            sub: c.network ? r.hospital_name || r.plant : undefined,
            value: r.margin_loss, valueLabel: lakhs(r.margin_loss), aside: shareText(r),
          }))} />
      </ChartPanel>

      <TopListDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab}
        eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
        kpi={isNum(all) ? { value: rupeesExact(all), comparator: `margin missed across ${num(page?.total)} doctors, ${c.when}` } : undefined}
        source={c.source} asOf={c.asOf} filters={c.chips}
        listTitle={`The ${TOP_N} doctors with the most margin missed`}
        listNote="% missed = the doctor's margin missed ÷ the margin the suggested brands would have made on their prescriptions. Share = the doctor's part of all the margin missed in this selection."
        rows={rows} rowKey={(r) => `${r.plant}|${r.doctor_id}`} empty={empty}
        columns={[
          { label: "Doctor", value: doctorOf, text: true },
          { label: "Hospital", value: (r) => r.hospital_name || r.plant, text: true },
          { label: "Margin missed", value: (r) => rupeesExact(r.margin_loss), strong: true },
          { label: "Margin earned", value: (r) => rupeesExact(r.actual_margin) },
          { label: "Margin possible", value: (r) => rupeesExact(r.potential_margin) },
          { label: "% missed", value: (r) => pct(r.loss_pct) },
          { label: "Share", value: (r) => pct(r.share_pct) },
          { label: "Brands", value: (r) => num(r.brands) },
          { label: "Lines", value: (r) => num(r.lines) },
        ]}
        linkTitle="Every doctor" linkNote="The Doctors tab lists them all, searchable; click a doctor there to see the brands behind the figure."
        linkLabel="All doctors" onOpenTab={() => go("doctors")}
        method={(
          <Method c={c}>
            <p>Doctors are the treating doctor on each HIS sales line, keyed by their HIS ID within a hospital. Each doctor&apos;s margin missed is summed over the selection; the five with the most are shown, the same first page the Doctors tab opens on.{c.kind === "cash" ? " For a bifurcated brand, HCG's allowance is shared across its doctors in proportion to their quantity." : ""}</p>
            <p>On the chart each doctor&apos;s margin missed is a bar from zero on one scale.</p>
          </Method>
        )} />
    </>
  );
}
