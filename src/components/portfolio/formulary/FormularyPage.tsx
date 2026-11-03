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
// A link can open the page on a month, patient type and material type (?month=&type=&segment=,
// lib/linkSelection: the Executive overview's drill links do): read with ?view=, fitted to the
// months published, and written back beside it, so the address bar says what is on screen.
//
// Filters are local to this page: they change what "compliance" means, so they must not
// leak into other pages as silent filters. The hospital is the global header selector, and so
// is Value ↔ Quantity (BasisContext): a view choice, not a filter, carried into every tab except
// Brand rules, whose measures are rupees only.
import React, { useEffect, useState } from "react";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { useBasis } from "@/context/BasisContext";
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
import { hasLinkSelection, readLinkSelection, writeLinkSelection } from "@/lib/linkSelection";
import {
  DEFAULT_FILTERS, VIEWS, effectiveMethod, errText, getMeta, monthFor, monthLabel, monthsLabel, plantParam, readView,
  type Filters, type Meta, type Segment, type View,
} from "./api";

const TITLE = "Formulary compliance";
const ABOUT = "Share of drug spend on formulary items: HIS IP + OP pharmacy sales, classified with HCG's monthly Item Master.";

/** The material types a link can narrow the page to: drugs only (no consumables filter here). */
const LINK_SEGMENTS: readonly Exclude<Segment, "ALL">[] = ["onco", "non-onco"];

export default function FormularyPage() {
  const { selectedRegion } = useRegion();
  const { basis } = useBasis();
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

  // The tab and the selection a link asked for: the month as asked (fitted to the published
  // months below), the patient type and the material type.
  const follow = (search: string) => {
    setPicked(readView(search));
    const sel = readLinkSelection(search, LINK_SEGMENTS);
    if (hasLinkSelection(sel)) setFilters((f) => ({ ...f, ...sel }));
  };
  useEffect(() => { follow(window.location.search); }, []);

  // The month picked, fitted to the published ones while rendering: until one is picked (or for
  // a month a link asked for that is not published) the page opens on the latest. The header's
  // basis rides in the filters every tab reads.
  const month = meta ? monthFor(meta, filters.month) : filters.month;
  const latest = meta?.months?.[meta.months.length - 1] ?? null;
  const shown: Filters = month === filters.month && filters.basis === basis ? filters : { ...filters, month, basis };

  // Keep ?view= and the selection in step with the page. replaceState, not pushState: switching
  // tabs or filters is not navigation, and a null state lets Next's router adopt the new URL as
  // its own. Until the months are known the selection a link brought stays as it came.
  useEffect(() => {
    if (picked === undefined) return;
    const url = new URL(window.location.href);
    if (picked == null) url.searchParams.delete("view"); else url.searchParams.set("view", picked);
    if (meta) writeLinkSelection(url, { month: month === latest ? null : month, type: filters.type, segment: filters.segment });
    if (url.search !== window.location.search) window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [picked, meta, month, latest, filters.type, filters.segment]);

  const view: View | null = picked === undefined ? null : picked ?? "overview";

  // Follow links to this same page while it is open (the sidebar's Doctors / Items / Scheme
  // brands entries, a drill link carrying a month): Next keeps the page mounted for a query-only
  // change, so nothing else would tell it. Back/forward arrive as popstate. A link without a
  // month or filter leaves the page's own as they are.
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

  // Tell the AI Analyst what is on screen (tab, month, hospital, filters), so "why is this
  // low?" asked from here is read against it. A soft hint the user can remove from the chat.
  // It must run before anything returns early: it is a hook.
  // The units view is named in the label (Brand rules are rupees whatever the switch says).
  const inUnits = basis === "qty" && view !== "rules";
  useAiPageContext(meta && view && month ? {
    page: "formulary",
    label: `Formulary compliance · ${VIEWS.find((v) => v.key === view)?.label ?? view}${inUnits ? " · by quantity" : ""}`,
    view,
    month,
    monthLabel: month === "ALL" ? monthsLabel(meta, meta.months) : monthLabel(meta, month),
    plant,
    hospital: displayRegion(selectedRegion.name),
    // What the tab actually applies, not the raw filter state: Scheme brands is GOV-only
    // whatever Payer says, each brand rule sets its own payers, rules have no method, and
    // they count rupees whatever the switch says.
    filters: {
      type: filters.type,
      segment: filters.segment,
      payer: view === "rules" ? "per rule" : view === "scheme" ? "GOV" : filters.payer,
      ...(view === "rules" ? {} : { method: effectiveMethod(filters) }),
      basis: inUnits ? "qty" : "value",
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
