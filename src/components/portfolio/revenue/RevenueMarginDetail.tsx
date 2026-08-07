"use client";
// "Revenue & Margin" — ASSAY: the billed rupee, in points.
//
// One unit runs the page: a POINT OF BILLED REVENUE. Of every ₹100 billed, ₹59.09 is cost
// of goods and ₹40.91 is gross margin. In the same window the network also issued stock to
// cost centres with no patient bill; expressed in the SAME unit that is 12.86 points. Both
// live on one shared paise axis in the hero — which is the "billable/non-billable + margin %
// together in one visual" the client asked for on 2026-07-31.
//
// THE LAW THIS PAGE OBEYS: billed COGS and internal goods-issue are two separate SAP
// processes whose category taxonomies reconcile on only ~49% of billed revenue. So the two
// pools are shown on a shared SCALE and NEVER in a shared SUM. There is no "net margin", no
// subtraction of internal cost from margin, and no category/hospital/item-level split of
// internal consumption anywhere — the constraint is honoured by the charts not containing
// the quantity, not by a footnote under them.
//
// Colour law: GRAPHITE = money not kept. JADE/SEA = billed value & margin. BRASS = a RATE,
// and only ever a rate. CLAY = non-billable internal consumption and nothing else, always
// hatched, only at portfolio/month grain (the only grains the data has).
import React, { useEffect, useMemo, useRef, useState, useId, useCallback } from "react";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { CountUp } from "@/components/portfolio/kit";
import { TbReceipt2, TbSearch, TbX, TbDownload, TbChevronRight, TbChevronDown } from "react-icons/tb";

const PAGE = "#EFECE4", CARD = "#FFFFFF", LEDGER = "#FBF9F4", LEDGER_2 = "#F5F1E7";
const INK = "#16201C", SUB = "#78827C", LINE = "#E4E0D6";
const RULE = "#DCD5C4";   // ledger hairline
const GRAPHITE = "#4A555F", JADE = "#2E8C74", JADE_DEEP = "#17624F", SEA = "#59B196";
const BRASS = "#9A6A16", CLAY = "#B04A2E";
const SH_CARD = "0 18px 44px -28px rgba(30,38,34,0.26), 0 3px 10px -8px rgba(30,38,34,0.07)";
const SH_HERO = "0 22px 54px -34px rgba(60,52,32,0.28), 0 3px 10px -8px rgba(60,52,32,0.10)";
const EASE = "cubic-bezier(.22,1,.36,1)", EASE_OUT = "cubic-bezier(.16,1,.3,1)";

const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const inr = (v: number) => { v = Number(v) || 0; const a = Math.abs(v), s = v < 0 ? "−" : ""; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a / 1e7 >= 100 ? 0 : 1)}Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}K`; return `${s}₹${Math.round(a)}`; };
const pct1 = (v: number) => `${(Number(v) || 0).toFixed(1)}%`;
const pt2 = (v: number) => (Number(v) || 0).toFixed(2);
const sgn = (v: number) => `${v >= 0 ? "+" : "−"}${inr(Math.abs(v)).replace("−", "")}`;

/** Arms every chart's build-in one frame after mount.
 *
 *  This was an IntersectionObserver gate (threshold .25, "each chart builds as you scroll").
 *  It failed open in the wrong direction: for cards below the fold the callback never fired,
 *  so every `on`-gated bar height stayed pinned at 0 and those charts rendered permanently
 *  blank — axes, labels and captions present, no data. A chart that never draws is a far
 *  worse outcome than one that draws before you reach it, so the gate is now mount-based.
 *  The staggered per-element delays below still give the build its sequence. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [on, setOn] = useState(false);
  // setTimeout, not requestAnimationFrame: rAF is throttled to zero in a tab the compositor
  // considers non-visible, which left every chart pinned at its 0 state. A timer always fires.
  useEffect(() => { const id = setTimeout(() => setOn(true), 30); return () => clearTimeout(id); }, []);
  return { ref, on };
}

/** Reveals animate SVG geometry (width/height) directly with a CSS transition — the same
 *  technique already proven in this codebase's Scatter. An earlier version scaled a
 *  <clipPath> child instead; nested clip references resolved but never painted, so the
 *  whole chart came up blank. Geometry is simpler and it actually renders. */

/** 45° hatch = "never billed". Redefined inside every <svg> with a useId()-suffixed id and
 *  patternUnits="userSpaceOnUse", so angle and pitch are pixel-identical on every card. */
function Hatch({ id, color = CLAY, opacity = 0.62 }: any) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="2" opacity={opacity} />
    </pattern>
  );
}

/** Cards carry NO coloured left rail — an accent bar on a rounded card is the single most
 *  recognisable AI-dashboard tell. Separation here comes from the ledger grammar instead:
 *  a hairline border, a ruled header underline, and generous whitespace. */
function Card({ delay = 0, className = "", children }: any) {
  return (
    <div className={`rm-card rounded-[18px] h-full ${className}`}
      style={{ background: CARD, border: `1px solid ${LINE}`, boxShadow: SH_CARD, animationDelay: `${delay}ms` }}>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}
function Head({ label, badge, note }: any) {
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

// ─────────────────────────────────────────────────────────────────────────────
// HERO — the billed rupee, and what leaves without a bill
// ─────────────────────────────────────────────────────────────────────────────
function Hero({ data, ymax }: { data: any; ymax: number }) {
  const uid = useId().replace(/[:]/g, "");
  const { ref, on } = useInView<HTMLDivElement>();
  const t = data?.totals || {};
  const tl: any[] = data?.timeline || [];
  const [hi, setHi] = useState<number | null>(null);

  const REV = Number(t.revenue ?? 0);
  const COSTP = REV ? (Number(t.cost ?? 0) / REV) * 100 : 0;
  const MARP = Number(t.margin_pct ?? 0);
  // Deliberately the SUM OF THE BARS DRAWN, not totals.internal_cost: the endpoint sums
  // every month present in fact_consumption while timeline only iterates the billing
  // months, so summing what is plotted makes the columns and the scalar unable to disagree.
  const IC6 = tl.reduce((s, r) => s + Number(r.internal_cost || 0), 0);
  const ICP = REV ? (IC6 / REV) * 100 : 0;
  const SHARE = Number(t.margin) ? (IC6 / Number(t.margin)) * 100 : 0;
  const drift = Number(t.internal_cost) ? Math.abs(IC6 - Number(t.internal_cost)) / Number(t.internal_cost) : 0;

  const hosp = (data?.by_hospital || []).map((r: any) => r.margin_pct).filter((n: any) => Number.isFinite(n));
  const cats = (data?.by_category || []).map((r: any) => r.margin_pct).filter((n: any) => Number.isFinite(n));
  const rng = (a: number[]) => (a.length ? `${Math.min(...a).toFixed(0)}%–${Math.max(...a).toFixed(0)}%` : "—");

  // right register plot
  const W = 560, H = 320, PL = 46, PR = 24, BY = 232, PT = 28;
  const PW = W - PL - PR, PH = BY - PT;
  const n = tl.length || 1, slotW = PW / n;
  const cx = (i: number) => PL + i * slotW + slotW / 2;
  const Y = (p: number) => BY - (p / ymax) * PH;
  const pts = tl.map((r) => ({
    label: r.label,
    rate: Number(r.revenue) ? (Number(r.margin) / Number(r.revenue)) * 100 : 0,
    draw: Number(r.revenue) ? (Number(r.internal_cost) / Number(r.revenue)) * 100 : 0,
    rev: Number(r.revenue || 0), ic: Number(r.internal_cost || 0), mg: Number(r.margin || 0),
  }));
  const revMax = Math.max(...pts.map((p) => p.rev), 1);
  const line = pts.map((p, i) => `${cx(i)},${Y(p.rate)}`).join(" ");
  const a = hi != null ? pts[hi] : null;

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setHi(Math.max(0, Math.min(n - 1, Math.round((x - PL - slotW / 2) / slotW))));
  }, [n, slotW]);

  return (
    <div ref={ref} className="rm-card rounded-[18px] overflow-hidden"
      style={{ background: `linear-gradient(168deg, ${LEDGER} 0%, ${LEDGER_2} 100%)`, border: `1px solid ${RULE}`, boxShadow: SH_HERO }}>
      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 lg:gap-12">

        {/* ── LEFT REGISTER · THE HUNDRED ── */}
        <div className="lg:w-[44%] flex-shrink-0 min-w-0">
          <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>
            Per ₹100 billed · {t.months ?? 6} months{drift > 0.005 ? ` · ${tl.length} aligned to billing` : ""}
          </div>
          <div className="mt-3 flex items-baseline" style={{ color: INK }}>
            <span className="tabular-nums" style={{ fontSize: 68, fontWeight: 300, letterSpacing: "-.03em", lineHeight: 1 }}>
              <CountUp value={MARP} format={(v: number) => v.toFixed(2)} />
            </span>
            <span style={{ fontSize: 30, fontWeight: 300 }}>%</span>
          </div>
          <div className="text-[10.5px] font-semibold uppercase mt-2" style={{ color: SUB, letterSpacing: ".12em" }}>Gross margin on billed items</div>
          <div className="inline-flex items-center mt-3 px-2.5 py-1 rounded-full text-[11px] tabular-nums" style={{ color: BRASS, border: `1px solid ${BRASS}59` }}>
            internal consumption = {SHARE.toFixed(1)}% of gross margin
          </div>

          <svg viewBox="0 0 440 112" width="100%" style={{ marginTop: 22, overflow: "visible" }} role="img"
            aria-label={`Per 100 rupees billed: ${COSTP.toFixed(2)} cost of goods, ${MARP.toFixed(2)} gross margin. Separately, ${ICP.toFixed(2)} points of stock issued with no bill.`}>
            <defs><Hatch id={`h-${uid}`} /></defs>
            {/* RAIL A — the billed rupee. Sums to exactly 100.00, inside one extract. */}
            <rect x={10} y={26} width={420} height={36} rx={7} fill="#EAE5D8" />
            <rect x={10} y={26} width={on ? COSTP * 4.2 : 0} height={36} rx={7} fill={GRAPHITE}
              style={{ transition: `width 720ms ${EASE_OUT} 180ms` }} />
            <rect x={10 + COSTP * 4.2 - 7} y={26} width={on ? (100 - COSTP) * 4.2 + 7 : 0} height={36} rx={7} fill={JADE}
              style={{ transition: `width 720ms ${EASE_OUT} 300ms` }} />
            {COSTP * 4.2 >= 92 && <text x={10 + (COSTP * 4.2) / 2} y={48.5} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 600, fill: "#EDF0F2", opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" }}>COGS {pt2(COSTP)}</text>}
            {(100 - COSTP) * 4.2 >= 92 && <text x={10 + COSTP * 4.2 + ((100 - COSTP) * 4.2) / 2} y={48.5} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 600, fill: "#EAF5F1", opacity: on ? 1 : 0, transition: "opacity 400ms ease 800ms" }}>GROSS MARGIN {pt2(MARP)}</text>}
            {/* RAIL B — its OWN beat, its own rail. Same origin, same paise axis, never a
                slice of the margin block and never a subtrahend. */}
            <rect x={10} y={78} width={on ? Math.max(ICP * 4.2, 2) : 0} height={24} rx={6} fill="rgba(176,74,46,0.14)"
              style={{ transition: `width 640ms ${EASE_OUT} 520ms` }} />
            <rect x={10} y={78} width={on ? Math.max(ICP * 4.2, 2) : 0} height={24} rx={6} fill={`url(#h-${uid})`}
              style={{ transition: `width 640ms ${EASE_OUT} 520ms` }} />
            <rect x={10} y={78} width={on ? Math.max(ICP * 4.2, 2) : 0} height={24} rx={6} fill="none" stroke={CLAY} strokeWidth="1"
              style={{ transition: `width 640ms ${EASE_OUT} 520ms` }} />
            <line x1={10 + ICP * 4.2} y1={64} x2={10 + ICP * 4.2} y2={78} stroke={BRASS} strokeWidth="1" strokeDasharray="3 3"
              style={{ opacity: on ? 0.7 : 0, transition: `opacity 400ms ease 1100ms` }} />
            <text x={10 + ICP * 4.2 + 10} y={94} style={{ fontSize: 10.5, fill: CLAY, opacity: on ? 1 : 0, transition: "opacity 400ms ease 900ms" }}>
              issued with no bill — {pt2(ICP)} pts (at cost)
            </text>
            <text x={10} y={18} style={{ fontSize: 9.5, fill: SUB, letterSpacing: ".08em" }}>0</text>
            <text x={430} y={18} textAnchor="end" style={{ fontSize: 9.5, fill: SUB, letterSpacing: ".08em" }}>100 paise</text>
          </svg>

          <p className="text-[11px] mt-4 leading-relaxed" style={{ color: SUB }}>
            The two bars share a <b style={{ color: INK }}>scale</b>, never a sum. Billed COGS and internal
            goods-issue are separate SAP processes — internal consumption is not subtracted from margin anywhere on this page.
          </p>
        </div>

        {/* ── RIGHT REGISTER · SIX MONTHS, ONE UNIT ── */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>Six months, one unit — points of that month&apos;s billed revenue</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 6, cursor: "crosshair" }}
            preserveAspectRatio="xMidYMid meet" onMouseMove={onMove} onMouseLeave={() => setHi(null)} role="img"
            aria-label="Monthly gross margin rate and non-billable draw, both in points of billed revenue">
            <defs><Hatch id={`hm-${uid}`} /></defs>
            {[0, 10, 20, 30, 40, 50].filter((g) => g <= ymax).map((g) => (
              <g key={g} style={{ opacity: on ? 1 : 0, transition: "opacity 500ms ease 320ms" }}>
                <line x1={PL} y1={Y(g)} x2={W - PR} y2={Y(g)} stroke={RULE} strokeWidth="1" />
                <text x={PL - 8} y={Y(g) + 3.5} textAnchor="end" style={{ fontSize: 9.5, fill: SUB }}>{g}</text>
              </g>
            ))}
            {/* revenue micro-rail — the only absolute-rupee channel here, labelled as such */}
            {pts.map((p, i) => (
              <rect key={`mr${i}`} x={cx(i) - 15} y={PT - 14} width={30} height={on ? Math.max((p.rev / revMax) * 10, 2) : 0} rx={1.5}
                fill={SUB} opacity={hi == null || hi === i ? 0.5 : 0.2} style={{ transition: `height 500ms ${EASE} ${300 + i * 40}ms, opacity 180ms` }} />
            ))}
            <text x={PL - 8} y={PT - 6} textAnchor="end" style={{ fontSize: 8.5, fill: SUB }}>rev</text>

            {/* clay columns anchored at ZERO — never a band between two lines, because a
                band's floor invites the "net margin" reading the data cannot support */}
            {pts.map((p, i) => {
              const h = (p.draw / ymax) * PH, act = hi === i;
              return (
                <g key={`c${i}`} style={{ opacity: hi == null || act ? 1 : 0.45, transition: "opacity 180ms cubic-bezier(.4,0,.2,1)" }}>
                  <rect x={cx(i) - 17} y={on ? BY - h : BY} width={34} height={on ? h : 0} rx={3} fill="rgba(192,86,60,0.20)" style={{ transition: `y 560ms ${EASE} ${420 + i * 55}ms, height 560ms ${EASE} ${420 + i * 55}ms` }} />
                  <rect x={cx(i) - 17} y={on ? BY - h : BY} width={34} height={on ? h : 0} rx={3} fill={`url(#hm-${uid})`} style={{ transition: `y 560ms ${EASE} ${420 + i * 55}ms, height 560ms ${EASE} ${420 + i * 55}ms` }} />
                  <rect x={cx(i) - 17} y={on ? BY - h : BY} width={34} height={on ? h : 0} rx={3} fill="none" stroke={CLAY} strokeWidth={act ? 1.5 : 1} style={{ transition: `y 560ms ${EASE} ${420 + i * 55}ms, height 560ms ${EASE} ${420 + i * 55}ms, stroke-width 180ms` }} />
                </g>
              );
            })}
            {/* brass rate line — straight polyline, never a spline: a spline over six points
                can overshoot into a rate that occurred in no month */}
            <polyline points={line} fill="none" stroke={BRASS} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 900ms ${EASE} 760ms` }} />
            {pts.map((p, i) => {
              const act = hi === i;
              return (
                <g key={`d${i}`}>
                  {act && <circle cx={cx(i)} cy={Y(p.rate)} r={10} fill={BRASS} opacity={0.18} />}
                  <circle cx={cx(i)} cy={Y(p.rate)} r={act ? 5 : 3.4} fill={BRASS} stroke={CARD} strokeWidth="1.5"
                    style={{ transformBox: "fill-box", transformOrigin: "center", transform: on ? "scale(1)" : "scale(.6)", transition: `transform 240ms cubic-bezier(.34,1.15,.64,1) ${1500 + i * 45}ms, r 160ms` }} />
                </g>
              );
            })}
            {pts.map((p, i) => (
              <text key={`l${i}`} x={cx(i)} y={BY + 20} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: hi === i ? 700 : 500, fill: hi === i ? INK : SUB }}>{p.label}</text>
            ))}
            {hi != null && <line x1={cx(hi)} y1={PT - 16} x2={cx(hi)} y2={BY} stroke="rgba(22,32,28,.30)" strokeWidth="1" />}
            <g style={{ opacity: on ? 1 : 0, transition: "opacity 400ms ease 1650ms" }}>
              <line x1={PL} y1={Y(MARP)} x2={W - PR} y2={Y(MARP)} stroke={BRASS} strokeWidth="1" strokeDasharray="5 4" opacity="0.55" />
              <line x1={PL} y1={Y(ICP)} x2={W - PR} y2={Y(ICP)} stroke={CLAY} strokeWidth="1" strokeDasharray="5 4" opacity="0.5" />
            </g>
            <text x={W - PR} y={BY + 42} textAnchor="end" style={{ fontSize: 9.5, fill: SUB }}>points of billed revenue · dashed = 6-month level</text>
          </svg>
          {/* fixed-height readout — crossfade only, fixed-width tabular slots, no reflow */}
          <div className="mt-1 pt-2 text-[13px] tabular-nums" style={{ borderTop: `1px solid ${RULE}`, color: INK, minHeight: 40 }} aria-live="polite">
            {a ? (
              <span key={hi} style={{ animation: "rmFade 140ms ease both" }}>
                <b>{a.label}</b> — gross margin <b style={{ color: BRASS }}>{pt2(a.rate)} pts</b> · internal draw <b style={{ color: CLAY }}>{pt2(a.draw)} pts</b>
                <span style={{ color: SUB }}> · {inr(a.rev)} billed, {inr(a.ic)} issued unbilled</span>
              </span>
            ) : (
              <span style={{ color: SUB }}>
                6-month: gross margin <b style={{ color: BRASS }}>{pt2(MARP)} pts</b> · internal consumption <b style={{ color: CLAY }}>{pt2(ICP)} pts</b> · hover a month
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="px-6 md:px-8 pl-7 md:pl-9 pb-5 text-[11.5px] leading-relaxed" style={{ color: SUB }}>
        <b style={{ color: INK }}>{pt2(MARP)}%</b> is the six-month portfolio rate on billed items. Individual hospitals run{" "}
        <b style={{ color: INK }}>{rng(hosp)}</b>, material groups <b style={{ color: INK }}>{rng(cats)}</b> — the ~49% raised in review is an
        entity rate, not the book rate; it is in the ladder and the profit pool below.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT-1 — IP vs OP on the same rate axis
// ─────────────────────────────────────────────────────────────────────────────
function Channels({ data, ymax }: { data: any; ymax: number }) {
  const { ref, on } = useInView<HTMLDivElement>();
  const t = data?.totals || {}; const tl: any[] = data?.timeline || [];
  const [hi, setHi] = useState<number | null>(null);
  const [lift, setLift] = useState<"ip" | "op" | null>(null);
  const W = 520, H = 232, PL = 40, PR = 16, BY = 176, PT = 20, PH = BY - PT;
  const PW = W - PL - PR, n = tl.length || 1, slotW = PW / n;
  const Y = (p: number) => BY - (p / ymax) * PH;
  const rate = (m: any, r: any) => (Number(r) ? (Number(m) / Number(r)) * 100 : null);
  const series = (mk: string, rk: string) => tl.map((r) => rate(r[mk], r[rk]));
  const ip = series("ip_margin", "ip_revenue"), op = series("op_margin", "op_revenue");
  // stepped: a flat segment across each month's full slot, 1px risers at boundaries — no
  // interpolation between months that were never measured
  const steps = (vals: (number | null)[]) => {
    const segs: string[] = [];
    vals.forEach((v, i) => { if (v == null) return; const x0 = PL + i * slotW, x1 = x0 + slotW, y = Y(v); segs.push(`M${x0},${y} L${x1},${y}`); if (i > 0 && vals[i - 1] != null) segs.push(`M${x0},${Y(vals[i - 1] as number)} L${x0},${y}`); });
    return segs.join(" ");
  };
  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setHi(Math.max(0, Math.min(n - 1, Math.floor((x - PL) / slotW))));
  }, [n, slotW]);
  const rows = [
    { k: "ip" as const, label: "Inpatient", c: JADE, rev: Number(t.ip_revenue ?? 0), share: Number(t.ip_share ?? 0), mg: Number(t.ip_margin ?? 0) },
    { k: "op" as const, label: "Outpatient", c: SEA, rev: Number(t.op_revenue ?? 0), share: Number(t.op_share ?? 0), mg: Number(t.op_margin ?? 0) },
  ];
  const a = hi != null ? { l: tl[hi]?.label, ip: ip[hi], op: op[hi] } : null;
  return (
    <Card delay={180}>
      <div ref={ref}>
        <Head label="Two engines — inpatient & outpatient" note={`IP is ${pct1(t.ip_share ?? 0)} of billed revenue. The question is whether it is ${pct1(t.ip_share ?? 0)} of the quality.`} />
        {/* weight rail — the scale story, stated ONCE, not hidden in an 8%-wide sliver */}
        <div className="flex mt-4 rounded-full overflow-hidden" style={{ height: 12 }}>
          <div style={{ width: on ? `${t.ip_share ?? 0}%` : "0%", background: JADE, transition: `width 720ms ${EASE_OUT} 200ms` }} />
          <div style={{ width: 1, background: CARD }} />
          <div style={{ width: on ? `${t.op_share ?? 0}%` : "0%", background: SEA, transition: `width 720ms ${EASE_OUT} 200ms` }} />
        </div>
        <div className="flex justify-between text-[10px] mt-1.5" style={{ color: SUB }}>
          <span>IP {pct1(t.ip_share ?? 0)} of billed revenue</span><span>OP {pct1(t.op_share ?? 0)}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 10, cursor: "crosshair" }} preserveAspectRatio="xMidYMid meet"
          onMouseMove={onMove} onMouseLeave={() => setHi(null)} role="img" aria-label="Inpatient and outpatient gross margin rate by month">
          {[0, 10, 20, 30, 40, 50].filter((g) => g <= ymax).map((g) => (
            <g key={g}><line x1={PL} y1={Y(g)} x2={W - PR} y2={Y(g)} stroke={LINE} strokeWidth="1" /><text x={PL - 7} y={Y(g) + 3.5} textAnchor="end" style={{ fontSize: 9, fill: SUB }}>{g}</text></g>
          ))}
          <line x1={PL} y1={Y(Number(t.margin_pct ?? 0))} x2={W - PR} y2={Y(Number(t.margin_pct ?? 0))} stroke={BRASS} strokeWidth="1" strokeDasharray="5 4"
            style={{ opacity: on ? 1 : 0, transition: "opacity 400ms ease 900ms" }} />
          <text x={W - PR} y={Y(Number(t.margin_pct ?? 0)) - 5} textAnchor="end" style={{ fontSize: 9.5, fill: BRASS, fontWeight: 600, opacity: on ? 1 : 0, transition: "opacity 400ms ease 900ms" }}>book {pct1(t.margin_pct ?? 0)}</text>
          {hi != null && <line x1={PL + hi * slotW + slotW / 2} y1={PT} x2={PL + hi * slotW + slotW / 2} y2={BY} stroke="rgba(22,32,28,.28)" strokeWidth="1" />}
          {([["op", op, SEA], ["ip", ip, JADE]] as const).map(([k, vals, c]) => (
            <path key={k} d={steps(vals)} fill="none" stroke={c} strokeWidth={lift === k ? 2.8 : lift ? 0.9 : 2.2} strokeLinecap="round"
              pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, opacity: lift && lift !== k ? 0.35 : 1, transition: `stroke-dashoffset 900ms ${EASE} 400ms, stroke-width 160ms, opacity 160ms` }} />
          ))}
          {tl.map((r, i) => <text key={i} x={PL + i * slotW + slotW / 2} y={196} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: hi === i ? 700 : 500, fill: hi === i ? INK : SUB }}>{r.label}</text>)}
        </svg>
        <div className="text-[12.5px] tabular-nums mt-1" style={{ minHeight: 22, color: INK }} aria-live="polite">
          {a && a.ip != null && a.op != null ? (
            <span key={hi} style={{ animation: "rmFade 140ms ease both" }}>
              <b>{a.l}</b> — IP <b style={{ color: JADE_DEEP }}>{pct1(a.ip)}</b> · OP <b style={{ color: SEA }}>{pct1(a.op)}</b>
              <span style={{ color: SUB }}> · gap {(a.ip - a.op) >= 0 ? "+" : "−"}{Math.abs(a.ip - a.op).toFixed(1)} pts</span>
            </span>
          ) : <span style={{ color: SUB }}>hover a month — both channels on the same rate axis</span>}
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
          {rows.map((r) => (
            <div key={r.k} onMouseEnter={() => setLift(r.k)} onMouseLeave={() => setLift(null)}
              className="grid items-center gap-2 py-1.5 text-[12px] tabular-nums rounded transition-colors"
              style={{ gridTemplateColumns: "1fr 92px 58px 92px 58px", background: lift === r.k ? "rgba(46,140,116,.05)" : "transparent" }}>
              <span className="flex items-center gap-2 min-w-0" style={{ color: INK }}><span style={{ width: 2, height: 12, background: r.c, flexShrink: 0 }} />{r.label}</span>
              <span className="text-right" style={{ color: INK }}>{inr(r.rev)}</span>
              <span className="text-right" style={{ color: SUB }}>{pct1(r.share)}</span>
              <span className="text-right" style={{ color: INK }}>{inr(r.mg)}</span>
              <span className="text-right font-semibold" style={{ color: r.c === JADE ? JADE_DEEP : SEA }}>{r.rev ? pct1((r.mg / r.rev) * 100) : "—"}</span>
            </div>
          ))}
          <div className="grid gap-2 text-[9.5px] uppercase pt-1" style={{ gridTemplateColumns: "1fr 92px 58px 92px 58px", color: SUB, letterSpacing: ".05em" }}>
            <span /><span className="text-right">revenue</span><span className="text-right">share</span><span className="text-right">margin</span><span className="text-right">rate</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT-2 — Margin at stake vs the house rate
// ─────────────────────────────────────────────────────────────────────────────
function AtStake({ data, onDrill }: { data: any; onDrill: (d: any) => void }) {
  const { ref, on } = useInView<HTMLDivElement>();
  const t = data?.totals || {};
  const [dim, setDim] = useState<"hospital" | "manufacturer">("hospital");
  const [sort, setSort] = useState<"at_stake" | "revenue" | "margin_pct">("at_stake");
  const [hov, setHov] = useState<number | null>(null);
  const BOOK = Number(t.margin_pct ?? 0);

  const rows = useMemo(() => {
    const src = (dim === "hospital" ? data?.by_hospital : data?.by_manufacturer) || [];
    const key = dim === "hospital" ? "hospital" : "manufacturer";
    const base = src.map((r: any) => ({
      name: String(r[key]), revenue: Number(r.revenue || 0), margin: Number(r.margin || 0),
      qty: Number(r.qty || 0), margin_pct: Number(r.margin_pct || 0), resid: false,
      // computed this way (not via the rounded percent) to avoid compounding rounding
      at_stake: Number(r.margin || 0) - Number(r.revenue || 0) * BOOK / 100,
    }));
    // RESIDUAL — the truncation fix. A top-N list must not pass itself off as a ranking.
    const sr = Number(t.revenue || 0) - base.reduce((s: number, r: any) => s + r.revenue, 0);
    const sm = Number(t.margin || 0) - base.reduce((s: number, r: any) => s + r.margin, 0);
    if (sr > 0.005 * Number(t.revenue || 0)) {
      const total = dim === "hospital" ? Number(t.hospitals || 0) : Number(t.manufacturers || 0);
      base.push({
        name: `All other ${dim === "hospital" ? "hospitals" : "manufacturers"} (${Math.max(total - base.length, 0).toLocaleString("en-IN")})`,
        revenue: sr, margin: sm, qty: 0, margin_pct: sr ? (sm / sr) * 100 : 0, resid: true, at_stake: sm - sr * BOOK / 100,
      });
    }
    const dir = sort === "margin_pct" ? -1 : -1;
    return base.sort((a: any, b: any) => (b[sort] - a[sort]) * (dir < 0 ? 1 : -1));
  }, [data, dim, sort, BOOK, t]);

  const dom = Math.max(...rows.map((r: any) => Math.abs(r.at_stake)), 1) * 1.08;
  const a = hov != null ? rows[hov] : null;

  return (
    <Card delay={260}>
      <div ref={ref}>
        <Head label="Margin at stake — against the house rate"
          note={`Rupees, not rates: revenue × (this entity's margin % − the book's ${pct1(BOOK)}). A big site two points light costs more than a small one twenty points rich.`}
          badge={`${rows.filter((r: any) => !r.resid).length} of ${(dim === "hospital" ? t.hospitals : t.manufacturers) ?? "—"} + residual`} />
        <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
          <div className="flex items-center gap-4 relative">
            {(["hospital", "manufacturer"] as const).map((d) => (
              <button key={d} onClick={() => setDim(d)} className="text-[12.5px] font-semibold pb-1 relative transition-colors"
                style={{ color: dim === d ? INK : SUB }}>
                {d === "hospital" ? "Hospitals" : "Manufacturers"}
                <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: BRASS, transformOrigin: "left", transform: dim === d ? "scaleX(1)" : "scaleX(0)", transition: `transform 320ms ${EASE}` }} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10.5px] font-semibold" style={{ color: SUB }}>
            {([["revenue", "Revenue"], ["margin_pct", "Margin %"], ["at_stake", "At stake"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setSort(k)} className="transition-colors" style={{ color: sort === k ? INK : SUB }}>
                {l}{sort === k && <span style={{ color: BRASS }}> ▾</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2">
          {rows.map((r: any, i: number) => (
            <button key={r.name} type="button"
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              onClick={() => !r.resid && onDrill({ title: `${r.name} — items`, query: `${dim}=${encodeURIComponent(r.name)}` })}
              className="w-full grid items-center gap-2 text-left rounded transition-colors"
              style={{
                gridTemplateColumns: "168px 1fr 80px 60px 82px", height: 34,
                background: hov === i ? "rgba(176,122,30,.05)" : "transparent",
                opacity: hov != null && hov !== i ? 0.5 : 1, transition: "opacity 160ms, background 160ms",
                borderTop: r.resid ? `1px dashed ${LINE}` : "none", cursor: r.resid ? "default" : "pointer",
              }}>
              <span className="text-[12px] truncate pr-1" style={{ color: r.resid ? SUB : INK }} title={r.name}>{nm(r.name, 26)}</span>
              <svg viewBox="0 0 200 18" width="100%" height="18" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                <line x1="100" y1="1" x2="100" y2="17" stroke={LINE} strokeWidth="1" />
                <rect x={r.at_stake >= 0 ? 100 : 100 - (Math.abs(r.at_stake) / dom) * 100} y="3"
                  width={on ? (Math.abs(r.at_stake) / dom) * 100 : 0} height="12" rx="3"
                  fill={r.at_stake >= 0 ? JADE : GRAPHITE} opacity={r.resid ? 0.55 : 1}
                  style={{ transition: `width 640ms ${EASE} ${300 + i * 30}ms, x 640ms ${EASE} ${300 + i * 30}ms` }} />
              </svg>
              <span className="text-[11.5px] text-right tabular-nums" style={{ color: SUB }}>{inr(r.revenue)}</span>
              <span className="text-[11.5px] text-right tabular-nums" style={{ color: r.margin_pct >= BOOK ? JADE_DEEP : GRAPHITE }}>{pct1(r.margin_pct)}</span>
              <span className="text-[12px] text-right font-semibold tabular-nums" style={{ color: r.at_stake >= 0 ? JADE_DEEP : GRAPHITE }}>{sgn(r.at_stake)}</span>
            </button>
          ))}
        </div>
        <div className="text-[12px] tabular-nums mt-2 pt-2" style={{ minHeight: 20, borderTop: `1px solid ${LINE}`, color: INK }} aria-live="polite">
          {a ? (
            <span key={hov} style={{ animation: "rmFade 140ms ease both" }}>
              <b>{nm(a.name, 30)}</b> — {inr(a.revenue)} billed, {pct1(a.margin_pct)} margin, <b style={{ color: a.at_stake >= 0 ? JADE_DEEP : GRAPHITE }}>{sgn(a.at_stake)}</b> against the house rate
              {a.qty > 0 && <span style={{ color: SUB }}> · ₹{Math.round(a.margin / a.qty).toLocaleString("en-IN")} margin per unit</span>}
            </span>
          ) : <span style={{ color: SUB }}>hover a row · click to open its billed items</span>}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT-3 — Profit pool (Marimekko: width = revenue share, height = margin %, area = margin ₹)
// ─────────────────────────────────────────────────────────────────────────────
function ProfitPool({ data, onDrill }: { data: any; onDrill: (d: any) => void }) {
  const uid = useId().replace(/[:]/g, "");
  const { ref, on } = useInView<HTMLDivElement>();
  const t = data?.totals || {};
  const [hov, setHov] = useState<number | null>(null);
  const W = 900, H = 396, PLx = 24, BY = 316, PT = 28, PH = BY - PT, PW = 852;
  const TREV = Number(t.revenue || 0), TMAR = Number(t.margin || 0);

  const cols = useMemo(() => {
    const src = [...(data?.by_category || [])].sort((a: any, b: any) => b.revenue - a.revenue);
    const tailRev = Math.max(0, TREV - src.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0));
    const tailMar = TMAR - src.reduce((s: number, r: any) => s + Number(r.margin || 0), 0);
    const kept: any[] = []; let foldRev = tailRev, foldMar = tailMar;
    src.forEach((r: any) => {
      // lossless roll-up: width ∝ revenue and height ∝ margin/revenue, so the folded
      // column's AREA is still exactly its combined margin rupees
      if ((Number(r.revenue) / TREV) * PW >= 26) kept.push({ ...r, revenue: Number(r.revenue), margin: Number(r.margin) });
      else { foldRev += Number(r.revenue || 0); foldMar += Number(r.margin || 0); }
    });
    if (foldRev > 0) kept.push({ group: "Other & unlisted groups", revenue: foldRev, margin: foldMar, margin_pct: foldRev ? (foldMar / foldRev) * 100 : 0, fold: true });
    return kept;
  }, [data, TREV, TMAR]);

  const YMAXC = Math.max(50, Math.ceil(Math.max(...cols.map((c: any) => c.margin_pct), 0) / 10) * 10);
  const gap = 3, usable = PW - gap * Math.max(cols.length - 1, 0);
  let cursor = PLx;
  const laid = cols.map((c: any) => { const w = (c.revenue / TREV) * usable; const x = cursor; cursor += w + gap; return { ...c, x, w }; });
  const a = hov != null ? laid[hov] : null;
  const BOOK = Number(t.margin_pct ?? 0);

  return (
    <Card delay={340}>
      <div ref={ref}>
        <Head label="The profit pool — where the margin actually is"
          note="Column width is share of billed revenue, height is margin % — so the AREA of each column is margin rupees."
          badge={`${laid.length} columns · 100% of billed revenue`} />
        <div style={{ overflowX: "auto" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", minWidth: 720, marginTop: 8 }} preserveAspectRatio="xMidYMid meet"
            role="img" aria-label="Profit pool by material group: width is revenue share, height is margin percent">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}><line x1={PLx} y1={BY - f * PH} x2={PLx + PW} y2={BY - f * PH} stroke={LINE} strokeWidth="1" />
                <text x={PLx - 6} y={BY - f * PH + 3} textAnchor="end" style={{ fontSize: 9, fill: BRASS }}>{Math.round(f * YMAXC)}%</text></g>
            ))}
            <g>
              {laid.map((c: any, i: number) => {
                const neg = c.margin_pct < 0, h = (Math.abs(c.margin_pct) / YMAXC) * PH;
                return (
                  <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
                    onClick={() => !c.fold && onDrill({ title: `${c.group} — items`, query: `group=${encodeURIComponent(c.group)}` })}
                    style={{ cursor: c.fold ? "default" : "pointer", opacity: hov != null && hov !== i ? 0.45 : 1, transform: hov === i ? "translateY(-3px)" : "translateY(0)", transition: `opacity 180ms, transform 160ms cubic-bezier(.34,1.1,.64,1)` }}>
                    {/* negative guard: an SVG rect with a negative height renders nothing —
                        a vanished loss is the worst possible failure on a margin page */}
                    <rect x={c.x} y={neg ? BY : BY - (on ? h : 0)} width={c.w} height={on ? h : 0}
                      fill={c.fold ? GRAPHITE : neg ? GRAPHITE : JADE} fillOpacity={c.fold ? 0.35 : 1}
                      style={{ transition: `height 700ms ${EASE_OUT} ${200 + i * 60}ms, y 700ms ${EASE_OUT} ${200 + i * 60}ms` }} />
                    <rect x={c.x} y={neg ? BY + (on ? h : 0) - 1.5 : BY - (on ? h : 0)} width={c.w} height={1.5} fill={neg ? GRAPHITE : JADE_DEEP}
                      style={{ transition: `y 700ms ${EASE_OUT} ${200 + i * 60}ms` }} />
                    {hov === i && <rect x={c.x} y={neg ? BY : BY - h} width={c.w} height={h} fill="none" stroke={INK} strokeWidth="1.5" />}
                  </g>
                );
              })}
            </g>
            <line x1={PLx} y1={BY} x2={PLx + PW} y2={BY} stroke={INK} strokeWidth="1" />
            <g style={{ opacity: on ? 1 : 0, transition: "opacity 400ms ease 1000ms" }}>
              <line x1={PLx} y1={BY - (BOOK / YMAXC) * PH} x2={PLx + PW} y2={BY - (BOOK / YMAXC) * PH} stroke={BRASS} strokeWidth="1" strokeDasharray="5 4" />
              <text x={PLx + PW} y={BY - (BOOK / YMAXC) * PH - 5} textAnchor="end" style={{ fontSize: 9.5, fontWeight: 600, fill: BRASS }}>book {pct1(BOOK)}</text>
            </g>
            {laid.map((c: any, i: number) => c.w > 54 && (
              <text key={i} x={c.x + c.w / 2} y={BY + 16} textAnchor="middle" style={{ fontSize: 9.5, fill: hov === i ? INK : SUB }}>{nm(c.group, Math.floor(c.w / 6))}</text>
            ))}
            <text x={PLx} y={H - 14} style={{ fontSize: 9.5, fill: SUB }}>← column width = share of billed revenue · height = margin % · area = margin rupees</text>
          </svg>
        </div>
        <div className="text-[12px] tabular-nums mt-1" style={{ minHeight: 20, color: INK }} aria-live="polite">
          {a ? (
            <span key={hov} style={{ animation: "rmFade 140ms ease both" }}>
              <b>{a.group}</b> — {inr(a.revenue)} billed ({pct1((a.revenue / TREV) * 100)} of the book) · {inr(a.margin)} margin · <b style={{ color: a.margin_pct >= BOOK ? JADE_DEEP : GRAPHITE }}>{pct1(a.margin_pct)}</b> margin
              <span style={{ color: SUB }}> · {pct1((a.margin / TMAR) * 100)} of all billed margin</span>
            </span>
          ) : <span style={{ color: SUB }}>hover a column · click to open its billed items</span>}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT-4 — Margin concentration, top 12 items
// ─────────────────────────────────────────────────────────────────────────────
function Concentration({ data, onDrill }: { data: any; onDrill: (d: any) => void }) {
  const { ref, on } = useInView<HTMLDivElement>();
  const t = data?.totals || {};
  const [hov, setHov] = useState<number | null>(null);
  const W = 900, H = 340, PL = 48, BY = 256, PT = 28, PH = BY - PT, PW = 828;
  const TMAR = Number(t.margin || 0), TREV = Number(t.revenue || 0), BOOK = Number(t.margin_pct ?? 0);
  const items = useMemo(() => [...(data?.top_items || [])].map((r: any) => ({ ...r, margin: Number(r.margin || 0), revenue: Number(r.revenue || 0) })).sort((a: any, b: any) => b.margin - a.margin), [data]);
  const maxM = Math.max(...items.map((r: any) => Math.abs(r.margin)), 1);
  const nB = items.length || 1, barW = 44, gapW = nB > 1 ? (PW - nB * barW) / (nB - 1) : 0;
  const bx = (i: number) => PL + i * (barW + gapW);
  // TRUE denominator — share of ALL billed margin, so the curve ends where it truly ends
  // instead of the 100% a within-sample Pareto fakes
  let run = 0; const cum = items.map((r: any) => { run += r.margin; return TMAR ? (run / TMAR) * 100 : 0; });
  const finalC = cum[cum.length - 1] || 0;
  const CMAX = Math.max(10, Math.ceil(finalC / 5) * 5);
  const CY = (v: number) => BY - (v / CMAX) * PH;
  const stair = items.map((_: any, i: number) => `${i === 0 ? "M" : "L"}${bx(i)},${CY(cum[i])} L${bx(i) + barW},${CY(cum[i])}`).join(" ");
  const a = hov != null ? items[hov] : null;
  const sumRev = items.reduce((s: number, r: any) => s + r.revenue, 0);

  return (
    <Card delay={420}>
      <div ref={ref}>
        <Head label="How concentrated is the margin? Top 12 items"
          note="Cumulative share is measured against ALL billed margin, not against these twelve — so the curve ends where it truly ends."
          badge={`12 of ${Number(t.materials || 0).toLocaleString("en-IN")} materials`} />
        <div style={{ overflowX: "auto" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", minWidth: 700, marginTop: 8 }} preserveAspectRatio="xMidYMid meet"
            role="img" aria-label="Top 12 items by billed margin, with cumulative share of all billed margin">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}><line x1={PL} y1={BY - f * PH} x2={PL + PW} y2={BY - f * PH} stroke={LINE} strokeWidth="1" />
                <text x={PL - 6} y={BY - f * PH + 3} textAnchor="end" style={{ fontSize: 9, fill: SUB }}>{inr(f * maxM)}</text></g>
            ))}
            {[0, CMAX / 2, CMAX].map((v) => <text key={v} x={PL + PW + 8} y={CY(v) + 3} style={{ fontSize: 9, fill: BRASS }}>{v.toFixed(0)}%</text>)}
            {items.map((r: any, i: number) => {
              const neg = r.margin < 0, h = (Math.abs(r.margin) / maxM) * PH;
              return (
                <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
                  onClick={() => onDrill({ title: `${r.desc} — billed lines`, query: `material=${encodeURIComponent(r.material)}` })}
                  style={{ cursor: "pointer", opacity: hov != null && hov !== i ? 0.45 : 1, transition: "opacity 180ms" }}>
                  <rect x={bx(i)} y={neg ? BY : BY - h} width={barW} height={on ? h : 0} rx={4} fill={neg ? GRAPHITE : JADE}
                    style={{ transition: `height 620ms ${EASE} ${260 + i * 40}ms, y 620ms ${EASE} ${260 + i * 40}ms` }} />
                  {/* quality cap: TWO states only, split at the book rate that is already on
                      the page — no third "alarm" band inside the item cluster */}
                  <rect x={bx(i)} y={(neg ? BY + h : BY - h) - (neg ? 0 : 3)} width={barW} height={on ? 3 : 0} rx={1.5}
                    fill={r.margin_pct >= BOOK ? BRASS : GRAPHITE}
                    style={{ transition: `y 620ms ${EASE} ${260 + i * 40}ms, height 300ms ease ${640 + i * 40}ms` }} />
                </g>
              );
            })}
            <path d={stair} fill="none" stroke={BRASS} strokeWidth="1.6" pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 900ms ${EASE} 780ms` }} />
            <line x1={PL} y1={BY} x2={PL + PW} y2={BY} stroke={INK} strokeWidth="1" />
            {items.map((r: any, i: number) => <text key={i} x={bx(i) + barW / 2} y={BY + 16} textAnchor="middle" style={{ fontSize: 9, fill: hov === i ? INK : SUB }}>{String(r.material).slice(0, 7)}</text>)}
            <text x={PL} y={H - 22} style={{ fontSize: 9.5, fill: SUB }}>bars = margin ₹ · cap: brass ≥ book rate, graphite below · brass staircase = cumulative % of ALL billed margin</text>
            <text x={PL} y={H - 8} style={{ fontSize: 10.5, fill: SUB }}>
              these 12 of {Number(t.materials || 0).toLocaleString("en-IN")} materials = {pct1(TREV ? (sumRev / TREV) * 100 : 0)} of billed revenue and {pct1(finalC)} of billed margin
            </text>
          </svg>
        </div>
        <div className="text-[12px] tabular-nums mt-1" style={{ minHeight: 20, color: INK }} aria-live="polite">
          {a ? (
            <span key={hov} style={{ animation: "rmFade 140ms ease both" }}>
              <b>{nm(a.desc, 34)}</b> <span style={{ color: SUB }}>({a.group})</span> — {inr(a.revenue)} billed · {inr(a.margin)} margin · <b style={{ color: a.margin_pct >= BOOK ? BRASS : GRAPHITE }}>{pct1(a.margin_pct)}</b>
              {a.qty > 0 && <span style={{ color: SUB }}> · ₹{Math.round(a.margin / a.qty).toLocaleString("en-IN")} margin per unit</span>}
            </span>
          ) : <span style={{ color: SUB }}>hover an item · click to open its billed lines</span>}
        </div>
      </div>
    </Card>
  );
}

// ── Slide-over drill — full billed-item list behind any revenue cut (unchanged, proven) ──
function RevenueDrill({ drill, onClose }: { drill: any; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const open = !!drill;
  useEffect(() => {
    if (!drill) return;
    setLoading(true); setQ(""); setD(null);
    fetch(`${DASHBOARD_API_BASE_URL}/revenue/items?${drill.query}&limit=500`)
      .then((r) => r.json()).then(setD).catch(() => setD({ items: [], count: 0, returned: 0 })).finally(() => setLoading(false));
  }, [drill]);
  const items = (d?.items || []).filter((it: any) => !q || (it.desc || "").toLowerCase().includes(q.toLowerCase()) || String(it.material).includes(q));
  const exportCsv = () => {
    const rows = d?.items || []; if (!rows.length) return;
    const cols = ["material", "desc", "group", "revenue", "margin", "margin_pct", "qty"];
    const csv = [cols.join(",")].concat(rows.map((r: any) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${String(drill.title || "revenue-items").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
  };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(18,20,32,0.34)", backdropFilter: "blur(2px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s ease" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 61, width: "min(560px, 94vw)", background: "#fff", boxShadow: "-26px 0 64px -22px rgba(20,24,40,0.34)", transform: open ? "translateX(0)" : "translateX(101%)", transition: `transform .34s ${EASE}`, display: "flex", flexDirection: "column" }}>
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: SUB }}>Billed items</div>
              <h3 className="text-[19px] font-extrabold leading-tight truncate" style={{ color: INK }}>{drill?.title}</h3>
              <p className="text-[12.5px] mt-0.5" style={{ color: SUB }}>{d ? `${(d.count || 0).toLocaleString("en-IN")} items${d.count > d.returned ? ` · showing top ${d.returned}` : ""}` : "loading…"}</p>
            </div>
            <button onClick={onClose} aria-label="Close item list" className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#f2f3f6]" style={{ color: SUB }}><TbX size={19} /></button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: `1px solid ${LINE}`, background: PAGE }}>
              <TbSearch size={15} style={{ color: SUB }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item…" className="flex-1 bg-transparent text-[13px] focus:outline-none" style={{ color: INK }} />
            </div>
            <button onClick={exportCsv} title="Export CSV" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors hover:bg-[#f2f3f6]" style={{ border: `1px solid ${LINE}`, color: INK }}><TbDownload size={15} />Export</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-[13px]" style={{ color: SUB }}><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${JADE} transparent ${JADE} ${JADE}` }} />Loading…</div>
          ) : items.length ? items.map((r: any, i: number) => (
            <div key={r.material + "-" + i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f8fa] transition-colors">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold" style={{ background: "#EAF3EF", color: JADE_DEEP }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{r.desc}</div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: SUB }}>{r.group} · {Math.round(r.qty).toLocaleString("en-IN")} sold</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.revenue)}</div>
                <div className="text-[10.5px] font-semibold tabular-nums" style={{ color: JADE_DEEP }}>{pct1(r.margin_pct)} margin</div>
              </div>
            </div>
          )) : <div className="py-16 text-center text-[13px]" style={{ color: SUB }}>No items match.</div>}
        </div>
      </div>
    </>
  );
}

export default function RevenueMarginDetail() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  const [drill, setDrill] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/revenue/insights`).then((r) => r.json()).then((d) => { if (d?.ready) setData(d); else setErr(true); }).catch(() => setErr(true)); }, []);

  // ONE page-level points axis shared by the hero and support-1, so a reader can carry a
  // rate across the two cards. Floor of 50 keeps a flat margin rate reading as flat — a
  // zoomed 38–43% domain would turn ~1.3 points of noise into a narrative.
  const ymax = useMemo(() => {
    const tl: any[] = data?.timeline || [];
    const vals = tl.flatMap((r) => {
      const rev = Number(r.revenue) || 0;
      return rev ? [(Number(r.margin) / rev) * 100, (Number(r.internal_cost) / rev) * 100,
      Number(r.ip_revenue) ? (Number(r.ip_margin) / Number(r.ip_revenue)) * 100 : 0,
      Number(r.op_revenue) ? (Number(r.op_margin) / Number(r.op_revenue)) * 100 : 0] : [];
    });
    return Math.max(50, Math.ceil(Math.max(...vals, 0) / 10) * 10);
  }, [data]);

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6" style={{ minHeight: "calc(100vh - 64px)", background: PAGE }}>
      <style jsx global>{`
        @keyframes rmIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .rm-card{animation:rmIn 560ms ${EASE} both;min-width:0}
        @keyframes rmFade{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-motion: reduce){
          .rm-card{animation:none!important}
          .rm-card *{transition:none!important;animation:none!important}
        }
      `}</style>

      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: SUB }}>Consumption &amp; Revenue</div>
            <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Revenue &amp; margin</h1>
            <p className="text-[13px] mt-1" style={{ color: SUB }}>billed pharmacy revenue, true margin, and what leaves the shelf without a bill</p>
          </div>
          <span className="text-[12px] font-medium px-3.5 py-2 rounded-full" style={{ background: CARD, color: INK, border: `1px solid ${LINE}` }}>{data?.totals?.months ?? 6}-month window</span>
        </div>

        {err && !data ? (
          <div className="rounded-[22px] text-center py-16" style={{ background: CARD, boxShadow: SH_CARD }}>
            <div className="text-[14px] font-semibold" style={{ color: INK }}>Preparing revenue data…</div>
            <div className="text-[12.5px] mt-1" style={{ color: SUB }}>The sales figures are still being processed. Check back shortly.</div>
          </div>
        ) : !data ? (
          <div className="rounded-[24px] animate-pulse" style={{ height: 420, background: "#E7E3DA" }} />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-6">
            <div className="xl:col-span-12"><Hero data={data} ymax={ymax} /></div>
            <div className="xl:col-span-5"><Channels data={data} ymax={ymax} /></div>
            <div className="xl:col-span-7"><AtStake data={data} onDrill={setDrill} /></div>
            <div className="xl:col-span-12"><ProfitPool data={data} onDrill={setDrill} /></div>
            <div className="xl:col-span-12"><Concentration data={data} onDrill={setDrill} /></div>
          </div>
        )}
      </div>

      <RevenueDrill drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}
