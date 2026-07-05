"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { TbCoins, TbTag, TbArrowUpRight, TbStack2, TbLayersIntersect } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

// ── Valuation identity: soft lavender canvas, violet/indigo accent, cost↔retail duality.
//    Distinct from the blue Turnover page — its own colour + bespoke "what stock is worth" visuals. ──
const PAGE = "#ECEBF6";
const INK = "#262a40";
const SUBTLE = "#8a90a6";
const VIOLET = "#6d5ef0";   // book cost / primary
const TEAL = "#0fb5ae";     // retail (MRP)
const AMBER = "#e0992f";    // unrealized markup
const CARD_SH = "0 16px 40px -24px rgba(46,42,80,0.26), 0 4px 14px -8px rgba(46,42,80,0.08)";
const TINT_INDIGO = { bg: "#eeecfb", bd: "#e1ddf7", ring: VIOLET };
const TINT_TEAL = { bg: "#e6f6f4", bd: "#d2efeb", ring: TEAL };
const TINT_AMBER = { bg: "#fcf2e1", bd: "#f6e6cb", ring: AMBER };

const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
const catName = (g: string) => String(g).replace(/^M\d+-/, "");
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (n: number) => { const p = Math.min((n - start) / 1100, 1); setV(value * easeOut(p)); if (p < 1) raf = requestAnimationFrame(tick); else setV(value); };
    raf = requestAnimationFrame(tick);
    const g = setTimeout(() => setV(value), 1200);
    return () => { cancelAnimationFrame(raf); clearTimeout(g); };
  }, [value]);
  return <>{format(v)}</>;
}
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 140 + delay); return () => clearTimeout(t); }, [delay]); return on; };

// Catmull-Rom → cubic-bezier smoothing
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Uniform stat card (icon+label, big number, caption, share bar)
function StatCard({ tint, icon: Icon, label, value, format, sub, pct, barLabel, delay }: any) {
  const on = useMount(delay); const p = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="rounded-[24px] p-5 flex flex-col" style={{ background: tint.bg, minHeight: 196, border: `1px solid ${tint.bd}`, boxShadow: CARD_SH }}>
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-white flex-shrink-0" style={{ color: tint.ring, boxShadow: "0 5px 12px -7px rgba(46,42,80,0.4)" }}><Icon size={17} /></span>
        <span className="text-[13px] font-semibold" style={{ color: INK }}>{label}</span>
      </div>
      <div className="mt-4">
        <div className="text-[30px] leading-none font-bold tabular-nums tracking-tight whitespace-nowrap" style={{ color: INK }}><CountUp value={value} format={format} /></div>
        <div className="mt-2 text-[12px]" style={{ color: "#5a6178" }}>{sub}</div>
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium" style={{ color: "#7a8298" }}>{barLabel}</span>
          <span className="text-[12px] font-bold tabular-nums" style={{ color: tint.ring }}>{Math.round(p)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.75)" }}>
          <div className="h-full rounded-full" style={{ width: on ? `${Math.max(p, 3)}%` : "0%", background: tint.ring, transition: "width 1.15s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
      </div>
    </div>
  );
}

// ── Signature: Capital age profile — dual-band area (book cost vs retail) by vintage ──
function AgeProfileCard({ age, totals }: { age: any[]; totals: any }) {
  const on = useMount(140);
  const [hov, setHov] = useState<number | null>(null);
  const data = age || [];
  if (!data.length) return null;
  const W = 760, H = 256, PADX = 26, PADT = 50, PADB = 36;
  const innerW = W - PADX * 2, innerH = H - PADT - PADB;
  const max = Math.max(...data.map((d) => d.mrp), 1);
  const topIdx = data.reduce((mx, d, i, a) => (d.cost > a[mx].cost ? i : mx), 0);
  const X = (i: number) => PADX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const Y = (v: number) => PADT + innerH - (v / max) * innerH;
  const ptsCost = data.map((d, i) => ({ x: X(i), y: Y(d.cost) }));
  const ptsMrp = data.map((d, i) => ({ x: X(i), y: Y(d.mrp) }));
  const baseY = PADT + innerH;
  const lineCost = smoothPath(ptsCost), lineMrp = smoothPath(ptsMrp);
  const areaCost = `${lineCost} L ${X(data.length - 1).toFixed(1)} ${baseY} L ${X(0).toFixed(1)} ${baseY} Z`;
  const areaMrp = `${lineMrp} L ${X(data.length - 1).toFixed(1)} ${baseY} L ${X(0).toFixed(1)} ${baseY} Z`;
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[16px] font-semibold" style={{ color: INK }}>Capital age profile</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>book value still on shelf, by how long it's been held</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "#6b7488" }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: VIOLET }} />Book cost</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "#6b7488" }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: TEAL }} />Retail MRP</span>
        </div>
      </div>
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id="valMrp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={TEAL} stopOpacity="0.18" /><stop offset="100%" stopColor={TEAL} stopOpacity="0" /></linearGradient>
            <linearGradient id="valCost" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={VIOLET} stopOpacity="0.32" /><stop offset="100%" stopColor={VIOLET} stopOpacity="0.02" /></linearGradient>
          </defs>
          {/* retail envelope behind, then book cost in front; teal band above violet = unrealized markup */}
          <path d={areaMrp} fill="url(#valMrp)" style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease 0.35s" }} />
          <path d={areaCost} fill="url(#valCost)" style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease 0.3s" }} />
          <path d={lineMrp} fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
          <path d={lineCost} fill="none" stroke={VIOLET} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1) 0.1s" }} />
          {data.map((d, i) => {
            const active = hov === i;
            return (
              <g key={i}>
                {active && <line x1={ptsCost[i].x} y1={PADT - 6} x2={ptsCost[i].x} y2={baseY} stroke={VIOLET} strokeWidth="1" strokeOpacity="0.3" />}
                <circle cx={ptsMrp[i].x} cy={ptsMrp[i].y} r={active ? 4.5 : 3} fill="#fff" stroke={TEAL} strokeWidth="2.5" style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.6 + i * 0.08}s` }} />
                <circle cx={ptsCost[i].x} cy={ptsCost[i].y} r={active || i === topIdx ? 5.5 : 3.5} fill="#fff" stroke={VIOLET} strokeWidth={active || i === topIdx ? 3 : 2.5} style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.65 + i * 0.08}s` }} />
                <rect x={ptsCost[i].x - innerW / (data.length * 2)} y={0} width={innerW / data.length} height={H} fill="transparent" onMouseEnter={() => setHov(i)} />
                <text x={ptsCost[i].x} y={H - 8} textAnchor="middle" style={{ fontSize: 11, fill: active ? INK : "#9aa1b3", fontWeight: active ? 700 : 500 }}>{d.label}</text>
              </g>
            );
          })}
        </svg>
        {(() => {
          const i = hov ?? topIdx; const d = data[i]; if (!d) return null;
          const rawLeft = (X(i) / W) * 100;
          const leftPct = Math.min(Math.max(rawLeft, 4), 96);
          const tx = rawLeft < 24 ? "4%" : rawLeft > 76 ? "-104%" : "-50%";
          const anchorY = (Y(d.mrp) / H) * 100;
          const below = anchorY < 36; // tall point → drop the card below so it never hits the header
          return (
            <div className="absolute pointer-events-none" style={{ left: `${leftPct}%`, top: `${anchorY}%`, transform: `translate(${tx}, ${below ? "20%" : "-118%"})`, transition: "left 0.18s ease, top 0.18s ease" }}>
              <div className="px-3 py-2 rounded-xl whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(46,42,80,0.4)", border: "1px solid #efeef6" }}>
                <div className="text-[10px] font-semibold mb-0.5" style={{ color: SUBTLE }}>{hov == null ? "most capital · " : ""}{d.label} held</div>
                <div className="text-[12.5px] font-bold tabular-nums leading-tight" style={{ color: VIOLET }}>{inrAbbr(d.cost)} <span className="font-medium" style={{ color: SUBTLE }}>cost</span></div>
                <div className="text-[12.5px] font-bold tabular-nums leading-tight" style={{ color: TEAL }}>{inrAbbr(d.mrp)} <span className="font-medium" style={{ color: SUBTLE }}>retail · {d.skus.toLocaleString("en-IN")} SKUs</span></div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Capital concentration — value by category as a cost+markup stacked bar (no track) ──
function ConcentrationCard({ cats }: { cats: any[] }) {
  const on = useMount(120);
  const sorted = [...cats].sort((a, b) => b.cost - a.cost).slice(0, 10);
  const max = Math.max(...sorted.map((c) => c.mrp), 1);
  return (
    <div className="rounded-[26px] bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[16px] font-semibold" style={{ color: INK }}>Capital concentration</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>where your money sits · book cost + unrealized markup</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "#6b7488" }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: VIOLET }} />Cost</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "#6b7488" }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: AMBER }} />Markup</span>
        </div>
      </div>
      <div className="mt-5 flex-1 flex flex-col justify-between gap-2.5">
        {sorted.map((c, i) => {
          const costW = Math.max((c.cost / max) * 100, 3), mkW = Math.max(((c.mrp - c.cost) / max) * 100, 0);
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[12px] font-medium truncate flex-shrink-0" style={{ width: 132, color: "#525c72" }} title={catName(c.name)}>{catName(c.name)}</span>
              <div className="flex-1 flex items-center min-w-0">
                <div className="flex items-center h-6 rounded-full overflow-hidden flex-shrink-0" style={{ width: on ? `${costW + mkW}%` : "0%", transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms`, boxShadow: `0 5px 14px -8px ${VIOLET}` }}>
                  <div className="h-full flex items-center pl-2.5" style={{ width: `${(costW / (costW + mkW)) * 100}%`, background: `linear-gradient(90deg,${VIOLET}cc,${VIOLET})` }}>
                    {costW > 16 && <span className="text-[11px] font-bold text-white tabular-nums">{inrAbbr(c.cost)}</span>}
                  </div>
                  <div className="h-full flex items-center justify-end pr-2" style={{ width: `${(mkW / (costW + mkW)) * 100}%`, background: `linear-gradient(90deg,${AMBER}cc,${AMBER})` }}>
                    {mkW > 13 && <span className="text-[10.5px] font-bold text-white tabular-nums">+{Math.round(c.markup_pct)}%</span>}
                  </div>
                </div>
                {mkW <= 13 && <span className="text-[11px] font-bold tabular-nums ml-2 flex-shrink-0" style={{ color: AMBER }}>+{Math.round(c.markup_pct)}%</span>}
              </div>
              <span className="text-[11px] tabular-nums flex-shrink-0 w-16 text-right hidden sm:block" style={{ color: "#9aa1b3" }}>{inrAbbr(c.mrp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sidebar: Value structure — cost + markup → retail, one elegant stacked bar ──
function ValueStructureCard({ totals }: { totals: any }) {
  const on = useMount(160);
  const cost = Number(totals.cost ?? 0), mrp = Number(totals.mrp ?? 0), markup = Number(totals.markup ?? 0);
  const costPct = mrp ? (cost / mrp) * 100 : 0, mkPct = mrp ? (markup / mrp) * 100 : 0;
  const rows = [
    { label: "Book cost", val: cost, pct: costPct, c: VIOLET },
    { label: "Unrealized markup", val: markup, pct: mkPct, c: AMBER },
  ];
  return (
    <div className="rounded-[26px] bg-white p-6" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-center gap-2"><TbLayersIntersect size={16} style={{ color: VIOLET }} /><h3 className="text-[15px] font-semibold" style={{ color: INK }}>Value structure</h3></div>
      <p className="text-[12px] mt-0.5" style={{ color: SUBTLE }}>how book cost becomes retail value</p>
      <div className="mt-4 mb-1 flex items-end justify-between">
        <span className="text-[12px]" style={{ color: SUBTLE }}>Retail value</span>
        <span className="text-[22px] font-bold tabular-nums leading-none" style={{ color: TEAL }}>{inrAbbr(mrp)}</span>
      </div>
      <div className="h-3.5 rounded-full overflow-hidden flex mt-2.5" style={{ background: "#f0eff7" }}>
        <div className="h-full" style={{ width: on ? `${costPct}%` : "0%", background: `linear-gradient(90deg,${VIOLET}cc,${VIOLET})`, transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)" }} />
        <div className="h-full" style={{ width: on ? `${mkPct}%` : "0%", background: `linear-gradient(90deg,${AMBER}cc,${AMBER})`, transition: "width 1.1s cubic-bezier(0.22,1,0.36,1) 0.1s" }} />
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-medium" style={{ color: "#4b5468" }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: r.c }} />{r.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: INK }}>{inrAbbr(r.val)}</span>
              <span className="text-[11px] tabular-nums w-9 text-right" style={{ color: SUBTLE }}>{Math.round(r.pct)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar: Markup leaders — biggest retail-over-cost gaps ──
function MarkupLeadersCard({ cats }: { cats: any[] }) {
  const leaders = [...cats].sort((a, b) => b.markup_pct - a.markup_pct).slice(0, 8);
  return (
    <div className="rounded-[26px] bg-white p-6 flex flex-col flex-1" style={{ boxShadow: CARD_SH }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Markup leaders</h3>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${AMBER}1e`, color: "#a9711d" }}>retail vs cost</span>
      </div>
      <p className="text-[12px] mt-0.5 mb-3" style={{ color: SUBTLE }}>biggest unrealized value gaps</p>
      <div className="divide-y divide-gray-50 flex-1 flex flex-col justify-between">
        {leaders.map((c, i) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${AMBER}16`, color: AMBER }}><TbArrowUpRight size={16} /></span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium truncate" style={{ color: "#3c465c" }} title={catName(c.name)}>{catName(c.name)}</div>
                <div className="text-[11px]" style={{ color: SUBTLE }}>+{Math.round(c.markup_pct)}% over cost</div>
              </div>
            </div>
            <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{inrAbbr(c.markup)}</span>
          </div>
        ))}
        {!leaders.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "year", label: "Year" }, { field: "period", label: "Period" }, { field: "material", label: "Material" },
  { field: "material_desc", label: "Description" }, { field: "material_group", label: "Category" },
  { field: "stock_value_cost", label: "Book Value", kind: "inr" as const },
];

export default function ValuationDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/inventory-valuation/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  const t = data?.totals || {};
  const cats: any[] = useMemo(() => (data?.categories || []).map((c: any) => ({ ...c, name: catName(c.name) })), [data]);
  const cost = Number(t.cost ?? 0), mrp = Number(t.mrp ?? 0), markup = Number(t.markup ?? 0), markupPct = Number(t.markup_pct ?? 0);

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      {/* header */}
      <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Inventory valuation</h1>
          <p className="text-[13px] mt-1" style={{ color: SUBTLE }}>what your stock is worth · book cost vs retail · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#5b6478", boxShadow: "0 4px 14px -8px rgba(46,42,80,0.22)" }}>snapshot · 31 May 2026</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col gap-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard tint={TINT_INDIGO} icon={TbCoins} label="Book value" value={cost} format={inrAbbr} sub={`${Number(t.skus ?? 0).toLocaleString("en-IN")} SKUs on shelf · at cost`} pct={mrp ? (cost / mrp) * 100 : 0} barLabel="of retail value" delay={0} />
            <StatCard tint={TINT_TEAL} icon={TbTag} label="Retail value" value={mrp} format={inrAbbr} sub="at MRP / selling basis" pct={100} barLabel="full retail (proxy)" delay={80} />
            <StatCard tint={TINT_AMBER} icon={TbArrowUpRight} label="Unrealized markup" value={markup} format={inrAbbr} sub={`+${markupPct.toFixed(0)}% over book cost`} pct={mrp ? (markup / mrp) * 100 : 0} barLabel="of retail value" delay={160} />
          </div>
          <AgeProfileCard age={data?.age || []} totals={t} />
          <ConcentrationCard cats={cats} />
        </div>
        <div className="xl:col-span-4 flex flex-col gap-5 min-w-0">
          <ValueStructureCard totals={t} />
          <MarkupLeadersCard cats={cats} />
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full"
        style={{ background: "rgba(109,94,240,0.08)", color: VIOLET, border: "1px solid rgba(109,94,240,0.2)" }}>
        ⚠ Proxy — single inventory snapshot; retail value uses MRP (true selling price not in source data).
      </div>

      <div className="rounded-[26px] bg-white overflow-hidden mt-3" style={{ boxShadow: CARD_SH }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>SKU-level valuation detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="inventory-valuation" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
