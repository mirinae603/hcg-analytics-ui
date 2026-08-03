"use client";
// One tile of the /inventory glass KPI grid, with its own material-category control.
//
// All twelve live tiles call `/kpi/{key}` (or, for wastage-rate, its bespoke /insights
// route) and every one of those endpoints honours `?Category=` — verified by curling
// each with and without the param. So every one of them gets a chip, and each chip
// narrows ONLY its own tile: the page's batch fetch keeps feeding the other eleven the
// full portfolio, which is what makes a filtered tile comparable to the ones beside it.
//
// The chip is deliberately rendered OUTSIDE the <Link> that wraps the card. The whole
// card is a navigation target to /kpi/{key}; a control nested inside it would send the
// reader to another page on every click instead of filtering.
import React from "react";
import { Kpi } from "@/lib/kpiRegistry";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { useCardCategory, useCardScopedData, type CardDomain } from "@/components/common/CardCategoryFilter";
import InventoryGlassKpiCard, { GLASS_ACCENTS } from "./InventoryGlassKpiCard";

/**
 * Which family of numbers each tile is built on, so a filter that empties it can say
 * WHY. Days-on-hand, turnover and stock-change are all consumption-derived (stock ÷
 * usage, or outflow), and HCG dispenses onco through IP/OP billing rather than internal
 * consumption — so those three legitimately read ~zero for Onco Drugs and the chip
 * greys that bucket up front. Everything else is a stock-balance figure.
 */
const TILE_DOMAIN: Record<string, CardDomain> = {
  "days-on-hand": "consumption",
  "inventory-turnover-ratio": "consumption",
  "stock-change": "consumption",
};

/**
 * The page's own chart fetch, factored out so the tile can re-issue the IDENTICAL
 * request with `&Category=` appended. Keeping one function means a filtered tile can
 * never silently diverge from the unfiltered one in group_by / measures / top.
 */
export async function fetchKpiChart(
  kpi: Kpi,
  regionName: string,
  category: string,
  signal?: AbortSignal,
): Promise<any[]> {
  const cat = category ? `&Category=${encodeURIComponent(category)}` : "";
  // wastage-rate has no generic /kpi/{key} route — it exposes a bespoke insights shape
  // whose by_plant rows are what the tile's spark and "Largest: HC16 4.12%" line read.
  if (kpi.key === "wastage-rate") {
    const res = await fetch(
      `${DASHBOARD_API_BASE_URL}/kpi/wastage-rate/insights?Plant=${encodeURIComponent(regionName)}${cat}`,
      { signal },
    );
    if (!res.ok) throw new Error(`wastage-rate ${res.status}`);
    const json = await res.json();
    return Array.isArray(json?.by_plant) ? json.by_plant : [];
  }
  const params = new URLSearchParams({ Plant: regionName });
  if (kpi.chart?.groupBy) params.set("group_by", kpi.chart.groupBy);
  if (kpi.chart?.measures) params.set("measures", kpi.chart.measures);
  if (kpi.chart?.top) params.set("top", String(kpi.chart.top));
  const res = await fetch(`${DASHBOARD_API_BASE_URL}/kpi/${kpi.key}?${params.toString()}${cat}`, { signal });
  if (!res.ok) throw new Error(`${kpi.key} ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : (json?.data ?? []);
}

export default function InventoryGlassKpiTile({
  kpi, index, region, pageData, insightsOf,
}: {
  kpi: Kpi;
  index: number;
  region: string;
  /** The rows the PAGE fetched, unfiltered. Used as-is at All Categories. */
  pageData: any[];
  /** The page's insight generator, so a filtered tile phrases its pills identically. */
  insightsOf: (kpi: Kpi, rows: any[]) => string[];
}) {
  const accent = GLASS_ACCENTS[index % GLASS_ACCENTS.length];
  const cat = useCardCategory({
    accent,
    domain: TILE_DOMAIN[kpi.key] ?? "stock",
    label: kpi.title,
  });
  const scoped = useCardScopedData<any[]>(pageData, cat.category, (c, signal) =>
    fetchKpiChart(kpi, region, c, signal),
  );
  const rows = scoped.data ?? [];

  return (
    <div className="relative">
      {/* zIndex beats the card's hover blob, which lifts itself to 99999 to become the
          spark chart — without this the chip vanishes under it the moment you reach
          for it. */}
      <div className="absolute right-1.5 top-1.5" style={{ zIndex: 100001 }}>
        {cat.chip}
      </div>
      <InventoryGlassKpiCard
        kpi={kpi}
        index={index}
        insights={insightsOf(kpi, rows)}
        chartData={rows}
      />
      {cat.note(!scoped.loading && rows.length === 0) && (
        <div className="mt-2" style={{ maxWidth: 300 }}>{cat.note(true)}</div>
      )}
    </div>
  );
}
