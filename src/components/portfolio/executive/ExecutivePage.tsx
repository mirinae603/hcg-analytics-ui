"use client";
// Executive overview — HCG's first screen: the pharmacy's month on ONE screen, as HCG asked for
// ("clean layout, interactive meaningful visualizations, KPIs, trends, drill-down, storytelling,
// executive-friendly insights") and as its management reads it, without scrolling. Six KPIs with
// their change and trend; revenue and margin by month, the margin bridge and IP vs OP; every
// hospital side by side (or the top items); and the insights and recommended actions those
// figures support, with a way to ask the AI Analyst about them. What the face has no room for is
// one click away in a tile's drawer: the full units heat-map, the consumption mix, compliance
// against budget, the top and bottom 10 and the flow of sales (the hospitals tile), and where the
// money goes (IP vs OP).
//
// Framed like the Formulary page: one slim bar with the title, one strip of filters, then the
// content, exactly the screen below the app header on a desktop (OneScreenShell fit, layout.tsx).
// Filters are local to the page; the hospital is the global header selector, and Value ↔
// Quantity the global basis. The answer carries its own months, so no separate meta request: the strip is built from
// the last answer and stays in reach when a request fails. Every figure is its own section's
// (GET /executive/overview calls each section's handler), and every panel links to that page.
// A hospital or month with no HIS sales says so over the panels, with the way out.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TbDownload, TbInfoCircle } from "react-icons/tb";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { useBasis } from "@/context/BasisContext";
import { useAiPageContext } from "@/context/AiChatContext";
import { OneScreenShell } from "@/components/portfolio/ledger/onescreen";
import { PageBar } from "@/components/portfolio/ledger/pagebar";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { CARD, INK, LINE, SUB } from "@/components/portfolio/ledger/kit";
import { dayLabel, isNum } from "@/components/portfolio/ledger/format";
import { Notice } from "@/components/portfolio/formulary/parts";
import { plantParam } from "@/components/portfolio/formulary/api";
import FilterBar from "./FilterBar";
import { ExecGrid, PLACES } from "./layout";
import { KpiTile } from "./KpiTiles";
import { TrendTile } from "./TrendTile";
import { BridgeTile } from "./BridgeTile";
import { IpOpTile } from "./IpOpTile";
import { HospitalsTile } from "./HospitalsTile";
import { InsightsTile } from "./InsightsTile";
import { PAGES, QUANTITY_LC, SEGMENT_LABEL, spanOf, useExecCtx, type ExecCtx } from "./shared";
import { DEFAULT_FILTERS, overviewParams, useExecOverview, type ExecOverview, type Filters, type LoadError } from "./api";

const TITLE = "Executive overview";
const ABOUT = "HCG's pharmacy on one page: revenue and margin from the HIS sales lines, formulary compliance, the margin and saving missed, what was paid above the usual cheapest on purchases, every unit side by side, and the insights and actions those figures support. Each figure is its own section's, and its link opens that page.";

/** The hospital in words: HCG's own (HIS) name where the answer has one. */
function whereOf(d: ExecOverview): string {
  const sc = d.scope;
  return !sc.plant || sc.plant === "ALL" ? "All hospitals" : sc.his_name || sc.plant_name || sc.plant;
}

/** The Notice a failed request shows, by what failed. A month the server refuses (400) can be put
 *  back to the latest from the Notice itself. */
function failure(e: LoadError, onLatest: (() => void) | null): React.ReactNode {
  if (e.status === 503) return <Notice title="The overview can't be built yet">{e.message}</Notice>;
  if (e.status === 404) {
    return <Notice title="This hospital isn't in the sales data">{e.message} Pick another hospital, or all hospitals, in the header.</Notice>;
  }
  if (e.status === 400) {
    return (
      <Notice title="That selection can't be shown">
        <span className="block">{e.message}</span>
        {onLatest && <span className="inline-block mt-3"><LinkButton onClick={onLatest}>Show the latest month</LinkButton></span>}
      </Notice>
    );
  }
  return <Notice title="Couldn't load the executive overview">{e.message}</Notice>;
}

/** The sources' months and the data date, for the bar's right end, with the way to the exports. */
function Sources({ d }: { d: ExecOverview }) {
  const sales = d.months.filter((m) => m.sales), bought = d.months.filter((m) => m.purchases);
  const asOf = dayLabel(d.data_as_of);
  const words = [
    sales.length ? `HIS sales ${spanOf(sales)}` : null,
    bought.length ? `purchases ${spanOf(bought)}` : null,
    asOf ? `data as of ${asOf}` : null,
  ].filter(Boolean).join(" · ");
  return (
    <span className="inline-flex items-center gap-2">
      <span>{words}</span>
      <Link href={PAGES.exports.href} className="inline-flex items-center gap-1 font-semibold rounded hover:underline focus-visible:outline focus-visible:outline-2"
        style={{ color: INK }}>
        <TbDownload size={13} aria-hidden="true" />Download data
      </Link>
    </span>
  );
}

/** A selection with no HIS pharmacy sales, said once over the panels, or null. Most often a
 *  hospital in the header's list that sells nothing through the HIS (the server answers it with
 *  zeros, not an error); else a month without sales, or filters that leave none. Purchases can
 *  still have figures for it (extra paid, out of formulary), so the panels stay below, sharing
 *  the screen with this line. The way out is the month with sales, the filters cleared, or all
 *  hospitals, whichever applies. */
function NoSales({ c }: { c: ExecCtx }) {
  const sales = c.kpi("sales");
  if (!sales || (isNum(sales.value) && sales.value > 0)) return null;
  const sc = c.d.scope;
  const narrowed = [sc.type === "IP" || sc.type === "OP" ? `${sc.type} only` : null, SEGMENT_LABEL[sc.segment] ?? null].filter(Boolean).join(" · ");
  const withSales = c.d.trend.filter((r) => isNum(r.mrp) && r.mrp > 0);
  const latest = withSales[withSales.length - 1];
  const salesMonths = c.d.months.filter((m) => m.sales);
  let text: string;
  let action: { label: string; run: () => void } | null = null;
  if (latest && sc.month !== "ALL") {
    text = `This selection has sales in ${withSales.map((r) => r.label).join(", ")}: pick one of those months, or All months.`;
    if (c.narrow) { const narrow = c.narrow; action = { label: `Show ${latest.label}`, run: () => narrow({ month: latest.period }) }; }
  } else {
    text = `None in ${spanOf(salesMonths)}${narrowed ? " under these filters" : ""}, so the sales, margin, compliance and mix panels are empty; the figures on purchases below (extra paid, out of formulary) still apply.`;
    if (narrowed && c.narrow) { const narrow = c.narrow; action = { label: "Clear the Patients and Material filters", run: () => narrow({ type: "ALL", segment: "ALL" }) }; }
    else if (!c.network) action = { label: "Show all hospitals", run: () => c.select({ plant: sc.plant, name: sc.plant_name ?? sc.plant, selected: true }) };
  }
  return (
    <div role="status" className="flex items-center gap-3 flex-wrap rounded-[14px] px-4 py-2.5 mb-3 fit:mb-0 flex-shrink-0" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <TbInfoCircle size={18} aria-hidden="true" className="flex-shrink-0" style={{ color: SUB }} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold" style={{ color: INK }}>
          No HIS pharmacy sales for {c.where} in {c.when}{narrowed ? ` (${narrowed})` : ""}
        </p>
        <p className="text-[12px] leading-snug mt-0.5" style={{ color: SUB }}>{text}</p>
      </div>
      {action && <LinkButton onClick={action.run}>{action.label}</LinkButton>}
    </div>
  );
}

/** Every panel of the page for one answer (exported so the panels can be rendered on their own).
 *  `narrow` changes the page's filters from a panel (a material type picked on the flow or the
 *  treemap, the month with sales); without it the panels do not offer that. */
export function ExecutiveOverview({ d, stale, narrow = null }: { d: ExecOverview; stale: boolean; narrow?: ExecCtx["narrow"] }) {
  const c = useExecCtx(d, narrow);
  // DOM order is the reading order when the grid stacks: the figures, their trends and split,
  // the hospitals side by side, then the story. On one screen the no-sales line and the grid
  // share the content row (a flex column; the grid takes what the line leaves).
  return (
    <div className="fit:h-full fit:flex fit:flex-col fit:gap-2">
      <NoSales c={c} />
      <ExecGrid ariaLabel={`${TITLE}, ${c.context}`} stale={stale}>
        {d.kpis.map((k, i) => <KpiTile key={k.key} c={c} k={k} hero={i === 0} place={PLACES.kpis[i] ?? PLACES.kpis[PLACES.kpis.length - 1]} />)}
        <TrendTile c={c} place={PLACES.trend} />
        <BridgeTile c={c} place={PLACES.bridge} />
        <IpOpTile c={c} place={PLACES.ipop} />
        <HospitalsTile c={c} place={PLACES.hospitals} />
        <InsightsTile c={c} place={PLACES.insights} />
      </ExecGrid>
    </div>
  );
}

export default function ExecutivePage() {
  const { selectedRegion } = useRegion();
  const plant = plantParam(selectedRegion);
  const { basis } = useBasis();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const q = useExecOverview(overviewParams(plant, filters, basis));
  // The last answer that arrived: the strip is built from it while a request fails, so the
  // filters stay in reach.
  const [last, setLast] = useState<ExecOverview | null>(null);
  useEffect(() => { if (q.data) setLast(q.data); }, [q.data]);
  const d = q.data;
  const frame = d ?? last;
  const where = frame ? whereOf(frame) : displayRegion(selectedRegion.name);

  // Tell the AI Analyst what is on screen, so a question asked from here (or the insights'
  // prepared one) is read against it. A soft hint the user can remove from the chat. A hook: it
  // runs before anything below decides what to render. The basis is the answer's own (not the
  // switch: a stale answer keeps its own), sent as a filter because the backend reads only the
  // filters, never the label, and says "counted in units" from it (the Quantity basis).
  useAiPageContext(d ? {
    page: "executive",
    label: `${TITLE}${d.scope.basis === "qty" ? ` · by ${QUANTITY_LC}` : ""}`,
    month: d.scope.month,
    monthLabel: d.scope.month === "ALL" ? spanOf(d.months) : d.scope.month_label,
    plant: d.scope.plant,
    hospital: whereOf(d),
    filters: { type: d.scope.type, segment: d.scope.segment, basis: d.scope.basis === "qty" ? "qty" : "value" },
  } : null);

  const bar = (
    <PageBar title={TITLE} about={ABOUT} tabs={[{ key: "overview", label: "Overview" }]} active="overview" onTab={() => {}}
      right={frame ? <Sources d={frame} /> : undefined} />
  );
  // The frame keeps a row for the strip whatever is in it, so nothing jumps when it arrives.
  const strip = frame?.months?.length
    ? <FilterBar d={frame} filters={filters} onChange={setFilters} where={where} units={basis === "qty"} />
    : <div aria-hidden="true" className="h-9" />;

  // One screen while the grid (or its skeleton) is on it; a notice reads as a normal page.
  let content: React.ReactNode;
  let fit = true;
  if (q.error) {
    content = failure(q.error, filters.month ? () => setFilters({ ...filters, month: "" }) : null);
    fit = false;
  } else if (!d) {
    content = <ExecGrid ariaLabel={`${TITLE}, loading`} loading />;
  } else if (!d.months.length) {
    content = (
      <Notice title="No months have been published yet">
        The build step publishes one month at a time from the HIS sales files and that month&apos;s Item Master.
      </Notice>
    );
    fit = false;
  } else {
    content = <ExecutiveOverview d={d} stale={q.loading} narrow={(patch) => setFilters((f) => ({ ...f, ...patch }))} />;
  }

  return <OneScreenShell fit={fit} bar={bar} filters={strip}>{content}</OneScreenShell>;
}
