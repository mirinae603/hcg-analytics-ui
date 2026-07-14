"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TbClockExclamation, TbStack2 } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
  ),
});

const FONT = "Outfit, 'Segoe UI', sans-serif";
const MIST = "#F6F0EA";
const INK = "#3d2f28";
const AMBER = "#d99a4e", MAROON = "#b5524a";
const BUCKET_META: Record<string, { c: string; label: string }> = {
  "Expired": { c: "#b5524a", label: "Expired" }, "0-30d": { c: "#d9663e", label: "≤ 30 days" },
  "31-90d": { c: "#d99a4e", label: "31–90 days" }, "91-180d": { c: "#e0c06a", label: "91–180 days" },
};
const SLAB_ORDER = ["Expired", "0-30d", "31-90d", "91-180d", "181-365d", "365d+"];
const SLAB_META: Record<string, { human: string; c: string; bg: string }> = {
  "Expired": { human: "Expired", c: "#b5524a", bg: "#f6e4e1" },
  "0-30d": { human: "≤ 30 days", c: "#d9663e", bg: "#f8e6dc" },
  "31-90d": { human: "31–90 days", c: "#d99a4e", bg: "#f7ecd9" },
  "91-180d": { human: "91–180 days", c: "#c9a94f", bg: "#f6f0dc" },
  "181-365d": { human: "181–365 days", c: "#7f9b6b", bg: "#eef2e6" },
  "365d+": { human: "365+ days", c: "#9aa1ac", bg: "#eef0f3" },
};
const ACTIONABLE = new Set(["Expired", "0-30d", "31-90d", "91-180d"]);

const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
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
const PANEL_SHADOW = "0 12px 34px -22px rgba(61,47,40,0.16), 0 2px 7px -4px rgba(61,47,40,0.05)";
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 120 + delay); return () => clearTimeout(t); }, [delay]); return on; };

// ── IMMERSIVE EMBER HERO — sunset gradient, exposure + glowing expiry calendar ──
function EmberHero({ totals, buckets, timeline }: { totals: any; buckets: any[]; timeline: any[] }) {
  const on = useMount(0);
  const [hov, setHov] = useState<number | null>(null);
  const bById: Record<string, any> = {}; buckets.forEach((b) => { bById[b.bucket] = b; });
  const max = Math.max(...timeline.map((m) => m.value), 1);
  const peak = timeline.reduce((mx, m) => Math.max(mx, m.value), 0);
  const order = ["Expired", "0-30d", "31-90d", "91-180d"];
  return (
    <div className="relative rounded-[28px] overflow-hidden" style={{ minHeight: 300, background: "linear-gradient(125deg,#3c2017 0%,#7c3f25 44%,#c2773c 100%)", boxShadow: "0 24px 60px -28px rgba(60,30,18,0.65)" }}>
      <div className="absolute rounded-full blur-3xl" style={{ width: 280, height: 280, background: "#e8a44e", opacity: 0.22, top: -100, right: 90 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 170, height: 170, background: "#b5524a", opacity: 0.18, bottom: -40, left: 300 }} />
      <div className="relative flex flex-col lg:flex-row" style={{ minHeight: 300 }}>
        <div className="p-7 lg:p-9 lg:w-[400px] flex-shrink-0 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.55)" }}><TbClockExclamation size={14} />Expiry exposure</div>
          <div className="mt-3 text-[54px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 26px rgba(0,0,0,0.3)" }}><CountUp value={Number(totals.exposure ?? 0)} format={inrAbbr} /></div>
          <div className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.62)" }}>cost at risk · {inrAbbr(Number(totals.mrp_exposure ?? 0))} retail · {Number(totals.skus ?? 0).toLocaleString("en-IN")} batches</div>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {order.map((k) => { const b = bById[k] || { value: 0, count: 0 }; const m = BUCKET_META[k]; return (
              <div key={k} className="rounded-xl px-3 py-2" style={{ background: "rgba(0,0,0,0.18)", border: `1px solid ${m.c}55` }}>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: m.c, boxShadow: `0 0 8px ${m.c}` }} /><span className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.7)" }}>{m.label}</span></div>
                <div className="text-[14px] font-bold tabular-nums mt-0.5" style={{ color: "#fff" }}>{inrAbbr(b.value)}</div>
              </div>
            ); })}
          </div>
        </div>
        {/* glowing expiry calendar */}
        <div className="flex-1 p-7 lg:py-8 lg:pr-10 flex flex-col justify-center min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>Cost value expiring each upcoming month</span>
            <span className="text-[11px] font-medium min-h-[16px]" style={{ color: hov != null ? "#fff" : "rgba(255,255,255,0.5)" }}>{hov != null && timeline[hov] ? `${timeline[hov].label} · ${timeline[hov].count} batches` : "plan ahead of these dates"}</span>
          </div>
          <div className="flex items-end gap-2 sm:gap-3" style={{ height: 158 }} onMouseLeave={() => setHov(null)}>
            {timeline.map((m, i) => { const isPeak = m.value === peak; const h = (m.value / max) * 100; const c = isPeak ? "#e0584a" : "#e7b86a"; return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" onMouseEnter={() => setHov(i)}>
                <span className="text-[10.5px] font-bold tabular-nums mb-1.5" style={{ color: "#fff", opacity: on ? 1 : 0, transition: "opacity 0.5s ease 0.7s" }}>{inrAbbr(m.value)}</span>
                <div className="w-full rounded-t-lg" style={{ height: on ? `${Math.max(4, h)}%` : "0%", background: `linear-gradient(180deg,${c},${c}99)`, boxShadow: `0 0 22px -3px ${c}`, transition: `height 0.9s cubic-bezier(0.34,1.1,0.64,1) ${i * 70}ms` }} />
                <span className="text-[10px] font-medium mt-2" style={{ color: hov === i ? "#fff" : "rgba(255,255,255,0.55)" }}>{m.label}</span>
              </div>
            ); })}
            {!timeline.length && <div className="w-full text-center text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>No upcoming expiries.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Near-expiry by category (light) ──
function ByCategory({ cats, region }: { cats: any[]; region: string }) {
  const on = useMount(120); const max = Math.max(...cats.map((c) => c.value), 1);
  const catName = (g: string) => String(g).replace(/^M\d+-/, "");
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6 flex flex-col" style={{ animationDelay: "200ms", boxShadow: PANEL_SHADOW }}>
      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbStack2 size={16} style={{ color: AMBER }} />Expiry exposure by category</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">cost value near expiry · {region}</p>
      <div className="space-y-2.5 flex-1">
        {cats.slice(0, 10).map((c, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-gray-700 truncate flex-shrink-0" style={{ width: 150 }} title={catName(c.name)}>{catName(c.name)}</span>
            <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "#f0e6da" }}>
              <div className="h-full rounded-md" style={{ width: on ? `${(c.value / max) * 100}%` : "0%", background: "linear-gradient(90deg,#e7c074,#d9663e)", transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 45}ms` }} />
            </div>
            <span className="text-[12px] font-semibold tabular-nums flex-shrink-0 w-16 text-right" style={{ color: INK }}>{inrAbbr(c.value)}</span>
            <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0 w-12 text-right hidden sm:block">{c.skus.toLocaleString("en-IN")}</span>
          </div>
        ))}
        {!cats.length && <div className="py-12 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </div>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
  { field: "batch", label: "Batch" }, { field: "expiry_date", label: "Expiry", kind: "date" as const },
  { field: "days_to_expiry", label: "Days Left", kind: "num" as const }, { field: "expiry_bucket", label: "Bucket" },
  { field: "total_cost", label: "Value", kind: "inr" as const },
];

// ── FULL EXPIRY LADDER (client #3) — 6 clickable slabs → item drill ──
function ExpiryLadder({ ladder, asof, onDrill }: { ladder: any[]; asof?: string; onDrill: (slab: string) => void }) {
  const on = useMount(140);
  const byId: Record<string, any> = {}; (ladder || []).forEach((s) => { byId[s.slab] = s; });
  const rows = SLAB_ORDER.map((s) => ({ slab: s, value: 0, items: 0, lines: 0, ...(byId[s] || {}), meta: SLAB_META[s] }));
  const maxV = Math.max(...rows.map((r) => r.value), 1);
  const actionable = rows.filter((r) => ACTIONABLE.has(r.slab)).reduce((a, r) => a + (r.value || 0), 0);
  return (
    <div className="csv-card rounded-3xl bg-white p-5 md:p-6" style={{ animationDelay: "120ms", boxShadow: PANEL_SHADOW }}>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2"><TbClockExclamation size={16} style={{ color: MAROON }} />Expiry ladder</h3>
          <p className="text-xs text-gray-400 mt-0.5">shelf-life bands by cost value{asof ? ` · as on ${asof}` : ""} · click a band to see items</p>
        </div>
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "#f7e7e2", color: MAROON, border: "1px solid #ecccc4" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: MAROON }} />{inrAbbr(actionable)} within 180 days
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {rows.map((r, i) => (
          <button key={r.slab} type="button" onClick={() => onDrill(r.slab)}
            aria-label={`View ${r.meta.human} items — ${inrAbbr(r.value)}, ${(r.items || 0).toLocaleString("en-IN")} items`}
            className="group text-left rounded-2xl p-3.5 transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
            style={{ background: r.meta.bg, border: `1px solid ${r.meta.c}33`, boxShadow: "0 1px 2px rgba(61,47,40,0.04)" }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.meta.c }} />
              <span className="text-[11.5px] font-semibold truncate" style={{ color: INK }}>{r.meta.human}</span>
            </div>
            <div className="text-[19px] font-bold tabular-nums mt-2 leading-none" style={{ color: r.meta.c }}>{inrAbbr(r.value)}</div>
            <div className="text-[11px] text-gray-500 mt-1.5 tabular-nums">{(r.items || 0).toLocaleString("en-IN")} items · {(r.lines || 0).toLocaleString("en-IN")} batches</div>
            <div className="h-1.5 rounded-full mt-2.5" style={{ background: "#00000010" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${Math.max((r.value / maxV) * 100, 3)}%` : "0%", background: r.meta.c, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms` }} />
            </div>
            <div className="text-[10.5px] font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: r.meta.c }}>View items →</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Slab drill drawer — item list, search, CSV export ──
function ExpiryDrill({ slab, region, onClose }: { slab: string | null; region: string; onClose: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [count, setCount] = useState(0);
  const [asof, setAsof] = useState<string | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!slab) return;
    setRows(null); setQ("");
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/near-expiry/items?slab=${encodeURIComponent(slab)}&Plant=${encodeURIComponent(region)}&limit=500`)
      .then((r) => r.json()).then((d) => { setRows(d.items || []); setCount(d.count || 0); setAsof(d.asof || null); }).catch(() => setRows([]));
  }, [slab, region]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (slab) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slab, onClose]);
  const filtered = useMemo(() => {
    if (!rows) return [];
    const ql = q.trim().toLowerCase();
    return ql ? rows.filter((r) => String(r.desc || "").toLowerCase().includes(ql) || String(r.material).toLowerCase().includes(ql)) : rows;
  }, [rows, q]);
  const exportCsv = () => {
    const head = ["Material", "Description", "Batch", "Hospital", "Qty", "Value", "MRP", "Days Left", "Expiry", "Band"];
    const body = filtered.map((r) => [r.material, `"${String(r.desc || "").replace(/"/g, '""')}"`, r.batch || "", r.plant, r.qty, Math.round(r.value), Math.round(r.mrp), r.days, r.expiry || "", r.slab].join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `near-expiry-${slab}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  if (!slab) return null;
  const m = SLAB_META[slab] || { human: slab, c: AMBER, bg: "#f5f5f5" };
  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={`${m.human} expiry items`}>
      <div className="absolute inset-0" style={{ background: "rgba(40,26,20,0.42)", backdropFilter: "blur(2px)", animation: "exDrillFade 0.25s ease" }} onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-[620px] bg-white flex flex-col" style={{ boxShadow: "-24px 0 60px -30px rgba(40,26,20,0.5)", animation: "exDrillIn 0.32s cubic-bezier(0.22,1,0.36,1)" }}>
        <style>{`@keyframes exDrillIn{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes exDrillFade{from{opacity:0}to{opacity:1}}`}</style>
        <div className="px-6 py-5 flex items-start justify-between gap-4" style={{ background: m.bg, borderBottom: `1px solid ${m.c}22` }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: m.c }} /><h3 className="text-[16px] font-bold truncate" style={{ color: INK }}>{m.human}</h3></div>
            <p className="text-[12px] mt-1" style={{ color: "#7a6a60" }}>{count.toLocaleString("en-IN")} item lines expiring in this band{asof ? ` · as on ${asof}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: "rgba(0,0,0,0.06)", color: INK }}>×</button>
        </div>
        <div className="px-6 py-3 flex items-center gap-2 border-b border-gray-100">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item or code…" aria-label="Search items"
            className="flex-1 h-9 px-3 rounded-lg text-[13px] outline-none" style={{ background: "#f5f2ee", border: "1px solid #eae4dd", color: INK }} />
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className="h-9 px-3 rounded-lg text-[12px] font-semibold disabled:opacity-40" style={{ background: AMBER, color: "#fff" }}>Export CSV</button>
        </div>
        <div className="flex-1 overflow-auto">
          {rows === null ? (
            <div className="p-6">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-9 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div>
          ) : !filtered.length ? (
            <div className="py-20 text-center text-gray-400 text-sm">No items{q ? " match your search" : ""}.</div>
          ) : (
            <table className="w-full text-[12.5px]" style={{ borderCollapse: "collapse" }}>
              <thead className="sticky top-0" style={{ background: "#faf7f3" }}>
                <tr className="text-left" style={{ color: "#8a7a6f" }}>
                  <th className="font-medium px-4 py-2.5">Item</th><th className="font-medium px-2 py-2.5 text-right">Days</th>
                  <th className="font-medium px-2 py-2.5 whitespace-nowrap">Expiry</th><th className="font-medium px-2 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-4 py-2.5 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #f2ece5" }}>
                    <td className="px-4 py-2.5"><div className="font-medium truncate max-w-[240px]" style={{ color: INK }} title={r.desc}>{r.desc}</div><div className="text-[10.5px] text-gray-400">{r.material}{r.batch ? ` · ${r.batch}` : ""} · {r.plant}</div></td>
                    <td className="px-2 py-2.5 text-right tabular-nums" style={{ color: r.days < 0 ? MAROON : r.days <= 90 ? "#c67a2e" : "#6b7280" }}>{r.days}</td>
                    <td className="px-2 py-2.5 whitespace-nowrap tabular-nums text-gray-500">{r.expiry || "—"}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-gray-600">{Math.round(r.qty).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: INK }}>{inrAbbr(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NearExpiryDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  const [drill, setDrill] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/near-expiry/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-4 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)" }}>
      <PageBreadcrumb pageTitle="Near-Expiry Inventory" />

      <div className="csv-cards"><div className="csv-card" style={{ animationDelay: "0ms" }}>
        <EmberHero totals={data?.totals || {}} buckets={data?.buckets || []} timeline={data?.timeline || []} />
      </div></div>
      <style jsx global>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; min-width: 0; }
      `}</style>

      <ExpiryLadder ladder={data?.ladder || []} asof={data?.ladder_asof} onDrill={setDrill} />

      <ByCategory cats={data?.categories || []} region={region} />

      <div className="csv-card rounded-3xl bg-white overflow-hidden" style={{ animationDelay: "320ms", boxShadow: PANEL_SHADOW }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold text-gray-900">Batch-level expiry detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="near-expiry" plant={region} columns={COLUMNS} />
      </div>

      <ExpiryDrill slab={drill} region={region} onClose={() => setDrill(null)} />
    </div>
  );
}
