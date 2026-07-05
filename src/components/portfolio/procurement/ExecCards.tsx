"use client";
// Procurement executive cards — same design language / animation as the inventory
// home cards (tabbed gauge card + concentration donut + branded panel), teal/emerald.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CountUp, useMount, smoothPath } from "@/components/portfolio/kit";

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hexA = (hex: string, a: number) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return `rgba(${r},${g},${b},${a})`; };

export type Tab = {
  key: string; tab: string; label: string; value: number; fmt: (n: number) => string; suffix?: string;
  gauge: number; gaugeLabel: string; color: string; status: { text: string; color: string };
  stats: { value: string; label: string; color: string }[];
};

// ── Tabbed gauge card (clone of inventory StockLevelCard) ──
export function GaugeCard({ tabs, animated = true }: { tabs: Tab[]; animated?: boolean }) {
  const [active, setActive] = useState(0);
  const [dispVal, setDispVal] = useState(0);
  const [dispGauge, setDispGauge] = useState(0);
  const [opacity, setOpacity] = useState(animated ? 0 : 1);
  const [hover, setHover] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const cur = tabs[active] || tabs[0];

  // animate value + gauge on mount / data change
  useEffect(() => {
    if (!cur) return;
    setRefreshing(true);
    if (!animated) { setDispVal(cur.value); setDispGauge(cur.gauge); setOpacity(1); setRefreshing(false); return; }
    const dur = 2200, start = Date.now();
    let raf = 0;
    const run = () => { const e = Date.now() - start; const p = Math.min(e / dur, 1); const s = easeInOutCubic(p);
      setDispVal(cur.value * s); setDispGauge(cur.gauge * s); setOpacity(Math.min(s * 1.5, 1));
      if (p < 1) raf = requestAnimationFrame(run); else setRefreshing(false); };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cur?.value, cur?.gauge, animated]);

  // auto-cycle
  useEffect(() => {
    const t = setInterval(() => { if (!hover) setActive((a) => (a + 1) % tabs.length); }, 5000);
    return () => clearInterval(t);
  }, [hover, tabs.length]);

  if (!cur) return null;
  const C = 2 * Math.PI * 42;
  return (
    <div className="relative h-full">
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-700 ease-out cursor-pointer"
        style={{ background: "white", border: `1px solid ${cur.color}20`, boxShadow: hover ? `0 8px 32px ${cur.color}15` : `0 2px 8px ${cur.color}08`, transform: hover ? "scale(1.008)" : "scale(1)" }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        {refreshing && <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(45deg,transparent 30%,${cur.color}15 50%,transparent 70%)`, animation: "proc-sweep 2.2s ease-out" }} />}
        <div className="p-4 lg:p-6">
          <div className="flex space-x-1 bg-gray-50 rounded-lg p-1">
            {tabs.map((tb, i) => (
              <button key={tb.key} onClick={() => setActive(i)}
                className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-300 ${active === i ? "bg-white shadow-sm" : "hover:bg-white/50"}`}
                style={{ color: active === i ? tb.color : "#9CA3AF" }}>{tb.tab}</button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center mt-3">
            <div className="flex-1 w-full sm:w-auto">
              <div className="text-sm mb-1 font-medium" style={{ color: cur.color, opacity: 0.85 }}>{cur.label}</div>
              <div className="flex items-baseline space-x-1">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black leading-none" style={{ fontFamily: "'Poppins',sans-serif", opacity, color: cur.color }}>{cur.fmt(dispVal)}</div>
                {cur.suffix && <div className="text-sm sm:text-base font-medium" style={{ color: cur.color, opacity: opacity * 0.8 }}>{cur.suffix}</div>}
              </div>
              <div className="my-3 border-t" style={{ borderColor: cur.color + "20" }} />
              <div className="grid grid-cols-3 gap-3 text-xs">
                {cur.stats.map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="font-semibold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center mt-3 sm:mt-0 justify-center w-24 h-24 lg:w-32 lg:h-32 ml-0 sm:ml-4 lg:ml-6 self-center">
              <div className={`relative w-20 h-20 lg:w-24 lg:h-24 transition-transform duration-700 ${hover ? "scale-105" : ""}`}>
                <svg className="w-20 h-20 lg:w-24 lg:h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={cur.color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={`${C * (1 - dispGauge)}`} style={{ filter: `drop-shadow(0 2px 12px ${cur.color}25)`, opacity }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-base lg:text-lg font-bold" style={{ color: cur.color, opacity }}>{Math.round(dispGauge * 100)}%</span></div>
              </div>
              <div className="text-xs text-gray-500 text-center mt-1 sm:mt-2 hidden sm:block">{cur.gaugeLabel}</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="px-2 py-1 rounded-md flex items-center space-x-2" style={{ backgroundColor: hexA(cur.status.color, 0.15) }}>
              <div className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: cur.status.color }} />
              <span className="text-xs" style={{ color: cur.status.color }}>{cur.status.text}</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <div className={`h-full transition-all duration-500 ${hover ? "h-2.5" : ""}`} style={{ backgroundColor: cur.color, width: `${dispGauge * 100}%`, opacity: opacity * (hover ? 0.85 : 0.7), boxShadow: `0 0 12px ${cur.color}30`, borderRadius: "0 2px 0 0" }} />
        </div>
      </div>
      <style jsx>{`@keyframes proc-sweep { 0% { transform: translateX(-100%) skewX(-15deg); } 100% { transform: translateX(200%) skewX(-15deg); } }`}</style>
    </div>
  );
}

// ── Concentration donut (clone of inventory aging donut) ──
export function DonutCard({ label, headline, headSuffix, segments, centerLabel, insights, score, animated = true }: {
  label: string; headline: number; headSuffix?: string; centerLabel: string; score: { text: string; value: number; color: string };
  segments: { label: string; value: number; color: string }[]; insights: { label: string; value: string; color: string }[]; animated?: boolean;
}) {
  const total = useMemo(() => segments.reduce((s, x) => s + x.value, 0) || 1, [segments]);
  const [progress, setProgress] = useState(animated ? 0 : 1);
  const [disp, setDisp] = useState(animated ? 0 : headline);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!animated) { setProgress(1); setDisp(headline); return; }
    const dur = 2000, start = Date.now(); let raf = 0;
    const run = () => { const e = Date.now() - start; const t = Math.min(e / dur, 1); const s = easeInOutCubic(t); setProgress(s); setDisp(headline * s); if (t < 1) raf = requestAnimationFrame(run); };
    raf = requestAnimationFrame(run); return () => cancelAnimationFrame(raf);
  }, [headline, animated]);
  const R = 50, SW = 12, CIRC = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="relative w-full h-full flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-700 cursor-pointer"
      style={{ background: "linear-gradient(135deg,#fff 0%,#f8fafc 50%,#fff 100%)", boxShadow: hover ? "0 12px 34px rgba(20,40,35,0.12)" : "0 4px 24px rgba(0,0,0,0.04)", transform: hover ? "translateY(-2px)" : "none" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="relative p-4 sm:p-5 pb-2">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-gray-400 mb-2" style={{ fontFamily: "'Poppins',sans-serif" }}>{label}</h3>
            <div className="flex items-baseline space-x-2"><span className="text-lg sm:text-2xl font-semibold text-slate-500 tracking-tight tabular-nums">{disp >= 1e7 ? `₹${(disp / 1e7).toFixed(2)} Cr` : Math.round(disp).toLocaleString("en-IN")}</span>{headSuffix && <span className="text-xs text-slate-500 font-medium">{headSuffix}</span>}</div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-2.5 py-1 rounded-md text-xs font-medium border" style={{ backgroundColor: hexA(score.color, 0.08), color: score.color, borderColor: `${score.color}20` }}>{score.text}</div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: score.color }}>{score.value}</div>
          </div>
        </div>
      </div>
      <div className="relative px-4 sm:px-5 pb-4 flex-1 flex flex-col justify-center">
        <div className="flex flex-col lg:flex-row items-center lg:items-start">
          <div className="relative flex-shrink-0 mb-4 lg:mb-0 lg:mr-4">
            <div className="w-28 h-28 lg:w-32 lg:h-32">
              <svg width="100%" height="100%" viewBox="0 0 120 120" className="transform -rotate-90">
                <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
                {segments.map((seg, i) => { const pct = seg.value / total; const ang = pct * 360 * progress; const start = acc; acc += ang; if (ang < 1) return null;
                  const dash = `${(ang / 360) * CIRC} ${CIRC}`; const off = -(start / 360) * CIRC;
                  return <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={seg.color} strokeWidth={SW} strokeDasharray={dash} strokeDashoffset={off} strokeLinecap="round" style={{ filter: `drop-shadow(0 2px 4px ${seg.color}20)` }} />; })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: score.color }} /><div className="text-xs text-slate-600 font-medium">{centerLabel}</div></div></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row flex-1 w-full sm:space-x-4 lg:space-x-0 lg:space-y-4 xl:space-y-0 xl:space-x-4">
            <div className="flex-1 space-y-1.5">
              {segments.map((seg, i) => { const pct = total > 0 ? (seg.value / total) * 100 : 0; return (
                <div key={i}>
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} /><span className="text-xs font-medium text-slate-500 truncate">{seg.label}</span></div>
                    <span className="text-xs font-medium" style={{ color: seg.color }}>{pct.toFixed(1)}%</span>
                  </div>
                  {i !== segments.length - 1 && <div className="h-px bg-slate-200 my-0.5" />}
                </div>
              ); })}
            </div>
            <div className="flex-shrink-0">
              <div className="flex flex-row sm:flex-col items-center justify-center space-x-4 sm:space-x-0 sm:space-y-3 p-2 sm:p-3 rounded-2xl min-h-[60px] sm:min-h-[110px]" style={{ backgroundColor: "rgba(248,250,252,0.8)" }}>
                {insights.map((ins, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="w-px h-4 sm:w-4 sm:h-px bg-slate-200" />}
                    <div className="text-center"><div className="text-xs text-slate-500 mb-0.5">{ins.label}</div><div className="text-sm font-semibold" style={{ color: ins.color }}>{ins.value}</div></div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Branded panel (clone of inventory "Analytics KPI's") ──
export function BrandPanel({ title = "Procurement KPI's", subtitle = "Supply Chain", accent = "#0d9488" }: { title?: string; subtitle?: string; accent?: string }) {
  return (
    <div className="relative w-full h-full">
      <div className="absolute -top-6 -bottom-6 -left-6 -right-6 rounded-full animate-pulse opacity-20" style={{ background: "radial-gradient(circle, rgba(148,163,184,0.15) 0%, transparent 70%)", animationDuration: "4s" }} />
      <div className="relative group cursor-default h-full">
        <div className="absolute inset-0 rounded-[2rem] transform scale-95 group-hover:scale-100 transition-all duration-700 ease-out" style={{ background: `linear-gradient(90deg,${accent}18,${accent}10)` }} />
        <div className="relative h-full p-8 rounded-[2rem] transition-all duration-500 border overflow-hidden flex flex-col justify-center" style={{ background: "linear-gradient(135deg,rgba(248,250,252,0.6),rgba(241,245,244,0.35))", borderColor: "rgba(226,232,240,0.5)" }}>
          <div className="absolute top-3 right-2 w-10 h-10 opacity-15 group-hover:opacity-25 transition-opacity duration-500">
            <div className="w-full h-full border-2 rounded-full animate-spin" style={{ borderColor: accent, animationDuration: "20s" }} />
            <div className="absolute inset-2 border rounded-full animate-spin" style={{ borderColor: accent, animationDuration: "15s", animationDirection: "reverse" }} />
          </div>
          <div className="absolute top-3 left-2 w-10 h-10 opacity-15 group-hover:opacity-25 transition-opacity duration-500">
            <div className="w-full h-full border-2 rounded-full animate-spin" style={{ borderColor: accent, animationDuration: "20s" }} />
            <div className="absolute inset-2 border rounded-full animate-spin" style={{ borderColor: accent, animationDuration: "15s", animationDirection: "reverse" }} />
          </div>
          <div className="text-center relative z-10">
            <h1 className="text-4xl font-semibold transition-all duration-500 relative drop-shadow-sm" style={{ letterSpacing: "-0.02em", color: accent }}>
              {title}
              <div className="absolute -bottom-1 mt-2 left-1/2 -translate-x-1/2 w-8 h-0.5 group-hover:w-24 transition-all duration-700" style={{ background: `linear-gradient(90deg,${accent},${accent}aa)` }} />
            </h1>
            <div className="flex items-center justify-center space-x-3 py-4">
              <div className="w-6 h-px group-hover:w-12 transition-all duration-500" style={{ background: accent }} />
              <div className="relative"><div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} /><div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-0 group-hover:opacity-75" style={{ background: accent }} /></div>
              <div className="w-6 h-px group-hover:w-12 transition-all duration-500" style={{ background: accent }} />
            </div>
            <h2 className="text-sm mt-2 font-medium uppercase" style={{ letterSpacing: "0.25em", color: accent }}>{subtitle}</h2>
            <div className="flex justify-center mt-3 space-x-1.5">
              {[...Array(5)].map((_, i) => <div key={i} className="w-0.5 rounded-full" style={{ height: `${(i + 1) * 3}px`, background: accent, transitionDelay: `${i * 50}ms` }} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Spend-wave hero — headline floats over a luminous animated area wave (fintech style) ──
export function WaveHero({ eyebrow, icon: Icon, value, format, sub, pills = [], timeline = [], peakFmt }: {
  eyebrow: string; icon?: any; value: number; format: (n: number) => string; sub: string;
  pills?: { label: string; value: string }[]; timeline?: { label: string; value: number; month?: string }[]; peakFmt?: (n: number) => string;
}) {
  const on = useMount(0);
  const data = timeline || [];
  const W = 1000, H = 175, PADX = 46, PADT = 16, PADB = 30;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const vals = data.map((d) => d.value); const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const lo = min * 0.6, hi = max * 1.06, span = hi - lo || 1;
  const X = (i: number) => (data.length <= 1 ? W / 2 : PADX + (i / (data.length - 1)) * innerW);
  const Y = (v: number) => PADT + innerH - ((v - lo) / span) * innerH;
  const pts = data.map((d, i) => ({ x: X(i), y: Y(d.value) }));
  const line = data.length ? smoothPath(pts) : "";
  const area = data.length ? `${line} L ${X(data.length - 1).toFixed(1)} ${H} L ${X(0).toFixed(1)} ${H} Z` : "";
  const peakIdx = vals.length ? vals.indexOf(max) : -1;
  return (
    <div className="proc-card relative rounded-[28px] overflow-hidden" style={{ minHeight: 308, background: "linear-gradient(135deg,#04221a 0%,#073d2e 46%,#0a5a42 100%)", boxShadow: "0 24px 60px -28px rgba(6,40,30,0.72)", animationDelay: "0ms" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
      <div className="absolute rounded-full blur-[90px]" style={{ width: 340, height: 340, background: "#10b981", opacity: 0.3, top: -130, right: -30 }} />
      <div className="absolute rounded-full blur-[90px]" style={{ width: 240, height: 240, background: "#2dd4bf", opacity: 0.18, bottom: -90, left: 140 }} />

      <div className="relative z-10 p-8 lg:p-9">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.5)" }}>{Icon && <Icon size={14} />}{eyebrow}</div>
            <div className="mt-3 text-[54px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 6px 40px rgba(16,185,129,0.45)" }}><CountUp value={value} format={format} /></div>
            <div className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>{sub}</div>
          </div>
          <div className="flex gap-2.5">
            {pills.map((p, i) => (
              <div key={i} className="rounded-2xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)", backdropFilter: "blur(6px)" }}>
                <div className="text-[17px] font-bold tabular-nums leading-none" style={{ color: "#fff" }}>{p.value}</div>
                <div className="text-[10px] mt-1.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.6)" }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: 175 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
          <defs><linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity="0.42" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient></defs>
          {area && <path d={area} fill="url(#waveFill)" style={{ opacity: on ? 1 : 0, transition: "opacity 1s ease 0.3s" }} />}
          {line && <path d={line} fill="none" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} vectorEffect="non-scaling-stroke" style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)", filter: "drop-shadow(0 0 8px rgba(110,231,183,0.75))" }} />}
        </svg>
        {/* glowing dots + month labels (HTML overlay so they don't distort) */}
        {data.map((d, i) => (
          <div key={i} className="absolute" style={{ left: `${(X(i) / W) * 100}%`, top: `${(Y(d.value) / H) * 100}%`, transform: "translate(-50%,-50%)", opacity: on ? 1 : 0, transition: `opacity 0.5s ease ${0.7 + i * 0.08}s` }}>
            <div className="rounded-full" style={{ width: i === peakIdx ? 9 : 6, height: i === peakIdx ? 9 : 6, background: "#04221a", border: "2px solid #6ee7b7", boxShadow: i === peakIdx ? "0 0 12px #6ee7b7" : "none" }} />
          </div>
        ))}
        {data.map((d, i) => (
          <span key={i} className="absolute bottom-1.5 text-[11px] font-medium" style={{ left: `${(X(i) / W) * 100}%`, transform: "translateX(-50%)", color: i === peakIdx ? "#a7f3d0" : "rgba(255,255,255,0.5)", fontWeight: i === peakIdx ? 700 : 500 }}>{d.label}</span>
        ))}
        {peakIdx >= 0 && peakFmt && (
          <div className="absolute pointer-events-none" style={{ left: `${(X(peakIdx) / W) * 100}%`, top: `${(Y(data[peakIdx].value) / H) * 100}%`, transform: "translate(-50%,-150%)" }}>
            <div className="px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums whitespace-nowrap" style={{ background: "rgba(255,255,255,0.12)", color: "#eafff6", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}>{peakFmt(data[peakIdx].value)} · peak</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stacked "purchase stream" hero — layers of category spend flowing over months ──
export function StreamHero({ eyebrow, icon: Icon, value, format, sub, pills = [], matrix, topN = 5,
  gradient = "linear-gradient(135deg,#04231f 0%,#06463c 46%,#0a6e5e 100%)", glow = "#2dd4bf", colors = ["#34d399", "#2dd4bf", "#5eead4", "#6ee7b7", "#99f6e4"], shadow = "rgba(45,212,191,0.45)" }: {
  eyebrow: string; icon?: any; value: number; format: (n: number) => string; sub: string;
  pills?: { label: string; value: string }[]; matrix?: { labels: string[]; rows: { name: string; values: number[] }[] }; topN?: number;
  gradient?: string; glow?: string; colors?: string[]; shadow?: string;
}) {
  const on = useMount(0);
  const labels = matrix?.labels || [];
  const rows = (matrix?.rows || []).slice(0, topN);
  const n = labels.length;
  const W = 1000, H = 185, PADX = 46, PADT = 14, PADB = 30;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const X = (i: number) => (n <= 1 ? W / 2 : PADX + (i / (n - 1)) * innerW);
  const colTot = labels.map((_, j) => rows.reduce((s, r) => s + (r.values[j] || 0), 0));
  const max = Math.max(...colTot, 1) * 1.06;
  const Y = (v: number) => PADT + innerH - (v / max) * innerH;
  const CLR = colors;
  const clean = (s: string) => s.replace(/^M\d+-/, "");
  const cum = labels.map(() => 0);
  const bands = rows.map((r, k) => {
    const bottom = labels.map((_, j) => ({ x: X(j), y: Y(cum[j]) }));
    labels.forEach((_, j) => { cum[j] += (r.values[j] || 0); });
    const top = labels.map((_, j) => ({ x: X(j), y: Y(cum[j]) }));
    const botRev = [...bottom].reverse();
    const d = `${smoothPath(top)} ${smoothPath(botRev).replace(/^M/, "L")} Z`;
    return { d, color: CLR[k % CLR.length], name: clean(r.name) };
  });
  return (
    <div className="proc-card relative rounded-[28px] overflow-hidden" style={{ minHeight: 308, background: gradient, boxShadow: "0 24px 60px -28px rgba(20,20,45,0.72)", animationDelay: "0ms" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
      <div className="absolute rounded-full blur-[90px]" style={{ width: 320, height: 320, background: glow, opacity: 0.26, top: -120, right: 0 }} />
      <div className="relative z-10 p-8 lg:p-9">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.5)" }}>{Icon && <Icon size={14} />}{eyebrow}</div>
            <div className="mt-3 text-[54px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: `0 6px 40px ${shadow}` }}><CountUp value={value} format={format} /></div>
            <div className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.62)" }}>{sub}</div>
          </div>
          <div className="flex gap-2.5">
            {pills.map((p, i) => (
              <div key={i} className="rounded-2xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)", backdropFilter: "blur(6px)" }}>
                <div className="text-[17px] font-bold tabular-nums leading-none" style={{ color: "#fff" }}>{p.value}</div>
                <div className="text-[10px] mt-1.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.6)" }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* legend */}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
          {bands.map((b, i) => <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.78)" }}><span className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />{b.name.slice(0, 18)}</span>)}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 185 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
          {bands.map((b, i) => <path key={i} d={b.d} fill={b.color} fillOpacity={0.45} stroke={b.color} strokeOpacity={0.5} strokeWidth="1" style={{ opacity: on ? 1 : 0, transition: `opacity 0.9s ease ${0.2 + i * 0.12}s` }} />)}
        </svg>
        {labels.map((l, i) => <span key={i} className="absolute bottom-1.5 text-[11px] font-medium" style={{ left: `${(X(i) / W) * 100}%`, transform: "translateX(-50%)", color: "rgba(255,255,255,0.55)" }}>{l}</span>)}
      </div>
    </div>
  );
}
