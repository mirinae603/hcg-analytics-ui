"use client";
// Spend Analysis — Doctors tab, for every section: money missed per treating doctor (keyed by
// HIS TREATINGDOCID within a hospital), most first — HCG's email asks units to follow up with
// exactly these consultants. Clicking a doctor opens the brands behind it, scoped to that
// doctor's hospital. The table's footer carries the column totals (the API's `sums`), and the
// header states the total the "Share of total" column divides by.
import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head } from "@/components/portfolio/ledger/kit";
import { inr } from "@/lib/kpiFormat";
import { SlideOver } from "../formulary/parts";
import { isMargin, sectionParams, useTableSums, type Filters, type Section } from "./api";
import { brandCols } from "./Items";
import { SHARES_NOTE } from "../table/query";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const schemeCols = (suggested: string): Col[] => [
  { field: "doctor_name", label: "Doctor" },
  { field: "doctor_id", label: "Doctor ID" },
  { field: "hospital_name", label: "Hospital" },
  { field: "brands", label: "Brands", kind: "num" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "used_value", label: "Spent", kind: "inr" },
  { field: "suggested_value", label: `With ${suggested}`, kind: "inr" },
  { field: "saving_missed", label: "Margin missed", kind: "inr" },
  { field: "saving_pct", label: "% missed", kind: "pct2" },
  { field: "share_pct", label: "Share of total", kind: "pct2" },
  { field: "lines", label: "Lines", kind: "num" },
];

const CASH_COLS: Col[] = [
  { field: "doctor_name", label: "Doctor" },
  { field: "doctor_id", label: "Doctor ID" },
  { field: "hospital_name", label: "Hospital" },
  { field: "brands", label: "Brands", kind: "num" },
  { field: "cash_qty", label: "Cash + TPA qty", kind: "num" },
  { field: "qty", label: "Qty counted", kind: "num" },
  { field: "actual_margin", label: "Margin earned", kind: "inr" },
  { field: "potential_margin", label: "Margin possible", kind: "inr" },
  { field: "margin_loss", label: "Margin missed", kind: "inr" },
  { field: "loss_pct", label: "% missed", kind: "pct2" },
  { field: "share_pct", label: "Share of total", kind: "pct2" },
  { field: "lines", label: "Lines", kind: "num" },
];

// Out of formulary has no allowance: every cash & TPA unit counts.
const OOF_COLS: Col[] = CASH_COLS.filter((c) => c.field !== "cash_qty").map((c) => (c.field === "qty" ? { ...c, label: "Qty" } : c));

export const doctorCols = (section: Section): Col[] =>
  section === "cash" ? CASH_COLS : section === "oof" ? OOF_COLS : schemeCols("suggested");

const NOTE: Record<Section, string> = {
  scheme: "Scheme (GOV) patients only: per treating doctor, what the brands they prescribed cost against the cheaper brand HCG's scheme list suggests. Click a doctor to see the brands.",
  oof: "Cash and TPA patients only: per treating doctor, the margin lost on out-of-formulary brands against the formulary brand of the same molecule, strength and form (the app's match). Brands with no formulary match are not counted. Click a doctor to see the brands.",
  cash: "Cash and TPA patients only: per treating doctor, the margin lost against the brand HCG's cash list suggests. For a bifurcated brand, HCG's allowance is shared across its doctors in proportion to their quantity. Click a doctor to see the brands.",
};

type DoctorRow = { doctor_id: string; doctor_name: string; plant: string; hospital_name: string };

export default function Doctors({ section, filters, plant }: { section: Section; filters: Filters; plant: string }) {
  const params = sectionParams(section, filters);
  const [doc, setDoc] = useState<DoctorRow | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const base = `/spend/${section}`;
  const sums = useTableSums(`${base}/doctors`, { Plant: plant, ...params });
  const total = sums?.[isMargin(section) ? "margin_loss" : "saving_missed"];

  return (
    <>
      <Card delay={80}>
        <Head label={section === "cash" ? "Doctors by margin missed" : section === "oof" ? "Doctors by margin missed on out-of-formulary brands" : "Doctors by margin missed on scheme patients"}
          note={`${NOTE[section]} ${SHARES_NOTE}`}
          badge={`${isMargin(section) ? "cash + TPA" : "scheme patients"} · ${section === "oof" ? "bill vs list price" : "list prices"}${total != null ? ` · ${inr(total)} margin missed in total` : ""}`} />
        <KpiTable key={section} kpiKey={`spend-${section}-doctors`} endpoint={`${base}/doctors`} plant={plant}
          columns={doctorCols(section)} extraParams={params}
          onRowClick={(r: DoctorRow) => { setDoc(r); setOpen(true); }} />
      </Card>

      <SlideOver open={open} onClose={close} eyebrow="Doctor"
        title={doc?.doctor_name || doc?.doctor_id || ""}
        sub={doc ? `${doc.hospital_name || doc.plant} · ID ${doc.doctor_id} · brands with a suggestion` : undefined}>
        {doc && (
          <KpiTable key={`${section}|${doc.plant}|${doc.doctor_id}`} kpiKey={`spend-${section}-doctor-items`}
            endpoint={`${base}/items`} plant={doc.plant} columns={brandCols(section)}
            extraParams={{ ...params, Doctor: doc.doctor_id }} />
        )}
      </SlideOver>
    </>
  );
}
