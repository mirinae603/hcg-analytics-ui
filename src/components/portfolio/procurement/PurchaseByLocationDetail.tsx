"use client";
// B7 — Purchase by Location. Unique identity: cyan-teal "network".
// Signature visuals (not shared with any other page):
//   • Honeycomb hex-cartogram — one tile per hospital, colored by spend intensity.
//   • Sourcing-profile scatter — spend vs supplier diversity, split into quadrants.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, useMount, CountUp } from "@/components/portfolio/kit";
import { TbMapPin, TbBuildingHospital, TbChartDots } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// --- cyan-teal network identity ---
const PAGE = "#E9F1F4", INK = "#12303a", SUB = "#7b8a92";
const DEEP = "#0e7490", TEAL = "#0891b2", CYAN = "#06b6d4", AQUA = "#22d3ee", MINT = "#5eead4";
const SH = "0 22px 46px -28px rgba(18,64,78,0.32), 0 4px 12px -8px rgba(18,64,78,0.08)";
const pName = (s: string, n = 14) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

function lerp(a: string, b: string, t: number) {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = ah >> 16, ag = (ah >> 8) & 255, ab = ah & 255, br = bh >> 16, bg = (bh >> 8) & 255, bb = bh & 255;
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}
const spendColor = (t: number) => lerp("#d6ecf1", "#0e7490", Math.sqrt(Math.max(0, Math.min(1, t))));

function Shell({ region, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`
        @keyframes locIn { from { opacity: 0; transform: translateY(16px) scale(0.987); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .loc-card { animation: locIn 0.6s cubic-bezier(0.22,1,0.36,1) both; min-width: 0; }
      `}</style>
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Purchase by location</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>how procurement spend spreads across the hospital network · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#4d6873", boxShadow: "0 4px 14px -8px rgba(18,64,78,0.22)" }}>6-month window</span>
      </div>
      {children}
    </div>
  );
}
function Card({ children, delay = 0, className = "", style = {} }: any) {
  return <div className={`loc-card rounded-[26px] ${className}`} style={{ boxShadow: SH, animationDelay: `${delay}ms`, ...style }}>{children}</div>;
}

// ---------------- Hero: network spend ----------------
function NetworkHero({ t, plants }: { t: any; plants: any[] }) {
  const total = Number(t?.total ?? 0);
  const nPlants = Number(t?.plants ?? plants.length);
  const top = plants[0];
  const top5 = plants.slice(0, 5).reduce((s, p) => s + (p.share || 0), 0);
  const next4 = plants.slice(1, 5).reduce((s, p) => s + (p.share || 0), 0);
  const strip = [
    { label: "Top hospital", val: top?.share || 0, op: 0.96 },
    { label: "Hospitals 2–5", val: next4, op: 0.6 },
    { label: "All others", val: Math.max(100 - (top?.share || 0) - next4, 0), op: 0.26 },
  ];
  return (
    <Card delay={0} className="relative overflow-hidden p-6 flex flex-col flex-1" style={{ background: "linear-gradient(158deg,#28bcd0 0%,#0e9ab4 46%,#0e7490 100%)", minHeight: 360 }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 220, height: 220, background: "#a5f0ea", opacity: 0.4, top: -80, right: -50 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 150, height: 150, background: "#bdeffb", opacity: 0.24, bottom: -50, left: -30 }} />
      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.66)" }}><TbMapPin size={14} />Network spend</div>
        <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.22)" }}>{nPlants} hospitals</span>
      </div>
      <div className="relative mt-4">
        <div className="text-[40px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,0.18)" }}><CountUp value={total} format={inrAbbr} /></div>
        <div className="text-[12.5px] mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>procured across the network</div>
      </div>
      {top && (
        <div className="relative mt-4 rounded-2xl p-3.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.16)" }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.9)", color: DEEP }}><TbBuildingHospital size={18} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold truncate" style={{ color: "#fff" }}>{top.plant}</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.68)" }}>lead location</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[14px] font-bold tabular-nums" style={{ color: "#fff" }}>{inrAbbr(top.value)}</div>
            <div className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.68)" }}>{top.share.toFixed(1)}% share</div>
          </div>
        </div>
      )}
      {/* concentration spread strip */}
      <div className="relative mt-4 flex-1 flex flex-col justify-center">
        <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.14)" }}>
          {strip.map((s, i) => <div key={i} style={{ width: `${s.val}%`, background: "#fff", opacity: s.op, borderRight: i < 2 ? "1.5px solid rgba(14,116,144,0.35)" : "none" }} />)}
        </div>
        <div className="flex items-center justify-between mt-2.5">
          {strip.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[10.5px]" style={{ color: "rgba(255,255,255,0.8)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#fff", opacity: s.op }} />{s.label} · <b className="tabular-nums">{s.val.toFixed(0)}%</b>
            </span>
          ))}
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        {[{ l: "Avg / hospital", v: inrAbbr(Number(t?.avg ?? 0)) }, { l: "Top-5 share", v: `${top5.toFixed(0)}%` }].map((p, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div className="text-[15px] font-bold tabular-nums leading-none" style={{ color: "#fff" }}>{p.v}</div>
            <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.64)" }}>{p.l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Honeycomb hex-cartogram ----------------
function hexPath(cx: number, cy: number, s: number) {
  let d = "";
  for (let k = 0; k < 6; k++) { const a = (Math.PI / 180) * (60 * k); const x = cx + s * Math.cos(a), y = cy + s * Math.sin(a); d += (k ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }
  return d + "Z";
}
function HexCartogram({ plants }: { plants: any[] }) {
  const on = useMount(160); const [hov, setHov] = useState<number | null>(null);
  const W = 620, H = 372, PAD = 20, COLS = 4;
  const cells = useMemo(() => {
    const data = (plants || []).slice(0, 12);
    if (!data.length) return [];
    const maxShare = Math.max(...data.map((d) => d.share), 1);
    const S = 50;
    const raw = data.map((d, i) => { const c = i % COLS, r = Math.floor(i / COLS); return { x: c * 1.5 * S, y: r * Math.sqrt(3) * S + (c % 2) * (Math.sqrt(3) / 2 * S), d, i, maxShare }; });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    raw.forEach((p) => { minX = Math.min(minX, p.x - S); maxX = Math.max(maxX, p.x + S); minY = Math.min(minY, p.y - S); maxY = Math.max(maxY, p.y + S); });
    const bw = maxX - minX || 1, bh = maxY - minY || 1;
    const scale = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, s = S * scale;
    return raw.map((p) => ({ ...p, X: (p.x - cx) * scale + W / 2, Y: (p.y - cy) * scale + H / 2, s }));
  }, [plants]);
  if (!cells.length) return null;
  return (
    <Card delay={140} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Spend footprint</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>each hospital tiled & shaded by its share of network spend · top {cells.length}</p></div>
        <div className="flex items-center gap-2" style={{ color: "#6b7d84" }}>
          <span className="text-[10.5px] font-medium">low</span>
          <span className="rounded-full" style={{ width: 76, height: 8, background: "linear-gradient(90deg,#d6ecf1,#0e7490)" }} />
          <span className="text-[10.5px] font-medium">high</span>
        </div>
      </div>
      <div className="relative mt-2 flex-1 flex items-center justify-center" style={{ minHeight: 300 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          {cells.map((c) => { const t = c.d.share / c.maxShare; const fill = spendColor(t); const active = hov === c.i; const dim = hov != null && !active; const light = t < 0.42; return (
            <g key={c.i} onMouseEnter={() => setHov(c.i)} style={{ cursor: "pointer", transformOrigin: `${c.X}px ${c.Y}px`, transform: on ? "scale(1)" : "scale(0)", opacity: on ? (dim ? 0.45 : 1) : 0, transition: `transform 0.6s cubic-bezier(0.34,1.4,0.64,1) ${c.i * 55}ms, opacity 0.35s ease ${on ? 0 : c.i * 55}ms` }}>
              <path d={hexPath(c.X, c.Y, c.s * 0.94)} fill={fill} stroke={active ? DEEP : "#fff"} strokeWidth={active ? 3 : 2.5} style={{ filter: active ? `drop-shadow(0 8px 16px ${DEEP}55)` : "none" }} />
              <text x={c.X} y={c.Y - 2} textAnchor="middle" style={{ fontSize: c.s > 44 ? 12.5 : 10.5, fontWeight: 800, fill: light ? INK : "#fff" }}>{pName(c.d.plant, 7)}</text>
              <text x={c.X} y={c.Y + 14} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: light ? "#5b7079" : "rgba(255,255,255,0.9)" }} className="tabular-nums">{c.d.share.toFixed(1)}%</text>
            </g>
          ); })}
        </svg>
        {hov != null && cells.find((c) => c.i === hov) && (() => { const c = cells.find((x) => x.i === hov)!; return (
          <div className="absolute top-1 left-1 pointer-events-none">
            <div className="px-3 py-2 rounded-xl" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(18,64,78,0.42)", border: "1px solid #e5eef0" }}>
              <div className="text-[12px] font-bold" style={{ color: INK }}>{c.d.plant}</div>
              <div className="text-[11px] tabular-nums" style={{ color: TEAL }}>{inrAbbr(c.d.value)} · {c.d.share.toFixed(1)}% · {countAbbr(c.d.vendors)} vendors · {countAbbr(c.d.lines)} lines</div>
            </div>
          </div>
        ); })()}
      </div>
    </Card>
  );
}

// ---------------- Sourcing-profile scatter ----------------
function SourcingScatter({ plants }: { plants: any[] }) {
  const on = useMount(200); const [hov, setHov] = useState<number | null>(null);
  const data = (plants || []).slice(0, 12);
  if (!data.length) return null;
  const W = 560, H = 380, PADL = 44, PADR = 18, PADT = 22, PADB = 40;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const maxV = Math.max(...data.map((d) => d.vendors), 1) * 1.12;
  const maxS = Math.max(...data.map((d) => d.value), 1) * 1.12;
  const maxL = Math.max(...data.map((d) => d.lines), 1);
  const avgV = data.reduce((s, d) => s + d.vendors, 0) / data.length;
  const avgS = data.reduce((s, d) => s + d.value, 0) / data.length;
  const xP = (v: number) => PADL + (v / maxV) * innerW;
  const yP = (v: number) => PADT + innerH - (v / maxS) * innerH;
  const rP = (l: number) => 7 + Math.sqrt(l / maxL) * 17;
  return (
    <Card delay={200} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbChartDots size={16} style={{ color: TEAL }} />Sourcing profile</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>spend vs supplier diversity per hospital · bubble = PO lines</p></div>
      </div>
      <div className="relative mt-2 flex-1" style={{ minHeight: 320 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          {/* grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
            <g key={i}>
              <line x1={PADL} y1={PADT + innerH - g * innerH} x2={W - PADR} y2={PADT + innerH - g * innerH} stroke="#eef4f5" strokeWidth="1" />
              <text x={PADL - 6} y={PADT + innerH - g * innerH + 3} textAnchor="end" style={{ fontSize: 9, fill: "#a3b2b8" }}>{inrAbbr(g * maxS)}</text>
            </g>
          ))}
          {/* quadrant dividers at averages */}
          <line x1={xP(avgV)} y1={PADT} x2={xP(avgV)} y2={PADT + innerH} stroke={TEAL} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
          <line x1={PADL} y1={yP(avgS)} x2={W - PADR} y2={yP(avgS)} stroke={TEAL} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
          <text x={W - PADR - 2} y={PADT + 12} textAnchor="end" style={{ fontSize: 9, fill: "#b3c1c6", fontWeight: 600 }}>high spend · broad base</text>
          <text x={PADL + 2} y={PADT + innerH - 6} textAnchor="start" style={{ fontSize: 9, fill: "#b3c1c6", fontWeight: 600 }}>low spend · few vendors</text>
          {/* bubbles */}
          {data.map((d, i) => { const active = hov === i; const dim = hov != null && !active; const r = rP(d.lines); return (
            <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: "pointer", opacity: on ? (dim ? 0.4 : 1) : 0, transform: on ? "scale(1)" : "scale(0.5)", transformOrigin: `${xP(d.vendors)}px ${yP(d.value)}px`, transition: `opacity 0.4s ease ${i * 45}ms, transform 0.6s cubic-bezier(0.34,1.3,0.64,1) ${i * 45}ms` }}>
              <circle cx={xP(d.vendors)} cy={yP(d.value)} r={r} fill={`${TEAL}26`} stroke={TEAL} strokeWidth={active ? 2.5 : 1.5} />
              <circle cx={xP(d.vendors)} cy={yP(d.value)} r={r * 0.42} fill={TEAL} opacity={active ? 0.95 : 0.7} />
              {(d.value >= avgS || active) && <text x={xP(d.vendors)} y={yP(d.value) - r - 4} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: active ? DEEP : "#5b7079" }}>{pName(d.plant, 8)}</text>}
            </g>
          ); })}
          {/* x axis label */}
          <text x={PADL + innerW / 2} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: "#8a99a0", fontWeight: 600 }}>supplier diversity (vendor count) →</text>
        </svg>
        {hov != null && data[hov] && (() => { const d = data[hov]; const left = (xP(d.vendors) / W) * 100; return (
          <div className="absolute pointer-events-none" style={{ left: `${Math.min(Math.max(left, 12), 84)}%`, top: 4, transform: "translate(-50%,0)" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(18,64,78,0.42)", border: "1px solid #e5eef0" }}>
              <div className="text-[12px] font-bold" style={{ color: INK }}>{d.plant}</div>
              <div className="text-[11px] tabular-nums" style={{ color: TEAL }}>{inrAbbr(d.value)} · {countAbbr(d.vendors)} vendors · {countAbbr(d.lines)} lines</div>
            </div>
          </div>
        ); })()}
      </div>
    </Card>
  );
}

// ---------------- Ranked locations ladder ----------------
function LocationLadder({ plants, t }: { plants: any[]; t: any }) {
  const on = useMount(240);
  const rows = (plants || []).slice(0, 8);
  const max = Math.max(...rows.map((r: any) => r.value), 1);
  return (
    <Card delay={240} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-center justify-between">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Top locations</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>by procurement spend</p></div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${TEAL}16`, color: DEEP }}>{Number(t?.plants ?? rows.length)} total</span>
      </div>
      <div className="mt-3 flex-1 flex flex-col justify-between gap-1">
        {rows.map((r: any, i: number) => (
          <div key={i} className="py-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 tabular-nums" style={{ background: `${TEAL}18`, color: DEEP }}>{i + 1}</span>
                <span className="text-[12.5px] font-medium truncate" style={{ color: "#33474d" }} title={r.plant}>{r.plant}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10.5px] tabular-nums" style={{ color: "#93a4aa" }}>{countAbbr(r.vendors)} vnd</span>
                <span className="text-[12.5px] font-bold tabular-nums" style={{ color: INK }}>{inrAbbr(r.value)}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden ml-[34px]" style={{ background: "#eaf1f2" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: `linear-gradient(90deg,${AQUA},${TEAL})`, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms` }} />
            </div>
          </div>
        ))}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </Card>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "purchase_value", label: "Spend", kind: "inr" as const },
  { field: "purchase_qty", label: "Qty", kind: "num" as const }, { field: "vendor_count", label: "Vendors", kind: "num" as const },
  { field: "po_lines", label: "PO Lines", kind: "num" as const },
];

export default function PurchaseByLocationDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/purchase-by-location/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const plants = data?.plants || [];
  return (
    <Shell region={region}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-4 flex flex-col min-w-0"><NetworkHero t={t} plants={plants} /></div>
        <div className="xl:col-span-8 flex flex-col min-w-0"><HexCartogram plants={plants} /></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 flex flex-col min-w-0"><SourcingScatter plants={plants} /></div>
        <div className="xl:col-span-5 flex flex-col min-w-0"><LocationLadder plants={plants} t={t} /></div>
      </div>
      <Card delay={320} className="bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Location purchase detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="purchase-by-location" plant={region} columns={COLUMNS} />
      </Card>
    </Shell>
  );
}
