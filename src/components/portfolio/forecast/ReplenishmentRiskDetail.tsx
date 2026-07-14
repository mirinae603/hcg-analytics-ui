"use client";
// "Reorder & Stock Risk" — an ACTION board (not a time-series). Same editorial
// neutral base as the other forecast pages, but its own language: a stock-health
// spectrum (too little → too much), twin risk leaderboards, an aging-cash ladder
// and a per-item status checker. Traffic-light semantics for at-a-glance triage.
import React, { useEffect, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { useMount, CountUp } from "@/components/portfolio/kit";
import { TbShoppingCartPlus, TbAlertTriangle, TbHourglassHigh, TbSearch, TbChevronRight, TbPackageOff, TbClockExclamation, TbBox, TbX, TbDownload } from "react-icons/tb";

const BG = "#e8eaee", CARD = "#ffffff", CREAM = "#f4f3ef", INK = "#1b1c22", INK2 = "#41444f", MUT = "#8a8f9d", FAINT = "#c4c8d2", LINE = "#ecedf1", BORDER = "#e7e8ee";
const RED = "#d86a4f", AMBER = "#dda23f", GREEN = "#5f9d6f", SLATE = "#8b93a8", DARK = "#4b5060";
const SC: Record<string, string> = { "Stock-out": RED, "Reorder now": AMBER, "Healthy": GREEN, "Overstocked": SLATE, "Dead stock": DARK };
const SC_BG: Record<string, string> = { "Stock-out": "#f7e6e0", "Reorder now": "#f6ecd5", "Healthy": "#e3efe5", "Overstocked": "#e9ebef", "Dead stock": "#e2e4e9" };
const ADVICE: Record<string, string> = { "Stock-out": "Out of stock — order immediately", "Reorder now": "Running low — reorder soon", "Healthy": "Well covered — no action", "Overstocked": "More than enough — hold buying", "Dead stock": "Not moving — review or return" };
const nm = (s: string, n = 26) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const num = (v: number) => Math.round(Number(v) || 0).toLocaleString("en-IN");
const inr = (v: number) => { v = Number(v) || 0; const a = Math.abs(v), s = v < 0 ? "-" : ""; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a / 1e7 >= 100 ? 0 : 1)}Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(a / 1e5 >= 100 ? 0 : 1)}L`; if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}K`; return `${s}₹${Math.round(a)}`; };
const cover = (m: number) => (m >= 999 ? "no demand" : m < 1 ? `${Math.round(m * 30)} days left` : `${m.toFixed(1)} mo cover`);

function Card({ children, className = "", style = {}, pad = "p-6", onClick }: any) {
  return <div onClick={onClick} className={`vm-card rounded-[20px] ${pad} ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, ...style }}>{children}</div>;
}
const topBar = (x: number, y: number, w: number, h: number, r: number) => { r = Math.max(0, Math.min(r, w / 2, h)); return `M${x} ${y + h} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h} Z`; };

// Slide-over drill — the full item list behind any risk cut (the client's #1 ask:
// "which items are at risk — I should get the list"). Searchable + CSV export.
function RiskDrill({ drill, region, onClose }: { drill: any; region: string; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const open = !!drill;
  useEffect(() => {
    if (!drill) return;
    setLoading(true); setQ(""); setD(null);
    fetch(`${DASHBOARD_API_BASE_URL}/forecast/risk-items?${drill.query}&Plant=${encodeURIComponent(region)}&limit=500`)
      .then((r) => r.json()).then(setD).catch(() => setD({ items: [], count: 0, returned: 0 })).finally(() => setLoading(false));
  }, [drill, region]);
  const items = (d?.items || []).filter((it: any) => !q || (it.desc || "").toLowerCase().includes(q.toLowerCase()) || String(it.material).includes(q));
  const exportCsv = () => {
    const rows = d?.items || []; if (!rows.length) return;
    const cols = ["material", "desc", "group", "status", "stock", "cover", "reorder_qty", "reorder_value", "stock_value", "aging_days"];
    const csv = [cols.join(",")].concat(rows.map((r: any) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${String(drill.title || "items").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
  };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(18,20,32,0.34)", backdropFilter: "blur(2px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s ease" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 61, width: "min(560px, 94vw)", background: "#fff", boxShadow: "-26px 0 64px -22px rgba(20,24,40,0.34)", transform: open ? "translateX(0)" : "translateX(101%)", transition: "transform .34s cubic-bezier(.22,1,.36,1)", display: "flex", flexDirection: "column" }}>
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUT }}>Item list</div>
              <h3 className="text-[19px] font-extrabold leading-tight truncate" style={{ color: INK }}>{drill?.title}</h3>
              <p className="text-[12.5px] mt-0.5" style={{ color: MUT }}>{d ? `${num(d.count)} items${d.count > d.returned ? ` · showing top ${num(d.returned)}` : ""}` : "loading…"}</p>
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
            <div className="py-16 flex items-center justify-center gap-2 text-[13px]" style={{ color: MUT }}><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${INK} transparent ${INK} ${INK}` }} />Loading…</div>
          ) : items.length ? items.map((r: any, i: number) => {
            const primary = r.reorder_value > 0 ? r.reorder_value : r.stock_value;
            const rightSub = r.reorder_qty > 0 ? `order ${num(r.reorder_qty)}` : r.aging_days > 180 ? `${r.aging_days}d old` : `on hand ${num(r.stock)}`;
            return (
              <div key={r.material + "-" + i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f8fa] transition-colors">
                <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: SC[r.status] || FAINT }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }} title={r.desc}>{r.desc}</div>
                  <div className="text-[11px] mt-0.5 truncate" style={{ color: MUT }}>{r.group} · {cover(r.cover)}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{inr(primary)}</div>
                  <div className="text-[10.5px] tabular-nums" style={{ color: MUT }}>{rightSub}</div>
                </div>
              </div>
            );
          }) : <div className="py-16 text-center text-[13px]" style={{ color: MUT }}>No items match.</div>}
        </div>
      </div>
    </>
  );
}

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
          <svg role="img" aria-label="Stock-out risk forecast: projected items at risk over the coming weeks" viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setActive(-1)}>
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
function Spectrum({ spectrum, total, onDrill }: { spectrum: any[]; total: number; onDrill: (d: any) => void }) {
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
          <button key={i} onClick={() => onDrill({ title: `${s.status} — items`, query: `status=${encodeURIComponent(s.status)}` })}
            className="group text-left rounded-xl px-3.5 py-3 cursor-pointer transition-transform hover:-translate-y-0.5" style={{ background: SC_BG[s.status] }}
            title={`See the ${num(s.count)} ${s.status} items`}>
            <div className="flex items-center gap-1.5 mb-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SC[s.status] }} /><span className="text-[11.5px] font-semibold" style={{ color: INK2 }}>{s.status}</span><TbChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: SC[s.status] }} /></div>
            <div className="text-[18px] font-extrabold tabular-nums leading-none" style={{ color: INK }}>{num(s.count)}</div>
            <div className="text-[11px] mt-1 tabular-nums" style={{ color: MUT }}>{inr(s.value)} value</div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function StatTile({ icon: Icon, color, bg, label, value, sub, onClick }: any) {
  return (
    <Card pad="p-5" onClick={onClick} className={`group flex items-center gap-4 ${onClick ? "cursor-pointer" : ""}`}
      style={onClick ? { transition: "box-shadow .18s, transform .18s" } : {}}>
      <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}><Icon size={22} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: MUT }}>{label}</div>
        <div className="text-[24px] font-extrabold tabular-nums leading-tight" style={{ color: INK }}>{value}</div>
        <div className="text-[12px]" style={{ color: MUT }}>{sub}</div>
      </div>
      {onClick && <span className="flex items-center gap-1 text-[11px] font-semibold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>View <TbChevronRight size={13} /></span>}
    </Card>
  );
}

function OrderNow({ rows, onDrill }: { rows: any[]; onDrill: (d: any) => void }) {
  const data = (rows || []).slice(0, 7);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ color: INK }}><TbShoppingCartPlus size={18} style={{ color: AMBER }} />Order now</h3>
        <button onClick={() => onDrill({ title: "Order now — all items", query: "kind=order_now" })} className="inline-flex items-center gap-0.5 text-[12px] font-semibold hover:underline" style={{ color: AMBER }}>See all <TbChevronRight size={13} /></button>
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

function SittingTooLong({ rows, onDrill }: { rows: any[]; onDrill: (d: any) => void }) {
  const data = (rows || []).slice(0, 7);
  return (
    <Card className="h-full flex flex-col" pad="p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ color: INK }}><TbHourglassHigh size={18} style={{ color: SLATE }} />Sitting too long</h3>
        <button onClick={() => onDrill({ title: "Sitting too long — all items", query: "kind=aging" })} className="inline-flex items-center gap-0.5 text-[12px] font-semibold hover:underline" style={{ color: SLATE }}>See all <TbChevronRight size={13} /></button>
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
function AgingLadder({ ladder, onDrill }: { ladder: any[]; onDrill: (d: any) => void }) {
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
      <p className="text-[12px] mb-5" style={{ color: MUT }}>Older stock is riskier — click a band to see the items.</p>
      <div className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <button key={i} onClick={() => onDrill({ title: `Aged ${r.bucket} — items`, query: `aging=${encodeURIComponent(r.bucket)}` })}
            className="group text-left rounded-lg -mx-1.5 px-1.5 py-1 cursor-pointer transition-colors hover:bg-[#f7f8fa]">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[12.5px] font-semibold inline-flex items-center gap-1" style={{ color: INK2 }}>{r.bucket}<TbChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: MUT }} /></span>
              <span className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{inr(r.value)} <span className="text-[11px] font-normal" style={{ color: MUT }}>· {num(r.count)} items</span></span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "#eef0f3" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: cols[i % cols.length], transition: `width .9s cubic-bezier(.22,1,.36,1) ${i * 90}ms` }} />
            </div>
          </button>
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
  const [drill, setDrill] = useState<any>(null);
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
          <StatTile icon={TbShoppingCartPlus} color={AMBER} bg="#f6ecd5" label="Reorder now" value={<CountUp value={Number(t.reorder_skus ?? 0)} format={num} />} sub={`${inr(Number(t.reorder_value ?? 0))} to spend`} onClick={() => setDrill({ title: "Reorder now — all items", query: "kind=order_now" })} />
          <StatTile icon={TbPackageOff} color={RED} bg="#f7e6e0" label="Stock-out risk" value={<CountUp value={Number(t.stockout_skus ?? 0)} format={num} />} sub="items with nothing on hand" onClick={() => setDrill({ title: "Stock-out — all items", query: "status=Stock-out" })} />
          <StatTile icon={TbHourglassHigh} color={SLATE} bg="#e9ebef" label="Cash in aging stock" value={inr(Number(t.aging_value ?? 0))} sub={`${num(Number(t.aging_skus ?? 0))} items over 6 months`} onClick={() => setDrill({ title: "Aging stock — all items", query: "kind=aging" })} />
        </div>

        <div className="mb-5"><Spectrum spectrum={data?.spectrum || []} total={Number(t.total_skus ?? 0)} onDrill={setDrill} /></div>

        <div className="mb-5"><ReorderByCategory rows={data?.by_category || []} /></div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch mb-5">
          <OrderNow rows={data?.order_now || []} onDrill={setDrill} />
          <SittingTooLong rows={data?.aging || []} onDrill={setDrill} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          <div className="xl:col-span-5"><AgingLadder ladder={data?.ladder || []} onDrill={setDrill} /></div>
          <div className="xl:col-span-7"><ItemChecker region={region} /></div>
        </div>

        <div className="mt-5 rounded-2xl px-5 py-4 text-[12px] leading-relaxed" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUT }}>
          <b style={{ color: INK2 }}>How to read this:</b> "cover" is how long current stock lasts at forecast usage. Items with under a month of cover are reorder priorities; items aged past 6 months are tying up cash and risk expiry. Numbers are per item-per-location, so the same medicine can appear as short at one hospital and excess at another.
        </div>
      </div>

      <RiskDrill drill={drill} region={region} onClose={() => setDrill(null)} />
    </div>
  );
}
