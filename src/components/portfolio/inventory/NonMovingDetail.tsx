"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbLock, TbSnowflake, TbStack2 } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
const MIST = "#F1EFEA";
const INK = "#38352f";
const RUST = "#b5794f", SLATE = "#7d8a8f";
const AGE_COL: Record<string, string> = { "≤90d": "#cdb892", "91–180d": "#caa170", "181–365d": "#c0834f", "365d+": "#a85f3a" };

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
const PANEL_SHADOW = "0 12px 34px -22px rgba(56,53,47,0.16), 0 2px 7px -4px rgba(56,53,47,0.05)";
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 120 + delay); return () => clearTimeout(t); }, [delay]); return on; };

// ── IMMERSIVE VAULT HERO — bronze gradient, blocked capital + glowing aging-depth bars ──
function VaultHero({ value, skus, reasons, aging }: { value: number; skus: number; reasons: any[]; aging: any[] }) {
  const on = useMount(0);
  const noC = reasons.find((r) => /consumption/i.test(r.reason)) || { value: 0 };
  const aged = reasons.find((r) => /aging/i.test(r.reason)) || { value: 0 };
  const fresh = aging.find((a) => a.label === "≤90d") || { value: 0 };
  const max = Math.max(...aging.map((a) => a.value), 1);
  return (
    <div className="relative rounded-[28px] overflow-hidden" style={{ minHeight: 300, background: "linear-gradient(125deg,#322d27 0%,#4b4136 48%,#6e5c45 100%)", boxShadow: "0 24px 60px -28px rgba(40,34,26,0.6)" }}>
      {/* dot-grid + orbs */}
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 240, height: 240, background: "#c0834f", opacity: 0.2, top: -80, right: 150 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 180, height: 180, background: "#7d8a8f", opacity: 0.12, bottom: -60, left: 280 }} />
      <div className="relative flex flex-col lg:flex-row" style={{ minHeight: 300 }}>
        <div className="p-7 lg:p-9 lg:w-[420px] flex-shrink-0 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}><TbLock size={14} />Blocked capital</div>
          <div className="mt-3 text-[54px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.3)" }}><CountUp value={value} format={inrAbbr} /></div>
          <div className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>dormant value · {skus.toLocaleString("en-IN")} SKUs · 78% of stock lines</div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full" style={{ background: "rgba(125,138,143,0.18)", border: "1px solid rgba(125,138,143,0.32)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#aab6ba" }} /><span className="text-[12px]" style={{ color: "rgba(255,255,255,0.82)" }}>No consumption</span><span className="text-[13px] font-bold tabular-nums" style={{ color: "#c9d2d5" }}>{inrAbbr(noC.value)}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full" style={{ background: "rgba(192,131,79,0.2)", border: "1px solid rgba(192,131,79,0.36)", boxShadow: "0 0 22px -7px rgba(192,131,79,0.6)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#d9a36e" }} /><span className="text-[12px]" style={{ color: "rgba(255,255,255,0.82)" }}>Aged &gt;180d</span><span className="text-[13px] font-bold tabular-nums" style={{ color: "#e6bd92" }}>{inrAbbr(aged.value)}</span>
            </div>
          </div>
        </div>
        {/* glowing aging-depth bars */}
        <div className="flex-1 p-7 lg:py-8 lg:pr-10 flex flex-col justify-center min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>Blocked value by age — most is fresh, never used</span>
          </div>
          <div className="flex items-end gap-3 sm:gap-5" style={{ height: 150 }}>
            {aging.map((a, i) => (
              <div key={a.label} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[12px] font-bold tabular-nums mb-1.5" style={{ color: "#fff", opacity: on ? 1 : 0, transition: "opacity 0.5s ease 0.7s" }}>{inrAbbr(a.value)}</span>
                <div className="w-full rounded-t-lg" style={{ height: on ? `${Math.max(6, (a.value / max) * 100)}%` : "0%", background: `linear-gradient(180deg, ${AGE_COL[a.label]}, ${AGE_COL[a.label]}aa)`, boxShadow: `0 0 24px -4px ${AGE_COL[a.label]}`, transition: `height 0.9s cubic-bezier(0.34,1.1,0.64,1) ${i * 80}ms` }} />
                <span className="text-[10px] font-medium mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>{a.label.replace("–", "-")}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full" style={{ background: "rgba(173,182,186,0.16)" }}>
            <TbSnowflake size={13} style={{ color: "#c9d2d5" }} /><span className="text-[11px]" style={{ color: "rgba(255,255,255,0.8)" }}><b style={{ color: "#fff" }}>{inrAbbr(fresh.value)}</b> is ≤90 days — received but never consumed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Blocked capital by category (clean card) ──
function BlockedByCategory({ cats, region }: { cats: any[]; region: string }) {
  const on = useMount(120); const max = Math.max(...cats.map((c) => c.value), 1);
  const catName = (g: string) => String(g).replace(/^M\d+-/, "");
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: "200ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbStack2 size={16} style={{ color: RUST }} />Blocked capital by category</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">where the dormant value sits · {region}</p>
      <div className="space-y-2.5 flex-1">
        {cats.slice(0, 10).map((c, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-gray-700 truncate flex-shrink-0" style={{ width: 150 }} title={catName(c.name)}>{catName(c.name)}</span>
            <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "#ece9e3" }}>
              <div className="h-full rounded-md" style={{ width: on ? `${(c.value / max) * 100}%` : "0%", background: "linear-gradient(90deg,#caa170,#a85f3a)", transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 45}ms` }} />
            </div>
            <span className="text-[12px] font-semibold tabular-nums flex-shrink-0 w-16 text-right" style={{ color: INK }}>{inrAbbr(c.value)}</span>
            <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0 w-14 text-right hidden sm:block">{c.skus.toLocaleString("en-IN")} SKUs</span>
          </div>
        ))}
        {!cats.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "material_group", label: "Category" }, { field: "closing_stock_quantity", label: "Qty", kind: "num" as const },
  { field: "closing_stock_value", label: "Value", kind: "inr" as const }, { field: "aging_days", label: "Aging", kind: "num" as const },
  { field: "reason", label: "Reason" },
];

export default function NonMovingDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/non-moving-inventory/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  const t = data?.totals || {};

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-4 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Non-Moving Inventory" />

      <div className="csv-cards"><div className="csv-card" style={{ animationDelay: "0ms" }}>
        <VaultHero value={Number(t.blocked_value ?? 0)} skus={Number(t.blocked_skus ?? 0)} reasons={data?.reasons || []} aging={data?.aging || []} />
      </div></div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; min-width: 0; }
      `}</style>

      <BlockedByCategory cats={data?.categories || []} region={region} />

      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "320ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">Non-moving SKU detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="non-moving-inventory" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
