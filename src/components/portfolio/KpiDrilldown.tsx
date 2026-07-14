"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Kpi } from "@/lib/kpiRegistry";
import { fmt } from "@/lib/kpiFormat";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ApexKpiChart from "./ApexKpiChart";

// Heavy material-react-table + MUI bundle — lazy-load it so the page shell,
// cards and chart paint instantly instead of blocking on MRT compilation.
const KpiTable = dynamic(() => import("./KpiTable"), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="h-9 w-48 rounded-lg bg-gray-100 animate-pulse mb-4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />
      ))}
    </div>
  ),
});

const CARD_THEMES = [
  { from: "#eff6ff", to: "#dbeafe", border: "rgba(59,130,246,0.2)", accent: "#3b82f6", text: "#1e40af" },
  { from: "#f0fdf4", to: "#dcfce7", border: "rgba(34,197,94,0.2)", accent: "#22c55e", text: "#15803d" },
  { from: "#fff7ed", to: "#ffedd5", border: "rgba(249,115,22,0.2)", accent: "#f97316", text: "#c2410c" },
  { from: "#faf5ff", to: "#f3e8ff", border: "rgba(147,51,234,0.2)", accent: "#9333ea", text: "#7e22ce" },
];

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Animated count-up number (matches original cards' premium feel).
function CountUpValue({ value, kind, className, style }: { value: number; kind: any; className?: string; style?: any }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const dur = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setV(value * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className} style={style}>{fmt(v, kind)}</span>;
}

export default function KpiDrilldown({ kpi }: { kpi: Kpi }) {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [chart, setChart] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const base = `${DASHBOARD_API_BASE_URL}/kpi/${kpi.key}`;
    const cp = new URLSearchParams({ Plant: region });
    if (kpi.chart?.groupBy) cp.set("group_by", kpi.chart.groupBy);
    if (kpi.chart?.measures) cp.set("measures", kpi.chart.measures);
    if (kpi.chart?.top) cp.set("top", String(kpi.chart.top));
    Promise.all([
      kpi.chart ? fetch(`${base}?${cp.toString()}`).then((r) => r.json()) : Promise.resolve([]),
      fetch(`${base}/summary?Plant=${encodeURIComponent(region)}`).then((r) => r.json()),
    ])
      .then(([c, s]) => { setChart(Array.isArray(c) ? c : []); setSummary(s || {}); })
      .catch(() => { setChart([]); setSummary({}); })
      .finally(() => setLoading(false));
  }, [kpi.key, region]);

  // Build summary stat cards from the registry summary config.
  const statCards = (kpi.summary || []).map((s) => {
    const node = summary[s.field] || {};
    const raw = s.agg === "count" ? node.distinct : (node[s.agg] ?? node.sum);
    return { label: s.label, value: Number(raw ?? 0), kind: s.kind };
  });
  if (summary.row_count != null)
    statCards.unshift({ label: "Total Records", value: Number(summary.row_count), kind: "num" as any });

  // Headline metric for the side gauge card.
  const headNode = summary[kpi.card.field] || {};
  const headVal = Number(
    kpi.card.agg === "count" ? headNode.distinct : (headNode[kpi.card.agg] ?? headNode.sum ?? 0)
  );
  const gaugePct = (() => {
    if (kpi.card.kind === "pct") return Math.min(headVal / 100, 1);
    if (kpi.card.kind === "inr") return Math.min(headVal / 2e8, 1);
    if (kpi.card.field.includes("aging") || kpi.card.field.includes("doh") || kpi.card.field.includes("day"))
      return Math.min(headVal / 365, 1);
    return Math.min(headVal / 100000, 1);
  })();
  const circ = 2 * Math.PI * 52;

  return (
    <div className="space-y-5">
      <PageBreadcrumb pageTitle={kpi.title} />

      {/* ── Summary stat cards ── */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((c, i) => {
            const t = CARD_THEMES[i % CARD_THEMES.length];
            return (
              <div key={i} className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)`, border: `1px solid ${t.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div className="text-xs font-medium mb-2" style={{ color: t.text, opacity: 0.75 }}>{c.label}</div>
                <CountUpValue value={c.value} kind={c.kind} className="text-2xl font-bold tabular-nums" style={{ color: t.text }} />
                <div className="mt-2 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${t.accent} 0%, transparent 100%)`, opacity: 0.4 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Chart (8) + headline gauge (4) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {kpi.chart && (
          <div className="xl:col-span-8 rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(186,230,253,0.5)", background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 24px rgba(59,130,246,0.06)" }}>
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-gray-50">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{kpi.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Overview · {region}</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: "rgba(70,95,255,0.08)", color: "#465fff" }}>
                {kpi.chart.type === "donut" ? "Distribution" : kpi.chart.type === "bar" ? "Breakdown" : "Trend"}
              </span>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
                  <span className="text-sm text-gray-400">Loading chart…</span>
                </div>
              ) : (
                <ApexKpiChart cfg={kpi.chart} data={chart} />
              )}
            </div>
          </div>
        )}

        {/* Headline gauge card */}
        <div className={`${kpi.chart ? "xl:col-span-4" : "xl:col-span-12"} rounded-2xl p-6 flex flex-col items-center justify-center text-center`}
          style={{ background: "linear-gradient(145deg,#f8fafc 0%,#eff6ff 100%)", border: "1px solid rgba(59,130,246,0.15)", boxShadow: "0 4px 24px rgba(59,130,246,0.06)" }}>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">{kpi.card.label}</span>
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="9" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="#465fff" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - gaugePct)}
                style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)", filter: "drop-shadow(0 2px 8px rgba(70,95,255,0.25))" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <CountUpValue value={headVal} kind={kpi.card.kind} className="text-2xl font-black text-gray-800 tabular-nums" />
              <span className="text-[10px] text-gray-400 mt-1">{Math.round(gaugePct * 100)}% of scale</span>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
            <span className="text-xs font-semibold text-gray-500">Live data · {region}</span>
          </div>
          {kpi.note && (
            <span className="mt-3 text-[11px] font-medium px-3 py-1.5 rounded-full"
              style={{ background: "rgba(251,100,20,0.08)", color: "#fb6514", border: "1px solid rgba(251,100,20,0.2)" }}>
              ⚠ {kpi.note}
            </span>
          )}
        </div>
      </div>

      {/* ── Detail table (lazy-loaded) ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(186,230,253,0.5)", background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 24px rgba(59,130,246,0.06)" }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Detail Records</h3>
          <p className="text-xs text-gray-400 mt-0.5">Paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey={kpi.key} plant={region} columns={kpi.columns} />
      </div>
    </div>
  );
}
