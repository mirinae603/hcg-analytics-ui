"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbSnowflake, TbBolt, TbArrowDownRight, TbGauge } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
// ── Soft, premium "Halo" aesthetic — grey-lavender canvas, pastel gradient cards,
//    rounded white surfaces, sidebar lists. Blue accent (home Turnover card). ──
const PAGE = "#EBEDF4";
const INK = "#222a40";
const SUBTLE = "#8990a4";
const BLUE = "#3b82f6";
const FAST = "#18b07b", MOD = "#efa93b", SLOW = "#ef6a52", DEAD = "#aab2c2";
// uniform stat-card tints (soft solid pastels — no diagonal banding)
const TINT_BLUE = { bg: "#eaf2ff", bd: "#dbe8fc", ring: "#3b82f6", track: "#dbe8fc" };
const TINT_ROSE = { bg: "#fdedef", bd: "#f8dee2", ring: "#e8604a", track: "#f8dee2" };
const TINT_MINT = { bg: "#e8f6ef", bd: "#d6efe1", ring: "#15a978", track: "#d6efe1" };
const speedColor = (itr: number) => (itr <= 0.001 ? DEAD : itr < 1 ? SLOW : itr < 4 ? MOD : FAST);
const CARD_SH = "0 16px 40px -24px rgba(40,52,86,0.24), 0 4px 14px -8px rgba(40,52,86,0.08)";

const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (n: number) => { const p = Math.min((n - start) / 1100, 1); setV(value * easeOut(p)); if (p < 1) raf = requestAnimationFrame(tick); else setV(value); };
    raf = requestAnimationFrame(tick);
    const g = setTimeout(() => setV(value), 1200);
    return () => { cancelAnimationFrame(raf); clearTimeout(g); };
  }, [value]);
  return <>{format(v)}</>;
}
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 140 + delay); return () => clearTimeout(t); }, [delay]); return on; };
const catName = (g: string) => String(g).replace(/^M\d+-/, "");

// Catmull-Rom → cubic-bezier smoothing for a fluid line
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Smooth gradient area chart — the turnover "engine": monthly consumption flow
function TrendCard({ timeline }: { timeline: any[] }) {
  const on = useMount(140);
  const [hov, setHov] = useState<number | null>(null);
  const data = timeline || [];
  if (!data.length) return null;
  const W = 760, H = 248, PADX = 26, PADT = 52, PADB = 34;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const vals = data.map((d) => d.value);
  const max = Math.max(...vals), min = Math.min(...vals);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const peakIdx = vals.indexOf(max);
  const lo = min * 0.82, hi = max * 1.04, span = hi - lo || 1;
  const X = (i: number) => PADX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const Y = (v: number) => PADT + innerH - ((v - lo) / span) * innerH;
  const pts = data.map((d, i) => ({ x: X(i), y: Y(d.value) }));
  const line = smoothPath(pts);
  const area = `${line} L ${X(data.length - 1).toFixed(1)} ${(PADT + innerH).toFixed(1)} L ${X(0).toFixed(1)} ${(PADT + innerH).toFixed(1)} Z`;
  const avgY = Y(avg);
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[16px] font-semibold" style={{ color: INK }}>Turnover flow</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>monthly consumption that turns your stock · 6-month window</p>
        </div>
        <div className="text-right">
          <div className="text-[20px] font-bold leading-none tabular-nums" style={{ color: BLUE }}>{inrAbbr(avg)}</div>
          <div className="text-[11px] mt-1" style={{ color: SUBTLE }}>avg / month</div>
        </div>
      </div>
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id="itrFlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity="0.26" />
              <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* avg baseline */}
          <line x1={PADX} y1={avgY} x2={W - PADX} y2={avgY} stroke="#c9d2e3" strokeWidth="1" strokeDasharray="4 5" />
          <text x={W - PADX} y={avgY - 6} textAnchor="end" style={{ fontSize: 10, fill: "#aab2c6", fontWeight: 600 }}>avg</text>
          {/* area + line */}
          <path d={area} fill="url(#itrFlow)" style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease 0.3s" }} />
          <path d={line} fill="none" stroke={BLUE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
          {/* dots + hover columns */}
          {data.map((d, i) => {
            const isPeak = i === peakIdx, active = hov === i;
            return (
              <g key={i}>
                {active && <line x1={pts[i].x} y1={PADT - 8} x2={pts[i].x} y2={PADT + innerH} stroke={BLUE} strokeWidth="1" strokeOpacity="0.35" />}
                <circle cx={pts[i].x} cy={pts[i].y} r={active || isPeak ? 5.5 : 3.5} fill="#fff" stroke={BLUE} strokeWidth={active || isPeak ? 3 : 2.5} style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.6 + i * 0.08}s` }} />
                <rect x={pts[i].x - innerW / (data.length * 2)} y={0} width={innerW / data.length} height={H} fill="transparent" onMouseEnter={() => setHov(i)} />
                <text x={pts[i].x} y={H - 8} textAnchor="middle" style={{ fontSize: 11, fill: active ? INK : "#9aa1b3", fontWeight: active ? 700 : 500 }}>{d.label}</text>
              </g>
            );
          })}
        </svg>
        {/* floating tooltip / peak callout (HTML for crisp text) */}
        {(() => {
          const i = hov ?? peakIdx; const d = data[i]; if (!d) return null;
          const leftPct = (X(i) / W) * 100;
          return (
            <div className="absolute pointer-events-none" style={{ left: `${leftPct}%`, top: `${(Y(d.value) / H) * 100}%`, transform: "translate(-50%, -135%)", transition: "left 0.18s ease, top 0.18s ease" }}>
              <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(40,52,86,0.4)", border: "1px solid #eef0f6" }}>
                <div className="text-[13px] font-bold tabular-nums leading-none" style={{ color: INK }}>{inrAbbr(d.value)}</div>
                <div className="text-[10px] mt-0.5" style={{ color: hov == null ? BLUE : SUBTLE }}>{hov == null ? "peak · " + d.month : d.month}</div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// One uniform stat card — identical shape/layout for all three (icon+label, big
// number, caption, then a clean share bar anchored to the bottom). Differs only by tint.
function StatCard({ tint, icon: Icon, label, value, format, sub, pct, barLabel, delay }: any) {
  const on = useMount(delay); const p = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="rounded-[24px] p-5 flex flex-col" style={{ background: tint.bg, minHeight: 196, border: `1px solid ${tint.bd}`, boxShadow: CARD_SH }}>
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-white flex-shrink-0" style={{ color: tint.ring, boxShadow: "0 5px 12px -7px rgba(40,52,86,0.4)" }}><Icon size={17} /></span>
        <span className="text-[13px] font-semibold" style={{ color: INK }}>{label}</span>
      </div>
      <div className="mt-4">
        <div className="text-[30px] leading-none font-bold tabular-nums tracking-tight whitespace-nowrap" style={{ color: INK }}><CountUp value={value} format={format} /></div>
        <div className="mt-2 text-[12px]" style={{ color: "#5a6178" }}>{sub}</div>
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium" style={{ color: "#7a8298" }}>{barLabel}</span>
          <span className="text-[12px] font-bold tabular-nums" style={{ color: tint.ring }}>{Math.round(p)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.75)" }}>
          <div className="h-full rounded-full" style={{ width: on ? `${Math.max(p, 3)}%` : "0%", background: tint.ring, transition: "width 1.15s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
      </div>
    </div>
  );
}

// Main chart card — category velocity (ranked pill bars on a soft dotted field)
function VelocityCard({ cats, itr, region }: any) {
  const on = useMount(120);
  const sorted = [...cats].sort((a, b) => b.itr - a.itr).slice(0, 10);
  const max = Math.max(...sorted.map((c) => c.itr), 1);
  return (
    <div className="rounded-[26px] bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH, backgroundImage: "radial-gradient(rgba(59,130,246,0.06) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[16px] font-semibold" style={{ color: INK }}>Category velocity</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>turns per year · fast movers vs slow sitters</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: "#6b7488" }}>
          {[["Slow", SLOW], ["Moderate", MOD], ["Fast", FAST]].map(([l, c]) => <span key={l} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c as string }} />{l}</span>)}
        </div>
      </div>
      <div className="mt-5 flex-1 flex flex-col justify-between gap-2.5">
        {sorted.map((c, i) => { const col = speedColor(c.itr); const w = Math.max((c.itr / max) * 100, 4); return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] font-medium truncate flex-shrink-0" style={{ width: 132, color: "#525c72" }} title={catName(c.name)}>{catName(c.name)}</span>
            <div className="flex-1 flex items-center gap-2.5 min-w-0">
              <div className="h-6 rounded-full flex items-center justify-end pr-2.5 flex-shrink-0" style={{ width: on ? `${w}%` : "0%", background: `linear-gradient(90deg,${col}cc,${col})`, boxShadow: `0 5px 14px -8px ${col}`, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms` }}>
                {w > 18 && <span className="text-[11.5px] font-bold text-white tabular-nums">{c.itr.toFixed(2)}×</span>}
              </div>
              {w <= 18 && <span className="text-[12px] font-bold tabular-nums" style={{ color: col }}>{c.itr.toFixed(2)}×</span>}
            </div>
            <span className="text-[11px] tabular-nums flex-shrink-0 w-16 text-right hidden sm:block" style={{ color: "#9aa1b3" }}>{inrAbbr(c.inv)}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

// Sidebar — speed mix (progress list)
function SpeedMixList({ bands }: any) {
  const on = useMount(160);
  const COL: Record<string, string> = { dead: DEAD, slow: SLOW, moderate: MOD, fast: FAST };
  const tv = bands.reduce((s: number, b: any) => s + b.value, 0) || 1;
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Speed mix</h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: SUBTLE }}>value by how fast it turns</p>
      <div className="space-y-4">
        {bands.map((b: any) => { const p = (b.value / tv) * 100; return (
          <div key={b.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] font-medium" style={{ color: "#4b5468" }}>{b.label.split(" ")[0]}</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: INK }}>{inrAbbr(b.value)}</span>
                <span className="text-[11px] tabular-nums w-8 text-right" style={{ color: SUBTLE }}>{Math.round(p)}%</span>
              </div>
            </div>
            <div className="h-2 rounded-full" style={{ background: "#eef1f6" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${p}%` : "0%", background: COL[b.key], transition: "width 1s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
          </div>
        ); })}
        {!bands.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

// Sidebar — cash traps (meeting-list style)
function CashTrapsList({ cats }: any) {
  const traps = cats.filter((c: any) => c.itr < 1).sort((a: any, b: any) => b.inv - a.inv).slice(0, 8);
  return (
    <div className="rounded-[26px] bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Cash traps</h3>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${SLOW}16`, color: "#c2503a" }}>under 1×</span>
      </div>
      <p className="text-[12px] mt-0.5 mb-3" style={{ color: SUBTLE }}>capital frozen in slow stock</p>
      <div className="divide-y divide-gray-50 flex-1 flex flex-col justify-between">
        {traps.map((c: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${SLOW}14`, color: SLOW }}><TbArrowDownRight size={16} /></span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium truncate" style={{ color: "#3c465c" }} title={catName(c.name)}>{catName(c.name)}</div>
                <div className="text-[11px]" style={{ color: SUBTLE }}>{c.itr.toFixed(2)}× per year</div>
              </div>
            </div>
            <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{inrAbbr(c.inv)}</span>
          </div>
        ))}
        {!traps.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "material_group", label: "Category" }, { field: "consumption_cost", label: "COGS", kind: "inr" as const },
  { field: "closing_stock_value", label: "Inventory", kind: "inr" as const }, { field: "turnover_annualized", label: "Turnover", kind: "num" as const },
];

export default function TurnoverDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/inventory-turnover-ratio/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  const t = data?.totals || {};
  const cats: any[] = useMemo(() => (data?.categories || []).map((c: any) => ({ ...c, name: catName(c.name) })), [data]);
  const inv = Number(t.inventory ?? 0), cogs = Number(t.cogs_6mo ?? 0), itr = Number(t.portfolio_itr ?? 0);
  const dead = useMemo(() => (data?.bands || []).find((b: any) => b.key === "dead")?.value ?? 0, [data]);
  const moving = Math.max(0, inv - dead);
  const frozen = useMemo(() => cats.filter((c) => c.itr < 1).reduce((s, c) => s + c.inv, 0), [cats]);
  const frozenN = useMemo(() => cats.filter((c) => c.itr < 1).length, [cats]);

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      {/* friendly header */}
      <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Inventory turnover</h1>
          <p className="text-[13px] mt-1" style={{ color: SUBTLE }}>how fast your stock is moving · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#5b6478", boxShadow: "0 4px 14px -8px rgba(40,52,86,0.2)" }}>6-month window</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col gap-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard tint={TINT_BLUE} icon={TbGauge} label="Turnover" value={itr} format={(n: number) => `${n.toFixed(2)}×`} sub={`Slow · ≈ ${Math.round(Number(t.months_on_hand ?? 0))} months on hand`} pct={Math.min(itr / 4, 1) * 100} barLabel="of 4× healthy" delay={0} />
            <StatCard tint={TINT_ROSE} icon={TbSnowflake} label="Capital frozen" value={frozen} format={inrAbbr} sub={`${frozenN} slow-moving categories`} pct={inv ? (frozen / inv) * 100 : 0} barLabel="of inventory value" delay={80} />
            <StatCard tint={TINT_MINT} icon={TbBolt} label="Actively moving" value={moving} format={inrAbbr} sub="the part that actually turns" pct={inv ? (moving / inv) * 100 : 0} barLabel="of inventory value" delay={160} />
          </div>
          <TrendCard timeline={data?.timeline || []} />
          <VelocityCard cats={cats} itr={itr} region={region} />
        </div>
        <div className="xl:col-span-4 flex flex-col gap-5 min-w-0">
          <SpeedMixList bands={data?.bands || []} />
          <CashTrapsList cats={cats} />
        </div>
      </div>

      <div className="rounded-[26px] bg-white overflow-hidden mt-5" style={{ boxShadow: CARD_SH }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>SKU-level turnover detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="inventory-turnover-ratio" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
