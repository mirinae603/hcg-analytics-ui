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
// The Formulary & Spend pages add one hue:
//   RUST     = a breach, or a figure below its budget.
// and chart hues of their own (CHART below), one job each, brighter than the ledger's.
import React, { useEffect, useRef, useState } from "react";

export const PAGE = "#EFECE4", CARD = "#FFFFFF", LEDGER = "#FBF9F4", LEDGER_2 = "#F5F1E7";
export const INK = "#16201C", SUB = "#78827C", LINE = "#E4E0D6", RULE = "#DCD5C4";
export const NEUTRAL = "#CFC8B6", TRACK = "#EFEBE1";
/** The wash a selected row or month, or a table's total, sits on. */
export const SEL_BG = "#EFEADC";
export const GRAPHITE = "#4A555F", JADE = "#047C54", JADE_DEEP = "#015C41", SEA = "#4AB494";
export const BRASS = "#9A6A16", CLAY = "#B04A2E", RUST = "#B8612A";
// CHART — the Formulary & Spend charts' hues. Each pair a chart draws side by side was checked
// with the data-viz palette rules (lightness band, chroma, colour-blind separation, contrast);
// ORANGE sits under 3:1 on white, so its marks always carry a printed value.
//   JADE   = the brand used: formulary spend, the margin earned.
//   BLUE   = what HCG's list proposes: the margin possible, the suggested spend.
//   ROSE   = money lost: the margin missed, the extra spent.
//   ORANGE = out-of-formulary spend and its margin.
//   PLUM   = a rate (compliance %, loss %), and only ever a rate.
//   PINE   = the scheme topic (beside BLUE for cash & TPA and ORANGE for out of formulary).
// and one hue for each thing a one-measure ranking is broken down by, so the panels of a page
// each keep a colour of their own, as HCG's Power BI tiles do (picked by the largest
// normal-vision distance, ΔE ≥ 16.8, from the hues above and from each other; a ranking's bars
// always print their figures, so the lighter two need no 3:1 contrast):
//   LAVENDER = hospitals; BRONZE = brands; LEAF = doctors.
export const BLUE = "#3970C2", ROSE = "#DD4677", ORANGE = "#E2832D", PLUM = "#8E3B82", PINE = "#036F4F";
export const LAVENDER = "#B180D4", BRONZE = "#8A4B01", LEAF = "#7DA84C";
/** The chart hues as a categorical series, for a chart whose bars are things with no hue of
 *  their own (vendors): in this fixed order every neighbouring pair passed the data-viz palette
 *  checks (colour-blind separation ΔE ≥ 14.5, normal vision ≥ 17.5). Taken in order, never
 *  cycled: a ninth thing goes to "+N more" or takes the last hue. ORANGE and LEAF sit under 3:1
 *  on white, so such a chart prints its values. */
export const SERIES = [BLUE, ORANGE, PLUM, LEAF, JADE, LAVENDER, BRONZE, ROSE] as const;
/** The series hue of the `i`-th thing (0-based), the last one past the end. */
export const seriesCol = (i: number): string => SERIES[Math.min(Math.max(0, i), SERIES.length - 1)];
/** The pulse a loading placeholder is drawn in. */
export const SKELETON = "#E7E3DA";
export const SH_CARD = "0 18px 44px -28px rgba(30,38,34,0.26), 0 3px 10px -8px rgba(30,38,34,0.07)";
export const SH_HOVER = "0 22px 48px -26px rgba(30,38,34,.34), 0 4px 12px -8px rgba(30,38,34,.12)";
export const SH_HERO = "0 22px 54px -34px rgba(60,52,32,0.28), 0 3px 10px -8px rgba(60,52,32,0.10)";
export const EASE = "cubic-bezier(.22,1,.36,1)", EASE_OUT = "cubic-bezier(.16,1,.3,1)";

export const inr = (v: number) => { v = Number(v) || 0; const a = Math.abs(v), s = v < 0 ? "−" : ""; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a / 1e7 >= 100 ? 0 : 1)}Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}K`; return `${s}₹${Math.round(a)}`; };
export const pct1 = (v: number) => `${(Number(v) || 0).toFixed(1)}%`;
export const num = (v: number) => Math.round(Number(v) || 0).toLocaleString("en-IN");
export const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

const rgbOf = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
};
/** A token as a wash: tint(JADE, 0.14) is the pale jade behind an actual on an HCG card. */
export const tint = (hex: string, alpha: number) => {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};
/** A fill as it renders on a card: a tint() wash is laid over the card's white first. */
const rgbOnCard = (color: string): [number, number, number] => {
  const m = /^rgba\(([^)]+)\)$/.exec(color);
  if (!m) return rgbOf(color);
  const [r, g, b, a] = m[1].split(",").map(Number);
  const [cr, cg, cb] = rgbOf(CARD);
  return [r * a + cr * (1 - a), g * a + cg * (1 - a), b * a + cb * (1 - a)];
};
const luminance = (color: string) => {
  const [r, g, b] = rgbOnCard(color).map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Text for a label on a fill (a token, or a tint() wash): white or ink, whichever has the
 *  higher contrast with it. */
export const inkOn = (color: string) => {
  const L = luminance(color);
  return 1.05 / (L + 0.05) >= (L + 0.05) / (luminance(INK) + 0.05) ? "#fff" : INK;
};

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
/** The same hatch as a CSS fill, for bars drawn with divs and spans. */
export const hatchFill = (color: string) => `repeating-linear-gradient(135deg, ${tint(color, 0.62)} 0 2px, #fff 2px 6px)`;

/** Hover and focus for a chart row that is a button (a hospital, a brand, a part). styled-jsx
 *  injects one copy however many charts render it. */
export function RowStyles() {
  return (
    <style jsx global>{`
      .hcg-row{transition:background-color .15s ease}
      .hcg-row:hover{background:${tint(INK, 0.045)}}
      .hcg-row:focus-visible{outline:2px solid ${INK};outline-offset:-2px}
    `}</style>
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

/** The ledger pages' global styles: a card's entrance, the readout's fade, and both switched
 *  off for a reader who asks for reduced motion. Rendered by PageShell and OneScreenShell. */
export function LedgerStyles() {
  return (
    <style jsx global>{`
      @keyframes ledIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .led-card{animation:ledIn 560ms ${EASE} both;min-width:0}
      @keyframes ledFade{from{opacity:0}to{opacity:1}}
      @media (prefers-reduced-motion: reduce){
        .led-card{animation:none!important}
        .led-card *{transition:none!important;animation:none!important}
      }
    `}</style>
  );
}

export function PageShell({ title, sub, pill, eyebrow = "Consumption & Revenue", children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6" style={{ minHeight: "calc(100vh - 64px)", background: PAGE }}>
      <LedgerStyles />
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: SUB }}>{eyebrow}</div>
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
  return <div className="rounded-[18px] animate-pulse" style={{ height: 420, background: SKELETON }} />;
}
