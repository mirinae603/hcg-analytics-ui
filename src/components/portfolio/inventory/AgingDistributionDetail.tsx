"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbScale, TbHourglassLow, TbTargetArrow, TbStack2, TbChartGridDots } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
// ── "Risk lens" palette — dusty plum chrome, distinct from Stock-Value (cream),
//    Aging (sage), and DOH (indigo). The fresh→risk DATA colours stay consistent
//    with the aging family (green → gold → coral) so the meaning reads across pages. ──
const MIST = "#F3F0F4";
const PLUM = "#8a6f93";
const INK = "#3a3340";
const SUBTLE = "#857d8a";
// fresh / aging / at-risk tiers
const FRESH = { key: "fresh", bar: "#7cbf9c", rgb: [124, 191, 156], label: "Fresh · ≤90d", grad: "linear-gradient(180deg,#9fd1b6,#7cbf9c)" };
const AGING = { key: "aging", bar: "#e0c885", rgb: [224, 200, 133], label: "Aging · 91–180d", grad: "linear-gradient(180deg,#ecd9a4,#e0c885)" };
const RISK = { key: "risk", bar: "#d6806a", rgb: [214, 128, 106], label: "At-risk · 180d+", grad: "linear-gradient(180deg,#e4a690,#d6806a)" };
const TIERS = [RISK, AGING, FRESH]; // stack order top→bottom (risk on top)
const SPECTRUM = "linear-gradient(90deg,#7cbf9c,#e0c885 50%,#d6806a)";

const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
const numAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`; if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`; return `${Math.round(v)}`; };
const pctStr = (x: number) => `${Math.round(x * 100)}%`;
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
const CARD_SHADOW = "0 14px 38px -20px rgba(58,51,64,0.22), 0 2px 8px -4px rgba(58,51,64,0.06)";
const PANEL_SHADOW = "0 12px 34px -22px rgba(58,51,64,0.16), 0 2px 7px -4px rgba(58,51,64,0.05)";
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
function Chip({ text, color }: { text: string; color: string }) {
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${color}15`, color }}>{text}</span>;
}

// CARD 1 — Fresh vs At-risk balance (the core "fresh vs risk" framing)
function BalanceCard({ fresh, aging, risk, total }: { fresh: number; aging: number; risk: number; total: number }) {
  const on = useMount(0);
  const fp = total ? fresh / total : 0, ap = total ? aging / total : 0, rp = total ? risk / total : 0;
  return (
    <Card>
      <Head icon={TbScale} label="Fresh vs at-risk" badge="value split" color={PLUM} />
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[36px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#5fa886" }}><CountUp value={fp * 100} format={(n) => `${Math.round(n)}%`} /></div>
          <div className="mt-1 text-[11px] font-medium" style={{ color: "#5fa886" }}>fresh ≤90 days</div>
        </div>
        <div className="text-right">
          <div className="text-[24px] leading-none font-bold tabular-nums tracking-tight" style={{ color: RISK.bar }}>{Math.round(rp * 100)}%</div>
          <div className="mt-1 text-[11px] font-medium" style={{ color: RISK.bar }}>at-risk</div>
        </div>
      </div>
      <div className="mt-auto pt-5">
        <div className="flex h-3.5 rounded-full overflow-hidden ring-1 ring-black/5">
          {[{ p: fp, c: FRESH.bar }, { p: ap, c: AGING.bar }, { p: rp, c: RISK.bar }].map((s, i) => (
            <div key={i} style={{ width: on ? `${s.p * 100}%` : "0%", background: s.c, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms` }} />
          ))}
        </div>
        <div className="flex justify-between mt-2.5">
          {[FRESH, AGING, RISK].map((t, i) => { const v = [fresh, aging, risk][i]; return (
            <div key={t.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: t.bar }} />
              <span className="text-[10.5px] text-gray-500 tabular-nums">{inrAbbr(v)}</span>
            </div>
          ); })}
        </div>
      </div>
    </Card>
  );
}

// CARD 2 — Stagnant inventory (>180d) — the KPI's reduction target
function StagnantCard({ value, count, total }: { value: number; count: number; total: number }) {
  const on = useMount(120); const pct = total ? value / total : 0;
  return (
    <Card>
      <Head icon={TbHourglassLow} label="Stagnant value" badge="180d+" color={RISK.bar} />
      <div className="mt-4 text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={value} format={inrAbbr} /></div>
      <div className="mt-1.5 text-[13px] text-gray-500"><b style={{ color: RISK.bar }}>{count.toLocaleString("en-IN")}</b> SKU-lines stuck past 180 days</div>
      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400">share of inventory value</span>
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: RISK.bar }}>{Math.round(pct * 100)}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#efe9ec" }}>
          <div className="h-full rounded-full" style={{ width: on ? `${Math.min(pct * 100, 100)}%` : "0%", background: RISK.grad, transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
        <div className="mt-3"><Chip text="reduce this" color={RISK.bar} /></div>
      </div>
    </Card>
  );
}

// CARD 3 — Worst-offender category (highest risk share)
function WorstCategoryCard({ cat }: { cat: any }) {
  const on = useMount(240); const C = 2 * Math.PI * 32; const pct = cat ? cat.riskPct : 0;
  return (
    <Card>
      <Head icon={TbTargetArrow} label="Most at-risk category" badge="risk %" color={PLUM} />
      <div className="flex items-center gap-4 mt-4">
        <div className="relative w-[88px] h-[88px] flex-shrink-0">
          <svg className="w-[88px] h-[88px] -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#f0e3e8" strokeWidth="9" />
            <circle cx="40" cy="40" r="32" fill="none" stroke={RISK.bar} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct) : C} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.15,0.64,1)" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[17px] font-bold tabular-nums" style={{ color: RISK.bar }}>{Math.round(pct * 100)}%</span></div>
        </div>
        <div className="min-w-0">
          <div className="text-[16px] font-bold leading-tight" style={{ color: INK }}>{cat?.name ?? "—"}</div>
          <div className="mt-1.5 text-[11px] text-gray-400">of its value is stagnant</div>
          <div className="mt-2.5"><Chip text={`${inrAbbr(cat?.risk ?? 0)} at risk`} color={RISK.bar} /></div>
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-gray-50">
        <div className="pt-2.5 text-[11px] text-gray-400">worst fresh-to-risk ratio among major categories</div>
      </div>
    </Card>
  );
}

// CARD 4 — Risk concentration (how few categories hold most stagnant value)
function ConcentrationCard({ nFor80, topShare, topName, totalRisk }: { nFor80: number; topShare: number; topName: string; totalRisk: number }) {
  const on = useMount(360);
  return (
    <Card>
      <Head icon={TbStack2} label="Risk concentration" badge="pareto" color={PLUM} />
      <div className="mt-4 flex items-end gap-2">
        <span className="text-[36px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={nFor80} format={(n) => `${Math.round(n)}`} /></span>
        <span className="text-[13px] text-gray-400 mb-1">categories</span>
      </div>
      <div className="mt-1.5 text-[13px] text-gray-500">hold <b style={{ color: PLUM }}>80%</b> of all stagnant value</div>
      <div className="mt-auto pt-5 space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500 truncate pr-2">{topName}</span>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: PLUM }}>{Math.round(topShare * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#ece6ef" }}>
            <div className="h-full rounded-full" style={{ width: on ? `${topShare * 100}%` : "0%", background: "linear-gradient(90deg,#a98bb0,#8a6f93)", transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)" }} />
          </div>
        </div>
        <div className="text-[11px] text-gray-400">total stagnant pool · <b style={{ color: INK }}>{inrAbbr(totalRisk)}</b></div>
      </div>
    </Card>
  );
}

// ── Marimekko — the signature "distribution chart": column width = category size,
//    column height split into fresh/aging/risk. Big + tall-coral = a big stagnant problem. ──
function Marimekko({ cols, grand, region }: { cols: any[]; grand: number; region: string }) {
  const on = useMount(80);
  const [hov, setHov] = useState<{ ci: number; ti: number } | null>(null);
  const hd = hov ? { col: cols[hov.ci], tier: TIERS[hov.ti] } : null;
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "380ms", boxShadow: PANEL_SHADOW }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbChartGridDots size={16} style={{ color: PLUM }} />Fresh-vs-risk distribution</h3>
          <p className="text-xs text-gray-400 mt-0.5">column width = category value · height = age mix · {region}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500">
          {[FRESH, AGING, RISK].map((t) => <span key={t.key} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.bar }} />{t.label.split(" · ")[0]}</span>)}
        </div>
      </div>
      <div className="mt-2 text-[11px] font-medium min-h-[18px]" style={{ color: hd ? INK : "#9a90a0" }}>
        {hd ? <span>{hd.col.name} · <b style={{ color: hd.tier.bar }}>{hd.tier.label.split(" · ")[0]}</b> — {inrAbbr(hd.col[hd.tier.key])} ({pctStr(hd.col.total ? hd.col[hd.tier.key] / hd.col.total : 0)} of category · {inrAbbr(hd.col.total)} total)</span>
          : <span>hover a block — widest columns are your biggest categories; tall coral = most stagnant</span>}
      </div>
      {cols.length ? (
        <>
          <div className="mt-3 flex w-full" style={{ height: 300 }} onMouseLeave={() => setHov(null)}>
            {cols.map((c, ci) => {
              const dim = hov && hov.ci !== ci;
              return (
                <div key={ci} className="flex flex-col" style={{ width: `${c.wPct}%`, borderRight: ci < cols.length - 1 ? `2px solid ${MIST}` : "none", opacity: dim ? 0.45 : 1, transition: "opacity 0.2s ease" }}>
                  {TIERS.map((t, ti) => {
                    const hp = c.total ? c[t.key] / c.total : 0;
                    const active = hov?.ci === ci && hov?.ti === ti;
                    return (
                      <div key={t.key} onMouseEnter={() => setHov({ ci, ti })}
                        className="relative flex items-center justify-center"
                        style={{ height: on ? `${hp * 100}%` : "0%", background: t.grad, transition: `height 0.9s cubic-bezier(0.34,1.1,0.64,1) ${ci * 30}ms`, boxShadow: active ? "inset 0 0 0 2px rgba(58,51,64,0.55)" : "inset 0 0 0 0.5px rgba(255,255,255,0.4)" }}>
                        {c.wPct > 9 && hp > 0.14 && <span className="text-[10px] font-semibold tabular-nums" style={{ color: ti === 2 ? "#2f5a47" : ti === 1 ? "#7a6326" : "#fff" }}>{Math.round(hp * 100)}%</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="flex w-full mt-1.5">
            {cols.map((c, ci) => (
              <div key={ci} className="text-center px-0.5" style={{ width: `${c.wPct}%` }}>
                <div className="text-[9.5px] font-semibold truncate" style={{ color: hov?.ci === ci ? INK : "#8a8290" }} title={c.name}>{c.wPct > 4 ? c.name : "·"}</div>
                <div className="text-[8.5px] text-gray-400 tabular-nums">{c.wPct > 7 ? inrAbbr(c.total) : ""}</div>
              </div>
            ))}
          </div>
        </>
      ) : <div className="py-20 text-center text-gray-400 text-sm">No data.</div>}
    </div>
  );
}

// ── Stagnant capital leaderboard — where to act to reduce stagnant inventory ──
function StagnantLeaderboard({ rows, region }: { rows: any[]; region: string }) {
  const on = useMount(160);
  const max = Math.max(...rows.map((r) => r.risk), 1);
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: "460ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbHourglassLow size={16} style={{ color: RISK.bar }} />Stagnant capital by category</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">value stuck past 180 days · with fresh-to-risk mix · {region}</p>
      <div className="space-y-3.5 flex-1">
        {rows.slice(0, 9).map((r, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] font-medium text-gray-700 truncate pr-2" title={r.name}>{r.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: INK }}>{inrAbbr(r.risk)}</span>
                <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded" style={{ background: `${RISK.bar}1c`, color: RISK.bar }}>{Math.round(r.riskPct * 100)}%</span>
              </div>
            </div>
            {/* stagnant bar */}
            <div className="h-2.5 rounded-full overflow-hidden mb-1" style={{ background: "#efe9ec" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.risk / max) * 100}%` : "0%", background: RISK.grad, transition: `width 0.9s ease ${i * 50}ms` }} />
            </div>
            {/* fresh→risk composition strip */}
            <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: "#f0edf2" }}>
              {[{ p: r.fresh / r.total, c: FRESH.bar }, { p: r.aging / r.total, c: AGING.bar }, { p: r.risk / r.total, c: RISK.bar }].map((s, k) => (
                <div key={k} style={{ width: on ? `${s.p * 100}%` : "0%", background: s.c, transition: `width 0.8s ease ${i * 50 + 200}ms` }} />
              ))}
            </div>
          </div>
        ))}
        {!rows.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material_group", label: "Category" }, { field: "aging_bucket", label: "Bucket" },
  { field: "stock_value", label: "Value", kind: "inr" as const }, { field: "stock_qty", label: "Qty", kind: "num" as const },
  { field: "sku_count", label: "SKUs", kind: "num" as const },
];

const TIER_OF: Record<string, string> = { "0-30": "fresh", "31-90": "fresh", "91-180": "aging", "181-365": "risk", "365+": "risk" };

export default function AgingDistributionDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [buckets, setBuckets] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any[]>([]);

  useEffect(() => {
    const bp = new URLSearchParams({ Plant: region, group_by: "aging_bucket", measures: "stock_value,stock_qty,sku_count" });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/aging-distribution?${bp}`).then((r) => r.json()).then((d) => setBuckets(Array.isArray(d) ? d : [])).catch(() => setBuckets([]));
    const mp = new URLSearchParams({ Plant: region, group_by: "material_group,aging_bucket", measures: "stock_value,sku_count" });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/aging-distribution?${mp}`).then((r) => r.json()).then((d) => setMatrix(Array.isArray(d) ? d : [])).catch(() => setMatrix([]));
  }, [region]);

  const catName = (g: string) => String(g).replace(/^M\d+-/, "");

  const totals = useMemo(() => {
    const t = { fresh: 0, aging: 0, risk: 0, total: 0, riskSkus: 0 };
    buckets.forEach((b) => {
      const tier = TIER_OF[b.aging_bucket]; const v = Number(b.stock_value ?? 0);
      t.total += v; if (tier) (t as any)[tier] += v;
      if (tier === "risk") t.riskSkus += Number(b.sku_count ?? 0);
    });
    return t;
  }, [buckets]);

  // per-category fresh/aging/risk composition
  const cats = useMemo(() => {
    const by: Record<string, any> = {};
    matrix.forEach((r) => {
      const g = String(r.material_group); const tier = TIER_OF[r.aging_bucket]; const v = Number(r.stock_value ?? 0);
      by[g] = by[g] || { name: catName(g), fresh: 0, aging: 0, risk: 0, total: 0, skus: 0 };
      by[g].total += v; if (tier) by[g][tier] += v; by[g].skus += Number(r.sku_count ?? 0);
    });
    return Object.values(by).map((c: any) => ({ ...c, riskPct: c.total ? c.risk / c.total : 0 }));
  }, [matrix]);

  // Marimekko columns: top 8 by total + Other
  const mekko = useMemo(() => {
    const grand = cats.reduce((s, c) => s + c.total, 0) || 1;
    const sorted = [...cats].sort((a, b) => b.total - a.total);
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    const cols = top.map((c) => ({ ...c, wPct: (c.total / grand) * 100 }));
    if (rest.length) {
      const o = rest.reduce((a, c) => ({ fresh: a.fresh + c.fresh, aging: a.aging + c.aging, risk: a.risk + c.risk, total: a.total + c.total }), { fresh: 0, aging: 0, risk: 0, total: 0 });
      cols.push({ name: `Other (${rest.length})`, ...o, riskPct: o.total ? o.risk / o.total : 0, wPct: (o.total / grand) * 100 });
    }
    return { cols, grand };
  }, [cats]);

  // worst-offender (highest risk% among meaningfully-sized categories)
  const worst = useMemo(() => {
    const floor = totals.total * 0.005;
    const eligible = cats.filter((c) => c.total > floor);
    return [...eligible].sort((a, b) => b.riskPct - a.riskPct)[0] || null;
  }, [cats, totals]);

  // stagnant leaderboard + concentration
  const leaderboard = useMemo(() => [...cats].filter((c) => c.risk > 0).sort((a, b) => b.risk - a.risk), [cats]);
  const conc = useMemo(() => {
    const totalRisk = leaderboard.reduce((s, c) => s + c.risk, 0) || 1;
    let cum = 0, n = leaderboard.length;
    for (let i = 0; i < leaderboard.length; i++) { cum += leaderboard[i].risk; if (cum / totalRisk >= 0.8) { n = i + 1; break; } }
    return { nFor80: n, topShare: leaderboard[0] ? leaderboard[0].risk / totalRisk : 0, topName: leaderboard[0]?.name ?? "—", totalRisk };
  }, [leaderboard]);

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Aging Distribution" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 csv-cards">
        <div className="csv-card" style={{ animationDelay: "0ms" }}><BalanceCard fresh={totals.fresh} aging={totals.aging} risk={totals.risk} total={totals.total} /></div>
        <div className="csv-card" style={{ animationDelay: "100ms" }}><StagnantCard value={totals.risk} count={totals.riskSkus} total={totals.total} /></div>
        <div className="csv-card" style={{ animationDelay: "200ms" }}><WorstCategoryCard cat={worst} /></div>
        <div className="csv-card" style={{ animationDelay: "300ms" }}><ConcentrationCard nFor80={conc.nFor80} topShare={conc.topShare} topName={conc.topName} totalRisk={conc.totalRisk} /></div>
      </div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .csv-cards > .csv-card { min-width: 0; }
        .csv-cards > .csv-card > * { height: 100%; }
      `}</style>

      <Marimekko cols={mekko.cols} grand={mekko.grand} region={region} />

      <StagnantLeaderboard rows={leaderboard} region={region} />

      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "560ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">Category × bucket detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="aging-distribution" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
