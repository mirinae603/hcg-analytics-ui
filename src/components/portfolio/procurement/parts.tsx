"use client";
// Shared procurement page scaffolding (ADR-0001). Mirrors the inventory pages'
// design language: immersive gradient hero + staggered card entrances + soft panels.
import React from "react";
import { CountUp, useMount } from "@/components/portfolio/kit";

export const PAGE = "#ECF3F1", INK = "#1f2333", SUBTLE = "#8a91a0";
export const EMER = "#0e9f6e", TEAL = "#0d9488", INDIGO = "#4f46e5", SKY = "#0ea5e9", AMBER = "#e0992f", ROSE = "#e8604a", GREY = "#aab2c2";
export const PANEL_SHADOW = "0 12px 34px -22px rgba(20,40,35,0.18), 0 2px 7px -4px rgba(20,40,35,0.05)";

export function ProcShell({ title, subtitle, region, pill = "6-month window", bg = PAGE, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-4 min-w-0" style={{ background: bg, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`
        @keyframes procIn { from { opacity: 0; transform: translateY(18px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .proc-card { animation: procIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; min-width: 0; }
      `}</style>
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>{title}</h1>
          <p className="text-[13px] mt-1" style={{ color: SUBTLE }}>{subtitle} · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#5b6478", boxShadow: "0 4px 14px -8px rgba(40,52,86,0.2)" }}>{pill}</span>
      </div>
      {children}
    </div>
  );
}

// Immersive gradient hero — headline metric + supporting pills + glowing driver bars
export function ProcHero({ eyebrow, icon: Icon, value, format, sub, gradient, glow = ["#0e9f6e", "#0d9488"], pills = [], barsTitle, bars = [], barFmt, delay = 0 }: any) {
  const on = useMount(0);
  const bmax = Math.max(...bars.map((b: any) => b.value), 1);
  return (
    <div className="proc-card relative rounded-[28px] overflow-hidden" style={{ minHeight: 300, background: gradient, boxShadow: "0 24px 60px -28px rgba(12,40,32,0.62)", animationDelay: `${delay}ms` }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 260, height: 260, background: glow[0], opacity: 0.22, top: -90, right: 120 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 180, height: 180, background: glow[1], opacity: 0.14, bottom: -50, left: 320 }} />
      <div className="relative flex flex-col lg:flex-row" style={{ minHeight: 300 }}>
        <div className="p-7 lg:p-9 lg:w-[430px] flex-shrink-0 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}>{Icon && <Icon size={14} />}{eyebrow}</div>
          <div className="mt-3 text-[52px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 28px rgba(0,0,0,0.3)" }}><CountUp value={value} format={format} /></div>
          <div className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.62)" }}>{sub}</div>
          {pills.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-2.5">
              {pills.map((p: any, i: number) => (
                <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)" }}>
                  <div className="text-[15px] font-bold tabular-nums leading-none truncate" style={{ color: "#fff" }}>{p.value}</div>
                  <div className="text-[10px] mt-1 truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{p.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 p-7 lg:py-8 lg:pr-10 flex flex-col justify-center min-w-0">
          {barsTitle && <div className="text-[12px] font-medium mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>{barsTitle}</div>}
          <div className="space-y-3.5">
            {bars.map((b: any, i: number) => { const c = b.color || "#7fe9c4"; return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12.5px] font-medium truncate pr-2" style={{ color: "rgba(255,255,255,0.85)" }}>{b.label}</span>
                  <span className="text-[13px] font-bold tabular-nums flex-shrink-0" style={{ color: "#fff" }}>{barFmt ? barFmt(b.value) : b.value}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.09)" }}>
                  <div className="h-full rounded-full" style={{ width: on ? `${(b.value / bmax) * 100}%` : "0%", background: `linear-gradient(90deg,${c}bb,${c})`, boxShadow: `0 0 16px -3px ${c}`, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms` }} />
                </div>
              </div>
            ); })}
            {!bars.length && <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>—</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RankCard({ title, sub, accent, badge, rows, grow = false, delay = 240 }: any) {
  return (
    <div className={`proc-card rounded-3xl bg-white p-6 flex flex-col ${grow ? "flex-1" : ""}`} style={{ boxShadow: PANEL_SHADOW, animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: INK }}>{title}</h3>
        {badge && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${accent}14`, color: accent }}>{badge}</span>}
      </div>
      <p className="text-[12px] mt-0.5 mb-3" style={{ color: SUBTLE }}>{sub}</p>
      <div className="divide-y divide-gray-50 flex-1 flex flex-col justify-between">
        {rows.map((r: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}14`, color: accent }}>{r.icon}</span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium truncate" style={{ color: "#3c465c" }} title={r.title}>{r.title}</div>
                <div className="text-[11px]" style={{ color: SUBTLE }}>{r.sub}</div>
              </div>
            </div>
            <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{r.right}</span>
          </div>
        ))}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

export function ProxyBadge({ text, accent = EMER }: any) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full"
      style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}33` }}>{text}</div>
  );
}

export function TableCard({ title, sub, children, delay = 320 }: any) {
  return (
    <div className="proc-card rounded-3xl bg-white overflow-hidden" style={{ boxShadow: PANEL_SHADOW, animationDelay: `${delay}ms` }}>
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-[15px] font-semibold" style={{ color: INK }}>{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      {children}
    </div>
  );
}

// Wrap a bespoke chart in the standard animated panel
export function Panel({ children, delay = 140, className = "" }: any) {
  return (
    <div className={`proc-card rounded-3xl bg-white p-6 ${className}`} style={{ boxShadow: PANEL_SHADOW, animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
