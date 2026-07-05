"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbArrowUpRight, TbArrowDownRight } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
const MIST = "#EAF1F1";
const INK = "#23383d";
const INFLOW = "#3f9c97", OUTFLOW = "#dd8d6e", NET = "#3a7a78";

const numAbbr = (v: number) => { const a = Math.abs(v); const s = v < 0 ? "-" : ""; if (a >= 1e7) return `${s}${(a / 1e7).toFixed(2)}Cr`; if (a >= 1e5) return `${s}${(a / 1e5).toFixed(2)}L`; if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)}K`; return `${s}${Math.round(a)}`; };
const signed = (v: number) => (v >= 0 ? `+${numAbbr(v)}` : `−${numAbbr(Math.abs(v))}`);
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
const PANEL_SHADOW = "0 12px 34px -22px rgba(35,56,61,0.18), 0 2px 7px -4px rgba(35,56,61,0.06)";
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 120 + delay); return () => clearTimeout(t); }, [delay]); return on; };

function smooth(pts: number[][], t = 0.5) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * t * 2, c1y = p1[1] + ((p2[1] - p0[1]) / 6) * t * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * t * 2, c2y = p2[1] - ((p3[1] - p1[1]) / 6) * t * 2;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
function wavePath(W: number, H: number, amp: number, wl: number, phase: number, yBase: number) {
  let d = `M 0 ${yBase.toFixed(1)}`;
  for (let x = 0; x <= W; x += 10) d += ` L ${x} ${(yBase + amp * Math.sin(x / wl + phase)).toFixed(1)}`;
  return `${d} L ${W} ${H} L 0 ${H} Z`;
}

// ── IMMERSIVE FLOW HERO — full-bleed ocean gradient, glowing trajectory, white type ──
function ImmersiveHero({ months, net, inflow, outflow, skus }: { months: any[]; net: number; inflow: number; outflow: number; skus: number }) {
  const on = useMount(0);
  const [hov, setHov] = useState<number | null>(null);
  let cum = 0; const traj = months.map((m) => ({ ...m, level: (cum += m.net) }));
  const W = 1100, H = 300;
  const cx0 = 430, cxPadR = 56, cTop = 70, cBot = 196; // chart plot box
  const mx = Math.max(...traj.map((d) => d.level), 1), mn = Math.min(...traj.map((d) => d.level), 0);
  const rng = mx - mn || 1, n = traj.length || 1;
  const X = (i: number) => cx0 + (n <= 1 ? 0 : (i / (n - 1)) * (W - cx0 - cxPadR));
  const Y = (v: number) => cTop + (1 - (v - mn) / rng) * (cBot - cTop);
  const pts = traj.map((d, i) => [X(i), Y(on ? d.level : mn)]);
  const line = smooth(pts), area = `${line} L ${X(n - 1)},${cBot} L ${X(0)},${cBot} Z`;
  const hd = hov != null ? traj[hov] : null;
  return (
    <div className="relative rounded-[28px] overflow-hidden" style={{ minHeight: 300, background: "linear-gradient(125deg,#173b4d 0%,#22585e 52%,#357b74 100%)", boxShadow: "0 24px 60px -28px rgba(20,50,55,0.65)" }}>
      {/* decorative waves */}
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <path d={wavePath(W, H, 16, 150, 0.4, 232)} fill="#ffffff" opacity="0.05" />
        <path d={wavePath(W, H, 12, 120, 2.1, 258)} fill="#ffffff" opacity="0.06" />
        <path d={wavePath(W, H, 9, 95, 4.0, 278)} fill="#7fe3d3" opacity="0.07" />
      </svg>
      <div className="absolute rounded-full blur-3xl" style={{ width: 260, height: 260, background: "#3fcfb9", opacity: 0.18, top: -90, right: 120 }} />
      {/* content */}
      <div className="relative flex flex-col lg:flex-row h-full" style={{ minHeight: 300 }}>
        <div className="p-7 lg:p-9 lg:w-[400px] flex-shrink-0 flex flex-col justify-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}>Stock level · net change</div>
          <div className="mt-3 text-[56px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.25)" }}>{net >= 0 ? "+" : "−"}<CountUp value={Math.abs(net)} format={numAbbr} /></div>
          <div className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.62)" }}>net units added over the period · {skus.toLocaleString("en-IN")} SKUs</div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full" style={{ background: "rgba(95,210,194,0.16)", border: "1px solid rgba(95,210,194,0.3)", boxShadow: "0 0 22px -6px rgba(95,210,194,0.5)" }}>
              <TbArrowUpRight size={15} style={{ color: "#8fe9da" }} /><span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>Received</span><span className="text-[13px] font-bold tabular-nums" style={{ color: "#aef0e4" }}>{numAbbr(inflow)}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full" style={{ background: "rgba(240,160,127,0.16)", border: "1px solid rgba(240,160,127,0.3)", boxShadow: "0 0 22px -6px rgba(240,160,127,0.5)" }}>
              <TbArrowDownRight size={15} style={{ color: "#f3b196" }} /><span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>Consumed</span><span className="text-[13px] font-bold tabular-nums" style={{ color: "#f6c3ac" }}>{numAbbr(outflow)}</span>
            </div>
          </div>
        </div>
        {/* glowing trajectory */}
        <div className="flex-1 relative min-h-[200px]">
          <div className="absolute top-6 right-8 text-[11px] font-medium" style={{ color: hd ? "#fff" : "rgba(255,255,255,0.5)" }}>{hd ? `${hd.label} · ${numAbbr(hd.level)} on hand` : "cumulative stock on hand — rising = building up"}</div>
          {traj.length ? (
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none" onMouseLeave={() => setHov(null)} style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#aef0e4" stopOpacity="0.32" /><stop offset="100%" stopColor="#aef0e4" stopOpacity="0" /></linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {[cTop, (cTop + cBot) / 2, cBot].map((gy) => <line key={gy} x1={cx0} y1={gy} x2={W - cxPadR} y2={gy} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />)}
              <path d={area} fill="url(#heroArea)" style={{ opacity: on ? 1 : 0, transition: "opacity 1.1s ease 0.3s" }} />
              <path d={line} fill="none" stroke="#bff3e8" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter="url(#glow)" style={{ transition: "all 1.2s cubic-bezier(0.34,1.1,0.64,1)" }} />
              {traj.map((d, i) => (
                <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: "pointer" }}>
                  <rect x={X(i) - (W - cx0) / n / 2} y={cTop - 20} width={(W - cx0) / n} height={cBot - cTop + 40} fill="transparent" />
                  <circle cx={X(i)} cy={Y(on ? d.level : mn)} r={hov === i ? 6 : 3} fill="#fff" stroke="#bff3e8" strokeWidth="2" filter={hov === i ? "url(#glow)" : undefined} style={{ transition: "all 1.2s cubic-bezier(0.34,1.1,0.64,1)" }} />
                  {(i % 2 === 0 || i === n - 1) && <text x={X(i)} y={cBot + 22} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill={hov === i ? "#fff" : "rgba(255,255,255,0.45)"} fontFamily={FONT} fontWeight={hov === i ? 700 : 500}>{d.label}</text>}
                </g>
              ))}
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Monthly flow chart — inflow up / outflow down + net line ──
function FlowChart({ months, region }: { months: any[]; region: string }) {
  const on = useMount(160);
  const [hov, setHov] = useState<number | null>(null);
  const W = 920, H = 320, padX = 20, padTop = 26, padBot = 32;
  const zeroY = padTop + (H - padTop - padBot) * 0.56;
  const maxIn = Math.max(...months.map((m) => m.inflow), 1), maxOut = Math.max(...months.map((m) => m.outflow), 1);
  const upH = zeroY - padTop, dnH = H - padBot - zeroY, bw = months.length ? (W - 2 * padX) / months.length : 0;
  const netMax = Math.max(...months.map((m) => Math.abs(m.net)), 1);
  const nx = (i: number) => padX + bw * i + bw / 2, ny = (v: number) => zeroY - (v / netMax) * (upH * 0.8);
  const netLine = smooth(months.map((m, i) => [nx(i), ny(on ? m.net : 0)]));
  const hd = hov != null ? months[hov] : null;
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "180ms", boxShadow: PANEL_SHADOW }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Monthly flow — received vs consumed</h3>
          <p className="text-xs text-gray-400 mt-0.5">inflow (up) · outflow (down) · net line · {region}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: INFLOW }} />Inflow</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: OUTFLOW }} />Outflow</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-[2px]" style={{ background: NET }} />Net</span>
        </div>
      </div>
      <div className="mt-2 text-[11px] font-medium min-h-[18px]" style={{ color: hd ? INK : "#9aa1ae" }}>
        {hd ? <span>{hd.label} · in <b style={{ color: INFLOW }}>{numAbbr(hd.inflow)}</b> · out <b style={{ color: OUTFLOW }}>{numAbbr(hd.outflow)}</b> · net <b style={{ color: hd.net >= 0 ? INFLOW : OUTFLOW }}>{signed(hd.net)}</b></span> : <span>each bar pair shows what came in vs what went out that month</span>}
      </div>
      {months.length ? (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 6 }} onMouseLeave={() => setHov(null)}>
          <line x1={padX} y1={zeroY} x2={W - padX} y2={zeroY} stroke="#dfe4ea" strokeWidth="1.5" />
          {months.map((m, i) => {
            const x = padX + bw * i, inH = (m.inflow / maxIn) * upH * 0.92, outHh = (m.outflow / maxOut) * dnH * 0.92, active = hov === i;
            return (
              <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: "pointer" }}>
                <rect x={x + bw * 0.2} y={on ? zeroY - inH : zeroY} width={bw * 0.6} height={on ? inH : 0} rx="3" fill={INFLOW} opacity={active ? 1 : 0.82} style={{ transition: `all 0.8s cubic-bezier(0.34,1.1,0.64,1) ${i * 35}ms` }} />
                <rect x={x + bw * 0.2} y={zeroY} width={bw * 0.6} height={on ? outHh : 0} rx="3" fill={OUTFLOW} opacity={active ? 1 : 0.82} style={{ transition: `all 0.8s cubic-bezier(0.34,1.1,0.64,1) ${i * 35}ms` }} />
                <text x={x + bw / 2} y={H - padBot + 18} textAnchor="middle" fontSize="10.5" fill={active ? INK : "#9aa1ae"} fontFamily={FONT} fontWeight={active ? 700 : 500}>{m.label}</text>
              </g>
            );
          })}
          <path d={netLine} fill="none" stroke={NET} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ transition: "all 1s cubic-bezier(0.34,1.1,0.64,1)", filter: "drop-shadow(0 2px 4px rgba(58,122,120,0.3))" }} />
          {months.map((m, i) => <circle key={i} cx={nx(i)} cy={ny(on ? m.net : 0)} r={hov === i ? 5 : 3} fill="#fff" stroke={NET} strokeWidth="2" style={{ transition: "all 0.8s cubic-bezier(0.34,1.1,0.64,1)" }} />)}
        </svg>
      ) : <div className="py-20 text-center text-gray-400 text-sm">No data.</div>}
    </div>
  );
}

function Movers({ rows, kind, region }: { rows: any[]; kind: "up" | "down"; region: string }) {
  const on = useMount(160); const color = kind === "up" ? INFLOW : OUTFLOW; const max = Math.max(...rows.map((r) => Math.abs(r.net)), 1);
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: kind === "up" ? "260ms" : "320ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">{kind === "up" ? <TbArrowUpRight size={16} style={{ color }} /> : <TbArrowDownRight size={16} style={{ color }} />}{kind === "up" ? "Built up most" : "Drawn down most"}</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-3">net {kind === "up" ? "increase" : "decrease"} over the period · {region}</p>
      <div className="space-y-2.5 flex-1">
        {rows.slice(0, 7).map((r, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1"><span className="text-[12px] font-medium text-gray-700 truncate pr-2" title={r.name}>{r.name}</span><span className="text-[11px] font-semibold tabular-nums flex-shrink-0" style={{ color }}>{signed(r.net)}</span></div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#eaf1f1" }}><div className="h-full rounded-full" style={{ width: on ? `${(Math.abs(r.net) / max) * 100}%` : "0%", background: color, transition: `width 0.9s ease ${i * 50}ms` }} /></div>
          </div>
        ))}
        {!rows.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "month", label: "Month" }, { field: "plant", label: "Hospital" }, { field: "material", label: "Material" },
  { field: "material_desc", label: "Description" }, { field: "inflow", label: "Inflow", kind: "num" as const },
  { field: "outflow", label: "Outflow", kind: "num" as const }, { field: "stock_change", label: "Net Change", kind: "num" as const },
];

export default function StockChangeDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/stock-change/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  const t = data?.totals || {};
  const months: any[] = data?.monthly || [];

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-4 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Stock Level Change Over Time" />

      <div className="csv-cards"><div className="csv-card" style={{ animationDelay: "0ms" }}>
        <ImmersiveHero months={months} net={Number(t.net ?? 0)} inflow={Number(t.inflow ?? 0)} outflow={Number(t.outflow ?? 0)} skus={Number(t.skus ?? 0)} />
      </div></div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .csv-card { min-width: 0; }
      `}</style>

      <FlowChart months={months} region={region} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Movers rows={data?.risers || []} kind="up" region={region} />
        <Movers rows={data?.fallers || []} kind="down" region={region} />
      </div>

      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "420ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">Monthly movement detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="stock-change" plant={region} columns={COLUMNS} />
      </div>
    </div>
  );
}
