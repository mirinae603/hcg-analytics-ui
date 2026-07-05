"use client";
// E3 — Vendor Lead Time. Unique identity: violet-plum "reliability".
// Signature visuals (not shared with any other page):
//   • Delivery-speed distribution — lead-time bands on a green→red speed ramp + cumulative on-time curve.
//   • Vendor beeswarm — every tracked vendor as a dot on a days axis, coloured by speed, sized by volume.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { countAbbr, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbTruckDelivery, TbRocket, TbAlertTriangle } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// --- violet-plum reliability identity ---
const PAGE = "#F1EFF8", INK = "#241f38", SUB = "#8b86a2";
const VIOLET = "#7c5cf0", DEEP = "#6a3fd6", LILAC = "#c4b5fd";
const SPEED = ["#12b886", "#4cc38a", "#e0a838", "#ec7a45", "#e8556a"]; // ≤2 · 3–5 · 6–10 · 11–20 · 20+
const SH = "0 22px 46px -28px rgba(58,44,110,0.30), 0 4px 12px -8px rgba(58,44,110,0.08)";
const dfmt = (n: number) => `${n.toFixed(1)}d`;
const vName = (s: string, n = 16) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const speedByDays = (d: number) => (d <= 2 ? SPEED[0] : d <= 5 ? SPEED[1] : d <= 10 ? SPEED[2] : d <= 20 ? SPEED[3] : SPEED[4]);

function Shell({ region, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`
        @keyframes ltIn { from { opacity: 0; transform: translateY(16px) scale(0.987); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .lt-card { animation: ltIn 0.6s cubic-bezier(0.22,1,0.36,1) both; min-width: 0; }
      `}</style>
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Vendor lead time</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>how reliably suppliers turn a purchase order into delivered goods · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#6a6486", boxShadow: "0 4px 14px -8px rgba(58,44,110,0.22)" }}>6-month window</span>
      </div>
      {children}
    </div>
  );
}
function Card({ children, delay = 0, className = "", style = {} }: any) {
  return <div className={`lt-card rounded-[26px] ${className}`} style={{ boxShadow: SH, animationDelay: `${delay}ms`, ...style }}>{children}</div>;
}

// ---------------- Hero: reliability ----------------
function ReliabilityHero({ t }: { t: any }) {
  const on = useMount(60);
  const median = Number(t?.median ?? 0), under7 = Number(t?.under7 ?? 0), vendors = Number(t?.vendors ?? 0);
  const fast = t?.fastest, slow = t?.slowest;
  const R = 30, C = 2 * Math.PI * R;
  return (
    <Card delay={0} className="relative overflow-hidden p-6 flex flex-col flex-1" style={{ background: "linear-gradient(158deg,#9575f5 0%,#7c5cf0 46%,#6a3fd6 100%)", minHeight: 360 }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 220, height: 220, background: "#d3c5ff", opacity: 0.42, top: -80, right: -50 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 150, height: 150, background: "#f3d5ff", opacity: 0.22, bottom: -50, left: -30 }} />
      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.72)" }}><TbTruckDelivery size={14} />Delivery reliability</div>
        <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.24)" }}>{countAbbr(vendors)} vendors</span>
      </div>
      <div className="relative mt-4">
        <div className="text-[46px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,0.16)" }}><CountUp value={median} format={(n) => n.toFixed(1)} /><span className="text-[22px] font-semibold ml-1" style={{ color: "rgba(255,255,255,0.8)" }}>days</span></div>
        <div className="text-[12.5px] mt-2" style={{ color: "rgba(255,255,255,0.74)" }}>median vendor lead time (PO → GR)</div>
      </div>
      {/* on-time ring */}
      <div className="relative mt-4 rounded-2xl p-3.5 flex items-center gap-3.5" style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }}>
        <svg viewBox="0 0 76 76" width="60" height="60" className="flex-shrink-0">
          <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="8" />
          <circle cx="38" cy="38" r={R} fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" transform="rotate(-90 38 38)"
            strokeDasharray={C} strokeDashoffset={on ? C * (1 - under7 / 100) : C} style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1)" }} />
          <text x="38" y="42" textAnchor="middle" style={{ fontSize: 17, fontWeight: 800, fill: "#fff" }} className="tabular-nums">{under7.toFixed(0)}%</text>
        </svg>
        <div className="min-w-0">
          <div className="text-[13px] font-bold" style={{ color: "#fff" }}>on-time delivery</div>
          <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.72)" }}>share of GR lines within 7 days</div>
        </div>
      </div>
      <div className="relative flex-1" />
      {/* fastest / slowest vendor */}
      <div className="relative grid grid-cols-1 gap-2.5">
        {[{ v: fast, ic: TbRocket, tag: "Fastest supplier", cc: "#c9f7e6" }, { v: slow, ic: TbAlertTriangle, tag: "Slowest supplier", cc: "#ffd6d0" }].map((r, i) => r.v && (
          <div key={i} className="rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.9)", color: DEEP }}><r.ic size={15} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold truncate" style={{ color: "#fff" }}>{vName(r.v.name, 22)}</div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{r.tag}</div>
            </div>
            <span className="text-[13px] font-bold tabular-nums flex-shrink-0" style={{ color: "#fff" }}>{dfmt(r.v.days)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Delivery-speed distribution ----------------
function Distribution({ dist }: { dist: any[] }) {
  const on = useMount(180); const [hov, setHov] = useState<number | null>(null);
  const data = dist || []; if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.lines, 0) || 1;
  const maxL = Math.max(...data.map((d) => d.lines), 1);
  const W = 780, H = 320, PADL = 38, PADR = 40, PADT = 24, PADB = 44;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const slot = innerW / data.length;
  const bx = (i: number) => PADL + slot * i + slot / 2;
  const yBar = (l: number) => PADT + innerH - (l / maxL) * innerH;
  const bw = Math.min(slot * 0.56, 62);
  let acc = 0;
  const cumPts = data.map((d, i) => { acc += d.lines; return { x: bx(i), y: PADT + innerH - (acc / total) * innerH }; });
  const cumLine = smoothPath(cumPts);
  return (
    <Card delay={140} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Delivery-speed distribution</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>goods-receipt lines by lead-time band · fast → slow</p></div>
        <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: "#6f6a85" }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-[3px]" style={{ background: SPEED[0] }} />lines</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full" style={{ background: DEEP }} />cumulative %</span>
        </div>
      </div>
      <div className="relative mt-3 flex-1" style={{ minHeight: 250 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={PADL} y1={PADT + innerH - (g / 100) * innerH} x2={W - PADR} y2={PADT + innerH - (g / 100) * innerH} stroke="#f2f0f8" strokeWidth="1" />
              <text x={W - PADR + 6} y={PADT + innerH - (g / 100) * innerH + 3} textAnchor="start" style={{ fontSize: 9.5, fill: DEEP, opacity: 0.5 }}>{g}%</text>
            </g>
          ))}
          {data.map((d, i) => { const h = (d.lines / maxL) * innerH; const col = SPEED[i] || VIOLET; const active = hov === i; return (
            <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: "pointer" }}>
              <rect x={bx(i) - slot / 2} y={PADT} width={slot} height={innerH} fill="transparent" />
              <rect x={bx(i) - bw / 2} y={on ? yBar(d.lines) : PADT + innerH} width={bw} height={on ? Math.max(h, 2) : 0} rx="6"
                fill={col} opacity={active ? 1 : 0.9} style={{ transition: `height 0.8s cubic-bezier(0.34,1.05,0.64,1) ${i * 60}ms, y 0.8s cubic-bezier(0.34,1.05,0.64,1) ${i * 60}ms`, filter: active ? `drop-shadow(0 6px 14px ${col}66)` : "none" }} />
              <text x={bx(i)} y={yBar(d.lines) - 8} textAnchor="middle" style={{ fontSize: 11, fontWeight: 800, fill: col, opacity: on ? 1 : 0, transition: `opacity 0.5s ease ${0.5 + i * 0.05}s` }} className="tabular-nums">{Math.round((d.lines / total) * 100)}%</text>
              <text x={bx(i)} y={H - 22} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 700, fill: active ? INK : "#5b5670" }}>{d.label}</text>
              <text x={bx(i)} y={H - 9} textAnchor="middle" style={{ fontSize: 10, fill: "#a49ebb" }}>{countAbbr(d.lines)} · {d.vendors} vnd</text>
            </g>
          ); })}
          {/* cumulative on-time curve */}
          <path d={cumLine} fill="none" stroke={DEEP} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.4s ease 0.5s", filter: `drop-shadow(0 5px 9px ${DEEP}33)` }} />
          {cumPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hov === i ? 5 : 3.2} fill="#fff" stroke={DEEP} strokeWidth="2.5" onMouseEnter={() => setHov(i)}
            style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.7 + i * 0.05}s`, cursor: "pointer" }} />)}
        </svg>
        {hov != null && data[hov] && (() => { const d = data[hov]; const left = (bx(hov) / W) * 100; return (
          <div className="absolute pointer-events-none" style={{ left: `${Math.min(Math.max(left, 12), 84)}%`, top: 2, transform: "translate(-50%,0)" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(58,44,110,0.42)", border: "1px solid #efedf6" }}>
              <div className="text-[12px] font-bold" style={{ color: INK }}>{d.label} lead time</div>
              <div className="text-[11px] tabular-nums" style={{ color: SPEED[hov] }}>{countAbbr(d.lines)} lines · {Math.round((d.lines / total) * 100)}% · {d.vendors} vendors</div>
            </div>
          </div>
        ); })()}
      </div>
    </Card>
  );
}

// ---------------- Vendor beeswarm ----------------
function Beeswarm({ fast, slow, t }: { fast: any[]; slow: any[]; t: any }) {
  const on = useMount(220); const [hov, setHov] = useState<number | null>(null);
  const median = Number(t?.median ?? 0);
  const W = 620, H = 340, PADL = 32, PADR = 22, PADT = 30, PADB = 46;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB, cy = PADT + innerH / 2;
  const dots = useMemo(() => {
    const all = [...(fast || []), ...(slow || [])];
    const seen = new Set<string>();
    const uniq = all.filter((v) => (seen.has(v.name) ? false : (seen.add(v.name), true)));
    if (!uniq.length) return [];
    const maxD = Math.max(...uniq.map((v) => v.days), median, 1);
    const maxL = Math.max(...uniq.map((v) => v.lines), 1);
    const denom = Math.log10(maxD + 1) || 1; // log scale: lead times span orders of magnitude
    const xP = (d: number) => PADL + (Math.log10(Math.max(d, 0) + 1) / denom) * innerW;
    const sized = uniq.map((v) => ({ ...v, x: xP(v.days), r: 6 + Math.sqrt(v.lines / maxL) * 15 })).sort((a, b) => a.x - b.x);
    // simple beeswarm: push overlapping dots vertically
    const placed: any[] = [];
    sized.forEach((d) => {
      let y = cy, step = 0;
      for (let k = 0; k < 200; k++) {
        y = cy + step;
        const clash = placed.some((p) => Math.abs(p.x - d.x) < p.r + d.r + 1.5 && Math.abs(p.y - y) < p.r + d.r + 1.5);
        if (!clash) break;
        step = step <= 0 ? -step + 6 : -step; // 0,+6,-6,+12,-12...
      }
      placed.push({ ...d, y });
    });
    return { list: placed, xP, maxD };
  }, [fast, slow, median]);
  if (!("list" in dots) || !dots.list.length) return null;
  const { list, xP, maxD } = dots as any;
  const ticks = [0, 2, 5, 10, 20, 50, 100, 200, 400].filter((d) => d <= maxD);
  return (
    <Card delay={200} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>The fast lane vs the slow lane</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>each vendor placed by median lead time · size = GR lines · colour = speed</p></div>
      </div>
      <div className="relative mt-2 flex-1 flex items-center" style={{ minHeight: 290 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          {/* under-7d zone */}
          <rect x={PADL} y={PADT} width={xP(7) - PADL} height={innerH} fill={`${SPEED[0]}0e`} rx="8" />
          <text x={(PADL + xP(7)) / 2} y={PADT + 12} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 600, fill: SPEED[0] }}>within 7 days</text>
          {/* axis */}
          <line x1={PADL} y1={PADT + innerH} x2={W - PADR} y2={PADT + innerH} stroke="#ecebf3" strokeWidth="1.5" />
          {ticks.map((d) => <text key={d} x={xP(d)} y={H - 24} textAnchor="middle" style={{ fontSize: 10, fill: "#a49ebb", fontWeight: 500 }}>{d}d</text>)}
          <text x={PADL + innerW / 2} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: "#8a84a2", fontWeight: 600 }}>median lead time · days (log scale) →</text>
          {/* median marker */}
          <line x1={xP(median)} y1={PADT - 4} x2={xP(median)} y2={PADT + innerH} stroke={DEEP} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
          <text x={xP(median)} y={PADT - 8} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 700, fill: DEEP }}>median {median.toFixed(1)}d</text>
          {/* dots */}
          {list.map((d: any, i: number) => { const c = speedByDays(d.days); const active = hov === i; const dim = hov != null && !active; return (
            <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: "pointer", opacity: on ? (dim ? 0.35 : 1) : 0, transform: on ? "scale(1)" : "scale(0.4)", transformOrigin: `${d.x}px ${d.y}px`, transition: `opacity 0.4s ease ${i * 35}ms, transform 0.6s cubic-bezier(0.34,1.3,0.64,1) ${i * 35}ms` }}>
              <circle cx={d.x} cy={d.y} r={d.r} fill={`${c}2b`} stroke={c} strokeWidth={active ? 2.5 : 1.5} />
              <circle cx={d.x} cy={d.y} r={d.r * 0.44} fill={c} opacity={active ? 0.95 : 0.72} />
            </g>
          ); })}
        </svg>
        {hov != null && list[hov] && (() => { const d = list[hov]; const left = (d.x / W) * 100; return (
          <div className="absolute pointer-events-none" style={{ left: `${Math.min(Math.max(left, 12), 86)}%`, top: 6, transform: "translate(-50%,0)" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(58,44,110,0.42)", border: "1px solid #efedf6" }}>
              <div className="text-[12px] font-bold" style={{ color: INK }}>{vName(d.name, 24)}</div>
              <div className="text-[11px] tabular-nums" style={{ color: speedByDays(d.days) }}>{dfmt(d.days)} median · {countAbbr(d.lines)} GR lines</div>
            </div>
          </div>
        ); })()}
      </div>
    </Card>
  );
}

// ---------------- Slowest vendors ladder ----------------
function SlowLadder({ slow }: { slow: any[] }) {
  const on = useMount(240);
  const rows = (slow || []).slice(0, 8);
  const max = Math.max(...rows.map((r: any) => r.days), 1);
  return (
    <Card delay={240} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-center justify-between">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Slowest suppliers</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>longest median lead · ≥20 GR lines</p></div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${SPEED[4]}18`, color: SPEED[4] }}>watchlist</span>
      </div>
      <div className="mt-3 flex-1 flex flex-col justify-between gap-1">
        {rows.map((r: any, i: number) => { const c = speedByDays(r.days); return (
          <div key={i} className="py-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${c}1c`, color: c }}><TbAlertTriangle size={12} /></span>
                <span className="text-[12.5px] font-medium truncate" style={{ color: "#413a56" }} title={r.name}>{vName(r.name, 22)}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px]" style={{ color: "#a49ebb" }}>{countAbbr(r.lines)} lines</span>
                <span className="text-[12.5px] font-bold tabular-nums" style={{ color: c }}>{dfmt(r.days)}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden ml-[34px]" style={{ background: "#f0eef7" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.days / max) * 100}%` : "0%", background: c, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms` }} />
            </div>
          </div>
        ); })}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </Card>
  );
}

const COLUMNS = [
  { field: "vendor_name", label: "Vendor" }, { field: "avg_lead_time_days", label: "Avg (d)", kind: "num" as const },
  { field: "median_lead_time_days", label: "Median (d)", kind: "num" as const }, { field: "gr_lines", label: "GR Lines", kind: "num" as const },
];

export default function VendorLeadTimeDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/vendor-lead-time/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  return (
    <Shell region={region}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-4 flex flex-col min-w-0"><ReliabilityHero t={t} /></div>
        <div className="xl:col-span-8 flex flex-col min-w-0"><Distribution dist={data?.dist || []} /></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 flex flex-col min-w-0"><Beeswarm fast={data?.fast || []} slow={data?.slow || []} t={t} /></div>
        <div className="xl:col-span-5 flex flex-col min-w-0"><SlowLadder slow={data?.slow || []} /></div>
      </div>
      <Card delay={320} className="bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Vendor lead-time detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="vendor-lead-time" plant={region} columns={COLUMNS} />
      </Card>
    </Shell>
  );
}
