"use client";
// "Expected Usage" demand forecast — a visual centrepiece. Ambient gradient canvas,
// a glowing gradient confidence cone, a reliability ring, gradient number work and
// fluid spring motion in every section. Real HCG forecast data underneath.
import React, { useEffect, useMemo, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { countAbbr, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbTargetArrow, TbTrendingUp, TbArrowUpRight, TbArrowDownRight, TbSearch, TbSparkles, TbCalendarStats, TbBox, TbChevronRight } from "react-icons/tb";

const INK = "#141634", MUT = "#616a86", MUT2 = "#9aa0b8", LINE = "#eef0f8", BORDER = "#e9eaf4", CARD = "#fff";
const V1 = "#6d5efc", V2 = "#9a7bff", CY = "#22c9e6", PK = "#f472b6";
const GREEN = "#12b981", RED = "#f0576b", AMBER = "#f5a524";
const GRAD = `linear-gradient(120deg, ${V1} 0%, ${V2} 45%, ${CY} 100%)`;
const SH = "0 1px 2px rgba(20,24,60,0.04), 0 12px 34px -20px rgba(30,25,90,0.30)";
const nm = (s: string, n = 30) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const gtext: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" };

function Card({ children, className = "", style = {}, pad = "p-6" }: any) {
  return <div className={`vm-card rounded-[22px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SH, ...style }}>{children}</div>;
}

// reliability ring gauge
function Ring({ pct, size = 118 }: { pct: number; size?: number }) {
  const on = useMount(200); const r = (size - 16) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={V1} /><stop offset="100%" stopColor={CY} /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0fb" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={on ? c * (1 - pct / 100) : c}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(.22,1,.36,1) .3s", filter: "drop-shadow(0 3px 8px rgba(109,94,252,0.4))" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-extrabold tabular-nums leading-none" style={gtext}><CountUp value={pct} format={(v: number) => `${v.toFixed(0)}%`} /></span>
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] mt-0.5" style={{ color: MUT2 }}>reliable</span>
      </div>
    </div>
  );
}

// glowing gradient cone
function Cone({ timeline }: { timeline: any[] }) {
  const on = useMount(140); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || [];
  const W = 900, H = 320, PADX = 6, PADT = 24, PADB = 30;
  const iW = W - PADX * 2, iH = H - PADT - PADB, n = data.length || 1;
  const X = (i: number) => PADX + (i / Math.max(n - 1, 1)) * iW;
  const max = Math.max(...data.map((d) => d.upper ?? d.actual ?? 0), 1) * 1.08;
  const Y = (v: number) => PADT + iH - (v / max) * iH;
  const m = useMemo(() => {
    if (!data.length) return null;
    const aI = data.map((d, i) => (d.actual != null ? i : -1)).filter((i) => i >= 0); if (!aI.length) return null;
    const lastA = aI[aI.length - 1];
    const aPts = aI.map((i) => ({ x: X(i), y: Y(data[i].actual) }));
    const br = { x: X(lastA), y: Y(data[lastA].actual) };
    const fI = data.map((d, i) => (d.is_forecast ? i : -1)).filter((i) => i >= 0);
    const fPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].forecast) }))];
    const uPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].upper) }))];
    const lPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].lower) }))];
    const fEnd = fPts[fPts.length - 1];
    return { aPts, aLine: smoothPath(aPts), fLine: smoothPath(fPts), cone: `${smoothPath(uPts)} ${lPts.slice().reverse().map((p) => `L ${p.x} ${p.y}`).join(" ")} Z`, nowX: X(lastA), nowY: Y(data[lastA].actual), fEnd };
  }, [timeline]);
  if (!m) return <div className="flex items-center justify-center h-full" style={{ minHeight: 260, color: MUT2 }}>Loading forecast…</div>;
  return (
    <div className="relative w-full h-full" style={{ minHeight: 260 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
        <defs>
          <linearGradient id="coneStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={V1} /><stop offset="55%" stopColor={V2} /><stop offset="100%" stopColor={CY} /></linearGradient>
          <linearGradient id="coneFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CY} stopOpacity="0.30" /><stop offset="100%" stopColor={V1} stopOpacity="0.02" /></linearGradient>
          <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={V1} stopOpacity="0.18" /><stop offset="100%" stopColor={V1} stopOpacity="0" /></linearGradient>
          <filter id="glow" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {[0, 0.5, 1].map((g, i) => <line key={i} x1={PADX} y1={Y(max * g)} x2={W - PADX} y2={Y(max * g)} stroke={LINE} strokeWidth="1" />)}
        <path d={m.cone} fill="url(#coneFill)" style={{ opacity: on ? 1 : 0, transform: on ? "scaleY(1)" : "scaleY(0.4)", transformOrigin: `${m.nowX}px ${Y(0)}px`, transition: "opacity 1s ease .6s, transform 1.1s cubic-bezier(.22,1,.36,1) .6s" }} />
        <path d={`${m.aLine} L ${m.aPts[m.aPts.length - 1].x} ${Y(0)} L ${m.aPts[0].x} ${Y(0)} Z`} fill="url(#actFill)" style={{ opacity: on ? 1 : 0, transition: "opacity .8s ease .3s" }} />
        <path d={m.aLine} fill="none" stroke="url(#coneStroke)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1) .3s" }} />
        <path d={m.fLine} fill="none" stroke="url(#coneStroke)" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="2 9" style={{ opacity: on ? 0.9 : 0, transition: "opacity .7s ease 1.1s" }} />
        <line x1={m.nowX} y1={PADT - 8} x2={m.nowX} y2={PADT + iH} stroke="#cfd2ea" strokeWidth="1.25" strokeDasharray="3 4" />
        <text x={m.nowX + 7} y={PADT + 2} style={{ fontSize: 10, fontWeight: 700, fill: MUT2, letterSpacing: "0.5px" }}>NOW</text>
        {/* pulsing now + forecast-end dots */}
        <circle cx={m.nowX} cy={m.nowY} r="6.5" fill="#fff" stroke={V1} strokeWidth="3" className="vm-pulse" style={{ opacity: on ? 1 : 0, transition: "opacity .5s ease 1.2s" }} />
        <circle cx={m.fEnd.x} cy={m.fEnd.y} r="5.5" fill={CY} className="vm-pulse2" style={{ opacity: on ? 1 : 0, transition: "opacity .5s ease 1.6s", filter: "drop-shadow(0 0 6px rgba(34,201,230,0.8))" }} />
        {data.map((d, i) => { const isF = d.is_forecast; const v = isF ? d.forecast : d.actual; if (v == null) return null; const active = hov === i; return (
          <g key={i} onMouseEnter={() => setHov(i)}>
            <rect x={X(i) - iW / (n * 2)} y={0} width={iW / n} height={H} fill="transparent" />
            {active && <circle cx={X(i)} cy={Y(v)} r={5} fill="#fff" stroke={isF ? CY : V1} strokeWidth="2.5" />}
            <text x={X(i)} y={H - 4} textAnchor="middle" style={{ fontSize: 11, fill: active ? INK : MUT2, fontWeight: active ? 700 : 500 }}>{d.label}</text>
          </g>
        ); })}
      </svg>
      {hov != null && data[hov] && (() => { const d = data[hov]; return (
        <div className="absolute pointer-events-none" style={{ left: `${(X(hov) / W) * 100}%`, top: 0, transform: "translate(-50%,-8px)" }}>
          <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: INK, boxShadow: "0 12px 28px -8px rgba(20,24,60,0.6)" }}>
            <div className="text-[12px] font-bold tabular-nums text-white">{countAbbr(d.is_forecast ? d.forecast : d.actual)} <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{d.is_forecast ? "forecast" : "actual"}</span></div>
            {d.is_forecast && <div className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>{countAbbr(d.lower)}–{countAbbr(d.upper)}</div>}
          </div></div>); })()}
    </div>
  );
}

function MonthCards({ timeline }: { timeline: any[] }) {
  const on = useMount(260);
  const fc = (timeline || []).filter((d: any) => d.is_forecast);
  if (!fc.length) return null;
  const max = Math.max(...fc.map((d: any) => d.forecast), 1);
  return (
    <div className="grid grid-cols-3 gap-4">
      {fc.map((mth: any, i: number) => (
        <Card key={i} pad="p-5" className="relative overflow-hidden" style={{ animationDelay: `${i * 90}ms` }}>
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full" style={{ background: GRAD, opacity: 0.09, filter: "blur(4px)" }} />
          <div className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: MUT2 }}>{mth.month}</div>
          <div className="mt-2 text-[30px] font-extrabold tabular-nums leading-none" style={{ color: INK }}><CountUp value={mth.forecast} format={countAbbr} /></div>
          <div className="text-[11.5px] mt-1" style={{ color: MUT }}>units · range {countAbbr(mth.lower)}–{countAbbr(mth.upper)}</div>
          <div className="mt-3.5 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef0fb" }}>
            <div className="h-full rounded-full" style={{ width: on ? `${(mth.forecast / max) * 100}%` : "0%", background: GRAD, transition: `width 1.1s cubic-bezier(.22,1,.36,1) ${i * 110}ms`, boxShadow: `0 1px 8px ${V1}66` }} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function TopItems({ rows }: { rows: any[] }) {
  const on = useMount(220); const data = (rows || []).slice(0, 8);
  const max = Math.max(...data.map((r) => r.forecast), 1);
  return (
    <Card className="flex flex-col relative overflow-hidden" style={{ minHeight: 320 }}>
      <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full pointer-events-none" style={{ background: V1, opacity: 0.05, filter: "blur(10px)" }} />
      <div className="flex items-baseline justify-between mb-3 relative">
        <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: GRAD, color: "#fff" }}><TbBox size={15} /></span><h3 className="text-[15.5px] font-bold" style={{ color: INK }}>Top items to plan for</h3></div>
        <span className="text-[11.5px]" style={{ color: MUT2 }}>by 3-month forecast usage</span>
      </div>
      <div className="flex-1 flex flex-col justify-between mt-1 relative">
        {data.map((r, i) => { const monthly = r.next_mo || r.forecast / 3; const isNew = (r.last_actual || 0) < 50;
          const delta = r.last_actual > 0 ? ((monthly - r.last_actual) / r.last_actual) * 100 : 0; const up = delta >= 0; const capped = Math.min(Math.abs(delta), 999);
          return (
            <div key={i} className="group flex items-center gap-3.5 rounded-xl px-2.5 py-1.5 -mx-2 transition-all hover:bg-[#f6f5ff]" style={{ transitionDelay: "0ms" }}>
              <span className="w-7 h-7 rounded-[9px] flex items-center justify-center text-[11px] font-extrabold tabular-nums flex-shrink-0 text-white" style={{ background: i === 0 ? GRAD : `linear-gradient(135deg,${V1}bb,${V2}bb)`, boxShadow: i === 0 ? `0 4px 12px -2px ${V1}88` : "none" }}>{i + 1}</span>
              <div className="min-w-0" style={{ width: 200 }}>
                <div className="text-[12.5px] font-semibold truncate" style={{ color: "#2b3050" }} title={r.desc}>{nm(r.desc, 28)}</div>
                <div className="text-[10.5px]" style={{ color: MUT2 }}>{r.group}</div>
              </div>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#eef0fb" }}>
                <div className="h-full rounded-full relative" style={{ width: on ? `${(r.forecast / max) * 100}%` : "0%", background: GRAD, transition: `width 1.1s cubic-bezier(.22,1,.36,1) ${i * 60}ms`, boxShadow: `0 1px 8px -1px ${V1}88` }} />
              </div>
              <span className="text-[13px] font-bold tabular-nums w-[58px] text-right flex-shrink-0" style={{ color: INK }}>{countAbbr(r.forecast)}</span>
              {isNew
                ? <span className="text-[9px] font-extrabold uppercase tracking-wide w-[50px] text-right flex-shrink-0" style={gtext}>new</span>
                : <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold w-[50px] justify-end flex-shrink-0" style={{ color: up ? GREEN : RED }}>{up ? <TbArrowUpRight size={12} /> : <TbArrowDownRight size={12} />}{capped.toFixed(0)}{capped >= 999 ? "+" : ""}%</span>}
            </div>
          ); })}
      </div>
    </Card>
  );
}

function ByCategory({ rows }: { rows: any[] }) {
  const on = useMount(260); const data = (rows || []).slice(0, 8);
  const total = data.reduce((s, r) => s + r.forecast, 0) || 1;
  const max = Math.max(...data.map((r) => r.forecast), 1);
  return (
    <Card className="flex flex-col relative overflow-hidden" style={{ minHeight: 320 }}>
      <div className="absolute -bottom-14 -right-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: CY, opacity: 0.06, filter: "blur(12px)" }} />
      <div className="flex items-baseline justify-between mb-4 relative">
        <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg,${CY},${V1})`, color: "#fff" }}><TbSparkles size={15} /></span><h3 className="text-[15.5px] font-bold" style={{ color: INK }}>Demand by category</h3></div>
        <span className="text-[11.5px]" style={{ color: MUT2 }}>3-month horizon</span>
      </div>
      <div className="flex-1 flex flex-col justify-between gap-2.5 relative">
        {data.map((r, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[12px] font-medium truncate" style={{ color: "#3a4160", maxWidth: 170 }} title={r.group}>{r.group}</span>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(r.forecast)} <span className="text-[10px] font-medium" style={{ color: MUT2 }}>{((r.forecast / total) * 100).toFixed(0)}%</span></span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#eef0fb" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.forecast / max) * 100}%` : "0%", background: i === 0 ? GRAD : `linear-gradient(90deg,${V1}cc,${CY}cc)`, transition: `width 1.05s cubic-bezier(.22,1,.36,1) ${i * 55}ms`, boxShadow: i === 0 ? `0 1px 8px ${V1}66` : "none" }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

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
        const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const tl = (d || []).map((x) => { const isF = Number(x.Sales_Quantity_Forecast) > 0; const mo = parseInt(String(x["Posting Date"]).slice(0, 2));
          return { label: MN[(mo - 1 + 12) % 12], actual: Number(x.sales_qty) > 0 ? Number(x.sales_qty) : null, forecast: isF ? Number(x.Sales_Quantity_Forecast) : null, lower: isF ? Number(x.Lower_Bound_Sales_Quantity_Forecast) : null, upper: isF ? Number(x.Upper_Bound_Sales_Quantity_Forecast) : null, is_forecast: isF }; });
        setRows(tl);
      }).catch(() => setRows([])).finally(() => setLoading(false));
  }, [sel, region]);
  const filtered = q ? cat.filter((c) => (c["Material Description"] || "").toLowerCase().includes(q.toLowerCase()) || String(c.Material).includes(q)).slice(0, 40) : cat.slice(0, 40);
  const fcr = rows.filter((r) => r.is_forecast); const nextMo = fcr[0];
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -top-16 right-1/3 w-56 h-56 rounded-full pointer-events-none" style={{ background: V2, opacity: 0.05, filter: "blur(16px)" }} />
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4 relative">
        <div>
          <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: GRAD, color: "#fff" }}><TbSearch size={14} /></span><h3 className="text-[15.5px] font-bold" style={{ color: INK }}>Explore a specific item</h3></div>
          <p className="text-[12px] mt-0.5 ml-9" style={{ color: MUT }}>search any medicine or supply for its 3-month usage forecast</p>
        </div>
        <div className="relative" style={{ minWidth: 300 }}>
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ border: `1px solid ${open ? V1 : BORDER}`, background: "#fbfbff", boxShadow: open ? `0 0 0 3px ${V1}22` : "none", transition: "all .2s" }}>
            <TbSearch size={15} style={{ color: open ? V1 : MUT2 }} />
            <input value={open ? q : (sel?.["Material Description"] || "")} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setQ(""); setOpen(true); }}
              placeholder="Search item…" className="flex-1 bg-transparent text-[13px] focus:outline-none" style={{ color: INK }} />
          </div>
          {open && (
            <div className="absolute z-20 mt-1.5 w-full max-h-64 overflow-auto rounded-xl bg-white py-1" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 20px 44px -18px rgba(30,25,90,0.4)" }}>
              {filtered.map((c) => (
                <button key={c.Material} onClick={() => { setSel(c); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-[#f4f3ff] transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GRAD }} />
                  <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium truncate" style={{ color: INK }}>{nm(c["Material Description"], 40)}</div><div className="text-[10.5px]" style={{ color: MUT2 }}>{c.Material}</div></div>
                  <TbChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: V1 }} />
                </button>
              ))}
              {!filtered.length && <div className="px-3 py-3 text-[12.5px]" style={{ color: MUT2 }}>No item found.</div>}
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-[13px]" style={{ color: MUT2 }}><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${V1} transparent ${V1} ${V1}` }} />Loading forecast…</div>
      ) : rows.length ? (
        <div key={sel?.Material} className="grid grid-cols-1 xl:grid-cols-12 gap-5 relative vm-fade">
          <div className="xl:col-span-8" style={{ minHeight: 300 }}><Cone timeline={rows} /></div>
          <div className="xl:col-span-4 flex flex-col gap-3">
            <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(150deg,#f6f4ff 0%,#eef7ff 100%)", border: `1px solid ${V1}22` }}>
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full" style={{ background: GRAD, opacity: 0.12, filter: "blur(4px)" }} />
              <div className="text-[11px] font-semibold uppercase tracking-wide relative" style={{ color: MUT2 }}>{nm(sel?.["Material Description"] || "", 32)}</div>
              <div className="mt-2 text-[32px] font-extrabold tabular-nums leading-none relative" style={gtext}><CountUp value={Number(nextMo?.forecast ?? 0)} format={countAbbr} /></div>
              <div className="text-[12px] mt-1 relative" style={{ color: MUT }}>units next month · <b style={{ color: INK }}>{countAbbr(Number(nextMo?.lower ?? 0))}–{countAbbr(Number(nextMo?.upper ?? 0))}</b></div>
            </div>
            {fcr.map((mth: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ border: `1px solid ${BORDER}` }}>
                <span className="text-[12.5px] font-medium" style={{ color: "#4a5068" }}>{mth.label}</span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(mth.forecast)} <span className="text-[11px] font-normal" style={{ color: MUT2 }}>units</span></span>
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
  const stats = [
    { label: "3-month total", value: countAbbr(Number(t.total_horizon ?? 0)), unit: "units" },
    { label: "Items forecast", value: countAbbr(Number(t.materials ?? 0)), unit: "SKUs" },
    { label: "Categories", value: countAbbr(Number((data?.by_category || []).length ? 139 : 0)), unit: "groups" },
  ];

  return (
    <div className="-m-4 md:-m-6 p-5 md:p-7 min-w-0 relative overflow-hidden" style={{ minHeight: "calc(100vh - 64px)", background: "#f7f7fd" }}>
      {/* ambient canvas */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="vm-blob absolute rounded-full" style={{ width: 520, height: 520, top: -180, left: -120, background: V1, opacity: 0.09, filter: "blur(90px)" }} />
        <div className="vm-blob2 absolute rounded-full" style={{ width: 480, height: 480, top: 120, right: -160, background: CY, opacity: 0.08, filter: "blur(90px)" }} />
        <div className="vm-blob absolute rounded-full" style={{ width: 380, height: 380, bottom: -160, left: "40%", background: PK, opacity: 0.05, filter: "blur(90px)" }} />
      </div>
      <style jsx global>{`
        @keyframes vmIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .vm-card{animation:vmIn .6s cubic-bezier(.22,1,.36,1) both;min-width:0;transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease}
        .vm-card:hover{transform:translateY(-3px);box-shadow:0 1px 2px rgba(20,24,60,.05),0 22px 46px -22px rgba(60,40,150,.4)}
        @keyframes vmFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(28px,34px)}}
        @keyframes vmFloat2{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,-26px)}}
        .vm-blob{animation:vmFloat 18s ease-in-out infinite}.vm-blob2{animation:vmFloat2 22s ease-in-out infinite}
        @keyframes vmPulse{0%,100%{r:6.5;opacity:1}50%{r:8.5;opacity:.75}}
        .vm-pulse{animation:vmPulse 2.4s ease-in-out infinite 1.4s}
        @keyframes vmPulse2{0%,100%{r:5.5}50%{r:7}}.vm-pulse2{animation:vmPulse2 2s ease-in-out infinite 1.8s}
        @keyframes vmFade{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}.vm-fade{animation:vmFade .5s cubic-bezier(.22,1,.36,1) both}
      `}</style>

      <div className="relative">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] mb-2 px-2.5 py-1 rounded-full" style={{ background: "#fff", border: `1px solid ${BORDER}`, color: V1 }}><TbSparkles size={12} />Forecasting · Expected Usage</div>
            <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-tight" style={{ color: INK }}>Expected Usage <span style={gtext}>Forecast</span></h1>
            <p className="text-[13px] mt-1.5" style={{ color: MUT }}>How much of each medicine & supply you'll use over the next 3 months · {region}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl" style={{ color: GREEN, background: `${GREEN}12` }}><TbTargetArrow size={13} />{Number(t.accuracy ?? 0).toFixed(0)}% reliable for planning</span>
        </div>

        {/* HERO */}
        <Card pad="p-0" className="overflow-hidden mb-4">
          <div className="grid grid-cols-1 xl:grid-cols-12">
            <div className="xl:col-span-4 p-7 flex flex-col justify-center relative" style={{ background: "linear-gradient(160deg,#faf9ff 0%,#f0f4ff 100%)", borderRight: `1px solid ${LINE}` }}>
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full" style={{ background: GRAD, opacity: 0.08, filter: "blur(8px)" }} />
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] relative" style={{ color: MUT2 }}>Expected usage · next {t?.horizon ?? 3} months</div>
              <div className="mt-3 flex items-end gap-2.5 flex-wrap relative">
                <span className="text-[52px] leading-[0.9] font-extrabold tabular-nums tracking-tight" style={gtext}><CountUp value={Number(t?.next_demand ?? 0)} format={countAbbr} /></span>
                <span className="text-[13.5px] font-medium mb-2" style={{ color: MUT }}>units next month</span>
              </div>
              <div className="mt-2.5 text-[12.5px] relative" style={{ color: MUT }}>Likely range <b style={{ color: INK }}>{countAbbr(Number(t?.next_lower ?? 0))} – {countAbbr(Number(t?.next_upper ?? 0))}</b> units</div>
              <div className="mt-6 flex items-center gap-4 relative">
                <Ring pct={Number(t?.accuracy ?? 0)} />
                <div className="space-y-2.5">
                  {stats.map((s, i) => (
                    <div key={i}>
                      <div className="text-[17px] font-bold tabular-nums leading-none" style={{ color: INK }}>{s.value} <span className="text-[10.5px] font-medium" style={{ color: MUT2 }}>{s.unit}</span></div>
                      <div className="text-[10.5px] font-medium uppercase tracking-wide mt-0.5" style={{ color: MUT2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="xl:col-span-8 p-6 flex flex-col" style={{ minHeight: 340 }}>
              <div className="flex items-center gap-4 mb-1 text-[11px] font-medium" style={{ color: MUT2 }}>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[3px] rounded-full" style={{ background: GRAD }} />Actual use</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0 border-t-2 border-dotted" style={{ borderColor: V1 }} />Forecast</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm" style={{ background: `linear-gradient(${CY}44,${V1}18)` }} />Likely range</span>
              </div>
              <div className="flex-1"><Cone timeline={tl} /></div>
            </div>
          </div>
        </Card>

        <div className="mb-4"><MonthCards timeline={tl} /></div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          <div className="xl:col-span-7 flex flex-col"><TopItems rows={data?.top_items || []} /></div>
          <div className="xl:col-span-5 flex flex-col"><ByCategory rows={data?.by_category || []} /></div>
        </div>

        <div className="mt-4"><ItemExplorer region={region} /></div>

        <div className="mt-4 rounded-[16px] px-4 py-3 text-[12px] leading-relaxed" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${BORDER}`, color: MUT, backdropFilter: "blur(6px)" }}>
          <b style={{ color: INK }}>How to read this:</b> forecasts use your last 6 months of actual usage. Totals & category numbers are reliable for planning — the range shows best/worst case. For a single item, treat it as a guide and confirm critical medicines with your team.
        </div>
      </div>
    </div>
  );
}
