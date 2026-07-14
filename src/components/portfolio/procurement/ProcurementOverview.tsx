"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { CARD_SH, inrAbbr, countAbbr, catName, useMount, smoothPath } from "@/components/portfolio/kit";
import { GaugeCard, DonutCard, BrandPanel, Tab } from "./ExecCards";
import { TbCoin, TbReceipt, TbTrendingDown, TbBuildingFactory2, TbMapPin, TbClockHour4, TbTruckDelivery, TbProgressCheck, TbChevronRight, TbFlask } from "react-icons/tb";
import { simulatedByPortfolio } from "@/lib/kpiRegistry";
import { getSimulated } from "@/lib/simulatedKpi";
import { simVisual } from "@/lib/simKpiVisual";
import { fmt as fmtSim } from "@/lib/kpiFormat";

const SIM_PROCUREMENT = simulatedByPortfolio("procurement").map((meta) => {
  const b = getSimulated(meta.key)!;
  return { meta, ...simVisual(meta.key), val: fmtSim(b.headline.value, b.headline.kind), label: b.headline.label };
});

const PAGE = "#ECF3F1";
const INK = "#1f2333";
const SUBTLE = "#8a91a0";
const EMER = "#0e9f6e", TEAL = "#0d9488", INDIGO = "#4f46e5", SKY = "#0ea5e9", AMBER = "#e0992f", ROSE = "#e8604a";
const pctSign = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
const dayFmt = (n: number) => `${n.toFixed(1)} d`;

const KPI_META: Record<string, { title: string; Icon: any; ring: string; tint: string }> = {
  "purchase-value": { title: "Purchase Value", Icon: TbCoin, ring: EMER, tint: "#e7f6ef" },
  "monthly-purchase-value": { title: "Monthly SKU Purchase", Icon: TbReceipt, ring: TEAL, tint: "#e6f5f3" },
  "procurement-variance": { title: "Procurement Variance", Icon: TbTrendingDown, ring: AMBER, tint: "#fcf2e1" },
  "vendor-volume-contribution": { title: "Vendor Volume", Icon: TbBuildingFactory2, ring: INDIGO, tint: "#eef0fb" },
  "purchase-by-location": { title: "Purchase by Location", Icon: TbMapPin, ring: TEAL, tint: "#e6f5f3" },
  "procurement-cycle-time": { title: "Cycle Time", Icon: TbClockHour4, ring: SKY, tint: "#e6f4fb" },
  "vendor-lead-time": { title: "Vendor Lead Time", Icon: TbTruckDelivery, ring: AMBER, tint: "#fcf2e1" },
  "fill-rate": { title: "Fill Rate", Icon: TbProgressCheck, ring: EMER, tint: "#e7f6ef" },
};
const KPI_ORDER = ["purchase-value", "monthly-purchase-value", "procurement-variance", "vendor-volume-contribution", "purchase-by-location", "procurement-cycle-time", "vendor-lead-time", "fill-rate"];
const fmtCard = (kind: string, v: number) => kind === "inr" ? inrAbbr(v) : kind === "days" ? dayFmt(v) : kind === "pct" ? pctSign(v) : countAbbr(v);

function SpendFlow({ timeline }: { timeline: any[] }) {
  const on = useMount(140); const [hov, setHov] = useState<number | null>(null);
  const data = timeline || []; if (!data.length) return null;
  const W = 760, H = 248, PADX = 26, PADT = 50, PADB = 34;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const vals = data.map((d) => d.value); const max = Math.max(...vals), min = Math.min(...vals);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length; const peakIdx = vals.indexOf(max);
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
        <div className="text-right"><div className="text-[20px] font-bold leading-none tabular-nums" style={{ color: EMER }}>{inrAbbr(avg)}</div>
          <div className="text-[11px] mt-1" style={{ color: SUBTLE }}>avg / month</div></div>
      </div>
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

function KpiGrid({ cards }: { cards: Record<string, any> }) {
  return (
    <div className="rounded-[26px] bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <h3 className="text-[16px] font-semibold" style={{ color: INK }}>Explore metrics</h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: SUBTLE }}>8 procurement KPIs · click to drill in</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {KPI_ORDER.map((key) => {
          const m = KPI_META[key]; const c = cards[key] || { value: 0, kind: "num", sub: "" }; const Icon = m.Icon;
          return (
            <Link key={key} href={`/kpi/${key}`} className="group flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-200" style={{ border: "1px solid #eef1f0", background: "#fff" }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.borderColor = m.ring; (e.currentTarget as HTMLElement).style.background = "#fbfdfc"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#eef1f0"; (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
              <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 38, height: 38, background: m.tint, color: m.ring }}><Icon size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }}>{m.title}</div>
                <div className="flex items-baseline gap-1.5"><span className="text-[16px] font-bold tabular-nums leading-tight" style={{ color: m.ring }}>{fmtCard(c.kind, c.value)}</span><span className="text-[10.5px] truncate" style={{ color: SUBTLE }}>{c.sub}</span></div>
              </div>
              <TbChevronRight size={16} className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: "#c4c7d2" }} />
            </Link>
          );
        })}
        {SIM_PROCUREMENT.map(({ meta, Icon, accent, val, label }) => (
          <Link key={meta.key} href={`/kpi/${meta.key}`} className="group flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-200" style={{ border: "1px solid #eef1f0", background: "#fff", opacity: 0.58, filter: "saturate(0.72)" }}
            onMouseOver={(e) => { const t = e.currentTarget as HTMLElement; t.style.opacity = "1"; t.style.filter = "none"; t.style.borderColor = accent; t.style.background = "#fbfdfc"; }}
            onMouseOut={(e) => { const t = e.currentTarget as HTMLElement; t.style.opacity = "0.58"; t.style.filter = "saturate(0.72)"; t.style.borderColor = "#eef1f0"; t.style.background = "#fff"; }}>
            <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 38, height: 38, background: accent + "1c", color: accent }}><Icon size={19} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }}>{meta.title}</div>
              <div className="flex items-baseline gap-1.5"><span className="text-[16px] font-bold tabular-nums leading-tight" style={{ color: accent }}>{val}</span><span className="text-[10.5px] truncate" style={{ color: SUBTLE }}>{label}</span></div>
            </div>
            <span className="flex items-center gap-0.5 px-1.5 py-[3px] rounded-full flex-shrink-0" style={{ background: "#fff7ed", border: "1px solid #fadcae" }}><TbFlask size={9} style={{ color: "#c07d1a" }} /><span className="text-[8.5px] font-bold uppercase tracking-[0.04em]" style={{ color: "#a56a15" }}>Sim</span></span>
          </Link>
        ))}
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

function VendorsCard({ vendors, top5 }: { vendors: any[]; top5: number }) {
  return (
    <div className="rounded-[26px] bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-center justify-between"><h3 className="text-[15px] font-semibold" style={{ color: INK }}>Vendor concentration</h3>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${INDIGO}14`, color: INDIGO }}>top-5 · {Math.round(top5)}%</span></div>
      <p className="text-[12px] mt-0.5 mb-3" style={{ color: SUBTLE }}>largest suppliers by spend share</p>
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
  useEffect(() => { setD(null); fetch(`${DASHBOARD_API_BASE_URL}/portfolio/procurement/savings?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((x) => setD(x || null)).catch(() => setD(null)); }, [region]);
  const items: any[] = d?.items || [];
  const t = d?.totals || {};
  if (!items.length) return null;
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
        <div className="text-right">
          <div className="text-[20px] font-bold leading-none tabular-nums" style={{ color: INDIGO }}>{inrAbbr(Number(t.opportunity ?? 0))}</div>
          <div className="text-[11px] mt-1" style={{ color: SUBTLE }}>headroom · {Number(t.items_flagged ?? 0).toLocaleString("en-IN")} items</div>
        </div>
      </div>
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
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/portfolio/procurement/overview?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null)); }, [region]);

  const t = data?.totals || {};
  const cards = data?.cards || {};
  const timeline = data?.timeline || [];
  const vlist = data?.vendors || [];
  const spend = Number(t.spend ?? 0), poLines = Number(t.po_lines ?? 0), vendors = Number(t.vendors ?? 0);
  const top5 = Number(t.top5_share ?? 0), completion = Number(t.completion ?? 0);
  const peak = Math.max(...timeline.map((x: any) => x.value), 1);
  const avgM = timeline.length ? spend / timeline.length : 0;
  const mom = Number(cards["procurement-variance"]?.value ?? 0);
  const top1 = Number(vlist[0]?.share ?? 0);

  const tabs: Tab[] = [
    { key: "spend", tab: "Spend", label: "Total procurement spend", value: spend, fmt: inrAbbr, gauge: peak ? avgM / peak : 0, gaugeLabel: "avg of peak month", color: EMER, status: { text: mom >= 0 ? "Spending up" : "Spending down", color: mom >= 0 ? EMER : ROSE }, stats: [{ value: pctSign(mom), label: "MoM", color: mom >= 0 ? EMER : ROSE }, { value: inrAbbr(peak), label: "peak mo", color: "#9aa1b3" }, { value: inrAbbr(avgM), label: "avg mo", color: "#9aa1b3" }] },
    { key: "orders", tab: "Orders", label: "Purchase-order lines", value: poLines, fmt: countAbbr, gauge: completion / 100, gaugeLabel: "order completion", color: TEAL, status: { text: completion >= 90 ? "On track" : "Watch fill", color: TEAL }, stats: [{ value: countAbbr(poLines), label: "PO lines", color: "#9aa1b3" }, { value: inrAbbr(spend / Math.max(poLines, 1)), label: "avg PO", color: "#9aa1b3" }, { value: countAbbr(vendors), label: "vendors", color: "#9aa1b3" }] },
    { key: "vendors", tab: "Vendors", label: "Active vendors", value: vendors, fmt: countAbbr, gauge: top5 / 100, gaugeLabel: "top-5 share", color: INDIGO, status: { text: top5 >= 50 ? "Concentrated" : "Diversified", color: INDIGO }, stats: [{ value: `${top1.toFixed(0)}%`, label: "top vendor", color: INDIGO }, { value: `${top5.toFixed(0)}%`, label: "top-5", color: "#9aa1b3" }, { value: countAbbr(vendors), label: "vendors", color: "#9aa1b3" }] },
  ];

  const top1v = Number(vlist[0]?.value ?? 0);
  const top5v = spend * top5 / 100;
  const segments = [
    { label: "Top vendor", value: top1v, color: INDIGO },
    { label: "Vendors 2–5", value: Math.max(0, top5v - top1v), color: "#818cf8" },
    { label: "All others", value: Math.max(0, spend - top5v), color: "#cbd5e1" },
  ];

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Procurement</h1>
          <p className="text-[13px] mt-1" style={{ color: SUBTLE }}>spend, vendors & supply performance · {region}</p>
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
        <div className="w-full lg:w-1/3"><GaugeCard tabs={tabs} /></div>
        <div className="w-full lg:w-1/3"><DonutCard label="Vendor concentration" headline={spend} headSuffix="total spend" centerLabel="Vendors"
          segments={segments} insights={[{ label: "Top-1", value: `${top1.toFixed(0)}%`, color: INDIGO }, { label: "Top-5", value: `${top5.toFixed(0)}%`, color: "#6b7280" }]}
          score={{ text: top5 >= 50 ? "Concentrated" : "Diverse", value: Math.round(top5), color: top5 >= 50 ? AMBER : EMER }} /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col gap-5 min-w-0">
          <SpendFlow timeline={timeline} />
          <KpiGrid cards={cards} />
        </div>
        <div className="xl:col-span-4 flex flex-col gap-5 min-w-0">
          <CategoriesCard categories={data?.categories || []} />
          <VendorsCard vendors={vlist} top5={top5} />
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
