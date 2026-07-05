"use client";
// C8 — Units Consumed per SKU. Rich "usage analytics" layout matched to the inventory pages:
//   4 mini-dashboard cards (bars · area · marker track · ring) · units/cost heatmap · scatter + leaderboard.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, catName, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbPill, TbCoin, TbCurrencyRupee, TbBoxMultiple, TbLayoutGrid, TbChartDots, TbArrowUpRight, TbArrowDownRight, TbFlame, TbTrophy } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const PAGE = "#F7F0F0", INK = "#33262b", SUB = "#9a8a90";
const ROSE = "#cf5d84", DEEP = "#a8446a", PEACH = "#efab90", CORAL = "#e2788a", GREY = "#c9bcc2";
const RGB = [207, 93, 132];
const SPECTRUM = "linear-gradient(90deg,#f2b98f,#efab90,#e2788a,#cf5d84,#a8446a)";
const SH = "0 18px 42px -26px rgba(90,40,55,0.24), 0 4px 12px -8px rgba(90,40,55,0.07)";
const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const rupee = (n: number) => (n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(1)}K` : `₹${n.toFixed(0)}`);
const pctSign = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function Shell({ region, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`@keyframes ucIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.uc-card{animation:ucIn .55s cubic-bezier(.22,1,.36,1) both;min-width:0}`}</style>
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Units consumed per SKU</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>what the hospitals actually issue & use, by material · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#7a5f68", boxShadow: "0 4px 14px -8px rgba(90,40,55,0.22)" }}>6-month window</span>
      </div>
      {children}
    </div>
  );
}
function Card({ children, delay = 0 }: any) {
  return <div className="uc-card relative rounded-3xl overflow-hidden bg-white flex flex-col" style={{ minHeight: 176, boxShadow: SH, animationDelay: `${delay}ms` }}>
    <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: SPECTRUM, opacity: 0.9 }} />
    <div className="p-5 flex flex-col flex-1">{children}</div>
  </div>;
}
function Head({ icon: Icon, label, badge, color = ROSE }: any) {
  return <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5 min-w-0"><span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}16`, color }}><Icon size={16} /></span>
      <span className="text-[11.5px] font-semibold uppercase truncate" style={{ color: SUB, letterSpacing: "0.04em" }}>{label}</span></div>
    {badge && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${color}14`, color }}>{badge}</span>}
  </div>;
}
function Chip({ text, color, icon: Icon }: any) {
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${color}15`, color }}>{Icon && <Icon size={12} />}{text}</span>;
}
function MiniBars({ vals, color = ROSE }: { vals: number[]; color?: string }) {
  const on = useMount(80); const max = Math.max(...vals, 1);
  return <div className="flex items-end gap-1.5 h-9">{vals.map((v, i) => <div key={i} className="flex-1 rounded-[3px]" style={{ height: on ? `${Math.max((v / max) * 100, 6)}%` : "0%", background: i === vals.length - 1 ? color : `${color}66`, transition: `height .7s cubic-bezier(.34,1.05,.64,1) ${i * 55}ms` }} />)}</div>;
}
function MiniArea({ vals, color = ROSE, w = 150, h = 38 }: any) {
  const on = useMount(90); if (!vals.length) return null;
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const X = (i: number) => (vals.length === 1 ? w / 2 : (i / (vals.length - 1)) * w);
  const Y = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
  const line = smoothPath(vals.map((v: number, i: number) => ({ x: X(i), y: Y(v) })));
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: "visible" }}>
    <defs><linearGradient id="ucA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill="url(#ucA)" style={{ opacity: on ? 1 : 0, transition: "opacity .8s ease .3s" }} />
    <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.1s ease .2s" }} />
  </svg>;
}
function Ring({ pct, size = 78, color = ROSE, center }: any) {
  const on = useMount(120); const r = size / 2 - 6, C = 2 * Math.PI * r;
  return <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
    <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3e7ec" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct) : C} style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.34,1.15,.64,1)" }} />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><span className="text-[16px] font-bold tabular-nums" style={{ color: INK }}>{center}</span></div>
  </div>;
}

// ── heatmap (units/cost toggle) ──
function Heatmap({ matrix }: { matrix: any }) {
  const [metric, setMetric] = useState<"units" | "cost">("units");
  const [hov, setHov] = useState<{ r: number; c: number } | null>(null);
  const labels: string[] = matrix?.labels || [];
  const rows: any[] = matrix?.rows || [];
  const cells = (r: any) => (metric === "units" ? r.values : r.cost || []);
  const rowTot = (r: any) => (metric === "units" ? r.total : r.cost_total || 0);
  const fmt = (v: number) => (metric === "units" ? countAbbr(v) : inrAbbr(v));
  const maxTotal = Math.max(...rows.map((r) => rowTot(r)), 1);
  const rgba = (a: number) => `rgba(${RGB[0]},${RGB[1]},${RGB[2]},${a})`;
  const hd = hov && rows[hov.r] ? { cat: catName(rows[hov.r].name), mon: labels[hov.c], val: cells(rows[hov.r])[hov.c], tot: rowTot(rows[hov.r]) } : null;
  const gcols = `150px repeat(${labels.length},1fr) 96px`;
  return (
    <div className="uc-card rounded-3xl bg-white p-6" style={{ boxShadow: SH, animationDelay: "220ms" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbLayoutGrid size={16} style={{ color: ROSE }} />Where usage lands</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>top categories × month · hover a cell</p></div>
        <div className="flex items-center gap-0.5 p-1 rounded-full" style={{ background: "#f2e7ec" }}>
          {(["units", "cost"] as const).map((m) => <button key={m} onClick={() => setMetric(m)} className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all capitalize"
            style={metric === m ? { background: "#fff", color: DEEP, boxShadow: "0 2px 6px rgba(160,68,106,0.2)" } : { background: "transparent", color: "#b08d99" }}>{m}</button>)}
        </div>
      </div>
      {rows.length ? (
        <div className="mt-4 overflow-x-auto"><div style={{ minWidth: 560 }}>
          <div className="grid items-center gap-1.5 mb-1.5" style={{ gridTemplateColumns: gcols }}>
            <span />{labels.map((l) => <span key={l} className="text-[10.5px] font-semibold text-center" style={{ color: "#9a8a90" }}>{l}</span>)}
            <span className="text-[10.5px] font-semibold text-right pr-1" style={{ color: "#b7a7ae" }}>Total</span>
          </div>
          {rows.map((r, ri) => { const cv = cells(r); const rowMax = Math.max(...cv, 1); return (
            <div key={ri} className="grid items-center gap-1.5 mb-1.5" style={{ gridTemplateColumns: gcols }} onMouseLeave={() => setHov((h) => (h && h.r === ri ? null : h))}>
              <span className="text-[11.5px] font-medium truncate pr-1" title={catName(r.name)} style={{ color: r.uncat ? "#b7a7ae" : hov?.r === ri ? INK : "#5c4c54" }}>{catName(r.name)}</span>
              {cv.map((v: number, ci: number) => { const t = Math.sqrt(v / rowMax); const active = hov?.r === ri && hov?.c === ci; return (
                <div key={ci} onMouseEnter={() => setHov({ r: ri, c: ci })} className="h-9 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: r.uncat ? `rgba(180,168,175,${0.1 + 0.5 * t})` : rgba(0.1 + 0.85 * t), transform: active ? "scale(1.08)" : "scale(1)", boxShadow: active ? "0 6px 16px -6px rgba(90,40,55,0.4)" : "none", outline: active ? `2px solid ${DEEP}` : "none", zIndex: active ? 5 : 1 }}>
                  {t > 0.5 && <span className="text-[9px] font-bold tabular-nums" style={{ color: t > 0.62 ? "#fff" : "#7a5a63" }}>{fmt(v)}</span>}
                </div>
              ); })}
              <div className="flex items-center gap-1.5 justify-end pr-1">
                <div className="h-2 rounded-full flex-shrink-0" style={{ width: `${Math.max(5, (rowTot(r) / maxTotal) * 26)}px`, background: r.uncat ? GREY : ROSE }} />
                <span className="text-[10px] font-semibold tabular-nums whitespace-nowrap" style={{ color: "#8a7a82" }}>{fmt(rowTot(r))}</span>
              </div>
            </div>
          ); })}
        </div></div>
      ) : <div className="py-16 text-center text-gray-400 text-sm">No data.</div>}
      <div className="mt-2 text-[11px] font-medium" style={{ color: hd ? INK : "#b7a7ae" }}>
        {hd ? <span>{hd.cat} · <b style={{ color: ROSE }}>{hd.mon}</b> — {fmt(hd.val)} ({hd.tot ? Math.round((hd.val / hd.tot) * 100) : 0}% of category)</span>
          : <span className="inline-flex items-center gap-1.5">low <span className="w-14 h-2 rounded-full inline-block" style={{ background: `linear-gradient(90deg,${rgba(0.12)},${ROSE})` }} /> high</span>}
      </div>
    </div>
  );
}

// ── scatter: volume vs unit price ──
function Scatter({ skus }: { skus: any[] }) {
  const on = useMount(160); const [hi, setHi] = useState<number | null>(null);
  const data = (skus || []).filter((s) => s.units > 0 && s.cpu > 0);
  const W = 720, H = 400, padL = 58, padR = 22, padT = 22, padB = 46;
  const model = useMemo(() => {
    if (!data.length) return null;
    const lu = data.map((s) => Math.log10(Math.max(s.units, 1))), lc = data.map((s) => Math.log10(Math.max(s.cpu, 1)));
    const uMin = Math.min(...lu), uMax = Math.max(...lu), cMin = Math.min(...lc), cMax = Math.max(...lc);
    const maxCost = Math.max(...data.map((s) => s.cost), 1);
    const xP = (u: number) => padL + (uMax === uMin ? 0.5 : (Math.log10(Math.max(u, 1)) - uMin) / (uMax - uMin)) * (W - padL - padR);
    const yP = (c: number) => padT + (cMax === cMin ? 0.5 : 1 - (Math.log10(Math.max(c, 1)) - cMin) / (cMax - cMin)) * (H - padT - padB);
    const pts = data.map((s) => ({ ...s, x: xP(s.units), y: yP(s.cpu), r: 5 + Math.sqrt(s.cost / maxCost) * 22 }));
    const xt = [uMin, (uMin + uMax) / 2, uMax].map((l) => ({ x: xP(Math.pow(10, l)), label: countAbbr(Math.pow(10, l)) }));
    const yt = [cMin, (cMin + cMax) / 2, cMax].map((l) => ({ y: yP(Math.pow(10, l)), label: rupee(Math.pow(10, l)) }));
    return { pts, xt, yt, xMid: xP(Math.pow(10, (uMin + uMax) / 2)), yMid: yP(Math.pow(10, (cMin + cMax) / 2)) };
  }, [skus]);
  if (!model) return null;
  const hp = hi != null ? model.pts[hi] : null;
  return (
    <div className="uc-card rounded-3xl bg-white p-6 flex flex-col flex-1" style={{ boxShadow: SH, animationDelay: "300ms" }}>
      <div><h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbChartDots size={16} style={{ color: ROSE }} />Volume vs unit price</h3>
        <p className="text-[12px] mt-0.5" style={{ color: SUB }}>each SKU · units vs cost/unit · bubble = total cost</p></div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 8 }} onMouseLeave={() => setHi(null)}>
        <rect x={model.xMid} y={padT} width={W - padR - model.xMid} height={model.yMid - padT} fill={ROSE} opacity="0.05" />
        <text x={W - padR - 6} y={padT + 14} textAnchor="end" style={{ fontSize: 10, fontWeight: 700, fill: DEEP, opacity: 0.6 }}>high volume · pricey</text>
        {model.yt.map((t, i) => <g key={i}><line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#f4eef0" strokeWidth="1" /><text x={padL - 8} y={t.y + 3.5} textAnchor="end" style={{ fontSize: 10, fill: "#b7a7ae" }}>{t.label}</text></g>)}
        {model.xt.map((t, i) => <text key={i} x={t.x} y={H - padB + 18} textAnchor="middle" style={{ fontSize: 10, fill: "#b7a7ae" }}>{t.label}</text>)}
        <line x1={model.xMid} y1={padT} x2={model.xMid} y2={H - padB} stroke="#ecdfe4" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x={(padL + W - padR) / 2} y={H - 8} textAnchor="middle" style={{ fontSize: 11, fill: SUB, fontWeight: 600 }}>units consumed · log →</text>
        <text x={padL - 8} y={padT - 9} textAnchor="start" style={{ fontSize: 11, fill: SUB, fontWeight: 600 }}>↑ cost / unit</text>
        {model.pts.map((p, i) => { const active = hi === i; const dim = hi != null && !active; return (
          <circle key={i} cx={p.x} cy={on ? p.y : H - padB} r={active ? p.r + 2 : p.r} fill={ROSE} fillOpacity={active ? 0.9 : dim ? 0.16 : 0.4} stroke={active ? DEEP : "#fff"} strokeWidth={active ? 2 : 1}
            style={{ transition: `cy .9s cubic-bezier(.34,1.12,.64,1) ${(i % 15) * 12}ms, r .15s, fill-opacity .15s`, cursor: "pointer" }} onMouseEnter={() => setHi(i)} />
        ); })}
        {hp && (() => { let tx = hp.x + 14, ty = hp.y - 46; if (tx + 224 > W) tx = hp.x - 238; if (ty < padT) ty = hp.y + 14; return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={tx} y={ty} width={224} height={40} rx="9" fill="#fff" stroke="#f2e9ee" style={{ filter: "drop-shadow(0 8px 18px rgba(90,40,55,0.28))" }} />
            <text x={tx + 12} y={ty + 16} style={{ fontSize: 11.5, fontWeight: 700, fill: INK }}>{nm(hp.desc, 28)}</text>
            <text x={tx + 12} y={ty + 31} style={{ fontSize: 10.5, fill: DEEP }} className="tabular-nums">{countAbbr(hp.units)} units · {rupee(hp.cpu)}/unit · {inrAbbr(hp.cost)}</text>
          </g>); })()}
      </svg>
    </div>
  );
}

// ── leaderboard: most consumed / priciest ──
function Leaderboard({ skus, scatter }: { skus: any[]; scatter: any[] }) {
  const on = useMount(200); const [mode, setMode] = useState<"consumed" | "priciest">("consumed");
  const rows = useMemo(() => mode === "consumed" ? (skus || []).slice(0, 9)
    : [...(scatter || [])].filter((s) => s.units >= 20).sort((a, b) => b.cpu - a.cpu).slice(0, 9), [skus, scatter, mode]);
  const key = mode === "consumed" ? "units" : "cpu";
  const max = Math.max(...rows.map((r: any) => r[key]), 1);
  return (
    <div className="uc-card rounded-3xl bg-white p-6 flex flex-col flex-1" style={{ boxShadow: SH, animationDelay: "360ms" }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}>{mode === "consumed" ? <TbTrophy size={16} style={{ color: ROSE }} /> : <TbFlame size={16} style={{ color: DEEP }} />}{mode === "consumed" ? "Most consumed" : "Priciest per unit"}</h3>
        <div className="flex items-center gap-0.5 p-1 rounded-full" style={{ background: "#f2e7ec" }}>
          {([["consumed", "Volume"], ["priciest", "Price"]] as const).map(([m, l]) => <button key={m} onClick={() => setMode(m)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all"
            style={mode === m ? { background: "#fff", color: DEEP, boxShadow: "0 2px 6px rgba(160,68,106,0.2)" } : { background: "transparent", color: "#b08d99" }}>{l}</button>)}
        </div>
      </div>
      <p className="text-[12px] mb-2" style={{ color: SUB }}>{mode === "consumed" ? "by units issued" : "highest cost per unit (≥20 units)"}</p>
      <div className="flex-1 flex flex-col justify-between gap-1">
        {rows.map((r: any, i: number) => (
          <div key={i} className="py-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10.5px] font-bold flex-shrink-0 tabular-nums" style={{ background: `${ROSE}18`, color: ROSE }}>{i + 1}</span>
                <span className="text-[12px] font-medium truncate" style={{ color: "#3c2f36" }} title={r.desc}>{nm(r.desc, 26)}</span>
              </div>
              <span className="text-[12px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{mode === "consumed" ? countAbbr(r.units) : rupee(r.cpu)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden ml-[30px]" style={{ background: "#f4eef0" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r[key] / max) * 100}%` : "0%", background: `linear-gradient(90deg,${PEACH},${ROSE})`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 50}ms` }} />
            </div>
          </div>
        ))}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "month", label: "Month" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "material_group", label: "Group" }, { field: "total_units", label: "Units", kind: "num" as const }, { field: "consumption_cost", label: "Cost", kind: "inr" as const },
];

export default function UnitsConsumedDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/unit-sold-per-sku/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const tl = data?.timeline || [];
  const uVals = tl.map((d: any) => d.units), cVals = tl.map((d: any) => d.cost);
  const momU = uVals.length >= 2 && uVals[uVals.length - 2] ? ((uVals[uVals.length - 1] - uVals[uVals.length - 2]) / uVals[uVals.length - 2]) * 100 : 0;
  const scatter = data?.scatter || [], skus = data?.skus || [];
  const units = Number(t.units ?? 0), cost = Number(t.cost ?? 0), cpu = Number(t.cpu ?? 0), mats = Number(t.materials ?? 0);
  const cpus = scatter.filter((s: any) => s.cpu > 0).map((s: any) => Math.log10(s.cpu));
  const cMin = cpus.length ? Math.min(...cpus) : 0, cMax = cpus.length ? Math.max(...cpus) : 1;
  const cpuPos = cpu > 0 && cMax > cMin ? Math.max(0, Math.min(1, (Math.log10(cpu) - cMin) / (cMax - cMin))) : 0.5;
  const top10Units = skus.slice(0, 10).reduce((s: number, r: any) => s + r.units, 0);
  const top10Share = units ? top10Units / units : 0;
  const avgMo = cVals.length ? cost / cVals.length : 0;
  return (
    <Shell region={region}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card delay={0}>
          <Head icon={TbPill} label="Units consumed" badge="6 mo" />
          <div className="mt-3 text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={units} format={countAbbr} /></div>
          <div className="mt-1 text-[12px]" style={{ color: SUB }}>units issued</div>
          <div className="mt-auto pt-4"><MiniBars vals={uVals} /><div className="mt-2 flex items-center justify-between"><span className="text-[11px]" style={{ color: "#b7a7ae" }}>latest MoM</span><Chip text={pctSign(momU)} color={momU >= 0 ? "#5aa97e" : ROSE} icon={momU >= 0 ? TbArrowUpRight : TbArrowDownRight} /></div></div>
        </Card>
        <Card delay={60}>
          <Head icon={TbCoin} label="Consumption cost" badge="6 mo" />
          <div className="mt-3 text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={cost} format={inrAbbr} /></div>
          <div className="mt-1 text-[12px]" style={{ color: SUB }}>internal usage cost</div>
          <div className="mt-auto pt-4"><MiniArea vals={cVals} /><div className="mt-1.5 flex items-center justify-between"><span className="text-[11px]" style={{ color: "#b7a7ae" }}>avg / month</span><Chip text={inrAbbr(avgMo)} color={CORAL} /></div></div>
        </Card>
        <Card delay={120}>
          <Head icon={TbCurrencyRupee} label="Cost / unit" badge="weighted" />
          <div className="mt-3 text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}>{rupee(cpu)}</div>
          <div className="mt-1 text-[12px]" style={{ color: SUB }}>network average</div>
          <div className="mt-auto pt-6">
            <div className="relative h-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#f6d9c0,#efab90,#cf5d84,#8a3358)" }}>
              <div className="absolute -top-1 w-4 h-4 rounded-full bg-white" style={{ left: `${cpuPos * 100}%`, transform: "translateX(-50%)", boxShadow: "0 2px 8px rgba(90,40,55,0.35)", border: `2.5px solid ${DEEP}` }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] font-medium" style={{ color: "#b7a7ae" }}><span>cheap</span><span>pricey</span></div>
          </div>
        </Card>
        <Card delay={180}>
          <Head icon={TbBoxMultiple} label="SKU spread" badge={`${countAbbr(mats)} SKUs`} />
          <div className="flex items-center gap-4 mt-3">
            <Ring pct={top10Share} center={`${Math.round(top10Share * 100)}%`} />
            <div className="min-w-0"><div className="text-[13px] font-semibold leading-tight" style={{ color: INK }}>Top-10 SKUs</div>
              <div className="text-[11.5px] mt-1 leading-snug" style={{ color: SUB }}>drive <b style={{ color: ROSE }}>{Math.round(top10Share * 100)}%</b> of all units across {countAbbr(mats)} materials</div></div>
          </div>
        </Card>
      </div>
      <Heatmap matrix={data?.matrix} />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 flex flex-col min-w-0"><Scatter skus={scatter} /></div>
        <div className="xl:col-span-5 flex flex-col min-w-0"><Leaderboard skus={skus} scatter={scatter} /></div>
      </div>
      <div className="uc-card rounded-3xl bg-white overflow-hidden" style={{ boxShadow: SH, animationDelay: "420ms" }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Material consumption detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="unit-sold-per-sku" plant={region} columns={COLUMNS} />
      </div>
    </Shell>
  );
}
