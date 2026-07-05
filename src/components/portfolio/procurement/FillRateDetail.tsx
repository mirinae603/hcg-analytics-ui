"use client";
// E4 — Fill Rate. Unique identity: green "fulfillment" (green filled · coral gap).
// Signature visuals (not shared with any other page):
//   • Liquid-fill vessel — the overall fill rate as an animated rising liquid.
//   • Fulfillment priority scatter — order volume × fill %, bubble = open units → what to fix first.
//   • Fill-rate distribution — how the hospital network spreads across completion bands.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { countAbbr, useMount, CountUp } from "@/components/portfolio/kit";
import { TbProgressCheck, TbTargetArrow, TbAlertTriangle } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// --- soft sage-emerald fulfillment identity ---
const PAGE = "#EEF3F0", INK = "#26403a", SUB = "#8ba098";
const GREEN = "#3fae7d", DEEP = "#2f9468", CORAL = "#db8880";
const BAND = ["#4bb083", "#8cbf80", "#d8c06f", "#e0a67e", "#db8880"]; // 100 · 95–99 · 85–95 · 70–85 · <70 (muted, harmonious)
const SH = "0 22px 46px -28px rgba(40,90,70,0.26), 0 4px 12px -8px rgba(40,90,70,0.07)";
const pName = (s: string, n = 14) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const fillCol = (c: number) => (c >= 97 ? BAND[0] : c >= 85 ? BAND[1] : c >= 70 ? BAND[2] : c >= 45 ? BAND[3] : BAND[4]);

function Shell({ region, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`
        @keyframes frIn { from { opacity: 0; transform: translateY(16px) scale(0.987); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .fr-card { animation: frIn 0.6s cubic-bezier(0.22,1,0.36,1) both; min-width: 0; }
        @keyframes frWave { from { transform: translateX(0); } to { transform: translateX(-160px); } }
        .fr-wave1 { animation: frWave 3.4s linear infinite; }
        .fr-wave2 { animation: frWave 5.2s linear infinite; }
      `}</style>
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Fill rate</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>how completely purchase orders are received — delivered vs still open · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#557066", boxShadow: "0 4px 14px -8px rgba(18,70,50,0.22)" }}>6-month window</span>
      </div>
      {children}
    </div>
  );
}
function Card({ children, delay = 0, className = "", style = {} }: any) {
  return <div className={`fr-card rounded-[26px] ${className}`} style={{ boxShadow: SH, animationDelay: `${delay}ms`, ...style }}>{children}</div>;
}

function wavePath(w: number, amp: number, baseY: number, bottom: number) {
  let d = `M 0 ${baseY}`;
  for (let x = 0; x < 2 * w; x += w) d += ` q ${w * 0.25} ${-amp} ${w * 0.5} 0 q ${w * 0.25} ${amp} ${w * 0.5} 0`;
  return d + ` L ${2 * w} ${bottom} L 0 ${bottom} Z`;
}

// ---------------- Hero: liquid-fill vessel ----------------
function LiquidHero({ t }: { t: any }) {
  const on = useMount(60);
  const overall = Number(t?.overall ?? 0), ordered = Number(t?.ordered_qty ?? 0), open = Number(t?.open_qty ?? 0);
  const delivered = Math.max(ordered - open, 0);
  const S = 160, r = S / 2 - 5, baseY = S * (1 - Math.max(0, Math.min(100, overall)) / 100);
  return (
    <Card delay={0} className="relative overflow-hidden p-6 flex flex-col flex-1" style={{ background: "linear-gradient(160deg,#77cca4 0%,#49b184 46%,#31976b 100%)", minHeight: 360 }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 220, height: 220, background: "#c9f3dc", opacity: 0.5, top: -80, right: -50 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 150, height: 150, background: "#e6fff0", opacity: 0.28, bottom: -50, left: -30 }} />
      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.72)" }}><TbProgressCheck size={14} />Order fulfillment</div>
        <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.24)" }}>{Number(t?.plants ?? 0)} hospitals</span>
      </div>
      <div className="relative flex-1 flex items-center justify-center my-2">
        <svg viewBox={`0 0 ${S} ${S}`} width="170" height="170">
          <defs><clipPath id="frVessel"><circle cx={S / 2} cy={S / 2} r={r} /></clipPath></defs>
          <circle cx={S / 2} cy={S / 2} r={r} fill="rgba(255,255,255,0.12)" />
          <g clipPath="url(#frVessel)">
            <g style={{ transform: on ? `translateY(0)` : `translateY(${S}px)`, transition: "transform 1.4s cubic-bezier(0.4,0,0.2,1)" }}>
              <path className="fr-wave2" d={wavePath(S, 6, baseY + 3, S)} fill="rgba(255,255,255,0.45)" />
              <path className="fr-wave1" d={wavePath(S, 7, baseY, S)} fill="rgba(255,255,255,0.9)" />
            </g>
          </g>
          <circle cx={S / 2} cy={S / 2} r={r} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
          <text x={S / 2} y={S / 2 - 2} textAnchor="middle" style={{ fontSize: 36, fontWeight: 800, fill: overall >= 55 ? DEEP : "#fff" }} className="tabular-nums">{on ? `${Math.round(overall)}%` : ""}</text>
          <text x={S / 2} y={S / 2 + 18} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: overall >= 60 ? "rgba(47,148,104,0.8)" : "rgba(255,255,255,0.75)", letterSpacing: "0.06em" }}>FILL RATE</text>
        </svg>
      </div>
      <div className="relative">
        <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.18)" }}>
          <div style={{ width: on ? `${ordered ? (delivered / ordered) * 100 : 0}%` : "0%", background: "#fff", transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)" }} />
          <div style={{ width: on ? `${ordered ? (open / ordered) * 100 : 0}%` : "0%", background: "rgba(255,180,170,0.9)", transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
        <div className="flex items-center justify-between mt-2.5 text-[10.5px]" style={{ color: "rgba(255,255,255,0.82)" }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white" />Received · <b className="tabular-nums">{countAbbr(delivered)}</b></span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "rgba(255,180,170,0.95)" }} />Open · <b className="tabular-nums">{countAbbr(open)}</b></span>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        {[{ l: "Units ordered", v: countAbbr(ordered) }, { l: "At 100% fill", v: `${Number(t?.perfect ?? 0)} sites` }].map((p, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.16)" }}>
            <div className="text-[15px] font-bold tabular-nums leading-none" style={{ color: "#fff" }}>{p.v}</div>
            <div className="text-[10px] mt-1 truncate" style={{ color: "rgba(255,255,255,0.64)" }}>{p.l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Fulfillment priority scatter ----------------
function PriorityScatter({ plants }: { plants: any[] }) {
  const on = useMount(180); const [hov, setHov] = useState<number | null>(null);
  const data = (plants || []).filter((p) => p.ordered > 0);
  const W = 780, H = 344, PADL = 44, PADR = 20, PADT = 22, PADB = 42;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const geo = useMemo(() => {
    if (!data.length) return null;
    const lo = Math.min(...data.map((d) => d.ordered)), hi = Math.max(...data.map((d) => d.ordered));
    const l0 = Math.log10(Math.max(lo, 1)), l1 = Math.log10(Math.max(hi, 10)), span = l1 - l0 || 1;
    const maxOpen = Math.max(...data.map((d) => d.open), 1);
    const medOrdered = [...data].map((d) => d.ordered).sort((a, b) => a - b)[Math.floor(data.length / 2)] || 1;
    return { l0, span, maxOpen, medOrdered };
  }, [plants]);
  if (!geo) return null;
  const xP = (o: number) => PADL + ((Math.log10(Math.max(o, 1)) - geo.l0) / geo.span) * innerW;
  const yP = (c: number) => PADT + innerH - (Math.max(0, Math.min(100, c)) / 100) * innerH;
  const rP = (o: number) => 4 + Math.sqrt(o / geo.maxOpen) * 15;
  const xticks = [1e3, 1e4, 1e5, 1e6, 1e7].filter((v) => Math.log10(v) >= geo.l0 - 0.3 && Math.log10(v) <= geo.l0 + geo.span + 0.3);
  return (
    <Card delay={140} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbTargetArrow size={16} style={{ color: GREEN }} />Fulfillment priority</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>fill % vs order volume · bubble = open units · below the line & to the right = fix first</p></div>
      </div>
      <div className="relative mt-2 flex-1" style={{ minHeight: 280 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          {/* urgent zone: high volume + low fill (bottom-right) */}
          <rect x={xP(geo.medOrdered)} y={yP(85)} width={W - PADR - xP(geo.medOrdered)} height={PADT + innerH - yP(85)} fill={`${CORAL}09`} />
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={PADL} y1={yP(g)} x2={W - PADR} y2={yP(g)} stroke="#f1f5f2" strokeWidth="1" />
              <text x={PADL - 6} y={yP(g) + 3} textAnchor="end" style={{ fontSize: 9.5, fill: "#a9bab2" }}>{g}%</text>
            </g>
          ))}
          {/* target line at 95% */}
          <line x1={PADL} y1={yP(95)} x2={W - PADR} y2={yP(95)} stroke={GREEN} strokeWidth="1.5" strokeDasharray="5 5" opacity="0.7" />
          <text x={W - PADR} y={yP(95) - 5} textAnchor="end" style={{ fontSize: 9.5, fontWeight: 700, fill: GREEN }}>95% target</text>
          {/* median volume divider */}
          <line x1={xP(geo.medOrdered)} y1={PADT} x2={xP(geo.medOrdered)} y2={PADT + innerH} stroke="#dfe7e3" strokeWidth="1.5" strokeDasharray="3 4" />
          <text x={W - PADR - 2} y={PADT + innerH - 6} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: "#c2a08a" }}>high volume · under-filled</text>
          {xticks.map((v) => <text key={v} x={xP(v)} y={H - 22} textAnchor="middle" style={{ fontSize: 9, fill: "#a9bab2" }}>{countAbbr(v)}</text>)}
          <text x={PADL + innerW / 2} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: "#8a9a92", fontWeight: 600 }}>units ordered · log scale →</text>
          {/* bubbles */}
          {data.map((d, i) => { const c = fillCol(d.comp); const active = hov === i; const dim = hov != null && !active; const r = rP(d.open); return (
            <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: "pointer", opacity: on ? (dim ? 0.32 : 1) : 0, transform: on ? "scale(1)" : "scale(0.4)", transformOrigin: `${xP(d.ordered)}px ${yP(d.comp)}px`, transition: `opacity 0.4s ease ${(i % 12) * 30}ms, transform 0.6s cubic-bezier(0.34,1.3,0.64,1) ${(i % 12) * 30}ms` }}>
              <circle cx={xP(d.ordered)} cy={yP(d.comp)} r={r} fill={`${c}2b`} stroke={c} strokeWidth={active ? 2.5 : 1.4} />
              {r > 9 && <circle cx={xP(d.ordered)} cy={yP(d.comp)} r={r * 0.4} fill={c} opacity={active ? 0.95 : 0.66} />}
            </g>
          ); })}
        </svg>
        {hov != null && data[hov] && (() => { const d = data[hov]; const left = (xP(d.ordered) / W) * 100; const top = (yP(d.comp) / H) * 100; return (
          <div className="absolute pointer-events-none" style={{ left: `${Math.min(Math.max(left, 12), 84)}%`, top: `${Math.min(Math.max(top - 14, 2), 70)}%`, transform: "translate(-50%,-100%)" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(18,70,50,0.42)", border: "1px solid #e6efe9" }}>
              <div className="text-[12px] font-bold" style={{ color: INK }}>{d.plant} · <span style={{ color: fillCol(d.comp) }}>{d.comp.toFixed(0)}% filled</span></div>
              <div className="text-[11px] tabular-nums" style={{ color: SUB }}>{countAbbr(d.ordered)} ordered · <b style={{ color: CORAL }}>{countAbbr(d.open)}</b> open</div>
            </div>
          </div>
        ); })()}
      </div>
    </Card>
  );
}

// ---------------- Fill-rate distribution ----------------
function DistBars({ dist }: { dist: any[] }) {
  const on = useMount(200); const [hov, setHov] = useState<number | null>(null);
  const data = dist || []; if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.plants, 0) || 1;
  const max = Math.max(...data.map((d) => d.plants), 1);
  return (
    <Card delay={200} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Completion distribution</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>how the {total} hospitals spread across fill-rate bands</p></div>
      </div>
      <div className="mt-4 flex-1 flex items-end justify-around gap-3" style={{ minHeight: 210 }}>
        {data.map((d, i) => { const h = (d.plants / max) * 100; const col = BAND[i] || GREEN; const active = hov === i; return (
          <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[13px] font-bold tabular-nums mb-1.5" style={{ color: col }}>{d.plants}</span>
            <div className="w-full rounded-t-xl relative" style={{ height: on ? `${Math.max(h, 3)}%` : "0%", maxWidth: 58, background: `linear-gradient(180deg,${col},${col}cc)`, transition: `height 0.85s cubic-bezier(0.34,1.05,0.64,1) ${i * 70}ms`, boxShadow: active ? `0 8px 18px -8px ${col}88` : "none" }} />
            <span className="text-[11px] font-semibold mt-2" style={{ color: "#4a5a52" }}>{d.label}</span>
            <span className="text-[10px] tabular-nums" style={{ color: "#a4b4ac" }}>{Math.round((d.plants / total) * 100)}% of sites</span>
          </div>
        ); })}
      </div>
    </Card>
  );
}

// ---------------- Lowest fill ladder ----------------
function LowestLadder({ worst }: { worst: any[] }) {
  const on = useMount(240);
  const rows = (worst || []).slice(0, 8);
  return (
    <Card delay={240} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-center justify-between">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Lowest fill rates</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>hospitals with the most incomplete orders</p></div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${CORAL}18`, color: "#d9433a" }}>watchlist</span>
      </div>
      <div className="mt-3 flex-1 flex flex-col justify-between gap-1">
        {rows.map((r: any, i: number) => { const col = fillCol(r.comp); return (
          <div key={i} className="py-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${col}1c`, color: col }}><TbAlertTriangle size={12} /></span>
                <span className="text-[12.5px] font-medium truncate" style={{ color: "#33473f" }} title={r.plant}>{r.plant}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px]" style={{ color: "#9aaaa2" }}>{countAbbr(r.open)} open</span>
                <span className="text-[12.5px] font-bold tabular-nums" style={{ color: col }}>{r.comp.toFixed(0)}%</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden ml-[34px]" style={{ background: "#eef3f0" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${Math.max(r.comp, 3)}%` : "0%", background: col, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms` }} />
            </div>
          </div>
        ); })}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </Card>
  );
}

function ProxyNote() {
  return (
    <div className="fr-card inline-flex items-center gap-2 text-[11px] font-medium px-3.5 py-2 rounded-full" style={{ background: `${GREEN}12`, color: DEEP, border: `1px solid ${GREEN}2c`, animationDelay: "300ms" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
      Proxy — fill rate = 1 − open ÷ ordered (clamped ≤100%; some lines over-receive). True service-level SLA isn't in the source data.
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "ordered_qty", label: "Ordered", kind: "num" as const },
  { field: "open_qty", label: "Open", kind: "num" as const }, { field: "fill_rate_pct", label: "Fill %", kind: "num" as const },
];

export default function FillRateDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/fill-rate/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  return (
    <Shell region={region}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-4 flex flex-col min-w-0"><LiquidHero t={t} /></div>
        <div className="xl:col-span-8 flex flex-col min-w-0"><PriorityScatter plants={data?.plants || []} /></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 flex flex-col min-w-0"><DistBars dist={data?.dist || []} /></div>
        <div className="xl:col-span-5 flex flex-col min-w-0"><LowestLadder worst={data?.worst || []} /></div>
      </div>
      <ProxyNote />
      <Card delay={320} className="bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Plant fill-rate detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="fill-rate" plant={region} columns={COLUMNS} />
      </Card>
    </Shell>
  );
}
