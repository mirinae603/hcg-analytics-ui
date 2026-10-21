"use client";
// Formulary Compliance — Items tab. Drug items by formulary group for the selected filters:
// Out of Formulary (B, the default — the spend that pulls compliance down), Non Formulary (C)
// and Formulary (A). Clicking an out-of / non-formulary item opens the doctors who prescribed
// it; the doctor × item table only holds groups B and C, so formulary items have no drill.
import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head, SUB } from "@/components/portfolio/ledger/kit";
import { inr } from "@/lib/kpiFormat";
import { Pills, SlideOver, GROUP_LABEL } from "./parts";
import { filterParams, useOverview, type Filters, type Group } from "./api";
import { SHARES_NOTE } from "../table/query";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const ITEM_COLS: Col[] = [
  { field: "material", label: "Material" },
  { field: "material_desc", label: "Item" },
  { field: "generic_name", label: "Generic" },
  { field: "manufacturer", label: "Manufacturer" },
  { field: "category", label: "Category" },
  { field: "formulary_class", label: "Class" },
  { field: "cost", label: "Value", kind: "inr" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "lines", label: "Lines", kind: "num" },
  { field: "share_pct", label: "Share of group", kind: "pct2" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
];

const ITEM_DOCTOR_COLS: Col[] = [
  { field: "doctor_name", label: "Doctor" },
  { field: "doctor_id", label: "Doctor ID" },
  { field: "hospital_name", label: "Hospital" },
  { field: "formulary_class", label: "Class" },
  { field: "cost", label: "Value", kind: "inr" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "lines", label: "Lines", kind: "num" },
];

const GROUPS: { key: Group; label: string }[] = [
  { key: "B", label: "Out of formulary" },
  { key: "C", label: "Non formulary" },
  { key: "A", label: "Formulary" },
];

// The headline field that holds each group's total for the same filters.
const GROUP_FIELD: Record<Group, "formulary" | "out_of_formulary" | "non_formulary"> = { A: "formulary", B: "out_of_formulary", C: "non_formulary" };

const GROUP_NOTE: Record<Group, string> = {
  B: "Out-of-formulary items — the only spend that lowers the compliance ratio. Click an item to see the doctors who prescribed it.",
  C: "Non-formulary items — outside the compliance ratio, listed so the spend is visible. Click an item to see the doctors who prescribed it.",
  A: "Formulary items, including restricted, preferred and scheme classes (all of group A).",
};

type ItemRow = { material: string; material_desc: string; formulary_class?: string };

export default function Items({ filters, plant }: { filters: Filters; plant: string }) {
  const params = filterParams(filters);
  // The doctor × item table has no patient-type column, so the drill is IP + OP together.
  const drillParams = filterParams({ ...filters, type: "ALL" });
  const [group, setGroup] = useState<Group>("B");
  // The group's total for the header: the Overview's headline for the very same filters (the
  // same cached query the Overview tab sends), so it stays put while the table is searched.
  // The table's own Total row underneath follows the search.
  const { data: ov } = useOverview({ Plant: plant, ...filterParams(filters, { method: true }) });
  const h = ov?.headline;
  const [item, setItem] = useState<ItemRow | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Card delay={80}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <Pills value={group} options={GROUPS} onChange={(g) => { setGroup(g); setOpen(false); }} />
          <span className="text-[11.5px]" style={{ color: SUB }}>drugs only · consumables excluded</span>
        </div>
        <Head label={`${GROUP_LABEL[group]} items`} note={`${GROUP_NOTE[group]} "Share of group" is each item's value ÷ the group total. ${SHARES_NOTE}`}
          badge={h ? `${GROUP_LABEL[group]} total ${inr(h[GROUP_FIELD[group]])} · of ${inr(h.total)} drug spend` : undefined} />
        <KpiTable key={group} kpiKey="formulary-items" endpoint="/formulary/items" plant={plant} columns={ITEM_COLS}
          extraParams={{ ...params, Group: group }}
          onRowClick={group === "A" ? undefined : (r: ItemRow) => { setItem(r); setOpen(true); }} />
      </Card>

      <SlideOver open={open} onClose={close} eyebrow={`${GROUP_LABEL[group]} item`}
        title={item?.material_desc || item?.material || ""}
        sub={item ? `Material ${item.material}${item.formulary_class ? ` · ${item.formulary_class}` : ""} · doctors who prescribed it${filters.type !== "ALL" ? " · IP + OP together" : ""}` : undefined}>
        {item && (
          <KpiTable key={`${item.material}|${plant}`} kpiKey="formulary-item-doctors"
            endpoint="/formulary/doctors" plant={plant} columns={ITEM_DOCTOR_COLS}
            extraParams={{ ...drillParams, Material: item.material }} />
        )}
      </SlideOver>
    </>
  );
}
