"use client";
// Forecasting portfolio overview — dense metrics bar + the original app's rich
// forecast explorers (Sales / Cash-flow / Replenishment) + clickable KPI cards.
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbTargetArrow, TbCoin, TbTrendingUp, TbReload, TbArrowUpRight as TbUp, TbArrowDownRight, TbArrowNarrowRight } from "react-icons/tb";

// original home-page "Stock Replenishment Radar" card, wired to real HCG data
const StockRadarCard = dynamic(() => import("@/components/ecommerce/AnalyticsHomeScreenCards/forecastCard1"), { ssr: false, loading: () => <div className="rounded-2xl bg-white" style={{ height: 320, border: "1px solid #ecedf4" }} /> });

const BG = "#F6F7FB", CARD = "#fff", BORDER = "#ecedf4";
const INK = "#171a2e", MUT = "#6a7085", MUT2 = "#9ca2b6", LINE = "#f0f1f6";
const AC = "#6d5efc", AC2 = "#9b8ffd", ACSOFT = "#efedff";        // violet accent
const GREEN = "#1fa971", RED = "#e5545b", AMBER = "#f0a52a";      // semantic only
const SH = "0 1px 2px rgba(20,24,60,0.05), 0 8px 24px -14px rgba(20,24,60,0.14)";
const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

// 3 detailed forecast pages, labelled in plain operations language.
const KPI_META: Record<string, any> = {
  "expected-demand": { title: "Expected Usage", href: "/salesQuantityForecast", Icon: TbTrendingUp, sub: "how much you'll use, item by item" },
  "cash-flow-forecast": { title: "Procurement Budget", href: "/cashFlowForecast", Icon: TbCoin, sub: "cash you'll need to restock" },
  "stock-replenishment": { title: "Reorder & Stock Risk", href: "/stockReplenishmentForecast", Icon: TbReload, sub: "what to order · what's running low" },
};

function Card({ children, className = "", style = {}, pad = "p-6" }: any) {
  return <div className={`fc-card rounded-[18px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SH, ...style }}>{children}</div>;
}
function SectionLabel({ n, title, hint, className = "" }: { n: number; title: string; hint?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 mb-3.5 flex-wrap ${className}`}>
      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: ACSOFT, color: AC }}>{n}</span>
      <h2 className="text-[16px] font-bold tracking-tight" style={{ color: INK }}>{title}</h2>
      {hint && <span className="text-[12.5px]" style={{ color: MUT2 }}>· {hint}</span>}
    </div>
  );
}
function Delta({ pct }: { pct: number }) {
  const up = pct >= 0, c = up ? GREEN : RED;
  return <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold tabular-nums" style={{ color: c }}>{up ? <TbUp size={13} /> : <TbArrowDownRight size={13} />}{Math.abs(pct).toFixed(1)}%</span>;
}
function Spark({ vals, fcFrom, c = AC }: { vals: number[]; fcFrom: number; c?: string }) {
  const on = useMount(90); if (vals.length < 2) return null;
  const w = 200, h = 34, max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const X = (i: number) => (i / (vals.length - 1)) * w;
  const Y = (v: number) => h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
  const pts = vals.map((v, i) => ({ x: X(i), y: Y(v) }));
  const solid = pts.slice(0, Math.max(fcFrom, 1)), dash = pts.slice(Math.max(fcFrom - 1, 0));
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: "visible" }}>
    {solid.length > 1 && <path d={smoothPath(solid)} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1s ease .2s" }} />}
    {dash.length > 1 && fcFrom < vals.length && <path d={smoothPath(dash)} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" style={{ opacity: on ? 0.55 : 0, transition: "opacity .6s ease .8s" }} />}
  </svg>;
}

// ── forecast hero ──
function Forecast({ timeline, t }: { timeline: any[]; t: any }) {
  const on = useMount(120); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || [];
  const W = 1000, H = 300, PADX = 8, PADT = 20, PADB = 34;
  const iW = W - PADX * 2, iH = H - PADT - PADB, n = data.length || 1;
  const X = (i: number) => PADX + (i / Math.max(n - 1, 1)) * iW;
  const max = Math.max(...data.map((d) => d.upper ?? d.actual ?? 0), 1) * 1.06;
  const Y = (v: number) => PADT + iH - (v / max) * iH;
  const model = useMemo(() => {
    if (!data.length) return null;
    const aI = data.map((d, i) => (d.actual != null ? i : -1)).filter((i) => i >= 0); if (!aI.length) return null;
    const lastA = aI[aI.length - 1];
    const aPts = aI.map((i) => ({ x: X(i), y: Y(data[i].actual) }));
    const br = { x: X(lastA), y: Y(data[lastA].actual) };
    const fI = data.map((d, i) => (d.is_forecast ? i : -1)).filter((i) => i >= 0);
    const fPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].forecast) }))];
    const uPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].upper) }))];
    const lPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].lower) }))];
    return { aPts, aLine: smoothPath(aPts), fLine: smoothPath(fPts), cone: `${smoothPath(uPts)} ${lPts.slice().reverse().map((p) => `L ${p.x} ${p.y}`).join(" ")} Z`, nowX: X(lastA) };
  }, [timeline]);
  if (!model) return <Card className="flex items-center justify-center" style={{ minHeight: 380 }}><span style={{ color: MUT }}>Loading forecast…</span></Card>;
  return (
    <Card className="flex flex-col" style={{ minHeight: 380 }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: MUT2 }}>Expected usage · next {t?.horizon ?? 3} months</div>
          <div className="mt-2.5 flex items-end gap-2.5 flex-wrap">
            <span className="text-[42px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={Number(t?.next_demand ?? 0)} format={countAbbr} /></span>
            <span className="text-[13.5px] font-medium mb-1" style={{ color: MUT }}>units expected next month</span>
          </div>
          <div className="mt-2 text-[12.5px]" style={{ color: MUT }}>Likely range <b style={{ color: INK }}>{countAbbr(Number(t?.next_lower ?? 0))} – {countAbbr(Number(t?.next_upper ?? 0))}</b> units</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: `${GREEN}12`, color: GREEN }}><TbTargetArrow size={13} />{Number(t?.accuracy ?? 0).toFixed(0)}% reliable</span>
      </div>
      <div className="relative mt-4 flex-1" style={{ minHeight: 230 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id="fCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={AC} stopOpacity="0.22" /><stop offset="100%" stopColor={AC} stopOpacity="0.02" /></linearGradient>
            <linearGradient id="fAct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={AC} stopOpacity="0.14" /><stop offset="100%" stopColor={AC} stopOpacity="0" /></linearGradient>
          </defs>
          {[0.33, 0.66, 1].map((gr, i) => <line key={i} x1={PADX} y1={Y(max * gr)} x2={W - PADX} y2={Y(max * gr)} stroke={LINE} strokeWidth="1" />)}
          <path d={model.cone} fill="url(#fCone)" style={{ opacity: on ? 1 : 0, transform: on ? "scaleY(1)" : "scaleY(0.5)", transformOrigin: `${model.nowX}px ${Y(0)}px`, transition: "opacity .9s ease .5s, transform 1s cubic-bezier(.22,1,.36,1) .5s" }} />
          <path d={`${model.aLine} L ${model.aPts[model.aPts.length - 1].x} ${Y(0)} L ${model.aPts[0].x} ${Y(0)} Z`} fill="url(#fAct)" style={{ opacity: on ? 1 : 0, transition: "opacity .8s ease .3s" }} />
          <path d={model.aLine} fill="none" stroke={AC} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.2s ease .3s" }} />
          <path d={model.fLine} fill="none" stroke={AC2} strokeWidth="2.75" strokeLinecap="round" strokeDasharray="6 6" style={{ opacity: on ? 1 : 0, transition: "opacity .7s ease 1s" }} />
          <line x1={model.nowX} y1={PADT - 6} x2={model.nowX} y2={PADT + iH} stroke="#d6d8e6" strokeWidth="1.25" strokeDasharray="3 4" />
          <text x={model.nowX + 6} y={PADT + 1} style={{ fontSize: 10, fontWeight: 600, fill: MUT2 }}>forecast</text>
          {data.map((d, i) => { const isF = d.is_forecast; const v = isF ? d.forecast : d.actual; if (v == null) return null; const active = hov === i; return (
            <g key={i} onMouseEnter={() => setHov(i)}>
              <rect x={X(i) - iW / (n * 2)} y={0} width={iW / n} height={H} fill="transparent" />
              <circle cx={X(i)} cy={Y(v)} r={active ? 5 : 0} fill="#fff" stroke={isF ? AC2 : AC} strokeWidth="2.5" />
              <text x={X(i)} y={H - 6} textAnchor="middle" style={{ fontSize: 11, fill: active ? INK : MUT2, fontWeight: active ? 600 : 500 }}>{d.label}</text>
            </g>
          ); })}
        </svg>
        {hov != null && data[hov] && (() => { const d = data[hov]; return (
          <div className="absolute pointer-events-none" style={{ left: `${(X(hov) / W) * 100}%`, top: 0, transform: "translate(-50%,-6px)" }}>
            <div className="px-3 py-1.5 rounded-lg text-center whitespace-nowrap" style={{ background: INK, boxShadow: "0 10px 24px -8px rgba(20,24,60,0.5)" }}>
              <div className="text-[12px] font-bold tabular-nums text-white">{countAbbr(d.is_forecast ? d.forecast : d.actual)} <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{d.is_forecast ? "forecast" : "actual"}</span></div>
              {d.is_forecast && <div className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.55)" }}>{countAbbr(d.lower)}–{countAbbr(d.upper)}</div>}
            </div></div>); })()}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] font-medium" style={{ color: MUT2 }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2.5px] rounded-full" style={{ background: AC }} />Actual use</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: AC2 }} />Forecast</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm" style={{ background: `${AC}33` }} />Likely range</span>
      </div>
    </Card>
  );
}

function Horizon({ timeline }: any) {
  const on = useMount(180);
  const fc = (timeline || []).filter((d: any) => d.is_forecast);
  if (!fc.length) return null;
  const max = Math.max(...fc.map((d: any) => d.forecast), 1);
  return (
    <Card className="flex flex-col flex-1" pad="p-5" style={{ minHeight: 130 }}>
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUT2 }}>Expected use by month</div>
        <span className="text-[11.5px]" style={{ color: MUT2 }}>units · next {fc.length} months</span>
      </div>
      <div className="flex-1 flex flex-col justify-around gap-2">
        {fc.map((m: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] font-semibold w-9 flex-shrink-0" style={{ color: "#4a5068" }}>{m.label}</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#f1f2f8" }}><div className="h-full rounded-full" style={{ width: on ? `${(m.forecast / max) * 100}%` : "0%", background: `linear-gradient(90deg,${AC2},${AC})`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 80}ms` }} /></div>
            <span className="text-[13px] font-bold tabular-nums w-14 text-right flex-shrink-0" style={{ color: INK }}>{countAbbr(m.forecast)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgingCard({ segs, total }: any) {
  const on = useMount(140);
  const rising = segs.find((s: any) => s.status === "Rising") || { count: 0 };
  const stable = segs.find((s: any) => s.status === "Stable") || { count: 0 };
  const riskPct = total ? Math.round((rising.count / total) * 100) : 0;
  const R = 46, SW = 14, C = 2 * Math.PI * R; let acc = 0;
  return (
    <Card className="flex flex-col flex-1" style={{ minHeight: 234 }}>
      <div className="flex items-baseline justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUT2 }}>Slow-moving stock</div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${AMBER}16`, color: "#c17d10" }}>next 90 days</span>
      </div>
      <div className="flex items-center gap-5 mt-3 flex-1">
        <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#f1f3f9" strokeWidth={SW} />
            {segs.map((s: any, i: number) => { const frac = total ? s.count / total : 0; const len = frac * C; const off = -acc; acc += len;
              return <circle key={i} cx="64" cy="64" r={R} fill="none" stroke={s.color} strokeWidth={SW} strokeLinecap="butt" strokeDasharray={`${on ? len : 0} ${C}`} strokeDashoffset={off} style={{ transition: `stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1) ${i * 140}ms` }} />; })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[24px] font-bold tabular-nums leading-none" style={{ color: AMBER }}>{riskPct}%</span><span className="text-[10px] mt-0.5" style={{ color: MUT2 }}>at risk</span></div>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-0.5"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: AMBER }} /><span className="text-[12.5px] font-medium" style={{ color: "#4a5068" }}>Turning slow</span></span><span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(rising.count)}</span></div>
            <div className="text-[11px]" style={{ color: MUT2 }}>review before they expire</div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: GREEN }} /><span className="text-[12.5px] font-medium" style={{ color: "#4a5068" }}>Moving well</span></span><span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(stable.count)}</span></div>
            <div className="text-[11px]" style={{ color: MUT2 }}>healthy turnover</div>
          </div>
        </div>
      </div>
      <div className="mt-auto pt-3 text-[11.5px]" style={{ color: MUT2, borderTop: `1px solid ${LINE}` }}><span className="pt-3 inline-block"><b style={{ color: INK }}>{countAbbr(rising.count)}</b> of {countAbbr(total)} items likely to turn slow-moving in 90 days — review to avoid expiry & tied-up cash</span></div>
    </Card>
  );
}

function Reorder({ rows }: { rows: any[] }) {
  const on = useMount(200); const data = (rows || []).slice(0, 7);
  const max = Math.max(...data.map((r) => r.value), 1);
  const totalVal = data.reduce((s, r) => s + r.value, 0);
  return (
    <Card className="flex flex-col flex-1" style={{ minHeight: 234 }}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUT2 }}>Priority reorder list</div>
        <span className="text-[11.5px]" style={{ color: MUT2 }}>{inrAbbr(totalVal)} to restock these {data.length} items</span>
      </div>
      <div className="flex-1 flex flex-col justify-between mt-2">
        {data.map((r, i) => (
          <div key={i} className="group flex items-center gap-3.5 rounded-xl px-2 py-1.5 -mx-2 transition-colors hover:bg-[#f7f6ff]">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold tabular-nums flex-shrink-0" style={{ background: i === 0 ? AC : ACSOFT, color: i === 0 ? "#fff" : AC }}>{i + 1}</span>
            <div className="min-w-0" style={{ width: 190 }}>
              <div className="text-[12.5px] font-semibold truncate" style={{ color: "#2b3050" }} title={r.desc}>{nm(r.desc, 26)}</div>
              <div className="text-[10.5px] tabular-nums" style={{ color: MUT2 }}>order {countAbbr(r.qty)} units</div>
            </div>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#f1f2f8" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: `linear-gradient(90deg,${AC2},${AC})`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 55}ms`, boxShadow: `0 1px 6px -1px ${AC}66` }} />
            </div>
            <span className="text-[13px] font-bold tabular-nums w-[70px] text-right flex-shrink-0" style={{ color: INK }}>{inrAbbr(r.value)}</span>
          </div>
        ))}
        {!data.length && <div className="py-8 text-center text-sm" style={{ color: MUT2 }}>No data.</div>}
      </div>
    </Card>
  );
}

export default function ForecastingOverview() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/portfolio/forecasting/overview?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const tl = data?.timeline || [];
  const acts = tl.filter((d: any) => d.actual != null).map((d: any) => d.actual);
  const fcs = tl.filter((d: any) => d.is_forecast).map((d: any) => d.forecast);
  const demandDelta = acts.length && fcs.length && acts[acts.length - 1] ? ((fcs[0] - acts[acts.length - 1]) / acts[acts.length - 1]) * 100 : 0;
  const cfVals = (data?.cashflow || []).map((d: any) => d.forecast);
  const cfDelta = cfVals.length >= 2 && cfVals[0] ? ((cfVals[cfVals.length - 1] - cfVals[0]) / cfVals[0]) * 100 : 0;
  const radar = data?.radar || [], aging = data?.aging || [];
  const radarSegs = radar.map((r: any) => ({ ...r, color: r.status === "Healthy" ? GREEN : r.status.includes("Out") ? RED : AMBER }));
  const radarTotal = radar.reduce((s: number, r: any) => s + r.count, 0);
  const agingSegs = aging.map((r: any) => ({ ...r, color: r.status === "Rising" ? AMBER : GREEN }));
  const agingTotal = aging.reduce((s: number, r: any) => s + r.count, 0);
  const cards = data?.cards || {};
  const cnt = (name: string, list: any[]) => Number((list.find((x: any) => x.status.includes(name)) || {}).count || 0);
  const radarMetrics = {
    stockOutMaterials: cnt("Out", radar),
    replenishmentQty: Number(t.replen_qty ?? 0),
    inventoryRisk: cnt("Rising", aging),
    demandForecast: Number(t.next_demand ?? 0),
    safeStock: cnt("Healthy", radar),
    totalStock: radarTotal,
  };

  const stockOutCount = cnt("Out", radar);
  const metrics = [
    { label: "Reorder now", value: countAbbr(Number(t.replen_skus ?? 0)), unit: "items", sub: `${inrAbbr(Number(t.replen_value ?? 0))} to restock`, tone: AC },
    { label: "Running low", value: countAbbr(stockOutCount), unit: "items", sub: "at risk of running out", tone: RED },
    { label: "Expected use · next month", value: countAbbr(Number(t.next_demand ?? 0)), unit: "units", delta: demandDelta, spark: [...acts, ...fcs], fcFrom: acts.length },
    { label: "Money to restock · next month", value: inrAbbr(Number(t.cashflow_next ?? 0)), unit: "", delta: cfDelta, spark: cfVals, fcFrom: 0 },
  ];

  return (
    <div className="-m-4 md:-m-6 p-5 md:p-7 min-w-0" style={{ background: BG, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`@keyframes fcIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fc-card{animation:fcIn .5s cubic-bezier(.22,1,.36,1) both;min-width:0;transition:transform .25s ease, box-shadow .25s ease}`}</style>
      <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
        <div>
          <h1 className="text-[25px] font-bold leading-tight tracking-tight" style={{ color: INK }}>Demand Forecast & Reorder Planning</h1>
          <p className="text-[13px] mt-1" style={{ color: MUT }}>What to order, what's running low, and the budget you'll need — next 3 months · {region}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg" style={{ color: GREEN, background: `${GREEN}12` }} title="How well the forecast matched actual usage in back-testing, at the planning (category) level.">
          <TbTargetArrow size={13} />{Number(t.accuracy ?? 0).toFixed(0)}% reliable for planning
        </span>
      </div>

      {/* metrics bar */}
      <Card pad="p-0" className="mb-5 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <div key={i} className="p-5 relative" style={{ borderLeft: i % 4 === 0 ? "none" : `1px solid ${LINE}`, borderTop: i >= 2 ? `1px solid ${LINE}` : "none" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em]" style={{ color: MUT2 }}>{m.label}</span>
                {m.delta != null && <Delta pct={m.delta} />}
              </div>
              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-[27px] leading-none font-bold tabular-nums tracking-tight" style={{ color: (m as any).tone || INK }}>{m.value}</span>
                {m.unit && <span className="text-[12px] font-medium mb-0.5" style={{ color: MUT2 }}>{m.unit}</span>}
              </div>
              <div className="mt-2 h-[34px] flex items-end">{m.spark ? <Spark vals={m.spark} fcFrom={m.fcFrom!} /> : <span className="text-[12px]" style={{ color: MUT }}>{m.sub}</span>}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── STEP 1 · ACT: what to order now + overall stock health ── */}
      <SectionLabel n={1} title="Order these first" hint="highest-value items your stock won't cover" />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col"><Reorder rows={data?.top_reorder || []} /></div>
        <div className="xl:col-span-4 flex items-center justify-center rounded-[18px]" style={{ background: "#fff", border: "1px solid #ecedf4", boxShadow: SH, padding: "8px 0" }}><StockRadarCard region={region} metrics={radarMetrics} /></div>
      </div>

      {/* ── STEP 2 · PLAN: expected usage ahead + slow-moving stock ── */}
      <SectionLabel n={2} title="The outlook ahead" hint="expected usage for the next 3 months, and stock turning slow" className="mt-8" />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col"><Forecast timeline={tl} t={t} /></div>
        <div className="xl:col-span-4 flex flex-col gap-5">
          <AgingCard segs={agingSegs} total={agingTotal} />
          <Horizon timeline={tl} />
        </div>
      </div>

      {/* ── STEP 3 · DRILL IN: full breakdowns ── */}
      <SectionLabel n={3} title="See the full details" hint="item-by-item usage, budget and stock risk" className="mt-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(KPI_META).map((key) => { const m = KPI_META[key]; const Icon = m.Icon; const c = cards[key] || {};
          const val = c.kind === "inr" ? inrAbbr(Number(c.value ?? 0)) : c.kind === "pct" ? `${Number(c.value ?? 0).toFixed(0)}%` : countAbbr(Number(c.value ?? 0));
          return (
            <Link key={key} href={m.href} className="fc-card group rounded-[18px] p-5 block" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SH }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px -12px rgba(109,94,252,0.35)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "#dcd8ff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = SH; (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.borderColor = BORDER; }}>
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ACSOFT, color: AC }}><Icon size={20} /></span>
                <TbArrowNarrowRight size={18} style={{ color: MUT2 }} className="transition-transform group-hover:translate-x-1" />
              </div>
              <div className="mt-4 text-[21px] font-bold tabular-nums leading-none" style={{ color: INK }}>{val}</div>
              <div className="mt-1.5 text-[13px] font-semibold" style={{ color: "#333850" }}>{m.title}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: MUT2 }}>{m.sub}</div>
            </Link>
          ); })}
      </div>

      <div className="mt-6 rounded-[14px] px-4 py-3 text-[12px] leading-relaxed" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUT }}>
        <b style={{ color: INK }}>How to read this:</b> forecasts are built from your last 6 months of actual usage. They're <b style={{ color: INK }}>reliable for planning</b> your overall and category-wise needs — the range shows best- and worst-case. For a single item, treat the number as a guide and confirm critical medicines with your team. Accuracy improves as more months of usage build up.
      </div>
    </div>
  );
}
