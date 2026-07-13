"use client";
// "Reorder & Stock Risk" — an ACTION board (not a time-series). Same editorial
// neutral base as the other forecast pages, but its own language: a stock-health
// spectrum (too little → too much), twin risk leaderboards, an aging-cash ladder
// and a per-item status checker. Traffic-light semantics for at-a-glance triage.
import React, { useEffect, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { useMount, CountUp } from "@/components/portfolio/kit";
import { TbShoppingCartPlus, TbAlertTriangle, TbHourglassHigh, TbSearch, TbChevronRight, TbPackageOff, TbClockExclamation, TbBox } from "react-icons/tb";

const BG = "#e8eaee", CARD = "#ffffff", CREAM = "#f4f3ef", INK = "#1b1c22", INK2 = "#41444f", MUT = "#8a8f9d", FAINT = "#c4c8d2", LINE = "#ecedf1", BORDER = "#e7e8ee";
const RED = "#d86a4f", AMBER = "#dda23f", GREEN = "#5f9d6f", SLATE = "#8b93a8", DARK = "#4b5060";
const SC: Record<string, string> = { "Stock-out": RED, "Reorder now": AMBER, "Healthy": GREEN, "Overstocked": SLATE, "Dead stock": DARK };
const SC_BG: Record<string, string> = { "Stock-out": "#f7e6e0", "Reorder now": "#f6ecd5", "Healthy": "#e3efe5", "Overstocked": "#e9ebef", "Dead stock": "#e2e4e9" };
const ADVICE: Record<string, string> = { "Stock-out": "Out of stock — order immediately", "Reorder now": "Running low — reorder soon", "Healthy": "Well covered — no action", "Overstocked": "More than enough — hold buying", "Dead stock": "Not moving — review or return" };
const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const num = (v: number) => Math.round(Number(v) || 0).toLocaleString("en-IN");
const inr = (v: number) => { v = Number(v) || 0; const a = Math.abs(v), s = v < 0 ? "-" : ""; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a / 1e7 >= 100 ? 0 : 1)}Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(a / 1e5 >= 100 ? 0 : 1)}L`; if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}K`; return `${s}₹${Math.round(a)}`; };
const cover = (m: number) => (m >= 999 ? "no demand" : m < 1 ? `${Math.round(m * 30)} days left` : `${m.toFixed(1)} mo cover`);

function Card({ children, className = "", style = {}, pad = "p-6" }: any) {
  return <div className={`vm-card rounded-[20px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, ...style }}>{children}</div>;
}
const topBar = (x: number, y: number, w: number, h: number, r: number) => { r = Math.max(0, Math.min(r, w / 2, h)); return `M${x} ${y + h} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h} Z`; };

// Reorder pressure by department — a clean column chart (the hero chart).
function ReorderByCategory({ rows }: { rows: any[] }) {
  const data = (rows || []).slice(0, 7);
  const [active, setActive] = useState(-1);
  const W = 840, H = 320, PADX = 30, PADT = 54, BY = H - 62;
  const n = data.length || 1;
  const slot = (W - 2 * PADX) / n;
  const X = (i: number) => PADX + slot * (i + 0.5);
  const max = Math.max(...data.map((r) => r.reorder_value), 1) * 1.2;
  const Y = (v: number) => BY - (v / max) * (BY - PADT);
  const bw = Math.min(slot * 0.5, 52);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-[17px] font-bold" style={{ color: INK }}>Reorder pressure by department</h2>
        <span className="text-[12.5px] font-medium" style={{ color: MUT }}>cash needed to restock</span>
      </div>
      <p className="text-[12.5px] mb-3" style={{ color: MUT }}>Which departments need the most spend to get back to healthy stock.</p>
      <div className="flex-1" style={{ minHeight: 300 }}>
        {!data.length ? <div className="flex items-center justify-center h-full text-[13px]" style={{ color: MUT }}>Loading…</div> : (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setActive(-1)}>
            <line x1={PADX - 6} y1={BY} x2={W - PADX + 6} y2={BY} stroke={LINE} strokeWidth="1.5" />
            {data.map((r, i) => { const x = X(i) - bw / 2, y = Y(r.reorder_value), h = BY - y, isA = i === active;
              return <path key={`b${i}`} d={topBar(x, y, bw, h, 7)} fill={isA ? "#c98a26" : AMBER} style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `vmGrow .7s cubic-bezier(.22,1,.36,1) ${120 + i * 80}ms both`, transition: "fill .15s ease" }} />; })}
            {data.map((r, i) => <text key={`v${i}`} x={X(i)} y={Y(r.reorder_value) - 10} textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 700, fill: INK, animation: `vmFade .5s ease ${560 + i * 80}ms both` }}>{inr(r.reorder_value)}</text>)}
            {data.map((r, i) => (
              <g key={`l${i}`} style={{ animation: `vmFade .5s ease ${640 + i * 80}ms both` }}>
                <text x={X(i)} y={BY + 20} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: INK2 }}>{nm(r.group, 13)}</text>
                <text x={X(i)} y={BY + 35} textAnchor="middle" style={{ fontSize: 10.5, fill: MUT }}>{num(r.reorder_count)} items</text>
              </g>
            ))}
            {data.map((r, i) => <rect key={`h${i}`} x={X(i) - slot / 2} y={0} width={slot} height={H} fill="transparent" onMouseEnter={() => setActive(i)} style={{ cursor: "pointer" }} />)}
          </svg>
        )}
      </div>
    </Card>
  );
}

// Horizontal stock-health spectrum: segments sized by SKU count, understock→overstock.
function Spectrum({ spectrum, total }: { spectrum: any[]; total: number }) {
  const on = useMount(180);
  const segs = spectrum || [];
  const tot = segs.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <Card>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-[18px] font-bold" style={{ color: INK }}>Stock health across the catalogue</h2>
        <span className="text-[12.5px] font-medium cursor-help" style={{ color: MUT }} title="One row per item per hospital/plant — the same medicine can be short at one hospital and excess at another.">{num(total)} item–locations</span>
      </div>
      <p className="text-[12.5px] mb-5" style={{ color: MUT }}>Every item placed on a spectrum from too little stock to too much — so you can see both risks at once.</p>
      {/* segmented spectrum */}
      <div className="flex gap-1 h-14 mb-2">
        {segs.map((s, i) => (
          <div key={i} className="rounded-lg relative flex items-center justify-center overflow-hidden group" title={`${s.status} · ${num(s.count)} · ${inr(s.value)}`}
            style={{ width: on ? `${Math.max((s.count / tot) * 100, 3)}%` : "0%", background: SC[s.status], transition: `width .9s cubic-bezier(.22,1,.36,1) ${i * 70}ms`, minWidth: 34 }}>
            <span className="text-[12px] font-bold text-white tabular-nums px-1 truncate">{(s.count / tot) >= 0.05 ? num(s.count) : ""}</span>
          </div>
        ))}
      </div>
      {/* direction scale */}
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide mb-5" style={{ color: MUT }}>
        <span style={{ color: RED }}>◄ Too little (buy)</span>
        <span style={{ color: GREEN }}>Healthy</span>
        <span style={{ color: SLATE }}>Too much (hold) ►</span>
      </div>
      {/* legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {segs.map((s, i) => (
          <div key={i} className="rounded-xl px-3.5 py-3" style={{ background: SC_BG[s.status] }}>
            <div className="flex items-center gap-1.5 mb-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SC[s.status] }} /><span className="text-[11.5px] font-semibold" style={{ color: INK2 }}>{s.status}</span></div>
            <div className="text-[18px] font-extrabold tabular-nums leading-none" style={{ color: INK }}>{num(s.count)}</div>
            <div className="text-[11px] mt-1 tabular-nums" style={{ color: MUT }}>{inr(s.value)} value</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatTile({ icon: Icon, color, bg, label, value, sub }: any) {
  return (
    <Card pad="p-5" className="flex items-center gap-4">
      <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}><Icon size={22} /></span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: MUT }}>{label}</div>
        <div className="text-[24px] font-extrabold tabular-nums leading-tight" style={{ color: INK }}>{value}</div>
        <div className="text-[12px]" style={{ color: MUT }}>{sub}</div>
      </div>
    </Card>
  );
}

function OrderNow({ rows }: { rows: any[] }) {
  const data = (rows || []).slice(0, 7);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ color: INK }}><TbShoppingCartPlus size={18} style={{ color: AMBER }} />Order now</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>biggest reorders by value</span>
      </div>
      <p className="text-[12px] mb-4" style={{ color: MUT }}>Low cover + high value — restock these first.</p>
      <div className="flex-1 flex flex-col divide-y" style={{ borderColor: LINE }}>
        {data.map((r, i) => { const urgent = r.cover < 1; return (
          <div key={i} className="vm-row flex items-center gap-3 py-3" style={{ animationDelay: `${i * 55}ms` }}>
            <span className="w-1.5 h-9 rounded-full flex-shrink-0" style={{ background: urgent ? RED : AMBER }} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{nm(r.desc, 26)}</div>
              <div className="text-[11.5px] mt-0.5 flex items-center gap-1.5" style={{ color: urgent ? RED : MUT }}>{urgent && <TbAlertTriangle size={12} />}{cover(r.cover)} · {r.group}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[13.5px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.value)}</div>
              <div className="text-[11px] tabular-nums" style={{ color: MUT }}>order {num(r.qty)}</div>
            </div>
          </div>); })}
      </div>
    </Card>
  );
}

function SittingTooLong({ rows }: { rows: any[] }) {
  const data = (rows || []).slice(0, 7);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ color: INK }}><TbHourglassHigh size={18} style={{ color: SLATE }} />Sitting too long</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>most cash locked in old stock</span>
      </div>
      <p className="text-[12px] mb-4" style={{ color: MUT }}>Aged over 6 months — review, redistribute or return.</p>
      <div className="flex-1 flex flex-col divide-y" style={{ borderColor: LINE }}>
        {data.map((r, i) => (
          <div key={i} className="vm-row flex items-center gap-3 py-3" style={{ animationDelay: `${i * 55}ms` }}>
            <span className="w-1.5 h-9 rounded-full flex-shrink-0" style={{ background: r.bucket === "1+ Year" ? DARK : SLATE }} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{nm(r.desc, 26)}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: MUT }}>{r.aging_days} days old · {r.group}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[13.5px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.value)}</div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: r.bucket === "1+ Year" ? "#e2e4e9" : "#eceef1", color: r.bucket === "1+ Year" ? DARK : SLATE }}>{r.bucket}</span>
            </div>
          </div>))}
      </div>
    </Card>
  );
}

// Cash locked by age — a ladder that darkens as stock gets older.
function AgingLadder({ ladder }: { ladder: any[] }) {
  const on = useMount(220);
  const rows = ladder || [];
  const max = Math.max(...rows.map((r) => r.value), 1);
  const cols = [GREEN, AMBER, SLATE, DARK];
  return (
    <Card className="h-full" pad="p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[16px] font-bold" style={{ color: INK }}>Cash locked by age</h3>
        <span className="text-[12px] font-medium" style={{ color: MUT }}>stock value by how long held</span>
      </div>
      <p className="text-[12px] mb-5" style={{ color: MUT }}>Older stock is riskier — the darker the bar, the closer to waste.</p>
      <div className="flex flex-col gap-4">
        {rows.map((r, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[12.5px] font-semibold" style={{ color: INK2 }}>{r.bucket}</span>
              <span className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.value)} <span className="text-[11px] font-normal" style={{ color: MUT }}>· {num(r.count)} items</span></span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "#eef0f3" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: cols[i % cols.length], transition: `width .9s cubic-bezier(.22,1,.36,1) ${i * 90}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ItemChecker({ region }: { region: string }) {
  const [cat, setCat] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<{ Material: string; ["Material Description"]: string } | null>(null);
  const [info, setInfo] = useState<any>(null); const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetch(`/forecastMappings/${region}_forecast_material_catalogue.json`).then((r) => r.json())
      .then((d: any[]) => { setCat(d || []); if (d?.length) setSel(d[0]); }).catch(() => setCat([]));
  }, [region]);
  useEffect(() => {
    if (!sel) return; setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}/forecast/item-risk?Plant=${encodeURIComponent(region)}&Material=${encodeURIComponent(sel.Material)}`)
      .then((r) => r.json()).then(setInfo).catch(() => setInfo(null)).finally(() => setLoading(false));
  }, [sel, region]);
  const filtered = q ? cat.filter((c) => (c["Material Description"] || "").toLowerCase().includes(q.toLowerCase()) || String(c.Material).includes(q)).slice(0, 40) : cat.slice(0, 40);
  const st = info?.status; const col = st ? SC[st] : MUT;
  return (
    <Card className="h-full" pad="p-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-[16px] font-bold" style={{ color: INK }}>Check any item</h3>
          <p className="text-[12.5px] mt-1" style={{ color: MUT }}>search a medicine or supply for its reorder status</p>
        </div>
        <div className="relative" style={{ minWidth: 260 }}>
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ border: `1px solid ${open ? INK : BORDER}`, background: open ? "#fff" : CREAM, transition: "all .15s" }}>
            <TbSearch size={15} style={{ color: open ? INK : MUT }} />
            <input value={open ? q : (sel?.["Material Description"] || "")} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setQ(""); setOpen(true); }}
              placeholder="Search item…" className="flex-1 bg-transparent text-[13px] focus:outline-none" style={{ color: INK }} />
          </div>
          {open && (
            <div className="absolute z-20 mt-1.5 w-full max-h-56 overflow-auto rounded-xl bg-white py-1" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 18px 40px -16px rgba(20,22,40,0.25)" }}>
              {filtered.map((c) => (
                <button key={c.Material} onClick={() => { setSel(c); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-[#f6f6f8] transition-colors flex items-center gap-2.5 group">
                  <TbBox size={14} style={{ color: MUT }} />
                  <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium truncate" style={{ color: INK }}>{nm(c["Material Description"], 38)}</div><div className="text-[10.5px]" style={{ color: MUT }}>{c.Material}</div></div>
                  <TbChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: MUT }} />
                </button>
              ))}
              {!filtered.length && <div className="px-3 py-3 text-[12.5px]" style={{ color: MUT }}>No item found.</div>}
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <div className="py-14 flex items-center justify-center gap-2 text-[13px]" style={{ color: MUT }}><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${INK} transparent ${INK} ${INK}` }} />Checking…</div>
      ) : info?.found ? (
        <div key={info.material} className="vm-fade">
          <div className="rounded-2xl px-5 py-4 flex items-center gap-4 mb-4" style={{ background: SC_BG[st] || CREAM }}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: col, color: "#fff" }}><TbClockExclamation size={20} /></span>
            <div className="min-w-0">
              <div className="text-[15px] font-bold" style={{ color: INK }}>{st}</div>
              <div className="text-[12px]" style={{ color: INK2 }}>{ADVICE[st] || ""}</div>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: MUT }}>cover</div>
              <div className="text-[16px] font-extrabold tabular-nums" style={{ color: INK }}>{info.cover >= 999 ? "—" : `${info.cover.toFixed(1)}mo`}</div>
            </div>
          </div>
          <div className="text-[12.5px] font-semibold truncate mb-3" style={{ color: INK2 }} title={info.desc}>{info.desc}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[["On hand", num(info.stock)], ["Monthly use", num(info.demand_monthly)], ["To order", num(info.reorder_qty)], ["Order value", inr(info.reorder_value)],
              ["Stock value", inr(info.stock_value)], ["Safety stock", num(info.safe_stock)], ["Age", `${info.aging_days}d`], ["3-mo need", num(info.demand_forecast)]].map(([l, v], i) => (
              <div key={i} className="rounded-xl px-3.5 py-2.5" style={{ border: `1px solid ${BORDER}` }}>
                <div className="text-[10.5px] uppercase tracking-wide font-medium" style={{ color: MUT }}>{l}</div>
                <div className="text-[15px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="py-14 text-center text-[13px]" style={{ color: MUT }}>Pick an item to see its status.</div>}
    </Card>
  );
}

export default function ReplenishmentRiskDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { setData(null); fetch(`${DASHBOARD_API_BASE_URL}/forecast/replenishment-insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
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
      `}</style>

      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: MUT }}>Forecasting</div>
            <h1 className="text-[29px] font-extrabold leading-none tracking-tight" style={{ color: INK }}>Reorder &amp; Stock Risk</h1>
            <p className="text-[13px] mt-2" style={{ color: MUT }}>What to reorder now, and what's sitting too long · {region}</p>
          </div>
          <span title="6-month back-test accuracy measured at the aggregate/category level — reliable for planning totals, not a per-item guarantee." className="inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-xl cursor-help" style={{ color: INK2, background: CARD, border: `1px solid ${BORDER}` }}><span className="w-2 h-2 rounded-full" style={{ background: GREEN }} />{Number(t.accuracy ?? 0).toFixed(0)}% forecast reliability</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <StatTile icon={TbShoppingCartPlus} color={AMBER} bg="#f6ecd5" label="Reorder now" value={<CountUp value={Number(t.reorder_skus ?? 0)} format={num} />} sub={`${inr(Number(t.reorder_value ?? 0))} to spend`} />
          <StatTile icon={TbPackageOff} color={RED} bg="#f7e6e0" label="Stock-out risk" value={<CountUp value={Number(t.stockout_skus ?? 0)} format={num} />} sub="items with nothing on hand" />
          <StatTile icon={TbHourglassHigh} color={SLATE} bg="#e9ebef" label="Cash in aging stock" value={inr(Number(t.aging_value ?? 0))} sub={`${num(Number(t.aging_skus ?? 0))} items over 6 months`} />
        </div>

        <div className="mb-5"><Spectrum spectrum={data?.spectrum || []} total={Number(t.total_skus ?? 0)} /></div>

        <div className="mb-5"><ReorderByCategory rows={data?.by_category || []} /></div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch mb-5">
          <OrderNow rows={data?.order_now || []} />
          <SittingTooLong rows={data?.aging || []} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          <div className="xl:col-span-5"><AgingLadder ladder={data?.ladder || []} /></div>
          <div className="xl:col-span-7"><ItemChecker region={region} /></div>
        </div>

        <div className="mt-5 rounded-2xl px-5 py-4 text-[12px] leading-relaxed" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUT }}>
          <b style={{ color: INK2 }}>How to read this:</b> "cover" is how long current stock lasts at forecast usage. Items with under a month of cover are reorder priorities; items aged past 6 months are tying up cash and risk expiry. Numbers are per item-per-location, so the same medicine can appear as short at one hospital and excess at another.
        </div>
      </div>
    </div>
  );
}
