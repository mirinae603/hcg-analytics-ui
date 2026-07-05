"use client";
// Bespoke "Expected Usage" (demand) forecast page — production-grade, animated,
// ops-friendly. Aggregate confidence cone + headline stats + month-by-month +
// top items to plan for + per-category demand + a per-item explorer.
import React, { useEffect, useMemo, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { countAbbr, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbTargetArrow, TbTrendingUp, TbArrowUpRight, TbArrowDownRight, TbSearch, TbFlask2, TbCalendarStats, TbBox } from "react-icons/tb";

const BG = "#F6F7FB", CARD = "#fff", BORDER = "#ecedf4";
const INK = "#171a2e", MUT = "#6a7085", MUT2 = "#9ca2b6", LINE = "#f0f1f6";
const AC = "#6d5efc", AC2 = "#9b8ffd", ACSOFT = "#efedff";
const GREEN = "#1fa971", RED = "#e5545b";
const SH = "0 1px 2px rgba(20,24,60,0.05), 0 8px 24px -14px rgba(20,24,60,0.14)";
const nm = (s: string, n = 30) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

function Card({ children, className = "", style = {}, pad = "p-6" }: any) {
  return <div className={`dfc-card rounded-[18px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SH, ...style }}>{children}</div>;
}

// ── aggregate confidence cone ──────────────────────────────────────────────────
function Cone({ timeline, t }: { timeline: any[]; t: any }) {
  const on = useMount(120); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || [];
  const W = 1000, H = 300, PADX = 8, PADT = 22, PADB = 34;
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
    <Card className="flex flex-col" style={{ minHeight: 392 }}>
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
      <div className="relative mt-4 flex-1" style={{ minHeight: 236 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id="dfCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={AC} stopOpacity="0.22" /><stop offset="100%" stopColor={AC} stopOpacity="0.02" /></linearGradient>
            <linearGradient id="dfAct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={AC} stopOpacity="0.14" /><stop offset="100%" stopColor={AC} stopOpacity="0" /></linearGradient>
          </defs>
          {[0.33, 0.66, 1].map((gr, i) => <line key={i} x1={PADX} y1={Y(max * gr)} x2={W - PADX} y2={Y(max * gr)} stroke={LINE} strokeWidth="1" />)}
          <path d={model.cone} fill="url(#dfCone)" style={{ opacity: on ? 1 : 0, transform: on ? "scaleY(1)" : "scaleY(0.5)", transformOrigin: `${model.nowX}px ${Y(0)}px`, transition: "opacity .9s ease .5s, transform 1s cubic-bezier(.22,1,.36,1) .5s" }} />
          <path d={`${model.aLine} L ${model.aPts[model.aPts.length - 1].x} ${Y(0)} L ${model.aPts[0].x} ${Y(0)} Z`} fill="url(#dfAct)" style={{ opacity: on ? 1 : 0, transition: "opacity .8s ease .3s" }} />
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
    <Card className="flex flex-col flex-1" pad="p-5" style={{ minHeight: 140 }}>
      <div className="flex items-center gap-2 mb-3"><TbCalendarStats size={15} style={{ color: AC }} /><div className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUT2 }}>Expected use by month</div></div>
      <div className="flex-1 flex flex-col justify-around gap-2.5">
        {fc.map((m: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] font-semibold w-9 flex-shrink-0" style={{ color: "#4a5068" }}>{m.label}</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#f1f2f8" }}><div className="h-full rounded-full" style={{ width: on ? `${(m.forecast / max) * 100}%` : "0%", background: `linear-gradient(90deg,${AC2},${AC})`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 90}ms` }} /></div>
            <span className="text-[13px] font-bold tabular-nums w-14 text-right flex-shrink-0" style={{ color: INK }}>{countAbbr(m.forecast)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TopItems({ rows }: { rows: any[] }) {
  const on = useMount(200); const data = (rows || []).slice(0, 8);
  const max = Math.max(...data.map((r) => r.forecast), 1);
  return (
    <Card className="flex flex-col" style={{ minHeight: 300 }}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="flex items-center gap-2"><TbBox size={15} style={{ color: AC }} /><h3 className="text-[15px] font-bold" style={{ color: INK }}>Top items to plan for</h3></div>
        <span className="text-[11.5px]" style={{ color: MUT2 }}>by forecast usage · next {rows?.[0] ? "3" : ""} months</span>
      </div>
      <div className="flex-1 flex flex-col justify-between mt-2">
        {data.map((r, i) => {
          const monthly = r.next_mo || r.forecast / 3;
          const isNew = (r.last_actual || 0) < 50;               // no meaningful prior usage
          const delta = r.last_actual > 0 ? ((monthly - r.last_actual) / r.last_actual) * 100 : 0;
          const up = delta >= 0; const capped = Math.min(Math.abs(delta), 999);
          return (
            <div key={i} className="group flex items-center gap-3.5 rounded-xl px-2 py-1.5 -mx-2 transition-colors hover:bg-[#f7f6ff]">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold tabular-nums flex-shrink-0" style={{ background: i === 0 ? AC : ACSOFT, color: i === 0 ? "#fff" : AC }}>{i + 1}</span>
              <div className="min-w-0" style={{ width: 210 }}>
                <div className="text-[12.5px] font-semibold truncate" style={{ color: "#2b3050" }} title={r.desc}>{nm(r.desc, 30)}</div>
                <div className="text-[10.5px] tabular-nums" style={{ color: MUT2 }}>{r.group}</div>
              </div>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#f1f2f8" }}>
                <div className="h-full rounded-full" style={{ width: on ? `${(r.forecast / max) * 100}%` : "0%", background: `linear-gradient(90deg,${AC2},${AC})`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 55}ms`, boxShadow: `0 1px 6px -1px ${AC}66` }} />
              </div>
              <span className="text-[13px] font-bold tabular-nums w-[62px] text-right flex-shrink-0" style={{ color: INK }}>{countAbbr(r.forecast)}</span>
              {isNew ? (
                <span className="inline-flex items-center justify-end text-[10px] font-bold uppercase tracking-wide w-[52px] flex-shrink-0" style={{ color: AC }}>new</span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold w-[52px] justify-end flex-shrink-0" style={{ color: up ? GREEN : RED }}>{up ? <TbArrowUpRight size={12} /> : <TbArrowDownRight size={12} />}{capped.toFixed(0)}{capped >= 999 ? "+" : ""}%</span>
              )}
            </div>
          ); })}
        {!data.length && <div className="py-8 text-center text-sm" style={{ color: MUT2 }}>No data.</div>}
      </div>
    </Card>
  );
}

function ByCategory({ rows }: { rows: any[] }) {
  const on = useMount(240); const data = (rows || []).slice(0, 8);
  const max = Math.max(...data.map((r) => r.forecast), 1);
  return (
    <Card className="flex flex-col" style={{ minHeight: 300 }}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[15px] font-bold" style={{ color: INK }}>Forecast demand by category</h3>
        <span className="text-[11.5px]" style={{ color: MUT2 }}>units · 3-month horizon</span>
      </div>
      <div className="flex-1 flex flex-col justify-between gap-2">
        {data.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] font-medium w-[130px] truncate flex-shrink-0" style={{ color: "#4a5068" }} title={r.group}>{r.group}</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "#f1f2f8" }}><div className="h-full rounded-full" style={{ width: on ? `${(r.forecast / max) * 100}%` : "0%", background: `linear-gradient(90deg,${AC},${AC2})`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 60}ms` }} /></div>
            <span className="text-[12.5px] font-bold tabular-nums w-[58px] text-right flex-shrink-0" style={{ color: INK }}>{countAbbr(r.forecast)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── per-item explorer ──────────────────────────────────────────────────────────
function ItemExplorer({ region }: { region: string }) {
  const [cat, setCat] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<{ Material: string; ["Material Description"]: string } | null>(null);
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/forecastMappings/${region}_forecast_material_catalogue.json`).then((r) => r.json())
      .then((d: any[]) => { setCat(d || []); if (d?.length) setSel(d[Math.min(1, d.length - 1)]); }).catch(() => setCat([]));
  }, [region]);

  useEffect(() => {
    if (!sel) return; setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}/forecast/sales-forecast?Plant=${encodeURIComponent(region)}&Material=${encodeURIComponent(sel.Material)}`)
      .then((r) => r.json()).then((d: any[]) => {
        const tl = (d || []).map((x) => { const isF = Number(x.Sales_Quantity_Forecast) > 0;
          return { label: String(x["Posting Date"]).slice(0, 2) === "12" ? "Dec" : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"][parseInt(String(x["Posting Date"]).slice(0, 2)) - 1] || String(x["Posting Date"]).slice(0, 2),
            actual: Number(x.sales_qty) > 0 ? Number(x.sales_qty) : null,
            forecast: isF ? Number(x.Sales_Quantity_Forecast) : null,
            lower: isF ? Number(x.Lower_Bound_Sales_Quantity_Forecast) : null, upper: isF ? Number(x.Upper_Bound_Sales_Quantity_Forecast) : null, is_forecast: isF }; });
        setRows(tl);
      }).catch(() => setRows([])).finally(() => setLoading(false));
  }, [sel, region]);

  const filtered = q ? cat.filter((c) => (c["Material Description"] || "").toLowerCase().includes(q.toLowerCase()) || String(c.Material).includes(q)).slice(0, 40) : cat.slice(0, 40);
  const fcr = rows.filter((r) => r.is_forecast);
  const nextMo = fcr[0];

  return (
    <Card>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2"><TbFlask2 size={15} style={{ color: AC }} /><h3 className="text-[15px] font-bold" style={{ color: INK }}>Explore a specific item</h3></div>
          <p className="text-[12px] mt-0.5" style={{ color: MUT }}>search any medicine or supply to see its 3-month usage forecast</p>
        </div>
        <div className="relative" style={{ minWidth: 280 }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: `1px solid ${BORDER}`, background: "#fbfbfe" }}>
            <TbSearch size={15} style={{ color: MUT2 }} />
            <input value={open ? q : (sel?.["Material Description"] || "")} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setQ(""); setOpen(true); }}
              placeholder="Search item…" className="flex-1 bg-transparent text-[13px] focus:outline-none" style={{ color: INK }} />
          </div>
          {open && (
            <div className="absolute z-20 mt-1.5 w-full max-h-64 overflow-auto rounded-xl bg-white py-1" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 16px 40px -18px rgba(20,24,60,0.35)" }}>
              {filtered.map((c) => (
                <button key={c.Material} onClick={() => { setSel(c); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-[#f4f3ff] transition-colors">
                  <div className="text-[12.5px] font-medium truncate" style={{ color: INK }}>{nm(c["Material Description"], 40)}</div>
                  <div className="text-[10.5px]" style={{ color: MUT2 }}>{c.Material}</div>
                </button>
              ))}
              {!filtered.length && <div className="px-3 py-3 text-[12.5px]" style={{ color: MUT2 }}>No item found.</div>}
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-[13px]" style={{ color: MUT2 }}><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${AC} transparent ${AC} ${AC}` }} />Loading forecast…</div>
      ) : rows.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8"><Cone timeline={rows} t={{ next_demand: nextMo?.forecast ?? 0, next_lower: nextMo?.lower ?? 0, next_upper: nextMo?.upper ?? 0, accuracy: 0, horizon: fcr.length }} /></div>
          <div className="xl:col-span-4 flex flex-col gap-3">
            <div className="rounded-2xl p-5" style={{ background: "linear-gradient(150deg,#faf9ff,#f3f1ff)", border: `1px solid ${ACSOFT}` }}>
              <div className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: MUT2 }}>{nm(sel?.["Material Description"] || "", 34)}</div>
              <div className="mt-2 text-[30px] font-bold tabular-nums leading-none" style={{ color: INK }}>{countAbbr(Number(nextMo?.forecast ?? 0))}</div>
              <div className="text-[12px] mt-1" style={{ color: MUT }}>units next month · range <b style={{ color: INK }}>{countAbbr(Number(nextMo?.lower ?? 0))}–{countAbbr(Number(nextMo?.upper ?? 0))}</b></div>
            </div>
            {fcr.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ border: `1px solid ${BORDER}` }}>
                <span className="text-[12.5px] font-medium" style={{ color: "#4a5068" }}>{m.label}</span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(m.forecast)} <span className="text-[11px] font-normal" style={{ color: MUT2 }}>units</span></span>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="py-16 text-center text-[13px]" style={{ color: MUT2 }}>Pick an item to see its forecast.</div>}
    </Card>
  );
}

export default function DemandForecastDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { setData(null); fetch(`${DASHBOARD_API_BASE_URL}/forecast/demand-insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {}; const tl = data?.timeline || [];

  const metrics = [
    { label: "Next-month usage", value: countAbbr(Number(t.next_demand ?? 0)), unit: "units", icon: TbTrendingUp },
    { label: "3-month total", value: countAbbr(Number(t.total_horizon ?? 0)), unit: "units", icon: TbCalendarStats },
    { label: "Planning reliability", value: `${Number(t.accuracy ?? 0).toFixed(0)}%`, unit: "aggregate", icon: TbTargetArrow, tone: GREEN },
    { label: "Items forecast", value: countAbbr(Number(t.materials ?? 0)), unit: "SKUs", icon: TbBox },
  ];

  return (
    <div className="-m-4 md:-m-6 p-5 md:p-7 min-w-0" style={{ background: BG, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`@keyframes dfcIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.dfc-card{animation:dfcIn .5s cubic-bezier(.22,1,.36,1) both;min-width:0;transition:transform .25s ease, box-shadow .25s ease}`}</style>

      <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
        <div>
          <div className="text-[12px] font-medium mb-1" style={{ color: MUT2 }}>Forecasting · Expected Usage</div>
          <h1 className="text-[25px] font-bold leading-tight tracking-tight" style={{ color: INK }}>Expected Usage Forecast</h1>
          <p className="text-[13px] mt-1" style={{ color: MUT }}>How much of each medicine & supply you'll use over the next 3 months · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ color: MUT, background: CARD, border: `1px solid ${BORDER}` }}>6-mo history · 3-mo horizon</span>
      </div>

      <Card pad="p-0" className="mb-5 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => { const Icon = m.icon; return (
            <div key={i} className="p-5 relative" style={{ borderLeft: i % 4 === 0 ? "none" : `1px solid ${LINE}`, borderTop: i >= 2 ? `1px solid ${LINE}` : "none" }}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACSOFT, color: AC }}><Icon size={16} /></span>
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em]" style={{ color: MUT2 }}>{m.label}</span>
              </div>
              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-[27px] leading-none font-bold tabular-nums tracking-tight" style={{ color: (m as any).tone || INK }}>{m.value}</span>
                <span className="text-[12px] font-medium mb-0.5" style={{ color: MUT2 }}>{m.unit}</span>
              </div>
            </div>
          ); })}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col"><Cone timeline={tl} t={t} /></div>
        <div className="xl:col-span-4 flex flex-col gap-5"><Horizon timeline={tl} /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch mt-5">
        <div className="xl:col-span-7 flex flex-col"><TopItems rows={data?.top_items || []} /></div>
        <div className="xl:col-span-5 flex flex-col"><ByCategory rows={data?.by_category || []} /></div>
      </div>

      <div className="mt-5"><ItemExplorer region={region} /></div>

      <div className="mt-5 rounded-[14px] px-4 py-3 text-[12px] leading-relaxed" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUT }}>
        <b style={{ color: INK }}>How to read this:</b> forecasts use your last 6 months of actual usage. Totals and category-level numbers are reliable for planning; the range shows best- and worst-case. For a single item, treat the figure as a guide and confirm critical medicines with your team.
      </div>
    </div>
  );
}
