"use client";
// Formulary Compliance — ONE static page with in-page tabs (Overview | Doctors | Items | Scheme
// brands | Brand rules). Not nested routes: under `output: "export"` a /formulary page next to a
// /formulary/ folder is an untested shape on the static host. The active tab lives in `?view=`
// and is synced with history.replaceState (no useSearchParams, which needs a Suspense boundary
// under static export). With no `?view=` the page opens on the Overview, for one hospital and
// for all of them alike.
//
// The frame is the one-screen shell HCG's own dashboards are laid out in: one slim bar with the
// title and the tabs, one strip of filters, then the content. The Overview fills exactly one
// desktop screen with charts; the table tabs scroll as pages do under the same bar and strip.
//
// Filters are local to this page: they change what "compliance" means, so they must not
// leak into other pages as silent filters. The hospital is the global header selector.
import React, { useEffect, useState } from "react";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { useAiPageContext } from "@/context/AiChatContext";
import { Skeleton } from "@/components/portfolio/ledger/kit";
import { OneScreenShell } from "@/components/portfolio/ledger/onescreen";
import { PageBar } from "@/components/portfolio/ledger/pagebar";
import { dayLabel } from "@/components/portfolio/ledger/format";
import FilterBar from "./FilterBar";
import Overview, { OverviewSkeleton } from "./Overview";
import Doctors from "./Doctors";
import Items from "./Items";
import Scheme from "./Scheme";
import Rules from "./Rules";
import { Notice } from "./parts";
import {
  DEFAULT_FILTERS, VIEWS, effectiveMethod, errText, getMeta, monthFor, monthLabel, monthsLabel, plantParam, readView,
  type Filters, type Meta, type View,
} from "./api";

const TITLE = "Formulary compliance";
const ABOUT = "Share of drug spend on formulary items: HIS IP + OP pharmacy sales, classified with HCG's monthly Item Master.";

export default function FormularyPage() {
  const { selectedRegion } = useRegion();
  const plant = plantParam(selectedRegion);
  // The tab the URL or a click asked for: undefined until the URL has been read, null when
  // none was asked for (the page then opens on the Overview). Read in an effect, never during
  // render: on a client navigation INTO this page Next writes the new URL during the commit,
  // after render, so a render-time read would still see the previous page's URL (and the sync
  // below would then overwrite the ?view= the user asked for).
  const [picked, setPicked] = useState<View | null | undefined>(undefined);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    let dead = false;
    getMeta()
      .then((m) => { if (!dead) setMeta(m); })
      .catch((e) => { if (!dead) setMetaErr(errText(e)); });
    return () => { dead = true; };
  }, []);

  useEffect(() => { setPicked(readView(window.location.search)); }, []);

  // Keep ?view= in step with the tab asked for. replaceState, not pushState: switching tabs is
  // not navigation, and a null state lets Next's router adopt the new URL as its own.
  useEffect(() => {
    if (picked === undefined) return;
    const url = new URL(window.location.href);
    if (picked == null) url.searchParams.delete("view"); else url.searchParams.set("view", picked);
    if (url.search !== window.location.search) window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [picked]);

  const view: View | null = picked === undefined ? null : picked ?? "overview";
  // The month picked, fitted to the published ones while rendering: until one is picked the
  // page opens on the latest.
  const month = meta ? monthFor(meta, filters.month) : filters.month;
  const shown: Filters = month === filters.month ? filters : { ...filters, month };

  // Follow links to this same page while it is open (the sidebar's Doctors / Items / Scheme
  // brands entries): Next keeps the page mounted for a query-only change, so nothing else
  // would tell it. Back/forward arrive as popstate.
  useEffect(() => {
    const here = () => window.location.pathname.replace(/\/+$/, "");
    const onPop = () => setPicked(readView(window.location.search));
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.origin !== window.location.origin) return;
      if (a.pathname.replace(/\/+$/, "") !== here()) return;
      setPicked(readView(a.search));
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("popstate", onPop); document.removeEventListener("click", onClick); };
  }, []);

  // Tell the AI Analyst what is on screen (tab, month, hospital, filters), so "why is this
  // low?" asked from here is read against it. A soft hint the user can remove from the chat.
  // It must run before anything returns early: it is a hook.
  useAiPageContext(meta && view && month ? {
    page: "formulary",
    label: `Formulary compliance · ${VIEWS.find((v) => v.key === view)?.label ?? view}`,
    view,
    month,
    monthLabel: month === "ALL" ? monthsLabel(meta, meta.months) : monthLabel(meta, month),
    plant,
    hospital: displayRegion(selectedRegion.name),
    // What the tab actually applies, not the raw filter state: Scheme brands is GOV-only
    // whatever Payer says, each brand rule sets its own payers, and rules have no method.
    filters: {
      type: filters.type,
      segment: filters.segment,
      payer: view === "rules" ? "per rule" : view === "scheme" ? "GOV" : filters.payer,
      ...(view === "rules" ? {} : { method: effectiveMethod(filters) }),
    },
  } : null);

  // Until the URL has been read the tab is the Overview's place-holder: the default tab.
  const tab: View = view ?? "overview";
  const published = !!meta?.months?.length;
  // The hospital in HCG's own (HIS) name, as the Overview's charts print it.
  const hospital = meta?.hospitals?.find((h) => h.plant === plant);
  const where = plant === "ALL" ? "All hospitals" : hospital?.his_name || hospital?.name || displayRegion(selectedRegion.name);
  const asOf = dayLabel(meta?.built_at);

  const bar = (
    <PageBar title={TITLE} about={ABOUT} tabs={VIEWS} active={tab} onTab={setPicked}
      right={meta ? `HIS IP + OP sales${asOf ? ` · data as of ${asOf}` : ""}` : undefined} />
  );
  // The one-screen frame keeps a row for the strip whatever is in it, so the content row is
  // always the one that takes the rest of the screen.
  const strip = meta && published && view
    ? <FilterBar meta={meta} filters={shown} onChange={setFilters} view={view} where={where} />
    : <div aria-hidden="true" className="h-9" />;

  let content: React.ReactNode;
  if (metaErr) {
    content = <Notice title="Formulary data isn't available">{metaErr}</Notice>;
  } else if (!meta || !view) {
    content = tab === "overview" ? <OverviewSkeleton network={plant === "ALL"} /> : <Skeleton />;
  } else if (!published) {
    content = (
      <Notice title="No formulary months have been published yet">
        The build step publishes one month at a time from the HIS sales files and that month&apos;s Item Master.
      </Notice>
    );
  } else {
    content = (
      <>
        {view === "overview" && <Overview meta={meta} filters={shown} plant={plant} onOpen={setPicked} />}
        {view === "doctors" && <Doctors filters={shown} plant={plant} />}
        {view === "items" && <Items filters={shown} plant={plant} />}
        {view === "scheme" && <Scheme filters={shown} plant={plant} />}
        {view === "rules" && <Rules meta={meta} filters={shown} plant={plant} />}
      </>
    );
  }

  return (
    <OneScreenShell fit={tab === "overview" && !metaErr && (!meta || published)} bar={bar} filters={strip}>
      {content}
    </OneScreenShell>
  );
}
