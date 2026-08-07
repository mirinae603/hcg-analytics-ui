"use client";
// Revenue per Location — "SCALE vs QUALITY".
//
// A ranked bar chart of 23 hospitals answers "who is biggest" in two seconds and then has
// nothing left to say. Every row here carries TWO facts — how much a site bills, and how
// well it bills — so the hero plots both at once: revenue on x, margin rate on y, against
// the network's own 40.91% book rate. A big site two points light costs more real money
// than a small site twenty points rich, and only this plane shows that.
//
// Deliberately absent: any month or patient-type dimension — this table has neither.
// Hospital values are 5-letter site codes with no name master; they are not invented.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { byKey } from "@/lib/kpiRegistry";
import { useCardCategory } from "@/components/common/CardCategoryFilter";
import { useDrillBind } from "@/components/portfolio/useDrillBind";
import {
  PageShell, HeroShell, Card, Head, Readout, Skeleton, useArmed,
  INK, SUB, RULE, LINE, CARD, GRAPHITE, JADE, JADE_DEEP, SEA, BRASS,
  inr, pct1, num, nm, EASE, EASE_OUT,
} from "./kit";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

export default function RevenuePerLocationDetail() {
  const on = useArmed();
  const [rows, setRows] = useState<any[] | null>(null);
  const [hi, setHi] = useState<number | null>(null);
  const kpi = byKey("revenue-per-location");
  const cat = useCardCategory({ accent: JADE, label: "Revenue per location", allLabel: "All categories" });

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/revenue-per-location?group_by=hospital&measures=revenue,cost,qty&top=40`
          + (cat.category ? `&Category=${encodeURIComponent(cat.category)}` : ""))
      .then((r) => r.json()).then((d) => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([]));
  }, [cat.category]);

  const sites = useMemo(() => (rows || []).map((r) => {
    const rev = Number(r.revenue || 0), cost = Number(r.cost || 0);
    return { code: String(r.hospital), rev, cost, margin: rev - cost, rate: rev ? ((rev - cost) / rev) * 100 : 0, qty: Number(r.qty || 0) };
  }).filter((s) => s.rev > 0).sort((a, b) => b.rev - a.rev), [rows]);

  const T = useMemo(() => {
    const rev = sites.reduce((s, x) => s + x.rev, 0), margin = sites.reduce((s, x) => s + x.margin, 0);
    return { rev, margin, rate: rev ? (margin / rev) * 100 : 0 };
  }, [sites]);

  if (!rows) return <PageShell title="Revenue per location" sub="billed patient revenue by hospital — scale against margin quality" pill="23 hospitals"><Skeleton /></PageShell>;

  // ── hero plane ──
  const W = 900, H = 420, PL = 62, PR = 120, PT = 28, PB = 52;
  const PW = W - PL - PR, PH = H - PT - PB;
  const maxRev = Math.max(...sites.map((s) => s.rev), 1);
  const rates = sites.map((s) => s.rate);
  const rLo = Math.max(0, Math.floor((Math.min(...rates) - 4) / 5) * 5);
  const rHi = Math.ceil((Math.max(...rates) + 4) / 5) * 5;
  const X = (v: number) => PL + (v / maxRev) * PW;
  const Y = (p: number) => PT + PH - ((p - rLo) / (rHi - rLo || 1)) * PH;
  // "at stake" against the book rate — the only figure on this page in rupees-of-quality
  const stake = (s: any) => s.margin - s.rev * (T.rate / 100);
  // hover a site -> the materials driving that site's billed revenue
  const planeDrill = useDrillBind({
    kpi: "revenue-per-location", dim: "hospital", by: "material", measure: "revenue",
    label: "items", dimLabel: "Hospital · billed revenue", format: inr, category: cat.drill,
  });
  const a = hi != null ? sites[hi] : null;

  return (
    <PageShell title="Revenue per location"
      sub="billed patient revenue by hospital — scale against margin quality"
      pill={`${sites.length} hospitals · 6-month window`}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-6">

        <div className="xl:col-span-12">
          <HeroShell>
            <div className="flex items-start justify-between gap-6 flex-wrap mb-1">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>Billed revenue · {sites.length} sites</div>
                  {cat.chip}
                </div>
                <div className="mt-2 text-[40px] font-light tabular-nums leading-none" style={{ color: INK, letterSpacing: "-.03em" }}>{inr(T.rev)}</div>
                <div className="text-[11px] mt-2" style={{ color: SUB }}>network margin <b style={{ color: BRASS }}>{pct1(T.rate)}</b> · {inr(T.margin)}</div>
              </div>
              <p className="text-[11.5px] leading-relaxed max-w-sm" style={{ color: SUB }}>
                Horizontal = how much a site bills. Vertical = how well it bills. The brass line is the
                network&apos;s own <b style={{ color: INK }}>{pct1(T.rate)}</b> book rate — sites below it are
                giving up margin on every rupee they turn, and the further right they sit, the more that costs.
              </p>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto" }} preserveAspectRatio="xMidYMid meet"
              onMouseLeave={() => setHi(null)} role="img" aria-label="Hospitals plotted by billed revenue against margin rate">
              {/* rate gridlines — the decade nearest the book rate is suppressed so the brass
                  datum never collides with a grey rule */}
              {Array.from({ length: Math.floor((rHi - rLo) / 5) + 1 }, (_, i) => rLo + i * 5)
                .filter((p) => Math.abs(Y(p) - Y(T.rate)) > 10)
                .map((p) => (
                  <g key={p}><line x1={PL} y1={Y(p)} x2={W - PR} y2={Y(p)} stroke={LINE} strokeWidth="1" />
                    <text x={PL - 8} y={Y(p) + 3.5} textAnchor="end" style={{ fontSize: 9.5, fill: SUB }}>{p}%</text></g>
                ))}
              <line x1={PL} y1={Y(T.rate)} x2={W - PR} y2={Y(T.rate)} stroke={BRASS} strokeWidth="1.2" strokeDasharray="5 4"
                style={{ opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" }} />
              <text x={W - PR + 8} y={Y(T.rate) + 3.5} style={{ fontSize: 10, fontWeight: 700, fill: BRASS, opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" }}>book {pct1(T.rate)}</text>
              <line x1={PL} y1={PT + PH} x2={W - PR} y2={PT + PH} stroke={INK} strokeWidth="1" />
              {[0, .25, .5, .75, 1].map((f) => (
                <text key={f} x={X(maxRev * f)} y={PT + PH + 18} textAnchor="middle" style={{ fontSize: 9.5, fill: SUB }}>{inr(maxRev * f)}</text>
              ))}
              <text x={(PL + W - PR) / 2} y={H - 12} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 600, fill: SUB }}>billed revenue →</text>
              <text x={PL - 44} y={PT - 10} style={{ fontSize: 10.5, fontWeight: 600, fill: SUB }}>↑ margin rate</text>

              {sites.map((s, i) => {
                const act = hi === i, below = s.rate < T.rate;
                // stem from the book rate makes "how far off the house rate" a length, not a guess
                return (
                  <g key={s.code} style={{ opacity: hi == null || act ? 1 : 0.32, transition: "opacity 180ms", cursor: "pointer" }}
                    {...planeDrill.bind(s.code, { onMouseEnter: () => setHi(i) })}>
                    <line x1={X(s.rev)} y1={Y(T.rate)} x2={X(s.rev)} y2={on ? Y(s.rate) : Y(T.rate)}
                      stroke={below ? GRAPHITE : JADE} strokeWidth={act ? 2 : 1} opacity={0.55}
                      style={{ transition: `y2 700ms ${EASE} ${160 + i * 28}ms` }} />
                    <circle cx={X(s.rev)} cy={on ? Y(s.rate) : Y(T.rate)} r={act ? 7 : 5}
                      fill={below ? GRAPHITE : JADE} stroke={CARD} strokeWidth="1.5"
                      style={{ transition: `cy 700ms ${EASE} ${160 + i * 28}ms, r 150ms` }} />
                    {(act || i < 3) && (
                      <text x={X(s.rev)} y={(on ? Y(s.rate) : Y(T.rate)) - 12} textAnchor="middle"
                        style={{ fontSize: 10.5, fontWeight: 700, fill: INK, opacity: on ? 1 : 0, transition: "opacity 400ms ease 900ms" }}>{s.code}</text>
                    )}
                  </g>
                );
              })}
            </svg>
            <Readout k={hi} dark minH={34}>
              {a ? (
                <span><b>{a.code}</b> — {inr(a.rev)} billed · margin <b style={{ color: a.rate >= T.rate ? JADE_DEEP : GRAPHITE }}>{pct1(a.rate)}</b> ({inr(a.margin)})
                  · <span style={{ color: SUB }}>vs book rate: </span><b style={{ color: stake(a) >= 0 ? JADE_DEEP : GRAPHITE }}>{stake(a) >= 0 ? "+" : "−"}{inr(Math.abs(stake(a)))}</b>
                  <span style={{ color: SUB }}> · {num(a.qty)} units</span></span>
              ) : <span style={{ color: SUB }}>hover a site — stem length is its distance from the book rate, and its top items appear</span>}
            </Readout>
            {planeDrill.panel}
          </HeroShell>
        </div>

        {/* ── S1 — concentration ── */}
        <div className="xl:col-span-7">
          <Card delay={180}>
            <Head label="How concentrated is the network?"
              note="Sites ordered largest first; the brass curve is cumulative share of all billed revenue."
              badge={`${sites.length} sites`} />
            <Concentration sites={sites} total={T.rev} on={on} drillCat={cat.drill} />
          </Card>
        </div>

        {/* ── S2 — margin spread ── */}
        <div className="xl:col-span-5">
          <Card delay={260}>
            <Head label="Margin spread"
              note="Each site's rate against the network book rate. Length is the gap in points; colour is the sign."
              badge={`${pct1(Math.min(...rates))}–${pct1(Math.max(...rates))}`} />
            <Spread sites={sites} book={T.rate} on={on} />
          </Card>
        </div>

        <div className="xl:col-span-12">
          <Card delay={340} className="!p-0">
            <div className="p-5 md:p-6 pb-0"><Head label="Hospital × material detail" note="Paginated · sortable · filterable · export CSV" badge="57,455 rows" /></div>
            <div className="-mt-2">{kpi && <KpiTable kpiKey="revenue-per-location" columns={kpi.columns} />}</div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Concentration({ sites, total, on, drillCat }: any) {
  const [hi, setHi] = useState<number | null>(null);
  const drill = useDrillBind({
    kpi: "revenue-per-location", dim: "hospital", by: "material", measure: "revenue",
    label: "items", dimLabel: "Hospital · billed revenue", format: inr, category: drillCat,
  });
  const W = 620, H = 250, PL = 46, PR = 40, PT = 16, PB = 44;
  const PW = W - PL - PR, PH = H - PT - PB;
  const n = sites.length, bw = PW / n;
  const max = Math.max(...sites.map((s: any) => s.rev), 1);
  let run = 0; const cum = sites.map((s: any) => { run += s.rev; return (run / total) * 100; });
  const stair = sites.map((_: any, i: number) => `${i === 0 ? "M" : "L"}${PL + i * bw},${PT + PH - (cum[i] / 100) * PH} L${PL + (i + 1) * bw},${PT + PH - (cum[i] / 100) * PH}`).join(" ");
  const a = hi != null ? sites[hi] : null;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto" }} preserveAspectRatio="xMidYMid meet"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHi(Math.max(0, Math.min(n - 1, Math.floor((x - PL) / bw)))); }}
        onMouseLeave={() => setHi(null)}>
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}><line x1={PL} y1={PT + PH - (p / 100) * PH} x2={W - PR} y2={PT + PH - (p / 100) * PH} stroke={LINE} strokeWidth="1" />
            <text x={W - PR + 6} y={PT + PH - (p / 100) * PH + 3} style={{ fontSize: 9, fill: BRASS }}>{p}%</text></g>
        ))}
        {sites.map((s: any, i: number) => {
          const h = (s.rev / max) * PH, act = hi === i;
          return <rect key={s.code} x={PL + i * bw + 1} y={on ? PT + PH - h : PT + PH} width={bw - 2} height={on ? h : 0}
            fill={act ? JADE_DEEP : JADE} opacity={hi == null || act ? 1 : 0.4} style={{ cursor: "pointer",
              transition: `y 620ms ${EASE} ${120 + i * 26}ms, height 620ms ${EASE} ${120 + i * 26}ms, opacity 160ms` }}
            {...drill.bind(s.code)} />;
        })}
        <path d={stair} fill="none" stroke={BRASS} strokeWidth="1.6" pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 900ms ${EASE} 620ms` }} />
        <line x1={PL} y1={PT + PH} x2={W - PR} y2={PT + PH} stroke={INK} strokeWidth="1" />
        <text x={PL} y={H - 10} style={{ fontSize: 9.5, fill: SUB }}>largest → smallest · bars = revenue · brass = cumulative share</text>
      </svg>
      <Readout k={hi} minH={34}>
        {a ? <span><b>{a.code}</b> — {inr(a.rev)} ({pct1((a.rev / total) * 100)} of network) · running total <b style={{ color: BRASS }}>{pct1(cum[hi!])}</b></span>
          : <span style={{ color: SUB }}>top {Math.min(5, n)} sites = <b style={{ color: BRASS }}>{pct1(cum[Math.min(4, n - 1)])}</b> of all billed revenue</span>}
      </Readout>
      {drill.panel}
    </>
  );
}

function Spread({ sites, book, on }: any) {
  const [hi, setHi] = useState<number | null>(null);
  const ranked = [...sites].sort((a: any, b: any) => b.rate - a.rate);
  const maxGap = Math.max(...ranked.map((s: any) => Math.abs(s.rate - book)), 1);
  const a = hi != null ? ranked[hi] : null;
  return (
    <>
      <div style={{ maxHeight: 268, overflowY: "auto" }}>
        {ranked.map((s: any, i: number) => {
          const gap = s.rate - book, w = (Math.abs(gap) / maxGap) * 46;
          return (
            <div key={s.code} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
              className="flex items-center gap-2 py-[3px]" style={{ opacity: hi != null && hi !== i ? 0.45 : 1, transition: "opacity 160ms" }}>
              <span className="text-[11px] w-[46px] flex-shrink-0 tabular-nums" style={{ color: INK }}>{s.code}</span>
              <div className="relative flex-1 h-[11px]">
                <span style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: RULE }} />
                <span style={{
                  position: "absolute", top: 2, height: 7, borderRadius: 1,
                  left: gap >= 0 ? "50%" : `${50 - (on ? w : 0)}%`, width: on ? `${w}%` : "0%",
                  background: gap >= 0 ? JADE : GRAPHITE, transition: `width 620ms ${EASE} ${140 + i * 28}ms, left 620ms ${EASE} ${140 + i * 28}ms`,
                }} />
              </div>
              <span className="text-[11px] w-[52px] text-right flex-shrink-0 tabular-nums font-semibold" style={{ color: gap >= 0 ? JADE_DEEP : GRAPHITE }}>
                {gap >= 0 ? "+" : "−"}{Math.abs(gap).toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <Readout k={hi} minH={34}>
        {a ? <span><b>{a.code}</b> — {pct1(a.rate)} margin, {Math.abs(a.rate - book).toFixed(1)} pts {a.rate >= book ? "above" : "below"} the book rate on {inr(a.rev)} billed</span>
          : <span style={{ color: SUB }}>centre line = network book rate {pct1(book)} · points, not rupees</span>}
      </Readout>
    </>
  );
}
