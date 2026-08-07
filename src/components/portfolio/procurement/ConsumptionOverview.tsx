"use client";
// Consumption & Revenue portfolio overview — soft rose "clinical consumption" identity.
// Mirrors the procurement overview quality: tabbed gauge + concentration donut + brand panel,
// then a consumption flow + KPI grid, with category & department side panels.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, catName, useMount, smoothPath, CountUp } from "@/components/portfolio/kit";
import { GaugeCard, DonutCard, BrandPanel, type Tab } from "./ExecCards";
import { useDrillBind } from "@/components/portfolio/useDrillBind";
import { useCardCategory, useCardScopedData } from "@/components/common/CardCategoryFilter";
import { TbActivityHeartbeat, TbBuildingHospital, TbFlask, TbReportMedical, TbEye, TbBolt } from "react-icons/tb";
import { KPIS, Kpi } from "@/lib/kpiRegistry";
import InventoryGlassKpiCard from "@/components/portfolio/inventory/InventoryGlassKpiCard";
import { fetchKpiChart, computeInsights, buildSimTiles } from "@/components/portfolio/inventory/kpiChartFetch";

// Consumption KPIs from registry — same pattern as /inventory's grid.
const consumptionKpis: Kpi[] = KPIS.filter((k) => k.portfolio === "consumption");
// Simulated consumption KPIs, adapted to the same glass-card shape so they render
// inline in the grid (washed-out + a "Simulated" tag) — no separate section.
const simConsumption = buildSimTiles("consumption");

const PAGE = "#F6F0F2", INK = "#33262e", SUB = "#9a8b92";
const ROSE = "#cf5d84", DEEP = "#a8446a", CORAL = "#ec8a8d", PLUM = "#9a6bb0", GREY = "#cbb9c1";
const EMERALD = "#0e7a54", EMERALD_TINT = "#e6f5ee", EMERALD_LINE = "#cbe8d9";
const CARD_SH = "0 16px 40px -24px rgba(90,40,60,0.20), 0 4px 14px -8px rgba(90,40,60,0.06)";
const pctSign = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function ConsumptionFlow({ timeline, cat, loading }: { timeline: any[]; cat: any; loading: boolean }) {
  const on = useMount(140); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || [];
  // Was `if (!data.length) return null` — with a card-level filter that would make the
  // whole card VANISH the moment someone picked Onco Drugs, which reads as the app
  // breaking. It now stays put and says why it is empty.
  if (!data.length) {
    return (
      <div className="rounded-3xl bg-white p-6 flex flex-col" style={{ boxShadow: CARD_SH }}>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div><h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbActivityHeartbeat size={17} style={{ color: ROSE }} />Consumption flow</h3>
            <p className="text-[12px] mt-0.5" style={{ color: SUB }}>monthly internal consumption cost · units in tooltip</p></div>
          {cat.chip}
        </div>
        <div className="mt-4">{cat.note(true) ?? <span className="text-[12.5px]" style={{ color: SUB }}>No consumption in this window.</span>}</div>
      </div>
    );
  }
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
        <div className="flex items-center gap-2">
          {cat.chip}
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${ROSE}14`, color: DEEP }}>avg {inrAbbr(avg)}/mo</span>
        </div>
      </div>
      {cat.note(!loading && total === 0) && <div className="mt-3">{cat.note(true)}</div>}
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

// Informational only — reconciles internal goods-issue (fact_consumption) against the
// real patient-billed extract (sales_by_material) that already powers /revenueMargin.
// Deliberately network-wide, not cut by the page's Plant selector: /revenue/insights,
// the exact reference this card mirrors, has no Plant param either — the sales extract
// is not the same grain fact_consumption is, so a per-hospital cut here would show a
// number that /revenueMargin itself cannot corroborate. Category is the one control
// both sides already share (via da._material_category_map), so that's what this card
// filters on.
function BillableSplitCard({ cat }: { cat: ReturnType<typeof useCardCategory> }) {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const on = useMount(180);
  useEffect(() => {
    setLoading(true);
    const ac = new AbortController();
    const qs = cat.active ? `?Category=${encodeURIComponent(cat.category)}` : "";
    fetch(`${DASHBOARD_API_BASE_URL}/consumption/billable-split${qs}`, { signal: ac.signal })
      .then((r) => r.json()).then((j) => { setD(j); setLoading(false); })
      .catch((e) => { if (e?.name !== "AbortError") setLoading(false); });
    return () => ac.abort();
  }, [cat.category]);

  const b = d?.billable || {}, nb = d?.nonBillable || {};
  const bRev = Number(b.revenue ?? 0), bMargin = Number(b.margin ?? 0), bMarginPct = Number(b.marginPct ?? 0);
  const bMat = Number(b.materials ?? 0), bMfr = Number(b.manufacturersNetwork ?? 0);
  const nbCost = Number(nb.cost ?? 0), nbMat = Number(nb.materials ?? 0);
  const total = Number(d?.totalUsage ?? 0);
  const bShare = Number(d?.billableSharePct ?? 0), nbShare = Number(d?.nonBillableSharePct ?? 0);
  const multiple = d?.visibilityMultiple;
  const showEmpty = !loading && total === 0;
  const noteEl = cat.note(showEmpty);

  return (
    <div className="rounded-3xl p-6" style={{ background: "linear-gradient(155deg,#ffffff,#fbfaf6 55%,#f4faf7)", boxShadow: CARD_SH, border: `1px solid ${EMERALD_LINE}` }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: EMERALD_TINT, color: EMERALD }}><TbEye size={18} /></span>
          <div>
            <h3 className="text-[17px] font-bold leading-tight" style={{ color: INK }}>True Material Usage</h3>
            <p className="text-[12px] mt-0.5" style={{ color: SUB }}>patient-billed (IP+OP) + internal goods-issue, same 6-month window</p>
          </div>
        </div>
        {cat.chip}
      </div>

      {noteEl ? <div className="mt-4">{noteEl}</div> : (
      <>
      <div className="mt-5 flex items-baseline gap-3 flex-wrap">
        <div className="text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}>
          {loading ? "···" : <CountUp value={total} format={inrAbbr} />}
        </div>
        <div className="text-[12.5px]" style={{ color: SUB }}>total material usage HCG-wide{cat.active ? ` · ${cat.category}` : ""}</div>
      </div>

      <div className="mt-3 h-2.5 rounded-full overflow-hidden flex" style={{ background: "#f0eef0" }}>
        <div className="h-full" style={{ width: on ? `${Math.max(bShare, total ? 1 : 0)}%` : "0%", background: `linear-gradient(90deg,#12996b,${EMERALD})`, transition: "width 1s cubic-bezier(0.22,1,0.36,1)" }} />
        <div className="h-full" style={{ width: on ? `${Math.max(nbShare, total ? 1 : 0)}%` : "0%", background: `linear-gradient(90deg,${ROSE},${DEEP})`, transition: "width 1s cubic-bezier(0.22,1,0.36,1) 0.08s" }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium" style={{ color: SUB }}>
        <span style={{ color: EMERALD }}>{bShare.toFixed(1)}% billed to patients</span>
        <span style={{ color: DEEP }}>{nbShare.toFixed(1)}% internal only</span>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: EMERALD_TINT, border: `1px solid ${EMERALD_LINE}` }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.04em]" style={{ color: EMERALD }}>Billable · patient-billed</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-full" style={{ background: "#fff", color: EMERALD }}>IP + OP</span>
          </div>
          <div className="text-[24px] font-bold tabular-nums mt-1.5" style={{ color: "#0a5c40" }}>{loading ? "···" : inrAbbr(bRev)}</div>
          <div className="text-[11.5px] mt-1" style={{ color: "#3f7a63" }}>real margin {inrAbbr(bMargin)} · {bMarginPct.toFixed(1)}%</div>
          <div className="mt-2.5 pt-2.5 flex items-center justify-between text-[11px] tabular-nums" style={{ borderTop: `1px solid ${EMERALD_LINE}`, color: "#3f7a63" }}>
            <span>{countAbbr(bMat)} materials</span><span>{countAbbr(bMfr)} manufacturers</span>
          </div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: `${ROSE}0d`, border: `1px solid ${ROSE}33` }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.04em]" style={{ color: DEEP }}>Non-billable · internal only</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-full" style={{ background: "#fff", color: DEEP }}>Goods issue</span>
          </div>
          <div className="text-[24px] font-bold tabular-nums mt-1.5" style={{ color: DEEP }}>{loading ? "···" : inrAbbr(nbCost)}</div>
          <div className="text-[11.5px] mt-1" style={{ color: "#8a6270" }}>cost to hospital · no patient bill raised</div>
          <div className="mt-2.5 pt-2.5 flex items-center justify-between text-[11px] tabular-nums" style={{ borderTop: `1px solid ${ROSE}33`, color: "#8a6270" }}>
            <span>{countAbbr(nbMat)} materials</span><span>&nbsp;</span>
          </div>
        </div>
      </div>

      {!loading && total > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl px-4 py-3" style={{ background: "#fff9ec", border: "1px solid #f2e3ba" }}>
          <TbBolt size={16} className="flex-shrink-0 mt-[1px]" style={{ color: "#a9760f" }} />
          <p className="text-[12px] leading-snug" style={{ color: "#7a5a12" }}>
            {nbShare < 0.5 ? (
              <>Internal-consumption KPIs — Days on Hand, Turnover, Non-Moving — see almost nothing here: {cat.active ? cat.category : "this material"} is dispensed straight to patients (IP+OP billing), not issued through internal stock movements. </>
            ) : (
              <>Internal-consumption KPIs — Days on Hand, Turnover, Non-Moving — are built only from the {nbShare.toFixed(1)}% shown in rose above.
              {typeof multiple === "number" && multiple > 1 && multiple < 100
                ? ` For every ₹1 those formulas can see, ₹${multiple.toFixed(1)} of real material moves through the hospital.`
                : ""} </>
            )}
            The {bShare.toFixed(1)}% in green — {inrAbbr(bRev)} of billed revenue and {inrAbbr(bMargin)} of real margin — is invisible to them today.
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function CategoriesCard({ categories, cat, loading }: { categories: any[]; cat: any; loading: boolean }) {
  const on = useMount(220);
  const rows = (categories || []).slice(0, 7);
  const drill = useDrillBind({
    kpi: "unit-sold-per-sku", dim: "material_group", by: "material", measure: "consumption_cost",
    label: "items", dimLabel: "Category · 6-month consumption", format: inrAbbr, category: cat.drill,
  });
  const max = Math.max(...rows.map((r: any) => r.value), 1);
  return (
    <div className="rounded-3xl bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbFlask size={16} style={{ color: ROSE }} />Consumption by category</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>material group · by cost</p>
        </div>
        {cat.chip}
      </div>
      {cat.note(!loading && rows.every((r: any) => !r.value)) && <div className="mt-3">{cat.note(true)}</div>}
      <div className="mb-3" />
      <div className="flex-1 flex flex-col justify-between gap-2.5">
        {rows.map((r: any, i: number) => { const uncat = r.uncat; const col = uncat ? GREY : ROSE; return (
          // The "Uncategorized" row deliberately gets no drill-down: it is every line whose
          // material_group is null, invented client-side, so there is no group value to send.
          // bind(undefined) returns inert props rather than a panel that would come back empty.
          <div key={i} {...drill.bind(uncat ? undefined : r.name)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium truncate pr-2" style={{ color: uncat ? "#a99aa1" : "#3c2f36" }} title={r.name}>{catName(r.name)}</span>
              <span className="text-[12px] font-bold tabular-nums flex-shrink-0" style={{ color: uncat ? "#a99aa1" : INK }}>{inrAbbr(r.value)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3edf0" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: uncat ? GREY : `linear-gradient(90deg,${CORAL},${ROSE})`, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms` }} />
            </div>
          </div>
        ); })}
        {drill.panel}
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
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}/portfolio/consumption/overview?Plant=${encodeURIComponent(region)}`)
      .then((r) => r.json()).then((d) => { setData(d || null); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [region]);
  // true while in flight OR resolved with nothing usable -- never let a failed/slow
  // fetch fall through to the cards' old confident-zero render.
  const showSkeleton = loading || !data;

  // Chart data per KPI key, for the glass grid — identical fetch/shape to /inventory's
  // grid (aggregated ~12-row series per tile, not the raw table).
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      consumptionKpis.map(async (kpi) => {
        if (!kpi.chart) return { key: kpi.key, data: [] };
        try {
          return { key: kpi.key, data: await fetchKpiChart(kpi, region) };
        } catch {
          return { key: kpi.key, data: [] };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, any[]> = {};
      results.forEach(({ key, data }) => { map[key] = data; });
      setChartDataMap(map);
    });
    return () => { cancelled = true; };
  }, [region]);

  // Consumption-derived: onco legitimately reads ~zero because HCG dispenses it through
  // IP/OP billing rather than internal consumption movements. The chip greys that bucket
  // and the card explains an empty result rather than looking broken.
  //
  // One `useCardCategory` + `useCardScopedData` pair PER CARD, all pointed at the same
  // overview URL. They share nothing: filtering the flow chart to Consumables leaves the
  // gauge, the KPI tiles and the category bars each showing whatever they were showing.
  const overview = (c: string, signal: AbortSignal) =>
    fetch(`${DASHBOARD_API_BASE_URL}/portfolio/consumption/overview?Plant=${encodeURIComponent(region)}&Category=${encodeURIComponent(c)}`, { signal }).then((r) => r.json());

  const cat = useCardCategory({ accent: ROSE, domain: "consumption", label: "Consumption by category" });
  const scoped = useCardScopedData(data, cat.category, overview);
  const gaugeCat = useCardCategory({ accent: ROSE, domain: "consumption", label: "Consumption totals" });
  const gaugeScoped = useCardScopedData(data, gaugeCat.category, overview);
  const flowCat = useCardCategory({ accent: ROSE, domain: "consumption", label: "Consumption flow" });
  const flowScoped = useCardScopedData(data, flowCat.category, overview);
  // Its own fetch (billable-split is network-wide, not the Plant-scoped overview payload
  // every other card here reads), so it only needs the chip half of the hook.
  const billableCat = useCardCategory({ accent: EMERALD, domain: "billing", label: "True material usage" });

  const t = gaugeScoped.data?.totals || {};
  const timeline = flowScoped.data?.timeline || [];
  const cost = Number(t.cost ?? 0), units = Number(t.units ?? 0), nDept = Number(t.departments ?? 0);
  const nMat = Number(t.materials ?? 0), nPlants = Number(t.plants ?? 0), mom = Number(t.last_mom ?? 0);
  const deptTop5 = Number(t.dept_top5 ?? 0);
  const peak = Math.max(...timeline.map((x: any) => x.cost), 1);
  const avgM = Number(t.avg_month ?? 0);
  const departments = data?.departments || [];
  // The department donut and the department leaderboard stay on the PAGE's unscoped
  // totals. kpi_consumption_by_department is cut at plant x cost-centre x month, with no
  // material column, so `departments` is byte-identical under every category — the
  // backend says so itself with `departments_category_scoped: false`. Feeding them the
  // gauge's scoped totals would leave the donut re-slicing an unscoped denominator.
  const ut = data?.totals || {};
  const uCost = Number(ut.cost ?? 0), uDeptTop5 = Number(ut.dept_top5 ?? 0), uNDept = Number(ut.departments ?? 0);

  const tabs: Tab[] = [
    { key: "cost", tab: "Cost", label: "Internal consumption cost", value: cost, fmt: inrAbbr, gauge: peak ? avgM / peak : 0, gaugeLabel: "avg of peak month", color: ROSE, status: { text: mom >= 0 ? "Usage up" : "Usage down", color: mom >= 0 ? ROSE : "#5aa97e" }, stats: [{ value: pctSign(mom), label: "MoM", color: mom >= 0 ? ROSE : "#5aa97e" }, { value: inrAbbr(peak), label: "peak mo", color: "#a99aa1" }, { value: inrAbbr(avgM), label: "avg mo", color: "#a99aa1" }] },
    { key: "units", tab: "Units", label: "Units consumed", value: units, fmt: countAbbr, gauge: Math.min(nMat / 15000, 1), gaugeLabel: "SKU coverage", color: CORAL, status: { text: "Across SKUs", color: CORAL }, stats: [{ value: countAbbr(units), label: "units", color: "#a99aa1" }, { value: countAbbr(nMat), label: "SKUs", color: "#a99aa1" }, { value: `${nPlants}`, label: "hospitals", color: "#a99aa1" }] },
    // The Depts tab is REMOVED while this card's filter is on, not annotated. Its figures
    // (730 departments, top-5 share) are portfolio-wide and identical for every category,
    // so leaving it in would put a number the control visibly cannot move inside a card
    // the control is acting on. Clearing the filter brings it straight back.
    ...(gaugeCat.active ? [] : [{ key: "dept", tab: "Depts", label: "Consuming departments", value: nDept, fmt: countAbbr, gauge: deptTop5 / 100, gaugeLabel: "top-5 share", color: PLUM, status: { text: deptTop5 >= 50 ? "Concentrated" : "Distributed", color: PLUM }, stats: [{ value: `${deptTop5.toFixed(0)}%`, label: "top-5", color: PLUM }, { value: countAbbr(nDept), label: "depts", color: "#a99aa1" }, { value: inrAbbr(cost / Math.max(nDept, 1)), label: "avg/dept", color: "#a99aa1" }] } as Tab]),
  ];

  const top1v = Number(departments[0]?.value ?? 0);
  const top5v = uCost * uDeptTop5 / 100;
  const segments = [
    { label: "Top department", value: top1v, color: PLUM },
    { label: "Depts 2–5", value: Math.max(0, top5v - top1v), color: "#c4a3d4" },
    { label: "All others", value: Math.max(0, uCost - top5v), color: "#e7dceb" },
  ];

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Consumption &amp; Revenue</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>internal goods-issue — what the hospitals actually use · {displayRegion(region)}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#7a5f6c", boxShadow: "0 4px 14px -8px rgba(90,40,60,0.2)" }}>6-month window</span>
      </div>

      <div className="flex flex-wrap lg:flex-nowrap gap-5 items-stretch mb-5">
        <div className="w-full lg:w-1/3 min-h-[220px]"><BrandPanel title="Consumption KPI's" subtitle="Clinical usage" accent={ROSE} /></div>
        <div className="w-full lg:w-1/3"><GaugeCard tabs={tabs} loading={showSkeleton} headerSlot={gaugeCat.chip}
          note={gaugeCat.note(!gaugeScoped.loading && cost === 0)} /></div>
        {/* No chip: kpi_consumption_by_department has no material grain, so every segment
            here is identical under every category. A control would be inert. */}
        <div className="w-full lg:w-1/3"><DonutCard label="Department concentration" headline={uCost} headSuffix="total cost" centerLabel="Depts"
          segments={segments} insights={[{ label: "Top-5", value: `${uDeptTop5.toFixed(0)}%`, color: PLUM }, { label: "Depts", value: countAbbr(uNDept), color: "#6b7280" }]}
          score={{ text: uDeptTop5 >= 50 ? "Concentrated" : "Spread", value: Math.round(uDeptTop5), color: uDeptTop5 >= 50 ? PLUM : "#5aa97e" }} loading={showSkeleton} /></div>
      </div>

      <div className="mb-5"><BillableSplitCard cat={billableCat} /></div>

      {/* Full width: was squeezed to 8/12 next to the two list cards, which left this
          card's own column short of the stacked pair beside it once the KPI grid moved
          out below — a wide monthly trend reads better full-width anyway. */}
      <div className="mb-5"><ConsumptionFlow timeline={timeline} cat={flowCat} loading={flowScoped.loading} /></div>

      {/* Two list cards, side by side — similar row counts (7 vs 6), so they land at
          a near-identical natural height without any stretch hack. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <CategoriesCard categories={scoped.data?.categories || []} cat={cat} loading={scoped.loading} />
        <DepartmentsCard departments={departments} />
      </div>

      {/* ── GLASSMORPHIC KPI grid — pixel-identical to /inventory's grid ── */}
      <div className="mt-5">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(186,230,253,0.6)", background: "rgba(255,255,255,0.4)" }}
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y"
            style={{ borderColor: "transparent" }}
          >
            {consumptionKpis.map((kpi, i) => {
              const chartData = chartDataMap[kpi.key] ?? [];
              return (
                <div
                  key={kpi.key}
                  className="relative flex justify-center items-center p-6 transition duration-300"
                  style={{ background: "rgba(255,255,255,0.9)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, rgba(248,252,255,0.6) 0%, rgba(241,249,255,0.8) 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                  }}
                >
                  <InventoryGlassKpiCard
                    kpi={kpi}
                    index={i}
                    insights={computeInsights(kpi, chartData)}
                    chartData={chartData}
                  />
                </div>
              );
            })}
            {simConsumption.map((s, j) => {
              const idx = consumptionKpis.length + j;
              return (
                <div
                  key={s.kpi.key}
                  className="relative flex justify-center items-center p-6 transition duration-300"
                  style={{ background: "rgba(255,255,255,0.9)", opacity: 0.6, filter: "saturate(0.72)" }}
                  title="Simulated preview — activates the moment HCG shares the source"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "none"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "saturate(0.72)"; }}
                >
                  <span className="absolute top-3 right-3 z-20 text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-1 rounded-full" style={{ background: "#fff7ed", color: "#a56a15", border: "1px solid #fadcae" }}>
                    Simulated
                  </span>
                  <InventoryGlassKpiCard kpi={s.kpi} index={idx} insights={s.insights} chartData={s.chartData} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full"
        style={{ background: `${ROSE}12`, color: DEEP, border: `1px solid ${ROSE}2c` }}>
        Consumption = internal goods-issue cost (movement 201) over 6 months. For billed revenue &amp; true margin, see the <Link href="/revenueMargin" className="underline font-semibold">Revenue &amp; Margin</Link>&nbsp;page.
      </div>
    </div>
  );
}
