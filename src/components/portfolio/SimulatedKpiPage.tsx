"use client";
// A full KPI drill-down rendered on representative SIMULATED data — same layout,
// cards, chart & table as a live KPI, but badged "Simulated" and subtly faded so
// it's unmistakably a preview of what lands once HCG supplies the required data.
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { simKpiByKey } from "@/lib/kpiRegistry";
import { getSimulated } from "@/lib/simulatedKpi";
import { simVisual } from "@/lib/simKpiVisual";
import { fmt } from "@/lib/kpiFormat";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ApexKpiChart from "./ApexKpiChart";
import { TbFlask, TbDatabasePlus, TbBulb } from "react-icons/tb";

const CARD_THEMES = [
  { from: "#eef2ff", to: "#e0e7ff", border: "rgba(99,102,241,0.22)", accent: "#6366f1", text: "#4338ca" },
  { from: "#eff6ff", to: "#dbeafe", border: "rgba(59,130,246,0.2)", accent: "#3b82f6", text: "#1e40af" },
  { from: "#f0fdf4", to: "#dcfce7", border: "rgba(34,197,94,0.2)", accent: "#22c55e", text: "#15803d" },
  { from: "#fff7ed", to: "#ffedd5", border: "rgba(249,115,22,0.2)", accent: "#f97316", text: "#c2410c" },
];

function ease(t: number) { return 1 - Math.pow(1 - t, 3); }
function CountUp({ value, kind, className, style }: { value: number; kind: any; className?: string; style?: any }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (now: number) => { const p = Math.min((now - start) / 1300, 1); setV(value * ease(p)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className} style={style}>{fmt(v, kind)}</span>;
}

export default function SimulatedKpiPage({ kpiKey }: { kpiKey: string }) {
  const meta = simKpiByKey(kpiKey);
  const bundle = getSimulated(kpiKey);
  if (!meta || !bundle) return notFound();
  const { Icon, accent } = simVisual(kpiKey);

  const cards = [{ label: bundle.headline.label, value: bundle.headline.value, kind: bundle.headline.kind }, ...bundle.summary].slice(0, 4);
  const g = bundle.headline;
  const gaugePct = g.kind === "pct" ? Math.min(g.value / 100, 1) : g.kind === "inr" ? Math.min(g.value / 2e8, 1) : Math.min(g.value / 1e6, 1);
  const circ = 2 * Math.PI * 52;

  return (
    <div className="space-y-5">
      <PageBreadcrumb pageTitle={meta.title} />

      {/* ── Simulated banner ── */}
      <div className="rounded-2xl px-5 py-4 flex items-start gap-3.5 flex-wrap"
        style={{ background: "linear-gradient(100deg,#fef7ec 0%,#eef2ff 100%)", border: "1px solid #f2d9a8" }}>
        <span className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: accent + "16", color: accent, boxShadow: `inset 0 0 0 1px ${accent}22` }}>
          <Icon size={22} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-extrabold" style={{ color: "#1f2437" }}>Simulated preview</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-[3px] rounded-full" style={{ background: "#b7791f", color: "#fff" }}>Simulated Data</span>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-[3px] rounded shrink-0 mt-[1px]" style={{ background: "#e7f8f0", color: "#0a8f5b" }}>Real</span>
              <span className="text-[12px] leading-snug" style={{ color: "#4b5563" }}>{bundle.basis.real}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-[3px] rounded shrink-0 mt-[1px]" style={{ background: "#fdf0dc", color: "#b7791f" }}>Modelled</span>
              <span className="text-[12px] leading-snug" style={{ color: "#6b6250" }}>{bundle.basis.modelled}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-center px-3 py-2 rounded-xl" style={{ background: "#fff", border: "1px solid #e6dcc4" }}>
          <TbDatabasePlus size={16} style={{ color: "#6d5efc" }} />
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.06em]" style={{ color: "#9aa0b2" }}>Goes live with</div>
            <div className="text-[12px] font-semibold" style={{ color: "#454b60" }}>{meta.requires}</div>
          </div>
        </div>
      </div>

      {/* ── faded content ── */}
      <div style={{ opacity: 0.93, filter: "saturate(0.9)" }}>
        {/* summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c, i) => {
            const t = CARD_THEMES[i % CARD_THEMES.length];
            return (
              <div key={i} className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg,${t.from} 0%,${t.to} 100%)`, border: `1px solid ${t.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div className="text-xs font-medium mb-2" style={{ color: t.text, opacity: 0.75 }}>{c.label}</div>
                <CountUp value={c.value} kind={c.kind} className="text-2xl font-bold tabular-nums" style={{ color: t.text }} />
                <div className="mt-2 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg,${t.accent} 0%,transparent 100%)`, opacity: 0.4 }} />
              </div>
            );
          })}
        </div>

        {/* chart + gauge */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mt-5">
          <div className="xl:col-span-8 rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(186,230,253,0.5)", background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 24px rgba(59,130,246,0.06)" }}>
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-gray-50">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{meta.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Preview · representative data</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: accent + "14", color: accent }}>
                {bundle.chartCfg.type === "donut" ? "Distribution" : bundle.chartCfg.type === "bar" ? "Breakdown" : "Trend"}
              </span>
            </div>
            <div className="p-4"><ApexKpiChart cfg={bundle.chartCfg} data={bundle.chartData} /></div>
          </div>

          <div className="xl:col-span-4 rounded-2xl p-6 flex flex-col items-center justify-center text-center"
            style={{ background: `linear-gradient(145deg,#ffffff 0%,${accent}0d 100%)`, border: `1px solid ${accent}2b`, boxShadow: "0 4px 24px rgba(20,24,60,0.05)" }}>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">{g.label}</span>
            <div className="relative w-36 h-36">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="9" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - gaugePct)}
                  style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 2px 8px ${accent}40)` }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CountUp value={g.value} kind={g.kind} className="text-2xl font-black text-gray-800 tabular-nums" />
                {g.deltaPct != null && (
                  <span className="text-[11px] font-semibold mt-1" style={{ color: g.deltaPct >= 0 ? "#12b76a" : "#f04438" }}>
                    {g.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(g.deltaPct)}% MoM
                  </span>
                )}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: "#f0a52a" }} />
              <span className="text-xs font-semibold text-gray-500">Simulated · representative</span>
            </div>
          </div>
        </div>

        {/* insight */}
        <div className="mt-5 rounded-2xl px-5 py-3.5 flex items-start gap-2.5"
          style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.14)" }}>
          <TbBulb size={17} style={{ color: "#6366f1", flexShrink: 0, marginTop: 1 }} />
          <p className="text-[12.5px] font-medium" style={{ color: "#4b4f66" }}>{bundle.insight}</p>
        </div>

        {/* detail table */}
        <div className="mt-5 rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(186,230,253,0.5)", background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 24px rgba(59,130,246,0.06)" }}>
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Detail Records</h3>
              <p className="text-xs text-gray-400 mt-0.5">Representative rows · illustrative only</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-1 rounded-full" style={{ background: "#fdf3e2", color: "#b7791f" }}>Simulated</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {bundle.table.columns.map((col) => (
                    <th key={col.key} className="text-left font-semibold text-gray-500 px-5 py-3 whitespace-nowrap"
                      style={{ textAlign: col.kind && col.kind !== "text" ? "right" : "left" }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bundle.table.rows.map((row, ri) => (
                  <tr key={ri} style={{ borderTop: "1px solid #f1f5f9", background: ri % 2 ? "#fcfcfe" : "#fff" }}>
                    {bundle.table.columns.map((col) => (
                      <td key={col.key} className="px-5 py-2.5 whitespace-nowrap tabular-nums"
                        style={{ textAlign: col.kind && col.kind !== "text" ? "right" : "left", color: col.kind && col.kind !== "text" ? "#1f2937" : "#4b5563", fontWeight: col.kind && col.kind !== "text" ? 600 : 500 }}>
                        {col.kind && col.kind !== "text" ? fmt(Number(row[col.key] ?? 0), col.kind) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
