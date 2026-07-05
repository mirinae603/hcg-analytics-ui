"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbCalendarStats, TbAlertTriangle, TbStack3, TbZzz, TbChartHistogram, TbReload, TbAnchor } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
// ── "Horizon / runway" palette — cool indigo-slate. Distinct from the warm
//    Stock-Value page and the sage Aging page. Coverage is a DIVERGING story:
//    too little (warm danger) → just right (green) → too much (cool indigo) → idle. ──
const MIST = "#EEF1F7";
const INDIGO = "#5d6cab";
const INK = "#2c3242";
const SUBTLE = "#7b8298";
const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
const numAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`; if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`; return `${Math.round(v)}`; };
const dayLabel = (d: number) => (d >= 1000 ? `${(d / 1000).toFixed(1)}k` : `${Math.round(d)}`);
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (n: number) => { const p = Math.min((n - start) / 1000, 1); setV(value * easeOut(p)); if (p < 1) raf = requestAnimationFrame(tick); else setV(value); };
    raf = requestAnimationFrame(tick);
    const g = setTimeout(() => setV(value), 1100);
    return () => { cancelAnimationFrame(raf); clearTimeout(g); };
  }, [value]);
  return <>{format(v)}</>;
}
const CARD_SHADOW = "0 14px 38px -20px rgba(40,46,66,0.22), 0 2px 8px -4px rgba(40,46,66,0.06)";
const PANEL_SHADOW = "0 12px 34px -22px rgba(40,46,66,0.16), 0 2px 7px -4px rgba(40,46,66,0.05)";
const CARD_MIN = 256;
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 150 + delay); return () => clearTimeout(t); }, [delay]); return on; };

// ── Diverging coverage scale: stockout (warm) → healthy (green) → overstock (indigo) → idle (slate) ──
const BANDS = [
  { key: "critical", bar: "#d98a7d", rgb: [217, 138, 125], label: "< 15 days", short: "<15d", grad: "linear-gradient(180deg,#e3a89e,#d98a7d)" },
  { key: "low", bar: "#e3b277", rgb: [227, 178, 119], label: "15–30 days", short: "15–30d", grad: "linear-gradient(180deg,#ecc79a,#e3b277)" },
  { key: "healthy", bar: "#7cbf9c", rgb: [124, 191, 156], label: "30–90 days", short: "30–90d", grad: "linear-gradient(180deg,#9fd1b6,#7cbf9c)" },
  { key: "ample", bar: "#86b3d6", rgb: [134, 179, 214], label: "90–180 days", short: "90–180d", grad: "linear-gradient(180deg,#a6c8e3,#86b3d6)" },
  { key: "excess", bar: "#8e93cc", rgb: [142, 147, 204], label: "180–365 days", short: "180–365d", grad: "linear-gradient(180deg,#aab0dd,#8e93cc)" },
  { key: "overstock", bar: "#6f76b3", rgb: [111, 118, 179], label: "365+ days", short: "365d+", grad: "linear-gradient(180deg,#9097c9,#6f76b3)" },
];
const IDLE = { key: "nonmoving", bar: "#aab2bf", rgb: [170, 178, 191], label: "No movement", short: "idle" };
const bandOf = (k: string) => [...BANDS, IDLE].find((b) => b.key === k) || BANDS[0];
const SPECTRUM = "linear-gradient(90deg,#d98a7d,#e3b277 22%,#7cbf9c 44%,#86b3d6 66%,#8e93cc 84%,#6f76b3 100%)";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-white flex flex-col transition-all duration-300 hover:-translate-y-1" style={{ minHeight: CARD_MIN, boxShadow: CARD_SHADOW }}>
      <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: SPECTRUM, opacity: 0.85 }} />
      <div className="p-5 flex flex-col flex-1">{children}</div>
    </div>
  );
}
function Head({ icon: Icon, label, badge, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}16`, color }}><Icon size={16} /></span>
        <span className="text-[12px] font-semibold uppercase tracking-wide truncate" style={{ color: SUBTLE, letterSpacing: "0.04em" }}>{label}</span>
      </div>
      {badge && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${color}14`, color }}>{badge}</span>}
    </div>
  );
}
function Chip({ text, color }: { text: string; color: string }) {
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${color}15`, color }}>{text}</span>;
}

// CARD 1 — Median cover on a runway with the 30–90 healthy target band
function CoverHeroCard({ median, movingSkus }: { median: number; movingSkus: number }) {
  const on = useMount(0);
  const cap = 365;
  const pos = Math.min(100, (Math.min(median, cap) / cap) * 100);
  const hz0 = (30 / cap) * 100, hz1 = (90 / cap) * 100;
  const state = median < 30 ? { t: "below target", c: "#cf7e6f" } : median <= 90 ? { t: "on target", c: "#5fa886" } : { t: "above target", c: "#6f76b3" };
  return (
    <Card>
      <Head icon={TbCalendarStats} label="Median cover" badge="moving SKUs" color={INDIGO} />
      <div className="mt-4 flex items-end gap-1.5">
        <span className="text-[40px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={median} format={(n) => `${Math.round(n)}`} /></span>
        <span className="text-[15px] font-semibold mb-1 text-gray-400">days of cover</span>
      </div>
      <div className="mt-1.5 text-[12px] text-gray-400">across {movingSkus.toLocaleString("en-IN")} SKUs that move</div>
      <div className="mt-auto pt-8">
        <div className="relative">
          <div className="absolute -top-6 z-10 flex flex-col items-center" style={{ left: `${on ? pos : 0}%`, transform: "translateX(-50%)", transition: "left 1.3s cubic-bezier(0.34,1.12,0.64,1)" }}>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white tabular-nums shadow-sm" style={{ background: INK }}>{Math.round(median)}d</span>
            <span className="w-0 h-0" style={{ borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `5px solid ${INK}` }} />
          </div>
          {/* runway track with healthy band */}
          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "#e6e9f2" }}>
            <div className="absolute inset-y-0" style={{ left: `${hz0}%`, width: `${hz1 - hz0}%`, background: "#7cbf9c", opacity: 0.55 }} />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-gray-400 font-medium"><span>0</span><span style={{ marginLeft: `${hz0 - 4}%`, color: "#5fa886" }}>30–90 target</span><span>365+</span></div>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">vs 30–90 day target</span>
          <Chip text={state.t} color={state.c} />
        </div>
      </div>
    </Card>
  );
}

// CARD 2 — Stockout risk (value + count of SKUs < 30 days), with the urgency tail
function StockoutRiskCard({ value, count, critical, low }: { value: number; count: number; critical: any; low: any }) {
  const on = useMount(120);
  const total = (critical?.count || 0) + (low?.count || 0) || 1;
  return (
    <Card>
      <Head icon={TbAlertTriangle} label="Stockout risk" badge="< 30 days" color="#cf7e6f" />
      <div className="mt-4 text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={value} format={inrAbbr} /></div>
      <div className="mt-1.5 text-[13px] text-gray-500"><b style={{ color: "#cf7e6f" }}>{count.toLocaleString("en-IN")}</b> SKUs running low</div>
      <div className="mt-auto pt-4">
        <div className="flex gap-2">
          {[{ ...critical, c: BANDS[0] }, { ...low, c: BANDS[1] }].map((b: any, i) => (
            <div key={i} className="flex-1 rounded-xl p-2.5" style={{ background: `${b.c.bar}1e` }}>
              <div className="text-[10px] font-medium" style={{ color: b.c.bar }}>{b.c.label}</div>
              <div className="text-[16px] font-bold tabular-nums leading-tight mt-0.5" style={{ color: INK }}>{(b.count || 0).toLocaleString("en-IN")}</div>
              <div className="text-[10px] text-gray-400">{inrAbbr(b.value || 0)}</div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 h-1.5 rounded-full overflow-hidden flex" style={{ background: "#eef0f6" }}>
          <div style={{ width: on ? `${((critical?.count || 0) / total) * 100}%` : "0%", background: BANDS[0].bar, transition: "width 1s ease" }} />
          <div style={{ width: on ? `${((low?.count || 0) / total) * 100}%` : "0%", background: BANDS[1].bar, transition: "width 1s ease 0.1s" }} />
        </div>
      </div>
    </Card>
  );
}

// CARD 3 — Overstock (value + count > 365 days cover)
function OverstockCard({ value, count, totalMovingValue }: { value: number; count: number; totalMovingValue: number }) {
  const on = useMount(240);
  const pct = totalMovingValue ? value / totalMovingValue : 0;
  return (
    <Card>
      <Head icon={TbStack3} label="Overstocked" badge="365+ days" color="#6f76b3" />
      <div className="mt-4 text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={value} format={inrAbbr} /></div>
      <div className="mt-1.5 text-[13px] text-gray-500"><b style={{ color: "#6f76b3" }}>{count.toLocaleString("en-IN")}</b> SKUs with 1+ year cover</div>
      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400">share of moving capital</span>
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: "#6f76b3" }}>{Math.round(pct * 100)}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#eef0f6" }}>
          <div className="h-full rounded-full" style={{ width: on ? `${Math.min(pct * 100, 100)}%` : "0%", background: "linear-gradient(90deg,#9097c9,#6f76b3)", transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
        <div className="mt-3"><Chip text="recoverable capital" color="#6f76b3" /></div>
      </div>
    </Card>
  );
}

// CARD 4 — Idle capital (non-moving), the dominant reality, with a 89% ring
function IdleCapitalCard({ value, count, totalValue, totalSkus }: { value: number; count: number; totalValue: number; totalSkus: number }) {
  const on = useMount(360); const C = 2 * Math.PI * 32; const pct = totalValue ? value / totalValue : 0;
  return (
    <Card>
      <Head icon={TbZzz} label="Idle capital" badge="no movement" color="#8a93a6" />
      <div className="flex items-center gap-4 mt-4">
        <div className="relative w-[92px] h-[92px] flex-shrink-0">
          <svg className="w-[92px] h-[92px] -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#eef0f4" strokeWidth="9" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="#9aa3b2" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct) : C} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.15,0.64,1)" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[17px] font-bold tabular-nums" style={{ color: INK }}>{Math.round(pct * 100)}%</span></div>
        </div>
        <div className="min-w-0">
          <div className="text-[26px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={value} format={inrAbbr} /></div>
          <div className="mt-1.5 text-[11px] text-gray-400">of value sits unused</div>
          <div className="mt-2.5"><Chip text={`${count.toLocaleString("en-IN")} SKUs`} color="#8a93a6" /></div>
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-gray-50">
        <div className="pt-2.5 text-[11px] text-gray-400 leading-snug">
          <b style={{ color: INK }}>{count.toLocaleString("en-IN")}</b> of {totalSkus.toLocaleString("en-IN")} SKUs had no consumption in 6 months
        </div>
      </div>
    </Card>
  );
}

// ── Coverage distribution histogram — signature interactive chart (moving SKUs) ──
function CoverageHistogram({ bands, region }: { bands: any[]; region: string }) {
  const on = useMount(80);
  const [metric, setMetric] = useState<"count" | "value">("count");
  const [hov, setHov] = useState<number | null>(null);
  const data = BANDS.map((b) => { const row = bands.find((x) => x.key === b.key) || { count: 0, value: 0, qty: 0 }; return { ...b, count: row.count, value: row.value, qty: row.qty }; });
  const max = Math.max(...data.map((d) => (metric === "count" ? d.count : d.value)), 1);
  const fmt = (d: any) => (metric === "count" ? d.count.toLocaleString("en-IN") : inrAbbr(d.value));
  const hd = hov != null ? data[hov] : null;
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "380ms", boxShadow: PANEL_SHADOW }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbChartHistogram size={16} style={{ color: INDIGO }} />Coverage distribution</h3>
          <p className="text-xs text-gray-400 mt-0.5">moving SKUs by days of cover · {region}</p>
        </div>
        <div className="flex items-center gap-0.5 p-1 rounded-full" style={{ background: "#e6e9f2" }}>
          {(["count", "value"] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all capitalize"
              style={metric === m ? { background: "#fff", color: INDIGO, boxShadow: "0 2px 6px rgba(93,108,171,0.2)" } : { background: "transparent", color: "#8b92a8" }}>{m === "count" ? "SKUs" : "Value"}</button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-end gap-3 sm:gap-5" style={{ height: 230 }} onMouseLeave={() => setHov(null)}>
        {data.map((d, i) => {
          const v = metric === "count" ? d.count : d.value;
          const h = (v / max) * 100;
          const active = hov === i;
          const healthy = d.key === "healthy";
          return (
            <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full" onMouseEnter={() => setHov(i)}>
              <span className="text-[11px] font-bold tabular-nums mb-1.5" style={{ color: active ? INK : "#6b7280", opacity: on ? 1 : 0, transition: "opacity 0.5s ease 0.6s" }}>{fmt(d)}</span>
              <div className="w-full rounded-t-lg relative" style={{ height: on ? `${Math.max(h, 1.5)}%` : "0%", background: d.grad, transition: `height 0.9s cubic-bezier(0.34,1.1,0.64,1) ${i * 60}ms`, boxShadow: active ? `0 8px 20px -6px ${d.bar}aa` : healthy ? `0 0 0 2px ${d.bar}55` : "none", outline: active ? `2px solid ${d.bar}` : "none" }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 sm:gap-5 mt-2 border-t border-gray-100 pt-2">
        {data.map((d) => (
          <div key={d.key} className="flex-1 text-center">
            <div className="text-[10.5px] font-semibold" style={{ color: d.bar }}>{d.short}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] font-medium" style={{ color: hd ? INK : "#9aa1b2" }}>
        {hd ? <span><b style={{ color: hd.bar }}>{hd.label}</b> — {hd.count.toLocaleString("en-IN")} SKUs · {inrAbbr(hd.value)} · {numAbbr(hd.qty)} units</span>
          : <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#7cbf9c" }} />green band = the 30–90 day healthy target · hover a bar</span>}
      </div>
    </div>
  );
}

// ── Reorder priority — SKUs about to run out (ascending cover) ──
function ReorderPriority({ rows, region }: { rows: any[]; region: string }) {
  const on = useMount(120);
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: "460ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbReload size={16} style={{ color: "#cf7e6f" }} />Reorder priority</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-3">fastest to run out · cover vs daily use · {region}</p>
      <div className="space-y-1.5 flex-1">
        {rows.slice(0, 10).map((r, i) => {
          const urg = Math.max(4, Math.min(100, (r.doh / 30) * 100));
          const c = r.doh < 7 ? BANDS[0].bar : r.doh < 15 ? "#e0986a" : BANDS[1].bar;
          return (
            <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="text-[11px] font-semibold tabular-nums w-4 text-center" style={{ color: "#aab" }}>{i + 1}</span>
              <span className="text-[12px] font-medium text-gray-700 truncate flex-1" title={r.name}>{r.name}</span>
              <div className="w-20 h-2 rounded-full overflow-hidden flex-shrink-0" style={{ background: "#f0e7e3" }}>
                <div className="h-full rounded-full" style={{ width: on ? `${urg}%` : "0%", background: c, transition: `width 0.8s ease ${i * 50}ms` }} />
              </div>
              <span className="text-[12px] font-bold tabular-nums w-12 text-right flex-shrink-0" style={{ color: c }}>{r.doh < 1 ? "<1d" : `${Math.round(r.doh)}d`}</span>
              <span className="text-[10px] text-gray-400 tabular-nums w-16 text-right flex-shrink-0 hidden sm:block">{numAbbr(r.daily)}/day</span>
            </div>
          );
        })}
        {!rows.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

// ── Overstock sinks — biggest capital tied in 365+ cover ──
function OverstockSinks({ rows, region }: { rows: any[]; region: string }) {
  const on = useMount(240);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: "540ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbAnchor size={16} style={{ color: "#6f76b3" }} />Overstock sinks</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-3">most capital with 1+ year cover · {region}</p>
      <div className="space-y-2.5 flex-1">
        {rows.slice(0, 7).map((r, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium text-gray-700 truncate pr-2" title={r.name}>{r.name}</span>
              <span className="text-[11px] font-semibold tabular-nums flex-shrink-0" style={{ color: INK }}>{inrAbbr(r.value)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 rounded-full overflow-hidden flex-1" style={{ background: "#eef0f6" }}>
                <div className="h-full rounded-full" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: "linear-gradient(90deg,#9097c9,#6f76b3)", transition: `width 0.9s ease ${i * 60}ms` }} />
              </div>
              <span className="text-[10px] font-medium tabular-nums w-14 text-right flex-shrink-0" style={{ color: "#6f76b3" }}>{dayLabel(r.doh)}d cover</span>
            </div>
          </div>
        ))}
        {!rows.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "material_group", label: "Category" }, { field: "stock_qty", label: "Stock Qty", kind: "num" as const },
  { field: "avg_daily_consumption", label: "Daily Use", kind: "num" as const }, { field: "doh_days", label: "DOH (days)", kind: "num" as const },
];

export default function DaysOnHandDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/days-on-hand/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  const t = data?.totals || {};
  const bands = data?.bands || [];
  const bandBy = useMemo(() => { const m: Record<string, any> = {}; bands.forEach((b: any) => { m[b.key] = b; }); return m; }, [bands]);
  const movingValue = useMemo(() => BANDS.reduce((s, b) => s + Number(bandBy[b.key]?.value ?? 0), 0), [bandBy]);

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Days of Inventory on Hand" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 csv-cards">
        <div className="csv-card" style={{ animationDelay: "0ms" }}><CoverHeroCard median={Number(t.median_doh ?? 0)} movingSkus={Number(t.moving_skus ?? 0)} /></div>
        <div className="csv-card" style={{ animationDelay: "100ms" }}><StockoutRiskCard value={Number(t.risk_value ?? 0)} count={Number(t.risk_count ?? 0)} critical={bandBy.critical} low={bandBy.low} /></div>
        <div className="csv-card" style={{ animationDelay: "200ms" }}><OverstockCard value={Number(t.overstock_value ?? 0)} count={Number(t.overstock_count ?? 0)} totalMovingValue={movingValue} /></div>
        <div className="csv-card" style={{ animationDelay: "300ms" }}><IdleCapitalCard value={Number(t.nonmoving_value ?? 0)} count={Number(t.nonmoving_skus ?? 0)} totalValue={Number(t.total_value ?? 0)} totalSkus={Number(t.total_skus ?? 0)} /></div>
      </div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .csv-cards > .csv-card { min-width: 0; }
        .csv-cards > .csv-card > * { height: 100%; }
      `}</style>

      <CoverageHistogram bands={bands} region={region} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7"><ReorderPriority rows={data?.reorder || []} region={region} /></div>
        <div className="xl:col-span-5"><OverstockSinks rows={data?.overstock || []} region={region} /></div>
      </div>

      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "620ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">SKU-level coverage detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="days-on-hand" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
