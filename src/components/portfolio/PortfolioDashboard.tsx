"use client";
import { useEffect, useState } from "react";
import { byPortfolio, PORTFOLIOS } from "@/lib/kpiRegistry";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import ExecutiveKpiCard from "./ExecutiveKpiCard";

export default function PortfolioDashboard({ portfolio }: { portfolio: string }) {
  const meta = PORTFOLIOS.find((p) => p.key === portfolio);
  const kpis = byPortfolio(portfolio);
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}/portfolio/${portfolio}/summary?Plant=${encodeURIComponent(region)}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary({}))
      .finally(() => setLoading(false));
  }, [portfolio, region]);

  return (
    <div className="space-y-6">
      {/* Portfolio header */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
          style={{ background: "linear-gradient(135deg,rgba(70,95,255,0.12) 0%,rgba(0,134,201,0.08) 100%)", border: "1px solid rgba(70,95,255,0.2)" }}>
          {meta?.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{meta?.name} Portfolio</h1>
          <p className="text-sm text-gray-400 mt-0.5">{meta?.desc} · {kpis.length} KPIs · {region}</p>
        </div>
        {loading && (
          <div className="ml-auto flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
            <span className="text-xs text-gray-400">Loading…</span>
          </div>
        )}
      </div>

      {/* KPI Cards grid — 3 columns like original executive dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpis.map((kpi, idx) => (
          <ExecutiveKpiCard
            key={kpi.key}
            kpi={kpi}
            node={loading ? null : summary[kpi.key]}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}
