"use client";
// C9 — Consumption by Department. Rich "cost map" layout matched to the inventory pages:
//   4 mini-dashboard cards (bars · ring · share bar · cumulative spark) · treemap · stream + leaderboard.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbBuildingHospital, TbChartTreemap, TbStack2, TbCoin, TbUsersGroup, TbCrown, TbChartHistogram, TbArrowUpRight, TbArrowDownRight } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const PAGE = "#F2EFF6", INK = "#2c2436", SUB = "#8f88a0";
const PLUM = "#9a6bb0", DEEP = "#7a4c96", MAUVE = "#b58fc4";
const RAMP = ["#6c3f8f", "#8455a3", "#9a6bb0", "#ac82be", "#bf9bcd", "#d3badc"];
const SPECTRUM = "linear-gradient(90deg,#6c3f8f,#8455a3,#9a6bb0,#bf9bcd,#d3badc)";
const SH = "0 18px 42px -26px rgba(70,44,96,0.24), 0 4px 12px -8px rgba(70,44,96,0.07)";
const pctSign = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function squarify(items: { value: number; it: any }[], W: number, H: number) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1, scale = (W * H) / total;
  const out: { x: number; y: number; w: number; h: number; it: any }[] = [];
  let x = 0, y = 0, w = W, h = H;
  const rem = items.map((i) => ({ it: i.it, a: i.value * scale }));
  const wr = (row: any[], len: number) => { const sum = row.reduce((s, r) => s + r.a, 0); const mx = Math.max(...row.map((r) => r.a)); const mn = Math.min(...row.map((r) => r.a)); return Math.max((len * len * mx) / (sum * sum), (sum * sum) / (len * len * mn)); };
  let guard = 0;
  while (rem.length && guard++ < 500) {
    const len = Math.min(w, h) || 1; const row: any[] = [];
    while (rem.length) { const cand = [...row, rem[0]]; if (row.length === 0 || wr(cand, len) <= wr(row, len)) row.push(rem.shift()); else break; }
    const sum = row.reduce((s, r) => s + r.a, 0) || 1;
    if (w >= h) { const cw = sum / h; let cy = y; row.forEach((r) => { const rh = r.a / cw; out.push({ x, y: cy, w: cw, h: rh, it: r.it }); cy += rh; }); x += cw; w -= cw; }
    else { const rh = sum / w; let cx = x; row.forEach((r) => { const rw = r.a / rh; out.push({ x: cx, y, w: rw, h: rh, it: r.it }); cx += rw; }); y += rh; h -= rh; }
  }
  return out;
}

function Shell({ region, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`@keyframes cdIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.cd-card{animation:cdIn .55s cubic-bezier(.22,1,.36,1) both;min-width:0}`}</style>
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Consumption by department</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>which cost-centers drive internal consumption · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#6c6084", boxShadow: "0 4px 14px -8px rgba(70,44,96,0.22)" }}>6-month window</span>
      </div>
      {children}
    </div>
  );
}
function Card({ children, delay = 0 }: any) {
  return <div className="cd-card relative rounded-3xl overflow-hidden bg-white flex flex-col" style={{ minHeight: 176, boxShadow: SH, animationDelay: `${delay}ms` }}>
    <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: SPECTRUM, opacity: 0.9 }} />
    <div className="p-5 flex flex-col flex-1">{children}</div>
  </div>;
}
function Head({ icon: Icon, label, badge, color = PLUM }: any) {
  return <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5 min-w-0"><span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}16`, color }}><Icon size={16} /></span>
      <span className="text-[11.5px] font-semibold uppercase truncate" style={{ color: SUB, letterSpacing: "0.04em" }}>{label}</span></div>
    {badge && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${color}14`, color }}>{badge}</span>}
  </div>;
}
function Chip({ text, color, icon: Icon }: any) {
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${color}15`, color }}>{Icon && <Icon size={12} />}{text}</span>;
}
function MiniBars({ vals }: { vals: number[] }) {
  const on = useMount(80); const max = Math.max(...vals, 1);
  return <div className="flex items-end gap-1.5 h-9">{vals.map((v, i) => <div key={i} className="flex-1 rounded-[3px]" style={{ height: on ? `${Math.max((v / max) * 100, 6)}%` : "0%", background: i === vals.length - 1 ? PLUM : `${PLUM}66`, transition: `height .7s cubic-bezier(.34,1.05,.64,1) ${i * 55}ms` }} />)}</div>;
}
function MiniArea({ vals, w = 150, h = 40 }: any) {
  const on = useMount(90); if (!vals.length) return null;
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const X = (i: number) => (vals.length === 1 ? w / 2 : (i / (vals.length - 1)) * w);
  const Y = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
  const line = smoothPath(vals.map((v: number, i: number) => ({ x: X(i), y: Y(v) })));
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: "visible" }}>
    <defs><linearGradient id="cdA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PLUM} stopOpacity="0.3" /><stop offset="100%" stopColor={PLUM} stopOpacity="0" /></linearGradient></defs>
    <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill="url(#cdA)" style={{ opacity: on ? 1 : 0, transition: "opacity .8s ease .3s" }} />
    <path d={line} fill="none" stroke={PLUM} strokeWidth="2" strokeLinecap="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.1s ease .2s" }} />
  </svg>;
}
function Ring({ pct, size = 78, center }: any) {
  const on = useMount(120); const r = size / 2 - 6, C = 2 * Math.PI * r;
  return <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
    <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece4f3" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PLUM} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct) : C} style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.34,1.15,.64,1)" }} />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><span className="text-[16px] font-bold tabular-nums" style={{ color: INK }}>{center}</span></div>
  </div>;
}

function Treemap({ departments }: { departments: any[] }) {
  const on = useMount(160); const [hov, setHov] = useState<number | null>(null);
  const items = (departments || []).filter((d) => d.value > 0).slice(0, 24).map((d) => ({ value: d.value, it: d }));
  const rects = squarify(items, 100, 100);
  const maxV = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="cd-card rounded-3xl bg-white p-6 flex flex-col" style={{ boxShadow: SH, animationDelay: "260ms" }}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbChartTreemap size={16} style={{ color: PLUM }} />Where consumption concentrates</h3>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${PLUM}12`, color: DEEP }}>top 24 cost-centers</span>
      </div>
      <p className="text-[12px] mb-4" style={{ color: SUB }}>blocks sized by cost · shaded by share · hover for detail</p>
      <div className="relative w-full" style={{ height: 380 }}>
        {rects.map((r, i) => { const d = r.it; const tt = Math.sqrt(d.value / maxV); const col = RAMP[Math.min(RAMP.length - 1, Math.floor((1 - tt) * RAMP.length))]; const active = hov === i; const big = r.w > 20 && r.h > 14; const mid = r.w > 12 && r.h > 9;
          return (
            <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} className="absolute rounded-lg overflow-hidden flex flex-col justify-center px-2"
              style={{ left: `${r.x}%`, top: `${r.y}%`, width: `calc(${r.w}% - 4px)`, height: `calc(${r.h}% - 4px)`, background: col, transform: on ? (active ? "scale(1.015)" : "scale(1)") : "scale(0.8)", opacity: on ? 1 : 0, transition: `all .5s cubic-bezier(.34,1.1,.64,1) ${i * 22}ms`, boxShadow: active ? "0 10px 26px -10px rgba(70,44,96,0.5)" : "none", zIndex: active ? 5 : 1, cursor: "default", outline: active ? "2px solid #fff" : "none", outlineOffset: -2 }}>
              {mid && <div className="text-white font-bold tabular-nums leading-tight truncate" style={{ fontSize: big ? 12.5 : 10 }}>{d.code}</div>}
              {big && <div className="text-white/85 tabular-nums leading-tight truncate" style={{ fontSize: 11 }}>{inrAbbr(d.value)} · {d.share.toFixed(1)}%</div>}
            </div>
          ); })}
        {hov != null && rects[hov] && (
          <div className="absolute pointer-events-none px-3 py-2 rounded-xl" style={{ left: `${Math.min(rects[hov].x + rects[hov].w / 2, 74)}%`, top: 8, transform: "translateX(-50%)", background: "#fff", boxShadow: "0 12px 28px -10px rgba(70,44,96,0.42)", border: "1px solid #efeaf6", zIndex: 20 }}>
            <div className="text-[12px] font-bold tabular-nums" style={{ color: INK }}>{rects[hov].it.code}</div>
            <div className="text-[11px] tabular-nums" style={{ color: PLUM }}>{inrAbbr(rects[hov].it.value)} · {rects[hov].it.share.toFixed(1)}% · {countAbbr(rects[hov].it.qty)} units</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stream({ matrix }: { matrix: any }) {
  const on = useMount(200); const [hov, setHov] = useState<number | null>(null);
  const labels: string[] = matrix?.labels || [];
  const rows: any[] = (matrix?.rows || []).slice(0, 6);
  if (!rows.length || !labels.length) return null;
  const W = 620, H = 320, PADX = 18, PADT = 20, PADB = 34;
  const iW = W - PADX * 2, iH = H - PADT - PADB, n = labels.length;
  const X = (i: number) => PADX + (n === 1 ? iW / 2 : (i / (n - 1)) * iW);
  const totals = labels.map((_, i) => rows.reduce((s, r) => s + (r.values[i] || 0), 0));
  const maxT = Math.max(...totals, 1);
  const Y = (v: number) => PADT + iH - (v / maxT) * iH;
  const cum = rows.map((_, k) => labels.map((_, i) => rows.slice(0, k + 1).reduce((s, r) => s + (r.values[i] || 0), 0)));
  return (
    <div className="cd-card rounded-3xl bg-white p-6 flex flex-col flex-1" style={{ boxShadow: SH, animationDelay: "320ms" }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbStack2 size={16} style={{ color: PLUM }} />Top-6 department flow</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>monthly cost, stacked by cost-center</p></div>
        <div className="flex items-center gap-2 flex-wrap justify-end" style={{ maxWidth: 220 }}>
          {rows.map((r, k) => <span key={k} className="inline-flex items-center gap-1 text-[9.5px] font-medium tabular-nums" style={{ color: "#7a728c" }}><span className="w-2.5 h-2.5 rounded-sm" style={{ background: RAMP[k] }} />{r.name.slice(-4)}</span>)}
        </div>
      </div>
      <div className="relative mt-3 flex-1" style={{ minHeight: 250 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          {[0, 0.5, 1].map((g, i) => <line key={i} x1={PADX} y1={Y(maxT * g)} x2={W - PADX} y2={Y(maxT * g)} stroke="#f3eff8" strokeWidth="1" />)}
          {rows.map((r, k) => { const kk = rows.length - 1 - k; const pts = labels.map((_, i) => ({ x: X(i), y: Y(cum[kk][i]) })); const d = `${smoothPath(pts)} L ${X(n - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`;
            return <path key={kk} d={d} fill={RAMP[kk]} style={{ opacity: on ? 0.94 : 0, transition: `opacity .8s ease ${kk * 90}ms` }} />; })}
          {labels.map((l, i) => { const active = hov === i; return (
            <g key={i} onMouseEnter={() => setHov(i)}>
              {active && <line x1={X(i)} y1={PADT} x2={X(i)} y2={PADT + iH} stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />}
              <rect x={X(i) - iW / (n * 2)} y={0} width={iW / n} height={H} fill="transparent" />
              <text x={X(i)} y={H - 12} textAnchor="middle" style={{ fontSize: 10.5, fill: active ? INK : "#a99cb2", fontWeight: active ? 700 : 500 }}>{l}</text>
            </g>
          ); })}
        </svg>
        {hov != null && (
          <div className="absolute pointer-events-none px-3 py-2 rounded-xl" style={{ left: `${Math.min(Math.max((X(hov) / W) * 100, 14), 80)}%`, top: 0, transform: "translate(-50%,0)", background: "#fff", boxShadow: "0 10px 24px -10px rgba(70,44,96,0.42)", border: "1px solid #efeaf6" }}>
            <div className="text-[11px] font-bold mb-0.5" style={{ color: INK }}>{labels[hov]} · {inrAbbr(totals[hov])}</div>
            {rows.map((r, k) => <div key={k} className="text-[10px] tabular-nums flex items-center gap-1.5" style={{ color: "#6a6280" }}><span className="w-2 h-2 rounded-sm" style={{ background: RAMP[k] }} />{r.name.slice(-4)} · {inrAbbr(r.values[hov] || 0)}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Leaders({ departments }: { departments: any[] }) {
  const on = useMount(240);
  const rows = (departments || []).slice(0, 9);
  const max = Math.max(...rows.map((r: any) => r.value), 1);
  return (
    <div className="cd-card rounded-3xl bg-white p-6 flex flex-col flex-1" style={{ boxShadow: SH, animationDelay: "380ms" }}>
      <h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbCrown size={16} style={{ color: PLUM }} />Top departments</h3>
      <p className="text-[12px] mt-0.5 mb-2" style={{ color: SUB }}>by consumption cost · cost-center code</p>
      <div className="flex-1 flex flex-col justify-between gap-1">
        {rows.map((r: any, i: number) => (
          <div key={i} className="py-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10.5px] font-bold flex-shrink-0 tabular-nums" style={{ background: `${PLUM}18`, color: PLUM }}>{i + 1}</span>
                <span className="text-[12px] font-medium truncate tabular-nums" style={{ color: "#3a3348" }} title={r.code}>{r.code}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0"><span className="text-[10px] tabular-nums" style={{ color: "#a99cb2" }}>{r.share.toFixed(1)}%</span><span className="text-[12px] font-bold tabular-nums" style={{ color: INK }}>{inrAbbr(r.value)}</span></div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden ml-[30px]" style={{ background: "#f0ebf6" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: `linear-gradient(90deg,${MAUVE},${PLUM})`, transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 50}ms` }} />
            </div>
          </div>
        ))}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "department_name", label: "Department (Cost Ctr)" }, { field: "plant", label: "Hospital" }, { field: "month", label: "Month" },
  { field: "consumption_qty", label: "Qty", kind: "num" as const }, { field: "consumption_cost", label: "Cost", kind: "inr" as const },
];

export default function ConsumptionByDeptDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/consumption-by-department/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const departments = data?.departments || [];
  const tl = data?.timeline || [];
  const cVals = tl.map((d: any) => d.cost);
  const momC = cVals.length >= 2 && cVals[cVals.length - 2] ? ((cVals[cVals.length - 1] - cVals[cVals.length - 2]) / cVals[cVals.length - 2]) * 100 : 0;
  const top1 = Number(t.top1 ?? 0), top5 = Number(t.top5 ?? 0), n80 = Number(t.n80 ?? 0), nDept = Number(t.departments ?? 0);
  const cumVals = departments.map((d: any) => d.cum);
  return (
    <Shell region={region}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card delay={0}>
          <Head icon={TbCoin} label="Consumption" badge="6 mo" />
          <div className="mt-3 text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}><CountUp value={Number(t.cost ?? 0)} format={inrAbbr} /></div>
          <div className="mt-1 text-[12px]" style={{ color: SUB }}>internal usage cost</div>
          <div className="mt-auto pt-4"><MiniBars vals={cVals} /><div className="mt-2 flex items-center justify-between"><span className="text-[11px]" style={{ color: "#a99cb2" }}>latest MoM</span><Chip text={pctSign(momC)} color={momC >= 0 ? PLUM : "#5aa97e"} icon={momC >= 0 ? TbArrowUpRight : TbArrowDownRight} /></div></div>
        </Card>
        <Card delay={60}>
          <Head icon={TbUsersGroup} label="Cost-centers" badge="departments" />
          <div className="flex items-center gap-4 mt-3">
            <Ring pct={top5 / 100} center={`${Math.round(top5)}%`} />
            <div className="min-w-0"><div className="text-[26px] font-bold tabular-nums leading-none" style={{ color: INK }}>{countAbbr(nDept)}</div>
              <div className="text-[11.5px] mt-1.5 leading-snug" style={{ color: SUB }}>consuming depts · <b style={{ color: PLUM }}>top-5 = {top5.toFixed(0)}%</b></div></div>
          </div>
        </Card>
        <Card delay={120}>
          <Head icon={TbBuildingHospital} label="Top cost-center" badge="leader" />
          <div className="mt-3 text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}>{top1.toFixed(1)}%</div>
          <div className="mt-1 text-[12px] tabular-nums" style={{ color: SUB }}>{t.top_dept ?? "—"}</div>
          <div className="mt-auto pt-6"><div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#efe7f6" }}><div className="h-full rounded-full" style={{ width: `${Math.min(top1, 100)}%`, background: `linear-gradient(90deg,${MAUVE},${DEEP})` }} /></div><div className="mt-1.5"><Chip text={`${inrAbbr(Number(departments[0]?.value ?? 0))} spend`} color={PLUM} /></div></div>
        </Card>
        <Card delay={180}>
          <Head icon={TbChartHistogram} label="Concentration" badge="Pareto" />
          <div className="mt-3 flex items-baseline gap-1.5"><span className="text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: INK }}>{Math.round(n80)}</span><span className="text-[13px] font-semibold text-gray-400">depts → 80%</span></div>
          <div className="mt-1 text-[12px]" style={{ color: SUB }}>of {countAbbr(nDept)} cost-centers</div>
          <div className="mt-auto pt-4"><MiniArea vals={cumVals} /><div className="mt-1 text-[10.5px]" style={{ color: "#a99cb2" }}>cumulative share · top {cumVals.length}</div></div>
        </Card>
      </div>
      <Treemap departments={departments} />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 flex flex-col min-w-0"><Stream matrix={data?.matrix} /></div>
        <div className="xl:col-span-5 flex flex-col min-w-0"><Leaders departments={departments} /></div>
      </div>
      <div className="cd-card inline-flex items-center gap-2 text-[11px] font-medium px-3.5 py-2 rounded-full" style={{ background: `${PLUM}12`, color: DEEP, border: `1px solid ${PLUM}2c`, animationDelay: "420ms" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLUM }} />
        Department = SAP cost-center code. Human-readable department names are pending from HCG's master data.
      </div>
      <div className="cd-card rounded-3xl bg-white overflow-hidden" style={{ boxShadow: SH, animationDelay: "460ms" }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Department consumption detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="consumption-by-department" plant={region} columns={COLUMNS} />
      </div>
    </Shell>
  );
}
