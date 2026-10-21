"use client";
// Formulary Compliance — Doctors tab. Out-of-formulary spend by treating doctor (doctors are
// keyed by HIS TREATINGDOCID within a hospital), worst first. Clicking a doctor opens their
// out-of-formulary / non-formulary items in a slide-over, scoped to that doctor's hospital.
import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head, SUB } from "@/components/portfolio/ledger/kit";
import { Pills, SlideOver } from "./parts";
import { effectiveMethod, filterParams, type Filters } from "./api";
import { SHARES_NOTE } from "../table/query";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const DOCTOR_COLS: Col[] = [
  { field: "doctor_name", label: "Doctor" },
  { field: "doctor_id", label: "Doctor ID" },
  { field: "hospital_name", label: "Hospital" },
  // total = Formulary + Out of formulary + Non formulary, before its parts (as HCG asked); onco /
  // non-onco = the doctor's drug spend per segment (HCG's "total consumption, treating doctor wise").
  { field: "total", label: "Total consumption", kind: "inr" },
  { field: "out_of_formulary", label: "Out of formulary", kind: "inr" },
  { field: "non_formulary", label: "Non formulary", kind: "inr" },
  { field: "formulary", label: "Formulary", kind: "inr" },
  { field: "onco", label: "Onco", kind: "inr" },
  { field: "non_onco", label: "Non-onco", kind: "inr" },
  { field: "compliance_pct", label: "Compliance", kind: "pct2" },
  { field: "oof_share_pct", label: "Share of out-of-formulary", kind: "pct2" },
  { field: "lines", label: "Lines", kind: "num" },
];

const DOCTOR_ITEM_COLS: Col[] = [
  { field: "material", label: "Material" },
  { field: "material_desc", label: "Item" },
  { field: "generic_name", label: "Generic" },
  { field: "manufacturer", label: "Manufacturer" },
  { field: "formulary_class", label: "Class" },
  { field: "cost", label: "Value", kind: "inr" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "lines", label: "Lines", kind: "num" },
];

type DoctorRow = { doctor_id: string; doctor_name: string; plant: string; hospital_name: string };

export default function Doctors({ filters, plant }: { filters: Filters; plant: string }) {
  // Method rides along so each doctor's compliance follows the page's Method filter
  // (pooled or mean of onco & non-onco), like the Overview.
  const params = filterParams(filters, { method: true });
  // The doctor × item table has no patient-type column, so the drill is IP + OP together.
  const drillParams = filterParams({ ...filters, type: "ALL" });
  const [doc, setDoc] = useState<DoctorRow | null>(null);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<"B" | "C">("B");
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Card delay={80}>
        <Head label="Doctors by out-of-formulary spend"
          note={`Drug spend per treating doctor for the selected filters, most out-of-formulary spend first. Compliance = Formulary ÷ (Formulary + Out of formulary) for that doctor (${effectiveMethod(filters) === "mean" ? "mean of onco & non-onco" : "pooled"}); non formulary is outside the ratio but inside Total consumption. The Total row adds every matching doctor, not just this page. ${SHARES_NOTE} Click a doctor to see the items behind it.`}
          badge="drugs only · consumables excluded" />
        <KpiTable kpiKey="formulary-doctors" endpoint="/formulary/doctors" plant={plant} columns={DOCTOR_COLS} extraParams={params}
          onRowClick={(r: DoctorRow) => { setDoc(r); setGroup("B"); setOpen(true); }} />
      </Card>

      <SlideOver open={open} onClose={close} eyebrow="Doctor"
        title={doc?.doctor_name || doc?.doctor_id || ""}
        sub={doc ? `${doc.hospital_name || doc.plant} · ID ${doc.doctor_id}` : undefined}>
        {doc && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <Pills value={group} onChange={setGroup}
                options={[{ key: "B", label: "Out of formulary" }, { key: "C", label: "Non formulary" }]} />
              <span className="text-[11.5px]" style={{ color: SUB }}>
                same month, material type and payer as the page{filters.type !== "ALL" ? " · IP + OP together (this list is not split by patient type)" : ""}
              </span>
            </div>
            <KpiTable key={`${doc.plant}|${doc.doctor_id}|${group}`} kpiKey="formulary-doctor-items"
              endpoint="/formulary/items" plant={doc.plant} columns={DOCTOR_ITEM_COLS}
              extraParams={{ ...drillParams, Doctor: doc.doctor_id, Group: group }} />
          </>
        )}
      </SlideOver>
    </>
  );
}
