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
// The Executive, Formulary, Spend and Revenue screens and Data exports draw in the WARM palette
// below (HCG chose the Inventory "Current stock value" page's look for them, 31-10-2026).
import React, { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Surfaces and ink — the "Current stock value" page's: a cream canvas, white cards, charcoal ink,
// grey labels, warm hairlines and warm, brown-tinted shadows. Text tokens clear WCAG AA (4.5:1)
// on white, on the cream canvas and on the coral tint: INK 12.1:1 / 11.1:1, SUB 5.4:1 / 4.9:1 /
// 4.5:1.
// ─────────────────────────────────────────────────────────────────────────────
export const PAGE = "#F7F5F0", CARD = "#FFFFFF", LEDGER = "#FBF9F5", LEDGER_2 = "#F4EFE8";
export const INK = "#3A352F", SUB = "#646B78", LINE = "#EEE9E2", RULE = "#E6E0D6";
export const NEUTRAL = "#D6CEC2", TRACK = "#F2EDE6";
/** The wash a selected row or month, or a table's total, sits on: a whisper of the coral. */
export const SEL_BG = "#F7ECE6";
export const GRAPHITE = "#4A555F", JADE = "#047C54", JADE_DEEP = "#015C41", SEA = "#4AB494";
export const BRASS = "#9A6A16", CLAY = "#B04A2E", RUST = "#B8612A";

// ─────────────────────────────────────────────────────────────────────────────
// WARM — the accent and the chart hues of the Executive, Formulary, Spend and Revenue screens.
// ─────────────────────────────────────────────────────────────────────────────
// ONE accent, the stock-value page's coral, for what is not data: the icon chips, the badges, the
// active tab, a hero card's ring. Its soft and tint steps are its washes; CORAL_INK is the coral
// that text may wear (5.1:1 on white, 4.7:1 on cream). A one-measure chart runs light to strong in
// it: a ranking's bars fade in from CORAL_SOFT's step at the axis (bars.tsx), a heat-map's cells
// deepen with the figure (heatmap.tsx).
export const CORAL = "#D6806A", CORAL_SOFT = "#E9B6A6", CORAL_TINT = "#F7E9E3", CORAL_INK = "#AC553D";
/** A segmented switch's warm track, and the lift under its chosen option (a white pill whose words
 *  wear CORAL_INK), as the stock-value page's breakdown switch draws them. */
export const PILL_TRACK = "#EFE9DF", PILL_SHADOW = "0 2px 6px rgba(214,128,106,0.22)";
/** The dark hero card (a screen's first figure): charcoal, lit by a coral glow. */
export const HERO_BG = "linear-gradient(158deg, #46413B 0%, #322D28 100%)";
//
// The chart hues: warm and muted (OKLCH chroma 0.10–0.12, against 0.15–0.20 for the bright CHART
// hues below), around the coral and the charcoal. One job each, the same on every screen:
//   CORAL_MARK  = what needs acting on: out-of-formulary spend, money missed or paid extra, a figure
//                 below budget; and the bars of a one-measure ranking (hospitals, brands, doctors,
//                 products), as the stock-value page draws its breakdown. The accent one step
//                 deeper, so a mark clears 3:1 on a white card (3.2:1).
//   SAGE        = formulary spend, the brand used and the margin it earned, a figure that met its
//                 budget (a deep sage: it must sit 0.17 lighter or darker than the coral, or the two
//                 merge for a red-blind reader).
//   CORAL_SOFT  = what HCG's list proposes: the margin possible, the suggested spend. Drawn as the
//                 pale whole behind what was earned, so the gap between them is the missed coral.
//   HONEY       = within budget (a status only, always beside its words).
//   TEAL        = the cash & TPA topic; generic purchases; inpatients (IP).   OCHRE = outpatients.
//   MAUVE       = the scheme topic; branded purchases.                        UMBER = consumables.
//   STONE_LIGHT = non-formulary (hatched wherever it sits outside a ratio); TEAL_LIGHT = not in the
//                 Item Master, or no alternative; STONE = a pass-through (material types between a
//                 total and its buckets) and a budget drawn beside an actual.
//   A rate (compliance %, % missed, margin %) is drawn in INK, a line or a bar, and only ever a
//   rate: the charcoal clears every hue it rides over (ΔE ≥ 18 normal, ≥ 12 colour-blind).
//
// VALIDATION — every set a chart draws side by side, run through the data-viz skill's
// validate_palette.js (light mode, the white card surface; the cream canvas never holds a mark):
//   formulary · out of formulary · consumables · not in Item Master
//                                SAGE CORAL_MARK UMBER TEAL_LIGHT, all pairs   PASS (CVD floor
//                                7.1 sage/umber: legal as every such bar carries its label;
//                                normal vision 16.8)
//   IP · OP                      TEAL OCHRE                                    PASS (CVD 17.8)
//   cash & TPA · scheme · out of formulary  TEAL MAUVE CORAL_MARK, all pairs   PASS (CVD 10.8,
//                                normal 20.2)
//   generic · branded            TEAL MAUVE                                    PASS (CVD 10.8)
//   SERIES (below), adjacent pairs                                             PASS (CVD 17.4,
//                                normal 18.4; OCHRE_LIGHT 2.2:1 on white: a series chart prints
//                                its values)
//   The sets that hold a pale tone pass separation and fail only the chroma / lightness gates, by
//   design — the pale tone is told apart by lightness, a hatch or its printed label, never by hue:
//   + STONE_LIGHT (non-formulary), formulary order SAGE CORAL_MARK STONE_LIGHT TEAL_LIGHT
//                                adjacent CVD 8.6, normal 17.2
//   earned · possible · missed   SAGE CORAL_SOFT CORAL_MARK, all pairs         CVD 8.6, normal 16.3
//   met · within · below         SAGE HONEY CORAL_MARK, all pairs              CVD 8.6, normal 18.4
//   CORAL_SOFT, STONE_LIGHT and HONEY sit under 3:1 on white: their marks print a value, carry a
//   label or have the drawer's table beside them.
export const CORAL_MARK = "#D3775E", SAGE = "#057558", HONEY = "#E2C06D";
/** A deeper shade of the formulary sage, for the classes inside formulary (restricted and
 *  preferred for scheme): a part of formulary, so its own family. */
export const SAGE_DEEP = "#03513D";
export const TEAL = "#1D83A7", TEAL_LIGHT = "#35A1BE", MAUVE = "#884366";
export const OCHRE = "#B88938", OCHRE_LIGHT = "#D5AA4F", UMBER = "#915028";
export const STONE = "#8C847A", STONE_LIGHT = "#C5BCB2";
/** The ink each status and tone hue's words wear (≥ 4.5:1 on white and cream): sage is dark
 *  enough itself; honey and coral are not. */
export const SAGE_INK = SAGE, HONEY_INK = "#8C6420";
/** The washes behind a status pill or a tinted tile, as on the stock-value page's risk tiles. */
export const SAGE_TINT = "#E6F1EC", HONEY_TINT = "#F8F0DC";
/** The warm hues as a categorical series, for a chart whose bars are things with no hue of their
 *  own (vendors, suppliers): the order that maximises the worst neighbouring pair's colour-blind
 *  separation (an exhaustive search of the warm hues; ΔE ≥ 17.4, normal vision ≥ 18.4). Taken in
 *  order, never cycled: a ninth thing goes to "+N more" or takes the last hue. */
export const SERIES = [TEAL, UMBER, OCHRE_LIGHT, SAGE, TEAL_LIGHT, OCHRE, MAUVE, CORAL_MARK] as const;
/** The series hue of the `i`-th thing (0-based), the last one past the end. */
export const seriesCol = (i: number): string => SERIES[Math.min(Math.max(0, i), SERIES.length - 1)];

// CHART — the bright hues the screens drew in before HCG chose the warm look, kept for the AI
// Analyst's answer charts (ai/plotlyTheme.ts), whose validated order is built from them:
//   JADE, BLUE, ROSE, ORANGE, PLUM, PINE, LAVENDER, BRONZE, LEAF.
export const BLUE = "#3970C2", ROSE = "#DD4677", ORANGE = "#E2832D", PLUM = "#8E3B82", PINE = "#036F4F";
export const LAVENDER = "#B180D4", BRONZE = "#8A4B01", LEAF = "#7DA84C";
/** The pulse a loading placeholder is drawn in. */
export const SKELETON = "#ECE7DF";
// Warm, airy shadows tuned for the cream canvas (brown-tinted, softer than slate), the stock-value
// page's: a panel's, a KPI card's (a touch deeper), the hover lift, the dark hero card's.
export const SH_CARD = "0 12px 34px -22px rgba(99,72,56,0.18), 0 2px 7px -4px rgba(99,72,56,0.06)";
export const SH_KPI = "0 14px 38px -20px rgba(99,72,56,0.22), 0 2px 8px -4px rgba(99,72,56,0.06)";
export const SH_HOVER = "0 18px 42px -20px rgba(99,72,56,0.28), 0 4px 12px -6px rgba(99,72,56,0.10)";
export const SH_DARK = "0 18px 44px -20px rgba(28,22,18,0.45), 0 4px 12px -6px rgba(28,22,18,0.30)";
export const SH_HERO = "0 22px 54px -34px rgba(99,72,56,0.28), 0 3px 10px -8px rgba(99,72,56,0.10)";
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
