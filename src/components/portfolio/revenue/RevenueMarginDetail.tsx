"use client";
// "Revenue & Margin" — real billed revenue + true margin from IP + OP pharmacy
// sales. Editorial neutral canvas; IP=blue, OP=green, margin=deep green. Monthly
// IP/OP revenue stack, profitability donut, revenue-by-hospital & margin-by-
// manufacturer leaderboards, top items and category split.
import React, { useEffect, useState, useId } from "react";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { useMount, CountUp } from "@/components/portfolio/kit";
import { TbBuildingHospital, TbBuildingFactory2, TbPill, TbChevronDown, TbReceipt2, TbArrowUpRight, TbSearch, TbX, TbDownload, TbChevronRight } from "react-icons/tb";

const BG = "#e8eaee", CARD = "#ffffff", CREAM = "#f4f3ef", INK = "#1b1c22", INK2 = "#41444f", MUT = "#8a8f9d", FAINT = "#c4c8d2", LINE = "#ecedf1", BORDER = "#e7e8ee";
const IP = "#4b7bd4", OP = "#16a37f", MARGIN = "#0e7a54", COSTC = "#cfd4de";
const PAL = ["#15a06a", "#4b7bd4", "#d99a2b", "#c86a54", "#7b6cc9", "#2a9db0", "#c98bab", "#9aa0ad"];
const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const inr = (v: number) => { v = Number(v) || 0; const a = Math.abs(v), s = v < 0 ? "-" : ""; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a / 1e7 >= 100 ? 0 : 1)}Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(a / 1e5 >= 100 ? 0 : 1)}L`; if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}K`; return `${s}₹${Math.round(a)}`; };
const pct = (v: number) => `${(Number(v) || 0).toFixed(1)}%`;

function Card({ children, className = "", style = {}, pad = "p-6" }: any) {
  return <div className={`vm-card rounded-[20px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, ...style }}>{children}</div>;
}
const topBar = (x: number, y: number, w: number, h: number, r: number) => { r = Math.max(0, Math.min(r, w / 2, h)); return `M${x} ${y + h} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h} Z`; };

// Monthly revenue, stacked IP (blue) + OP (green), labelled with the total.
function RevenueBars({ timeline }: { timeline: any[] }) {
  const data = timeline || [];
  const [active, setActive] = useState(-1);
  const W = 900, H = 300, PADX = 46, PADT = 48, BY = H - 46;
  const n = data.length || 1;
  const step = (W - 2 * PADX) / Math.max(n - 1, 1);
  const X = (i: number) => PADX + i * step;
  const max = Math.max(...data.map((d) => d.revenue), 1) * 1.2;
  const Y = (v: number) => BY - (Math.min(v, max) / max) * (BY - PADT);
  const bw = Math.min(step * 0.5, 46);
  if (!data.length) return <div className="flex items-center justify-center" style={{ height: H, color: MUT }}>Loading…</div>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setActive(-1)}>
      <line x1={PADX - 12} y1={BY} x2={W - PADX + 12} y2={BY} stroke={LINE} strokeWidth="1.5" />
      {data.map((d, i) => {
        const x = X(i) - bw / 2, isA = i === active;
        const yIP = Y(d.ip_revenue), yTot = Y(d.revenue);
        return (
          <g key={i} style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `vmGrow .7s cubic-bezier(.22,1,.36,1) ${120 + i * 70}ms both` }}>
            <rect x={x} y={yIP} width={bw} height={BY - yIP} fill={IP} opacity={isA ? 1 : 0.92} />
            <path d={topBar(x, yTot, bw, Math.max(yIP - yTot - 1.5, 0), 6)} fill={OP} opacity={isA ? 1 : 0.92} />
          </g>
        );
      })}
      {data.map((d, i) => <text key={`v${i}`} x={X(i)} y={Y(d.revenue) - 9} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: INK, animation: `vmFade .5s ease ${540 + i * 70}ms both` }}>{inr(d.revenue)}</text>)}
      <g style={{ animation: "vmFade .6s ease .9s both" }}>
        {data.map((d, i) => <text key={`l${i}`} x={X(i)} y={BY + 22} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 500, fill: MUT }}>{d.label}</text>)}
      </g>
      {data.map((d, i) => <rect key={`h${i}`} x={X(i) - step / 2} y={0} width={step} height={H} fill="transparent" onMouseEnter={() => setActive(i)} style={{ cursor: "pointer" }} />)}
    </svg>
  );
}

function Hero({ data }: { data: any }) {
  const t = data?.totals || {}; const tl = data?.timeline || [];
  return (
    <Card pad="p-0" className="overflow-hidden h-full flex flex-col">
      <div className="flex items-start justify-between px-7 pt-6">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight" style={{ color: INK }}>Revenue &amp; Margin</h2>
          <p className="text-[12.5px] mt-1 max-w-md leading-relaxed" style={{ color: MUT }}>Real billed revenue and true margin from inpatient + outpatient pharmacy sales.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold flex-shrink-0" style={{ background: CREAM, color: INK2, border: `1px solid ${BORDER}` }}>Last {t.months ?? 6} months <TbChevronDown size={14} style={{ color: MUT }} /></div>
      </div>
      <div className="flex items-end gap-x-9 gap-y-3 flex-wrap px-7 pt-5 pb-1">
        <div className="mr-2">
          <div className="text-[40px] font-extrabold leading-none tracking-tight tabular-nums" style={{ color: INK }}><CountUp value={Number(t.revenue ?? 0)} format={inr} /></div>
          <div className="text-[12.5px] mt-2 leading-relaxed" style={{ color: MUT }}>total revenue · <b style={{ color: MARGIN }}>{inr(Number(t.margin ?? 0))} margin</b> ({pct(t.margin_pct ?? 0)})</div>
        </div>
        <div className="flex items-end gap-x-8 pb-1 ml-auto">
          <div><div className="text-[19px] font-bold tabular-nums leading-none" style={{ color: IP }}>{inr(Number(t.ip_revenue ?? 0))}</div><div className="text-[11px] uppercase tracking-wide font-medium mt-1.5" style={{ color: MUT }}>IP · {pct(t.ip_share ?? 0)}</div></div>
          <div style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: 32 }}><div className="text-[19px] font-bold tabular-nums leading-none" style={{ color: OP }}>{inr(Number(t.op_revenue ?? 0))}</div><div className="text-[11px] uppercase tracking-wide font-medium mt-1.5" style={{ color: MUT }}>OP · {pct(t.op_share ?? 0)}</div></div>
        </div>
      </div>
      <div className="flex-1 min-w-0 px-3 pt-1" style={{ minHeight: 300 }}><RevenueBars timeline={tl} /></div>
      <div className="flex items-center gap-5 px-7 pb-5 text-[11.5px] font-medium flex-wrap" style={{ color: MUT }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-[3px]" style={{ background: IP }} />Inpatient (IP)</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-[3px]" style={{ background: OP }} />Outpatient (OP)</span>
        <span style={{ color: FAINT }}>·</span><span>each bar = revenue billed that month</span>
      </div>
    </Card>
  );
}

function Profit({ data }: { data: any }) {
  const on = useMount(200); const t = data?.totals || {};
  const rid = useId().replace(/[:]/g, "");
  const rev = Number(t.revenue ?? 0), margin = Number(t.margin ?? 0), cost = Number(t.cost ?? 0);
  const R = 62, sw = 22, C = 2 * Math.PI * R;
  const fracM = rev ? margin / rev : 0;
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <h3 className="text-[16px] font-bold mb-1" style={{ color: INK }}>Profitability</h3>
      <p className="text-[12px] mb-4" style={{ color: MUT }}>how much of revenue is margin vs cost</p>
      <div className="flex items-center justify-center mb-5">
        <div className="relative" style={{ width: 168, height: 168 }}>
          <svg viewBox="0 0 168 168" width="168" height="168">
            <g transform="rotate(-90 84 84)">
              <circle cx="84" cy="84" r={R} fill="none" stroke={COSTC} strokeWidth={sw} />
              <circle cx="84" cy="84" r={R} fill="none" stroke={MARGIN} strokeWidth={sw} strokeLinecap="round"
                strokeDasharray={`${on ? fracM * C : 0} ${C}`} style={{ transition: "stroke-dasharray 1s cubic-bezier(.22,1,.36,1) .2s" }} />
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[26px] font-extrabold tabular-nums leading-none" style={{ color: MARGIN }}>{pct(t.margin_pct ?? 0)}</div>
            <div className="text-[10.5px] uppercase tracking-wide font-semibold mt-1" style={{ color: MUT }}>margin</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <div className="rounded-xl px-3.5 py-3" style={{ background: "#eaf5ef", border: "1px solid #d5ebdf" }}>
          <div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: MUT }}>Margin</div>
          <div className="text-[17px] font-extrabold tabular-nums" style={{ color: MARGIN }}>{inr(margin)}</div>
        </div>
        <div className="rounded-xl px-3.5 py-3" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
          <div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: MUT }}>Cost of goods</div>
          <div className="text-[17px] font-extrabold tabular-nums" style={{ color: INK2 }}>{inr(cost)}</div>
        </div>
      </div>
    </Card>
  );
}

function Leaderboard({ title, sub, rows, nameKey, Icon, accent, onDrill, dim }: { title: string; sub: string; rows: any[]; nameKey: string; Icon: any; accent: string; onDrill?: (d: any) => void; dim?: string }) {
  const data = (rows || []).slice(0, 6);
  const max = Math.max(...data.map((r) => r.revenue), 1);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ color: INK }}><Icon size={18} style={{ color: accent }} />{title}</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>{sub}</span>
      </div>
      <div className="flex-1 flex flex-col gap-3.5 mt-3">
        {data.map((r, i) => {
          const drillable = !!(onDrill && dim);
          const body = (
            <>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }} title={r[nameKey]}>{nm(r[nameKey], 24)}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[13.5px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.revenue)}</div>
                  <div className="text-[10.5px] font-semibold" style={{ color: r.margin_pct >= 0 ? MARGIN : "#c86a54" }}>{pct(r.margin_pct)} margin</div>
                </div>
              </div>
              <div className="mt-1.5 h-[5px] rounded-full overflow-hidden" style={{ background: "#eef0f3" }}>
                <div className="vm-bar h-full rounded-full" style={{ width: `${(r.revenue / max) * 100}%`, background: accent }} />
              </div>
            </>
          );
          return drillable ? (
            <button key={i} type="button" onClick={() => onDrill!({ title: `${r[nameKey]} — items`, query: `${dim}=${encodeURIComponent(r[nameKey])}` })}
              aria-label={`View items for ${r[nameKey]}`} className="vm-row text-left w-full rounded-lg -mx-1 px-1 py-0.5 transition-colors hover:bg-black/[0.025] focus:outline-none focus-visible:ring-2" style={{ animationDelay: `${i * 55}ms` }}>{body}</button>
          ) : (
            <div key={i} className="vm-row" style={{ animationDelay: `${i * 55}ms` }}>{body}</div>
          );
        })}
      </div>
    </Card>
  );
}

function TopItems({ rows, onDrill }: { rows: any[]; onDrill: (d: any) => void }) {
  const data = (rows || []).slice(0, 6);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ color: INK }}><TbPill size={18} style={{ color: MARGIN }} />Top items by revenue</h3>
        <button onClick={() => onDrill({ title: "All items by revenue", query: "sort=revenue" })} className="inline-flex items-center gap-0.5 text-[12px] font-semibold hover:underline" style={{ color: MARGIN }}>See all <TbChevronRight size={13} /></button>
      </div>
      <div className="flex-1 flex flex-col divide-y mt-2" style={{ borderColor: LINE }}>
        {data.map((r, i) => (
          <div key={i} className="vm-row flex items-center gap-3 py-3" style={{ animationDelay: `${i * 55}ms` }}>
            <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[12px] font-bold" style={{ background: "#eaf5ef", color: MARGIN }}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{nm(r.desc, 30)}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: MUT }}>{r.group} · {Math.round(r.qty).toLocaleString("en-IN")} sold</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[13.5px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.revenue)}</div>
              <div className="text-[10.5px] font-semibold" style={{ color: MARGIN }}>{pct(r.margin_pct)} margin</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CategorySplit({ rows, onDrill }: { rows: any[]; onDrill: (d: any) => void }) {
  const on = useMount(220);
  const src = (rows || []).slice(0, 8);
  const total = src.reduce((s, r) => s + r.revenue, 0) || 1;
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[16px] font-bold" style={{ color: INK }}>Revenue by category</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>click a row for items</span>
      </div>
      <div className="flex gap-1 h-11 mb-5">
        {src.map((s, i) => <div key={i} className="rounded-md" title={`${s.group} · ${inr(s.revenue)}`} style={{ width: on ? `${(s.revenue / total) * 100}%` : "0%", background: PAL[i % PAL.length], transition: `width .9s cubic-bezier(.22,1,.36,1) ${i * 60}ms`, minWidth: 5 }} />)}
      </div>
      <div className="grid grid-cols-1 gap-y-1 flex-1 content-start">
        {src.map((s, i) => (
          <button key={i} onClick={() => onDrill({ title: `${s.group} — items`, query: `group=${encodeURIComponent(s.group)}` })}
            className="group flex items-center gap-2.5 min-w-0 rounded-lg -mx-1.5 px-1.5 py-1 cursor-pointer transition-colors hover:bg-[#f7f8fa] text-left">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PAL[i % PAL.length] }} />
            <span className="text-[12.5px] truncate flex-1" style={{ color: INK2 }} title={s.group}>{s.group}</span>
            <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{inr(s.revenue)}</span>
            <span className="text-[11px] tabular-nums w-14 text-right flex-shrink-0" style={{ color: MARGIN }}>{pct(s.margin_pct)}</span>
            <TbChevronRight size={13} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: MUT }} />
          </button>
        ))}
      </div>
    </Card>
  );
}

// Slide-over drill — full billed-item list (with true margin) behind any revenue cut.
function RevenueDrill({ drill, onClose }: { drill: any; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const open = !!drill;
  useEffect(() => {
    if (!drill) return;
    setLoading(true); setQ(""); setD(null);
    fetch(`${DASHBOARD_API_BASE_URL}/revenue/items?${drill.query}&limit=500`)
      .then((r) => r.json()).then(setD).catch(() => setD({ items: [], count: 0, returned: 0 })).finally(() => setLoading(false));
  }, [drill]);
  const items = (d?.items || []).filter((it: any) => !q || (it.desc || "").toLowerCase().includes(q.toLowerCase()) || String(it.material).includes(q));
  const exportCsv = () => {
    const rows = d?.items || []; if (!rows.length) return;
    const cols = ["material", "desc", "group", "revenue", "margin", "margin_pct", "qty"];
    const csv = [cols.join(",")].concat(rows.map((r: any) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${String(drill.title || "revenue-items").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
  };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(18,20,32,0.34)", backdropFilter: "blur(2px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s ease" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 61, width: "min(560px, 94vw)", background: "#fff", boxShadow: "-26px 0 64px -22px rgba(20,24,40,0.34)", transform: open ? "translateX(0)" : "translateX(101%)", transition: "transform .34s cubic-bezier(.22,1,.36,1)", display: "flex", flexDirection: "column" }}>
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUT }}>Billed items</div>
              <h3 className="text-[19px] font-extrabold leading-tight truncate" style={{ color: INK }}>{drill?.title}</h3>
              <p className="text-[12.5px] mt-0.5" style={{ color: MUT }}>{d ? `${(d.count || 0).toLocaleString("en-IN")} items${d.count > d.returned ? ` · showing top ${d.returned}` : ""}` : "loading…"}</p>
            </div>
            <button onClick={onClose} aria-label="Close item list" className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#f2f3f6]" style={{ color: MUT }}><TbX size={19} /></button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: `1px solid ${BORDER}`, background: CREAM }}>
              <TbSearch size={15} style={{ color: MUT }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item…" className="flex-1 bg-transparent text-[13px] focus:outline-none" style={{ color: INK }} />
            </div>
            <button onClick={exportCsv} title="Export CSV" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors hover:bg-[#f2f3f6]" style={{ border: `1px solid ${BORDER}`, color: INK2 }}><TbDownload size={15} />Export</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-[13px]" style={{ color: MUT }}><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${MARGIN} transparent ${MARGIN} ${MARGIN}` }} />Loading…</div>
          ) : items.length ? items.map((r: any, i: number) => (
            <div key={r.material + "-" + i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f8fa] transition-colors">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold" style={{ background: "#eaf5ef", color: MARGIN }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{r.desc}</div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: MUT }}>{r.group} · {Math.round(r.qty).toLocaleString("en-IN")} sold</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.revenue)}</div>
                <div className="text-[10.5px] font-semibold tabular-nums" style={{ color: MARGIN }}>{pct(r.margin_pct)} margin</div>
              </div>
            </div>
          )) : <div className="py-16 text-center text-[13px]" style={{ color: MUT }}>No items match.</div>}
        </div>
      </div>
    </>
  );
}

export default function RevenueMarginDetail() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  const [drill, setDrill] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/revenue/insights`).then((r) => r.json()).then((d) => { if (d?.ready) setData(d); else setErr(true); }).catch(() => setErr(true)); }, []);
  const t = data?.totals || {};

  return (
    <div className="-m-4 md:-m-6 p-5 md:p-8" style={{ minHeight: "calc(100vh - 64px)", background: BG }}>
      <style jsx global>{`
        @keyframes vmIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .vm-card{animation:vmIn .55s cubic-bezier(.22,1,.36,1) both;min-width:0}
        @keyframes vmRow{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        .vm-row{animation:vmRow .5s cubic-bezier(.22,1,.36,1) both}
        @keyframes vmFade{from{opacity:0}to{opacity:1}}
        @keyframes vmGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
        @keyframes vmBar{from{width:0}}.vm-bar{animation:vmBar 1s cubic-bezier(.22,1,.36,1) .3s both}
      `}</style>

      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: MUT }}>Consumption &amp; Revenue</div>
            <h1 className="text-[29px] font-extrabold leading-none tracking-tight" style={{ color: INK }}>Revenue &amp; Margin</h1>
            <p className="text-[13px] mt-2" style={{ color: MUT }}>Actual billed revenue and real margin from IP + OP pharmacy sales</p>
          </div>
          <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-xl" style={{ color: INK2, background: CARD, border: `1px solid ${BORDER}` }}><span className="w-2 h-2 rounded-full" style={{ background: MARGIN }} />Real billing data</span>
        </div>

        {err && !data ? (
          <Card className="text-center py-16"><div className="text-[14px] font-semibold" style={{ color: INK }}>Preparing revenue data…</div><div className="text-[12.5px] mt-1" style={{ color: MUT }}>The sales figures are still being processed. Check back shortly.</div></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
              <div className="xl:col-span-8"><Hero data={data} /></div>
              <div className="xl:col-span-4"><Profit data={data} /></div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch mt-5">
              <Leaderboard title="Revenue by hospital" sub="top billing locations · tap to drill" rows={data?.by_hospital || []} nameKey="hospital" Icon={TbBuildingHospital} accent={IP} onDrill={setDrill} dim="hospital" />
              <Leaderboard title="Margin by manufacturer" sub="top by revenue · tap to drill" rows={data?.by_manufacturer || []} nameKey="manufacturer" Icon={TbBuildingFactory2} accent={OP} onDrill={setDrill} dim="manufacturer" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch mt-5">
              <div className="xl:col-span-7"><TopItems rows={data?.top_items || []} onDrill={setDrill} /></div>
              <div className="xl:col-span-5"><CategorySplit rows={data?.by_category || []} onDrill={setDrill} /></div>
            </div>
            <div className="mt-5 rounded-2xl px-5 py-4 text-[12px] leading-relaxed flex items-center gap-2 flex-wrap" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUT }}>
              <TbReceipt2 size={15} style={{ color: MARGIN }} />
              <span><b style={{ color: INK2 }}>Billable vs non-billable:</b> {inr(Number(t.revenue ?? 0))} of billed (patient) revenue across {(Number(t.materials ?? 0)).toLocaleString("en-IN")} items and {t.manufacturers ?? 0} manufacturers, vs {inr(Number(t.internal_cost ?? 0))} of internal (non-billable) consumption cost. Margin = billed MRP − actual cost.</span>
            </div>
          </>
        )}
      </div>

      <RevenueDrill drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}
