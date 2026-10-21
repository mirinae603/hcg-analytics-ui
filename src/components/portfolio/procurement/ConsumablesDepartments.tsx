"use client";
// Consumables · department consumption — the consumables (material codes starting
// with 3, HCG's own series rule) issued to each department's cost centre, per hospital.
// Its own API (/portfolio/consumption/consumables/*): the page's other department cards read
// kpi_consumption_by_department, which has no material column and so cannot be cut to
// consumables. Clicking a department opens the consumables it was issued.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { TbFirstAidKit } from "react-icons/tb";
import type { Col } from "@/lib/kpiRegistry";
import { inr, num, pct } from "@/lib/kpiFormat";
import { inrAbbr, countAbbr, useMount } from "@/components/portfolio/kit";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { SlideOver } from "../formulary/parts";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// Same tokens as ConsumptionOverview; departments are plum on this page (PLUM_DEEP = its darker shade).
const INK = "#33262e", SUB = "#9a8b92", PLUM = "#9a6bb0", PLUM_DEEP = "#7d4f93";
const CARD_SH = "0 16px 40px -24px rgba(90,40,60,0.20), 0 4px 14px -8px rgba(90,40,60,0.06)";
const API = "/portfolio/consumption/consumables";
const BAR_H = 84;

type Month = { key: string; label: string; cost: number; qty: number };
type Overview = {
  totals: { cost: number; qty: number; items: number; departments: number; hospitals: number };
  months: Month[];
  scope: { plant: string | null; hospital: string | null };
  names_pending: boolean;
  note: string;
};
type DeptRow = { cost_ctr: string; department_name: string; plant: string; hospital: string; cost: number; qty: number; items: number; share_pct: number; top_item_desc: string | null };

const DEPT_COLS: Col[] = [
  { field: "cost_ctr", label: "Cost centre" },
  { field: "department_name", label: "Department" },
  { field: "hospital", label: "Hospital" },
  { field: "cost", label: "Consumables cost", kind: "inr" },
  { field: "share_pct", label: "Share of total", kind: "pct2" },
  { field: "qty", label: "Qty issued", kind: "num" },
  { field: "items", label: "Items", kind: "num" },
  { field: "top_item_desc", label: "Biggest item" },
];

const ITEM_COLS: Col[] = [
  { field: "material_desc", label: "Consumable" },
  { field: "material", label: "Material" },
  { field: "uom", label: "Unit of measure" },
  { field: "cost", label: "Cost", kind: "inr" },
  { field: "share_pct", label: "Share of department", kind: "pct2" },
  { field: "qty", label: "Qty issued", kind: "num" },
  { field: "months", label: "Months issued", kind: "num" },
];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl p-4 min-w-0" style={{ background: `${PLUM}0d`, border: `1px solid ${PLUM}24` }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.04em] truncate" style={{ color: PLUM }}>{label}</div>
      <div className="text-[22px] font-bold tabular-nums mt-1 leading-tight" style={{ color: INK }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5 truncate" style={{ color: SUB }}>{sub}</div>}
    </div>
  );
}

function MonthStrip({ months }: { months: Month[] }) {
  const on = useMount(160);
  if (!months.length) {
    return <div className="rounded-2xl p-4 h-full text-[12.5px]" style={{ background: `${PLUM}08`, border: `1px solid ${PLUM}1f`, color: SUB }}>No months of consumption are loaded yet.</div>;
  }
  const max = Math.max(...months.map((m) => m.cost), 0);
  const avg = months.reduce((s, m) => s + m.cost, 0) / months.length;
  // Values over the bars only while they fit; the tooltip always has them.
  const showValues = months.length <= 8;
  return (
    <div className="rounded-2xl p-4 h-full flex flex-col" style={{ background: `${PLUM}08`, border: `1px solid ${PLUM}1f` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.04em]" style={{ color: PLUM }}>Consumables cost by month</span>
        <span className="text-[11px] tabular-nums whitespace-nowrap" style={{ color: SUB }}>avg {inrAbbr(avg)}/mo</span>
      </div>
      <div className="flex items-end gap-2 mt-3 flex-1">
        {months.map((m, i) => {
          const h = max > 0 ? Math.max(Math.round((m.cost / max) * BAR_H), m.cost > 0 ? 3 : 0) : 0;
          const peak = max > 0 && m.cost === max;
          return (
            <div key={m.key} className="flex-1 min-w-0 flex flex-col items-center" title={`${m.label}: ${inrAbbr(m.cost)} · ${countAbbr(m.qty)} units`}>
              {showValues && <span className="hidden sm:block text-[10px] font-semibold tabular-nums mb-1 whitespace-nowrap" style={{ color: peak ? PLUM_DEEP : SUB }}>{inrAbbr(m.cost)}</span>}
              <div className="w-full flex items-end" style={{ height: BAR_H }}>
                <div className="w-full rounded-t-lg" style={{ height: on ? h : 0, background: peak ? `linear-gradient(180deg,${PLUM_DEEP},${PLUM})` : `linear-gradient(180deg,${PLUM},#c4a3d4)`, transition: `height 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms` }} />
              </div>
              <span className="text-[10.5px] mt-1.5 whitespace-nowrap" style={{ color: peak ? INK : SUB, fontWeight: peak ? 700 : 500 }}>{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ConsumablesDepartments({ region }: { region: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoading(true); setFailed(false);
    const ac = new AbortController();
    fetch(`${DASHBOARD_API_BASE_URL}${API}/overview?Plant=${encodeURIComponent(region)}`, { signal: ac.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (e?.name !== "AbortError") { setData(null); setFailed(true); setLoading(false); } });
    return () => ac.abort();
  }, [region]);

  const [dept, setDept] = useState<DeptRow | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  // A department belongs to one hospital: switching hospital closes its panel.
  useEffect(() => { setOpen(false); }, [region]);

  // While HCG's department names are pending the name IS the code, so that column is hidden.
  const namesPending = data?.names_pending ?? true;
  const deptCols = useMemo(() => (namesPending ? DEPT_COLS.filter((c) => c.field !== "department_name") : DEPT_COLS), [namesPending]);

  const t = data?.totals;
  const busy = loading || !data;
  const show = (v: string) => (busy ? "···" : v);
  const deptTitle = (r: DeptRow) => (r.department_name && r.department_name !== r.cost_ctr ? r.department_name : `Cost centre ${r.cost_ctr}`);

  return (
    <div className="rounded-3xl bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbFirstAidKit size={17} style={{ color: PLUM }} />Consumables · department consumption</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>{data?.note ?? "Consumables (HCG 3-series) issued to each department's cost centre."}</p>
        </div>
        {namesPending && !busy && (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: `${PLUM}14`, color: PLUM_DEEP }}>cost-centre codes · department names pending from HCG</span>
        )}
      </div>

      {failed ? (
        <div className="mt-4 text-[12.5px]" style={{ color: SUB }}>The consumables figures could not be loaded.</div>
      ) : (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <Stat label="Consumables cost" value={show(inrAbbr(t?.cost ?? 0))} sub={busy ? undefined : `${countAbbr(t?.qty ?? 0)} units issued`} />
            <Stat label="Departments" value={show(countAbbr(t?.departments ?? 0))} sub="cost centres issued to" />
            <Stat label="Consumable items" value={show(countAbbr(t?.items ?? 0))} sub="distinct materials" />
            <Stat label="Hospitals" value={show(countAbbr(t?.hospitals ?? 0))} sub={busy ? undefined : data?.scope?.hospital ?? "all hospitals"} />
          </div>
          <div className="lg:col-span-7">{busy ? <div className="h-full min-h-[140px] rounded-2xl animate-pulse" style={{ background: `${PLUM}08` }} /> : <MonthStrip months={data?.months ?? []} />}</div>
        </div>
      )}

      {!busy && t && t.cost === 0 && (
        <div className="mt-4 text-[12.5px]" style={{ color: SUB }}>No consumables were issued to a department here in this period.</div>
      )}

      <div className="mt-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
          <span className="text-[13px] font-semibold" style={{ color: INK }}>Departments by consumables cost</span>
          <span className="text-[11.5px]" style={{ color: SUB }}>click a department to see the consumables it was issued</span>
        </div>
        <KpiTable kpiKey="consumables-departments" endpoint={`${API}/departments`} plant={region} columns={deptCols}
          onRowClick={(r: DeptRow) => { setDept(r); setOpen(true); }} />
      </div>

      <SlideOver open={open} onClose={close} eyebrow="Consumables issued to this department"
        title={dept ? deptTitle(dept) : ""}
        sub={dept ? `${dept.hospital || dept.plant} · ${inr(dept.cost)} · ${num(dept.items)} consumables · ${pct(dept.share_pct)} of the consumables total` : undefined}>
        {dept && (
          // The department's own plant code, not the page's region: exact even under All Hospitals.
          <KpiTable key={`${dept.plant}|${dept.cost_ctr}`} kpiKey="consumables-dept-items"
            endpoint={`${API}/items`} plant={dept.plant} columns={ITEM_COLS} extraParams={{ CostCentre: dept.cost_ctr }} />
        )}
      </SlideOver>
    </div>
  );
}
