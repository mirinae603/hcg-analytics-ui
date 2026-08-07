"use client";
// Shared "ledger" kit for the three Consumption KPI detail pages, lifted from the proven
// tokens/primitives in revenue/RevenueMarginDetail.tsx (ASSAY). Copied rather than
// refactored out of that page on purpose: ASSAY ships, and this keeps its regression
// surface at zero.
//
// COLOUR LAW — one job per hue, enforced on all three pages:
//   GRAPHITE = money not kept.  JADE/JADE_DEEP/SEA = billed value & margin rupees.
//   BRASS    = a RATE, and only ever a rate (never carries a rupee length).
//   CLAY     = non-billable internal consumption ONLY, always hatched, never solid.
//   NEUTRAL  = a COUNT of things, never rupees.
import React, { useEffect, useRef, useState } from "react";

export const PAGE = "#EFECE4", CARD = "#FFFFFF", LEDGER = "#FBF9F4", LEDGER_2 = "#F5F1E7";
export const INK = "#16201C", SUB = "#78827C", LINE = "#E4E0D6", RULE = "#DCD5C4";
export const NEUTRAL = "#CFC8B6";
export const GRAPHITE = "#4A555F", JADE = "#2E8C74", JADE_DEEP = "#17624F", SEA = "#59B196";
export const BRASS = "#9A6A16", CLAY = "#B04A2E";
export const SH_CARD = "0 18px 44px -28px rgba(30,38,34,0.26), 0 3px 10px -8px rgba(30,38,34,0.07)";
export const SH_HERO = "0 22px 54px -34px rgba(60,52,32,0.28), 0 3px 10px -8px rgba(60,52,32,0.10)";
export const EASE = "cubic-bezier(.22,1,.36,1)", EASE_OUT = "cubic-bezier(.16,1,.3,1)";

export const inr = (v: number) => { v = Number(v) || 0; const a = Math.abs(v), s = v < 0 ? "−" : ""; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a / 1e7 >= 100 ? 0 : 1)}Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}K`; return `${s}₹${Math.round(a)}`; };
export const pct1 = (v: number) => `${(Number(v) || 0).toFixed(1)}%`;
export const num = (v: number) => Math.round(Number(v) || 0).toLocaleString("en-IN");
export const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

/** Arms a chart's build-in shortly after mount.
 *  setTimeout, NOT requestAnimationFrame (rAF is throttled to zero in a tab the compositor
 *  treats as non-visible, which pins every bar at 0). And deliberately NOT an
 *  IntersectionObserver: below-fold cards never fire it and render permanently blank. */
export function useArmed(delay = 30) {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = setTimeout(() => setOn(true), delay); return () => clearTimeout(id); }, [delay]);
  return on;
}

/** Cards carry NO coloured left rail — that mark is the single most recognisable
 *  AI-dashboard tell. Separation is a hairline border + a ruled header + whitespace. */
export function Card({ delay = 0, className = "", children }: any) {
  return (
    <div className={`led-card rounded-[18px] h-full ${className}`}
      style={{ background: CARD, border: `1px solid ${LINE}`, boxShadow: SH_CARD, animationDelay: `${delay}ms` }}>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}
export function HeroShell({ children }: any) {
  return (
    <div className="led-card rounded-[18px] overflow-hidden"
      style={{ background: `linear-gradient(168deg, ${LEDGER} 0%, ${LEDGER_2} 100%)`, border: `1px solid ${RULE}`, boxShadow: SH_HERO }}>
      <div className="p-6 md:p-8">{children}</div>
    </div>
  );
}
/** The `note` slot is where METHOD lives — what the axis is, what was excluded. Never an
 *  apology under a chart. */
export function Head({ label, badge, note }: any) {
  return (
    <div className="pb-3 mb-4" style={{ borderBottom: `1px solid ${RULE}` }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="text-[15px] font-semibold min-w-0" style={{ color: INK, letterSpacing: "-.01em" }}>{label}</h3>
        {badge && <span className="text-[10px] font-medium flex-shrink-0 tabular-nums" style={{ color: SUB }}>{badge}</span>}
      </div>
      {note && <p className="text-[12px] mt-1.5 leading-snug" style={{ color: SUB }}>{note}</p>}
    </div>
  );
}
/** Fixed-height crossfading readout. No tooltip box exists on any of these pages, so
 *  nothing can flip at a viewBox edge and nothing reflows as digits change. */
export function Readout({ k, children, minH = 38, dark = false }: any) {
  return (
    <div className="mt-2 pt-2 text-[12.5px] tabular-nums" aria-live="polite"
      style={{ borderTop: `1px solid ${dark ? "rgba(22,32,28,.10)" : RULE}`, color: INK, minHeight: minH }}>
      <span key={k} style={{ animation: "ledFade 140ms ease both" }}>{children}</span>
    </div>
  );
}
/** 45° hatch = "never billed". userSpaceOnUse so pitch/angle are pixel-identical everywhere. */
export function Hatch({ id, color = CLAY, opacity = 0.62 }: any) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="2" opacity={opacity} />
    </pattern>
  );
}

/** One mousemove on the <svg>; clientX → viewBox x → slot index. Never per-element listeners. */
export function useSlots(W: number, x0: number, slotW: number, n: number) {
  const [hi, setHi] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setHi(Math.max(0, Math.min(n - 1, Math.floor((x - x0) / slotW))));
  };
  return { hi, setHi, onMove, onLeave: () => setHi(null) };
}

export function PageShell({ title, sub, pill, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6" style={{ minHeight: "calc(100vh - 64px)", background: PAGE }}>
      <style jsx global>{`
        @keyframes ledIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .led-card{animation:ledIn 560ms ${EASE} both;min-width:0}
        @keyframes ledFade{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-motion: reduce){
          .led-card{animation:none!important}
          .led-card *{transition:none!important;animation:none!important}
        }
      `}</style>
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: SUB }}>Consumption &amp; Revenue</div>
            <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>{title}</h1>
            <p className="text-[13px] mt-1" style={{ color: SUB }}>{sub}</p>
          </div>
          {pill && <span className="text-[12px] font-medium px-3.5 py-2 rounded-full" style={{ background: CARD, color: INK, border: `1px solid ${LINE}` }}>{pill}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Skeleton() {
  return <div className="rounded-[18px] animate-pulse" style={{ height: 420, background: "#E7E3DA" }} />;
}
