"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { CARD_SH, inrAbbr, countAbbr, catName, useMount, smoothPath } from "@/components/portfolio/kit";
import { useCardCategory, useCardScope } from "@/components/common/CardCategoryFilter";
import { GaugeCard, DonutCard, BrandPanel, Tab } from "./ExecCards";
import { TbTrendingDown, TbBuildingFactory2, TbTruckDelivery } from "react-icons/tb";
import { KPIS, Kpi } from "@/lib/kpiRegistry";
import InventoryGlassKpiCard from "@/components/portfolio/inventory/InventoryGlassKpiCard";
import { fetchKpiChart, computeInsights, buildSimTiles } from "@/components/portfolio/inventory/kpiChartFetch";

// Procurement KPIs from registry — same pattern as /inventory's grid.
const procurementKpis: Kpi[] = KPIS.filter((k) => k.portfolio === "procurement");
// Simulated procurement KPIs, adapted to the same glass-card shape so they render
// inline in the grid (washed-out + a "Simulated" tag) — no separate section.
const simProcurement = buildSimTiles("procurement");

const PAGE = "#ECF3F1";
const INK = "#1f2333";
const SUBTLE = "#8a91a0";
const EMER = "#0e9f6e", TEAL = "#0d9488", INDIGO = "#4f46e5", SKY = "#0ea5e9", AMBER = "#e0992f", ROSE = "#e8604a";
const pctSign = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;

function SpendFlow({ timeline, cat, empty }: { timeline: any[]; cat: any; empty: boolean }) {
  const on = useMount(140); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || [];
  const W = 760, H = 248, PADX = 26, PADT = 50, PADB = 34;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const vals = data.map((d) => d.value); const max = Math.max(...vals, 0), min = Math.min(...vals, 0);
  const avg = data.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0; const peakIdx = vals.indexOf(max);
  const lo = min * 0.85, hi = max * 1.04, span = hi - lo || 1;
  const X = (i: number) => PADX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const Y = (v: number) => PADT + innerH - ((v - lo) / span) * innerH;
  const pts = data.map((d, i) => ({ x: X(i), y: Y(d.value) }));
  const line = smoothPath(pts);
  const area = `${line} L ${X(data.length - 1).toFixed(1)} ${(PADT + innerH).toFixed(1)} L ${X(0).toFixed(1)} ${(PADT + innerH).toFixed(1)} Z`;
  const avgY = Y(avg);
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Spend flow</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>monthly purchase value · 6-month window</p></div>
        <div className="flex items-center gap-3">
          {cat.chip}
          <div className="text-right"><div className="text-[20px] font-bold leading-none tabular-nums" style={{ color: EMER }}>{inrAbbr(avg)}</div>
            <div className="text-[11px] mt-1" style={{ color: SUBTLE }}>avg / month</div></div>
        </div>
      </div>
      {cat.note(empty) && <div className="mt-3">{cat.note(true)}</div>}
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs><linearGradient id="ovSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={EMER} stopOpacity="0.26" /><stop offset="100%" stopColor={EMER} stopOpacity="0" /></linearGradient></defs>
          <line x1={PADX} y1={avgY} x2={W - PADX} y2={avgY} stroke="#cfe0d9" strokeWidth="1" strokeDasharray="4 5" />
          <text x={W - PADX} y={avgY - 6} textAnchor="end" style={{ fontSize: 10, fill: "#a7b3ad", fontWeight: 600 }}>avg</text>
          <path d={area} fill="url(#ovSpend)" style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease 0.3s" }} />
          <path d={line} fill="none" stroke={EMER} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
          {data.map((d, i) => { const isPeak = i === peakIdx, active = hov === i; return (
            <g key={i}>
              {active && <line x1={pts[i].x} y1={PADT - 8} x2={pts[i].x} y2={PADT + innerH} stroke={EMER} strokeWidth="1" strokeOpacity="0.35" />}
              <circle cx={pts[i].x} cy={pts[i].y} r={active || isPeak ? 5.5 : 3.5} fill="#fff" stroke={EMER} strokeWidth={active || isPeak ? 3 : 2.5} style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.6 + i * 0.08}s` }} />
              <rect x={pts[i].x - innerW / (data.length * 2)} y={0} width={innerW / data.length} height={H} fill="transparent" onMouseEnter={() => setHov(i)} />
              <text x={pts[i].x} y={H - 8} textAnchor="middle" style={{ fontSize: 11, fill: active ? INK : "#9aa1b3", fontWeight: active ? 700 : 500 }}>{d.label}</text>
            </g>
          ); })}
        </svg>
        {(() => { const i = hov ?? peakIdx; const d = data[i]; if (!d) return null; const leftPct = (X(i) / W) * 100;
          return (<div className="absolute pointer-events-none" style={{ left: `${leftPct}%`, top: `${(Y(d.value) / H) * 100}%`, transform: "translate(-50%, -135%)", transition: "left 0.18s ease, top 0.18s ease" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(40,52,86,0.4)", border: "1px solid #eef0f6" }}>
              <div className="text-[13px] font-bold tabular-nums leading-none" style={{ color: INK }}>{inrAbbr(d.value)}</div>
              <div className="text-[10px] mt-0.5" style={{ color: hov == null ? EMER : SUBTLE }}>{hov == null ? "peak · " + d.month : d.month}</div>
            </div></div>); })()}
      </div>
    </div>
  );
}


function CategoriesCard({ categories }: { categories: any[] }) {
  const on = useMount(120); const max = Math.max(...categories.map((c) => c.value), 1);
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Where spend goes</h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: SUBTLE }}>top categories by purchase value</p>
      <div className="space-y-3">
        {categories.slice(0, 7).map((c, i) => { const w = Math.max((c.value / max) * 100, 3); const col = c.uncat ? "#aab2c2" : EMER; return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5"><span className="text-[12px] font-medium truncate pr-2" style={{ color: c.uncat ? "#9aa1b3" : "#4b5468" }} title={catName(c.name)}>{catName(c.name)}</span><span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: INK }}>{inrAbbr(c.value)}</span></div>
            <div className="h-2 rounded-full" style={{ background: "#eef1f0" }}><div className="h-full rounded-full" style={{ width: on ? `${w}%` : "0%", background: col, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms` }} /></div>
          </div>
        ); })}
      </div>
    </div>
  );
}

function VendorsCard({ vendors, top5, cat }: { vendors: any[]; top5: number; cat: any }) {
  return (
    <div className="rounded-[26px] bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-center justify-between gap-2"><h3 className="text-[15px] font-semibold" style={{ color: INK }}>Vendor concentration</h3>
        <div className="flex items-center gap-2">
          {cat.chip}
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${INDIGO}14`, color: INDIGO }}>top-5 · {Math.round(top5)}%</span>
        </div></div>
      <p className="text-[12px] mt-0.5 mb-3" style={{ color: SUBTLE }}>largest suppliers by spend share</p>
      {cat.note(!vendors.length) && <div className="mb-3">{cat.note(true)}</div>}
      <div className="divide-y divide-gray-50 flex-1 flex flex-col justify-between">
        {vendors.slice(0, 7).map((v, i) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3 min-w-0"><span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${INDIGO}12`, color: INDIGO }}><TbBuildingFactory2 size={15} /></span>
              <div className="min-w-0"><div className="text-[12.5px] font-medium truncate" style={{ color: "#3c465c" }} title={v.name}>{v.name}</div><div className="text-[11px]" style={{ color: SUBTLE }}>{inrAbbr(v.value)} · {countAbbr(v.lines)} lines</div></div></div>
            <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{v.share.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpenPOCard({ openPo }: { openPo: any }) {
  const on = useMount(140);
  const cats: any[] = openPo?.categories || [];
  if (!cats.length) return null;
  const max = Math.max(...cats.map((c) => c.value), 1);
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2"><TbTruckDelivery size={17} style={{ color: AMBER }} />
            <h3 className="text-[16px] font-semibold" style={{ color: INK }}>Open purchase orders</h3></div>
          <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>ordered, not yet received · undelivered value by category</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right"><div className="text-[20px] font-bold leading-none tabular-nums" style={{ color: AMBER }}>{inrAbbr(openPo.total_value)}</div>
            <div className="text-[11px] mt-1" style={{ color: SUBTLE }}>open value</div></div>
          <div className="text-right"><div className="text-[20px] font-bold leading-none tabular-nums" style={{ color: INK }}>{countAbbr(openPo.total_pos)}</div>
            <div className="text-[11px] mt-1" style={{ color: SUBTLE }}>open POs</div></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-5">
        {cats.map((c, i) => { const w = Math.max((c.value / max) * 100, 3); const isUncat = /uncateg/i.test(c.category); const col = isUncat ? "#aab2c2" : AMBER; return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium truncate pr-2" style={{ color: isUncat ? "#9aa1b3" : "#4b5468" }} title={catName(c.category)}>{catName(c.category)}</span>
              <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: INK }}>{inrAbbr(c.value)} <span className="font-normal" style={{ color: SUBTLE }}>· {countAbbr(c.pos)}</span></span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "#eef1f0" }}><div className="h-full rounded-full" style={{ width: on ? `${w}%` : "0%", background: col, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms` }} /></div>
          </div>
        ); })}
      </div>
    </div>
  );
}

function SavingsCard({ region }: { region: string }) {
  const on = useMount(160);
  const [d, setD] = useState<any>(null);
  // Every step of this computation is per material — an item's own median price, its
  // >=4-purchase gate and its headroom are identical whether or not its bucket is
  // selected — so the flagged items simply partition across the six buckets.
  const cat = useCardCategory({ accent: INDIGO, domain: "procurement", label: "Price consolidation opportunity" });
  useEffect(() => {
    setD(null);
    const ac = new AbortController();
    const p = new URLSearchParams({ Plant: region, ...cat.q });
    fetch(`${DASHBOARD_API_BASE_URL}/portfolio/procurement/savings?${p}`, { signal: ac.signal })
      .then((r) => r.json()).then((x) => setD(x || null))
      .catch((e) => { if (e?.name !== "AbortError") setD(null); });
    return () => ac.abort();
  }, [region, cat.category]); // eslint-disable-line react-hooks/exhaustive-deps
  const items: any[] = d?.items || [];
  const t = d?.totals || {};
  // The card can only vanish entirely when NOTHING is selected — once a filter is on it
  // has to stay on screen, or the control that produced the empty result disappears
  // with it and there is no way back to All.
  if (!items.length && !cat.active) return null;
  const maxOver = Math.max(...items.map((i) => i.over), 1);
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2"><TbTrendingDown size={17} style={{ color: INDIGO }} />
            <h3 className="text-[16px] font-semibold" style={{ color: INK }}>Price consolidation opportunity</h3>
            <span className="cursor-help text-[11px] w-4 h-4 rounded-full inline-flex items-center justify-center" style={{ background: "#eef0fb", color: INDIGO }}
              title="For each item bought ≥4 times at a consistent unit price (max ≤2.5× min, so mixed pack sizes are excluded), we sum the spend above that item's own median achieved price. A conservative 'paid above your own median' figure — negotiation headroom, not a guaranteed saving.">i</span>
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>same item priced above its own median across the 6-month window</p>
        </div>
        <div className="flex items-center gap-3">
          {cat.chip}
          <div className="text-right">
            <div className="text-[20px] font-bold leading-none tabular-nums" style={{ color: INDIGO }}>{inrAbbr(Number(t.opportunity ?? 0))}</div>
            <div className="text-[11px] mt-1" style={{ color: SUBTLE }}>headroom · {Number(t.items_flagged ?? 0).toLocaleString("en-IN")} items</div>
          </div>
        </div>
      </div>
      {cat.note(!items.length) && <div className="mt-4">{cat.note(true)}</div>}
      <div className="mt-5 space-y-2.5">
        {items.slice(0, 8).map((it, i) => { const w = Math.max((it.over / maxOver) * 100, 4); return (
          <div key={i} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-medium truncate" style={{ color: "#3c465c" }} title={it.desc}>{it.desc}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: "#eef0fb", color: INDIGO }}>+{it.spread_pct.toFixed(0)}%</span>
              </div>
              <div className="text-[10.5px] mt-0.5" style={{ color: SUBTLE }}>{it.lines} buys · median {inrAbbr(it.median)} → high {inrAbbr(it.max)}</div>
              <div className="h-1.5 rounded-full mt-1.5" style={{ background: "#eef1f0" }}><div className="h-full rounded-full" style={{ width: on ? `${w}%` : "0%", background: INDIGO, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 45}ms` }} /></div>
            </div>
            <span className="text-[13px] font-bold tabular-nums flex-shrink-0 w-16 text-right" style={{ color: INK }}>{inrAbbr(it.over)}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

export default function ProcurementOverview() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  // "loading" covers BOTH "fetch still in flight" and "fetch failed" -- either way there is
  // no real data yet, so the executive cards must show a neutral skeleton, never a
  // confident-looking 0/0%/"Watch fill" as if it were a genuine result (the original bug).
  const [loading, setLoading] = useState(true);
  const overviewUrl = `/portfolio/procurement/overview?Plant=${encodeURIComponent(region)}`;
  useEffect(() => {
    setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}${overviewUrl}`)
      .then((r) => r.json()).then((d) => { setData(d || null); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart data per KPI key, for the glass grid — identical fetch/shape to /inventory's
  // grid (aggregated ~12-row series per tile, not the raw table).
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      procurementKpis.map(async (kpi) => {
        if (!kpi.chart) return { key: kpi.key, data: [] };
        try {
          return { key: kpi.key, data: await fetchKpiChart(kpi, region) };
        } catch {
          return { key: kpi.key, data: [] };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, any[]> = {};
      results.forEach(({ key, data }) => { map[key] = data; });
      setChartDataMap(map);
    });
    return () => { cancelled = true; };
  }, [region]);

  // FOUR independent card filters over the ONE payload the page already fetched. Each
  // card keeps its own narrowed copy, so cutting the gauge to Onco Drugs leaves the
  // donut, the spend flow and the vendor ladder showing the whole Rs 649.91 Cr — which
  // is what makes the filtered number readable as a share of it. At All Categories
  // every one of them hands back `data` by reference: no request, no re-render.
  //
  // `domain: "procurement"` is load-bearing. On the stock domain Unclassified is hidden
  // for holding Rs 0.00 of stock; here it is Rs 272.35 Cr — 41.9%, the largest bucket
  // on the page.
  const gauge = useCardScope(overviewUrl, data, { accent: EMER, domain: "procurement", label: "Procurement totals" });
  const donut = useCardScope(overviewUrl, data, { accent: INDIGO, domain: "procurement", label: "Vendor concentration" });
  const flow = useCardScope(overviewUrl, data, { accent: EMER, domain: "procurement", label: "Spend flow" });
  const vend = useCardScope(overviewUrl, data, { accent: INDIGO, domain: "procurement", label: "Largest suppliers" });
  // Combined flag passed to the cards below: true while the request is in flight, AND
  // true if it resolved with nothing usable (failed / empty) -- only false once real
  // totals are in hand. Never let the "fetch failed" case fall through to the old
  // confident-zero render.
  const showSkeleton = loading || !data;

  // Derived from whichever copy of the payload a card is holding — `data` for the page
  // chrome, `<card>.data` for a card that has a category on. Identical arithmetic either
  // way, so an untouched card computes exactly what it computed before.
  const derive = (d: any) => {
    const t = d?.totals || {};
    const timeline = d?.timeline || [];
    const vlist = d?.vendors || [];
    const spend = Number(t.spend ?? 0);
    return {
      t, timeline, vlist, spend,
      poLines: Number(t.po_lines ?? 0), vendors: Number(t.vendors ?? 0),
      top5: Number(t.top5_share ?? 0), completion: Number(t.completion ?? 0),
      peak: Math.max(...timeline.map((x: any) => x.value), 1),
      avgM: timeline.length ? spend / timeline.length : 0,
      mom: Number((d?.cards || {})["procurement-variance"]?.value ?? 0),
      top1: Number(vlist[0]?.share ?? 0),
      top1v: Number(vlist[0]?.value ?? 0),
    };
  };
  const page = derive(data);
  const t = page.t;

  const g = derive(gauge.data);
  const tabs: Tab[] = [
    { key: "spend", tab: "Spend", label: "Total procurement spend", value: g.spend, fmt: inrAbbr, gauge: g.peak ? g.avgM / g.peak : 0, gaugeLabel: "avg of peak month", color: EMER, status: { text: g.mom >= 0 ? "Spending up" : "Spending down", color: g.mom >= 0 ? EMER : ROSE }, stats: [{ value: pctSign(g.mom), label: "MoM", color: g.mom >= 0 ? EMER : ROSE }, { value: inrAbbr(g.peak), label: "peak mo", color: "#9aa1b3" }, { value: inrAbbr(g.avgM), label: "avg mo", color: "#9aa1b3" }] },
    { key: "orders", tab: "Orders", label: "Purchase-order lines", value: g.poLines, fmt: countAbbr, gauge: g.completion / 100, gaugeLabel: "order completion", color: TEAL, status: { text: g.completion >= 90 ? "On track" : "Watch fill", color: TEAL }, stats: [{ value: countAbbr(g.poLines), label: "PO lines", color: "#9aa1b3" }, { value: inrAbbr(g.spend / Math.max(g.poLines, 1)), label: "avg PO", color: "#9aa1b3" }, { value: countAbbr(g.vendors), label: "vendors", color: "#9aa1b3" }] },
    { key: "vendors", tab: "Vendors", label: "Active vendors", value: g.vendors, fmt: countAbbr, gauge: g.top5 / 100, gaugeLabel: "top-5 share", color: INDIGO, status: { text: g.top5 >= 50 ? "Concentrated" : "Diversified", color: INDIGO }, stats: [{ value: `${g.top1.toFixed(0)}%`, label: "top vendor", color: INDIGO }, { value: `${g.top5.toFixed(0)}%`, label: "top-5", color: "#9aa1b3" }, { value: countAbbr(g.vendors), label: "vendors", color: "#9aa1b3" }] },
  ];

  const dn = derive(donut.data);
  const top5v = dn.spend * dn.top5 / 100;
  const segments = [
    { label: "Top vendor", value: dn.top1v, color: INDIGO },
    { label: "Vendors 2–5", value: Math.max(0, top5v - dn.top1v), color: "#818cf8" },
    { label: "All others", value: Math.max(0, dn.spend - top5v), color: "#cbd5e1" },
  ];

  const fl = derive(flow.data);
  const vd = derive(vend.data);

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Procurement</h1>
          <p className="text-[13px] mt-1" style={{ color: SUBTLE }}>spend, vendors & supply performance · {displayRegion(region)}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-full cursor-help" style={{ color: "#0e7a54", background: "#eaf5ef", border: "1px solid #cbe8d9" }} title="Unit MRP − purchase cost on GRN lines where MRP is recorded (proxy margin — not billed sales margin).">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#0e7a54" }} />{Number(t.margin_pct ?? 0).toFixed(1)}% MRP margin
            <span className="font-normal" style={{ color: "#4a8f72" }}>· {inrAbbr(Number(t.margin_value ?? 0))}</span>
          </span>
          <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#5b6478", boxShadow: "0 4px 14px -8px rgba(40,52,86,0.2)" }}>6-month window</span>
        </div>
      </div>

      {/* Executive cards row */}
      <div className="flex flex-wrap lg:flex-nowrap gap-5 items-stretch mb-5">
        <div className="w-full lg:w-1/3 min-h-[220px]"><BrandPanel /></div>
        <div className="w-full lg:w-1/3"><GaugeCard tabs={tabs} loading={showSkeleton || gauge.loading}
          headerSlot={gauge.chip} note={gauge.note(!g.spend)} /></div>
        <div className="w-full lg:w-1/3"><DonutCard label="Vendor concentration" headline={dn.spend} headSuffix="total spend" centerLabel="Vendors"
          segments={segments} insights={[{ label: "Top-1", value: `${dn.top1.toFixed(0)}%`, color: INDIGO }, { label: "Top-5", value: `${dn.top5.toFixed(0)}%`, color: "#6b7280" }]}
          score={{ text: dn.top5 >= 50 ? "Concentrated" : "Diversified", value: Math.round(dn.top5), color: dn.top5 >= 50 ? AMBER : EMER }}
          loading={showSkeleton || donut.loading} headerSlot={donut.chip} note={donut.note(!dn.spend)} /></div>
      </div>

      {/* Full width: was squeezed to 8/12 next to the two list cards, which left this
          card's own column short of the stacked pair beside it once the KPI grid moved
          out below — a wide monthly trend reads better full-width anyway. */}
      <div className="mb-5"><SpendFlow timeline={fl.timeline} cat={flow} empty={!fl.timeline.length} /></div>

      {/* Two list cards, side by side — similar row counts (7 each), so they land at
          a near-identical natural height without any stretch hack. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <CategoriesCard categories={data?.categories || []} />
        <VendorsCard vendors={vd.vlist} top5={vd.top5} cat={vend} />
      </div>

      {/* ── GLASSMORPHIC KPI grid — pixel-identical to /inventory's grid ── */}
      <div className="mt-5">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(186,230,253,0.6)", background: "rgba(255,255,255,0.4)" }}
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y"
            style={{ borderColor: "transparent" }}
          >
            {procurementKpis.map((kpi, i) => {
              const chartData = chartDataMap[kpi.key] ?? [];
              return (
                <div
                  key={kpi.key}
                  className="relative flex justify-center items-center p-6 transition duration-300"
                  style={{ background: "rgba(255,255,255,0.9)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, rgba(248,252,255,0.6) 0%, rgba(241,249,255,0.8) 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                  }}
                >
                  <InventoryGlassKpiCard
                    kpi={kpi}
                    index={i}
                    insights={computeInsights(kpi, chartData)}
                    chartData={chartData}
                  />
                </div>
              );
            })}
            {simProcurement.map((s, j) => {
              const idx = procurementKpis.length + j;
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
      </div>

      {data?.open_po?.categories?.length ? <div className="mt-5"><OpenPOCard openPo={data.open_po} /></div> : null}

      <div className="mt-5"><SavingsCard region={region} /></div>

      <div className="mt-5 inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full"
        style={{ background: "rgba(14,159,110,0.08)", color: EMER, border: "1px solid rgba(14,159,110,0.2)" }}>
        Spend = PO value (excl. tax) over the 6-month window. Order completion clamped ≤100% (proxy — some lines over-receive).
      </div>
    </div>
  );
}
