"use client";
// Revenue & margin — ONE static page with in-page tabs (Overview | Items), framed like the
// Formulary page: one slim bar with the title and the tabs, one strip of filters, then the
// content. The Overview fills exactly one desktop screen with charts; the Items tab scrolls
// under the same bar and strip. The active tab lives in `?view=` and is synced with
// history.replaceState (no useSearchParams, which needs a Suspense boundary under static export).
//
// HCG's ask (OPD and IP revenue, margin and margin % by formulary bucket, unit and month) on its
// sheet's method: revenue = total MRP of the HIS pharmacy sales lines, margin = MRP − cost,
// margin % = margin ÷ MRP. The older Dec–May page (/revenueMargin) stays as the history.
//
// Filters are local to this page; the hospital is the global header selector, and the Value ↔
// Quantity switch is the global basis (volume views count units sold; money stays rupees). The
// overview answer carries its own months, so the page needs no separate meta request: the strip
// is built from the last answer, and stays on screen when a request fails so the selection can
// change.
//
// A link can open the page on a month, patient type and material type (?month=&type=&segment=,
// lib/linkSelection: the Executive overview's drill links do). They are read with ?view= before
// the first request, and written back beside it. With no months to check a link's month
// against until the server answers, a month it does not hold is the one the server refuses
// (400; the patient and material types are checked here first): the page then shows its latest
// month, as Formulary and Spend do, rather than the refusal.
import React, { useEffect, useState } from "react";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { useAiPageContext } from "@/context/AiChatContext";
import { useBasis } from "@/context/BasisContext";
import { Skeleton } from "@/components/portfolio/ledger/kit";
import { OneScreenShell } from "@/components/portfolio/ledger/onescreen";
import { PageBar } from "@/components/portfolio/ledger/pagebar";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { dayLabel } from "@/components/portfolio/ledger/format";
import { Notice } from "@/components/portfolio/formulary/parts";
import { hasLinkSelection, readLinkSelection, writeLinkSelection } from "@/lib/linkSelection";
import { plantParam } from "@/components/portfolio/formulary/api";
import FilterBar from "./FilterBar";
import Overview, { OverviewSkeleton } from "./Overview";
import Items from "./Items";
import { monthLabelOf, monthsLabelOf, whereOf } from "./shared";
import {
  DEFAULT_FILTERS, VIEWS, filterParams, overviewQuery, readView, useRevenueOverview,
  type Filters, type LoadError, type RevenueOverview, type Segment, type View,
} from "./api";

const TITLE = "Revenue & margin · IP and OP";
const ABOUT = "Pharmacy sales at MRP (revenue), their cost and the margin between, for inpatients and outpatients: HIS IP + OP sales lines, drugs and consumables, in the formulary buckets from each month's Item Master. Margin = MRP − cost; margin % = margin ÷ MRP.";

/** The material types a link can narrow the page to: revenue counts consumables too. */
const LINK_SEGMENTS: readonly Exclude<Segment, "ALL">[] = ["onco", "non-onco", "consumables"];

/** The Notice a failed request shows, by what failed. A filter the server refuses (400) can be
 *  put back to the latest month from the Notice itself. */
function failure(e: LoadError, onLatest: (() => void) | null): React.ReactNode {
  if (e.status === 503) {
    return <Notice title="Revenue by item hasn't been built yet">{e.message}</Notice>;
  }
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
  return <Notice title="Couldn't load revenue and margin">{e.message}</Notice>;
}

export default function RevenuePage() {
  const { selectedRegion } = useRegion();
  const plant = plantParam(selectedRegion);
  const { basis } = useBasis();
  // The tab the URL or a click asked for: undefined until the URL has been read (in an effect,
  // never during render: on a client navigation INTO this page Next writes the new URL after
  // render), null when none was asked for (the page then opens on the Overview).
  const [picked, setPicked] = useState<View | null | undefined>(undefined);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // The month a link asked for, until the server has answered the request that carries it.
  const [linked, setLinked] = useState<string | null>(null);

  // The first request waits for the URL, so a linked page asks for its selection, not the default.
  const params = { Plant: plant, ...filterParams(filters) };
  const q = useRevenueOverview(params, picked !== undefined);
  const query = overviewQuery(params);
  // The last answer that arrived: the strip is built from it while a request fails, so the
  // filters stay in reach.
  const [last, setLast] = useState<RevenueOverview | null>(null);
  useEffect(() => { if (q.data) setLast(q.data); }, [q.data]);
  const d = q.data;
  const frame = d ?? last;

  // The tab and the selection a link asked for. A link without a month or filter leaves the
  // page's own as they are.
  const follow = (search: string) => {
    setPicked(readView(search));
    const sel = readLinkSelection(search, LINK_SEGMENTS);
    if (!hasLinkSelection(sel)) return;
    setFilters((f) => ({ ...f, ...sel }));
    if (sel.month) setLinked(sel.month);
  };
  useEffect(() => { follow(window.location.search); }, []);

  // Once the request carrying a link's month is answered: a refusal (a month the sales table does
  // not hold) puts the page on its latest month; either way the month is the page's own from now.
  useEffect(() => {
    if (linked == null || q.settled !== query) return;
    if (q.error?.status === 400 && filters.month === linked) setFilters((f) => ({ ...f, month: "" }));
    setLinked(null);
  }, [linked, q.settled, q.error, query, filters.month]);

  // Keep ?view= and the selection in step with the page. replaceState, not pushState: switching
  // tabs or filters is not navigation, and a null state lets Next's router adopt the new URL as
  // its own. The selection is written once an answer has said which month is the latest (it
  // leaves its parameter out), and never while a link's month waits for its answer.
  const latest = frame?.months_available?.[frame.months_available.length - 1] ?? null;
  useEffect(() => {
    if (picked === undefined) return;
    const url = new URL(window.location.href);
    if (picked == null) url.searchParams.delete("view"); else url.searchParams.set("view", picked);
    if (latest && linked == null) {
      writeLinkSelection(url, { month: !filters.month || filters.month === latest ? null : filters.month, type: filters.type, segment: filters.segment });
    }
    if (url.search !== window.location.search) window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [picked, latest, linked, filters.month, filters.type, filters.segment]);

  // Follow links to this same page while it is open (a sidebar entry for the Items tab, a drill
  // link carrying a month): Next keeps the page mounted for a query-only change. Back/forward
  // arrive as popstate.
  useEffect(() => {
    const here = () => window.location.pathname.replace(/\/+$/, "");
    const onPop = () => follow(window.location.search);
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.origin !== window.location.origin) return;
      if (a.pathname.replace(/\/+$/, "") !== here()) return;
      follow(a.search);
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("popstate", onPop); document.removeEventListener("click", onClick); };
  }, []);

  const view: View | null = picked === undefined ? null : picked ?? "overview";
  const tab: View = view ?? "overview";
  const where = frame ? whereOf(frame, displayRegion(selectedRegion.name)) : displayRegion(selectedRegion.name);

  // Tell the AI Analyst what is on screen (tab, month, hospital, filters), so a question asked
  // from here is read against it. A soft hint the user can remove from the chat. A hook: it
  // runs before anything below decides what to render.
  const months = d?.scope?.months ?? [];
  // The switch reaches the Overview's size views only; the Items list shows value and units side
  // by side, ranked by MRP, so it is sent as value there (what the tab applies, as Formulary does).
  const inUnits = basis === "qty" && view === "overview";
  useAiPageContext(d && view && months.length ? {
    page: "revenue",
    label: `Revenue & margin · ${VIEWS.find((v) => v.key === view)?.label ?? view}${inUnits ? " · by quantity" : ""}`,
    view,
    month: filters.month === "ALL" ? "ALL" : months.join(","),
    monthLabel: months.length === 1 ? monthLabelOf(d, months[0]) : monthsLabelOf(d, months),
    plant,
    hospital: where,
    filters: { type: filters.type, segment: filters.segment, payer: filters.payer, basis: inUnits ? "qty" : "value" },
  } : null);

  const published = !!frame?.months_available?.length;
  const asOf = dayLabel(frame?.data_as_of);
  const bar = (
    <PageBar title={TITLE} about={ABOUT} tabs={VIEWS} active={tab} onTab={setPicked}
      right={frame ? `HIS IP + OP sales${asOf ? ` · data as of ${asOf}` : ""}` : undefined} />
  );
  // The one-screen frame keeps a row for the strip whatever is in it, so the content row is
  // always the one that takes the rest of the screen.
  const strip = frame && published && view
    ? <FilterBar d={frame} filters={filters} onChange={setFilters} view={view} where={where} basis={basis} />
    : <div aria-hidden="true" className="h-9" />;

  let content: React.ReactNode;
  // A failure is shown for the request it answers (not for one the filters have just replaced),
  // and never for a link's month the server refused: the page moves to its latest at once (above).
  const failed = q.error && q.settled === query && !(linked != null && q.error.status === 400) ? q.error : null;
  if (failed) {
    content = failure(failed, filters.month ? () => setFilters({ ...filters, month: "" }) : null);
  } else if (!d || !view) {
    content = tab === "overview" ? <OverviewSkeleton network={plant === "ALL"} /> : <Skeleton />;
  } else if (!published) {
    content = (
      <Notice title="No sales months have been published yet">
        The build step publishes one month at a time from the HIS sales files and that month&apos;s Item Master.
      </Notice>
    );
  } else {
    content = view === "overview"
      ? <Overview d={d} plant={plant} basis={basis} stale={q.loading} onOpen={setPicked} />
      : <Items d={d} filters={filters} plant={plant} />;
  }

  return (
    <OneScreenShell fit={tab === "overview" && !failed && (!d || published)} bar={bar} filters={strip}>
      {content}
    </OneScreenShell>
  );
}
