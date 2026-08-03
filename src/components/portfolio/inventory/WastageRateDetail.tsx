"use client";
// Wastage % — value & qty basis, reconciled exactly against the Near-Expiry page.
// Backend: legacy_kpi.py GET /kpi/wastage-rate/insights (Plant query param via _plant()),
// built directly off da.load('kpi_near_expiry') / da.load('kpi_stock_value') — the SAME
// loaders (and the same days_to_expiry==0 boundary fix) as Near-Expiry, so
// totals.expired_value here is byte-identical to Near-Expiry's totals.expired_value.
// No separate paginated table route exists for this KPI (backend exposes only
// /insights) — the by-plant breakdown below IS the full detail, all 26 plants shown,
// including the 7 that are legitimately 0% (never a blank dash — a real, verified zero).
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useCardCategory, useCardScopedData } from "@/components/common/CardCategoryFilter";
import { useDrillBind } from "@/components/portfolio/useDrillBind";
import { TbTrash, TbScale, TbArrowUpRight } from "react-icons/tb";

const FONT = "Outfit, 'Segoe UI', sans-serif";
const MIST = "#F3F1EC";
const INK = "#332b22";
const RUST = "#c25b3a", AMBER = "#d99a4e", SLATE = "#7d8a8f";
const PANEL_SHADOW = "0 12px 34px -22px rgba(51,43,34,0.16), 0 2px 7px -4px rgba(51,43,34,0.05)";

const inrAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`; return `₹${Math.round(v)}`; };
const numAbbr = (v: number) => { const a = Math.abs(v); if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`; if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`; if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`; return `${Math.round(v)}`; };
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function CountUp({ value, format, decimals }: { value: number; format?: (n: number) => string; decimals?: number }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (n: number) => { const p = Math.min((n - start) / 1100, 1); setV(value * easeOut(p)); if (p < 1) raf = requestAnimationFrame(tick); else setV(value); };
    raf = requestAnimationFrame(tick);
    const g = setTimeout(() => setV(value), 1200);
    return () => { cancelAnimationFrame(raf); clearTimeout(g); };
  }, [value]);
  return <>{format ? format(v) : v.toFixed(decimals ?? 1)}</>;
}
const useMount = (delay = 0) => { const [on, setOn] = useState(false); useEffect(() => { const t = setTimeout(() => setOn(true), 120 + delay); return () => clearTimeout(t); }, [delay]); return on; };

type Totals = {
  expired_value: number; expired_qty: number; total_stock_value: number; total_stock_qty: number;
  wastage_pct_value: number; wastage_pct_qty: number;
};
type PlantRow = { plant: string; expired_value: number; stock_value: number; wastage_pct: number };

// ── Hero — headline wastage % (value basis) + qty-basis secondary + reconcile-with-Near-Expiry link ──
function WastageHero({ t }: { t: Totals }) {
  return (
    <div className="relative rounded-[28px] overflow-hidden" style={{ minHeight: 280, background: "linear-gradient(125deg,#3c2417 0%,#7a4526 46%,#b06a3a 100%)", boxShadow: "0 24px 60px -28px rgba(60,36,23,0.62)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 260, height: 260, background: "#e0a45c", opacity: 0.2, top: -90, right: 120 }} />
      <div className="relative flex flex-col lg:flex-row" style={{ minHeight: 280 }}>
        <div className="p-7 lg:p-9 lg:w-[400px] flex-shrink-0 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.55)" }}><TbTrash size={14} />Wastage % · value basis</div>
          <div className="mt-3 text-[54px] leading-none font-bold tabular-nums tracking-tight" style={{ color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
            <CountUp value={t.wastage_pct_value} format={(n) => `${n.toFixed(2)}%`} />
          </div>
          <div className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>{inrAbbr(t.expired_value)} expired of {inrAbbr(t.total_stock_value)} total stock value</div>
          <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-2 rounded-full w-fit" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
            <TbScale size={14} style={{ color: "#f0d3ab" }} />
            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>Qty basis: <b style={{ color: "#fff" }}><CountUp value={t.wastage_pct_qty} format={(n) => `${n.toFixed(2)}%`} /></b> ({numAbbr(t.expired_qty)} of {numAbbr(t.total_stock_qty)} units)</span>
          </div>
        </div>
        <div className="flex-1 p-7 lg:py-8 lg:pr-10 flex flex-col justify-center min-w-0">
          <div className="rounded-2xl px-5 py-4" style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.14)" }}>
            <div className="text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Reconciliation check</div>
            <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.88)" }}>
              The expired value above — <b className="tabular-nums">{inrAbbr(t.expired_value)}</b> — is computed from the exact same
              expiry-bucket data as the <b>Near-Expiry</b> page&apos;s &ldquo;Expired&rdquo; bucket. They must always match.
            </p>
            <Link href="/kpi/near-expiry" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.16)", color: "#fff" }}>
              View on Near-Expiry page <TbArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── By-plant breakdown — ALL 26 plants, sorted by wastage %, zeros shown explicitly ──
function ByPlant({ rows, cat, loading }: { rows: PlantRow[]; cat: any; loading: boolean }) {
  const on = useMount(140);
  const sorted = [...rows].sort((a, b) => b.wastage_pct - a.wastage_pct);
  const max = Math.max(...sorted.map((r) => r.wastage_pct), 0.01);

  // DRILLING A RATIO, CAREFULLY.
  //
  // Wastage % is expired_value / stock_value — two different tables — and ranking ten
  // SKUs BY that ratio underneath the parent ratio would imply the parts sum to the
  // whole, which is false. That is why this chart carried no drill.
  //
  // But the bar already prints the rupee NUMERATOR next to the percentage, and
  // "which items expired at this hospital" is exactly the question in front of it.
  // Expired value IS additive, so the panel ranks by it and every share it reports is
  // a share of THAT — of this plant's expired rupees, never of the percentage. The
  // percentage travels along as a fact so the two numbers can never be confused for
  // one another. Backend: /drill/top-items resolves wastage-rate to
  // drill_expired_grain (kpi_near_expiry, Expired bucket only), whose per-plant sums
  // equal this page's own expired_value exactly.
  const drill = useDrillBind({
    kpi: "wastage-rate", dim: "plant", by: "material", measure: "expired_value",
    label: "expired items", dimLabel: "Hospital", format: inrAbbr, category: cat.drill,
    details: (slice) => {
      const r = sorted.find((x) => x.plant === slice);
      if (!r) return [];
      return [
        { label: "Wastage %", value: r.wastage_pct == null ? "—" : `${r.wastage_pct.toFixed(2)}%` },
        { label: "Stock value", value: inrAbbr(r.stock_value) },
      ];
    },
  });

  return (
    <div className="rounded-3xl bg-white p-5 md:p-6" style={{ boxShadow: PANEL_SHADOW }}>
      <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Wastage % by plant</h3>
          <p className="text-xs mt-0.5" style={{ color: SLATE }}>all {sorted.length} plants · expired value ÷ stock value · a 0.00% here is a verified result, not missing data</p>
        </div>
        {cat.chip}
      </div>
      {cat.note(!loading && sorted.every((r) => !r.expired_value)) && <div className="mb-4">{cat.note(true)}</div>}
      <div className="space-y-2">
        {sorted.map((r, i) => {
          const w = (r.wastage_pct / max) * 100;
          const color = r.wastage_pct >= 2 ? RUST : r.wastage_pct > 0 ? AMBER : "#c7cdd3";
          return (
            // A verified 0.00% plant has nothing expired to list, so it gets no drill
            // and no pointer cursor. The bar still shows, because a real zero is the
            // point of this chart.
            <div key={r.plant} className="flex items-center gap-3 rounded-lg hover:bg-[#faf8f4] transition-colors"
              {...drill.bind(r.expired_value > 0 ? r.plant : null)}>
              <span className="text-[11.5px] font-semibold flex-shrink-0" style={{ width: 46, color: INK }}>{r.plant}</span>
              <div className="flex-1 h-6 rounded-lg overflow-hidden relative" style={{ background: "#f1ede6" }}>
                <div className="h-full rounded-lg flex items-center" style={{ width: on ? `${Math.max(w, r.wastage_pct > 0 ? 3 : 0)}%` : "0%", background: color, transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 20}ms` }} />
              </div>
              <span className="text-[12px] font-bold tabular-nums flex-shrink-0 text-right" style={{ width: 54, color: INK }}>{r.wastage_pct.toFixed(2)}%</span>
              <span className="text-[10.5px] tabular-nums flex-shrink-0 text-right hidden sm:block" style={{ width: 90, color: SLATE }}>{inrAbbr(r.expired_value)}</span>
            </div>
          );
        })}
        {!sorted.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
      {drill.panel}
    </div>
  );
}

export default function WastageRateDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<{ totals: Totals; by_plant: PlantRow[] } | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/wastage-rate/insights?Plant=${encodeURIComponent(region)}`)
      .then((r) => r.json()).then((d) => setData(d || null)).catch(() => setData(null));
  }, [region]);

  const t = data?.totals || null;

  // Expiry write-off is a STOCK figure (expired value / stock value), so every
  // category that holds stock has a real number here — including the ones that read
  // zero on consumption-derived pages.
  const cat = useCardCategory({ accent: RUST });
  const scoped = useCardScopedData(data, cat.category, (c, signal) =>
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/wastage-rate/insights?Plant=${encodeURIComponent(region)}&Category=${encodeURIComponent(c)}`, { signal }).then((r) => r.json()));
  const byPlant = scoped.data?.by_plant || [];

  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-4 min-w-0" style={{ background: MIST, minHeight: "calc(100vh - 64px)", fontFamily: FONT }}>
      <PageBreadcrumb pageTitle="Wastage %" />

      {!t ? (
        <>
          <div className="rounded-[28px] animate-pulse" style={{ minHeight: 280, background: "#e9e3da" }} />
          <div className="rounded-3xl bg-white p-6 animate-pulse" style={{ boxShadow: PANEL_SHADOW, minHeight: 320 }}>
            <div className="h-5 w-1/3 bg-gray-100 rounded mb-4" />
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-6 bg-gray-50 rounded-lg" />)}</div>
          </div>
        </>
      ) : (
        <>
          <div className="csv-card" style={{ animationDelay: "0ms" }}><WastageHero t={t} /></div>
          <style jsx global>{`
            @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
            .csv-card { animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; min-width: 0; }
          `}</style>
          <div className="csv-card" style={{ animationDelay: "160ms" }}><ByPlant rows={byPlant} cat={cat} loading={scoped.loading} /></div>
        </>
      )}
    </div>
  );
}
