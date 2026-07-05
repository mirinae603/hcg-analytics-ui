"use client";
// E2 — Procurement Cycle Time. Unique identity: warm amber "pipeline / pace".
// Signature visuals (not shared with any other page):
//   • PR → PO → GR pipeline timeline — horizontal distance encodes stage days.
//   • Monthly cycle-time trend with fastest/slowest month markers.
//   • Hospital speed ladder — gold→rust "thermometer" coloring vs the network avg.
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { countAbbr, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbClockBolt, TbShoppingCart, TbTruckDelivery, TbBuildingHospital, TbBolt } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// --- warm amber "pace" identity ---
const PAGE = "#F6F1E8", INK = "#312a1e", SUB = "#978b77";
const AMBER = "#e0902f", DEEP = "#c2740f", GOLD = "#f4b53f", SLATE = "#5c6b86", RUST = "#b5560c";
const SH = "0 22px 46px -28px rgba(90,66,26,0.30), 0 4px 12px -8px rgba(90,66,26,0.08)";
const dfmt = (n: number) => `${n.toFixed(1)}d`;
const pName = (s: string, n = 14) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
function lerp(a: string, b: string, t: number) {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = ah >> 16, ag = (ah >> 8) & 255, ab = ah & 255, br = bh >> 16, bg = (bh >> 8) & 255, bb = bh & 255;
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(ar + (br - ar) * k)},${Math.round(ag + (bg - ag) * k)},${Math.round(ab + (bb - ab) * k)})`;
}

function Shell({ region, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`
        @keyframes ctIn { from { opacity: 0; transform: translateY(16px) scale(0.987); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .ct-card { animation: ctIn 0.6s cubic-bezier(0.22,1,0.36,1) both; min-width: 0; }
      `}</style>
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Procurement cycle time</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>how fast a requisition travels the buying pipeline into received goods · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#7a6c53", boxShadow: "0 4px 14px -8px rgba(90,66,26,0.22)" }}>6-month window</span>
      </div>
      {children}
    </div>
  );
}
function Card({ children, delay = 0, className = "", style = {} }: any) {
  return <div className={`ct-card rounded-[26px] ${className}`} style={{ boxShadow: SH, animationDelay: `${delay}ms`, ...style }}>{children}</div>;
}

// ---------------- Hero: pace ----------------
function PaceHero({ t }: { t: any }) {
  const avgPo = Number(t?.avg_po ?? 0), fast = Number(t?.fast_po ?? 0), slow = Number(t?.slow_po ?? 0);
  const spread = Math.max(slow - fast, 0);
  const pos = slow > fast ? Math.max(0, Math.min(1, (avgPo - fast) / (slow - fast))) : 0.5;
  const on = useMount(60);
  return (
    <Card delay={0} className="relative overflow-hidden p-6 flex flex-col flex-1" style={{ background: "linear-gradient(158deg,#f2ac52 0%,#e0902f 46%,#c2740f 100%)", minHeight: 360 }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 220, height: 220, background: "#ffe0a3", opacity: 0.45, top: -80, right: -50 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 150, height: 150, background: "#ffd0b0", opacity: 0.26, bottom: -50, left: -30 }} />
      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.72)" }}><TbClockBolt size={14} />Procurement pace</div>
        <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.24)" }}>order → receipt</span>
      </div>
      <div className="relative mt-4">
        <div className="text-[46px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,0.16)" }}><CountUp value={avgPo} format={(n) => n.toFixed(1)} /><span className="text-[22px] font-semibold ml-1" style={{ color: "rgba(255,255,255,0.8)" }}>days</span></div>
        <div className="text-[12.5px] mt-2" style={{ color: "rgba(255,255,255,0.74)" }}>average PO → goods receipt</div>
      </div>
      <div className="relative mt-4 rounded-2xl p-3.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }}>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.9)", color: DEEP }}><TbBolt size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold" style={{ color: "#fff" }}>{spread.toFixed(1)} day swing</div>
          <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>between the fastest & slowest month</div>
        </div>
      </div>
      {/* range strip: where the average sits between fastest and slowest */}
      <div className="relative mt-5 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.7)" }}><span>fastest {fast.toFixed(1)}d</span><span>slowest {slow.toFixed(1)}d</span></div>
        <div className="relative h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div className="absolute top-1/2 rounded-full" style={{ left: 0, height: 5, marginTop: -2.5, width: on ? `${pos * 100}%` : "0%", background: "rgba(255,255,255,0.55)", transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)" }} />
          <div className="absolute" style={{ left: `${pos * 100}%`, top: "50%", transform: "translate(-50%,-50%)", opacity: on ? 1 : 0, transition: "opacity 0.5s ease 0.9s" }}>
            <div className="w-4 h-4 rounded-full bg-white" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }} />
          </div>
        </div>
        <div className="text-center text-[10.5px] mt-2" style={{ color: "rgba(255,255,255,0.82)" }}>avg <b className="tabular-nums">{avgPo.toFixed(1)}d</b> sits {pos < 0.45 ? "toward the fast end" : pos > 0.55 ? "toward the slow end" : "mid-range"}</div>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        {[{ l: `Fastest · ${t?.fast_month ?? "—"}`, v: dfmt(fast) }, { l: `Slowest · ${t?.slow_month ?? "—"}`, v: dfmt(slow) }].map((p, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.16)" }}>
            <div className="text-[15px] font-bold tabular-nums leading-none" style={{ color: "#fff" }}>{p.v}</div>
            <div className="text-[10px] mt-1 truncate" style={{ color: "rgba(255,255,255,0.66)" }}>{p.l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Order → receipt pace (PO → GR) ----------------
function PipelineFlow({ t }: { t: any }) {
  const on = useMount(160);
  const avgPo = Number(t?.avg_po ?? 0), fast = Number(t?.fast_po ?? 0), slow = Number(t?.slow_po ?? 0);
  const Node = ({ code, name, icon: Icon, c }: any) => (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 96 }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white" style={{ color: c, boxShadow: `0 8px 20px -10px ${c}88`, border: `1.5px solid ${c}30` }}><Icon size={24} /></div>
      <div className="mt-2 text-[13px] font-bold" style={{ color: INK }}>{code}</div>
      <div className="text-[10.5px] text-center leading-tight" style={{ color: SUB }}>{name}</div>
    </div>
  );
  const tiles = [
    { label: "Fastest month", sub: t?.fast_month ?? "—", d: fast, c: "#3d9b6e" },
    { label: "Typical", sub: "6-mo average", d: avgPo, c: AMBER },
    { label: "Slowest month", sub: t?.slow_month ?? "—", d: slow, c: RUST },
  ];
  return (
    <Card delay={140} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Order-to-receipt pace</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>how long a purchase order takes to arrive as received goods</p></div>
        <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: `${AMBER}18`, color: DEEP }}>PO → GR · reliable</span>
      </div>
      {/* the flow */}
      <div className="flex-1 flex items-center">
        <div className="w-full flex items-center">
          <Node code="PO" name="Order placed" icon={TbShoppingCart} c={AMBER} />
          <div className="flex-1 flex flex-col items-center px-3 pt-1" style={{ minWidth: 60 }}>
            <div className="text-[26px] font-bold tabular-nums leading-none" style={{ color: AMBER }}>{avgPo.toFixed(1)}<span className="text-[13px] font-semibold" style={{ color: SUB }}> days avg</span></div>
            <div className="w-full h-4 rounded-full overflow-hidden mt-3 mb-2.5 relative" style={{ background: `${AMBER}18` }}>
              <div className="h-full rounded-full" style={{ width: on ? "100%" : "0%", background: `linear-gradient(90deg,${GOLD},${AMBER},${DEEP})`, boxShadow: `0 0 16px -3px ${AMBER}`, transition: "width 1.2s cubic-bezier(0.22,1,0.36,1) 0.2s" }} />
            </div>
            <div className="text-[10.5px] font-medium" style={{ color: SUB }}>ranges {fast.toFixed(1)}–{slow.toFixed(1)} days across the 6 months</div>
          </div>
          <Node code="GR" name="Goods received" icon={TbTruckDelivery} c={DEEP} />
        </div>
      </div>
      {/* spread tiles */}
      <div className="grid grid-cols-3 gap-3 mt-2">
        {tiles.map((st, i) => (
          <div key={i} className="rounded-2xl p-3.5" style={{ background: `${st.c}0e`, border: `1px solid ${st.c}22` }}>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-bold tabular-nums" style={{ color: st.c }}>{st.d.toFixed(1)}</span>
              <span className="text-[11px]" style={{ color: SUB }}>days</span>
            </div>
            <div className="text-[12px] font-semibold mt-1" style={{ color: INK }}>{st.label}</div>
            <div className="text-[10.5px]" style={{ color: SUB }}>{st.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Monthly cycle-time trend ----------------
function TrendChart({ timeline }: { timeline: any[] }) {
  const on = useMount(200); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || []; if (!data.length) return null;
  const W = 620, H = 320, PADX = 36, PADT = 26, PADB = 40;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const max = Math.max(...data.map((d) => d.po), 1) * 1.25;
  const X = (i: number) => PADX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const Y = (v: number) => PADT + innerH - (v / max) * innerH;
  const poPts = data.map((d, i) => ({ x: X(i), y: Y(d.po) }));
  const poLine = smoothPath(poPts);
  const poArea = `${poLine} L ${X(data.length - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`;
  const pos = data.map((d) => d.po);
  const avg = pos.reduce((a, b) => a + b, 0) / pos.length;
  const fastI = pos.indexOf(Math.min(...pos)), slowI = pos.indexOf(Math.max(...pos));
  const grid = [0, max / 2, max];
  return (
    <Card delay={200} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Cycle-time trend</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>monthly PO → GR days · fastest & slowest flagged</p></div>
        <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: "#7a7060" }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full" style={{ background: AMBER }} />PO→GR days</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0 border-t-2 border-dashed" style={{ borderColor: SLATE }} />avg</span>
        </div>
      </div>
      <div className="relative mt-3 flex-1" style={{ minHeight: 250 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id="ctArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={AMBER} stopOpacity="0.26" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {grid.map((g, i) => (
            <g key={i}>
              <line x1={PADX} y1={Y(g)} x2={W - PADX} y2={Y(g)} stroke="#f3efe6" strokeWidth="1" />
              <text x={PADX - 6} y={Y(g) + 3} textAnchor="end" style={{ fontSize: 9.5, fill: "#c2b8a4" }}>{g.toFixed(0)}d</text>
            </g>
          ))}
          <path d={poArea} fill="url(#ctArea)" style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease 0.3s" }} />
          {/* average reference */}
          <line x1={PADX} y1={Y(avg)} x2={W - PADX} y2={Y(avg)} stroke={SLATE} strokeWidth="1.5" strokeDasharray="5 5" opacity="0.55" />
          <text x={W - PADX} y={Y(avg) - 5} textAnchor="end" style={{ fontSize: 9.5, fill: SLATE, fontWeight: 600 }}>avg {avg.toFixed(1)}d</text>
          <path d={poLine} fill="none" stroke={AMBER} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.4s ease 0.35s", filter: `drop-shadow(0 5px 9px ${AMBER}44)` }} />
          {/* fastest/slowest markers on PO line */}
          {[{ i: fastI, c: "#3d9b6e", txt: "fastest" }, { i: slowI, c: RUST, txt: "slowest" }].map((m, k) => m.i >= 0 && (
            <g key={k} style={{ opacity: on ? 1 : 0, transition: `opacity 0.5s ease ${0.9 + k * 0.1}s` }}>
              <circle cx={X(m.i)} cy={Y(data[m.i].po)} r="6" fill="#fff" stroke={m.c} strokeWidth="3" />
              <text x={X(m.i)} y={Y(data[m.i].po) - 12} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: m.c }}>{m.txt}</text>
            </g>
          ))}
          {data.map((d, i) => { const active = hov === i; return (
            <g key={i} onMouseEnter={() => setHov(i)}>
              {active && <line x1={X(i)} y1={PADT - 4} x2={X(i)} y2={PADT + innerH} stroke="#e4dcc9" strokeWidth="1" strokeDasharray="3 3" />}
              <circle cx={X(i)} cy={Y(d.po)} r={active ? 5 : 0} fill="#fff" stroke={AMBER} strokeWidth="2.5" />
              <rect x={X(i) - innerW / (data.length * 2)} y={0} width={innerW / data.length} height={H} fill="transparent" />
              <text x={X(i)} y={H - 12} textAnchor="middle" style={{ fontSize: 10.5, fill: active ? INK : "#a99f8c", fontWeight: active ? 700 : 500 }}>{d.label}</text>
            </g>
          ); })}
        </svg>
        {hov != null && data[hov] && (() => { const d = data[hov]; const left = (X(hov) / W) * 100; return (
          <div className="absolute pointer-events-none" style={{ left: `${Math.min(Math.max(left, 10), 88)}%`, top: 0, transform: "translate(-50%,-2px)" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(90,66,26,0.4)", border: "1px solid #efe9dc" }}>
              <div className="text-[13px] font-bold tabular-nums" style={{ color: AMBER }}>{dfmt(d.po)}</div>
              <div className="text-[10.5px]" style={{ color: SUB }}>{d.label} · PO→GR</div>
            </div>
          </div>
        ); })()}
      </div>
    </Card>
  );
}

// ---------------- Hospital speed ladder ----------------
function SpeedLadder({ plants, t }: { plants: any[]; t: any }) {
  const on = useMount(240);
  const rows = (plants || []).slice(0, 8);
  const avg = Number(t?.avg_po ?? 0);
  const min = Math.min(...rows.map((r: any) => r.po), 0), max = Math.max(...rows.map((r: any) => r.po), 1);
  return (
    <Card delay={240} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-center justify-between">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Hospital speed</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>PO → GR days · slowest first</p></div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${AMBER}16`, color: DEEP }}>avg {avg.toFixed(1)}d</span>
      </div>
      <div className="mt-3 flex-1 flex flex-col justify-between gap-1">
        {rows.map((r: any, i: number) => { const col = lerp(GOLD, RUST, (r.po - min) / (max - min || 1)); const slow = r.po > avg; return (
          <div key={i} className="py-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${col}1e`, color: col }}><TbBuildingHospital size={13} /></span>
                <span className="text-[12.5px] font-medium truncate" style={{ color: "#463c2c" }} title={r.plant}>{r.plant}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px]" style={{ color: "#a99f8c" }}>{countAbbr(r.lines)} lines</span>
                <span className="text-[12.5px] font-bold tabular-nums" style={{ color: slow ? RUST : "#4a7d5e" }}>{dfmt(r.po)}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden ml-[34px]" style={{ background: "#f1ece1" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.po / max) * 100}%` : "0%", background: col, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms` }} />
            </div>
          </div>
        ); })}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </Card>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "year", label: "Year" }, { field: "month", label: "Month" },
  { field: "avg_po_to_gr_tat", label: "PO→GR (d)", kind: "num" as const }, { field: "avg_pr_to_gr_tat", label: "PR→GR (d)", kind: "num" as const },
  { field: "gr_lines", label: "GR Lines", kind: "num" as const },
];

export default function CycleTimeDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/procurement-cycle-time/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const tl = data?.timeline || [];
  const plants = data?.plants || [];
  return (
    <Shell region={region}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-4 flex flex-col min-w-0"><PaceHero t={t} /></div>
        <div className="xl:col-span-8 flex flex-col min-w-0"><PipelineFlow t={t} /></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 flex flex-col min-w-0"><TrendChart timeline={tl} /></div>
        <div className="xl:col-span-5 flex flex-col min-w-0"><SpeedLadder plants={plants} t={t} /></div>
      </div>
      <Card delay={320} className="bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Plant × month cycle-time detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="procurement-cycle-time" plant={region} columns={COLUMNS} />
      </Card>
    </Shell>
  );
}
