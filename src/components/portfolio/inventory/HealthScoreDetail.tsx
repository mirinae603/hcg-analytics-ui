"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbActivityHeartbeat, TbShieldCheck, TbAlertTriangle, TbActivity, TbRadar2, TbReportMedical } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
// ── "Vitals / diagnostic" palette — cool teal-cyan chrome. Distinct from Stock-Value
//    (cream), Aging (sage), DOH (indigo), Aging-Dist (plum). Tier colours follow a
//    grade gradient: Healthy emerald → Watch amber → At-Risk coral. ──
const MIST = "#ECF3F3";
const TEAL = "#2f8f96";
const INK = "#243b3e";
const SUBTLE = "#6f8587";
const T_HEALTHY = "#5bb98c", T_WATCH = "#e0b568", T_RISK = "#d6806a";
const TIER_META: Record<string, { c: string; soft: string }> = {
  "Healthy": { c: T_HEALTHY, soft: "#e7f4ee" }, "Watch": { c: T_WATCH, soft: "#f8f1e2" }, "At Risk": { c: T_RISK, soft: "#f7e8e3" },
};
const SCORE_BANDS = ["#d6806a", "#e3a878", "#e0c885", "#9cc88f", "#5bb98c"]; // 0-20 … 80-100
const SPECTRUM = "linear-gradient(90deg,#d6806a,#e0c885 50%,#5bb98c)";

const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
const numAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`; if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`; return `${Math.round(v)}`; };
const gradeOf = (s: number) => (s >= 80 ? "A" : s >= 60 ? "B" : s >= 45 ? "C" : s >= 30 ? "D" : "F");
const gradeColor = (s: number) => (s >= 80 ? T_HEALTHY : s >= 60 ? "#7cbf9c" : s >= 45 ? T_WATCH : s >= 30 ? "#e0976a" : T_RISK);
const gradeWord = (s: number) => (s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 45 ? "Fair" : s >= 30 ? "Poor" : "Critical");
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
const CARD_SHADOW = "0 14px 38px -20px rgba(36,59,62,0.22), 0 2px 8px -4px rgba(36,59,62,0.06)";
const PANEL_SHADOW = "0 12px 34px -22px rgba(36,59,62,0.16), 0 2px 7px -4px rgba(36,59,62,0.05)";
const CARD_MIN = 256;
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 150 + delay); return () => clearTimeout(t); }, [delay]); return on; };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-white flex flex-col transition-all duration-300 hover:-translate-y-1" style={{ minHeight: CARD_MIN, boxShadow: CARD_SHADOW }}>
      <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: SPECTRUM, opacity: 0.9 }} />
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

// CARD 1 — Overall health grade: ring + letter grade + score-band distribution
function HealthGradeCard({ score, bands }: { score: number; bands: any[] }) {
  const on = useMount(0); const C = 2 * Math.PI * 33; const pct = Math.max(0, Math.min(score / 100, 1));
  const gc = gradeColor(score);
  const totalC = bands.reduce((s, b) => s + b.count, 0) || 1;
  return (
    <Card>
      <Head icon={TbActivityHeartbeat} label="Health score" badge="0–100" color={TEAL} />
      <div className="flex items-center gap-4 mt-4">
        <div className="relative w-[96px] h-[96px] flex-shrink-0">
          <svg className="w-[96px] h-[96px] -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="33" fill="none" stroke="#e8eeee" strokeWidth="8" />
            <circle cx="40" cy="40" r="33" fill="none" stroke={gc} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct) : C} style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.34,1.12,0.64,1)", filter: `drop-shadow(0 3px 7px ${gc}66)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[30px] font-black leading-none" style={{ color: gc }}>{gradeOf(score)}</span>
          </div>
        </div>
        <div>
          <div className="flex items-end gap-1">
            <span className="text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={score} format={(n) => `${Math.round(n)}`} /></span>
            <span className="text-[13px] font-semibold text-gray-300 mb-0.5">/100</span>
          </div>
          <div className="mt-1.5 text-[12px] font-medium" style={{ color: gc }}>{gradeWord(score)} health</div>
        </div>
      </div>
      <div className="mt-auto pt-5">
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {bands.map((b, i) => (
            <div key={i} title={`${b.label}: ${b.count.toLocaleString("en-IN")} SKUs`} style={{ width: on ? `${(b.count / totalC) * 100}%` : "0%", background: SCORE_BANDS[i], transition: `width 0.9s ease ${i * 70}ms` }} />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-gray-400 font-medium"><span>0</span><span>score distribution</span><span>100</span></div>
      </div>
    </Card>
  );
}

// CARD 2/3 — tier card (Healthy / At-Risk)
function TierCard({ tier, totalSkus, icon }: { tier: any; totalSkus: number; icon: any }) {
  const on = useMount(120); const meta = TIER_META[tier.tier]; const pctSku = totalSkus ? tier.count / totalSkus : 0;
  return (
    <Card>
      <Head icon={icon} label={tier.tier} badge={`score ${Math.round(tier.avg_score)}`} color={meta.c} />
      <div className="mt-4 text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={tier.value} format={inrAbbr} /></div>
      <div className="mt-1.5 text-[13px] text-gray-500"><b style={{ color: meta.c }}>{tier.count.toLocaleString("en-IN")}</b> SKUs · {Math.round(pctSku * 100)}% of portfolio</div>
      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400">share of SKUs</span>
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: meta.c }}>{Math.round(pctSku * 100)}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: meta.soft }}>
          <div className="h-full rounded-full" style={{ width: on ? `${pctSku * 100}%` : "0%", background: meta.c, transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
        <div className="mt-3 flex items-center gap-3 text-[10.5px] text-gray-400">
          <span>aging <b style={{ color: INK }}>{Math.round(tier.avg_aging)}d</b></span>
          <span>moving <b style={{ color: INK }}>{Math.round(tier.moving_pct * 100)}%</b></span>
        </div>
      </div>
    </Card>
  );
}

// CARD 4 — key diagnostic: movement is the dominant health driver
function DiagnosticCard({ movingPct, freshPct, tiers }: { movingPct: number; freshPct: number; tiers: any[] }) {
  const on = useMount(240);
  const risk = tiers.find((t) => t.tier === "At Risk");
  const drivers = [
    { label: "Movement", v: movingPct, hint: `${Math.round((risk?.moving_pct ?? 0) * 100)}% of at-risk SKUs move` },
    { label: "Freshness", v: freshPct, hint: "≤90 days aging" },
  ];
  return (
    <Card>
      <Head icon={TbActivity} label="Vital signs" badge="drivers" color={TEAL} />
      <div className="mt-3.5 text-[15px] font-semibold" style={{ color: INK }}>Movement is the weak vital</div>
      <div className="mt-1 text-[11.5px] text-gray-400 leading-snug">most SKUs never turn over, which caps the score</div>
      <div className="mt-auto pt-5 space-y-3">
        {drivers.map((d, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11.5px] font-medium text-gray-600">{d.label}</span>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: d.v < 0.3 ? T_RISK : d.v < 0.6 ? T_WATCH : T_HEALTHY }}>{Math.round(d.v * 100)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#e8eeee" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${d.v * 100}%` : "0%", background: d.v < 0.3 ? T_RISK : d.v < 0.6 ? T_WATCH : T_HEALTHY, transition: `width 1.1s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms` }} />
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">{d.hint}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Health radar — tier profiles across the score drivers (signature) ──
const AXES = [
  { key: "fresh", label: "Freshness", of: (t: any) => Math.max(0, Math.min(1, 1 - t.avg_aging / 365)) },
  { key: "turn", label: "Turnover", of: (t: any) => Math.max(0, Math.min(1, t.avg_turnover / 6)) },
  { key: "move", label: "Movement", of: (t: any) => Math.max(0, Math.min(1, t.moving_pct)) },
  { key: "score", label: "Score", of: (t: any) => Math.max(0, Math.min(1, t.avg_score / 100)) },
];
function HealthRadar({ tiers, region }: { tiers: any[]; region: string }) {
  const on = useMount(120);
  const W = 360, cx = 180, cy = 160, R = 116;
  const ang = (i: number) => (-90 + (i * 360) / AXES.length) * (Math.PI / 180);
  const pt = (i: number, v: number) => [cx + R * v * Math.cos(ang(i)), cy + R * v * Math.sin(ang(i))];
  const series = ["Healthy", "Watch", "At Risk"].map((name) => {
    const t = tiers.find((x) => x.tier === name); if (!t) return null;
    const vals = AXES.map((a) => a.of(t));
    return { name, c: TIER_META[name].c, poly: vals.map((v, i) => pt(i, on ? v : 0).map((n) => n.toFixed(1)).join(",")).join(" ") };
  }).filter(Boolean) as any[];
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: "380ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbRadar2 size={16} style={{ color: TEAL }} />Health driver profile</h3>
      <p className="text-xs text-gray-400 mt-0.5">why each tier scores the way it does · {region}</p>
      <div className="flex-1 flex items-center justify-center mt-1">
        <svg viewBox={`0 0 ${W} 312`} width="100%" style={{ maxWidth: 380 }}>
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <polygon key={r} points={AXES.map((_, i) => pt(i, r).map((n) => n.toFixed(1)).join(",")).join(" ")} fill="none" stroke="#e5ecec" strokeWidth="1" />
          ))}
          {AXES.map((a, i) => { const [x, y] = pt(i, 1); const [lx, ly] = pt(i, 1.18); return (
            <g key={a.key}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e5ecec" strokeWidth="1" />
              <text x={lx} y={ly + 4} textAnchor={Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end"} fontSize="11" fontWeight="600" fill={SUBTLE} fontFamily={FONT}>{a.label}</text>
            </g>
          ); })}
          {series.map((s) => (
            <polygon key={s.name} points={s.poly} fill={s.c} fillOpacity={s.name === "At Risk" ? 0.16 : 0.22} stroke={s.c} strokeWidth="2"
              style={{ transition: "all 1s cubic-bezier(0.34,1.12,0.64,1)" }} />
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-center gap-4 mt-1">
        {series.map((s) => <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.c }} />{s.name}</span>)}
      </div>
    </div>
  );
}

// ── Tier scorecard — exact numbers per classification ──
function TierScorecard({ tiers, totalSkus, totalValue, region }: { tiers: any[]; totalSkus: number; totalValue: number; region: string }) {
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: "440ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbReportMedical size={16} style={{ color: TEAL }} />Classification scorecard</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">tier breakdown with the vitals behind each · {region}</p>
      <div className="space-y-3 flex-1">
        {tiers.map((t, i) => { const meta = TIER_META[t.tier]; const pctV = totalValue ? t.value / totalValue : 0; const pctS = totalSkus ? t.count / totalSkus : 0; return (
          <div key={i} className="rounded-2xl p-4" style={{ background: meta.soft }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-black" style={{ background: "#fff", color: meta.c }}>{gradeOf(t.avg_score)}</span>
                <div>
                  <div className="text-[14px] font-bold" style={{ color: INK }}>{t.tier}</div>
                  <div className="text-[11px] text-gray-500">{t.count.toLocaleString("en-IN")} SKUs · {Math.round(pctS * 100)}%</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[16px] font-bold tabular-nums" style={{ color: INK }}>{inrAbbr(t.value)}</div>
                <div className="text-[11px] text-gray-400">{Math.round(pctV * 100)}% of value</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white">
              {[{ k: "Avg score", v: `${Math.round(t.avg_score)}` }, { k: "Avg aging", v: `${Math.round(t.avg_aging)}d` }, { k: "Moving", v: `${Math.round(t.moving_pct * 100)}%` }].map((m, k) => (
                <div key={k}>
                  <div className="text-[10px] text-gray-400">{m.k}</div>
                  <div className="text-[13px] font-bold tabular-nums" style={{ color: meta.c }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        ); })}
        {!tiers.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

// ── Category report card — graded categories with tier mix ──
function CategoryReportCard({ cats, region }: { cats: any[]; region: string }) {
  const on = useMount(160);
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "520ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbReportMedical size={16} style={{ color: TEAL }} />Category report card</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">average health grade + tier mix by category · {region}</p>
      <div className="space-y-3">
        {cats.map((c, i) => {
          const totalMix = c.mix.healthy + c.mix.watch + c.mix.atrisk || 1;
          const gc = gradeColor(c.avg_score);
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black flex-shrink-0" style={{ background: `${gc}1c`, color: gc }}>{gradeOf(c.avg_score)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12.5px] font-medium text-gray-700 truncate pr-2">{c.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-gray-400 tabular-nums">{inrAbbr(c.value)}</span>
                    <span className="text-[12px] font-bold tabular-nums w-7 text-right" style={{ color: gc }}>{Math.round(c.avg_score)}</span>
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden" style={{ background: "#eef2f2" }}>
                  {[{ n: c.mix.healthy, col: T_HEALTHY }, { n: c.mix.watch, col: T_WATCH }, { n: c.mix.atrisk, col: T_RISK }].map((s, k) => (
                    <div key={k} title={`${s.n} SKUs`} style={{ width: on ? `${(s.n / totalMix) * 100}%` : "0%", background: s.col, transition: `width 0.8s ease ${i * 40 + k * 80}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {!cats.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
        {[["Healthy", T_HEALTHY], ["Watch", T_WATCH], ["At Risk", T_RISK]].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c as string }} />{l}</span>
        ))}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "material_group", label: "Category" }, { field: "health_score", label: "Score", kind: "num" as const },
  { field: "health_tier", label: "Tier" }, { field: "aging_days", label: "Aging", kind: "num" as const },
  { field: "turnover_annualized", label: "Turnover", kind: "num" as const },
];

export default function HealthScoreDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/inventory-health-score/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  const t = data?.totals || {};
  const tiers: any[] = data?.tiers || [];
  const catName = (g: string) => String(g).replace(/^M\d+-/, "");
  const cats = useMemo(() => (data?.categories || []).map((c: any) => ({ ...c, name: catName(c.name) })), [data]);
  const healthy = tiers.find((x) => x.tier === "Healthy") || { tier: "Healthy", count: 0, value: 0, avg_score: 0, avg_aging: 0, moving_pct: 0 };
  const atRisk = tiers.find((x) => x.tier === "At Risk") || { tier: "At Risk", count: 0, value: 0, avg_score: 0, avg_aging: 0, moving_pct: 0 };

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Inventory Health Score" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 csv-cards">
        <div className="csv-card" style={{ animationDelay: "0ms" }}><HealthGradeCard score={Number(t.avg_score ?? 0)} bands={data?.bands || []} /></div>
        <div className="csv-card" style={{ animationDelay: "100ms" }}><TierCard tier={healthy} totalSkus={Number(t.total_skus ?? 0)} icon={TbShieldCheck} /></div>
        <div className="csv-card" style={{ animationDelay: "200ms" }}><TierCard tier={atRisk} totalSkus={Number(t.total_skus ?? 0)} icon={TbAlertTriangle} /></div>
        <div className="csv-card" style={{ animationDelay: "300ms" }}><DiagnosticCard movingPct={Number(t.moving_pct ?? 0)} freshPct={Number(t.fresh_pct ?? 0)} tiers={tiers} /></div>
      </div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .csv-cards > .csv-card { min-width: 0; }
        .csv-cards > .csv-card > * { height: 100%; }
      `}</style>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5"><HealthRadar tiers={tiers} region={region} /></div>
        <div className="xl:col-span-7"><TierScorecard tiers={tiers} totalSkus={Number(t.total_skus ?? 0)} totalValue={Number(t.total_value ?? 0)} region={region} /></div>
      </div>

      <CategoryReportCard cats={cats} region={region} />

      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "600ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">SKU-level health detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="inventory-health-score" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
