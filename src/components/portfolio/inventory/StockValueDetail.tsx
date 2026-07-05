"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbReportMoney, TbTrophy, TbTargetArrow, TbBoxMultiple, TbChartAreaLine } from "react-icons/tb";
// Actual premium components from the /stockChange page — reused as-is, real data.
import WarehouseInventoryCard from "@/components/ecommerce/cards_collection/stockvaluecard";
import ActivityStats from "@/components/ecommerce/cards_collection/line_plot_card_blue";
import DOHCard from "@/components/ecommerce/cards_collection/daysonhand2";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
// ── Disciplined palette: cream canvas · charcoal ink · ONE coral accent · warm neutrals. Colour appears only where it carries meaning. ──
const CREAM = "#F7F5F0";
const CORAL = "#D6806A";
const CORAL_SOFT = "#E9B6A6";
const CORAL_TINT = "#F7E9E3";
const INK = "#3a352f";
const ACCENT = CORAL; // single accent across the page
const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
const numAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`; if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`; return `${Math.round(v)}`; };
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

// ── Shared bits ──
// Warm, airy shadows tuned for the cream canvas (brown-tinted, softer than slate).
const CARD_SHADOW = "0 14px 38px -20px rgba(99,72,56,0.22), 0 2px 8px -4px rgba(99,72,56,0.06)";
const PANEL_SHADOW = "0 12px 34px -22px rgba(99,72,56,0.16), 0 2px 7px -4px rgba(99,72,56,0.05)";
const CARD_MIN = 248;
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 150 + delay); return () => clearTimeout(t); }, [delay]); return on; };
function CardHead({ icon: Icon, label, badge, soft, color, light }: any) {
  return (
    <div className="flex items-center justify-between relative z-10">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: light ? "rgba(255,255,255,0.6)" : soft, color }}><Icon size={17} /></span>
        <span className="text-[13px] font-medium truncate" style={{ color: light ? color : "#6b7280" }}>{label}</span>
      </div>
      {badge && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: light ? "rgba(255,255,255,0.55)" : soft, color }}>{badge}</span>}
    </div>
  );
}
function StatusPill({ text, color }: { text: string; color: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: `${color}16`, color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{text}</span>;
}
const cardCls = "relative rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 flex flex-col";

// CARD 1 — Bold dark charcoal hero (reference-style focal card) with coral accent ring + markup bar
function ValueHeroCard({ cost, mrp, markup }: { cost: number; mrp: number; markup: number }) {
  const on = useMount(0); const C = 2 * Math.PI * 30; const pct = mrp ? Math.min(cost / mrp, 1) : 0;
  return (
    <div className={cardCls} style={{ minHeight: CARD_MIN, padding: 20, boxShadow: "0 18px 44px -20px rgba(28,22,18,0.45), 0 4px 12px -6px rgba(28,22,18,0.30)", background: "linear-gradient(158deg,#46413b 0%,#322d28 100%)" }}>
      {/* soft coral glow */}
      <div className="absolute w-36 h-36 rounded-full blur-3xl opacity-25" style={{ background: "#d6806a", top: "-22%", right: "-12%" }} />
      <div className="absolute w-24 h-24 rounded-full blur-2xl opacity-10" style={{ background: "#e9b6a6", bottom: "4%", left: "-8%" }} />
      {/* header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}><TbReportMoney size={17} /></span>
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.72)" }}>Total stock value</span>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(214,128,106,0.22)", color: "#edc7ba" }}>cost basis</span>
      </div>
      <div className="relative z-10 flex items-start justify-between mt-5">
        <div>
          <div className="text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#ffffff" }}><CountUp value={cost} format={inrAbbr} /></div>
          <div className="mt-2.5 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>₹{(mrp / 1e7).toFixed(1)} Cr at MRP</div>
        </div>
        <div className="relative w-[78px] h-[78px] flex-shrink-0">
          <svg className="w-[78px] h-[78px] -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="8" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="#d6806a" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct) : C} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.12,0.64,1)", filter: "drop-shadow(0 3px 8px rgba(214,128,106,0.55))" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: "#fff" }}>
            <span className="text-[15px] font-bold leading-none">{Math.round(pct * 100)}%</span>
            <span className="text-[8px] font-semibold tracking-wide mt-0.5" style={{ color: "#edc7ba" }}>OF MRP</span>
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-auto pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>Cost → MRP markup</span>
          <span className="text-[12px] font-bold" style={{ color: "#edc7ba" }}>+{markup.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div className="h-full rounded-full relative overflow-hidden" style={{ width: on ? `${Math.min(markup, 100)}%` : "0%", background: "linear-gradient(90deg,#e9b6a6,#d6806a)", transition: "width 1.4s cubic-bezier(0.34,1.1,0.64,1)" }}>
            <div className="absolute inset-0 opacity-40" style={{ background: "linear-gradient(90deg,transparent,#fff,transparent)", animation: "shimmer 2.2s infinite" }} />
          </div>
        </div>
      </div>
      <style jsx>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}`}</style>
    </div>
  );
}

// CARD 2 — Big donut + top-category mini leaderboard
function CategoryDonutCard({ value, share, name, leaders, total }: { value: number; share: number; name: string; leaders: { n: string; v: number }[]; total: number }) {
  const on = useMount(120); const C = 2 * Math.PI * 32; const pct = Math.max(0, Math.min(share, 1));
  return (
    <div className={cardCls + " bg-white"} style={{ minHeight: CARD_MIN, padding: 20, boxShadow: CARD_SHADOW }}>
      <CardHead icon={TbTrophy} label="Top category" badge="share" soft={CORAL_TINT} color={CORAL} />
      <div className="flex items-center gap-4 mt-4">
        <div className="relative w-[92px] h-[92px] flex-shrink-0">
          <svg className="w-[92px] h-[92px] -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke={CORAL_TINT} strokeWidth="9" />
            <circle cx="40" cy="40" r="32" fill="none" stroke={CORAL} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct) : C} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.15,0.64,1)", filter: "drop-shadow(0 3px 6px rgba(214,128,106,0.28))" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[17px] font-bold tabular-nums" style={{ color: CORAL }}>{Math.round(pct * 100)}%</span></div>
        </div>
        <div className="min-w-0">
          <div className="text-[28px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={value} format={inrAbbr} /></div>
          <div className="mt-1.5 text-[11px] text-gray-400 truncate">{name}</div>
          <div className="mt-2.5"><StatusPill text={pct > 0.4 ? "Concentrated" : "Balanced"} color={CORAL} /></div>
        </div>
      </div>
      <div className="mt-auto pt-4 space-y-2">
        {leaders.slice(0, 3).map((l, i) => { const w = total ? (l.v / total) * 100 : 0; return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-3">{i + 1}</span>
            <span className="text-[11px] text-gray-600 truncate flex-1">{l.n}</span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: CORAL_TINT }}><div className="h-full rounded-full" style={{ width: on ? `${w}%` : "0%", background: CORAL_SOFT, transition: `width 0.9s ease ${i * 100}ms` }} /></div>
            <span className="text-[10px] font-medium text-gray-500 w-12 text-right tabular-nums">{inrAbbr(l.v)}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

// CARD 2 (alt) — Concentric coral rings: top categories by value (signature look from the reference dashboard)
function ConcentricRingsCard({ items }: { items: { name: string; value: number }[] }) {
  const on = useMount(120);
  const tiers = items.slice(0, 4);
  const R = [70, 53, 37, 22];
  const fills = ["#FBDBD1", "#F3A98F", "#EB7C5D", "#E1573C"];
  const txt = ["#9a3a25", "#7c2c19", "#ffffff", "#ffffff"];
  return (
    <div className={cardCls + " bg-white"} style={{ minHeight: CARD_MIN, padding: 20, boxShadow: CARD_SHADOW }}>
      <CardHead icon={TbTargetArrow} label="Top categories" badge="by value" soft="#fdeee9" color={CORAL} />
      <div className="relative mx-auto mt-2" style={{ width: 148, height: 148 }}>
        <svg width="148" height="148" viewBox="0 0 148 148">
          {tiers.map((t, i) => (
            <circle key={i} cx="74" cy="74" r={on ? R[i] : 0} fill={fills[i]} style={{ transition: `r 0.9s cubic-bezier(0.34,1.1,0.64,1) ${i * 95}ms` }} />
          ))}
          {tiers.map((t, i) => (
            <text key={"t" + i} x="74" y={74 - R[i] + 15} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={txt[i]} fontFamily={FONT}
              style={{ opacity: on ? 1 : 0, transition: `opacity 0.5s ease ${i * 95 + 450}ms` }}>{inrAbbr(t.value)}</text>
          ))}
        </svg>
      </div>
      <div className="mt-auto pt-3 text-center text-[11px] text-gray-400 truncate">Led by <span className="font-semibold" style={{ color: CORAL }}>{tiers[0]?.name ?? "—"}</span></div>
    </div>
  );
}

// CARD 3 — Tall equalizer spread (SKU distribution across categories)
function SkuSpreadCard({ count, cats, spread }: { count: number; cats: number; spread: number[] }) {
  const on = useMount(240); const data = (spread.length ? spread : [4, 7, 5, 9, 6, 8, 3, 7, 5, 6, 4, 6, 5, 7]).slice(0, 14); const max = Math.max(...data, 1);
  return (
    <div className={cardCls + " bg-white"} style={{ minHeight: CARD_MIN, padding: 20, boxShadow: CARD_SHADOW }}>
      <CardHead icon={TbBoxMultiple} label="Distinct SKUs" badge="coverage" soft={CORAL_TINT} color={CORAL} />
      <div className="mt-4 text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={count} format={(n) => Math.round(n).toLocaleString("en-IN")} /></div>
      <div className="mt-2 text-[13px] text-gray-400">across {cats} categories</div>
      <div className="mt-auto pt-5">
        <div className="flex items-end gap-[3px] h-16">
          {data.map((v, i) => (
            <div key={i} className="flex-1 rounded-t-md" style={{ height: on ? `${Math.max(10, (v / max) * 100)}%` : "0%", background: i === 0 ? "linear-gradient(180deg,#e9b6a6,#d6806a)" : i < 3 ? CORAL_SOFT : CORAL_TINT, transition: `height 0.8s cubic-bezier(0.34,1.12,0.64,1) ${i * 50}ms` }} />
          ))}
        </div>
        <div className="mt-3"><StatusPill text="Diversified" color={CORAL} /></div>
      </div>
    </div>
  );
}

// CARD 4 — Value-concentration Pareto curve (ABC analysis): how few categories hold most value
function ConcentrationCard({ pts, n80, count }: { pts: number[]; n80: number; count: number }) {
  const on = useMount(360);
  const W = 240, H = 58;
  const real = pts.length > 1;
  const data = real ? pts : [0.32, 0.52, 0.66, 0.76, 0.83, 0.88, 0.92, 0.95, 0.97, 0.99, 1];
  const eff80 = real ? n80 : 5;
  const eff = real ? count : 11;
  const n = data.length;
  const x = (i: number) => (n <= 1 ? W : (i / (n - 1)) * W);
  const y = (p: number) => (H - 3) - p * (H - 9);
  const line = data.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const i80 = Math.max(0, eff80 - 1);
  const concentrated = eff80 <= Math.max(3, eff * 0.1);
  return (
    <div className={cardCls + " bg-white"} style={{ minHeight: CARD_MIN, padding: 20, boxShadow: CARD_SHADOW }}>
      <CardHead icon={TbChartAreaLine} label="Value concentration" badge="Pareto" soft={CORAL_TINT} color={CORAL} />
      <div className="mt-4 flex items-end gap-2">
        <span className="text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={eff80} format={(v) => `${Math.round(v)}`} /></span>
        <span className="text-[12px] text-gray-400 mb-1">of {eff} categories</span>
      </div>
      <div className="mt-1.5 text-[13px] text-gray-500">drive <b style={{ color: CORAL }}>80%</b> of stock value</div>
      <div className="mt-auto pt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 64 }} preserveAspectRatio="none">
          <defs><linearGradient id="conc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9b6a6" stopOpacity="0.5" /><stop offset="100%" stopColor="#f6e7e0" stopOpacity="0.04" /></linearGradient></defs>
          <line x1="0" y1={y(0.8)} x2={W} y2={y(0.8)} stroke="#f3e1da" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <line x1={x(i80)} y1={y(data[i80] ?? 0.8)} x2={x(i80)} y2={H} stroke="#e9b6a6" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" style={{ opacity: on ? 0.9 : 0, transition: "opacity 0.5s ease 1.2s" }} />
          <path d={area} fill="url(#conc-fill)" style={{ opacity: on ? 1 : 0, transition: "opacity 1s ease 0.3s" }} />
          <path d={line} fill="none" stroke={CORAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ strokeDasharray: 600, strokeDashoffset: on ? 0 : 600, transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
        </svg>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 tabular-nums">{eff} categories</span>
          <StatusPill text={concentrated ? "Concentrated" : "Distributed"} color={CORAL} />
        </div>
      </div>
    </div>
  );
}

// ── Value-at-risk strip: how healthy is the stock value (by age + expiry) ──
// Semantic health gradient — the one place colour is allowed to vary; it resolves into the brand coral at the danger end.
const AGING_BANDS = [
  { key: "0-30", bar: "#7cbda7", label: "0–30 days" },
  { key: "31-90", bar: "#a8cf8d", label: "31–90 days" },
  { key: "91-180", bar: "#e0c885", label: "91–180 days" },
  { key: "181-365", bar: "#e6ab84", label: "181–365 days" },
  { key: "365+", bar: "#d6806a", label: "365+ days" },
];
function RiskTile({ label, value, sub, color, soft }: { label: string; value: number; sub: string; color: string; soft: string }) {
  return (
    <div className="rounded-2xl p-3.5 flex flex-col gap-1.5" style={{ background: soft }}>
      <span className="text-[11px] font-medium leading-tight" style={{ color }}>{label}</span>
      <span className="text-[21px] font-bold tabular-nums leading-none" style={{ color }}><CountUp value={value} format={inrAbbr} /></span>
      <span className="text-[10px] text-gray-400 leading-tight">{sub}</span>
    </div>
  );
}
function ValueAtRiskPanel({ risk, animate, region }: { risk: any; animate: boolean; region: string }) {
  const pct = (v: number) => (risk.total ? `${Math.round((v / risk.total) * 100)}%` : "—");
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "380ms", boxShadow: PANEL_SHADOW }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Stock value at risk</h3>
          <p className="text-xs text-gray-400 mt-0.5">value health by inventory age · {region}</p>
        </div>
        <span className="text-[11px] font-medium text-gray-400 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" />snapshot · 31 May 2026</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <RiskTile label="Healthy · ≤90 days" value={risk.fresh} sub={`${pct(risk.fresh)} of value · fresh stock`} color="#5ea38f" soft="#eef6f2" />
        <RiskTile label="Watch · 91–365 days" value={risk.mature} sub={`${pct(risk.mature)} of value · ageing`} color="#bba066" soft="#f8f1e3" />
        <RiskTile label="Stale · 365+ days" value={risk.stale} sub={`${pct(risk.stale)} of value · slow / dead`} color={CORAL} soft={CORAL_TINT} />
        <RiskTile label="Near-expiry value" value={risk.nearExpiry} sub={risk.expired ? `incl ${inrAbbr(risk.expired)} already expired` : "within 180 days of expiry"} color="#cf9075" soft="#f8ede5" />
      </div>

      <div className="mt-5">
        <div className="flex h-11 rounded-xl overflow-hidden ring-1 ring-black/5">
          {AGING_BANDS.map((band, i) => {
            const b = risk.buckets.find((x: any) => x.key === band.key) || { value: 0 };
            const w = risk.total ? (b.value / risk.total) * 100 : 0;
            return (
              <div key={band.key} title={`${band.label}: ${inrAbbr(b.value)} (${Math.round(w)}%)`} className="relative flex items-center justify-center"
                style={{ width: animate ? `${w}%` : "0%", background: band.bar, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms` }}>
                {w >= 8 && <span className="text-[11px] font-bold text-white tabular-nums" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.18)" }}>{Math.round(w)}%</span>}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2.5 mt-3.5">
          {AGING_BANDS.map((band) => {
            const b = risk.buckets.find((x: any) => x.key === band.key) || { value: 0, skus: 0 };
            return (
              <div key={band.key} className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5 self-start" style={{ background: band.bar }} />
                <div className="min-w-0 leading-tight">
                  <div className="text-[11px] text-gray-500">{band.label}</div>
                  <div className="text-[12.5px] font-semibold text-gray-800 tabular-nums">{inrAbbr(b.value)} <span className="text-[10px] font-normal text-gray-400">· {b.skus.toLocaleString("en-IN")} SKUs</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "material_group", label: "Category" }, { field: "stock_qty", label: "Qty", kind: "num" as const },
  { field: "stock_value_cost", label: "Value (Cost)", kind: "inr" as const }, { field: "stock_value_mrp", label: "Value (MRP)", kind: "inr" as const },
];

type GroupMode = { key: string; label: string; field: string };
const GROUP_MODES: GroupMode[] = [
  { key: "category", label: "Category", field: "material_group" },
  { key: "sku", label: "Top SKUs", field: "material_desc" },
  { key: "plant", label: "Hospital", field: "plant" },
];
const BAR_PALETTE = ["#818cf8", "#a5b4fc", "#bcc4fb", "#cdd3fc", "#dde1fd"];
// Smooth periwinkle ramp (strong → soft) so a ranked horizontal bar list reads top-heavy without harsh colors.
const periwinkleRamp = (n: number) => {
  const a = [99, 102, 241], b = [199, 210, 254];
  return Array.from({ length: Math.max(n, 1) }, (_, i) => {
    const t = n <= 1 ? 0 : i / (n - 1);
    const c = a.map((s, k) => Math.round(s + (b[k] - s) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });
};

export default function StockValueDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [mode, setMode] = useState<GroupMode>(GROUP_MODES[0]);
  const [catData, setCatData] = useState<any[]>([]);
  const [barData, setBarData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [plantMap, setPlantMap] = useState<Record<string, string>>({});
  const [aging, setAging] = useState<any[]>([]);
  const [expiry, setExpiry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => { const t = setTimeout(() => setAnimate(true), 80); return () => clearTimeout(t); }, []);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/meta/plants`).then((r) => r.json())
      .then((d) => { const m: Record<string, string> = {}; (d?.plants || []).forEach((p: any) => { m[p.code] = p.name; }); setPlantMap(m); }).catch(() => {});
  }, []);

  useEffect(() => {
    const cp = new URLSearchParams({ Plant: region, group_by: "material_group", measures: "stock_value_cost,stock_value_mrp,stock_qty", top: "500" });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/current-stock-value?${cp}`).then((r) => r.json()).then((c) => setCatData(Array.isArray(c) ? c : [])).catch(() => {});
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/current-stock-value/summary?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((s) => setSummary(s || {})).catch(() => {});
    // Value-at-risk: stock value split by inventory age, plus near-expiry value (both reconcile to total cost).
    const ap = new URLSearchParams({ Plant: region, group_by: "aging_bucket", measures: "stock_value,stock_qty,sku_count", top: "10" });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/aging-distribution?${ap}`).then((r) => r.json()).then((d) => setAging(Array.isArray(d) ? d : [])).catch(() => setAging([]));
    const ep = new URLSearchParams({ Plant: region, group_by: "expiry_bucket", measures: "total_cost,qty", top: "10" });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/near-expiry?${ep}`).then((r) => r.json()).then((d) => setExpiry(Array.isArray(d) ? d : [])).catch(() => setExpiry([]));
  }, [region]);

  useEffect(() => {
    setLoading(true);
    const cp = new URLSearchParams({ Plant: region, group_by: mode.field, measures: "stock_value_cost,stock_value_mrp,stock_qty", top: "12" });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/current-stock-value?${cp}`).then((r) => r.json()).then((d) => setBarData(Array.isArray(d) ? d : [])).catch(() => setBarData([])).finally(() => setLoading(false));
  }, [region, mode]);

  const catName = (g: string) => String(g).replace(/^M\d+-/, "");
  const labelFor = (d: any) => { let v = String(d[mode.field] ?? "—"); if (mode.field === "plant") v = plantMap[v] || v; else if (mode.field === "material_group") v = catName(v); return v; };

  const insights = useMemo(() => {
    const totalCost = Number(summary?.stock_value_cost?.sum ?? 0);
    const totalMrp = Number(summary?.stock_value_mrp?.sum ?? 0);
    const skuCount = Number(summary?.material?.distinct ?? 0);
    const catCount = Number(summary?.material_group?.distinct ?? 0) || catData.length;
    const markup = totalCost ? ((totalMrp - totalCost) / totalCost) * 100 : 0;
    const spread = [...catData].sort((a, b) => b.stock_value_cost - a.stock_value_cost).slice(0, 12).map((d) => Number(d.stock_value_cost ?? 0));
    return { totalCost, totalMrp, skuCount, catCount, markup, spread };
  }, [summary, catData]);

  // Value-at-risk model: stock value bucketed by age + near-expiry exposure (reconciles to total cost).
  const risk = useMemo(() => {
    const order = ["0-30", "31-90", "91-180", "181-365", "365+"];
    const m: Record<string, any> = {}; aging.forEach((a) => { m[a.aging_bucket] = a; });
    const buckets = order.map((k) => ({ key: k, value: Number(m[k]?.stock_value ?? 0), qty: Number(m[k]?.stock_qty ?? 0), skus: Number(m[k]?.sku_count ?? 0) }));
    const total = buckets.reduce((s, b) => s + b.value, 0) || 0;
    const sum = (keys: string[]) => buckets.filter((b) => keys.includes(b.key)).reduce((s, b) => s + b.value, 0);
    const nearExpiry = expiry.reduce((s, e) => s + Number(e.total_cost ?? 0), 0);
    const expired = expiry.filter((e) => String(e.expiry_bucket).toLowerCase().includes("expired")).reduce((s, e) => s + Number(e.total_cost ?? 0), 0);
    return { buckets, total, fresh: sum(["0-30", "31-90"]), mature: sum(["91-180", "181-365"]), stale: sum(["365+"]), nearExpiry, expired };
  }, [aging, expiry]);

  // Value concentration (Pareto / ABC): cumulative share curve + how many categories reach 80%.
  const conc = useMemo(() => {
    const sorted = catData.map((d) => Number(d.stock_value_cost ?? 0)).filter((v) => v > 0).sort((a, b) => b - a);
    const total = sorted.reduce((s, v) => s + v, 0) || 1;
    let cum = 0; const pts: number[] = []; let n80 = sorted.length;
    for (let i = 0; i < sorted.length; i++) { cum += sorted[i]; const p = cum / total; pts.push(p); if (n80 === sorted.length && p >= 0.8) n80 = i + 1; }
    return { pts, n80, count: sorted.length };
  }, [catData]);

  // Cost-vs-MRP headroom: top 6 categories by cost.
  const costMrp = useMemo(() => {
    const sorted = [...catData].sort((a, b) => b.stock_value_cost - a.stock_value_cost).slice(0, 6);
    const maxMrp = Math.max(...sorted.map((d) => Number(d.stock_value_mrp ?? 0)), 1);
    return sorted.map((d) => {
      const cost = Number(d.stock_value_cost ?? 0), mrp = Number(d.stock_value_mrp ?? 0);
      return { name: catName(d.material_group), cost, mrp, costPct: (cost / maxMrp) * 100, mrpPct: (mrp / maxMrp) * 100, markup: cost ? ((mrp - cost) / cost) * 100 : 0 };
    });
  }, [catData]);

  // Custom inline horizontal bars (no chart lib): exact control of label↔bar spacing, soft gradient fills, elegant hover card.
  const barMax = Math.max(...barData.map((d) => Number(d.stock_value_cost ?? 0)), 1);
  const barRows = barData.map((d) => {
    const cost = Number(d.stock_value_cost ?? 0), mrp = Number(d.stock_value_mrp ?? 0), qty = Number(d.stock_qty ?? 0);
    return { name: labelFor(d), cost, mrp, qty, w: (cost / barMax) * 100, share: insights.totalCost ? (cost / insights.totalCost) * 100 : 0, markup: cost ? ((mrp - cost) / cost) * 100 : 0 };
  });

  const costMrpRatio = insights.totalMrp ? insights.totalCost / insights.totalMrp : 0;
  const topCat = useMemo(() => [...catData].sort((a, b) => b.stock_value_cost - a.stock_value_cost)[0], [catData]);
  const topShare = topCat && insights.totalCost ? topCat.stock_value_cost / insights.totalCost : 0;

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5" style={{ background: CREAM, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Current Stock Value" />

      {/* ── Premium bespoke KPI cards — 4 distinct large visualizations ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 csv-cards">
        <div className="csv-card" style={{ animationDelay: "0ms" }}><ValueHeroCard cost={insights.totalCost} mrp={insights.totalMrp} markup={insights.markup} /></div>
        <div className="csv-card" style={{ animationDelay: "100ms" }}><CategoryDonutCard value={topCat?.stock_value_cost ?? 0} share={topShare} name={topCat ? catName(topCat.material_group) : "—"}
          total={insights.totalCost} leaders={[...catData].sort((a, b) => b.stock_value_cost - a.stock_value_cost).slice(0, 3).map((d) => ({ n: catName(d.material_group), v: Number(d.stock_value_cost ?? 0) }))} /></div>
        <div className="csv-card" style={{ animationDelay: "200ms" }}><SkuSpreadCard count={insights.skuCount} cats={insights.catCount} spread={insights.spread} /></div>
        <div className="csv-card" style={{ animationDelay: "300ms" }}><ConcentrationCard pts={conc.pts} n80={conc.n80} count={conc.count} /></div>
      </div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        /* equal-height fill ONLY for the top KPI card wrappers (single child each);
           the lower multi-child panels reuse .csv-card for the entrance animation only. */
        .csv-cards > .csv-card > * { height: 100%; }
        /* ── Custom inline horizontal bars ── */
        .csv-bars { display: flex; flex-direction: column; gap: 3px; }
        .csv-bar-row { position: relative; display: flex; align-items: center; gap: 14px; padding: 5px 6px; border-radius: 12px; transition: background 0.2s ease; }
        .csv-bar-row:hover { background: #faf6f1; }
        .csv-bar-label { width: 156px; flex-shrink: 0; text-align: right; font-size: 12px; font-weight: 500; color: #6b635c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .csv-bar-track { position: relative; flex: 1; height: 20px; background: #f1ebe3; border-radius: 7px; overflow: hidden; }
        .csv-bar-fill { height: 100%; border-radius: 7px; background: linear-gradient(90deg, #e9b6a6, #d6806a); box-shadow: inset 0 1px 1px rgba(255,255,255,0.3); transition: width 1.05s cubic-bezier(0.22, 1, 0.36, 1); }
        .csv-bar-row:hover .csv-bar-fill { background: linear-gradient(90deg, #dd9985, #c07a64); }
        .csv-bar-val { width: 78px; flex-shrink: 0; font-size: 12px; font-weight: 600; color: #334155; font-variant-numeric: tabular-nums; }
        /* hover detail card, anchored above (or below for the top rows) so it never clips the panel */
        .csv-bar-pop { position: absolute; left: 172px; z-index: 30; opacity: 0; pointer-events: none; transition: opacity 0.18s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
        .csv-bar-pop.above { bottom: calc(100% - 9px); transform: translateY(6px) scale(0.97); }
        .csv-bar-pop.below { top: calc(100% - 9px); transform: translateY(-6px) scale(0.97); }
        .csv-bar-row:hover .csv-bar-pop { opacity: 1; transform: translateY(0) scale(1); }
        .csv-tip { font-family: 'Outfit', 'Segoe UI', sans-serif; min-width: 216px; background: #fff; border-radius: 16px; padding: 13px 15px; box-shadow: 0 18px 50px -20px rgba(15,23,42,0.34), 0 4px 14px -6px rgba(15,23,42,0.12); }
        .csv-tip-head { display: flex; align-items: center; gap: 8px; margin-bottom: 11px; }
        .csv-tip-dot { width: 9px; height: 9px; border-radius: 3px; background: linear-gradient(135deg,#e9b6a6,#d6806a); box-shadow: 0 2px 6px rgba(214,128,106,0.45); }
        .csv-tip-name { font-size: 12.5px; font-weight: 600; color: #0f172a; letter-spacing: -0.01em; }
        .csv-tip-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b; margin-bottom: 6px; }
        .csv-tip-row b { font-weight: 600; }
        .csv-tip-share { margin-top: 4px; padding-top: 10px; border-top: 1px solid #f1f5f9; }
        .csv-tip-share-top { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
        .csv-tip-share-top b { color: #475569; font-weight: 600; }
        .csv-tip-bar { height: 6px; border-radius: 999px; background: #f7ece7; overflow: hidden; }
        .csv-tip-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#e9b6a6,#d6806a); }
      `}</style>

      {/* ── Value-at-risk strip (NEW dimension: is the value healthy?) ── */}
      <ValueAtRiskPanel risk={risk} animate={animate} region={region} />

      {/* ── Breakdown (interactive) + Cost-vs-MRP headroom ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="csv-card xl:col-span-8 rounded-3xl bg-white" style={{ animationDelay: "420ms", boxShadow: PANEL_SHADOW }}>
          <div className="px-6 pt-5 pb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Stock value breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">by {mode.label.toLowerCase()} · {region}</p>
            </div>
            <div className="flex items-center gap-0.5 p-1 rounded-full" style={{ background: "#efe9df" }}>
              {GROUP_MODES.map((m) => (
                <button key={m.key} onClick={() => setMode(m)} className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
                  style={mode.key === m.key ? { background: "#fff", color: CORAL, boxShadow: "0 2px 6px rgba(214,128,106,0.18)" } : { background: "transparent", color: "#9a8f80" }}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="px-5 pb-5 pt-1">
            {loading ? (
              <div className="space-y-2.5 py-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <div className="w-[150px] h-3 rounded bg-gray-100 animate-pulse" />
                    <div className="h-5 rounded-lg bg-gray-100 animate-pulse" style={{ width: `${82 - i * 6}%` }} />
                  </div>
                ))}
              </div>
            ) : barRows.length ? (
              <div className="csv-bars">
                {barRows.map((r, i) => (
                  <div key={mode.key + i} className="csv-bar-row group">
                    <div className="csv-bar-label" title={r.name}>{r.name}</div>
                    <div className="csv-bar-track">
                      <div className="csv-bar-fill" style={{ width: animate ? `${Math.max(r.w, 1.6)}%` : "0%", transitionDelay: `${i * 45}ms` }} />
                    </div>
                    <div className="csv-bar-val">{inrAbbr(r.cost)}</div>
                    <div className={`csv-bar-pop ${i < 2 ? "below" : "above"}`}>
                      <div className="csv-tip">
                        <div className="csv-tip-head"><span className="csv-tip-dot" /><span className="csv-tip-name">{r.name}</span></div>
                        <div className="csv-tip-row"><span>Cost value</span><b style={{ color: "#3a352f" }}>{inrAbbr(r.cost)}</b></div>
                        <div className="csv-tip-row"><span>MRP value</span><b style={{ color: "#5ea38f" }}>{inrAbbr(r.mrp)}</b></div>
                        <div className="csv-tip-row"><span>Quantity</span><b style={{ color: "#0f172a" }}>{numAbbr(r.qty)}</b></div>
                        <div className="csv-tip-row"><span>Cost → MRP markup</span><b style={{ color: "#d6806a" }}>+{r.markup.toFixed(0)}%</b></div>
                        <div className="csv-tip-share"><div className="csv-tip-share-top"><span>Share of total value</span><b>{r.share.toFixed(1)}%</b></div><div className="csv-tip-bar"><div className="csv-tip-bar-fill" style={{ width: `${Math.min(r.share, 100)}%` }} /></div></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="py-24 text-center text-gray-400 text-sm">No data.</div>}
          </div>
        </div>

        {/* Cost vs MRP headroom — distinct insight */}
        <div className="csv-card xl:col-span-4 rounded-3xl bg-white p-5 flex flex-col" style={{ animationDelay: "500ms", boxShadow: PANEL_SHADOW }}>
          <h3 className="text-[15px] font-semibold text-gray-900">Cost vs MRP</h3>
          <p className="text-xs text-gray-400 mt-0.5">markup headroom · top categories</p>
          <div className="flex items-center gap-4 mt-2 mb-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ACCENT }} />Cost</span>
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#f4e7e0" }} />MRP headroom</span>
          </div>
          <div className="space-y-3.5 flex-1">
            {costMrp.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700 truncate pr-2">{c.name}</span>
                  <span className="text-[11px] font-semibold tabular-nums flex-shrink-0" style={{ color: INK }}>+{c.markup.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative h-5 rounded-md overflow-hidden flex-1" style={{ background: "#f6ece7" }}>
                    <div className="absolute inset-y-0 left-0 rounded-md transition-all duration-700" style={{ width: animate ? `${c.mrpPct}%` : "0%", background: "#f4e7e0" }} />
                    <div className="absolute inset-y-0 left-0 rounded-md transition-all duration-700" style={{ width: animate ? `${c.costPct}%` : "0%", background: ACCENT }} />
                    {c.costPct > 28 && <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-white tabular-nums">{inrAbbr(c.cost)}</span>}
                  </div>
                  {c.costPct <= 28 && <span className="text-[10px] font-medium text-gray-500 tabular-nums flex-shrink-0 w-[52px] text-right">{inrAbbr(c.cost)}</span>}
                </div>
              </div>
            ))}
            {!costMrp.length && <div className="py-16 text-center text-gray-400 text-sm">No data.</div>}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "580ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">SKU-level detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="current-stock-value" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
