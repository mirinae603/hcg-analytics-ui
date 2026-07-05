"use client";
// "Expected Usage" demand forecast — editorial dashboard language borrowed from
// halo-lab Twisty (lollipop chart + dark pill tooltip, cream raised panels),
// ChartMogul (pastel labelled category blocks + delta stat rows) and Navexa
// (thin restrained micro-viz). Neutral canvas, near-black ink, ONE warm accent,
// lots of whitespace. Real HCG forecast data underneath.
import React, { useEffect, useState, useId } from "react";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { countAbbr, useMount, CountUp } from "@/components/portfolio/kit";
import { TbBox, TbSearch, TbArrowUpRight, TbArrowDownRight, TbChevronRight, TbChevronDown, TbCalendarEvent, TbFileText, TbDroplet, TbVaccine, TbClipboardList } from "react-icons/tb";

const BG = "#e8eaee", CARD = "#ffffff", CREAM = "#f4f3ef", INK = "#1b1c22", INK2 = "#41444f", MUT = "#8a8f9d", FAINT = "#c4c8d2", LINE = "#ecedf1", BORDER = "#e7e8ee";
const STEEL = "#96a3bd", ACCENT = "#ef5f3c", GREEN = "#5f9d6f", CLAY = "#cc7a68";
// soft ChartMogul-style pastels {block bg, solid dot}
const PAL = [
  { bg: "#dce7d5", dot: "#7fa069" }, { bg: "#f6dad3", dot: "#d68a76" }, { bg: "#d8e1f1", dot: "#8199c6" },
  { bg: "#e7def2", dot: "#a88fcd" }, { bg: "#f6e8cd", dot: "#d3a65f" }, { bg: "#d4e6e1", dot: "#78a89e" },
  { bg: "#f1dde8", dot: "#c98bab" }, { bg: "#e3e5ea", dot: "#99a0ad" },
];
const TILE_ICONS = [TbFileText, TbBox, TbDroplet, TbVaccine, TbClipboardList];
const nm = (s: string, n = 28) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

// smooth catmull-rom → cubic-bezier path through points
function smooth(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function Card({ children, className = "", style = {}, pad = "p-6" }: any) {
  return <div className={`vm-card rounded-[20px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, ...style }}>{children}</div>;
}

// Lollipop + line/area chart. A continuous ACCENT model line runs across the whole
// timeline — fitted over history (so you can see how the model tracked vs what
// actually happened) then dashed into the future. Left→right "draw" reveal.
function Lollipop({ timeline, height = 300 }: { timeline: any[]; height?: number }) {
  const rid = useId().replace(/[:]/g, "");
  const data = timeline || [];
  const firstF = data.findIndex((d) => d.is_forecast);
  const [active, setActive] = useState<number>(-1);
  useEffect(() => { setActive(firstF); }, [firstF, timeline]);
  const W = 920, H = height, PADX = 44, PADT = 54, BY = H - 54;
  const n = data.length || 1;
  const X = (i: number) => PADX + (i / Math.max(n - 1, 1)) * (W - 2 * PADX);
  // scale on the actual + forecast POINT values (not the wide upper bound) so the
  // series isn't squashed; whiskers may extend up and clamp near the top.
  const pointVals = data.flatMap((d) => [d.actual, d.forecast].filter((v) => v != null)) as number[];
  const scaleMax = Math.max(...pointVals, 1) * 1.32;
  const Y = (v: number) => BY - (Math.min(Math.max(v, 0), scaleMax) / scaleMax) * (BY - PADT);
  if (!data.length) return <div className="flex items-center justify-center" style={{ height: H, color: MUT }}>Loading…</div>;
  const act = active >= 0 ? active : firstF;
  const lastActIdx = data.map((d) => d.actual != null).lastIndexOf(true);
  const actPts = data.map((d, i) => (d.actual != null ? { x: X(i), y: Y(d.actual) } : null)).filter(Boolean) as { x: number; y: number }[];
  // model line: causal MA(3) fit over history, real forecast into the future — one continuous line
  const fittedAt = (i: number) => { let s = 0, c = 0; for (let k = Math.max(0, i - 2); k <= i; k++) { if (data[k].actual != null) { s += data[k].actual; c++; } } return c ? s / c : null; };
  const modelPts = data.map((d, i) => { const v = d.is_forecast ? d.forecast : fittedAt(i); return v != null ? { x: X(i), y: Y(v), i } : null; }).filter(Boolean) as { x: number; y: number; i: number }[];
  const histModel = modelPts.filter((p) => p.i <= lastActIdx);
  const futModel = modelPts.filter((p) => p.i >= lastActIdx);
  const areaOf = (pts: { x: number; y: number }[]) => pts.length < 2 ? "" : `${smooth(pts)} L ${pts[pts.length - 1].x} ${BY} L ${pts[0].x} ${BY} Z`;
  const REVEAL = 1400;
  const delayAt = (x: number) => Math.round(220 + ((x - PADX) / (W - 2 * PADX)) * REVEAL * 0.82);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setActive(firstF)}>
      <defs>
        <linearGradient id={`af${rid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={STEEL} stopOpacity="0.22" /><stop offset="100%" stopColor={STEEL} stopOpacity="0" /></linearGradient>
        <clipPath id={`wipe${rid}`}><rect x="-4" y="0" width={W + 8} height={H} style={{ transformOrigin: "0px 0px", animation: `vmWipe ${REVEAL}ms cubic-bezier(.45,0,.15,1) both` }} /></clipPath>
      </defs>
      {/* raised cream highlight column (static) */}
      {act >= 0 && <rect x={X(act) - 25} y={PADT - 22} width={50} height={BY - PADT + 36} rx={25} fill={CREAM} style={{ animation: "vmFade .6s ease .5s both" }} />}
      {/* everything that "draws" is revealed left→right by the wipe clip */}
      <g clipPath={`url(#wipe${rid})`}>
        <path d={areaOf(actPts)} fill={`url(#af${rid})`} />
        {/* stems */}
        {data.map((d, i) => { const v = d.is_forecast ? d.forecast : d.actual; if (v == null) return null; const x = X(i); return <line key={`s${i}`} x1={x} y1={BY} x2={x} y2={Y(v)} stroke={d.is_forecast ? "#dcdfe6" : "#e2e5eb"} strokeWidth="2" strokeLinecap="round" />; })}
        {/* forecast uncertainty whiskers */}
        {data.map((d, i) => d.is_forecast ? <line key={`w${i}`} x1={X(i)} y1={Y(d.lower)} x2={X(i)} y2={Y(d.upper)} stroke={FAINT} strokeWidth="2.5" strokeLinecap="round" /> : null)}
        {/* steel actual line — what really happened */}
        <path d={smooth(actPts)} fill="none" stroke={STEEL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* accent model line — fitted over history, dashed into the future */}
        <path d={smooth(histModel)} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <path d={smooth(futModel)} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 7" />
      </g>
      {/* dots, tooltip & month labels — pop in synced to the wipe passing */}
      {data.map((d, i) => {
        const isF = d.is_forecast; const v = isF ? d.forecast : d.actual; if (v == null) return null;
        const x = X(i), y = Y(v), isAct = i === act, dl = delayAt(x);
        return (
          <g key={i} onMouseEnter={() => setActive(i)} style={{ cursor: "pointer" }}>
            <rect x={x - (W - 2 * PADX) / (n * 2)} y={0} width={(W - 2 * PADX) / n} height={H} fill="transparent" />
            <circle cx={x} cy={y} r={isAct ? 6.5 : 5} fill={isAct ? INK : isF ? "#fff" : STEEL} stroke={isF && !isAct ? STEEL : "none"} strokeWidth={isF ? 2 : 0}
              style={{ transformBox: "fill-box", transformOrigin: "center", animation: `vmPop .5s cubic-bezier(.34,1.5,.64,1) ${dl}ms both` }} />
            {isAct && (
              <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: `vmUp .45s cubic-bezier(.22,1,.36,1) ${dl + 120}ms both` }}>
                <rect x={x - 44} y={y - 42} width={88} height={26} rx={13} fill={INK} />
                <text x={x} y={y - 24} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: "#fff" }}>{countAbbr(v)}</text>
              </g>
            )}
            {isAct
              ? <g style={{ animation: `vmFade .4s ease ${dl}ms both` }}><rect x={x - 21} y={BY + 16} width={42} height={24} rx={12} fill={INK} /><text x={x} y={BY + 32} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 700, fill: "#fff" }}>{d.label}</text></g>
              : <text x={x} y={BY + 32} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 500, fill: MUT, animation: `vmFade .4s ease ${dl}ms both` }}>{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function Hero({ data }: { data: any }) {
  const t = data?.totals || {}; const tl = data?.timeline || [];
  const lastAct = [...tl].reverse().find((d: any) => d.actual != null);
  const nextFc = tl.find((d: any) => d.is_forecast);
  const delta = lastAct?.actual > 0 && nextFc ? ((nextFc.forecast - lastAct.actual) / lastAct.actual) * 100 : 0;
  const up = delta >= 0;
  return (
    <Card pad="p-0" className="overflow-hidden h-full flex flex-col">
      <div className="flex items-start justify-between px-7 pt-6">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight" style={{ color: INK }}>Expected Usage</h2>
          <p className="text-[12.5px] mt-1 max-w-sm leading-relaxed" style={{ color: MUT }}>How much of each medicine & supply you'll use over the next {t.horizon ?? 3} months, with a best/worst range.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold flex-shrink-0" style={{ background: CREAM, color: INK2, border: `1px solid ${BORDER}` }}>Next {t.horizon ?? 3} months <TbChevronDown size={14} style={{ color: MUT }} /></div>
      </div>
      <div className="flex-1 flex flex-col md:flex-row gap-2 px-4 pb-3 pt-2">
        <div className="md:w-[220px] flex-shrink-0 flex flex-col justify-end px-3 pb-6">
          <div className="text-[46px] font-extrabold leading-none tracking-tight tabular-nums" style={{ color: INK }}>{up ? "+" : "−"}<CountUp value={Math.abs(Math.round(delta))} format={(v: number) => `${Math.round(v)}%`} /></div>
          <div className="text-[12.5px] mt-2 leading-relaxed" style={{ color: MUT }}>Next month's expected usage is <b style={{ color: INK2 }}>{Math.abs(Math.round(delta))}% {up ? "higher" : "lower"}</b> than last month.</div>
          <div className="mt-5 pt-4 space-y-3" style={{ borderTop: `1px solid ${LINE}` }}>
            <div><div className="text-[19px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(Number(t.next_lower ?? 0))}–{countAbbr(Number(t.next_upper ?? 0))}</div><div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: MUT }}>likely range · units</div></div>
            <div><div className="text-[19px] font-bold tabular-nums" style={{ color: INK }}>{Number(t.accuracy ?? 0).toFixed(0)}%</div><div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: MUT }}>forecast reliability</div></div>
          </div>
        </div>
        <div className="flex-1 min-w-0" style={{ minHeight: 300 }}><Lollipop timeline={tl} /></div>
      </div>
      <div className="flex items-center gap-5 px-7 pb-5 text-[11.5px] font-medium flex-wrap" style={{ color: MUT }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[3px] rounded-full" style={{ background: STEEL }} />Actual use</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[3px] rounded-full" style={{ background: ACCENT }} />Model &amp; forecast</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white" style={{ border: `2px solid ${STEEL}` }} />Forecast point</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-0.5 h-3 rounded-full" style={{ background: FAINT }} />Best–worst range</span>
      </div>
    </Card>
  );
}

function TopItems({ rows }: { rows: any[] }) {
  const data = (rows || []).slice(0, 6);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[16px] font-bold" style={{ color: INK }}>Top items to plan for</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>next 3 months</span>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        {data.map((r, i) => {
          const Icon = TILE_ICONS[i % TILE_ICONS.length]; const pal = PAL[i % PAL.length];
          const monthly = r.next_mo || r.forecast / 3; const isNew = (r.last_actual || 0) < 50;
          const d = r.last_actual > 0 ? ((monthly - r.last_actual) / r.last_actual) * 100 : 0; const up = d >= 0; const capped = Math.min(Math.abs(d), 999);
          return (
            <div key={i} className="vm-row flex items-center gap-3 rounded-2xl px-2.5 py-2.5 -mx-1 transition-colors hover:bg-[#f7f7f9]" style={{ animationDelay: `${i * 55}ms` }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: pal.bg, color: pal.dot }}><Icon size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{nm(r.desc, 26)}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: MUT }}>{r.group}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(r.forecast)}</div>
                {isNew
                  ? <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>new item</span>
                  : <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: up ? GREEN : CLAY }}>{up ? <TbArrowUpRight size={12} /> : <TbArrowDownRight size={12} />}{capped.toFixed(0)}{capped >= 999 ? "+" : ""}%</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NextMonths({ timeline }: { timeline: any[] }) {
  const fc = (timeline || []).filter((d: any) => d.is_forecast).slice(0, 3);
  return (
    <Card className="h-full" pad="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-bold" style={{ color: INK }}>Month by month</h3>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-2.5 py-1.5" style={{ color: INK2, background: CREAM }}><TbCalendarEvent size={13} style={{ color: MUT }} />forecast</span>
      </div>
      <div className="grid grid-cols-3">
        {fc.map((m: any, i: number) => (
          <div key={i} className={`px-4 ${i > 0 ? "border-l" : ""}`} style={{ borderColor: LINE }}>
            <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: MUT }}>{m.month}</div>
            <div className="text-[27px] font-extrabold tabular-nums leading-none mt-2" style={{ color: INK }}><CountUp value={m.forecast} format={countAbbr} /></div>
            <div className="text-[11.5px] mt-1.5" style={{ color: MUT }}>units expected</div>
            <div className="text-[11.5px] mt-3 tabular-nums" style={{ color: INK2 }}>{countAbbr(m.lower)} – {countAbbr(m.upper)}</div>
            <div className="text-[10px] uppercase tracking-wide font-medium mt-0.5" style={{ color: MUT }}>range</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CategoryShare({ rows }: { rows: any[] }) {
  const on = useMount(240);
  const src = (rows || []);
  const shown = src.slice(0, 6);
  const otherVal = src.slice(6).reduce((s, r) => s + r.forecast, 0);
  const segs = [...shown.map((r, i) => ({ name: r.group, val: r.forecast, ...PAL[i % 7] })), ...(otherVal > 0 ? [{ name: "Other", val: otherVal, ...PAL[7] }] : [])];
  const total = segs.reduce((s, r) => s + r.val, 0) || 1;
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[16px] font-bold" style={{ color: INK }}>Demand by category</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>share of 3-month forecast</span>
      </div>
      {/* segmented pastel share bar */}
      <div className="flex gap-1 h-11 mb-5">
        {segs.map((s, i) => (
          <div key={i} className="rounded-md" title={`${s.name} · ${countAbbr(s.val)}`}
            style={{ width: on ? `${(s.val / total) * 100}%` : "0%", background: s.bg, transition: `width .9s cubic-bezier(.22,1,.36,1) ${i * 60}ms`, minWidth: 6 }} />
        ))}
      </div>
      {/* legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 flex-1 content-start">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
            <span className="text-[12.5px] truncate flex-1" style={{ color: INK2 }} title={s.name}>{s.name}</span>
            <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{countAbbr(s.val)}</span>
            <span className="text-[11px] tabular-nums w-9 text-right flex-shrink-0" style={{ color: MUT }}>{((s.val / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ItemExplorer({ region }: { region: string }) {
  const [cat, setCat] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<{ Material: string; ["Material Description"]: string } | null>(null);
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetch(`/forecastMappings/${region}_forecast_material_catalogue.json`).then((r) => r.json())
      .then((d: any[]) => { setCat(d || []); if (d?.length) setSel(d[Math.min(1, d.length - 1)]); }).catch(() => setCat([]));
  }, [region]);
  useEffect(() => {
    if (!sel) return; setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}/forecast/sales-forecast?Plant=${encodeURIComponent(region)}&Material=${encodeURIComponent(sel.Material)}`)
      .then((r) => r.json()).then((d: any[]) => {
        const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const tl = (d || []).map((x) => { const isF = Number(x.Sales_Quantity_Forecast) > 0; const mo = parseInt(String(x["Posting Date"]).slice(0, 2));
          return { label: MN[(mo - 1 + 12) % 12], actual: Number(x.sales_qty) > 0 ? Number(x.sales_qty) : null, forecast: isF ? Number(x.Sales_Quantity_Forecast) : null, lower: isF ? Number(x.Lower_Bound_Sales_Quantity_Forecast) : null, upper: isF ? Number(x.Upper_Bound_Sales_Quantity_Forecast) : null, is_forecast: isF }; });
        setRows(tl);
      }).catch(() => setRows([])).finally(() => setLoading(false));
  }, [sel, region]);
  const filtered = q ? cat.filter((c) => (c["Material Description"] || "").toLowerCase().includes(q.toLowerCase()) || String(c.Material).includes(q)).slice(0, 40) : cat.slice(0, 40);
  const fcr = rows.filter((r) => r.is_forecast); const nextMo = fcr[0];
  return (
    <Card pad="p-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-[16px] font-bold" style={{ color: INK }}>Explore a specific item</h3>
          <p className="text-[12.5px] mt-1" style={{ color: MUT }}>search any medicine or supply for its own 3-month usage forecast</p>
        </div>
        <div className="relative" style={{ minWidth: 300 }}>
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ border: `1px solid ${open ? INK : BORDER}`, background: open ? "#fff" : CREAM, transition: "all .15s" }}>
            <TbSearch size={15} style={{ color: open ? INK : MUT }} />
            <input value={open ? q : (sel?.["Material Description"] || "")} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setQ(""); setOpen(true); }}
              placeholder="Search item…" className="flex-1 bg-transparent text-[13px] focus:outline-none" style={{ color: INK }} />
          </div>
          {open && (
            <div className="absolute z-20 mt-1.5 w-full max-h-64 overflow-auto rounded-xl bg-white py-1" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 18px 40px -16px rgba(20,22,40,0.25)" }}>
              {filtered.map((c, i) => (
                <button key={c.Material} onClick={() => { setSel(c); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-[#f6f6f8] transition-colors flex items-center gap-2.5 group">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PAL[i % 7].dot }} />
                  <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium truncate" style={{ color: INK }}>{nm(c["Material Description"], 40)}</div><div className="text-[10.5px]" style={{ color: MUT }}>{c.Material}</div></div>
                  <TbChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: MUT }} />
                </button>
              ))}
              {!filtered.length && <div className="px-3 py-3 text-[12.5px]" style={{ color: MUT }}>No item found.</div>}
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-[13px]" style={{ color: MUT }}><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${INK} transparent ${INK} ${INK}` }} />Loading forecast…</div>
      ) : rows.length ? (
        <div key={sel?.Material} className="grid grid-cols-1 xl:grid-cols-12 gap-6 vm-fade">
          <div className="xl:col-span-8 rounded-2xl p-2" style={{ background: "#fcfcfd", border: `1px solid ${LINE}`, minHeight: 300 }}><Lollipop timeline={rows} height={296} /></div>
          <div className="xl:col-span-4 flex flex-col gap-3">
            <div className="rounded-2xl p-5" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
              <div className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: MUT }}>{nm(sel?.["Material Description"] || "", 30)}</div>
              <div className="mt-2.5 text-[32px] font-extrabold tabular-nums leading-none" style={{ color: INK }}><CountUp value={Number(nextMo?.forecast ?? 0)} format={countAbbr} /></div>
              <div className="text-[12px] mt-1.5" style={{ color: MUT }}>units next month · <b style={{ color: INK2 }}>{countAbbr(Number(nextMo?.lower ?? 0))}–{countAbbr(Number(nextMo?.upper ?? 0))}</b></div>
            </div>
            {fcr.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ border: `1px solid ${BORDER}` }}>
                <span className="text-[12.5px] font-medium" style={{ color: INK2 }}>{m.label}</span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{countAbbr(m.forecast)} <span className="text-[11px] font-normal" style={{ color: MUT }}>units</span></span>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="py-16 text-center text-[13px]" style={{ color: MUT }}>Pick an item to see its forecast.</div>}
    </Card>
  );
}

export default function DemandForecastDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { setData(null); fetch(`${DASHBOARD_API_BASE_URL}/forecast/demand-insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};

  return (
    <div className="-m-4 md:-m-6 p-5 md:p-8" style={{ minHeight: "calc(100vh - 64px)", background: BG }}>
      <style jsx global>{`
        @keyframes vmIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .vm-card{animation:vmIn .55s cubic-bezier(.22,1,.36,1) both;min-width:0}
        @keyframes vmRow{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        .vm-row{animation:vmRow .5s cubic-bezier(.22,1,.36,1) both}
        @keyframes vmFade{from{opacity:0}to{opacity:1}}.vm-fade{animation:vmFade .4s ease both}
        @keyframes vmWipe{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes vmPop{from{opacity:0;transform:scale(.35)}to{opacity:1;transform:scale(1)}}
        @keyframes vmUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: MUT }}>Forecasting</div>
            <h1 className="text-[29px] font-extrabold leading-none tracking-tight" style={{ color: INK }}>Expected Usage Forecast</h1>
            <p className="text-[13px] mt-2" style={{ color: MUT }}>Plan purchasing around how much you'll actually use · {region}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-xl" style={{ color: INK2, background: CARD, border: `1px solid ${BORDER}` }}><span className="w-2 h-2 rounded-full" style={{ background: GREEN }} />{Number(t.accuracy ?? 0).toFixed(0)}% reliable for planning</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          <div className="xl:col-span-8"><Hero data={data} /></div>
          <div className="xl:col-span-4"><TopItems rows={data?.top_items || []} /></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch mt-5">
          <div className="xl:col-span-5"><NextMonths timeline={data?.timeline || []} /></div>
          <div className="xl:col-span-7"><CategoryShare rows={data?.by_category || []} /></div>
        </div>

        <div className="mt-5"><ItemExplorer region={region} /></div>

        <div className="mt-5 rounded-2xl px-5 py-4 text-[12px] leading-relaxed" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUT }}>
          <b style={{ color: INK2 }}>How to read this:</b> forecasts use your last 6 months of actual usage. Category and monthly totals are reliable for planning — the range shows the best/worst case to budget for. For a single item, treat it as a guide and confirm critical medicines with your team.
        </div>
      </div>
    </div>
  );
}
