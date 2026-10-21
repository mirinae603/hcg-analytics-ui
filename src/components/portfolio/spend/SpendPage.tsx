"use client";
// Spend Analysis — HCG's Spend Margin Loss report as ONE static page, like Formulary Compliance
// (see FormularyPage for why: no nested routes under static export). The Summary first (HCG's
// KR spend mail on one screen of charts, the default), then three sections — Scheme, Cash &
// TPA, Out of formulary — each with its own views; both live in the URL (?section=&view=) and
// are synced with history.replaceState. Any one brand is the Brand filter, on every tab.
//
// Framed the one-screen way (ledger/onescreen), as HCG's own Power BI dashboards are: one slim
// bar with the title, the section tabs and, inside a section, its views; one strip of filter
// chips; then the content. An overview (the Summary, or a section's Overview) fills the screen
// on a desktop; the brand and doctor tables scroll as pages do, under the same bar and strip.
import React, { useEffect, useState } from "react";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { useAiPageContext } from "@/context/AiChatContext";
import { Skeleton } from "@/components/portfolio/ledger/kit";
import { OneScreenShell } from "@/components/portfolio/ledger/onescreen";
import { PageBar } from "@/components/portfolio/ledger/pagebar";
import { dayLabel } from "@/components/portfolio/ledger/format";
import { Notice } from "../formulary/parts";
import { errText, monthLabel, monthsLabel, plantParam } from "../formulary/api";
import FilterBar from "./FilterBar";
import Overview, { OverviewSkeleton } from "./Overview";
import { BrandNotHere, brandQuery, useBrandRow } from "./BrandFilter";
import CashOverview, { CashOverviewSkeleton } from "./CashOverview";
import Items from "./Items";
import Doctors from "./Doctors";
import SpendSummary, { SummarySkeleton } from "./summary/SpendSummary";
import {
  DEFAULT_FILTERS, PAGE_SECTIONS, VIEWS, getMeta, isMargin, pageViews, readLocation, writeLocation,
  type Filters, type Meta, type PageSection, type Section, type View,
} from "./api";

const TITLE = "Spend analysis";
const SUBTITLE = "Money HCG misses when a brand is used instead of the one its lists suggest — HCG's Spend Margin Loss report, from HIS IP + OP pharmacy sales.";
const SOURCE = "HIS IP + OP sales";

export default function SpendPage() {
  const { selectedRegion } = useRegion();
  const plant = plantParam(selectedRegion);
  const [section, setSection] = useState<PageSection>("summary");
  const [view, setView] = useState<View | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    let dead = false;
    getMeta()
      .then((m) => {
        if (dead) return;
        setMeta(m);
        setFilters((f) => ({ ...f, month: f.month || m.latest || m.months?.[m.months.length - 1] || "ALL" }));
      })
      .catch((e) => { if (!dead) setMetaErr(errText(e)); });
    return () => { dead = true; };
  }, []);

  const go = (loc: { section: PageSection; view: View }) => { setSection(loc.section); setView(loc.view); };
  useEffect(() => { go(readLocation(window.location.search)); }, []);

  useEffect(() => {
    if (view == null) return;
    const url = new URL(window.location.href);
    writeLocation(url, { section, view });
    if (url.search !== window.location.search) window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [section, view]);

  // Follow sidebar links to this same page while it is open, and back/forward.
  useEffect(() => {
    const here = () => window.location.pathname.replace(/\/+$/, "");
    const onPop = () => go(readLocation(window.location.search));
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.origin !== window.location.origin) return;
      if (a.pathname.replace(/\/+$/, "") !== here()) return;
      go(readLocation(a.search));
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("popstate", onPop); document.removeEventListener("click", onClick); };
  }, []);

  // Which payers this tab counts: Scheme is GOV patients by definition, Cash & TPA and Out of
  // formulary offer CASH / CASH(TPA), and the Summary each section's own. `own` is the section
  // with endpoints of its own; null on the Summary, which reads theirs.
  const own: Section | null = section === "summary" ? null : section;
  const payerMode = own == null ? "section" : isMargin(own) ? "cash" : "gov";
  const sectionInfo = PAGE_SECTIONS.find((x) => x.key === section);
  const views = pageViews(section);
  const where = plant === "ALL" ? "All hospitals" : displayRegion(selectedRegion.name);
  // An overview — the Summary or a section's Overview — is one screen of charts; the rest are tables.
  const overview = view === "overview";
  // A brand picked on another tab may have no use in this section: then the tab says so, and
  // where it was used, instead of drawing empty charts. Asked under the same filters the brand
  // list is (a hook: before the early returns).
  const brandRow = useBrandRow(filters.brand, brandQuery(filters, plant, payerMode === "cash"));
  const brandAbsent = !!filters.brand && own != null && brandRow !== undefined && !brandRow?.[own];

  // Tell the AI Analyst what is on screen (section, tab, month, hospital, filters), so a
  // question asked from here is read against it. A soft hint the user can remove from the
  // chat. It must run before the early returns below: it is a hook.
  useAiPageContext(meta && view && filters.month ? {
    page: "spend",
    label: `Spend analysis · ${sectionInfo?.label ?? section} · ${views.find((v) => v.key === view)?.label ?? view}`,
    section,
    view,
    month: filters.month,
    monthLabel: filters.month === "ALL" ? monthsLabel(meta, meta.months) : monthLabel(meta, filters.month),
    plant,
    hospital: displayRegion(selectedRegion.name),
    filters: {
      type: filters.type,
      segment: filters.segment,
      payer: payerMode === "gov" ? "GOV"
        : payerMode === "section" ? "per section"
        : payerMode === "cash" && filters.payer !== "CASH" && filters.payer !== "CASH(TPA)" ? "CASH+TPA"
        : filters.payer,
    },
  } : null);

  // The source and its date, said once for the page rather than on every chart.
  const asOf = dayLabel(meta?.built_at);
  const bar = (
    <PageBar title={TITLE} about={SUBTITLE} tabs={PAGE_SECTIONS} active={section}
      onTab={(s) => go({ section: s, view: pageViews(s).some((v) => v.key === view) ? (view as View) : "overview" })}
      subTabs={own && view ? { tabs: VIEWS[own], active: view, onTab: setView } : undefined}
      right={asOf ? `${SOURCE} · data as of ${asOf}` : SOURCE} />
  );

  if (metaErr) {
    return (
      <OneScreenShell fit={false} bar={bar} filters={null}>
        <Notice title="Spend data isn't available">{metaErr}</Notice>
      </OneScreenShell>
    );
  }
  if (!meta || !filters.month || view == null) {
    // The first load is drawn in the frame it will fill, as on Formulary: until the URL is read
    // the view is the default Overview, whose panels hold their places on one screen and the
    // strip its row, so nothing jumps (nor the AI launcher docks late) when the answer arrives.
    const shown: View = view ?? "overview";
    const placeholder = shown !== "overview" ? <Skeleton />
      : own == null ? <SummarySkeleton />
      : isMargin(own) ? <CashOverviewSkeleton kind={own as "cash" | "oof"} meta={meta} network={plant === "ALL"} />
      : <OverviewSkeleton />;
    return <OneScreenShell fit={shown === "overview"} bar={bar} filters={<div aria-hidden="true" className="h-9" />}>{placeholder}</OneScreenShell>;
  }
  if (!meta.months?.length) {
    return (
      <OneScreenShell fit={false} bar={bar} filters={null}>
        <Notice title="No spend months have been published yet">The build step reads the formulary line cache and HCG&apos;s scheme list: run python -m app.etl.spend.</Notice>
      </OneScreenShell>
    );
  }

  return (
    <OneScreenShell fit={overview && !brandAbsent} bar={bar}
      filters={<FilterBar meta={meta} filters={filters} onChange={setFilters} payerMode={payerMode} where={where} plant={plant} section={own} inLakhs={overview} />}>
      {own == null && <SpendSummary meta={meta} filters={filters} plant={plant} onGo={go} />}
      {own != null && brandAbsent && filters.brand && (
        <BrandNotHere brand={filters.brand} row={brandRow ?? null} section={own}
          onSection={(s) => go({ section: s, view })} onClear={() => setFilters((f) => ({ ...f, brand: null }))} />
      )}
      {own === "scheme" && overview && !brandAbsent && <Overview meta={meta} filters={filters} plant={plant} onOpen={setView} />}
      {own != null && overview && isMargin(own) && !brandAbsent && <CashOverview key={own} kind={own as "cash" | "oof"} meta={meta} filters={filters} plant={plant} onOpen={setView}
        onSection={(s) => go({ section: s, view: "overview" })} />}
      {own != null && view === "items" && !brandAbsent && <Items section={own} filters={filters} plant={plant} />}
      {own != null && view === "doctors" && !brandAbsent && <Doctors section={own} filters={filters} plant={plant} />}
    </OneScreenShell>
  );
}
