"use client";
// Consumption & Revenue portfolio overview — soft rose "clinical consumption" identity.
// Mirrors the procurement overview quality: tabbed gauge + concentration donut + brand panel,
// then a consumption flow + KPI grid, with category & department side panels.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, catName, useMount, smoothPath } from "@/components/portfolio/kit";
import { GaugeCard, DonutCard, BrandPanel, type Tab } from "./ExecCards";
import { TbActivityHeartbeat, TbPill, TbBuildingHospital, TbChevronRight, TbFlask, TbReportMedical } from "react-icons/tb";
import { simulatedByPortfolio } from "@/lib/kpiRegistry";
import { getSimulated } from "@/lib/simulatedKpi";
import { simVisual } from "@/lib/simKpiVisual";
import { fmt } from "@/lib/kpiFormat";

const SIM_CONSUMPTION = simulatedByPortfolio("consumption").map((meta) => {
  const b = getSimulated(meta.key)!;
  return { meta, ...simVisual(meta.key), val: fmt(b.headline.value, b.headline.kind), label: b.headline.label };
});

const PAGE = "#F6F0F2", INK = "#33262e", SUB = "#9a8b92";
const ROSE = "#cf5d84", DEEP = "#a8446a", CORAL = "#ec8a8d", PLUM = "#9a6bb0", GREY = "#cbb9c1";
const CARD_SH = "0 16px 40px -24px rgba(90,40,60,0.20), 0 4px 14px -8px rgba(90,40,60,0.06)";
const pctSign = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const KPI_META: Record<string, any> = {
  "unit-sold-per-sku": { title: "Units Consumed per SKU", Icon: TbPill, tint: "#fce7ee", ring: ROSE },
  "consumption-by-department": { title: "Consumption by Department", Icon: TbBuildingHospital, tint: "#efe7f6", ring: PLUM },
};

function ConsumptionFlow({ timeline }: { timeline: any[] }) {
  const on = useMount(140); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || []; if (!data.length) return null;
  const W = 760, H = 260, PADX = 18, PADT = 24, PADB = 34;
  const iW = W - PADX * 2, iH = H - PADT - PADB;
  const max = Math.max(...data.map((d) => d.cost), 1) * 1.12;
  const X = (i: number) => PADX + (data.length === 1 ? iW / 2 : (i / (data.length - 1)) * iW);
  const Y = (v: number) => PADT + iH - (v / max) * iH;
  const line = smoothPath(data.map((d, i) => ({ x: X(i), y: Y(d.cost) })));
  const area = `${line} L ${X(data.length - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`;
  const total = data.reduce((s, d) => s + d.cost, 0), avg = total / data.length;
  return (
    <div className="rounded-3xl bg-white p-6 flex flex-col" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbActivityHeartbeat size={17} style={{ color: ROSE }} />Consumption flow</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>monthly internal consumption cost · units in tooltip</p></div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${ROSE}14`, color: DEEP }}>avg {inrAbbr(avg)}/mo</span>
      </div>
      <div className="relative mt-3" style={{ height: 220 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs><linearGradient id="coFlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ROSE} stopOpacity="0.28" /><stop offset="100%" stopColor={CORAL} stopOpacity="0.02" /></linearGradient></defs>
          {[0, 0.5, 1].map((g, i) => <line key={i} x1={PADX} y1={Y(max * g)} x2={W - PADX} y2={Y(max * g)} stroke="#f4eef1" strokeWidth="1" />)}
          <path d={area} fill="url(#coFlow)" style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease 0.3s" }} />
          <path d={line} fill="none" stroke={ROSE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.4s ease 0.3s", filter: `drop-shadow(0 5px 9px ${ROSE}44)` }} />
          {data.map((d, i) => { const active = hov === i; return (
            <g key={i} onMouseEnter={() => setHov(i)}>
              {active && <line x1={X(i)} y1={PADT - 4} x2={X(i)} y2={PADT + iH} stroke="#e7dbe1" strokeWidth="1" strokeDasharray="3 3" />}
              <circle cx={X(i)} cy={Y(d.cost)} r={active ? 5 : 3.2} fill="#fff" stroke={ROSE} strokeWidth="2.5" style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.5 + i * 0.06}s` }} />
              <rect x={X(i) - iW / (data.length * 2)} y={0} width={iW / data.length} height={H} fill="transparent" />
              <text x={X(i)} y={H - 10} textAnchor="middle" style={{ fontSize: 11, fill: active ? INK : "#a99aa1", fontWeight: active ? 700 : 500 }}>{d.label}</text>
            </g>
          ); })}
        </svg>
        {hov != null && data[hov] && (() => { const d = data[hov]; return (
          <div className="absolute pointer-events-none" style={{ left: `${(X(hov) / W) * 100}%`, top: 0, transform: "translate(-50%,-2px)" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(90,40,60,0.4)", border: "1px solid #f2e9ee" }}>
              <div className="text-[12px] font-bold tabular-nums" style={{ color: DEEP }}>{inrAbbr(d.cost)}</div>
              <div className="text-[10.5px] tabular-nums" style={{ color: SUB }}>{countAbbr(d.units)} units · {d.month}</div>
            </div></div>); })()}
      </div>
    </div>
  );
}

function KpiGrid({ cards }: { cards: Record<string, any> }) {
  return (
    <div className="rounded-3xl bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <h3 className="text-[15px] font-semibold mb-3" style={{ color: INK }}>Consumption & Revenue KPIs</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.keys(KPI_META).map((key) => { const m = KPI_META[key]; const Icon = m.Icon; const c = cards[key] || {};
          const val = c.kind === "inr" ? inrAbbr(Number(c.value ?? 0)) : countAbbr(Number(c.value ?? 0));
          return (
            <Link key={key} href={`/kpi/${key}`} className="group flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-200" style={{ border: "1px solid #f1e9ed", background: "#fff" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 26px -14px rgba(90,40,60,0.28)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
              <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 38, height: 38, background: m.tint, color: m.ring }}><Icon size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: "#3c2f36" }}>{m.title}</div>
                <div className="text-[13px] font-bold tabular-nums" style={{ color: m.ring }}>{val} <span className="text-[10.5px] font-medium" style={{ color: SUB }}>{c.sub}</span></div>
              </div>
              <TbChevronRight size={16} className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: "#d7c6ce" }} />
            </Link>
          ); })}
        {SIM_CONSUMPTION.map(({ meta, Icon, accent, val, label }) => (
          <Link key={meta.key} href={`/kpi/${meta.key}`} className="group flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-200" style={{ border: "1px solid #f1e9ed", background: "#fff", opacity: 0.58, filter: "saturate(0.72)" }}
            onMouseEnter={(e) => { const t = e.currentTarget as HTMLElement; t.style.opacity = "1"; t.style.filter = "none"; t.style.boxShadow = "0 10px 26px -14px rgba(90,40,60,0.28)"; t.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { const t = e.currentTarget as HTMLElement; t.style.opacity = "0.58"; t.style.filter = "saturate(0.72)"; t.style.boxShadow = "none"; t.style.transform = "none"; }}>
            <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 38, height: 38, background: accent + "1c", color: accent }}><Icon size={19} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold truncate" style={{ color: "#3c2f36" }}>{meta.title}</div>
              <div className="text-[13px] font-bold tabular-nums" style={{ color: accent }}>{val} <span className="text-[10.5px] font-medium" style={{ color: SUB }}>{label}</span></div>
            </div>
            <span className="flex items-center gap-0.5 px-1.5 py-[3px] rounded-full flex-shrink-0" style={{ background: "#fff7ed", border: "1px solid #fadcae" }}><TbFlask size={9} style={{ color: "#c07d1a" }} /><span className="text-[8.5px] font-bold uppercase tracking-[0.04em]" style={{ color: "#a56a15" }}>Sim</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoriesCard({ categories }: { categories: any[] }) {
  const on = useMount(220);
  const rows = (categories || []).slice(0, 7);
  const max = Math.max(...rows.map((r: any) => r.value), 1);
  return (
    <div className="rounded-3xl bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <h3 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbFlask size={16} style={{ color: ROSE }} />Consumption by category</h3>
      <p className="text-[12px] mt-0.5 mb-3" style={{ color: SUB }}>material group · by cost</p>
      <div className="flex-1 flex flex-col justify-between gap-2.5">
        {rows.map((r: any, i: number) => { const uncat = r.uncat; const col = uncat ? GREY : ROSE; return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium truncate pr-2" style={{ color: uncat ? "#a99aa1" : "#3c2f36" }} title={r.name}>{catName(r.name)}</span>
              <span className="text-[12px] font-bold tabular-nums flex-shrink-0" style={{ color: uncat ? "#a99aa1" : INK }}>{inrAbbr(r.value)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3edf0" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: uncat ? GREY : `linear-gradient(90deg,${CORAL},${ROSE})`, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms` }} />
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
}

function DepartmentsCard({ departments }: { departments: any[] }) {
  const rows = (departments || []).slice(0, 6);
  return (
    <div className="rounded-3xl bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <h3 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbBuildingHospital size={16} style={{ color: PLUM }} />Top departments</h3>
      <p className="text-[12px] mt-0.5 mb-1" style={{ color: SUB }}>by consumption cost · cost-center code</p>
      <div className="flex-1 flex flex-col justify-between divide-y divide-gray-50">
        {rows.map((r: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${PLUM}14`, color: PLUM }}><TbReportMedical size={15} /></span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium tabular-nums" style={{ color: "#3c2f36" }}>{r.code}</div>
                <div className="text-[11px]" style={{ color: SUB }}>{countAbbr(r.qty)} units</div>
              </div>
            </div>
            <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{inrAbbr(r.value)}</span>
          </div>
        ))}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

export default function ConsumptionOverview() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/portfolio/consumption/overview?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null)); }, [region]);

  const t = data?.totals || {};
  const cards = data?.cards || {};
  const timeline = data?.timeline || [];
  const cost = Number(t.cost ?? 0), units = Number(t.units ?? 0), nDept = Number(t.departments ?? 0);
  const nMat = Number(t.materials ?? 0), nPlants = Number(t.plants ?? 0), mom = Number(t.last_mom ?? 0);
  const deptTop5 = Number(t.dept_top5 ?? 0);
  const peak = Math.max(...timeline.map((x: any) => x.cost), 1);
  const avgM = Number(t.avg_month ?? 0);
  const departments = data?.departments || [];

  const tabs: Tab[] = [
    { key: "cost", tab: "Cost", label: "Internal consumption cost", value: cost, fmt: inrAbbr, gauge: peak ? avgM / peak : 0, gaugeLabel: "avg of peak month", color: ROSE, status: { text: mom >= 0 ? "Usage up" : "Usage down", color: mom >= 0 ? ROSE : "#5aa97e" }, stats: [{ value: pctSign(mom), label: "MoM", color: mom >= 0 ? ROSE : "#5aa97e" }, { value: inrAbbr(peak), label: "peak mo", color: "#a99aa1" }, { value: inrAbbr(avgM), label: "avg mo", color: "#a99aa1" }] },
    { key: "units", tab: "Units", label: "Units consumed", value: units, fmt: countAbbr, gauge: Math.min(nMat / 15000, 1), gaugeLabel: "SKU coverage", color: CORAL, status: { text: "Across SKUs", color: CORAL }, stats: [{ value: countAbbr(units), label: "units", color: "#a99aa1" }, { value: countAbbr(nMat), label: "SKUs", color: "#a99aa1" }, { value: `${nPlants}`, label: "plants", color: "#a99aa1" }] },
    { key: "dept", tab: "Depts", label: "Consuming departments", value: nDept, fmt: countAbbr, gauge: deptTop5 / 100, gaugeLabel: "top-5 share", color: PLUM, status: { text: deptTop5 >= 50 ? "Concentrated" : "Distributed", color: PLUM }, stats: [{ value: `${deptTop5.toFixed(0)}%`, label: "top-5", color: PLUM }, { value: countAbbr(nDept), label: "depts", color: "#a99aa1" }, { value: inrAbbr(cost / Math.max(nDept, 1)), label: "avg/dept", color: "#a99aa1" }] },
  ];

  const top1v = Number(departments[0]?.value ?? 0);
  const top5v = cost * deptTop5 / 100;
  const segments = [
    { label: "Top department", value: top1v, color: PLUM },
    { label: "Depts 2–5", value: Math.max(0, top5v - top1v), color: "#c4a3d4" },
    { label: "All others", value: Math.max(0, cost - top5v), color: "#e7dceb" },
  ];

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Consumption &amp; Revenue</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>internal goods-issue — what the hospitals actually use · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#7a5f6c", boxShadow: "0 4px 14px -8px rgba(90,40,60,0.2)" }}>6-month window</span>
      </div>

      <div className="flex flex-wrap lg:flex-nowrap gap-5 items-stretch mb-5">
        <div className="w-full lg:w-1/3 min-h-[220px]"><BrandPanel title="Consumption KPI's" subtitle="Clinical usage" accent={ROSE} /></div>
        <div className="w-full lg:w-1/3"><GaugeCard tabs={tabs} /></div>
        <div className="w-full lg:w-1/3"><DonutCard label="Department concentration" headline={cost} headSuffix="total cost" centerLabel="Depts"
          segments={segments} insights={[{ label: "Top-5", value: `${deptTop5.toFixed(0)}%`, color: PLUM }, { label: "Depts", value: countAbbr(nDept), color: "#6b7280" }]}
          score={{ text: deptTop5 >= 50 ? "Concentrated" : "Spread", value: Math.round(deptTop5), color: deptTop5 >= 50 ? PLUM : "#5aa97e" }} /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col gap-5 min-w-0">
          <ConsumptionFlow timeline={timeline} />
          <KpiGrid cards={cards} />
        </div>
        <div className="xl:col-span-4 flex flex-col gap-5 min-w-0">
          <CategoriesCard categories={data?.categories || []} />
          <DepartmentsCard departments={departments} />
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full"
        style={{ background: `${ROSE}12`, color: DEEP, border: `1px solid ${ROSE}2c` }}>
        Consumption = internal goods-issue cost (movement 201) over 6 months. No sale/billing data in source — "revenue" is not available, so figures reflect usage cost, not sales.
      </div>
    </div>
  );
}
