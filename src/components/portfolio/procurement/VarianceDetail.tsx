"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, useMount, smoothPath, CountUp } from "@/components/portfolio/kit";
import { ProcShell, TableCard, INK, SUBTLE } from "./parts";
import { TbActivity, TbArrowUpRight, TbArrowDownRight, TbWaveSine, TbTrendingUp, TbTrendingDown } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// ── Warm emerald-rose identity (own character) ──
const PAGE = "#F5F2EE";
const SOFT_SH = "0 18px 40px -26px rgba(90,70,50,0.26), 0 3px 10px -6px rgba(90,70,50,0.06)";
const EMER = "#0e9f6e", ROSE = "#e8604a", SLATE = "#5b6478";
const pctSign = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;

// ── Signature: two-tone deviation-from-average area ──
function DeviationChart({ timeline, avg, latestPct, latestDelta }: { timeline: any[]; avg: number; latestPct: number; latestDelta: number }) {
  const on = useMount(160); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || []; if (!data.length) return null;
  const W = 900, H = 330, PADX = 34, PADT = 52, PADB = 42;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const vals = data.map((d) => d.value); const max = Math.max(...vals), min = Math.min(...vals);
  const lo = Math.min(min, avg) * 0.92, hi = Math.max(max, avg) * 1.05, span = hi - lo || 1;
  const X = (i: number) => data.length <= 1 ? W / 2 : PADX + (i / (data.length - 1)) * innerW;
  const Y = (v: number) => PADT + innerH - ((v - lo) / span) * innerH;
  const baseY = Y(avg);
  const pts = data.map((d, i) => ({ x: X(i), y: Y(d.value) }));
  const line = smoothPath(pts);
  const area = `${line} L ${X(data.length - 1).toFixed(1)} ${baseY.toFixed(1)} L ${X(0).toFixed(1)} ${baseY.toFixed(1)} Z`;
  const up = latestPct >= 0;
  return (
    <div className="rounded-[28px] bg-white p-6 lg:p-7" style={{ boxShadow: SOFT_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[18px] font-bold tracking-tight" style={{ color: INK }}>Spend momentum</h3>
          <p className="text-[12.5px] mt-0.5" style={{ color: SUBTLE }}>month-over-month deviation from the 6-month average</p>
        </div>
        <div className="flex items-center gap-4 text-[11.5px] font-medium" style={{ color: "#6b7488" }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: EMER }} />Above average</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ROSE }} />Below average</span>
        </div>
      </div>
      <div className="relative mt-2" style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id="dev-up" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={EMER} stopOpacity="0.38" /><stop offset="100%" stopColor={EMER} stopOpacity="0.02" /></linearGradient>
            <linearGradient id="dev-dn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ROSE} stopOpacity="0.02" /><stop offset="100%" stopColor={ROSE} stopOpacity="0.38" /></linearGradient>
            <clipPath id="dev-above"><rect x="0" y="0" width={W} height={baseY} /></clipPath>
            <clipPath id="dev-below"><rect x="0" y={baseY} width={W} height={H - baseY} /></clipPath>
          </defs>
          {/* two-tone deviation fill */}
          <path d={area} fill="url(#dev-up)" clipPath="url(#dev-above)" style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease 0.3s" }} />
          <path d={area} fill="url(#dev-dn)" clipPath="url(#dev-below)" style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease 0.3s" }} />
          {/* average baseline */}
          <line x1={PADX} y1={baseY} x2={W - PADX} y2={baseY} stroke="#c2c9d2" strokeWidth="1.5" strokeDasharray="5 5" />
          <text x={W - PADX} y={baseY - 7} textAnchor="end" style={{ fontSize: 10.5, fill: "#9aa1b3", fontWeight: 600 }}>avg {inrAbbr(avg)}</text>
          {/* deviation stems */}
          {pts.map((p, i) => { const above = data[i].value >= avg; return <line key={i} x1={p.x} y1={p.y} x2={p.x} y2={baseY} stroke={above ? EMER : ROSE} strokeOpacity="0.35" strokeWidth="2" style={{ opacity: on ? 1 : 0, transition: `opacity 0.5s ease ${0.5 + i * 0.07}s` }} />; })}
          {/* spend line */}
          <path d={line} fill="none" stroke={SLATE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
          {pts.map((p, i) => { const above = data[i].value >= avg; const active = hov === i; return (
            <g key={i} onMouseEnter={() => setHov(i)}>
              <circle cx={p.x} cy={p.y} r={active ? 6 : 4.5} fill="#fff" stroke={above ? EMER : ROSE} strokeWidth="3" style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.6 + i * 0.07}s`, filter: active ? `drop-shadow(0 3px 7px ${(above ? EMER : ROSE)}66)` : "none" }} />
              <rect x={p.x - innerW / (data.length * 2)} y={0} width={innerW / data.length} height={H} fill="transparent" />
              <text x={p.x} y={H - 12} textAnchor="middle" style={{ fontSize: 11.5, fill: active ? INK : "#9aa1b3", fontWeight: active ? 700 : 500 }}>{data[i].label}</text>
            </g>
          ); })}
          {/* MoM % pills above each point (skip baseline month) */}
          {data.map((d, i) => { if (d.first) return null; const p = pts[i]; const rise = d.pct >= 0; return (
            <g key={`p${i}`} style={{ opacity: on ? 1 : 0, transition: `opacity 0.5s ease ${0.8 + i * 0.07}s` }}>
              <text x={p.x} y={p.y - 14} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: rise ? EMER : ROSE }}>{pctSign(d.pct)}</text>
            </g>
          ); })}
        </svg>
        {/* hovered month bubble */}
        {hov != null && data[hov] && (() => { const d = data[hov]; const p = pts[hov];
          return (<div className="absolute pointer-events-none" style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%`, transform: "translate(-50%,-150%)" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 12px 28px -10px rgba(60,50,40,0.4)", border: "1px solid #f0ece6" }}>
              <div className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{inrAbbr(d.value)}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: d.first ? SUBTLE : (d.pct >= 0 ? EMER : ROSE) }}>{d.first ? "baseline" : `${pctSign(d.pct)} MoM`}</div>
            </div></div>); })()}
        {/* big focal metric */}
        <div className="absolute top-0 left-0 flex items-center gap-2">
          <span className="text-[40px] font-bold tabular-nums leading-none tracking-tight" style={{ color: up ? EMER : ROSE }}>{pctSign(latestPct)}</span>
          <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${up ? EMER : ROSE}16`, color: up ? EMER : ROSE }}>{up ? <TbArrowUpRight size={20} /> : <TbArrowDownRight size={20} />}</span>
        </div>
        <div className="absolute left-0" style={{ top: 44 }}><span className="text-[11px]" style={{ color: SUBTLE }}>latest month · {inrAbbr(Math.abs(latestDelta))} change</span></div>
      </div>
    </div>
  );
}

// ── Compact stat tile ──
function Tile({ icon: Icon, label, value, sub, accent, delay }: any) {
  return (
    <div className="proc-card rounded-[22px] bg-white p-5 flex flex-col" style={{ boxShadow: SOFT_SH, animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}16`, color: accent }}><Icon size={17} /></span>
        <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{label}</span>
      </div>
      <div className="mt-3 text-[26px] font-bold tabular-nums leading-none tracking-tight" style={{ color: accent }}>{value}</div>
      <div className="mt-2 text-[11.5px]" style={{ color: SUBTLE }}>{sub}</div>
    </div>
  );
}

// ── Month-over-month diverging bars (vertical) ──
function VarianceBars({ timeline }: { timeline: any[] }) {
  const on = useMount(220);
  const deltas = timeline.filter((t) => !t.first);
  const maxAbs = Math.max(...deltas.map((d) => Math.abs(d.pct)), 1);
  return (
    <div className="rounded-[28px] bg-white p-6 lg:p-7" style={{ boxShadow: SOFT_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Month-over-month change</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>how much spend rose or fell each month</p></div>
        <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: "#6b7488" }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: EMER }} />Rise</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ROSE }} />Drop</span>
        </div>
      </div>
      <div className="flex items-stretch justify-around gap-3" style={{ height: 280 }}>
        {timeline.map((d, i) => {
          const up = d.pct >= 0; const col = up ? EMER : ROSE; const h = d.first ? 0 : (Math.abs(d.pct) / maxAbs) * 92;
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="flex-1 w-full flex flex-col justify-end items-center">
                {!d.first && up && <span className="text-[12.5px] font-bold tabular-nums mb-1.5" style={{ color: col }}>{pctSign(d.pct)}</span>}
                <div className="rounded-t-xl" style={{ width: 40, height: !d.first && up ? (on ? `${h}%` : "0%") : 0, background: `linear-gradient(180deg,${col},${col}bb)`, boxShadow: !d.first && up ? `0 8px 18px -8px ${col}` : "none", transition: `height 0.9s cubic-bezier(0.34,1.05,0.64,1) ${i * 80}ms` }} />
              </div>
              <div className="w-full" style={{ height: 2, background: "#e7e3dd" }} />
              <div className="flex-1 w-full flex flex-col items-center">
                <div className="rounded-b-xl" style={{ width: 40, height: !d.first && !up ? (on ? `${h}%` : "0%") : 0, background: `linear-gradient(0deg,${col},${col}bb)`, boxShadow: !d.first && !up ? `0 -8px 18px -8px ${col}` : "none", transition: `height 0.9s cubic-bezier(0.34,1.05,0.64,1) ${i * 80}ms` }} />
                {!d.first && !up && <span className="text-[12.5px] font-bold tabular-nums mt-1.5" style={{ color: col }}>{pctSign(d.pct)}</span>}
                {d.first && <span className="text-[11px] font-medium mt-1.5" style={{ color: "#aab2c2" }}>baseline</span>}
              </div>
              <span className="text-[12px] font-semibold mt-2" style={{ color: "#4b5468" }}>{d.label}</span>
              <span className="text-[10.5px] tabular-nums" style={{ color: "#aab1c0" }}>{inrAbbr(d.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "year", label: "Year" }, { field: "month", label: "Month" },
  { field: "purchase_value", label: "Spend", kind: "inr" as const }, { field: "prev_value", label: "Prev", kind: "inr" as const },
  { field: "variance_abs", label: "Δ Abs", kind: "inr" as const }, { field: "variance_pct", label: "Δ %", kind: "num" as const },
];

export default function VarianceDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/procurement-variance/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const tl = data?.timeline || [];
  const avg = Number(t.avg_spend ?? 0);

  return (
    <ProcShell title="Procurement variance" subtitle="how monthly spend shifts over time" region={region} bg={PAGE}>
      <DeviationChart timeline={tl} avg={avg} latestPct={Number(t.latest_pct ?? 0)} latestDelta={Number(t.latest_delta ?? 0)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile icon={TbWaveSine} label="Avg / month" value={inrAbbr(avg)} sub="6-month mean spend" accent={SLATE} delay={0} />
        <Tile icon={TbTrendingUp} label="Biggest rise" value={pctSign(Number(t.up_pct ?? 0))} sub={`in ${t.up_month ?? "—"}`} accent={EMER} delay={80} />
        <Tile icon={TbTrendingDown} label="Biggest drop" value={pctSign(Number(t.down_pct ?? 0))} sub={`in ${t.down_month ?? "—"}`} accent={ROSE} delay={160} />
        <Tile icon={TbActivity} label="Volatility" value={`${Number(t.volatility ?? 0).toFixed(1)}%`} sub="std. dev of MoM swings" accent="#e0992f" delay={240} />
      </div>

      <VarianceBars timeline={tl} />

      <TableCard title="Plant × month variance detail" sub="paginated · sortable · filterable · export CSV">
        <KpiTable kpiKey="procurement-variance" plant={region} columns={COLUMNS} />
      </TableCard>
    </ProcShell>
  );
}
