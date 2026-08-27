"use client";
// Forecasting portfolio overview — dense metrics bar + the original app's rich
// forecast explorers (Sales / Cash-flow / Replenishment) + clickable KPI cards.
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { useCardCategory, useCardScopedData } from "@/components/common/CardCategoryFilter";
import { useDrillBind } from "@/components/portfolio/useDrillBind";
import { fetchReorderBandDrill } from "@/lib/drilldown";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbTargetArrow, TbArrowUpRight as TbUp, TbArrowDownRight } from "react-icons/tb";
import { Kpi } from "@/lib/kpiRegistry";
import InventoryGlassKpiCard from "@/components/portfolio/inventory/InventoryGlassKpiCard";
import { buildSimTiles } from "@/components/portfolio/inventory/kpiChartFetch";

// Simulated forecasting KPI(s) — same glass-card treatment, and the same buildSimTiles()
// helper, that Inventory/Consumption/Procurement's simulated tiles already use.
const simForecast = buildSimTiles("forecasting");

const BG = "#F6F7FB", CARD = "#fff", BORDER = "#ecedf4";
const INK = "#171a2e", MUT = "#6a7085", MUT2 = "#9ca2b6", LINE = "#f0f1f6";
const AC = "#6d5efc", AC2 = "#9b8ffd", ACSOFT = "#efedff";        // violet accent
const GREEN = "#1fa971", RED = "#e5545b", AMBER = "#f0a52a";      // semantic only
const SH = "0 1px 2px rgba(20,24,60,0.05), 0 8px 24px -14px rgba(20,24,60,0.14)";
const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

// 3 detailed forecast pages, labelled in plain operations language. These live outside
// kpiRegistry.KPIS — they use dedicated bespoke pages, not the generic /kpi/{key} route —
// so ExploreTile below builds a synthetic Kpi object per tile (same approach buildSimTiles()
// uses for simulated cards) and passes a real `href` override into InventoryGlassKpiCard,
// which otherwise defaults to `/kpi/${kpi.key}`.
const KPI_META: Record<string, any> = {
  "expected-demand": { title: "Expected Usage", href: "/salesQuantityForecast", sub: "how much you'll use, item by item" },
  "cash-flow-forecast": { title: "Procurement Budget", href: "/cashFlowForecast", sub: "cash you'll need to restock" },
  "stock-replenishment": { title: "Reorder & Stock Risk", href: "/stockReplenishmentForecast", sub: "what to order · what's running low" },
};

function Card({ children, className = "", style = {}, pad = "p-6" }: any) {
  return <div className={`fc-card rounded-[18px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SH, ...style }}>{children}</div>;
}
function SectionLabel({ n, title, hint, className = "" }: { n: number; title: string; hint?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 mb-3.5 flex-wrap ${className}`}>
      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: ACSOFT, color: AC }}>{n}</span>
      <h2 className="text-[16px] font-bold tracking-tight" style={{ color: INK }}>{title}</h2>
      {hint && <span className="text-[12.5px]" style={{ color: MUT2 }}>· {hint}</span>}
    </div>
  );
}
// Deltas are AMBER, never green. Both figures that carry one here point up — demand and
// restock cost — and rising demand against a shelf that is already empty is not good
// news. A green chip congratulates the reader for it.
function Delta({ pct }: { pct: number }) {
  const up = pct >= 0;
  return <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold tabular-nums" style={{ color: AMBER }}>{up ? <TbUp size={13} /> : <TbArrowDownRight size={13} />}{Math.abs(pct).toFixed(1)}%</span>;
}

// ── the "i" explainer ──
// Every headline figure carries one, and each answers the same three questions in the
// same order: how it was worked out, what it means, what to do. The consistency is the
// point — read one and you know the shape of all of them, so no number on the page is
// one the reader is expected to already understand. Opens on hover AND keyboard focus.
function Info({ how, means, act, align = "left" }: { how: React.ReactNode; means: React.ReactNode; act: React.ReactNode; align?: "left" | "right" }) {
  return (
    <span className={`fc-i${align === "right" ? " fc-i-r" : ""}`} tabIndex={0} role="button" aria-label="What this number means">
      i
      <span className="fc-i-pop">
        <b>How it is worked out</b><p>{how}</p>
        <b>What it means</b><p>{means}</p>
        <b>What to do</b><p>{act}</p>
      </span>
    </span>
  );
}

// ── forecast reliability, as a readable gauge ──
// A value on a labelled 0–100 scale rather than a coloured badge: the marker stands at
// the real figure, so the number and the bar agree on sight. The track carries no border
// — a 1px inset shrinks the box the fill is a percentage OF, which put the bar ~0.7%
// short of the label on a control whose whole justification is that it reads exactly.
function Reliability({ pct }: { pct: number }) {
  const on = useMount(160);
  const v = Math.max(0, Math.min(100, pct));
  return (
    <Card pad="p-0" className="w-full sm:w-[300px] sm:ml-auto shrink-0">
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUT }}>Forecast reliability</span>
          <Info align="right"
            how="We re-ran this forecast against the last 6 months that have already happened, and compared what it predicted with what was really used."
            means={<>It got it right <b style={{ color: INK }}>{v.toFixed(0)}% of the time</b> when looking at a whole category, like all injections together.</>}
            act="Trust it for planning totals and budgets. For one single product, treat it as a guide and check with your team." />
        </div>
        <div className="flex items-end gap-3.5 mt-2.5">
          <span className="text-[34px] font-extrabold leading-none tabular-nums tracking-[-0.03em]" style={{ color: AC }}>
            {v.toFixed(0)}<span className="text-[16px] font-semibold">%</span>
          </span>
          <div className="flex-1 min-w-0 pb-0.5">
            <div className="relative h-[7px] rounded-full overflow-hidden" style={{ background: "#e4e7f1" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${v}%` : "0%", background: `linear-gradient(90deg,${AC2},${AC})`, transition: "width .85s cubic-bezier(.16,1,.3,1)" }} />
              <span className="absolute top-[-3px] bottom-[-3px] w-[2px] rounded" style={{ left: `${v}%`, background: INK }} />
            </div>
            <div className="relative h-3 mt-1.5 text-[9px] tabular-nums" style={{ color: MUT2 }}>
              <span className="absolute left-0">0</span>
              <span className="absolute left-1/2 -translate-x-1/2">50</span>
              <span className="absolute right-0">100</span>
            </div>
          </div>
        </div>
      </div>
      <p className="px-4 py-2.5 m-0 text-[11px] leading-snug" style={{ color: MUT, borderTop: `1px solid ${LINE}` }}>
        Good for planning totals. Less so for one product on its own.
      </p>
    </Card>
  );
}

// ── the whole reorder queue as one readable bar ──
// Widths are strictly linear, so band 1 dominates exactly as much as it does in the
// data — any scale that made the small bands legible (log, equal-width) would quietly
// argue the opposite of the truth. The legend below carries every band's real count, so
// the tiny segments stay readable as numbers even though their slivers are not.
const BAND_TONE: Record<number, string> = { 1: RED, 2: "#e0762f", 3: AMBER, 4: "#a7adc0", 5: "#d9dde8" };
function QueueBar({ bands, total, loading }: { bands: any[]; total: number; loading: boolean }) {
  const on = useMount(140);
  if (loading) return <div className="rounded-[18px] animate-pulse mb-5" style={{ height: 150, background: "#eef0f6" }} />;
  if (!bands?.length || !total) return null;
  const b1 = bands.find((b) => b.band === 1) || { lines: 0 };
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="mb-5">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-2.5">
        <div>
          <p className="m-0 text-[21px] sm:text-[25px] font-medium leading-tight tracking-[-0.02em]" style={{ color: INK }}>
            <b className="font-extrabold" style={{ color: RED }}>{Number(b1.lines).toLocaleString("en-IN")} items</b> have already run out.
          </p>
          <p className="m-0 mt-2 text-[11.5px]" style={{ color: MUT }}>
            These are already late — not coming up, but overdue. They are {pct(b1.lines).toFixed(1)}% of everything waiting to be ordered.
          </p>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.11em] flex items-center" style={{ color: MUT2 }}>
          The full queue · {Number(total).toLocaleString("en-IN")} in total
          <Info align="right"
            how="For every item we stock we take how much is left and divide it by how fast it is being used. That gives the number of days it will last, and each item drops into one of the five groups below."
            means={<>Each product is counted once per hospital, because each hospital orders its own. <b style={{ color: INK }}>{pct(b1.lines).toFixed(1)}% have already hit zero.</b></>}
            act="Read this as a workload, not a warning. Almost everything here is already late." />
        </span>
      </div>

      <div className="flex gap-[2px] h-[58px] sm:h-[68px]" role="img"
           aria-label={`All ${total} items waiting to be ordered, split across five priority bands`}>
        {bands.map((b) => (
          <div key={b.band} className="flex items-center px-3 min-w-0 overflow-hidden"
               style={{ width: `${Math.max(pct(b.lines), 1.4)}%`, background: BAND_TONE[b.band] || MUT2,
                        transform: on ? "scaleX(1)" : "scaleX(0)", transformOrigin: "0 50%",
                        transition: `transform .7s cubic-bezier(.16,1,.3,1) ${b.band * 60}ms` }}>
            {b.band === 1 && (
              <span className="text-white min-w-0">
                <b className="block text-[19px] sm:text-[24px] font-extrabold leading-none tabular-nums tracking-[-0.02em]">{Number(b.lines).toLocaleString("en-IN")}</b>
                <span className="block mt-1 text-[11px] truncate opacity-90">Already run out · {pct(b.lines).toFixed(1)}%</span>
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mt-3.5" style={{ borderTop: `1px solid ${LINE}` }}>
        {bands.map((b, i) => (
          <div key={b.band} className="pt-3 pr-3 pl-3 first:pl-0"
               style={{ borderLeft: i === 0 ? "none" : `1px solid ${LINE}` }}>
            <div className="flex items-center gap-2">
              <i className="w-2.5 h-2.5 rounded-[2px] flex-none not-italic" style={{ background: BAND_TONE[b.band] || MUT2 }} />
              <span className="text-[11.5px] font-semibold" style={{ color: INK }}>{b.band === 1 ? "Already run out" : b.label}</span>
            </div>
            <div className="mt-1.5 text-[16px] font-bold tabular-nums tracking-[-0.015em]" style={{ color: b.band === 1 ? RED : INK }}>
              {Number(b.lines).toLocaleString("en-IN")}
              <em className="not-italic text-[11px] font-medium ml-1.5" style={{ color: MUT }}>{pct(b.lines).toFixed(1)}%</em>
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug" style={{ color: MUT }}>{BAND_PLAIN[b.band] || b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
// The API's own band descriptions are written in stock-control vocabulary ("under 2 weeks
// of cover", "still below safe stock"). These say the same thing in the words a store-room
// assistant would use, without touching the backend copy other pages rely on.
const BAND_PLAIN: Record<number, string> = {
  1: "Nothing left on the shelf — order today",
  2: "Less than 2 weeks left",
  3: "Less than 1 month left",
  4: "1–3 months left, but below the safe level",
  5: "Over 3 months left — top up when convenient",
};
function Spark({ vals, fcFrom, c = AC }: { vals: number[]; fcFrom: number; c?: string }) {
  const on = useMount(90); if (vals.length < 2) return null;
  const w = 200, h = 34, max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const X = (i: number) => (i / (vals.length - 1)) * w;
  const Y = (v: number) => h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
  const pts = vals.map((v, i) => ({ x: X(i), y: Y(v) }));
  const solid = pts.slice(0, Math.max(fcFrom, 1)), dash = pts.slice(Math.max(fcFrom - 1, 0));
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: "visible" }}>
    {solid.length > 1 && <path d={smoothPath(solid)} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1s ease .2s" }} />}
    {dash.length > 1 && fcFrom < vals.length && <path d={smoothPath(dash)} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" style={{ opacity: on ? 0.55 : 0, transition: "opacity .6s ease .8s" }} />}
  </svg>;
}

// ── forecast hero ──
function Forecast({ timeline, t, cat, loading }: { timeline: any[]; t: any; cat: any; loading: boolean }) {
  const on = useMount(120); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || [];
  const W = 1000, H = 300, PADX = 8, PADT = 20, PADB = 34;
  const iW = W - PADX * 2, iH = H - PADT - PADB, n = data.length || 1;
  const X = (i: number) => PADX + (i / Math.max(n - 1, 1)) * iW;
  const max = Math.max(...data.map((d) => d.upper ?? d.actual ?? 0), 1) * 1.06;
  const Y = (v: number) => PADT + iH - (v / max) * iH;
  const model = useMemo(() => {
    if (!data.length) return null;
    const aI = data.map((d, i) => (d.actual != null ? i : -1)).filter((i) => i >= 0); if (!aI.length) return null;
    const lastA = aI[aI.length - 1];
    const aPts = aI.map((i) => ({ x: X(i), y: Y(data[i].actual) }));
    const br = { x: X(lastA), y: Y(data[lastA].actual) };
    const fI = data.map((d, i) => (d.is_forecast ? i : -1)).filter((i) => i >= 0);
    const fPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].forecast) }))];
    const uPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].upper) }))];
    const lPts = [br, ...fI.map((i) => ({ x: X(i), y: Y(data[i].lower) }))];
    return { aPts, aLine: smoothPath(aPts), fLine: smoothPath(fPts), cone: `${smoothPath(uPts)} ${lPts.slice().reverse().map((p) => `L ${p.x} ${p.y}`).join(" ")} Z`, nowX: X(lastA) };
  }, [timeline]);
  if (!model) return (
    // Was a bare "Loading forecast…" — with a card-level filter this is also the state a
    // legitimately empty category lands in (onco has 3 consumption rows in six months),
    // and "Loading…" forever is exactly what a broken filter looks like.
    <Card className="flex flex-col justify-center" style={{ minHeight: 380 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUT }}>Expected usage</div>
        {cat.chip}
      </div>
      <div className="mt-4">{cat.note(true) ?? <span style={{ color: MUT }}>Loading forecast…</span>}</div>
    </Card>
  );
  return (
    <Card className="flex flex-col flex-1" style={{ minHeight: 380 }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUT }}>Expected usage · next {t?.horizon ?? 3} months</div>
          <div className="mt-2.5 flex items-end gap-2.5 flex-wrap">
            <span className="text-[42px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={Number(t?.next_demand ?? 0)} format={countAbbr} /></span>
            <span className="text-[13.5px] font-medium mb-1" style={{ color: MUT }}>units expected next month</span>
          </div>
          <div className="mt-2 text-[12.5px]" style={{ color: MUT }}>Likely range <b style={{ color: INK }}>{countAbbr(Number(t?.next_lower ?? 0))} – {countAbbr(Number(t?.next_upper ?? 0))}</b> units</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {cat.chip}
          {/* The reliability pill is HIDDEN while this card is filtered. `totals.accuracy`
              is one back-test statistic for the whole model — it returns 85.7 for All,
              Onco, Consumables and Unclassified alike. Leaving it on a filtered card
              would assert a per-category accuracy the model never computed. */}
          {!cat.active && <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: ACSOFT, color: AC }}><TbTargetArrow size={13} />{Number(t?.accuracy ?? 0).toFixed(0)}% reliable</span>}
        </div>
      </div>
      {cat.note(!loading && !Number(t?.next_demand)) && <div className="mt-3">{cat.note(true)}</div>}
      <div className="relative mt-4 flex-1" style={{ minHeight: 230 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id="fCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={AC} stopOpacity="0.22" /><stop offset="100%" stopColor={AC} stopOpacity="0.02" /></linearGradient>
            <linearGradient id="fAct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={AC} stopOpacity="0.14" /><stop offset="100%" stopColor={AC} stopOpacity="0" /></linearGradient>
          </defs>
          {[0.33, 0.66, 1].map((gr, i) => <line key={i} x1={PADX} y1={Y(max * gr)} x2={W - PADX} y2={Y(max * gr)} stroke={LINE} strokeWidth="1" />)}
          <path d={model.cone} fill="url(#fCone)" style={{ opacity: on ? 1 : 0, transform: on ? "scaleY(1)" : "scaleY(0.5)", transformOrigin: `${model.nowX}px ${Y(0)}px`, transition: "opacity .9s ease .5s, transform 1s cubic-bezier(.22,1,.36,1) .5s" }} />
          <path d={`${model.aLine} L ${model.aPts[model.aPts.length - 1].x} ${Y(0)} L ${model.aPts[0].x} ${Y(0)} Z`} fill="url(#fAct)" style={{ opacity: on ? 1 : 0, transition: "opacity .8s ease .3s" }} />
          <path d={model.aLine} fill="none" stroke={AC} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.2s ease .3s" }} />
          <path d={model.fLine} fill="none" stroke={AC2} strokeWidth="2.75" strokeLinecap="round" strokeDasharray="6 6" style={{ opacity: on ? 1 : 0, transition: "opacity .7s ease 1s" }} />
          <line x1={model.nowX} y1={PADT - 6} x2={model.nowX} y2={PADT + iH} stroke="#d6d8e6" strokeWidth="1.25" strokeDasharray="3 4" />
          <text x={model.nowX + 6} y={PADT + 1} style={{ fontSize: 10, fontWeight: 600, fill: MUT2 }}>forecast</text>
          {data.map((d, i) => { const isF = d.is_forecast; const v = isF ? d.forecast : d.actual; if (v == null) return null; const active = hov === i; return (
            <g key={i} onMouseEnter={() => setHov(i)}>
              <rect x={X(i) - iW / (n * 2)} y={0} width={iW / n} height={H} fill="transparent" />
              <circle cx={X(i)} cy={Y(v)} r={active ? 5 : 0} fill="#fff" stroke={isF ? AC2 : AC} strokeWidth="2.5" />
              <text x={X(i)} y={H - 6} textAnchor="middle" style={{ fontSize: 11, fill: active ? INK : MUT2, fontWeight: active ? 600 : 500 }}>{d.label}</text>
            </g>
          ); })}
        </svg>
        {hov != null && data[hov] && (() => { const d = data[hov]; return (
          <div className="absolute pointer-events-none" style={{ left: `${(X(hov) / W) * 100}%`, top: 0, transform: "translate(-50%,-6px)" }}>
            <div className="px-3 py-1.5 rounded-lg text-center whitespace-nowrap" style={{ background: INK, boxShadow: "0 10px 24px -8px rgba(20,24,60,0.5)" }}>
              <div className="text-[12px] font-bold tabular-nums text-white">{countAbbr(d.is_forecast ? d.forecast : d.actual)} <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{d.is_forecast ? "forecast" : "actual"}</span></div>
              {d.is_forecast && <div className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.55)" }}>{countAbbr(d.lower)}–{countAbbr(d.upper)}</div>}
            </div></div>); })()}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] font-medium" style={{ color: MUT2 }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2.5px] rounded-full" style={{ background: AC }} />Actual use</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: AC2 }} />Forecast</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm" style={{ background: `${AC}33` }} />Likely range</span>
      </div>
    </Card>
  );
}

function Horizon({ timeline, cat, loading }: any) {
  const on = useMount(180);
  const fc = (timeline || []).filter((d: any) => d.is_forecast);
  const max = Math.max(...fc.map((d: any) => d.forecast), 1);
  // True when every month of the horizon carries the same figure (see the label below).
  // Rounded before comparing so floating-point dust can't read as real month-to-month
  // variation. Needs 2+ months to mean anything.
  const isFlat = fc.length > 1 && new Set(fc.map((d: any) => Math.round(Number(d.forecast) || 0))).size === 1;
  // Was `if (!fc.length) return null` — a card that DISAPPEARS when you filter it reads
  // as the page breaking, so it now stays and states the reason.
  if (!fc.length) return (
    <Card className="flex flex-col" pad="p-5" style={{ minHeight: 130 }}>
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUT }}>Expected use by month</div>
        {cat.chip}
      </div>
      {cat.note(true) ?? <span className="text-[12px]" style={{ color: MUT2 }}>No forecast in this window.</span>}
    </Card>
  );
  return (
    <Card className="flex flex-col" pad="p-5" style={{ minHeight: 130 }}>
      <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
        <div className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUT2 }}>Expected use by month</div>
        <div className="flex items-center gap-2">
          {cat.chip}
          {/* The engine is a level+rate model with no trend/seasonality term, so it returns
              ONE monthly run-rate repeated across the horizon -- identical bars every time
              (verified at plant, category and combined scope). Three equal bars under a
              plain "next 3 months" label read as three independently forecast months that
              happen to match, implying a per-month precision the model does not claim. This
              is DERIVED rather than hardcoded so the label self-corrects to the plain form
              if a future model version ever produces a varying horizon. */}
          <span className="text-[11.5px]" style={{ color: MUT2 }}
                title={isFlat ? "The forecast is one monthly run-rate applied across the horizon — the model projects a level, not a month-by-month trend. The widening range on the usage chart is where the growing uncertainty shows." : undefined}>
            units · {isFlat ? `same rate × ${fc.length} months` : `next ${fc.length} months`}
          </span>
        </div>
      </div>
      {cat.note(!loading && fc.every((m: any) => !Number(m.forecast))) && <div className="mb-3">{cat.note(true)}</div>}
      <div className="flex-1 flex flex-col justify-around gap-2">
        {fc.map((m: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] font-semibold w-9 flex-shrink-0" style={{ color: "#4a5068" }}>{m.label}</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#f1f2f8" }}><div className="h-full rounded-full" style={{ width: on ? `${(m.forecast / max) * 100}%` : "0%", background: `linear-gradient(90deg,${AC2},${AC})`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 80}ms` }} /></div>
            <span className="text-[13px] font-bold tabular-nums w-14 text-right flex-shrink-0" style={{ color: INK }}>{countAbbr(m.forecast)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgingCard({ segs, total, cat, loading }: any) {
  const on = useMount(140);
  // Ranked by the stock sitting behind each status — the same measure the arc lengths
  // are counted from is `count`, but "what is turning slow" is a value question.
  const drill = useDrillBind({
    kpi: "aging-risk-forecast", dim: "aging_risk_forecast", by: "material", measure: "closing_stock",
    label: "items", dimLabel: "90-day outlook", format: countAbbr, category: cat.drill,
  });
  const rising = segs.find((s: any) => s.status === "Rising") || { count: 0 };
  const stable = segs.find((s: any) => s.status === "Stable") || { count: 0 };
  const riskPct = total ? Math.round((rising.count / total) * 100) : 0;
  const R = 46, SW = 14, C = 2 * Math.PI * R; let acc = 0;
  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUT }}>Slow-moving stock</div>
        <div className="flex items-center gap-2">
          {cat.chip}
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: `${AMBER}16`, color: "#c17d10" }}>next 90 days</span>
        </div>
      </div>
      {cat.note(!loading && total === 0) && <div className="mt-3">{cat.note(true)}</div>}
      <div className="flex items-center gap-5 mt-3 flex-1">
        <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#f1f3f9" strokeWidth={SW} />
            {segs.map((s: any, i: number) => { const frac = total ? s.count / total : 0; const len = frac * C; const off = -acc; acc += len;
              return <circle key={i} cx="64" cy="64" r={R} fill="none" stroke={s.color} strokeWidth={SW} strokeLinecap="butt" strokeDasharray={`${on ? len : 0} ${C}`} strokeDashoffset={off} style={{ transition: `stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1) ${i * 140}ms` }} />; })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[24px] font-bold tabular-nums leading-none" style={{ color: AMBER }}>{riskPct}%</span><span className="text-[10px] mt-0.5" style={{ color: MUT2 }}>at risk</span></div>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-0.5" {...drill.bind("Rising")}><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: AMBER }} /><span className="text-[12.5px] font-medium" style={{ color: "#4a5068" }}>Turning slow</span></span><span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(rising.count)}</span></div>
            <div className="text-[11px]" style={{ color: MUT2 }}>review before they expire</div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5" {...drill.bind("Stable")}><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: GREEN }} /><span className="text-[12.5px] font-medium" style={{ color: "#4a5068" }}>Moving well</span></span><span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(stable.count)}</span></div>
            <div className="text-[11px]" style={{ color: MUT2 }}>healthy turnover</div>
          </div>
        </div>
      </div>
      <p className="mt-auto pt-3 mb-0 text-[11px] leading-relaxed" style={{ color: MUT, borderTop: `1px solid ${LINE}` }}><b style={{ color: INK }}>{countAbbr(rising.count)}</b> of {countAbbr(total)} items are likely to stop moving within 90 days — review them before they expire and tie up cash.</p>
      {drill.panel}
    </Card>
  );
}

// Priority band colours — an urgency ramp, not this page's violet brand accent, because
// the whole point of the list is that position 1 is more urgent than position 7.
const BAND_C: Record<number, string> = { 1: "#e5545b", 2: "#e0803a", 3: "#f0a52a", 4: "#5f9d6f", 5: "#8b93a8" };
const BAND_SOFT: Record<number, string> = { 1: "#fdecec", 2: "#fbeee2", 3: "#fdf3e0", 4: "#e8f2ea", 5: "#eef0f4" };

// Reads off `priority_queue`, NOT the old `top_reorder`. `top_reorder` was sorted by
// rupee value, so its number-one line was an item with 806 months of cover that merely
// happened to be expensive — the opposite of a priority list. The queue is ordered by
// how soon the line runs out, then by monthly usage.
function Reorder({ rows, totals, cat, loading }: { rows: any[]; totals: any; cat: any; loading: boolean }) {
  const on = useMount(200); const data = (rows || []).slice(0, 7);
  // The band chip on each row is the priority band; drilling it lists the whole band's
  // queue, not just the seven shown. Ranked on replenishment QUANTITY, because only
  // ~16% of these lines carry a unit cost — a rupee sort would bury the rest at Rs 0.
  const drill = useDrillBind({
    kpi: "reorder-priority", dim: "priority_band", by: "material", label: "lines",
    dimLabel: "Priority band", format: countAbbr, fetcher: fetchReorderBandDrill,
    category: cat.drill,
  });
  // Bars encode monthly usage — the tiebreak the backend actually sorts on, and a figure
  // that exists for every line. Rupees exist for only 16.5% of them.
  // Bars are sized by the order quantity, which exists on every line — rupees exist on
  // only ~16.5% of them, so a value-sized bar would flatten most of the list to zero.
  const max = Math.max(...data.map((r) => Number(r.reorder_qty) || 0), 1);
  return (
    <Card pad="p-0" className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] flex items-center" style={{ color: MUT }}>
          The order list
          <Info
            how="Every item needing an order, sorted by how soon it runs out — not by how expensive it is."
            means="The top of the list is the most urgent. These have already run out, so they are ranked by how much is needed."
            act="Work straight down from the top. Do not skip ahead to the expensive ones." />
        </div>
        <div className="flex items-center gap-2.5">
          {cat.chip}
          <span className="text-[10.5px] uppercase tracking-[0.08em]" style={{ color: MUT2 }}>
            Top {data.length} of {Number(totals?.reorder_lines ?? 0).toLocaleString("en-IN")} · one product at one hospital
          </span>
        </div>
      </div>
      {cat.note(!loading && data.length === 0) && <div className="px-5 pt-3">{cat.note(true)}</div>}

      <div className="flex-1 flex flex-col">
        {data.map((r, i) => {
          const c = BAND_C[r.priority_band] || AC;
          const pct = ((Number(r.reorder_qty) || 0) / max) * 100;
          return (
            <div key={`${r.material}-${r.plant}-${i}`}
                 className="grid items-center gap-3.5 px-5 py-2.5 transition-colors hover:bg-[#fafbff]"
                 style={{ gridTemplateColumns: "26px minmax(0,1fr) 128px", borderBottom: i === data.length - 1 ? "none" : `1px solid ${LINE}` }}>
              <span className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-[10.5px] font-bold tabular-nums flex-shrink-0 cursor-pointer"
                title={r.priority_label} style={{ background: BAND_SOFT[r.priority_band] || ACSOFT, color: c }} {...drill.bind(r.priority_band)}>{r.priority_band}</span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{nm(r.desc, 44)}</div>
                <div className="text-[10.5px] tabular-nums mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: MUT2 }}>
                  <span className="px-1.5 rounded" style={{ border: `1px solid ${BORDER}`, color: MUT }}>{r.plant}</span>
                  <span>{r.material}</span>
                  {r.group && <span className="truncate">{r.group}</span>}
                </div>
                {/* countable ticks rather than a smooth bar — you can read roughly how many
                    against the largest in view, and every row starts at a hard zero because
                    all of them are equally late; only the size differs */}
                <div className="mt-2 h-[7px]" style={{ background: `repeating-linear-gradient(90deg, ${LINE} 0 4px, transparent 4px 7px)` }}>
                  <div className="h-full" style={{ width: on ? `${pct}%` : "0%", background: `repeating-linear-gradient(90deg, ${c} 0 4px, transparent 4px 7px)`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 55}ms` }} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold tabular-nums tracking-[-0.01em]" style={{ color: INK }}>
                  {/* rounded: reorder_qty is a float, and "3,19,014.7 units to order"
                      is not a quantity anyone can act on */}
                  {Math.round(Number(r.reorder_qty || 0)).toLocaleString("en-IN")}
                  <span className="block text-[9.5px] font-medium tracking-normal" style={{ color: MUT2 }}>units to order</span>
                </div>
                <div className="mt-1 text-[11px] tabular-nums" style={{ color: r.priced ? INK : MUT2 }}>
                  {r.priced ? inrAbbr(r.reorder_value)
                    : <span className="italic" title="The price is worked out from stock on the shelf. There is none left, so there is no price to show.">no price</span>}
                </div>
              </div>
            </div>
          );
        })}
        {!data.length && <div className="py-8 text-center text-sm" style={{ color: MUT2 }}>No data.</div>}
        {drill.panel}
      </div>

      {/* The rupee-coverage caveat, in the panel rather than hidden in a tooltip — it is
          the reason most of this list shows no price, and it belongs where the list is. */}
      {!!totals?.value_disclosure && (
        <p className="m-0 px-5 py-3 text-[11px] leading-relaxed" style={{ color: MUT, borderTop: `1px solid ${LINE}` }}>
          {totals.value_disclosure}
        </p>
      )}
    </Card>
  );
}

// ── restocking overview ──
// Replaces the old sci-fi "Stock Replenishment Radar" gauge, which showed 11141386 and
// 4007448 as bare unpunctuated digits with no unit and no sense of scale.
function Restocking({ metrics, cat, loading }: { metrics: any; cat: any; loading: boolean }) {
  const on = useMount(220);
  const need = Number(metrics?.stockOutMaterials || 0);
  const all = Number(metrics?.totalStock || 0);
  const pct = all ? (need / all) * 100 : 0;
  const R = 85, C = 2 * Math.PI * R;
  return (
    <Card pad="p-0" className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] flex items-center" style={{ color: MUT }}>
          Restocking overview
          <Info align="right"
            how="The share of everything we stock that the stock radar says needs restocking."
            means={<>About <b style={{ color: INK }}>1 in {all && need ? Math.max(Math.round(all / need), 1) : "—"}</b> of everything on our shelves needs attention right now.</>}
            act="It shows the size of the problem overall. The order list on the left is where you actually act." />
        </div>
        {cat.chip}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5 py-6">
        <div className="relative" style={{ width: "min(228px, 62vw)", aspectRatio: "1" }}>
          <svg viewBox="0 0 200 200" className="w-full h-full block" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="100" cy="100" r="92" fill="none" stroke={MUT2} strokeWidth="1" opacity=".35" strokeDasharray="1 8.63" />
            <circle cx="100" cy="100" r={R} fill="none" stroke="#eef0f6" strokeWidth="11" />
            <circle cx="100" cy="100" r={R} fill="none" stroke={RED} strokeWidth="11"
              strokeDasharray={C} strokeDashoffset={on ? C - (C * pct) / 100 : C}
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) .25s" }} />
          </svg>
          <div className="absolute inset-0 grid place-content-center justify-items-center text-center gap-0.5 px-6">
            <div className="text-[32px] font-extrabold leading-none tabular-nums tracking-[-0.03em]" style={{ color: INK }}>
              {need.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] leading-snug" style={{ color: MUT, maxWidth: 150 }}>items need restocking</div>
            <div className="text-[10px] uppercase tracking-[0.08em] mt-1" style={{ color: MUT2 }}>
              {pct.toFixed(1)}% of {all.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 w-full" style={{ borderTop: `1px solid ${LINE}` }}>
          {[
            { v: countAbbr(Number(metrics?.replenishmentQty || 0)), l: "units to order, all items added up", c: INK },
            { v: Number(metrics?.inventoryRisk || 0).toLocaleString("en-IN"), l: "items whose stock is not moving", c: AMBER },
            { v: countAbbr(Number(metrics?.demandForecast || 0)), l: "units expected next month", c: AC },
          ].map((s, i) => (
            <div key={i} className="pt-3.5 px-2 text-center" style={{ borderLeft: i === 0 ? "none" : `1px solid ${LINE}` }}>
              <div className="text-[15px] font-bold tabular-nums tracking-[-0.012em]" style={{ color: s.c }}>{s.v}</div>
              <div className="mt-1 text-[10px] leading-snug" style={{ color: MUT }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/**
 * One "See the full details" tile — always shows the all-categories total. No per-card
 * category-filter chip here (previously `useCardCategory`/`useCardScopedData`): the same
 * split-by-category dropdown lives once already, at the top of every "Overview" panel on
 * this page and Consumption/Procurement's, and repeating it on every KPI tile added no
 * extra value.
 */
function ExploreTile({ kpiKey, pageData, index }: { kpiKey: string; pageData: any; index: number }) {
  const m = KPI_META[kpiKey];
  const c = (pageData?.cards || {})[kpiKey] || {};
  const val = c.kind === "inr" ? inrAbbr(Number(c.value ?? 0)) : c.kind === "pct" ? `${Number(c.value ?? 0).toFixed(0)}%` : countAbbr(Number(c.value ?? 0));
  // Synthetic Kpi object — these 3 keys aren't in kpiRegistry.KPIS (bespoke pages, not the
  // generic /kpi/{key} route), so InventoryGlassKpiCard's own href default can't be used;
  // the real `href` override below sends the click to the right bespoke page instead.
  const kpi = {
    key: kpiKey, title: m.title, short: m.sub, portfolio: "forecasting",
    chart: { type: "bar", x: "", series: [] }, card: { field: "", agg: "sum", kind: c.kind ?? "num", label: m.sub }, columns: [],
  } as unknown as Kpi;
  const insights = [`${m.title}: ${val}`, m.sub, "Forecasting Portfolio KPI"];
  return (
    <div className="relative flex justify-center items-center p-6 transition duration-300" style={{ background: "rgba(255,255,255,0.9)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(248,252,255,0.6) 0%, rgba(241,249,255,0.8) 100%)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.9)"; }}>
      <InventoryGlassKpiCard kpi={kpi} index={index} insights={insights} chartData={[]} href={m.href} />
    </div>
  );
}

export default function ForecastingOverview() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}/portfolio/forecasting/overview?Plant=${encodeURIComponent(region)}`)
      .then((r) => r.json()).then((d) => { setData(d || null); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [region]);
  // true while in flight OR resolved with nothing usable -- the metrics bar below renders
  // a neutral skeleton in that state instead of a confident-looking "0 items" / "₹0".
  const showSkeleton = loading || !data;

  // Two cards on this page can be cut by category; the rest of the page cannot, so the
  // rest of the page shows nothing. The slow-moving donut is stock-derived (every
  // category has data); the reorder queue is consumption-derived demand, so onco is
  // greyed there with the backend's own explanation.
  // One hook pair PER CARD, all against the same overview URL. Every node this page
  // renders except `totals.accuracy` moves under `?Category=` (verified endpoint-side),
  // so every card here gets a chip and each one narrows only itself.
  const ov = (c: string, signal: AbortSignal) =>
    fetch(`${DASHBOARD_API_BASE_URL}/portfolio/forecasting/overview?Plant=${encodeURIComponent(region)}&Category=${encodeURIComponent(c)}`, { signal }).then((r) => r.json());

  const agingCat = useCardCategory({ accent: AMBER, label: "Slow-moving stock" });
  const agingScoped = useCardScopedData(data, agingCat.category, ov);
  const reorderCat = useCardCategory({ accent: AC, domain: "reorder", label: "Priority reorder list" });
  const reorderScoped = useCardScopedData(data, reorderCat.category, ov);
  // The four cells of the metrics bar. `allLabel: "All"` keeps each chip narrow enough to
  // sit beside an uppercase tile label in a quarter-width cell.
  const m1Cat = useCardCategory({ accent: AC, domain: "reorder", label: "To order · full requisition", allLabel: "All" });
  const m1Scoped = useCardScopedData(data, m1Cat.category, ov);
  const m2Cat = useCardCategory({ accent: RED, domain: "reorder", label: "Flagged by stock radar", allLabel: "All" });
  const m2Scoped = useCardScopedData(data, m2Cat.category, ov);
  const m3Cat = useCardCategory({ accent: AC, domain: "consumption", label: "Expected use next month", allLabel: "All" });
  const m3Scoped = useCardScopedData(data, m3Cat.category, ov);
  const m4Cat = useCardCategory({ accent: AC, domain: "consumption", label: "Money to restock next month", allLabel: "All" });
  const m4Scoped = useCardScopedData(data, m4Cat.category, ov);
  const radarCat = useCardCategory({ accent: RED, domain: "reorder", label: "Stock replenishment radar" });
  const radarScoped = useCardScopedData(data, radarCat.category, ov);
  const fcCat = useCardCategory({ accent: AC, domain: "consumption", label: "Expected usage forecast" });
  const fcScoped = useCardScopedData(data, fcCat.category, ov);
  const hzCat = useCardCategory({ accent: AC2, domain: "consumption", label: "Expected use by month" });
  const hzScoped = useCardScopedData(data, hzCat.category, ov);

  const t = data?.totals || {};
  const tl = data?.timeline || [];
  const cfVals = (data?.cashflow || []).map((d: any) => d.forecast);
  const radar = data?.radar || [], aging = data?.aging || [];
  const radarSegs = radar.map((r: any) => ({ ...r, color: r.status === "Healthy" ? GREEN : r.status.includes("Out") ? RED : AMBER }));
  const agingScopedRows = agingScoped.data?.aging || [];
  const agingSegs = agingScopedRows.map((r: any) => ({ ...r, color: r.status === "Rising" ? AMBER : GREEN }));
  const agingTotal = agingScopedRows.reduce((s: number, r: any) => s + r.count, 0);
  const cnt = (name: string, list: any[]) => Number((list.find((x: any) => x.status.includes(name)) || {}).count || 0);

  // ── the forecast chart's own copy ──
  const fcTl = fcScoped.data?.timeline || [];
  const fcT = fcScoped.data?.totals || {};
  // ── the horizon card's own copy ──
  const hzTl = hzScoped.data?.timeline || [];
  // ── the radar card's own copy ──
  const rRadar = radarScoped.data?.radar || [], rAging = radarScoped.data?.aging || [], rT = radarScoped.data?.totals || {};
  const radarMetrics = {
    stockOutMaterials: cnt("Out", rRadar),
    replenishmentQty: Number(rT.replen_qty ?? 0),
    inventoryRisk: cnt("Rising", rAging),
    demandForecast: Number(rT.next_demand ?? 0),
    safeStock: cnt("Healthy", rRadar),
    totalStock: rRadar.reduce((s: number, r: any) => s + r.count, 0),
  };

  // ── the metrics bar, one scoped payload per cell ──
  const m3Tl = m3Scoped.data?.timeline || [];
  const m3Acts = m3Tl.filter((d: any) => d.actual != null).map((d: any) => d.actual);
  const m3Fcs = m3Tl.filter((d: any) => d.is_forecast).map((d: any) => d.forecast);
  const demandDelta = m3Acts.length && m3Fcs.length && m3Acts[m3Acts.length - 1] ? ((m3Fcs[0] - m3Acts[m3Acts.length - 1]) / m3Acts[m3Acts.length - 1]) * 100 : 0;
  const m4Cf = (m4Scoped.data?.cashflow || []).map((d: any) => d.forecast);
  // Next month's budget vs the LAST ACTUAL month of spend — the identical formula the
  // Cash-Flow page's own headline uses (CashflowForecastDetail's BudgetSummary), so both
  // screens report one number for one metric. This previously compared forecast[last] to
  // forecast[0]: `cashflow` carries only the 3 forecast months, and that horizon is flat by
  // construction (the engine is a level+rate model, not a trend model), so the tile was
  // pinned at "0.0%" — which reads as "spend is unchanged" when the real figure is +52%.
  const cfLastAct = Number((m4Scoped.data?.totals || {}).cashflow_last_actual ?? 0);
  const cfNext = Number((m4Scoped.data?.totals || {}).cashflow_next ?? 0);
  const cfDelta = cfLastAct > 0 && cfNext ? ((cfNext - cfLastAct) / cfLastAct) * 100 : 0;
  const stockOutCount = cnt("Out", m2Scoped.data?.radar || []);
  const reorder = m1Scoped.data?.reorder || {};
  const metrics = [
    // Leads with the FULL requisition (19,014 lines), matching the Reorder & Stock Risk
    // page. This used to show the 1,107 "under 1 month cover" band, which excluded every
    // line already at zero stock — i.e. it omitted the most urgent 15,878 lines from the
    // headline a planner reads first.
    {
      label: "Total to order",
      // Spelled out, not countAbbr'd. The queue bar directly above this shows 19,014;
      // an abbreviated "19k" two inches below it reads as a different, vaguer number.
      value: Number(reorder.reorder_lines ?? 0).toLocaleString("en-IN"),
      unit: "items",
      sub: `Each one is a product at a hospital that needs an order placed. ${countAbbr(Number(reorder.out_of_stock_lines ?? 0))} of them have already run out. We know the price for only ${Number(reorder.priced_share_pct ?? 0).toFixed(0)}% of them (${inrAbbr(Number(reorder.reorder_value_priced ?? 0))}).`,
      tone: AC,
      cat: m1Cat,
      empty: !m1Scoped.loading && !Number(reorder.reorder_lines),
      info: {
        how: "We count every product at every hospital where the system says stock has fallen below what is needed.",
        means: <>{Number(reorder.reorder_lines ?? 0).toLocaleString("en-IN")} separate orders to place, covering {Number(reorder.reorder_skus_all ?? 0).toLocaleString("en-IN")} different products.</>,
        act: "This is the full job in front of the team. Start with the ones that have already run out.",
      },
    },
    // Deliberately NOT labelled "Stock-out risk": that phrase is already the
    // Reorder & Stock Risk page's tile for a different figure (15,878 from the
    // replenishment table vs 17,043 here from the stock radar). Name the source.
    { label: "At risk of running out", value: Number(stockOutCount).toLocaleString("en-IN"), unit: "items",
      sub: "Counted by the stock radar, which measures differently from the order list — so it will not match the total above.",
      tone: RED, cat: m2Cat, empty: !m2Scoped.loading && !stockOutCount,
      info: {
        how: "A separate early-warning check that looks at everything we stock and flags the items trending towards empty.",
        means: "These are heading for a stock-out. It uses a different method from the order list, which is why the two numbers differ.",
        act: "Use it as a second opinion. If something appears in both lists, it is a safe bet.",
      } },
    { label: "Expected use · next month", value: countAbbr(Number((m3Scoped.data?.totals || {}).next_demand ?? 0)), unit: "units", delta: demandDelta, spark: [...m3Acts, ...m3Fcs], fcFrom: m3Acts.length, cat: m3Cat, empty: !m3Scoped.loading && !Number((m3Scoped.data?.totals || {}).next_demand),
      info: {
        how: "We take the last 6 months of real usage and carry that same monthly rate forward. It does not try to guess ups and downs month to month.",
        means: "How much we expect to get through next month — units means individual things: tablets, bottles, gloves.",
        act: "This number drives how much to order. The solid line is what actually happened; the dashed part has not happened yet.",
      } },
    { label: "Money to restock · next month", value: inrAbbr(Number((m4Scoped.data?.totals || {}).cashflow_next ?? 0)), unit: "", delta: cfDelta, spark: m4Cf, fcFrom: 0, cat: m4Cat, empty: !m4Scoped.loading && !Number((m4Scoped.data?.totals || {}).cashflow_next),
      info: {
        how: "We take the units we expect to use next month and multiply them by what those items cost.",
        means: <>What next month&rsquo;s usage should cost to buy. Last month actually cost {inrAbbr(cfLastAct)}.</>,
        act: "Make sure the cash is set aside. A jump here is worth flagging to finance early.",
        align: "right" as const,
      } },
  ];

  return (
    <div className="-m-4 md:-m-6 p-5 md:p-7 min-w-0" style={{ background: BG, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`
        @keyframes fcIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fc-card{animation:fcIn .5s cubic-bezier(.22,1,.36,1) both;min-width:0;transition:transform .25s ease, box-shadow .25s ease}

        /* the "i" explainer */
        .fc-i{position:relative;display:inline-grid;place-items:center;width:15px;height:15px;flex:none;
          border:1px solid ${BORDER};border-radius:50%;background:${CARD};color:${MUT2};
          font-size:10px;font-weight:700;font-style:italic;cursor:help;user-select:none;
          text-transform:none;letter-spacing:0;line-height:1;margin-left:7px;vertical-align:middle;
          transition:color .15s,border-color .15s,background .15s}
        .fc-i:hover,.fc-i:focus-visible{color:${AC};border-color:${AC};background:${ACSOFT};outline:none}
        /* display:none, NOT visibility:hidden — a hidden-but-displayed absolute box still
           takes part in scroll overflow, and these 288px panels hanging off the right of
           the layout put a horizontal scrollbar on every phone. */
        .fc-i-pop{display:none;position:absolute;top:calc(100% + 9px);left:-8px;
          width:288px;max-width:min(288px,calc(100vw - 28px));padding:13px 15px 14px;
          background:${CARD};border:1px solid ${BORDER};border-radius:12px;
          box-shadow:0 2px 6px rgba(20,24,60,.06),0 18px 40px -16px rgba(20,24,60,.30);
          text-align:left;z-index:60;opacity:0;transform:translateY(-4px);
          transition:opacity .16s ease,transform .16s ease,display .16s allow-discrete;cursor:default}
        .fc-i-r .fc-i-pop{left:auto;right:-8px}
        .fc-i:hover .fc-i-pop,.fc-i:focus-visible .fc-i-pop{display:block;opacity:1;transform:none}
        @starting-style{.fc-i:hover .fc-i-pop,.fc-i:focus-visible .fc-i-pop{opacity:0;transform:translateY(-4px)}}
        .fc-i-pop b{display:block;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
          color:${MUT2};margin-bottom:3px}
        .fc-i-pop p{margin:0 0 11px;font-size:12px;line-height:1.5;color:#464c66;font-style:normal;
          font-weight:400;letter-spacing:0}
        .fc-i-pop p:last-child{margin-bottom:0}
        /* z-index alone is not enough: .fc-card runs an opacity/transform load animation,
           and an element with an active transform/opacity animation forms its own stacking
           context — which traps the panel inside its card so the next one paints over it. */
        .fc-card,.fc-metric{position:relative}
        .fc-card:hover,.fc-card:focus-within,.fc-metric:hover,.fc-metric:focus-within{z-index:60}
        @media (max-width:640px){
          /* anchor to the CARD, not the 15px icon, so a panel cannot run off either edge */
          .fc-i{position:static}
          .fc-i-pop,.fc-i-r .fc-i-pop{left:14px;right:14px;width:auto;max-width:none;top:calc(100% + 8px)}
        }
      `}</style>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <div>
          <h1 className="text-[25px] font-bold leading-tight tracking-tight" style={{ color: INK }}>Demand Forecast & Reorder Planning</h1>
          <p className="text-[13px] mt-1" style={{ color: MUT }}>What to order, what's running low, and the budget you'll need — next 3 months · {displayRegion(region)}</p>
        </div>
        {/* Was a small green pill reading "86% reliable for planning". Green said "good"
            about a number that is really a confidence level, and the figure had no scale
            to be read against. It is now a gauge with a marker on a labelled 0–100 track. */}
        {showSkeleton
          ? <div className="rounded-[18px] w-full sm:w-[300px] sm:ml-auto animate-pulse" style={{ height: 144, background: "#eef0f6" }} />
          : <Reliability pct={Number(t.accuracy ?? 0)} />}
      </div>

      {/* The whole reorder queue, before any of the tiles below break it down. */}
      <QueueBar bands={data?.priority || []} total={Number((data?.reorder || {}).reorder_lines ?? 0)} loading={showSkeleton} />

      {/* metrics bar */}
      <Card pad="p-0" className="mb-5 overflow-hidden">
        {showSkeleton ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 animate-pulse">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-5" style={{ borderLeft: i % 4 === 0 ? "none" : `1px solid ${LINE}`, borderTop: i >= 2 ? `1px solid ${LINE}` : "none" }}>
                <div className="h-3 w-2/3 bg-gray-100 rounded mb-4" />
                <div className="h-7 w-1/2 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <div key={i} className="fc-metric p-5" style={{ borderLeft: i % 4 === 0 ? "none" : `1px solid ${LINE}`, borderTop: i >= 2 ? `1px solid ${LINE}` : "none" }}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] flex items-center" style={{ color: MUT2 }}>
                  {m.label}
                  {(m as any).info && <Info {...(m as any).info} />}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {m.delta != null && <Delta pct={m.delta} />}
                  {m.cat.chip}
                </span>
              </div>
              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-[31px] leading-none font-extrabold tabular-nums tracking-[-0.025em]" style={{ color: (m as any).tone || INK }}>{m.value}</span>
                {m.unit && <span className="text-[11.5px] font-medium mb-1 uppercase tracking-[0.05em]" style={{ color: MUT2 }}>{m.unit}</span>}
              </div>
              {/* min-height, not a fixed 34px: the two left-hand tiles now carry a real
                  explanation rather than a single clipped line, and a hard height cut it off. */}
              <div className="mt-2 min-h-[34px] flex items-end">{m.spark ? <Spark vals={m.spark} fcFrom={m.fcFrom!} /> : <span className="text-[11.5px] leading-snug" style={{ color: MUT }}>{m.sub}</span>}</div>
              {m.cat.note(m.empty) && <div className="mt-2">{m.cat.note(true)}</div>}
            </div>
          ))}
        </div>
        )}
      </Card>

      {/* ── STEP 1 · ACT: what to order now + overall stock health ── */}
      {/* "highest-value" was left over from the old top_reorder list, which really was
          value-sorted -- see the comment above Reorder: that sort was replaced precisely
          because ranking a reorder queue by cost buries the items about to run out. The
          queue underneath is urgency-ordered, and its own subtitle already says "most urgent
          first", as does the Reorder & Stock Risk page ("ranked by how soon it runs out --
          not by how much it costs"). This hint was the last place still claiming otherwise,
          on top of a list whose top rows are all unpriced. */}
      <SectionLabel n={1} title="Order these first" hint="the ones closest to running out — start at the top" />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col"><Reorder rows={reorderScoped.data?.priority_queue || []} totals={reorderScoped.data?.reorder || {}} cat={reorderCat} loading={reorderScoped.loading} /></div>
        <div className="xl:col-span-4 flex flex-col">
          <Restocking metrics={radarMetrics} cat={radarCat} loading={radarScoped.loading} />
          {radarCat.note(!radarScoped.loading && !radarMetrics.totalStock) && <div className="px-4 pt-3 w-full">{radarCat.note(true)}</div>}
        </div>
      </div>

      {/* ── STEP 2 · PLAN: expected usage ahead + slow-moving stock ── */}
      <SectionLabel n={2} title="The outlook ahead" hint="how much you will use over the next 3 months, and what is turning slow" className="mt-8" />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col"><Forecast timeline={fcTl} t={fcT} cat={fcCat} loading={fcScoped.loading} /></div>
        <div className="xl:col-span-4 flex flex-col gap-5">
          <AgingCard segs={agingSegs} total={agingTotal} cat={agingCat} loading={agingScoped.loading} />
          <Horizon timeline={hzTl} cat={hzCat} loading={hzScoped.loading} />
        </div>
      </div>

      {/* ── STEP 3 · DRILL IN: full breakdowns — pixel-identical to /inventory's glass grid ── */}
      <SectionLabel n={3} title="See the full details" hint="item-by-item usage, budget and stock risk" className="mt-8" />
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(186,230,253,0.6)", background: "rgba(255,255,255,0.4)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y" style={{ borderColor: "transparent" }}>
          <ExploreTile kpiKey="expected-demand" pageData={data} index={0} />
          <ExploreTile kpiKey="cash-flow-forecast" pageData={data} index={1} />
          <ExploreTile kpiKey="stock-replenishment" pageData={data} index={2} />
          {simForecast.map((s, j) => {
            const idx = 3 + j;
            return (
              <div
                key={s.kpi.key}
                className="relative flex justify-center items-center p-6 transition duration-300"
                style={{ background: "rgba(255,255,255,0.9)", opacity: 0.6, filter: "saturate(0.72)" }}
                title="Simulated preview — activates the moment HCG shares the source"
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "none"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "saturate(0.72)"; }}
              >
                <span className="absolute top-3 right-3 z-20 text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-1 rounded-full" style={{ background: "#fff7ed", color: "#a56a15", border: "1px solid #fadcae" }}>
                  Simulated
                </span>
                <InventoryGlassKpiCard kpi={s.kpi} index={idx} insights={s.insights} chartData={s.chartData} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-[14px] px-4 py-3 text-[12px] leading-relaxed" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUT }}>
        <b style={{ color: INK }}>How to read this:</b> forecasts are built from your last 6 months of actual usage. They're <b style={{ color: INK }}>reliable for planning</b> your overall and category-wise needs — the range shows best- and worst-case. For a single item, treat the number as a guide and confirm critical medicines with your team. Accuracy improves as more months of usage build up.
      </div>
    </div>
  );
}
