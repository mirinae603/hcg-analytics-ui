"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbAlertOctagon, TbGridDots } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
const MIST = "#F3EEED";
const INK = "#2e2526";
const HIGH = "#d65f54", MED = "#dca85e", LOW = "#5fb796";

const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
const numAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`; if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`; return `${Math.round(v)}`; };
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
const PANEL_SHADOW = "0 12px 34px -22px rgba(46,37,38,0.16), 0 2px 7px -4px rgba(46,37,38,0.05)";
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 120 + delay); return () => clearTimeout(t); }, [delay]); return on; };
function riskColor(r: number) {
  const stops = [[95, 183, 150], [220, 168, 94], [214, 95, 84]];
  const x = Math.max(0, Math.min(1, r)) * 2; const i = Math.min(1, Math.floor(x)); const f = x - i;
  const a = stops[i], b = stops[i + 1] || stops[i];
  return `rgb(${a.map((s, k) => Math.round(s + (b[k] - s) * f)).join(",")})`;
}

// ── IMMERSIVE COMMAND HERO — crimson gradient, high-risk headline + glowing driver bars ──
function CommandHero({ tiers, factors, totalValue, totalSkus }: { tiers: any[]; factors: any[]; totalValue: number; totalSkus: number }) {
  const on = useMount(0);
  const high = tiers.find((t) => t.level === "High") || { count: 0, value: 0 };
  const tot = tiers.reduce((s, t) => s + t.value, 0) || 1;
  const fmax = Math.max(...factors.map((f) => f.count), 1);
  const fcol = [HIGH, "#dca85e", "#d8825e"];
  return (
    <div className="relative rounded-[28px] overflow-hidden" style={{ minHeight: 300, background: "linear-gradient(125deg,#211819 0%,#3a2320 45%,#592b25 100%)", boxShadow: "0 24px 60px -28px rgba(40,20,18,0.7)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 260, height: 260, background: "#e0584a", opacity: 0.18, top: -90, right: 120 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 180, height: 180, background: "#dca85e", opacity: 0.1, bottom: -50, left: 320 }} />
      <div className="relative flex flex-col lg:flex-row" style={{ minHeight: 300 }}>
        <div className="p-7 lg:p-9 lg:w-[420px] flex-shrink-0 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}><TbAlertOctagon size={14} />High-risk exposure</div>
          <div className="mt-3 text-[54px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 28px rgba(214,95,84,0.4)" }}><CountUp value={high.value} format={inrAbbr} /></div>
          <div className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>{high.count.toLocaleString("en-IN")} SKUs flagged · {Math.round((high.value / tot) * 100)}% of inventory value</div>
          {/* tier strip */}
          <div className="mt-6">
            <div className="flex h-3 rounded-full overflow-hidden" style={{ boxShadow: "0 0 18px -4px rgba(214,95,84,0.6)" }}>
              {tiers.map((t) => { const c = t.level === "High" ? HIGH : t.level === "Medium" ? MED : LOW; return <div key={t.level} title={`${t.level}: ${inrAbbr(t.value)}`} style={{ width: on ? `${(t.value / tot) * 100}%` : "0%", background: c, transition: "width 1s ease" }} />; })}
            </div>
            <div className="flex gap-4 mt-2.5">
              {tiers.map((t) => { const c = t.level === "High" ? HIGH : t.level === "Medium" ? MED : LOW; return (
                <span key={t.level} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.72)" }}><span className="w-2 h-2 rounded-sm" style={{ background: c }} />{t.level} {inrAbbr(t.value)}</span>
              ); })}
            </div>
          </div>
        </div>
        {/* glowing driver bars */}
        <div className="flex-1 p-7 lg:py-8 lg:pr-10 flex flex-col justify-center min-w-0">
          <div className="text-[12px] font-medium mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>What flags a SKU high-risk</div>
          <div className="space-y-4">
            {factors.map((f, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12.5px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{f.label}</span>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: "#fff" }}>{numAbbr(f.count)}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: on ? `${(f.count / fmax) * 100}%` : "0%", background: `linear-gradient(90deg,${fcol[i]}cc,${fcol[i]})`, boxShadow: `0 0 18px -3px ${fcol[i]}`, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Risk matrix (light) ──
function RiskMatrix({ data, region }: { data: any; region: string }) {
  const [hov, setHov] = useState<{ r: number; c: number } | null>(null);
  const arows: string[] = data?.arows || []; const ecols: string[] = data?.ecols || []; const matrix: number[][] = data?.matrix || [];
  const max = Math.max(...matrix.flat(), 1);
  const expUrg = [1, 0.82, 0.42, 0.12, 0.25]; const ageUrg = [0.12, 0.3, 0.5, 0.7, 0.9];
  const cellRisk = (r: number, c: number) => Math.max(expUrg[c] ?? 0.2, (ageUrg[r] ?? 0.5) * 0.7);
  const hd = hov ? { a: arows[hov.r], e: ecols[hov.c], v: matrix[hov.r][hov.c] } : null;
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "180ms", boxShadow: PANEL_SHADOW }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbGridDots size={16} style={{ color: HIGH }} />Risk matrix</h3>
          <p className="text-xs text-gray-400 mt-0.5">stock value by inventory age × time to expiry · {region}</p>
        </div>
        <div className="text-[11px] font-medium min-h-[18px]" style={{ color: hd ? INK : "#9a8e8e" }}>
          {hd ? <span>aged <b>{hd.a}</b> · expiry <b>{hd.e}</b> — {inrAbbr(hd.v)}</span>
            : <span className="inline-flex items-center gap-1.5">low <span className="w-16 h-2 rounded-full inline-block" style={{ background: "linear-gradient(90deg,#5fb796,#dca85e,#d65f54)" }} /> high risk</span>}
        </div>
      </div>
      {matrix.length ? (
        <div className="mt-4 overflow-x-auto"><div style={{ minWidth: 560 }}>
          <div className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: "92px repeat(5,1fr)" }}>
            <span className="text-[10px] font-semibold self-end text-gray-400">age ＼ expiry</span>
            {ecols.map((e) => <span key={e} className="text-[10.5px] font-semibold text-center text-gray-400">{e}</span>)}
          </div>
          {arows.map((a, r) => (
            <div key={a} className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: "92px repeat(5,1fr)" }} onMouseLeave={() => setHov((h) => (h && h.r === r ? null : h))}>
              <span className="text-[11px] font-medium self-center" style={{ color: hov?.r === r ? INK : "#9a8e8e" }}>{a}d</span>
              {ecols.map((e, c) => {
                const v = matrix[r][c]; const intensity = Math.sqrt(v / max); const active = hov?.r === r && hov?.c === c;
                return (
                  <div key={c} onMouseEnter={() => setHov({ r, c })} className="h-10 rounded-lg flex items-center justify-center cursor-default transition-all"
                    style={{ background: riskColor(cellRisk(r, c)), opacity: active ? 1 : 0.12 + 0.82 * intensity, transform: active ? "scale(1.08)" : "scale(1)", outline: active ? `2px solid ${INK}` : "none", zIndex: active ? 5 : 1 }}>
                    {intensity > 0.4 && <span className="text-[10px] font-bold tabular-nums" style={{ color: "#fff" }}>{numAbbr(v)}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div></div>
      ) : <div className="py-16 text-center text-gray-400 text-sm">No data.</div>}
    </div>
  );
}

function HighRiskCategories({ cats, region }: { cats: any[]; region: string }) {
  const on = useMount(160); const max = Math.max(...cats.map((c) => c.value), 1);
  const catName = (g: string) => String(g).replace(/^M\d+-/, "");
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: "240ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbAlertOctagon size={16} style={{ color: HIGH }} />High-risk categories</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">value flagged high-risk · {region}</p>
      <div className="space-y-2.5 flex-1">
        {cats.slice(0, 8).map((c, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1"><span className="text-[12px] font-medium text-gray-700 truncate pr-2" title={catName(c.name)}>{catName(c.name)}</span><span className="text-[11px] font-semibold tabular-nums flex-shrink-0" style={{ color: HIGH }}>{inrAbbr(c.value)}</span></div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f0e6e4" }}><div className="h-full rounded-full" style={{ width: on ? `${(c.value / max) * 100}%` : "0%", background: "linear-gradient(90deg,#dca85e,#d65f54)", transition: `width 0.9s ease ${i * 50}ms` }} /></div>
          </div>
        ))}
        {!cats.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "risk_level", label: "Risk" }, { field: "aging_days", label: "Aging", kind: "num" as const },
  { field: "days_to_expiry", label: "Days to Expiry", kind: "num" as const }, { field: "closing_stock_value", label: "Value", kind: "inr" as const },
];

export default function RiskDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/inventory-risk/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  const t = data?.totals || {};
  const tiers: any[] = data?.tiers || [];

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-4 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Inventory Risk Classification" />

      <div className="csv-cards"><div className="csv-card" style={{ animationDelay: "0ms" }}>
        <CommandHero tiers={tiers} factors={data?.factors || []} totalValue={Number(t.total_value ?? 0)} totalSkus={Number(t.total_skus ?? 0)} />
      </div></div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; min-width: 0; }
      `}</style>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8"><RiskMatrix data={data} region={region} /></div>
        <div className="xl:col-span-4"><HighRiskCategories cats={data?.categories || []} region={region} /></div>
      </div>

      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "340ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">Risk register · SKU detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="inventory-risk" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
