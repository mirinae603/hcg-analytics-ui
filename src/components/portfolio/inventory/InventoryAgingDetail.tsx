"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbGauge, TbHourglassHigh, TbFilter, TbSnowflake, TbLayoutGrid, TbChartDots } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
// ── Cool "sage & slate" palette. The aging gradient grows out of the theme's own
//    sage-teal (fresh) and drifts to warm coral (aged): the colour ages as stock does. ──
const MIST = "#EDF2EF";
const TEAL = "#4f9485";
const INK = "#2c3a36";
const SUBTLE = "#7c8a84";
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
const CARD_SHADOW = "0 14px 38px -20px rgba(44,58,54,0.22), 0 2px 8px -4px rgba(44,58,54,0.06)";
const PANEL_SHADOW = "0 12px 34px -22px rgba(44,58,54,0.16), 0 2px 7px -4px rgba(44,58,54,0.05)";
const CARD_MIN = 256;
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 150 + delay); return () => clearTimeout(t); }, [delay]); return on; };

// ── Semantic aging gradient: sage-teal (fresh) → warm coral (aged). ──
const BANDS = [
  { key: "0-30", bar: "#7cbda7", rgb: [124, 189, 167], grad: "linear-gradient(90deg,#9ed0bf,#7cbda7)", label: "0–30 days", short: "0–30d", mid: 15 },
  { key: "31-90", bar: "#a8cf8d", rgb: [168, 207, 141], grad: "linear-gradient(90deg,#c2dcab,#a8cf8d)", label: "31–90 days", short: "31–90d", mid: 60 },
  { key: "91-180", bar: "#e0c885", rgb: [224, 200, 133], grad: "linear-gradient(90deg,#ecd9a4,#e0c885)", label: "91–180 days", short: "91–180d", mid: 135 },
  { key: "181-365", bar: "#e6ab84", rgb: [230, 171, 132], grad: "linear-gradient(90deg,#eec3a3,#e6ab84)", label: "181–365 days", short: "181–365d", mid: 270 },
  { key: "365+", bar: "#d6806a", rgb: [214, 128, 106], grad: "linear-gradient(90deg,#e4a690,#d6806a)", label: "365+ days", short: "365d+", mid: 540 },
];
const bandOf = (k: string) => BANDS.find((b) => b.key === k) || BANDS[0];
const RAIL = "linear-gradient(90deg,#7cbda7 0%,#a8cf8d 28%,#e0c885 55%,#e6ab84 78%,#d6806a 100%)";

// Card frame with a signature aging-gradient hairline at the very top — ties the four together.
function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-white flex flex-col transition-all duration-300 hover:-translate-y-1" style={{ minHeight: CARD_MIN, boxShadow: CARD_SHADOW }}>
      <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: RAIL, opacity: 0.85 }} />
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
function Chip({ text, color, dir }: { text: string; color: string; dir?: "up" | "flat" }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${color}15`, color }}>
      {dir === "up" && <span style={{ fontSize: 9 }}>▲</span>}{text}
    </span>
  );
}

// polar / arc helpers for the gauge
const polar = (cx: number, cy: number, r: number, deg: number) => { const a = (deg * Math.PI) / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r, a0); const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0; const sweep = a1 > a0 ? 0 : 1;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// CARD 1 — Freshness gauge (semicircle + animated needle), fresh value as sub-metric
function FreshnessGauge({ score, freshVal, total }: { score: number; freshVal: number; total: number }) {
  const on = useMount(0);
  const s = Math.max(0, Math.min(100, score));
  const ang = (v: number) => 180 - 1.8 * v;
  const zones = [{ a: 0, b: 50, c: "#d6806a" }, { a: 50, b: 70, c: "#e0c885" }, { a: 70, b: 100, c: "#7cbda7" }];
  const word = s >= 70 ? "Healthy" : s >= 50 ? "Fair" : "At risk";
  const wc = s >= 70 ? TEAL : s >= 50 ? "#c79a4e" : "#d6806a";
  return (
    <Card>
      <Head icon={TbGauge} label="Freshness index" badge="≤90d share" color={TEAL} />
      <div className="mx-auto mt-3" style={{ width: 188 }}>
        <svg viewBox="0 0 200 104" width="188" style={{ display: "block" }}>
          <path d={arcPath(100, 92, 80, 180, 0)} fill="none" stroke="#eef2f0" strokeWidth="14" strokeLinecap="round" />
          {zones.map((z, i) => (
            <path key={i} d={arcPath(100, 92, 80, ang(z.a), ang(z.b))} fill="none" stroke={z.c} strokeWidth="14" strokeLinecap="round" opacity={on ? 1 : 0.2} style={{ transition: "opacity 0.7s ease" }} />
          ))}
          <text x="18" y="103" fontSize="9" fill="#aab4af" fontFamily={FONT} fontWeight="600">0</text>
          <text x="182" y="103" fontSize="9" fill="#aab4af" fontFamily={FONT} fontWeight="600" textAnchor="end">100</text>
          <g style={{ transformOrigin: "100px 92px", transform: on ? `rotate(${1.8 * s - 90}deg)` : "rotate(-90deg)", transition: "transform 1.5s cubic-bezier(0.34,1.12,0.64,1)" }}>
            <polygon points="100,30 96.5,92 103.5,92" fill={INK} />
            <circle cx="100" cy="92" r="6.5" fill={INK} />
            <circle cx="100" cy="92" r="2.8" fill="#fff" />
          </g>
        </svg>
      </div>
      <div className="flex items-baseline justify-center gap-1 -mt-2">
        <span className="text-[34px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={s} format={(n) => `${Math.round(n)}`} /></span>
        <span className="text-[14px] font-semibold text-gray-300">/ 100</span>
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
        <div className="pt-3">
          <div className="text-[11px] text-gray-400 leading-none">fresh value on hand</div>
          <div className="text-[13px] font-semibold tabular-nums mt-1" style={{ color: INK }}>{inrAbbr(freshVal)} <span className="text-[11px] font-normal text-gray-400">/ {inrAbbr(total)}</span></div>
        </div>
        <div className="pt-3"><Chip text={word} color={wc} /></div>
      </div>
    </Card>
  );
}

// CARD 2 — Average age plotted on a fresh→old rail, with the 90-day healthy threshold
function AgeSpectrumCard({ avgAge, total, skus }: { avgAge: number; total: number; skus: number }) {
  const on = useMount(120);
  const edges = [0, 30, 90, 180, 365, 430];
  const toPos = (age: number) => { for (let i = 0; i < 5; i++) { if (age <= edges[i + 1] || i === 4) { const seg = (age - edges[i]) / (edges[i + 1] - edges[i]); return Math.min(100, (i + Math.max(0, Math.min(1, seg))) * 20); } } return 100; };
  const pos = toPos(avgAge); const thr = toPos(90);
  const past = avgAge - 90;
  return (
    <Card>
      <Head icon={TbHourglassHigh} label="Average age" badge="value-weighted" color={TEAL} />
      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-[40px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={avgAge} format={(n) => `${Math.round(n)}`} /></span>
        <span className="text-[15px] font-semibold mb-1 text-gray-400">days</span>
      </div>
      <div className="mt-1.5 text-[12px] text-gray-400">{inrAbbr(total)} held across {skus.toLocaleString("en-IN")} SKUs</div>
      <div className="mt-auto pt-8">
        <div className="relative">
          {/* value marker (above rail) */}
          <div className="absolute -top-6 z-10 flex flex-col items-center" style={{ left: `${on ? pos : 0}%`, transform: "translateX(-50%)", transition: "left 1.3s cubic-bezier(0.34,1.12,0.64,1)" }}>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white tabular-nums shadow-sm" style={{ background: INK }}>{Math.round(avgAge)}d</span>
            <span className="w-0 h-0" style={{ borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `5px solid ${INK}` }} />
          </div>
          <div className="h-3 rounded-full" style={{ background: RAIL }} />
          {/* 90-day healthy threshold (below rail) */}
          <div className="absolute -bottom-0.5 flex flex-col items-center" style={{ left: `${thr}%`, transform: "translate(-50%,100%)" }}>
            <span className="w-px h-2" style={{ background: "#9aa6a0" }} />
            <span className="text-[8.5px] font-medium" style={{ color: "#9aa6a0" }}>90d</span>
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-gray-400 font-medium">
            <span>fresh</span><span /><span /><span /><span /><span>old</span>
          </div>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">vs 90-day healthy line</span>
          {past > 0 ? <Chip text={`${Math.round(past)}d over`} color="#c79a4e" dir="up" /> : <Chip text="within healthy" color={TEAL} dir="flat" />}
        </div>
      </div>
    </Card>
  );
}

// CARD 3 — Decay funnel: value settling through age bands, with share-of-total
function DecayFunnelCard({ buckets, total, agedOver180, agedPct }: { buckets: any[]; total: number; agedOver180: number; agedPct: number }) {
  const on = useMount(240);
  const max = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <Card>
      <Head icon={TbFilter} label="Value by age band" badge="decay" color="#cf9163" />
      <div className="mt-3.5 flex flex-col gap-[7px] flex-1 justify-center">
        {buckets.map((b, i) => {
          const w = Math.max(8, (b.value / max) * 100);
          const pct = total ? Math.round((b.value / total) * 100) : 0;
          return (
            <div key={b.key} className="flex items-center gap-2" title={`${bandOf(b.key).label}: ${inrAbbr(b.value)} (${pct}%)`}>
              <span className="text-[10px] text-gray-400 w-12 flex-shrink-0 tabular-nums">{bandOf(b.key).short}</span>
              <div className="flex-1 flex justify-center min-w-0">
                <div className="h-[19px] rounded-md flex items-center justify-center" style={{ width: on ? `${w}%` : "0%", background: bandOf(b.key).grad, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms`, boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)" }}>
                  {w > 38 && <span className="text-[9.5px] font-semibold text-white tabular-nums" style={{ textShadow: "0 1px 1px rgba(0,0,0,0.18)" }}>{inrAbbr(b.value)}</span>}
                </div>
              </div>
              <span className="text-[10px] font-semibold text-gray-500 w-9 flex-shrink-0 text-right tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">over 180 days</span>
        <span className="text-[12px] font-semibold tabular-nums" style={{ color: "#cf9163" }}>{inrAbbr(agedOver180)} · {Math.round(agedPct * 100)}%</span>
      </div>
    </Card>
  );
}

// CARD 4 — Frozen capital (365+) + cumulative fresh→old curve
function FrozenCard({ frozen, frozenPct, frozenSkus, oldest, cumPts }: { frozen: number; frozenPct: number; frozenSkus: number; oldest: number; cumPts: number[] }) {
  const on = useMount(360);
  const W = 240, H = 52;
  const data = cumPts.length > 1 ? cumPts : [0.5, 0.72, 0.85, 0.93, 1];
  const n = data.length;
  const x = (i: number) => (n <= 1 ? W : (i / (n - 1)) * W);
  const y = (p: number) => (H - 3) - p * (H - 9);
  const line = data.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const [ex, ey] = [x(n - 1), y(data[n - 1])];
  return (
    <Card>
      <Head icon={TbSnowflake} label="Frozen capital" badge="365+ days" color="#d6806a" />
      <div className="mt-3.5 text-[36px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={frozen} format={inrAbbr} /></div>
      <div className="mt-1.5 text-[13px] text-gray-500"><b style={{ color: "#d6806a" }}>{Math.round(frozenPct * 100)}%</b> of value stuck beyond a year</div>
      <div className="mt-auto pt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 54 }} preserveAspectRatio="none">
          <defs><linearGradient id="age-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9ed0bf" stopOpacity="0.5" /><stop offset="100%" stopColor="#e8f1ec" stopOpacity="0.03" /></linearGradient></defs>
          <path d={area} fill="url(#age-fill)" style={{ opacity: on ? 1 : 0, transition: "opacity 1s ease 0.3s" }} />
          <path d={line} fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ strokeDasharray: 600, strokeDashoffset: on ? 0 : 600, transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
          <circle cx={ex} cy={ey} r="3" fill={TEAL} style={{ opacity: on ? 1 : 0, transition: "opacity 0.4s ease 1.4s" }} />
        </svg>
        <div className="mt-2 pt-2.5 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 tabular-nums">{frozenSkus.toLocaleString("en-IN")} SKU lines</span>
          <span className="text-[11px] text-gray-400 tabular-nums">oldest {oldest.toLocaleString("en-IN")}d</span>
        </div>
      </div>
    </Card>
  );
}

// ── Category × Age heatmap — signature interactive chart ──
function CategoryHeatmap({ heat, region }: { heat: any; region: string }) {
  const [hov, setHov] = useState<{ ri: number; ci: number } | null>(null);
  const rgba = (rgb: number[], a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const hd = hov && heat.rows[hov.ri] ? { cat: heat.rows[hov.ri].name, band: BANDS[hov.ci], val: heat.rows[hov.ri].cells[hov.ci], catTotal: heat.rows[hov.ri].total } : null;
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "380ms", boxShadow: PANEL_SHADOW }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbLayoutGrid size={16} style={{ color: TEAL }} />Where the stock ages</h3>
          <p className="text-xs text-gray-400 mt-0.5">stock value · top categories × age band · {region}</p>
        </div>
        <div className="text-[11px] font-medium min-h-[18px]" style={{ color: hd ? INK : "#9aa6a0" }}>
          {hd ? <span>{hd.cat} · <b style={{ color: hd.band.bar }}>{hd.band.label}</b> — {inrAbbr(hd.val)} ({hd.catTotal ? Math.round((hd.val / hd.catTotal) * 100) : 0}% of category)</span>
            : <span className="inline-flex items-center gap-1.5">fresh <span className="w-16 h-2 rounded-full inline-block" style={{ background: RAIL }} /> aged · hover a cell</span>}
        </div>
      </div>

      {heat.rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            <div className="grid items-center gap-1.5 mb-1.5" style={{ gridTemplateColumns: "144px repeat(5,1fr) 112px" }}>
              <span />
              {BANDS.map((b) => <span key={b.key} className="text-[10.5px] font-semibold text-center" style={{ color: b.bar }}>{b.short}</span>)}
              <span className="text-[10.5px] font-semibold text-gray-400 text-right pr-1">Total</span>
            </div>
            {heat.rows.map((r: any, ri: number) => (
              <div key={ri} className="grid items-center gap-1.5 mb-1.5" style={{ gridTemplateColumns: "144px repeat(5,1fr) 112px" }}
                onMouseLeave={() => setHov((h) => (h && h.ri === ri ? null : h))}>
                <span className="text-[11.5px] font-medium truncate pr-1" title={r.name} style={{ color: hov?.ri === ri ? INK : "#5c6862" }}>{r.name}</span>
                {r.cells.map((v: number, ci: number) => {
                  const intensity = r.rowMax ? Math.sqrt(v / r.rowMax) : 0;
                  const active = hov?.ri === ri && hov?.ci === ci;
                  return (
                    <div key={ci} onMouseEnter={() => setHov({ ri, ci })}
                      className="h-9 rounded-lg flex items-center justify-center cursor-default transition-all"
                      style={{ background: rgba(BANDS[ci].rgb, 0.1 + 0.85 * intensity), transform: active ? "scale(1.07)" : "scale(1)", boxShadow: active ? "0 6px 16px -6px rgba(44,58,54,0.4)" : "none", outline: active ? `2px solid ${INK}` : "none", zIndex: active ? 5 : 1 }}>
                      {intensity > 0.42 && <span className="text-[10px] font-semibold tabular-nums" style={{ color: intensity > 0.6 ? "#fff" : "#5c5043" }}>{numAbbr(v)}</span>}
                    </div>
                  );
                })}
                <div className="flex items-center gap-1.5 justify-end pr-1">
                  <div className="h-2 rounded-full flex-shrink-0" style={{ width: `${Math.max(5, (r.total / heat.maxTotal) * 28)}px`, background: TEAL }} />
                  <span className="text-[10px] font-semibold text-gray-600 tabular-nums text-right whitespace-nowrap">{inrAbbr(r.total)}</span>
                </div>
              </div>
            ))}
            <div className="grid items-center gap-1.5 mt-2 pt-2 border-t border-gray-100" style={{ gridTemplateColumns: "144px repeat(5,1fr) 112px" }}>
              <span className="text-[10.5px] font-semibold text-gray-400">Band total</span>
              {heat.bandTotals.map((t: number, i: number) => <span key={i} className="text-[10px] font-semibold text-center tabular-nums" style={{ color: BANDS[i].bar }}>{inrAbbr(t)}</span>)}
              <span />
            </div>
          </div>
        </div>
      ) : <div className="py-16 text-center text-gray-400 text-sm">No data.</div>}
    </div>
  );
}

// ── SKU risk map — large, readable bubble scatter: age vs value, sized by quantity ──
function SkuScatter({ skus, region }: { skus: any[]; region: string }) {
  const on = useMount(120);
  const [hi, setHi] = useState<number | null>(null);
  const W = 920, H = 420, padL = 70, padR = 26, padT = 24, padB = 46;
  const model = useMemo(() => {
    if (!skus.length) return null;
    const vals = skus.map((s) => Math.max(1, Number(s.closing_stock_value ?? 0)));
    const lmin = Math.log10(Math.min(...vals)), lmax = Math.log10(Math.max(...vals));
    const qs = skus.map((s) => Math.max(1, Number(s.closing_stock_quantity ?? 0)));
    const qmax = Math.max(...qs);
    const yOf = (v: number) => padT + (lmax === lmin ? 0.5 : 1 - (Math.log10(v) - lmin) / (lmax - lmin)) * (H - padT - padB);
    const pts = skus.map((s, i) => {
      const age = Math.min(395, Math.max(0, Number(s.Aging ?? 0)));
      return { x: padL + (age / 400) * (W - padL - padR), y: yOf(vals[i]), r: 6 + Math.sqrt(qs[i] / qmax) * 20, age, v: vals[i], qty: qs[i], name: String(s["Material Name"] ?? ""), band: bandOf(String(s.aging_category)) };
    });
    // 4 value gridlines across the log range
    const yticks = Array.from({ length: 4 }, (_, k) => { const lv = lmin + (k / 3) * (lmax - lmin); return { y: yOf(Math.pow(10, lv)), label: inrAbbr(Math.pow(10, lv)) }; });
    return { pts, yticks };
  }, [skus]);
  const xT = (age: number) => padL + (Math.min(395, age) / 400) * (W - padL - padR);
  const ticks = [0, 30, 90, 180, 365];
  const hp = hi != null && model ? model.pts[hi] : null;
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "460ms", boxShadow: PANEL_SHADOW }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbChartDots size={16} style={{ color: TEAL }} />SKU risk map</h3>
          <p className="text-xs text-gray-400 mt-0.5">top 50 SKUs by value · age vs value · bubble size = quantity · {region}</p>
        </div>
        <div className="hidden sm:inline-flex items-center gap-2.5 text-[10.5px] font-medium text-gray-400">
          {BANDS.map((b) => <span key={b.key} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: b.bar }} />{b.short}</span>)}
        </div>
      </div>
      {model ? (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 8 }} onMouseLeave={() => setHi(null)}>
          {/* danger zone */}
          <rect x={xT(180)} y={padT} width={W - padR - xT(180)} height={H - padT - padB} fill="#d6806a" opacity="0.055" />
          <text x={W - padR - 8} y={padT + 15} textAnchor="end" fontSize="11" fill="#cf9163" fontFamily={FONT} fontWeight="700">aged · review zone</text>
          {/* y gridlines + value labels */}
          {model.yticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#f0f3f1" strokeWidth="1" />
              <text x={padL - 8} y={t.y + 3.5} textAnchor="end" fontSize="10" fill="#9aa6a0" fontFamily={FONT}>{t.label}</text>
            </g>
          ))}
          {/* x gridlines + labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={xT(t)} y1={padT} x2={xT(t)} y2={H - padB} stroke="#f0f3f1" strokeWidth="1" strokeDasharray={t === 180 ? "0" : "3 4"} />
              <text x={xT(t)} y={H - padB + 18} textAnchor="middle" fontSize="10.5" fill="#9aa6a0" fontFamily={FONT}>{t === 365 ? "365+" : t}</text>
            </g>
          ))}
          <text x={(padL + W - padR) / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={SUBTLE} fontFamily={FONT} fontWeight="600">inventory age (days) →</text>
          <text x={padL - 8} y={padT - 9} textAnchor="start" fontSize="11" fill={SUBTLE} fontFamily={FONT} fontWeight="600">↑ stock value</text>
          {/* bubbles */}
          {model.pts.map((p, i) => {
            const active = hi === i;
            return (
              <circle key={i} cx={p.x} cy={on ? p.y : H - padB} r={active ? p.r + 2.5 : p.r}
                fill={p.band.bar} fillOpacity={active ? 0.95 : 0.6} stroke={active ? INK : "#fff"} strokeWidth={active ? 2 : 1}
                style={{ transition: `cy 0.9s cubic-bezier(0.34,1.12,0.64,1) ${i * 11}ms, r 0.15s ease, fill-opacity 0.15s ease`, cursor: "pointer" }}
                onMouseEnter={() => setHi(i)} />
            );
          })}
          {/* tooltip */}
          {hp && (() => {
            const tw = 230, th = 56; let tx = hp.x + 14; let ty = hp.y - th - 8;
            if (tx + tw > W - padR) tx = hp.x - tw - 14; if (ty < padT) ty = hp.y + 12;
            const nm = hp.name.length > 30 ? hp.name.slice(0, 29) + "…" : hp.name;
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={tx} y={ty} width={tw} height={th} rx="9" fill={INK} opacity="0.96" />
                <circle cx={tx + 13} cy={ty + 16} r="4" fill={hp.band.bar} />
                <text x={tx + 23} y={ty + 19} fontSize="11.5" fontWeight="700" fill="#fff" fontFamily={FONT}>{nm}</text>
                <text x={tx + 13} y={ty + 39} fontSize="11" fill="#cdd8d3" fontFamily={FONT}>{hp.age}d in stock · {hp.band.label}</text>
                <text x={tx + tw - 12} y={ty + 39} textAnchor="end" fontSize="11.5" fontWeight="700" fill="#fff" fontFamily={FONT}>{inrAbbr(hp.v)} · {numAbbr(hp.qty)}u</text>
              </g>
            );
          })()}
        </svg>
      ) : <div className="py-16 text-center text-gray-400 text-sm">No data.</div>}
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "material_group", label: "Category" }, { field: "aging_days", label: "Aging (days)", kind: "num" as const },
  { field: "aging_category", label: "Bucket" }, { field: "closing_stock_quantity", label: "Qty", kind: "num" as const },
  { field: "closing_stock_value", label: "Value", kind: "inr" as const },
];

export default function InventoryAgingDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [summary, setSummary] = useState<any>({});
  const [bucketData, setBucketData] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/inventory-aging/summary?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((s) => setSummary(s || {})).catch(() => {});
    const bp = new URLSearchParams({ Plant: region, group_by: "aging_bucket", measures: "stock_value,stock_qty,sku_count" });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/aging-distribution?${bp}`).then((r) => r.json()).then((d) => setBucketData(Array.isArray(d) ? d : [])).catch(() => setBucketData([]));
    const mp = new URLSearchParams({ Plant: region, group_by: "material_group,aging_bucket", measures: "stock_value" });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/aging-distribution?${mp}`).then((r) => r.json()).then((d) => setMatrix(Array.isArray(d) ? d : [])).catch(() => setMatrix([]));
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/inventory-aging?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setSkus(Array.isArray(d) ? d : [])).catch(() => setSkus([]));
  }, [region]);

  const catName = (g: string) => String(g).replace(/^M\d+-/, "");

  const prof = useMemo(() => {
    const order = ["0-30", "31-90", "91-180", "181-365", "365+"];
    const m: Record<string, any> = {}; bucketData.forEach((a) => { m[a.aging_bucket] = a; });
    const buckets = order.map((k) => ({ key: k, value: Number(m[k]?.stock_value ?? 0), qty: Number(m[k]?.stock_qty ?? 0), skus: Number(m[k]?.sku_count ?? 0) }));
    const total = buckets.reduce((s, b) => s + b.value, 0) || 0;
    const val = (k: string) => buckets.find((b) => b.key === k)?.value ?? 0;
    const skuTotal = buckets.reduce((s, b) => s + b.skus, 0);
    const wAge = total ? buckets.reduce((s, b) => s + b.value * bandOf(b.key).mid, 0) / total : 0;
    let cum = 0; const cumPts = buckets.map((b) => { cum += b.value; return total ? cum / total : 0; });
    const agedOver180 = val("181-365") + val("365+");
    return {
      buckets, total, skuTotal, wAge, cumPts,
      freshVal: val("0-30") + val("31-90"),
      freshPct: total ? (val("0-30") + val("31-90")) / total : 0,
      frozen: val("365+"), frozenPct: total ? val("365+") / total : 0,
      frozenSkus: buckets.find((b) => b.key === "365+")?.skus ?? 0,
      agedOver180, agedPct: total ? agedOver180 / total : 0,
    };
  }, [bucketData]);

  const oldest = useMemo(() => skus.reduce((mx, s) => Math.max(mx, Number(s.Aging ?? 0)), 0), [skus]);

  const heat = useMemo(() => {
    const bands = ["0-30", "31-90", "91-180", "181-365", "365+"];
    const by: Record<string, Record<string, number>> = {};
    matrix.forEach((r) => { const g = String(r.material_group); by[g] = by[g] || {}; by[g][r.aging_bucket] = (by[g][r.aging_bucket] || 0) + Number(r.stock_value ?? 0); });
    let rows = Object.entries(by).map(([g, m]) => { const cells = bands.map((b) => m[b] || 0); const total = cells.reduce((s, v) => s + v, 0); return { name: catName(g), cells, total, rowMax: Math.max(...cells, 1) }; });
    rows.sort((a, b) => b.total - a.total); rows = rows.slice(0, 10);
    const maxTotal = Math.max(...rows.map((r) => r.total), 1);
    const bandTotals = bands.map((_, i) => rows.reduce((s, r) => s + r.cells[i], 0));
    return { rows, maxTotal, bandTotals };
  }, [matrix]);

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Inventory Aging" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 csv-cards">
        <div className="csv-card" style={{ animationDelay: "0ms" }}><FreshnessGauge score={prof.freshPct * 100} freshVal={prof.freshVal} total={prof.total} /></div>
        <div className="csv-card" style={{ animationDelay: "100ms" }}><AgeSpectrumCard avgAge={prof.wAge} total={prof.total} skus={Number(summary?.material?.distinct ?? prof.skuTotal)} /></div>
        <div className="csv-card" style={{ animationDelay: "200ms" }}><DecayFunnelCard buckets={prof.buckets} total={prof.total} agedOver180={prof.agedOver180} agedPct={prof.agedPct} /></div>
        <div className="csv-card" style={{ animationDelay: "300ms" }}><FrozenCard frozen={prof.frozen} frozenPct={prof.frozenPct} frozenSkus={prof.frozenSkus} oldest={oldest} cumPts={prof.cumPts} /></div>
      </div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .csv-cards > .csv-card { min-width: 0; }
        .csv-cards > .csv-card > * { height: 100%; }
      `}</style>

      <CategoryHeatmap heat={heat} region={region} />
      <SkuScatter skus={skus} region={region} />

      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "560ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">SKU-level aging detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="inventory-aging" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
