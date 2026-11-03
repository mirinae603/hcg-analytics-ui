"use client";
// Billable vs Non-Billable Consumption — "TWO CATALOGUES".
//
// The finding this page exists to show: the billed catalogue and the internally-issued
// catalogue are almost disjoint. Only 1,230 of 15,171 billed materials (8.1%) are ever also
// issued internally. Most items are either sold to a patient or consumed by the hospital —
// rarely both. The hero therefore encodes the SAME three buckets twice, on two axes that
// disagree: by rupees (where 'Billed only' dominates) and by material count (where
// 'Internal only' is nearly as large). That divergence IS the story.
//
// Deliberately absent: any month or hospital dimension — this table has neither. And no
// "net margin": internal cost is never subtracted from billed margin anywhere.
import React, { useEffect, useMemo, useState, useId } from "react";
import dynamic from "next/dynamic";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { useWindows, monthsLabel, windowPill } from "@/lib/useWindows";
import { byKey } from "@/lib/kpiRegistry";
import { useCardCategory } from "@/components/common/CardCategoryFilter";
import { useDrillBind } from "@/components/portfolio/useDrillBind";
import {
  PageShell, HeroShell, Card, Head, Readout, Hatch, Skeleton, useArmed,
  INK, SUB, RULE, LINE, CARD, NEUTRAL, GRAPHITE, JADE, JADE_DEEP, BRASS, CLAY,
  inr, pct1, num, nm, EASE, EASE_OUT,
} from "./kit";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const SCOPES = [
  { key: "Billed only", label: "Billed only", blurb: "sold to a patient, never issued internally", fill: JADE, hatch: false },
  { key: "Both", label: "Both", blurb: "the overlap — sold AND issued internally", fill: JADE_DEEP, hatch: false },
  { key: "Internal only", label: "Internal only", blurb: "consumed by the hospital, never billed", fill: CLAY, hatch: true },
];

export default function BillableConsumptionDetail() {
  const uid = useId().replace(/[:]/g, "");
  const on = useArmed();
  const [scope, setScope] = useState<any[] | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  // materials per bucket, counted by the table itself (null while loading); `countsFailed` when
  // that request failed, so the page leaves the counts out rather than print 0 materials
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  // the billing months this table sets internal issues beside (GET /meta/windows)
  const billing = useWindows()?.windows.legacy_sales;
  const [hi, setHi] = useState<number | null>(null);
  const kpi = byKey("billable-consumption");
  const cat = useCardCategory({ accent: CLAY, label: "Billable split", allLabel: "All categories" });
  // hover a scope bucket -> the materials that make it up
  const drill = useDrillBind({
    kpi: "billable-consumption", dim: "scope", by: "material", measure: "internal_cost",
    label: "materials", dimLabel: "Scope · internal cost", format: inr, category: cat.drill,
  });

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/billable-consumption?group_by=scope&measures=billed_cost,internal_cost,total_material_cost`
          + (cat.category ? `&Category=${encodeURIComponent(cat.category)}` : ""))
      .then((r) => r.json()).then((d) => setScope(Array.isArray(d) ? d : [])).catch(() => setScope([]));
    // How many materials sit in each bucket: the counts of the table's own "Billed or internal"
    // filter over the WHOLE table (facets=only sends counts, no rows), cut to the same category as
    // the money above. They used to be fixed numbers measured once at build time.
    // fetch resolves on an HTTP error too, so a 4xx/5xx body, or an answer without the scope
    // facet, counts as a failure: no count is known, and none is shown.
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/billable-consumption/table?facets=only`
          + (cat.category ? `&Category=${encodeURIComponent(cat.category)}` : ""))
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => {
        const f = (d?.facets || []).find((x: any) => x.field === "scope");
        if (!f || !Array.isArray(f.values)) throw new Error("no scope facet");
        const out: Record<string, number> = {};
        f.values.forEach((v: any) => { out[String(v.value)] = Number(v.count) || 0; });
        setCounts(out); setCountsFailed(false);
      })
      .catch(() => { setCounts(null); setCountsFailed(true); });
    // material grain, for the two ladders. 400 is plenty to rank the tail honestly.
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/billable-consumption/table?page=0&page_size=400&sort_field=total_material_cost&sort_order=desc`)
      .then((r) => r.json()).then((d) => setRows(d?.data || [])).catch(() => setRows([]));
  }, [cat.category]);

  const buckets = useMemo(() => {
    if (!scope) return null;
    return SCOPES.map((s) => {
      const f = scope.find((x) => x.scope === s.key) || {};
      return { ...s, money: Number(f.total_material_cost || 0), billed: Number(f.billed_cost || 0), internal: Number(f.internal_cost || 0) };
    });
  }, [scope]);

  // Counted over the whole table by the endpoint (the 400-row sample above cannot count the tail).
  // Without them (the request failed) every count is unknown, never 0.
  const known = counts != null;
  const COUNTS: Record<string, number> = counts ?? {};
  const countOf = (key: string) => COUNTS[key] ?? 0;
  /** A bucket's count for a badge: "top 8 of 1,230", or "top 8" when the counts are unknown. */
  const topOf = (key: string) => (known ? `top 8 of ${num(countOf(key))}` : "top 8");

  const totalMoney = buckets ? buckets.reduce((s, b) => s + b.money, 0) : 0;
  const totalCount = Object.values(COUNTS).reduce((a, b) => a + b, 0);
  const ofCount = (n: number) => (totalCount ? pct1((n / totalCount) * 100) : "—");

  // ladders — computed off the material-grain sample
  const bothTop = useMemo(() => rows.filter((r) => r.scope === "Both").sort((a, b) => b.internal_cost - a.internal_cost).slice(0, 8), [rows]);
  const intTop = useMemo(() => rows.filter((r) => r.scope === "Internal only").sort((a, b) => b.internal_cost - a.internal_cost).slice(0, 8), [rows]);

  if (!buckets || (!counts && !countsFailed)) return <PageShell title="Billable vs non-billable consumption" sub="what the hospitals recover from patients, and what they absorb" pill="material grain"><Skeleton /></PageShell>;

  const W = 900, BW = 852, X0 = 24;
  const H = 250, yMoney = 44, yCount = 150, barH = 46;

  let cm = X0, cc = X0;
  const laid = buckets.map((b) => {
    const wm = totalMoney ? (b.money / totalMoney) * BW : 0;
    const wc = totalCount ? (countOf(b.key) / totalCount) * BW : 0;
    const o = { ...b, xm: cm, wm, xc: cc, wc, count: countOf(b.key) };
    cm += wm; cc += wc; return o;
  });
  const a = hi != null ? laid[hi] : null;

  return (
    <PageShell title="Billable vs non-billable consumption"
      sub="what the hospitals recover from patients, and what they absorb — by material"
      pill={windowPill(billing)}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-6">

        {/* ── HERO — the two catalogues, same buckets, two disagreeing axes ── */}
        <div className="xl:col-span-12">
          <HeroShell>
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <div className="lg:w-[30%] flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>Material cost{billing ? `, ${monthsLabel(billing)}` : ""}</div>
                  {cat.chip}
                </div>
                <div className="mt-3 text-[44px] font-light tabular-nums leading-none" style={{ color: INK, letterSpacing: "-.03em" }}>{inr(totalMoney)}</div>
                {known && <div className="text-[10.5px] font-semibold uppercase mt-2" style={{ color: SUB, letterSpacing: ".12em" }}>across {num(totalCount)} materials</div>}
                {known ? (
                  <>
                    <p className="text-[11.5px] mt-5 leading-relaxed" style={{ color: SUB }}>
                      The two bars below carry the <b style={{ color: INK }}>same three buckets</b> — top by rupees,
                      bottom by how many materials. They disagree sharply, and that disagreement is the finding:
                      <b style={{ color: INK }}> {ofCount(countOf("Internal only"))} of materials are never billed at all</b>,
                      but they account for only {pct1((laid[2].money / totalMoney) * 100)} of the money.
                    </p>
                    <p className="text-[11.5px] mt-3 leading-relaxed" style={{ color: SUB }}>
                      Only <b style={{ color: JADE_DEEP }}>{num(countOf("Both"))}</b> materials appear on both sides.
                      Billed and internal are, in practice, two different catalogues.
                    </p>
                  </>
                ) : (
                  <p className="text-[11.5px] mt-5 leading-relaxed" style={{ color: SUB }}>
                    The bar below splits the material cost into the three buckets. How many materials sit in
                    each could not be loaded, so the counts are left out rather than shown as zero.
                  </p>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto" }} preserveAspectRatio="xMidYMid meet"
                  onMouseLeave={() => setHi(null)} role="img" aria-label="Material cost and material count, split by billing scope">
                  <defs><Hatch id={`h-${uid}`} /></defs>
                  <text x={X0} y={26} style={{ fontSize: 10.5, fontWeight: 600, fill: SUB, letterSpacing: ".06em" }}>BY RUPEES — material cost</text>
                  <text x={X0} y={yCount - 18} style={{ fontSize: 10.5, fontWeight: 600, fill: SUB, letterSpacing: ".06em" }}>BY COUNT — number of materials</text>
                  {!known && <text x={X0} y={yCount + 28} style={{ fontSize: 11.5, fill: SUB }}>Material counts could not be loaded.</text>}
                  {laid.map((b, i) => (
                    <g key={`m${i}`} style={{ opacity: hi == null || hi === i ? 1 : 0.42, transition: "opacity 180ms", cursor: "pointer" }}
                      {...drill.bind(b.key, { onMouseEnter: () => setHi(i) })}>
                      <rect x={b.xm} y={yMoney} width={on ? b.wm : 0} height={barH} fill={b.hatch ? "rgba(176,74,46,0.14)" : b.fill}
                        style={{ transition: `width 720ms ${EASE_OUT} ${140 + i * 90}ms` }} />
                      {b.hatch && <rect x={b.xm} y={yMoney} width={on ? b.wm : 0} height={barH} fill={`url(#h-${uid})`} style={{ transition: `width 720ms ${EASE_OUT} ${140 + i * 90}ms` }} />}
                      {b.hatch && <rect x={b.xm} y={yMoney} width={on ? b.wm : 0} height={barH} fill="none" stroke={CLAY} strokeWidth="1" style={{ transition: `width 720ms ${EASE_OUT} ${140 + i * 90}ms` }} />}
                      {b.wm > 92 && <text x={b.xm + b.wm / 2} y={yMoney + 28} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 700, fill: b.hatch ? CLAY : "#EAF5F1", opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" }}>{inr(b.money)}</text>}
                    </g>
                  ))}
                  {/* connectors: same bucket, two positions — the visual proof they disagree */}
                  {known && laid.map((b, i) => (
                    <path key={`c${i}`} d={`M${b.xm + b.wm / 2},${yMoney + barH + 4} L${b.xc + b.wc / 2},${yCount - 6}`}
                      stroke={b.hatch ? CLAY : JADE} strokeWidth="1" strokeDasharray="3 3"
                      style={{ opacity: on ? (hi == null || hi === i ? 0.5 : 0.15) : 0, transition: "opacity 400ms ease 1000ms" }} />
                  ))}
                  {known && laid.map((b, i) => (
                    <g key={`n${i}`} onMouseEnter={() => setHi(i)} style={{ opacity: hi == null || hi === i ? 1 : 0.42, transition: "opacity 180ms" }}>
                      <rect x={b.xc} y={yCount} width={on ? b.wc : 0} height={barH} fill={NEUTRAL}
                        style={{ transition: `width 720ms ${EASE_OUT} ${360 + i * 90}ms` }} />
                      <rect x={b.xc} y={yCount} width={on ? b.wc : 0} height={barH} fill="none" stroke="#B8B0A0" strokeWidth="1"
                        style={{ transition: `width 720ms ${EASE_OUT} ${360 + i * 90}ms` }} />
                      {b.wc > 92 && <text x={b.xc + b.wc / 2} y={yCount + 28} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 700, fill: "#4A4438", opacity: on ? 1 : 0, transition: "opacity 400ms ease 900ms" }}>{num(b.count)}</text>}
                      <text x={b.xc + b.wc / 2} y={yCount + barH + 18} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: hi === i ? 700 : 500, fill: hi === i ? INK : SUB }}>{b.wc > 60 ? b.label : ""}</text>
                    </g>
                  ))}
                </svg>
                <Readout k={hi} dark>
                  {a ? (
                    <span><b>{a.label}</b> — {known ? `${num(a.count)} materials (${ofCount(a.count)} of the catalogue) ·` : ""}
                      <b style={{ color: a.hatch ? CLAY : JADE_DEEP }}> {inr(a.money)}</b> ({pct1((a.money / totalMoney) * 100)} of material cost)
                      <span style={{ color: SUB }}> — {a.blurb}</span></span>
                  ) : <span style={{ color: SUB }}>{known ? "hover a bucket — dashed lines link it across both axes, and the items inside appear" : "hover a bucket — the items inside appear"}</span>}
                </Readout>
                {drill.panel}
              </div>
            </div>
          </HeroShell>
        </div>

        {/* ── S1 — the overlap, ranked by what is NOT recovered ── */}
        <div className="xl:col-span-6">
          <Card delay={180}>
            <Head label="The overlap — where recovery is partial"
              note="Materials issued internally AND billed. Bar length is internal (unrecovered) cost; the brass tick is the share of that material's cost that IS billed."
              badge={topOf("Both")} />
            <Ladder rows={bothTop} on={on} metric="internal_cost" showShare />
          </Card>
        </div>

        {/* ── S2 — pure absorption ── */}
        <div className="xl:col-span-6">
          <Card delay={260}>
            <Head label="Never billed — pure absorption"
              note="Materials issued to cost centres with no patient bill anywhere in the window. Hatched because none of this is recovered."
              badge={topOf("Internal only")} />
            <Ladder rows={intTop} on={on} metric="internal_cost" hatch uid={uid} />
          </Card>
        </div>

        <div className="xl:col-span-12">
          <Card delay={340} className="!p-0">
            <div className="p-5 md:p-6 pb-0"><Head label="Every material" note="Paginated · sortable · filterable · export CSV" badge={known ? `${num(totalCount)} rows` : undefined} /></div>
            <div className="-mt-2">{kpi && <KpiTable kpiKey="billable-consumption" columns={kpi.columns} />}</div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

/** Shared ranked bar list. `showShare` adds the brass billable-share tick — a RATE, which
 *  is the only thing brass is ever allowed to encode. */
function Ladder({ rows, on, metric, showShare = false, hatch = false, uid = "" }: any) {
  const [hi, setHi] = useState<number | null>(null);
  const max = Math.max(...rows.map((r: any) => Number(r[metric]) || 0), 1);
  const a = hi != null ? rows[hi] : null;
  if (!rows.length) return <div className="py-12 text-center text-[13px]" style={{ color: SUB }}>No materials in this bucket.</div>;
  return (
    <>
      <svg viewBox="0 0 460 12" width="0" height="0" style={{ position: "absolute" }}><defs>{hatch && <Hatch id={`lh-${uid}`} />}</defs></svg>
      <div>
        {rows.map((r: any, i: number) => {
          const v = Number(r[metric]) || 0, w = (v / max) * 100;
          const share = Number(r.billable_share_pct) || 0;
          return (
            <div key={r.material} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
              className="py-1.5" style={{ opacity: hi != null && hi !== i ? 0.5 : 1, transition: "opacity 160ms" }}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-[12px] truncate" style={{ color: INK }} title={r.material_desc}>{nm(r.material_desc, 34)}</span>
                <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: hatch ? CLAY : GRAPHITE }}>{inr(v)}</span>
              </div>
              <div className="relative h-[9px] rounded-[2px]" style={{ background: "#EFEBE1" }}>
                <div className="h-full rounded-[2px]" style={{
                  width: on ? `${w}%` : "0%", transition: `width 640ms ${EASE} ${140 + i * 45}ms`,
                  background: hatch ? "rgba(176,74,46,0.22)" : GRAPHITE,
                  border: hatch ? `1px solid ${CLAY}` : "none",
                }} />
                {showShare && (
                  <span title={`${pct1(share)} of this material's cost is billed`}
                    style={{ position: "absolute", top: -3, left: `${Math.min(share, 100)}%`, width: 2, height: 15, background: BRASS, transition: `left 640ms ${EASE} ${240 + i * 45}ms` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Readout k={hi} minH={34}>
        {a ? (
          <span><b>{nm(a.material_desc, 30)}</b> <span style={{ color: SUB }}>({a.material_group})</span> — internal {inr(a.internal_cost)}
            {showShare && <> · billed {inr(a.billed_cost)} · <b style={{ color: BRASS }}>{pct1(a.billable_share_pct)}</b> recovered</>}</span>
        ) : <span style={{ color: SUB }}>{showShare ? "brass tick = share of that material's cost that is billed" : "hover a material"}</span>}
      </Readout>
    </>
  );
}
