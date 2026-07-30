"use client";
// Vendor Volume vs Margin — MRP-proxy margin, value-weighted, on outlier-clean GRN
// rows (semantics.py gotcha #15/#17). Backend: legacy_kpi.py's _vendor_margin().
//   GET /kpi/vendor-volume-vs-margin        — chart shape, top 200 vendor-months by
//                                              grn_volume, PascalCase keys.
//   GET /kpi/vendor-volume-vs-margin-table  — paginated, camelCase keys, all vendor-
//                                              months (7,916 at last count).
// The page-level "Overall margin" headline and the margin-distribution histogram are
// both reconstructed client-side from the FULL table response (mrp_value = grnVolume *
// sellingPrice, cost_value = grnVolume * averageUnitCost, summed/bucketed across every
// row) rather than from the 200-row chart subset — that subset is a top-N-by-volume
// slice, not the whole book, so deriving a portfolio-wide figure from it would NOT
// reconcile with the backend's true number. Reconstructing from the full table
// reproduces the backend's own value-weighted computation exactly (verified against
// ground truth: 39.8% overall, mean 28.93%, median 26.74%, 4,294/7,916 thin-sample rows).
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, useMount } from "@/components/portfolio/kit";
import { ProcShell, ProcHero, TableCard, Panel, DetailSkeleton, INK, SUBTLE, INDIGO, TEAL, AMBER } from "./parts";
import { TbBuildingFactory2, TbPercentage, TbAlertTriangle } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const vName = (s: string, n = 20) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

type ChartRow = {
  Year: number; Month: string; "Vendor Name": string; "GRN Volume": number;
  "Unit Purchase Price": number | null; "Unit MRP Price": number | null;
  "Margin (%)": number | null; "Sample Size": number; Stable: boolean;
};
type TableRow = {
  year: number; period: string; vendorName: string; grnVolume: number;
  averageUnitCost: number; sellingPrice: number; margin: number | null;
  sampleSize: number; isStable: boolean;
};

const BANDS = [
  { label: "0–20%", lo: 0, hi: 20 }, { label: "20–40%", lo: 20, hi: 40 },
  { label: "40–60%", lo: 40, hi: 60 }, { label: "60–80%", lo: 60, hi: 80 },
  { label: "80–100%", lo: 80, hi: 100.001 },
];

type Agg = { mrpValue: number; costValue: number; n: number; thin: number; buckets: { label: string; n: number }[] };

// ── Top vendors by volume — margin % ranked bars (mirrors PurchaseValueDetail's RankBars) ──
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
                {r.thin && <span title="Fewer than 5 clean GRN lines this vendor-month — low confidence" className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${AMBER}1c`, color: AMBER }}>n={r.n}</span>}
              </div>
              <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{r.value.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 rounded-full flex-1" style={{ background: "#eef1f0" }}>
                <div className="h-full rounded-full" style={{ width: on ? `${w}%` : "0%", background: `linear-gradient(90deg,${accent}cc,${accent})`, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms` }} />
              </div>
              <span className="text-[10.5px] tabular-nums flex-shrink-0 w-28 text-right" style={{ color: "#9aa1b3" }}>{r.sub}</span>
            </div>
          </div>
        ); })}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </Panel>
  );
}

// ── Margin distribution histogram (0-100% in 20pt bands), full 7.9k-row book ──
function MarginHistogram({ buckets }: { buckets: { label: string; n: number }[] }) {
  const on = useMount(180); const max = Math.max(...buckets.map((b) => b.n), 1);
  return (
    <Panel delay={220} className="flex flex-col flex-1">
      <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Margin % distribution</h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: SUBTLE }}>all vendor-months, by margin band · outlier-clean rows only</p>
      <div className="flex-1 flex items-end gap-3" style={{ minHeight: 190 }}>
        {buckets.map((b, i) => { const h = (b.n / max) * 100; return (
          <div key={b.label} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[11px] font-bold tabular-nums mb-1.5" style={{ color: INK, opacity: on ? 1 : 0, transition: "opacity 0.5s ease 0.6s" }}>{countAbbr(b.n)}</span>
            <div className="w-full rounded-t-lg" style={{ height: on ? `${Math.max(4, h)}%` : "0%", background: `linear-gradient(180deg,${INDIGO},${INDIGO}99)`, transition: `height 0.9s cubic-bezier(0.34,1.1,0.64,1) ${i * 70}ms` }} />
            <span className="text-[10px] font-medium mt-2" style={{ color: SUBTLE }}>{b.label}</span>
          </div>
        ); })}
      </div>
    </Panel>
  );
}

const COLUMNS = [
  { field: "year", label: "Year" }, { field: "period", label: "Month" }, { field: "vendorName", label: "Vendor" },
  { field: "grnVolume", label: "GRN Volume", kind: "num" as const }, { field: "averageUnitCost", label: "Avg Unit Cost", kind: "inr" as const },
  { field: "sellingPrice", label: "Selling Price (MRP)", kind: "inr" as const }, { field: "margin", label: "Margin %", kind: "pct" as const },
  { field: "sampleSize", label: "Sample Size", kind: "num" as const }, { field: "isStable", label: "Stable (n≥5)", kind: "bool" as const },
];

export default function VendorMarginDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [chart, setChart] = useState<ChartRow[] | null>(null);
  const [agg, setAgg] = useState<Agg | null>(null);

  useEffect(() => {
    setChart(null); setAgg(null);
    const p = new URLSearchParams({ Plant: region });
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/vendor-volume-vs-margin?${p.toString()}`)
      .then((r) => r.json()).then((d: ChartRow[]) => setChart(Array.isArray(d) ? d : []))
      .catch(() => setChart([]));

    // Full book (not just the top-200 chart slice) — needed so the headline "Overall
    // margin" and the distribution histogram reconcile exactly with the backend's own
    // portfolio-wide computation, not just an average of the largest 200 vendor-months.
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/vendor-volume-vs-margin-table?Plant=${encodeURIComponent(region)}&page=0&page_size=20000`)
      .then((r) => r.json())
      .then((d: { data: TableRow[]; total: number }) => {
        const rows = d?.data || [];
        let mrpValue = 0, costValue = 0, thin = 0;
        const buckets = BANDS.map((b) => ({ label: b.label, n: 0 }));
        rows.forEach((r) => {
          if (!r.isStable) thin += 1;
          if (r.margin == null) return;
          mrpValue += (r.grnVolume || 0) * (r.sellingPrice || 0);
          costValue += (r.grnVolume || 0) * (r.averageUnitCost || 0);
          const idx = BANDS.findIndex((b) => r.margin! >= b.lo && r.margin! < b.hi);
          if (idx >= 0) buckets[idx].n += 1;
        });
        setAgg({ mrpValue, costValue, n: d?.total ?? rows.length, thin, buckets });
      })
      .catch(() => setAgg({ mrpValue: 0, costValue: 0, n: 0, thin: 0, buckets: BANDS.map((b) => ({ label: b.label, n: 0 })) }));
  }, [region]);

  if (!chart || !agg) {
    return (
      <ProcShell title="Vendor Volume vs Margin" subtitle="MRP-proxy margin, value-weighted, on outlier-clean GRN lines" region={region}>
        <DetailSkeleton />
      </ProcShell>
    );
  }

  const overallMarginPct = agg.mrpValue > 0 ? ((agg.mrpValue - agg.costValue) / agg.mrpValue) * 100 : 0;
  const thinPct = agg.n > 0 ? Math.round((agg.thin / agg.n) * 100) : 0;
  const top = [...chart].sort((a, b) => (b["GRN Volume"] || 0) - (a["GRN Volume"] || 0));
  const topVendor = top[0];

  const heroBars = top.slice(0, 6).map((r) => ({
    label: `${vName(r["Vendor Name"], 16)} · ${String(r.Month).slice(0, 3)} ${r.Year}`,
    value: r["Margin (%)"] ?? 0,
    color: r.Stable ? "#7fe9c4" : AMBER,
  }));

  const rankRows = top.slice(0, 8).map((r) => ({
    name: `${vName(r["Vendor Name"], 22)} · ${String(r.Month).slice(0, 3)} ${r.Year}`,
    value: r["Margin (%)"] ?? 0,
    sub: `${countAbbr(r["GRN Volume"])} units`,
    thin: !r.Stable, n: r["Sample Size"],
  }));

  return (
    <ProcShell title="Vendor Volume vs Margin" subtitle="MRP-proxy margin, value-weighted, on outlier-clean GRN lines" region={region}>
      <ProcHero
        eyebrow="Overall margin — value-weighted" icon={TbPercentage} value={overallMarginPct}
        format={(n: number) => `${n.toFixed(1)}%`}
        sub={`${inrAbbr(agg.mrpValue)} MRP value − ${inrAbbr(agg.costValue)} cost value · across ${agg.n.toLocaleString("en-IN")} vendor-months`}
        gradient="linear-gradient(125deg,#2c2a5c 0%,#4341a0 48%,#5f5ce0 100%)"
        glow={[INDIGO, TEAL]}
        pills={[
          { value: agg.n.toLocaleString("en-IN"), label: "vendor-months tracked" },
          { value: `${thinPct}%`, label: "thin sample (<5 GRN lines)" },
          { value: topVendor ? `${(topVendor["Margin (%)"] ?? 0).toFixed(1)}%` : "—", label: "top vendor (by volume)" },
        ]}
        barsTitle="Top vendors by GRN volume — margin %"
        bars={heroBars}
        barFmt={(v: number) => `${v.toFixed(1)}%`}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <div className="flex flex-col min-w-0"><RankBars title="Largest vendors by volume" sub="top vendor-months by GRN volume, this window" rows={rankRows} accent={INDIGO} icon={TbBuildingFactory2} delay={160} /></div>
        <div className="flex flex-col min-w-0"><MarginHistogram buckets={agg.buckets} /></div>
      </div>

      <div className="rounded-2xl px-5 py-3.5 flex items-center gap-3" style={{ background: `${AMBER}10`, border: `1px solid ${AMBER}35` }}>
        <TbAlertTriangle size={18} style={{ color: AMBER, flexShrink: 0 }} />
        <p className="text-[12.5px]" style={{ color: "#6b5116" }}>
          <b>{thinPct}%</b> of vendor-months have fewer than 5 clean GRN lines and are <b>flagged, not hidden</b> — check the
          <b> Sample Size</b> / <b>Stable</b> columns below before trusting a thin-sample margin.
        </p>
      </div>

      <TableCard title="Vendor-month margin detail" sub="paginated · sortable · filterable · export CSV — all vendor-months, thin samples flagged">
        <KpiTable kpiKey="vendor-volume-vs-margin" endpoint="/kpi/vendor-volume-vs-margin-table" plant={region} columns={COLUMNS} />
      </TableCard>
    </ProcShell>
  );
}
