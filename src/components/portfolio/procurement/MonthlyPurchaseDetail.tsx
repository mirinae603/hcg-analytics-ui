"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, catName, useMount, smoothPath, CountUp } from "@/components/portfolio/kit";
import { ProcShell, TableCard, Panel, INK, SUBTLE } from "./parts";
import { TbReceipt, TbPill, TbGridDots, TbCalendarStats, TbCrown, TbChevronUp, TbChevronDown, TbChevronRight } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// ── Soft, light, soothing identity (Halo-Lab inspired) ──
const PAGE = "#F1F2FA";
const SOFT_SH = "0 18px 40px -26px rgba(60,60,110,0.28), 0 3px 10px -6px rgba(60,60,110,0.06)";
const LINE_COLORS = ["#6366f1", "#fb7185", "#2dd4bf", "#f59e0b"]; // indigo, rose, teal, amber (SKU bars)
const cellFmt = (v: number) => v >= 1e7 ? `₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(0)}L` : v >= 1e3 ? `₹${Math.round(v / 1e3)}K` : `₹${Math.round(v)}`;

// ── Vibrant gradient stat card (like the reference's task cards) ──
function PastelCard({ label, value, format, sub, grad, icon: Icon, ring, delay }: any) {
  return (
    <div className="proc-card relative rounded-[28px] p-6 flex flex-col justify-between overflow-hidden" style={{ minHeight: 172, background: grad, boxShadow: "0 22px 44px -26px rgba(70,70,130,0.42), 0 4px 12px -8px rgba(70,70,130,0.1)", animationDelay: `${delay}ms` }}>
      <div className="absolute rounded-full blur-2xl" style={{ width: 130, height: 130, background: "rgba(255,255,255,0.45)", top: -50, right: -30 }} />
      <div className="relative flex items-start justify-between">
        <span className="text-[13.5px] font-semibold" style={{ color: "#3a3f55" }}>{label}</span>
        <span className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.6)", color: ring, boxShadow: "0 6px 14px -8px rgba(70,70,130,0.4)" }}><Icon size={18} /></span>
      </div>
      <div className="relative">
        <div className="text-[38px] font-bold tabular-nums leading-none tracking-tight" style={{ color: "#272c42" }}><CountUp value={value} format={format} /></div>
        <div className="text-[12px] mt-2.5" style={{ color: "#5a6080" }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Halo-Lab "Focusing" chart, faithfully recreated: two soft lines, a vertical
//    month strip, a range pill, a 2-line tooltip with a hollow node, square legend
//    bottom-left and a big focal % bottom-right. ──
const FOCUS_COLORS = ["#fb7185", "#a5b4fc"]; // coral, periwinkle (reference palette)
function TrendLines({ matrix, metric, metricLabel }: { matrix: any; metric: number; metricLabel: string }) {
  const on = useMount(160); const [hov, setHov] = useState<number | null>(null);
  const labels: string[] = matrix?.labels || []; const rows = (matrix?.rows || []).slice(0, 2);
  if (!labels.length || rows.length < 2) return null;
  const W = 780, H = 300, PADX = 18, PADT = 26, PADB = 22;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const X = (i: number) => labels.length <= 1 ? W / 2 : PADX + (i / (labels.length - 1)) * innerW;
  const norm = rows.map((r: any) => { const mn = Math.min(...r.values), mx = Math.max(...r.values); const rng = (mx - mn) || 1; return r.values.map((v: number) => (v - mn) / rng); });
  const U = (u: number) => PADT + innerH - (0.14 + 0.72 * u) * innerH;
  const lead = rows[0]; const peakIdx = lead.values.indexOf(Math.max(...lead.values));
  const colTot = labels.map((_, j) => rows.reduce((s: number, r: any) => s + (r.values[j] || 0), 0));
  const hiIdx = colTot.indexOf(Math.max(...colTot));
  return (
    <div className="rounded-[28px] bg-white p-6 lg:p-7" style={{ boxShadow: SOFT_SH }}>
      <div className="flex items-start justify-between gap-2">
        <div><h3 className="text-[18px] font-bold tracking-tight" style={{ color: INK }}>Purchase trend</h3>
          <p className="text-[12.5px] mt-0.5" style={{ color: SUBTLE }}>monthly rhythm by category</p></div>
        <button className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium bg-white" style={{ color: "#4b5468", boxShadow: "0 4px 14px -8px rgba(60,60,110,0.35)", border: "1px solid #eef0f8" }}>
          <span style={{ color: "#9aa1b3" }}>Range:</span> 6-month window <TbChevronDown size={14} style={{ color: "#9aa1b3" }} />
        </button>
      </div>

      <div className="flex mt-3" style={{ height: H }}>
        {/* vertical month strip */}
        <div className="flex flex-col items-center flex-shrink-0 pr-3" style={{ width: 58 }}>
          <TbChevronUp size={16} style={{ color: "#c4c7d8" }} />
          <div className="flex-1 w-full flex flex-col items-center justify-around py-2">
            {labels.map((l, i) => i === hiIdx
              ? <span key={i} className="px-2.5 py-1 rounded-full text-[12px] font-semibold text-white" style={{ background: "#6366f1", boxShadow: "0 6px 14px -6px rgba(99,102,241,0.7)" }}>{l}</span>
              : <span key={i} className="text-[12.5px] font-medium" style={{ color: "#aab0c2" }}>{l}</span>)}
          </div>
          <TbChevronDown size={16} style={{ color: "#c4c7d8" }} />
        </div>

        {/* chart */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-0 rounded-2xl" style={{ backgroundImage: "radial-gradient(#d7dae9 1.3px, transparent 1.3px)", backgroundSize: "16px 16px", opacity: 0.9, maskImage: "radial-gradient(ellipse 90% 80% at 50% 50%, #000 60%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 50%, #000 60%, transparent 100%)" }} />
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", position: "relative", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
            {rows.map((r: any, k: number) => {
              const d = smoothPath(norm[k].map((u: number, i: number) => ({ x: X(i), y: U(u) })));
              return <path key={k} d={d} fill="none" stroke={FOCUS_COLORS[k]} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1) ${k * 0.15}s`, filter: `drop-shadow(0 6px 12px ${FOCUS_COLORS[k]}55)` }} />;
            })}
            {hov == null && peakIdx >= 0 && <circle cx={X(peakIdx)} cy={U(norm[0][peakIdx])} r="6" fill="#fff" stroke={FOCUS_COLORS[0]} strokeWidth="3" style={{ opacity: on ? 1 : 0, transition: "opacity 0.5s ease 0.9s", filter: `drop-shadow(0 3px 7px ${FOCUS_COLORS[0]}66)` }} />}
            {labels.map((l, i) => { const active = hov === i; return (
              <g key={i} onMouseEnter={() => setHov(i)}>
                {active && <line x1={X(i)} y1={PADT - 4} x2={X(i)} y2={PADT + innerH} stroke="#d2d6e8" strokeWidth="1.5" strokeDasharray="3 4" />}
                {active && rows.map((r: any, k: number) => <circle key={k} cx={X(i)} cy={U(norm[k][i])} r="5.5" fill="#fff" stroke={FOCUS_COLORS[k]} strokeWidth="3" style={{ filter: `drop-shadow(0 3px 7px ${FOCUS_COLORS[k]}66)` }} />)}
                <rect x={X(i) - innerW / (labels.length * 2)} y={0} width={innerW / labels.length} height={H} fill="transparent" />
              </g>
            ); })}
          </svg>

          {/* 2-line tooltip bubble */}
          {(() => {
            const i = hov ?? peakIdx; if (i < 0) return null;
            const leftPct = Math.min(Math.max((X(i) / W) * 100, 12), 88); const topPct = (U(norm[0][i]) / H) * 100;
            return (
              <div className="absolute pointer-events-none z-10" style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: "translate(-50%,-145%)", transition: "left 0.2s ease, top 0.2s ease" }}>
                <div className="px-4 py-2.5 rounded-2xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 16px 36px -12px rgba(60,60,110,0.45)", border: "1px solid #eef0f8" }}>
                  <div className="text-[13.5px] font-bold leading-none" style={{ color: INK }}>{labels[i]}</div>
                  <div className="text-[11px] mt-1 tabular-nums" style={{ color: "#9aa1b3" }}>{inrAbbr(lead.values[i])}</div>
                </div>
              </div>
            );
          })()}

          {/* legend bottom-left */}
          <div className="absolute left-1 bottom-1 flex flex-col gap-1.5">
            {rows.map((r: any, k: number) => <span key={k} className="inline-flex items-center gap-2 text-[11.5px] font-medium" style={{ color: "#6b7088" }}><span className="w-3 h-3 rounded-[5px]" style={{ background: FOCUS_COLORS[k] }} />{catName(r.name).slice(0, 18)}</span>)}
          </div>

          {/* big focal metric bottom-right */}
          <div className="absolute right-1 bottom-0 text-right">
            <div className="text-[40px] font-bold tabular-nums leading-none tracking-tight" style={{ color: INK }}>{Math.round(metric)}%</div>
            <div className="text-[11px] mt-1" style={{ color: "#9aa1b3" }}>{metricLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Category breakdown sidebar (Halo-Lab "Developed areas" style) ──
const RANK_COLORS = ["#6366f1", "#fb7185", "#2dd4bf", "#f59e0b", "#a855f7", "#0ea5e9"];
function CategoryRankPanel({ groups, matrix, total }: { groups: any[]; matrix: any; total: number }) {
  const on = useMount(220);
  const items = groups.slice(0, 6);
  const max = items[0]?.value || 1;
  const byName: Record<string, number[]> = {}; (matrix?.rows || []).forEach((r: any) => { byName[r.name] = r.values; });
  return (
    <div className="rounded-[28px] bg-white p-6 lg:p-7 flex flex-col flex-1" style={{ boxShadow: SOFT_SH }}>
      <h3 className="text-[18px] font-bold tracking-tight" style={{ color: INK }}>Category breakdown</h3>
      <p className="text-[12.5px] mt-0.5 mb-5" style={{ color: SUBTLE }}>share of spend · monthly trend</p>
      <div className="flex-1 flex flex-col justify-between gap-4">
        {items.map((g: any, i: number) => {
          const share = total ? (g.value / total) * 100 : 0; const w = Math.max((g.value / max) * 100, 4);
          const vals = byName[g.name] || []; const up = vals.length >= 2 ? vals[vals.length - 1] >= vals[vals.length - 2] : true;
          const col = RANK_COLORS[i % RANK_COLORS.length];
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-medium truncate pr-2" style={{ color: "#3c465c" }} title={catName(g.name)}>{catName(g.name)}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[12.5px] font-bold tabular-nums" style={{ color: INK }}>{share.toFixed(1)}%</span>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: up ? "#dcfce7" : "#fee2e2", color: up ? "#16a34a" : "#ef4444" }}>{up ? <TbChevronUp size={12} /> : <TbChevronDown size={12} />}</span>
                </div>
              </div>
              <div className="h-2 rounded-full" style={{ background: "#eef0f8" }}><div className="h-full rounded-full" style={{ width: on ? `${w}%` : "0%", background: `linear-gradient(90deg,${col}cc,${col})`, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Category × month heatmap (soft indigo) ──
function Heatmap({ matrix }: { matrix: any }) {
  const on = useMount(180); const [hov, setHov] = useState<[number, number] | null>(null);
  const labels: string[] = matrix?.labels || []; const rows: any[] = matrix?.rows || [];
  if (!rows.length) return null;
  const maxCell = Math.max(...rows.flatMap((r) => r.values), 1);
  const cols = `minmax(150px,1.5fr) repeat(${labels.length}, minmax(0,1fr)) 78px`;
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: SOFT_SH }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbGridDots size={16} style={{ color: "#6366f1" }} />Category × month heatmap</h3>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{rows.length} categories</span>
      </div>
      <p className="text-[12px] mb-4" style={{ color: SUBTLE }}>monthly purchase value by category · darker = more spend</p>
      <div className="overflow-x-auto"><div style={{ minWidth: 660 }}>
        <div className="grid items-center gap-1.5 mb-1.5" style={{ gridTemplateColumns: cols }}>
          <span />{labels.map((l) => <span key={l} className="text-[11px] font-semibold text-center" style={{ color: "#9aa1b3" }}>{l}</span>)}
          <span className="text-[11px] font-semibold text-right pr-1" style={{ color: "#9aa1b3" }}>Total</span>
        </div>
        {rows.map((r, ri) => (
          <div key={ri} className="grid items-center gap-1.5 mb-1.5" style={{ gridTemplateColumns: cols }} onMouseLeave={() => setHov((h) => (h && h[0] === ri ? null : h))}>
            <span className="text-[12px] font-medium truncate pr-2" style={{ color: "#4b5468" }} title={catName(r.name)}>{catName(r.name)}</span>
            {r.values.map((v: number, ci: number) => { const ratio = v / maxCell; const active = hov && hov[0] === ri && hov[1] === ci;
              return <div key={ci} onMouseEnter={() => setHov([ri, ci])} className="relative h-11 rounded-lg flex items-center justify-center cursor-default transition-all duration-300"
                style={{ background: `rgba(99,102,241,${(0.05 + 0.85 * Math.sqrt(ratio)) * (on ? 1 : 0)})`, transform: active ? "scale(1.06)" : "scale(1)", outline: active ? "2px solid #6366f1" : "none", zIndex: active ? 5 : 1 }}>
                <span className="text-[10.5px] font-bold tabular-nums" style={{ color: ratio > 0.45 ? "#fff" : "#4338ca", opacity: on ? 1 : 0, transition: "opacity 0.6s ease 0.3s" }}>{cellFmt(v)}</span>
              </div>;
            })}
            <span className="text-[12px] font-bold tabular-nums text-right pr-1" style={{ color: INK }}>{inrAbbr(r.total)}</span>
          </div>
        ))}
      </div></div>
    </div>
  );
}

// ── Top SKUs leaderboard ──
function SkuBars({ rows }: { rows: any[] }) {
  const on = useMount(160); const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="rounded-[26px] bg-white p-6 flex flex-col" style={{ boxShadow: SOFT_SH }}>
      <h3 className="text-[16px] font-semibold" style={{ color: INK }}>Top SKUs by spend</h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: SUBTLE }}>largest single-material purchases</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map((r, i) => { const w = Math.max((r.value / max) * 100, 4); const col = LINE_COLORS[i % LINE_COLORS.length]; return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 tabular-nums" style={{ background: `${col}1c`, color: col }}>{i + 1}</span>
                <span className="text-[12.5px] font-medium truncate" style={{ color: "#3c465c" }} title={r.desc}>{r.desc}</span>
              </div>
              <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{inrAbbr(r.value)}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "#eef0f8" }}><div className="h-full rounded-full" style={{ width: on ? `${w}%` : "0%", background: `linear-gradient(90deg,${col}bb,${col})`, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms` }} /></div>
          </div>
        ); })}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "month", label: "Month" }, { field: "plant", label: "Hospital" }, { field: "material", label: "Material" },
  { field: "material_desc", label: "Description" }, { field: "material_group", label: "Category" },
  { field: "monthly_purchase_value", label: "Spend", kind: "inr" as const }, { field: "purchase_qty", label: "Qty", kind: "num" as const },
];

export default function MonthlyPurchaseDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/monthly-purchase-value/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const total = Number(t.total ?? 0), avg = Number(t.avg ?? 0), skus = Number(t.skus ?? 0);
  const groups = data?.groups || [];
  const topGroupVal = Number(groups[0]?.value ?? 0);

  return (
    <ProcShell title="Monthly SKU purchase" subtitle="what you buy each month, by category & SKU" region={region} bg={PAGE}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PastelCard label="Total purchased" value={total} format={inrAbbr} sub="across the 6-month window" delay={0}
          grad="linear-gradient(135deg,#c9d2ff 0%,#e0d4fb 52%,#fbd0e8 100%)" icon={TbReceipt} ring="#6d5ef0" />
        <PastelCard label="Avg / month" value={avg} format={inrAbbr} sub="mean monthly purchasing" delay={80}
          grad="linear-gradient(135deg,#b9e6fd 0%,#a8f0e7 100%)" icon={TbCalendarStats} ring="#0e9ad6" />
        <PastelCard label="Top category" value={topGroupVal} format={inrAbbr} sub={catName(String(t.top_group ?? "—")).slice(0, 22)} delay={160}
          grad="linear-gradient(135deg,#fec9d2 0%,#fdd9b0 52%,#e4d4fb 100%)" icon={TbCrown} ring="#ec4899" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 flex flex-col min-w-0"><TrendLines matrix={data?.matrix} metric={total ? (topGroupVal / total) * 100 : 0} metricLabel={`${catName(String(t.top_group ?? "—")).slice(0, 16)} of spend`} /></div>
        <div className="xl:col-span-4 flex flex-col min-w-0"><CategoryRankPanel groups={groups} matrix={data?.matrix} total={total} /></div>
      </div>

      <Heatmap matrix={data?.matrix} />

      <SkuBars rows={data?.top_skus || []} />

      <TableCard title="Material × month purchase detail" sub="paginated · sortable · filterable · export CSV">
        <KpiTable kpiKey="monthly-purchase-value" plant={region} columns={COLUMNS} />
      </TableCard>
    </ProcShell>
  );
}
