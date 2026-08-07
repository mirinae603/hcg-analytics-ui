"use client";
// Stock-Out Rate — "THE GAP BETWEEN COUNT AND CONSEQUENCE".
//
// 33.97% of actively-moving items are at zero stock — but those items carry 53.22% of the
// consumption value. Stockouts are NOT uniformly distributed: they concentrate in the
// expensive, high-turn items. The hero encodes exactly that divergence, because the two
// numbers a reader will otherwise mistake for a contradiction are the whole finding.
//
// Universe (kept narrow on purpose): (hospital, material) pairs at the 25 hospitals present
// in BOTH the inventory snapshot and consumption, used in >=2 distinct months AND in the
// snapshot month itself — i.e. genuinely live demand. fact_inventory never writes a qty=0
// row, so a stocked-out item is simply ABSENT from the snapshot; absence is the signal.
//
// Deliberately absent: no trend over time (one inventory snapshot exists, not a series), and
// nothing from billed sales — hospital codes and plant codes have zero overlap, so billing
// cannot be joined to a per-hospital stock position at all.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { byKey } from "@/lib/kpiRegistry";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { useCardCategory, useCardScopedData } from "@/components/common/CardCategoryFilter";
import { useDrillBind } from "@/components/portfolio/useDrillBind";
import {
  PageShell, HeroShell, Card, Head, Readout, Skeleton, useArmed,
  INK, SUB, RULE, LINE, CARD, NEUTRAL, GRAPHITE, JADE, JADE_DEEP, BRASS, CLAY,
  inr, pct1, num, nm, EASE, EASE_OUT,
} from "./kit";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

export default function StockOutRateDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const on = useArmed();
  const [d, setD] = useState<any>(null);
  const kpi = byKey("stock-out-rate");

  useEffect(() => {
    setD(null);
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/stock-out-rate/insights?Plant=${encodeURIComponent(region)}`)
      .then((r) => r.json()).then(setD).catch(() => setD({ ready: false }));
  }, [region]);

  if (!d) return <PageShell title="Stock-out rate" sub="actively-moving items currently holding zero stock" pill="loading"><Skeleton /></PageShell>;
  if (!d.ready) return (
    <PageShell title="Stock-out rate" sub="actively-moving items currently holding zero stock" pill="no coverage">
      <Card><div className="py-14 text-center">
        <div className="text-[14px] font-semibold" style={{ color: INK }}>No inventory coverage for {displayRegion(region)}</div>
        <div className="text-[12.5px] mt-1.5 max-w-md mx-auto leading-relaxed" style={{ color: SUB }}>
          This hospital appears in consumption but not in the inventory snapshot, so &ldquo;absent from stock&rdquo;
          here would mean <b style={{ color: INK }}>not measured</b>, not out of stock. Only the 25 hospitals in both sources are reported.
        </div>
      </div></Card>
    </PageShell>
  );

  const t = d.totals;
  return (
    <PageShell title="Stock-out rate"
      sub={`actively-moving items currently holding zero stock · ${displayRegion(region)}`}
      pill={`${t.plants} hospitals with inventory coverage`}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-6">
        <div className="xl:col-span-12"><Hero page={d} region={region} on={on} /></div>
        <div className="xl:col-span-7"><Card delay={180}>
          <Head label="Order these first" badge={`top 12 of ${num(t.out)} gaps`}
            note="Stocked-out items ranked by what the network actually consumed over six months — the largest proven demand now sitting at zero." />
          <Reorder page={d} region={region} on={on} />
        </Card></div>
        <div className="xl:col-span-5"><Card delay={260}>
          <Head label="Which categories break" badge="by value at stake"
            note="Bar length is consumption value now unavailable; the brass tick marks that category's stock-out rate by item count." />
          <Groups rows={d.by_group} on={on} />
        </Card></div>
        <div className="xl:col-span-12"><Card delay={340} className="!p-0">
          <div className="p-5 md:p-6 pb-0"><Head label="Every actively-moving item" note="Paginated · sortable · filterable · export CSV" badge={`${num(t.pairs)} hospital × material pairs`} /></div>
          <div className="-mt-2">{kpi && <KpiTable kpiKey="stock-out-rate" plant={region} columns={kpi.columns} />}</div>
        </Card></div>
      </div>
    </PageShell>
  );
}

const INSIGHTS = (region: string, category: string, signal?: AbortSignal) =>
  fetch(`${DASHBOARD_API_BASE_URL}/kpi/stock-out-rate/insights?Plant=${encodeURIComponent(region)}`
        + (category ? `&Category=${encodeURIComponent(category)}` : ""), { signal }).then((r) => r.json());

/** HERO — the count/value divergence, then where it lands by hospital. */
function Hero({ page, region, on }: any) {
  const [hi, setHi] = useState<number | null>(null);
  const cat = useCardCategory({ accent: CLAY, label: "Stock-out exposure", allLabel: "All categories" });
  const scoped = useCardScopedData(page, cat.category, (c, signal) => INSIGHTS(region, c, signal));
  const src = scoped.data ?? page;
  const t = src?.totals ?? {}, byPlant = src?.by_plant ?? [];
  // hover a hospital bar -> the top materials inside that hospital's stocked-out value
  const drill = useDrillBind({
    kpi: "stock-out-rate", dim: "plant", by: "material", measure: "cost_6mo",
    label: "items", dimLabel: "Hospital · 6-month consumption", format: inr, category: cat.drill,
  });
  const W = 900, H = 300, PL = 58, PR = 116, PT = 30, PB = 34;
  const PW = W - PL - PR, PH = H - PT - PB;
  const rows = (byPlant || []).slice(0, 12);
  const n = rows.length || 1, slot = PH / n, bh = Math.min(slot * 0.6, 17);
  const maxV = Math.max(...rows.map((r: any) => r.value_out), 1);
  const X = (v: number) => (v / maxV) * PW;
  const a = hi != null ? rows[hi] : null;

  // two rails on one 0-100 axis: share of ITEMS vs share of VALUE
  const RW = 380, rx = (p: number) => (p / 100) * RW;

  return (
    <HeroShell>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="lg:w-[38%] flex-shrink-0 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>Actively-moving items at zero stock</div>
            {cat.chip}
          </div>
          <div className="mt-3 flex items-baseline" style={{ color: INK }}>
            <span className="tabular-nums" style={{ fontSize: 62, fontWeight: 300, letterSpacing: "-.03em", lineHeight: 1 }}>{t.rate.toFixed(2)}</span>
            <span style={{ fontSize: 28, fontWeight: 300 }}>%</span>
          </div>
          <div className="text-[10.5px] font-semibold uppercase mt-2" style={{ color: SUB, letterSpacing: ".12em" }}>
            {num(t.out)} of {num(t.pairs)} hospital × material pairs
          </div>

          <svg viewBox="0 0 400 108" width="100%" style={{ marginTop: 22, overflow: "visible" }} role="img"
            aria-label={`Stock-outs are ${t.rate.toFixed(1)} percent of items but ${t.value_rate.toFixed(1)} percent of consumption value`}>
            <text x={0} y={10} style={{ fontSize: 9.5, fontWeight: 600, fill: SUB, letterSpacing: ".05em" }}>BY ITEM COUNT</text>
            <rect x={0} y={18} width={RW} height={20} fill="#EAE5D8" />
            <rect x={0} y={18} width={on ? rx(t.rate) : 0} height={20} fill={GRAPHITE} style={{ transition: `width 720ms ${EASE_OUT} 160ms` }} />
            <text x={rx(t.rate) + 8} y={32} style={{ fontSize: 11, fontWeight: 700, fill: GRAPHITE, opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" }}>{t.rate.toFixed(1)}%</text>

            <text x={0} y={66} style={{ fontSize: 9.5, fontWeight: 600, fill: SUB, letterSpacing: ".05em" }}>BY CONSUMPTION VALUE</text>
            <rect x={0} y={74} width={RW} height={20} fill="#EAE5D8" />
            <rect x={0} y={74} width={on ? rx(t.value_rate) : 0} height={20} fill={CLAY} style={{ transition: `width 720ms ${EASE_OUT} 320ms` }} />
            <text x={rx(t.value_rate) + 8} y={88} style={{ fontSize: 11, fontWeight: 700, fill: CLAY, opacity: on ? 1 : 0, transition: "opacity 400ms ease 850ms" }}>{t.value_rate.toFixed(1)}%</text>
            {/* the gap itself, drawn */}
            <line x1={rx(t.rate)} y1={38} x2={rx(t.value_rate)} y2={74} stroke={BRASS} strokeWidth="1" strokeDasharray="3 3"
              style={{ opacity: on ? 0.8 : 0, transition: "opacity 400ms ease 1000ms" }} />
          </svg>

          <p className="text-[11.5px] mt-5 leading-relaxed" style={{ color: SUB }}>
            Both bars are the same stock-outs on one 0–100 axis — but a third of the
            <b style={{ color: INK }}> items</b> carries over half the <b style={{ color: INK }}>value</b>.
            Shortages are landing on the expensive, high-turn lines, not spread evenly.
          </p>
          <div className="mt-4 pt-4 grid grid-cols-2 gap-4" style={{ borderTop: `1px solid ${RULE}` }}>
            <div><div className="text-[17px] font-bold tabular-nums" style={{ color: CLAY }}>{inr(t.value_out)}</div>
              <div className="text-[10.5px] mt-1" style={{ color: SUB }}>consumption now unavailable</div></div>
            <div><div className="text-[17px] font-bold tabular-nums" style={{ color: INK }}>{num(t.materials_out)}</div>
              <div className="text-[10.5px] mt-1" style={{ color: SUB }}>distinct materials affected</div></div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>Where it lands — hospitals by consumption value at stake</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 6 }} preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHi(null)} role="img" aria-label="Hospitals ranked by consumption value now out of stock">
            {[0, .25, .5, .75, 1].map((f) => (
              <g key={f}><line x1={PL + X(maxV * f)} y1={PT - 6} x2={PL + X(maxV * f)} y2={PT + PH} stroke={LINE} strokeWidth="1" />
                <text x={PL + X(maxV * f)} y={PT + PH + 16} textAnchor="middle" style={{ fontSize: 9, fill: SUB }}>{inr(maxV * f)}</text></g>
            ))}
            {rows.map((r: any, i: number) => {
              const y = PT + i * slot + (slot - bh) / 2, act = hi === i;
              return (
                <g key={r.plant} style={{ opacity: hi == null || act ? 1 : 0.4, transition: "opacity 170ms", cursor: "pointer" }}
                  {...drill.bind(r.plant, { onMouseEnter: () => setHi(i) })}>
                  <text x={PL - 10} y={y + bh / 2 + 4} textAnchor="end" style={{ fontSize: 10.5, fontWeight: act ? 700 : 500, fill: act ? INK : SUB }}>{r.plant}</text>
                  <rect x={PL} y={y} width={on ? X(r.value_out) : 0} height={bh} fill={CLAY} fillOpacity={0.9}
                    style={{ transition: `width 660ms ${EASE} ${160 + i * 45}ms` }} />
                  {/* brass tick = that hospital's stock-out RATE by item count, on its own 0-100 scale */}
                  <rect x={PL + (r.rate / 100) * PW - 1} y={y - 3} width={2} height={bh + 6} fill={BRASS}
                    style={{ opacity: on ? 1 : 0, transition: `opacity 400ms ease ${700 + i * 40}ms` }} />
                  <text x={PL + X(r.value_out) + 8} y={y + bh / 2 + 4} style={{ fontSize: 10, fontWeight: 600, fill: SUB, opacity: on ? 1 : 0, transition: `opacity 400ms ease ${760 + i * 40}ms` }}>
                    {r.rate.toFixed(0)}%
                  </text>
                </g>
              );
            })}
            <line x1={PL} y1={PT + PH} x2={W - PR} y2={PT + PH} stroke={INK} strokeWidth="1" />
            <text x={PL} y={H - 6} style={{ fontSize: 9.5, fill: SUB }}>bar = consumption value out of stock · brass tick = that hospital&apos;s stock-out rate by item count</text>
          </svg>
          <Readout k={hi} dark>
            {a ? (
              <span><b>{a.plant}</b> — <b style={{ color: GRAPHITE }}>{a.out}</b> of {a.pairs} actively-moving items at zero
                (<b style={{ color: BRASS }}>{a.rate.toFixed(1)}%</b>) · <b style={{ color: CLAY }}>{inr(a.value_out)}</b> of {inr(a.value_all)} consumption affected</span>
            ) : <span style={{ color: SUB }}>hover a hospital — top items inside it appear on hover</span>}
          </Readout>
          {cat.note(!scoped.loading && !byPlant.length) && <div className="mt-2">{cat.note(true)}</div>}
          {drill.panel}
        </div>
      </div>
    </HeroShell>
  );
}

function Reorder({ page, region, on }: any) {
  const [hi, setHi] = useState<number | null>(null);
  const cat = useCardCategory({ accent: CLAY, label: "Order these first", allLabel: "All categories" });
  const scoped = useCardScopedData(page, cat.category, (c, signal) => INSIGHTS(region, c, signal));
  const rows = (scoped.data ?? page)?.top_out ?? [];
  const max = Math.max(...(rows || []).map((r: any) => r.cost_6mo), 1);
  const a = hi != null ? rows[hi] : null;
  return (
    <>
      <div className="flex justify-end -mt-1 mb-2">{cat.chip}</div>
      {!rows.length && <div className="py-10 text-center text-[13px]" style={{ color: SUB }}>{cat.note(true) ?? "Nothing out of stock in this scope."}</div>}
      <div>
        {rows.map((r: any, i: number) => (
          <div key={`${r.plant}-${r.material}`} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
            className="py-1.5" style={{ opacity: hi != null && hi !== i ? 0.5 : 1, transition: "opacity 160ms" }}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-[12px] truncate min-w-0" style={{ color: INK }} title={r.desc}>
                <span className="tabular-nums" style={{ color: SUB }}>{r.plant}</span>&nbsp; {nm(r.desc, 32)}
              </span>
              <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: CLAY }}>{inr(r.cost_6mo)}</span>
            </div>
            <div className="h-[9px] rounded-[2px]" style={{ background: "#EFEBE1" }}>
              <div className="h-full rounded-[2px]" style={{
                width: on ? `${(r.cost_6mo / max) * 100}%` : "0%", background: "rgba(176,74,46,0.55)",
                border: `1px solid ${CLAY}`, transition: `width 640ms ${EASE} ${140 + i * 40}ms`,
              }} />
            </div>
          </div>
        ))}
      </div>
      <Readout k={hi} minH={34}>
        {a ? <span><b>{nm(a.desc, 30)}</b> <span style={{ color: SUB }}>({a.group})</span> at <b>{a.plant}</b> — {inr(a.cost_6mo)} consumed over {a.months_consumed} months, last used {a.last_month} · <b style={{ color: CLAY }}>zero stock now</b></span>
          : <span style={{ color: SUB }}>ranked by six-month consumption — proven demand, currently unavailable</span>}
      </Readout>
    </>
  );
}

function Groups({ rows, on }: any) {
  const [hi, setHi] = useState<number | null>(null);
  // NO category chip here on purpose: this card IS the category breakdown, so
  // filtering it by category would collapse it to a single row.
  const drill = useDrillBind({
    kpi: "stock-out-rate", dim: "material_group", by: "material", measure: "cost_6mo",
    label: "items", dimLabel: "Category · 6-month consumption", format: inr,
  });
  const max = Math.max(...(rows || []).map((r: any) => r.value_out), 1);
  const a = hi != null ? rows[hi] : null;
  if (!rows?.length) return <div className="py-12 text-center text-[13px]" style={{ color: SUB }}>No categories in this scope.</div>;
  return (
    <>
      <div>
        {rows.map((r: any, i: number) => (
          // `r.raw` is the stored key ('M139-GROCERY'); `r.label` is the human one
          // ('Grocery'). The drill MUST receive raw — sending the label matched zero rows
          // and rendered a populated bar next to an empty "No items in this slice".
          // raw=null is the "Uncategorised" bucket: nothing to drill, so bind() goes inert.
          <div key={r.raw ?? r.label} onMouseLeave={() => setHi(null)}
            className="py-1.5" style={{ opacity: hi != null && hi !== i ? 0.5 : 1, transition: "opacity 160ms", cursor: r.raw ? "pointer" : "default" }}
            {...drill.bind(r.raw ?? null, { onMouseEnter: () => setHi(i) })}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-[11.5px] truncate min-w-0" style={{ color: INK }} title={r.label}>{nm(r.label, 24)}</span>
              <span className="text-[11.5px] font-semibold tabular-nums flex-shrink-0" style={{ color: CLAY }}>{inr(r.value_out)}</span>
            </div>
            <div className="relative h-[9px] rounded-[2px]" style={{ background: "#EFEBE1" }}>
              <div className="h-full rounded-[2px]" style={{
                width: on ? `${(r.value_out / max) * 100}%` : "0%", background: "rgba(176,74,46,0.45)",
                border: `1px solid ${CLAY}`, transition: `width 640ms ${EASE} ${140 + i * 40}ms`,
              }} />
              <span title={`${r.rate.toFixed(1)}% of this category's items are out of stock`}
                style={{ position: "absolute", top: -3, left: `${Math.min(r.rate, 100)}%`, width: 2, height: 15, background: BRASS,
                         opacity: on ? 1 : 0, transition: `opacity 400ms ease ${600 + i * 40}ms` }} />
            </div>
          </div>
        ))}
      </div>
      <Readout k={hi} minH={34}>
        {a ? <span><b>{nm(a.label, 26)}</b> — {a.out} of {a.pairs} items out (<b style={{ color: BRASS }}>{a.rate.toFixed(1)}%</b>) · <b style={{ color: CLAY }}>{inr(a.value_out)}</b> of {inr(a.value_all)} consumption</span>
          : <span style={{ color: SUB }}>brass tick = stock-out rate by item count · hover for the items inside</span>}
      </Readout>
      {drill.panel}
    </>
  );
}
