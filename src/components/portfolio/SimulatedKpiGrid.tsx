"use client";
// Overview section of SIMULATED KPI cards — modern KPI tiles (coloured line-icon
// chip, big count-up value, trend chip, animated mini-viz) that click through to a
// full simulated drill-down at /kpi/{key}. Styled to production-dashboard quality.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TbFlask, TbArrowUpRight, TbArrowUpRight as TbUp, TbArrowDownRight } from "react-icons/tb";
import { simulatedByPortfolio, SimKpiMeta } from "@/lib/kpiRegistry";
import { getSimulated, SimBundle } from "@/lib/simulatedKpi";
import { simVisual } from "@/lib/simKpiVisual";
import { fmt } from "@/lib/kpiFormat";

const INK = "#111629", MUT = "#6b7180", MUT2 = "#9aa0b2", BORDER = "#eceef4";
const AC = "#6d5efc", ACSOFT = "#efedff";

// count-up headline
function ease(t: number) { return 1 - Math.pow(1 - t, 3); }
function CountUp({ value, kind, className, style }: { value: number; kind: any; className?: string; style?: any }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (n: number) => { const p = Math.min((n - start) / 1200, 1); setV(value * ease(p)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className} style={style}>{fmt(v, kind)}</span>;
}

// ── animated inline preview (line / bar / donut) in the card's accent colour ──
function MiniViz({ b, accent, uid, on }: { b: SimBundle; accent: string; uid: string; on: boolean }) {
  const cfg = b.chartCfg, f = cfg.series[0].field;
  const vals = b.chartData.map((d) => Number(d[f] ?? 0));
  const W = 150, H = 48;

  if (cfg.type === "donut") {
    const tot = vals.reduce((a, c) => a + c, 0) || 1, top = Math.max(...vals);
    const r = 19, c = 2 * Math.PI * r, frac = top / tot;
    return (
      <svg width={52} height={52} viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke={accent + "22"} strokeWidth="5.5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={accent} strokeWidth="5.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={on ? c * (1 - frac) : c} transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
        <text x="26" y="29.5" textAnchor="middle" fontSize="12" fontWeight="800" fill={INK}>{Math.round(frac * 100)}%</text>
      </svg>
    );
  }

  const min = Math.min(...vals), max = Math.max(...vals), rng = max - min || 1;
  if (cfg.type === "bar") {
    const n = vals.length, gap = W / n, bw = gap * 0.58;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {vals.map((v, i) => {
          const h = 7 + ((v - min) / rng) * (H - 9);
          return <rect key={i} x={i * gap + (gap - bw) / 2} y={H - h} width={bw} height={h} rx={2.5} fill={accent}
            opacity={0.3 + 0.6 * ((v - min) / rng)}
            style={{ transformBox: "fill-box", transformOrigin: "bottom", transform: on ? "scaleY(1)" : "scaleY(0.02)", transition: `transform 0.6s cubic-bezier(0.34,1.28,0.64,1) ${i * 45}ms` }} />;
        })}
      </svg>
    );
  }

  // line / area
  const pts = vals.map((v, i) => [i / (vals.length - 1) * W, H - 5 - ((v - min) / rng) * (H - 11)]);
  const d = "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L");
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.24" /><stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#sg-${uid})`} opacity={on ? 1 : 0} style={{ transition: "opacity 0.7s ease 0.35s" }} />
      <path d={d} fill="none" stroke={accent} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={on ? 0 : 1} style={{ transition: "stroke-dashoffset 1.05s cubic-bezier(0.4,0,0.2,1)" }} />
      <circle cx={last[0]} cy={last[1]} r={3.2} fill={accent} opacity={on ? 1 : 0} style={{ transition: "opacity 0.3s ease 1s" }} />
    </svg>
  );
}

function SimCard({ k, i }: { k: SimKpiMeta; i: number }) {
  const b = getSimulated(k.key);
  const { Icon, accent } = simVisual(k.key);
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 90 + i * 70); return () => clearTimeout(t); }, [i]);
  if (!b) return null;
  const h = b.headline, up = (h.deltaPct ?? 0) >= 0;

  return (
    <Link href={`/kpi/${k.key}`} className="group relative rounded-[20px] p-5 block overflow-hidden transition-all duration-300"
      style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(20,24,60,0.05)", animation: `sk-rise 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both` }}
      onMouseEnter={(e) => { const t = e.currentTarget; t.style.boxShadow = `0 14px 34px -16px ${accent}80`; t.style.transform = "translateY(-3px)"; t.style.borderColor = accent + "55"; }}
      onMouseLeave={(e) => { const t = e.currentTarget; t.style.boxShadow = "0 1px 2px rgba(20,24,60,0.05)"; t.style.transform = "none"; t.style.borderColor = BORDER; }}>
      {/* accent wash top-right */}
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none" style={{ background: accent, opacity: 0.06, filter: "blur(6px)" }} />

      <div className="flex items-start justify-between">
        <span className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
          style={{ background: accent + "16", color: accent, boxShadow: `inset 0 0 0 1px ${accent}22` }}>
          <Icon size={23} strokeWidth={2} />
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "#fff7ed", border: "1px solid #fadcae" }}>
          <TbFlask size={11} style={{ color: "#c07d1a" }} />
          <span className="text-[9.5px] font-bold uppercase tracking-[0.07em]" style={{ color: "#a56a15" }}>Simulated</span>
        </span>
      </div>

      <div className="mt-4">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.07em]" style={{ color: MUT2 }}>{h.label}</div>
        <div className="flex items-end gap-2 mt-1">
          <CountUp value={h.value} kind={h.kind} className="text-[27px] font-extrabold tabular-nums leading-none" style={{ color: INK }} />
          {h.deltaPct != null && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold mb-0.5 px-1.5 py-0.5 rounded-md"
              style={{ color: up ? "#0a8f5b" : "#e5484d", background: up ? "#e7f8f0" : "#fdeced" }}>
              {up ? <TbUp size={12} /> : <TbArrowDownRight size={12} />}{Math.abs(h.deltaPct)}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-3.5 h-[48px] flex items-center">
        <MiniViz b={b} accent={accent} uid={k.key} on={on} />
      </div>

      <div className="mt-3.5 pt-3 flex items-center justify-between gap-2" style={{ borderTop: `1px solid #f2f3f8` }}>
        <div className="min-w-0">
          <div className="text-[13px] font-bold leading-tight truncate" style={{ color: "#2b3048" }}>{k.title}</div>
          <div className="text-[11.5px] mt-0.5 leading-snug truncate" style={{ color: MUT }}>{k.why}</div>
        </div>
        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover:translate-x-0.5"
          style={{ background: accent + "12", color: accent }}>
          <TbArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}

export default function SimulatedKpiGrid({ portfolio }: { portfolio: string }) {
  const items = simulatedByPortfolio(portfolio);
  if (!items.length) return null;

  return (
    <section className="mt-6">
      <style>{`@keyframes sk-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="rounded-[24px] p-6" style={{ background: "linear-gradient(180deg,#fbfbfe 0%,#f6f7fc 100%)", border: `1px solid ${BORDER}` }}>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ACSOFT, color: AC }}><TbFlask size={20} /></span>
            <div>
              <h2 className="text-[15px] font-extrabold tracking-[-0.01em]" style={{ color: INK }}>Simulated preview — activates on your data</h2>
              <p className="text-[12.5px] mt-0.5" style={{ color: MUT }}>
                Fully built on representative data so you can explore each one now. They switch to live figures the moment HCG shares the required source.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1.5 rounded-full self-center" style={{ background: "#fff", color: AC, border: `1px solid ${ACSOFT}` }}>
            {items.length} preview{items.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((k, i) => <SimCard key={k.key} k={k} i={i} />)}
        </div>
      </div>
    </section>
  );
}
