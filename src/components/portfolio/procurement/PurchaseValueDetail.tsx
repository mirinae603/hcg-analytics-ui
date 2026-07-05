"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, catName, useMount } from "@/components/portfolio/kit";
import { ProcShell, TableCard, Panel, INK, SUBTLE, EMER, TEAL, INDIGO } from "./parts";
import { WaveHero, DonutCard } from "./ExecCards";
import { TbCoin, TbBuildingFactory2, TbMapPin, TbChartTreemap } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// ── Squarified treemap layout (returns rects in a 100×100 space) ──
function squarify(items: { value: number; it: any }[], W: number, H: number) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const scale = (W * H) / total;
  const out: { x: number; y: number; w: number; h: number; it: any }[] = [];
  let x = 0, y = 0, w = W, h = H;
  const rem = items.map((i) => ({ it: i.it, a: i.value * scale }));
  const wr = (row: any[], len: number) => { const sum = row.reduce((s, r) => s + r.a, 0); const mx = Math.max(...row.map((r) => r.a)); const mn = Math.min(...row.map((r) => r.a)); return Math.max((len * len * mx) / (sum * sum), (sum * sum) / (len * len * mn)); };
  let guard = 0;
  while (rem.length && guard++ < 500) {
    const len = Math.min(w, h) || 1;
    const row: any[] = [];
    while (rem.length) { const cand = [...row, rem[0]]; if (row.length === 0 || wr(cand, len) <= wr(row, len)) row.push(rem.shift()); else break; }
    const sum = row.reduce((s, r) => s + r.a, 0) || 1;
    if (w >= h) { const cw = sum / h; let cy = y; row.forEach((r) => { const rh = r.a / cw; out.push({ x, y: cy, w: cw, h: rh, it: r.it }); cy += rh; }); x += cw; w -= cw; }
    else { const rh = sum / w; let cx = x; row.forEach((r) => { const rw = r.a / rh; out.push({ x: cx, y, w: rw, h: rh, it: r.it }); cx += rw; }); y += rh; h -= rh; }
  }
  return out;
}

const TM_PALETTE = ["#0e9f6e", "#0d9488", "#10b981", "#13a06f", "#14b8a6", "#2dd4bf", "#34d399", "#22c39a", "#5eead4", "#6ee7b7", "#99f6e4"];

function SpendTreemap({ cats, spend }: { cats: any[]; spend: number }) {
  const on = useMount(200); const [hov, setHov] = useState<number | null>(null);
  const items = cats.filter((c: any) => c.value > 0).slice(0, 9).map((c: any) => ({ value: c.value, it: c }));
  const rects = squarify(items, 100, 100);
  return (
    <Panel delay={220} className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: INK }}><TbChartTreemap size={16} style={{ color: EMER }} />Category spend map</h3>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${EMER}12`, color: EMER }}>{cats.length} categories</span>
      </div>
      <p className="text-[12px] mb-4" style={{ color: SUBTLE }}>blocks sized by purchase value · hover for detail</p>
      <div className="relative w-full flex-1" style={{ minHeight: 380 }}>
        {rects.map((r, i) => {
          const c = r.it; const col = c.uncat ? "#aab2c2" : TM_PALETTE[i % TM_PALETTE.length];
          const big = r.w > 14 && r.h > 22; const nameTier = r.w > 11 && r.h > 13; const valTier = r.w > 6 && r.h > 6; const active = hov === i;
          const share = spend ? (c.value / spend) * 100 : 0;
          return (
            <div key={i} className="absolute" style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%`, padding: 3 }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
              <div className="w-full h-full rounded-[10px] overflow-hidden p-2.5 flex flex-col justify-between cursor-default min-h-0"
                style={{ background: `linear-gradient(135deg,${col},${col}cc)`, boxShadow: active ? `0 12px 26px -8px ${col}99` : "none", transform: active ? "scale(0.975)" : "scale(1)", transition: `opacity 0.6s ease ${i * 35}ms, transform 0.25s ease, box-shadow 0.25s ease`, opacity: on ? 1 : 0, outline: active ? "2px solid rgba(255,255,255,0.5)" : "none", outlineOffset: -2 }}>
                {(big || nameTier) && (
                  <div className="text-[11px] font-semibold leading-tight min-w-0" style={{ color: "rgba(255,255,255,0.96)", display: "-webkit-box", WebkitLineClamp: big ? 2 : 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{catName(c.name)}</div>
                )}
                {valTier && (
                  <div className="mt-auto">
                    <div className="text-[14px] font-bold tabular-nums leading-none" style={{ color: "#fff" }}>{inrAbbr(c.value)}</div>
                    {big && <div className="text-[10px] mt-1 tabular-nums" style={{ color: "rgba(255,255,255,0.78)" }}>{share.toFixed(1)}% · {countAbbr(c.lines)} ln</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* floating tooltip */}
        {hov != null && rects[hov] && (() => { const c = rects[hov].it; const r = rects[hov]; const share = spend ? (c.value / spend) * 100 : 0;
          return (<div className="absolute pointer-events-none z-10" style={{ left: `${r.x + r.w / 2}%`, top: `${r.y}%`, transform: "translate(-50%,-110%)" }}>
            <div className="px-3 py-2 rounded-xl whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 12px 28px -10px rgba(40,52,86,0.45)", border: "1px solid #eef0f6" }}>
              <div className="text-[12px] font-semibold" style={{ color: INK }}>{catName(c.name)}</div>
              <div className="text-[12px] font-bold tabular-nums mt-0.5" style={{ color: c.uncat ? "#9aa1b3" : EMER }}>{inrAbbr(c.value)} · {share.toFixed(1)}% · {countAbbr(c.lines)} lines</div>
            </div></div>); })()}
      </div>
    </Panel>
  );
}

// ── Ranked gradient bars (vendors / plants) ──
function RankBars({ title, sub, rows, accent, icon: Icon, delay }: any) {
  const on = useMount(120); const max = Math.max(...rows.map((r: any) => r.value), 1);
  return (
    <Panel delay={delay} className="flex flex-col flex-1">
      <h3 className="text-[15px] font-semibold" style={{ color: INK }}>{title}</h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: SUBTLE }}>{sub}</p>
      <div className="space-y-3 flex-1 flex flex-col justify-between">
        {rows.map((r: any, i: number) => { const w = Math.max((r.value / max) * 100, 4); return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}14`, color: accent }}><Icon size={13} /></span>
                <span className="text-[12.5px] font-medium truncate" style={{ color: "#3c465c" }} title={r.name}>{r.name}</span>
              </div>
              <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{inrAbbr(r.value)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 rounded-full flex-1" style={{ background: "#eef1f0" }}>
                <div className="h-full rounded-full" style={{ width: on ? `${w}%` : "0%", background: `linear-gradient(90deg,${accent}cc,${accent})`, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms` }} />
              </div>
              <span className="text-[10.5px] tabular-nums flex-shrink-0 w-24 text-right" style={{ color: "#9aa1b3" }}>{r.sub}</span>
            </div>
          </div>
        ); })}
      </div>
    </Panel>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "vendor_name", label: "Vendor" }, { field: "category", label: "Category" },
  { field: "month", label: "Month" }, { field: "purchase_value", label: "Spend", kind: "inr" as const },
  { field: "purchase_qty", label: "Qty", kind: "num" as const }, { field: "po_lines", label: "PO Lines", kind: "num" as const },
];

export default function PurchaseValueDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/purchase-value/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const spend = Number(t.spend ?? 0), lines = Number(t.lines ?? 0), avgPo = Number(t.avg_po ?? 0), vendors = Number(t.vendors ?? 0);
  const allCats = data?.categories || [];
  const vendorRows = (data?.vendors || []).slice(0, 6).map((v: any) => ({ name: v.name, value: v.value, sub: `${v.share.toFixed(1)}% · ${countAbbr(v.lines)} ln` }));
  const plantRows = (data?.plants || []).slice(0, 6).map((p: any) => ({ name: p.plant, value: p.value, sub: `${p.vendors} vnd · ${countAbbr(p.lines)} ln` }));

  // composition donut
  const palette = ["#0e9f6e", "#0d9488", "#34d399", "#5eead4", "#99f6e4"];
  const top5 = allCats.slice(0, 5);
  const segTop = top5.map((c: any, i: number) => ({ label: catName(c.name).slice(0, 16), value: c.value, color: c.uncat ? "#cbd5e1" : palette[i] }));
  const rest = Math.max(0, spend - top5.reduce((s: number, c: any) => s + c.value, 0));
  const segments = [...segTop, ...(rest > 0 ? [{ label: "Other categories", value: rest, color: "#e2e8f0" }] : [])];
  const topReal = allCats.find((c: any) => !c.uncat);
  const topRealShare = topReal && spend ? (topReal.value / spend) * 100 : 0;
  const classifiedPct = spend ? (1 - (allCats.find((c: any) => c.uncat)?.value ?? 0) / spend) * 100 : 0;

  return (
    <ProcShell title="Purchase value" subtitle="what you spend, on what, and with whom" region={region}>
      <WaveHero eyebrow="Total procurement spend" icon={TbCoin} value={spend} format={inrAbbr}
        sub={`${countAbbr(lines)} PO lines · ${countAbbr(vendors)} vendors · 6-month window`}
        pills={[{ label: "Avg PO value", value: inrAbbr(avgPo) }, { label: "PO lines", value: countAbbr(lines) }, { label: "Vendors", value: countAbbr(vendors) }]}
        timeline={data?.timeline || []} peakFmt={inrAbbr} />

      <SpendTreemap cats={allCats} spend={spend} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        <div className="flex flex-col min-w-0">
          <div className="proc-card h-full" style={{ animationDelay: "160ms" }}>
            <DonutCard label="Spend composition" headline={spend} headSuffix="total spend" centerLabel="Categories"
              segments={segments} insights={[{ label: "Top cat", value: `${topRealShare.toFixed(0)}%`, color: EMER }, { label: "Classified", value: `${classifiedPct.toFixed(0)}%`, color: "#6b7280" }]}
              score={{ text: topRealShare >= 30 ? "Concentrated" : "Broad", value: Math.round(topRealShare), color: topRealShare >= 30 ? "#e0992f" : EMER }} />
          </div>
        </div>
        <div className="flex flex-col min-w-0"><RankBars title="Top vendors" sub="largest suppliers by spend" rows={vendorRows} accent={INDIGO} icon={TbBuildingFactory2} delay={200} /></div>
        <div className="flex flex-col min-w-0"><RankBars title="Spend by plant" sub="where purchasing happens" rows={plantRows} accent={TEAL} icon={TbMapPin} delay={240} /></div>
      </div>

      <TableCard title="PO-line purchase detail" sub="paginated · sortable · filterable · export CSV">
        <KpiTable kpiKey="purchase-value" plant={region} columns={COLUMNS} />
      </TableCard>
    </ProcShell>
  );
}
