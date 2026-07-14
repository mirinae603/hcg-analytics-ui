"use client";
// "Procurement Budget" cash-flow forecast — same editorial neutral base as the
// demand page (for section consistency) but its OWN chart language: monthly spend
// COLUMNS + a cumulative cash-out line (combo), a budget DONUT, a spend leaderboard,
// and a TEAL money accent. Values are forecast consumption cost = cash to restock.
import React, { useEffect, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { useMount, CountUp } from "@/components/portfolio/kit";
import { TbSearch, TbChevronRight, TbChevronDown, TbCurrencyRupee, TbReceipt2, TbBox, TbFlask, TbStethoscope, TbWallet, TbArrowUpRight, TbArrowDownRight } from "react-icons/tb";

const BG = "#e8eaee", CARD = "#ffffff", CREAM = "#f4f3ef", INK = "#1b1c22", INK2 = "#41444f", MUT = "#8a8f9d", FAINT = "#c4c8d2", LINE = "#ecedf1", BORDER = "#e7e8ee";
const STEEL = "#adb4c2";                      // neutral "already spent" columns
const TEAL = "#159e8c", TEALD = "#0d7264", GREEN = "#5f9d6f", CLAY = "#cc7a68";
// donut palette — teal-anchored shades + a couple of warm/neutral tails for legibility
const DPAL = ["#0d7264", "#159e8c", "#37b2a1", "#63c6b7", "#8fd8cc", "#bce8e1", "#e3c091", "#dfa39f", "#aab1c1", "#ccd1db"];
const TILE_ICONS = [TbFlask, TbStethoscope, TbBox, TbReceipt2, TbCurrencyRupee];
const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const inr = (v: number) => { v = Number(v) || 0; const a = Math.abs(v), s = v < 0 ? "-" : ""; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a / 1e7 >= 100 ? 0 : 1)}Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(a / 1e5 >= 100 ? 0 : 1)}L`; if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}K`; return `${s}₹${Math.round(a)}`; };

function Card({ children, className = "", style = {}, pad = "p-6" }: any) {
  return <div className={`vm-card rounded-[20px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, ...style }}>{children}</div>;
}
const topBar = (x: number, y: number, w: number, h: number, r: number) => { r = Math.max(0, Math.min(r, w / 2, h)); return `M${x} ${y + h} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h} Z`; };

// Simple, readable monthly spend bars: grey = already spent, teal = forecast
// budget. Each bar labelled with its rupee value; a soft divider marks where the
// forecast begins. No second axis, no whiskers — just "what we spend each month".
function SpendChart({ timeline, height = 306, small = false }: { timeline: any[]; height?: number; small?: boolean }) {
  const data = timeline || [];
  const firstF = data.findIndex((d) => d.is_forecast);
  const [active, setActive] = useState<number>(-1);
  const lastActIdx = data.map((d) => d.actual != null).lastIndexOf(true);
  const W = 920, H = height, PADX = 52, PADT = 46, BY = H - 52;
  const n = data.length || 1;
  const step = (W - 2 * PADX) / Math.max(n - 1, 1);
  const X = (i: number) => PADX + i * step;
  const vals = data.flatMap((d) => [d.actual, d.forecast].filter((v) => v != null)) as number[];
  const barMax = Math.max(...vals, 1) * 1.22;
  const Y = (v: number) => BY - (Math.min(Math.max(v, 0), barMax) / barMax) * (BY - PADT);
  if (!data.length) return <div className="flex items-center justify-center" style={{ height: H, color: MUT }}>Loading…</div>;
  const bw = Math.min(step * 0.5, 44);
  const act = active;
  const divX = firstF > 0 ? (X(lastActIdx) + X(firstF)) / 2 : -100;
  return (
    <svg role="img" aria-label="Procurement budget forecast: monthly spend, actual then projected" viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setActive(-1)}>
      {/* forecast divider + tag */}
      {firstF > 0 && (
        <g style={{ animation: "vmFade .6s ease .5s both" }}>
          <line x1={divX} y1={PADT - 18} x2={divX} y2={BY} stroke={FAINT} strokeWidth="1.5" strokeDasharray="4 5" />
          <rect x={divX + 6} y={PADT - 28} width={64} height={19} rx={9.5} fill="#e2f2ef" />
          <text x={divX + 38} y={PADT - 15} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 700, fill: TEALD, letterSpacing: 0.3 }}>FORECAST</text>
        </g>
      )}
      {/* baseline */}
      <line x1={PADX - 12} y1={BY} x2={W - PADX + 12} y2={BY} stroke={LINE} strokeWidth="1.5" />
      {/* bars */}
      {data.map((d, i) => {
        const isF = d.is_forecast; const v = isF ? d.forecast : d.actual; if (v == null) return null;
        const x = X(i) - bw / 2, y = Y(v), h = BY - y, isAct = i === act;
        const fill = isF ? (isAct ? TEALD : TEAL) : (isAct ? "#8c95a8" : STEEL);
        return <path key={`b${i}`} d={topBar(x, y, bw, h, 7)} fill={fill} style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `vmGrow .7s cubic-bezier(.22,1,.36,1) ${120 + i * 70}ms both`, transition: "fill .18s ease" }} />;
      })}
      {/* value labels above each bar */}
      {!small && data.map((d, i) => {
        const isF = d.is_forecast; const v = isF ? d.forecast : d.actual; if (v == null) return null;
        return <text key={`v${i}`} x={X(i)} y={Y(v) - 10} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 700, fill: isF ? TEALD : INK2, animation: `vmFade .5s ease ${520 + i * 70}ms both` }}>{inr(v)}</text>;
      })}
      {/* month labels */}
      <g style={{ animation: "vmFade .6s ease .9s both" }}>
        {data.map((d, i) => { const x = X(i), isAct = i === act; return (
          <g key={`l${i}`}>
            <rect x={x - 21} y={BY + 16} width={42} height={24} rx={12} fill={INK} style={{ opacity: isAct ? 1 : 0, transition: "opacity .2s ease" }} />
            <text x={x} y={BY + 32} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: isAct ? 700 : 500, fill: isAct ? "#fff" : MUT, transition: "fill .2s ease" }}>{d.label}</text>
          </g>); })}
      </g>
      {/* hit columns */}
      {data.map((d, i) => <rect key={`h${i}`} x={X(i) - step / 2} y={0} width={step} height={H} fill="transparent" onMouseEnter={() => setActive(i)} style={{ cursor: "pointer" }} />)}
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
          <h2 className="text-[22px] font-bold tracking-tight" style={{ color: INK }}>Procurement Budget</h2>
          <p className="text-[12.5px] mt-1 max-w-md leading-relaxed" style={{ color: MUT }}>Cash you'll need to restock over the next {t.horizon ?? 3} months — monthly spend and the running total.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold flex-shrink-0" style={{ background: CREAM, color: INK2, border: `1px solid ${BORDER}` }}>Next {t.horizon ?? 3} months <TbChevronDown size={14} style={{ color: MUT }} /></div>
      </div>
      {/* stat row above chart */}
      <div className="flex items-end gap-x-9 gap-y-3 flex-wrap px-7 pt-5 pb-1">
        <div className="mr-2">
          <div className="text-[40px] font-extrabold leading-none tracking-tight tabular-nums" style={{ color: INK }}><CountUp value={Number(t.total_horizon ?? 0)} format={inr} /></div>
          <div className="text-[12.5px] mt-2 leading-relaxed" style={{ color: MUT }}>total budget over {t.horizon ?? 3} months · <b style={{ color: INK2 }}>{inr(Number(t.avg_month ?? 0))}/mo</b> average</div>
        </div>
        <div className="flex items-end gap-x-9 pb-1 ml-auto">
          <div><div className="text-[19px] font-bold tabular-nums leading-none" style={{ color: INK }}>{inr(Number(t.next_budget ?? 0))}</div><div className="text-[11px] uppercase tracking-wide font-medium mt-1.5" style={{ color: MUT }}>next month{up ? " ▲" : " ▼"} {Math.abs(Math.round(delta))}%</div></div>
          <div style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: 36 }}><div className="text-[19px] font-bold tabular-nums leading-none" style={{ color: INK }}>{inr(Number(t.next_lower ?? 0))}–{inr(Number(t.next_upper ?? 0))}</div><div className="text-[11px] uppercase tracking-wide font-medium mt-1.5" style={{ color: MUT }}>next-month range</div></div>
        </div>
      </div>
      <div className="flex-1 min-w-0 px-3 pt-1" style={{ minHeight: 326 }}><SpendChart timeline={tl} /></div>
      <div className="flex items-center gap-5 px-7 pb-5 text-[11.5px] font-medium flex-wrap" style={{ color: MUT }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-[3px]" style={{ background: STEEL }} />Already spent</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-[3px]" style={{ background: TEAL }} />Forecast budget</span>
        <span style={{ color: FAINT }}>·</span>
        <span>each bar = the cash you'll spend that month</span>
      </div>
    </Card>
  );
}

function MoneyLeaderboard({ rows }: { rows: any[] }) {
  const data = (rows || []).slice(0, 6);
  const max = Math.max(...data.map((r) => r.forecast), 1);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[16px] font-bold" style={{ color: INK }}>Where the money goes</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>top spend · 3 mo</span>
      </div>
      <div className="flex-1 flex flex-col gap-3.5">
        {data.map((r, i) => {
          const Icon = TILE_ICONS[i % TILE_ICONS.length];
          const monthly = r.next_mo || r.forecast / 3; const isNew = (r.last_actual || 0) < 1000;
          const d = r.last_actual > 0 ? ((monthly - r.last_actual) / r.last_actual) * 100 : 0; const up = d >= 0; const capped = Math.min(Math.abs(d), 999);
          return (
            <div key={i} className="vm-row" style={{ animationDelay: `${i * 55}ms` }}>
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#e2f2ef", color: TEALD }}><Icon size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{nm(r.desc, 24)}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: MUT }}>{r.group}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[13.5px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.forecast)}</div>
                  {isNew ? <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>new</span>
                    : <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold" style={{ color: up ? GREEN : CLAY }}>{up ? <TbArrowUpRight size={11} /> : <TbArrowDownRight size={11} />}{capped.toFixed(0)}{capped >= 999 ? "+" : ""}%</span>}
                </div>
              </div>
              {/* thin solid share bar */}
              <div className="mt-1.5 ml-12 h-[5px] rounded-full overflow-hidden" style={{ background: "#eef0f3" }}>
                <div className="vm-bar h-full rounded-full" style={{ width: `${(r.forecast / max) * 100}%`, background: TEAL }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BudgetSummary({ data }: { data: any }) {
  const t = data?.totals || {}; const fc = (data?.timeline || []).filter((d: any) => d.is_forecast).slice(0, 3);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-bold" style={{ color: INK }}>Budget by month</h3>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-2.5 py-1.5" style={{ color: TEALD, background: "#e2f2ef" }}><TbWallet size={13} />plan</span>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {fc.map((m: any, i: number) => (
          <div key={i} className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ border: `1px solid ${BORDER}` }}>
            <div className="w-10 text-[12px] font-bold uppercase" style={{ color: MUT }}>{String(m.month).split(" ")[0]}</div>
            <div className="flex-1">
              <div className="text-[17px] font-extrabold tabular-nums leading-none" style={{ color: INK }}><CountUp value={m.forecast} format={inr} /></div>
              <div className="text-[11px] mt-1 tabular-nums" style={{ color: MUT }}>range {inr(m.lower)} – {inr(m.upper)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: MUT }}>by end</div>
              <div className="text-[13px] font-bold tabular-nums" style={{ color: TEALD }}>{inr(m.cumulative)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 flex items-end justify-between" style={{ borderTop: `1px solid ${LINE}` }}>
        <div><div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: MUT }}>3-month total</div><div className="text-[22px] font-extrabold tabular-nums" style={{ color: INK }}>{inr(Number(t.total_horizon ?? 0))}</div></div>
        <div className="text-right"><div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: MUT }}>reliability</div><div className="text-[22px] font-extrabold tabular-nums" style={{ color: INK }}>{Number(t.accuracy ?? 0).toFixed(0)}%</div></div>
      </div>
    </Card>
  );
}

function CategoryDonut({ rows, total }: { rows: any[]; total: number }) {
  const on = useMount(220);
  const src = (rows || []).slice(0, 8);
  const shown = src.slice(0, 7);
  const other = src.slice(7).reduce((s, r) => s + r.forecast, 0) + (rows || []).slice(8).reduce((s, r) => s + r.forecast, 0);
  const segs = [...shown.map((r, i) => ({ name: r.group, val: r.forecast, c: DPAL[i % DPAL.length] })), ...(other > 0 ? [{ name: "Other", val: other, c: DPAL[9] }] : [])];
  const tot = segs.reduce((s, r) => s + r.val, 0) || 1;
  const R = 66, sw = 24, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <Card className="h-full" pad="p-6">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[16px] font-bold" style={{ color: INK }}>Budget by category</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>where spend concentrates</span>
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
          <svg viewBox="0 0 180 180" width="180" height="180">
            <g transform="rotate(-90 90 90)">
              {segs.map((s, i) => { const frac = s.val / tot; const len = frac * C; const off = acc * C; acc += frac;
                return <circle key={i} cx="90" cy="90" r={R} fill="none" stroke={s.c} strokeWidth={sw}
                  strokeDasharray={`${on ? len : 0} ${C}`} strokeDashoffset={-off} strokeLinecap="butt"
                  style={{ transition: `stroke-dasharray .9s cubic-bezier(.22,1,.36,1) ${i * 80}ms` }} />; })}
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: MUT }}>3-mo budget</div>
            <div className="text-[20px] font-extrabold tabular-nums" style={{ color: INK }}>{inr(total)}</div>
          </div>
        </div>
        <div className="flex-1 min-w-[200px] grid grid-cols-1 gap-y-2">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.c }} />
              <span className="text-[12.5px] truncate flex-1" style={{ color: INK2 }} title={s.name}>{s.name}</span>
              <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{inr(s.val)}</span>
              <span className="text-[11px] tabular-nums w-9 text-right flex-shrink-0" style={{ color: MUT }}>{((s.val / tot) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
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
      .then((d: any[]) => { setCat(d || []); if (d?.length) setSel(d[0]); }).catch(() => setCat([]));
  }, [region]);
  useEffect(() => {
    if (!sel) return; setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}/forecast/cashflow-forecast?Plant=${encodeURIComponent(region)}&Material=${encodeURIComponent(sel.Material)}`)
      .then((r) => r.json()).then((d: any[]) => {
        const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let cum = 0;
        const tl = (d || []).map((x) => { const isF = Number(x.Sales_Quantity_Forecast) > 0; const mo = parseInt(String(x["Posting Date"]).slice(0, 2)); if (isF) cum += Number(x.Sales_Quantity_Forecast);
          return { label: MN[(mo - 1 + 12) % 12], month: MN[(mo - 1 + 12) % 12], actual: Number(x.sales_qty) > 0 ? Number(x.sales_qty) : null, forecast: isF ? Number(x.Sales_Quantity_Forecast) : null, lower: isF ? Number(x.Lower_Bound_Sales_Quantity_Forecast) : null, upper: isF ? Number(x.Upper_Bound_Sales_Quantity_Forecast) : null, cumulative: isF ? cum : null, is_forecast: isF }; });
        setRows(tl);
      }).catch(() => setRows([])).finally(() => setLoading(false));
  }, [sel, region]);
  const filtered = q ? cat.filter((c) => (c["Material Description"] || "").toLowerCase().includes(q.toLowerCase()) || String(c.Material).includes(q)).slice(0, 40) : cat.slice(0, 40);
  const fcr = rows.filter((r) => r.is_forecast); const nextMo = fcr[0]; const total = fcr.reduce((s, r) => s + (r.forecast || 0), 0);
  return (
    <Card pad="p-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-[16px] font-bold" style={{ color: INK }}>Cost to restock a specific item</h3>
          <p className="text-[12.5px] mt-1" style={{ color: MUT }}>search any medicine or supply for its own 3-month budget</p>
        </div>
        <div className="relative" style={{ minWidth: 300 }}>
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ border: `1px solid ${open ? TEALD : BORDER}`, background: open ? "#fff" : CREAM, transition: "all .15s" }}>
            <TbSearch size={15} style={{ color: open ? TEALD : MUT }} />
            <input value={open ? q : (sel?.["Material Description"] || "")} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setQ(""); setOpen(true); }}
              placeholder="Search item…" className="flex-1 bg-transparent text-[13px] focus:outline-none" style={{ color: INK }} />
          </div>
          {open && (
            <div className="absolute z-20 mt-1.5 w-full max-h-64 overflow-auto rounded-xl bg-white py-1" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 18px 40px -16px rgba(20,22,40,0.25)" }}>
              {filtered.map((c, i) => (
                <button key={c.Material} onClick={() => { setSel(c); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-[#f6f6f8] transition-colors flex items-center gap-2.5 group">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DPAL[i % DPAL.length] }} />
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
        <div className="py-16 flex items-center justify-center gap-2 text-[13px]" style={{ color: MUT }}><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${TEALD} transparent ${TEALD} ${TEALD}` }} />Loading budget…</div>
      ) : rows.length ? (
        <div key={sel?.Material} className="grid grid-cols-1 xl:grid-cols-12 gap-6 vm-fade">
          <div className="xl:col-span-8 rounded-2xl p-2" style={{ background: "#fcfcfd", border: `1px solid ${LINE}`, minHeight: 300 }}><SpendChart timeline={rows} height={296} /></div>
          <div className="xl:col-span-4 flex flex-col gap-3">
            <div className="rounded-2xl p-5" style={{ background: "#e9f4f1", border: `1px solid #cfe6e0` }}>
              <div className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: TEALD }}>{nm(sel?.["Material Description"] || "", 30)}</div>
              <div className="mt-2.5 text-[30px] font-extrabold tabular-nums leading-none" style={{ color: INK }}><CountUp value={Number(total)} format={inr} /></div>
              <div className="text-[12px] mt-1.5" style={{ color: MUT }}>total 3-month budget · <b style={{ color: INK2 }}>{inr(Number(nextMo?.forecast ?? 0))}</b> next month</div>
            </div>
            {fcr.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ border: `1px solid ${BORDER}` }}>
                <span className="text-[12.5px] font-medium" style={{ color: INK2 }}>{m.label}</span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{inr(m.forecast)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="py-16 text-center text-[13px]" style={{ color: MUT }}>Pick an item to see its budget.</div>}
    </Card>
  );
}

export default function CashflowForecastDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { setData(null); fetch(`${DASHBOARD_API_BASE_URL}/forecast/cashflow-insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};

  return (
    <div className="-m-4 md:-m-6 p-5 md:p-8" style={{ minHeight: "calc(100vh - 64px)", background: BG }}>
      <style jsx global>{`
        @keyframes vmIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .vm-card{animation:vmIn .55s cubic-bezier(.22,1,.36,1) both;min-width:0}
        @keyframes vmRow{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        .vm-row{animation:vmRow .5s cubic-bezier(.22,1,.36,1) both}
        @keyframes vmFade{from{opacity:0}to{opacity:1}}.vm-fade{animation:vmFade .4s ease both}
        @keyframes vmGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
        @keyframes vmPop{from{opacity:0;transform:scale(.35)}to{opacity:1;transform:scale(1)}}
        @keyframes vmDraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
        @keyframes vmBar{from{width:0}}
        .vm-bar{animation:vmBar 1s cubic-bezier(.22,1,.36,1) .3s both}
      `}</style>

      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: MUT }}>Forecasting</div>
            <h1 className="text-[29px] font-extrabold leading-none tracking-tight" style={{ color: INK }}>Procurement Budget Forecast</h1>
            <p className="text-[13px] mt-2" style={{ color: MUT }}>Plan the cash needed to keep shelves stocked · {region}</p>
          </div>
          <span title="6-month back-test accuracy measured at the aggregate/category level — reliable for planning totals, not a per-item guarantee." className="inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-xl cursor-help" style={{ color: INK2, background: CARD, border: `1px solid ${BORDER}` }}><span className="w-2 h-2 rounded-full" style={{ background: TEAL }} />{Number(t.accuracy ?? 0).toFixed(0)}% reliable for planning</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          <div className="xl:col-span-8"><Hero data={data} /></div>
          <div className="xl:col-span-4"><MoneyLeaderboard rows={data?.top_items || []} /></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch mt-5">
          <div className="xl:col-span-5"><BudgetSummary data={data} /></div>
          <div className="xl:col-span-7"><CategoryDonut rows={data?.by_category || []} total={Number(t.total_horizon ?? 0)} /></div>
        </div>

        <div className="mt-5"><ItemExplorer region={region} /></div>

        <div className="mt-5 rounded-2xl px-5 py-4 text-[12px] leading-relaxed" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUT }}>
          <b style={{ color: INK2 }}>How to read this:</b> budget = the forecast cost of what you'll consume, i.e. the cash needed to restock. Monthly totals and category splits are reliable for planning; the range shows the best/worst spend to hold cash for. A few high-value items (nuclear-medicine & radiology consumables) drive most of the spend.
        </div>
      </div>
    </div>
  );
}
