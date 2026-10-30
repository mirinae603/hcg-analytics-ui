"use client";
// Spend Analysis — HCG's Spend Margin Loss report as ONE static page, like Formulary Compliance
// (see FormularyPage for why: no nested routes under static export). The Summary first (HCG's
// KR spend mail on one screen of charts, the default), then three sections — Scheme, Cash &
// TPA, Out of formulary — and two purchase analyses — Prices, Generic vs branded — each with
// its own views; both live in the URL (?section=&view=) and are synced with
// history.replaceState. Any one brand is the Brand filter, on every tab with a brand switch.
//
// Scheme and Cash & TPA are read from HIS sales (patients' bills: doctors, payers, patient
// types); Out of formulary from HCG's purchases (GRN), HCG's own method: it has vendors instead
// of doctors, no payer or patient type, and months of its own (oofFilters). Prices and Generic
// vs branded read purchases too, every GRN month (insightFilters, their months in /spend/meta);
// they compare products and suppliers, so the Brand filter does not apply there, and the
// product shown in detail on Prices is the page's (a dot, a bar or a Products row picks it).
// The page keeps one set of filters; each tab reads them through its own months (salesFilters
// for the bills), so a month picked on a purchase tab never asks a sales tab for a month it lacks.
//
// Framed the one-screen way (ledger/onescreen), as HCG's own Power BI dashboards are: one slim
// bar with the title, the section tabs and, inside a section, its views; one strip of filter
// chips; then the content. An overview (the Summary, or a section's Overview) fills the screen
// on a desktop; the brand, doctor and vendor tables scroll as pages do, under the same bar and
// strip.
import React, { useEffect, useState } from "react";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { useAiPageContext } from "@/context/AiChatContext";
import { Skeleton } from "@/components/portfolio/ledger/kit";
import { OneScreenShell } from "@/components/portfolio/ledger/onescreen";
import { PageBar } from "@/components/portfolio/ledger/pagebar";
import { dayLabel } from "@/components/portfolio/ledger/format";
import { Notice } from "../formulary/parts";
import { errText, monthLabel, monthsLabel, plantParam } from "../formulary/api";
import FilterBar, { type PayerMode } from "./FilterBar";
import Overview, { OverviewSkeleton } from "./Overview";
import { BrandNotHere, brandQuery, useBrandRow } from "./BrandFilter";
import CashOverview, { CashOverviewSkeleton } from "./CashOverview";
import OofOverview, { OofOverviewSkeleton } from "./OofOverview";
import Items from "./Items";
import Doctors from "./Doctors";
import { OofBrands, OofVendors } from "./OofTables";
import SpendSummary, { SummarySkeleton } from "./summary/SpendSummary";
import PricesOverview, { PricesOverviewSkeleton } from "./prices/PricesOverview";
import { PricesProducts } from "./prices/ProductsTable";
import GenericOverview, { GenericOverviewSkeleton } from "./generic/GenericOverview";
import {
  DEFAULT_FILTERS, PAGE_SECTIONS, getMeta, insightFilters, isInsight, oofFilters, oofMonths, pageViews,
  purchaseMonthLabel, purchaseMonthsLabel, purchaseMonthsOf, readLocation, salesFilters, writeLocation,
  type Filters, type InsightSection, type Meta, type PageSection, type Section, type View,
} from "./api";

const TITLE = "Spend analysis";
const SUBTITLE = "Money HCG misses when a brand is used (or bought) instead of the one its lists suggest — HCG's Spend Margin Loss report, from HIS IP + OP pharmacy sales and, for out of formulary, HCG's purchases (GRN) — and, from the same purchases, the prices paid for one product and what branded medicines cost against generics.";
const SOURCE = "HIS IP + OP sales";
/** Out of formulary and the purchase analyses. */
const PURCHASE_SOURCE = "HCG purchases (GRN)";

/** What each section's filters count: scheme GOV patients, cash & TPA cash and TPA patients,
 *  out of formulary purchases; the Summary each section's own. */
const PAYER_MODE: Record<Section, PayerMode> = { scheme: "gov", cash: "cash", oof: "purchases" };

export default function SpendPage() {
  const { selectedRegion } = useRegion();
  const plant = plantParam(selectedRegion);
  const [section, setSection] = useState<PageSection>("summary");
  const [view, setView] = useState<View | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // The product Prices shows in detail (a molecule key); null: the one with the most extra paid.
  const [molecule, setMolecule] = useState<string | null>(null);

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

  // Which payers this tab counts: Scheme is GOV patients by definition, Cash & TPA offers
  // CASH / CASH(TPA), out of formulary is purchases (no payer), and the Summary each section's
  // own. `own` is the margin section with endpoints of its own; null on the Summary, which reads
  // theirs, and on a purchase analysis (`insight`), which has endpoints of another kind.
  const insight: InsightSection | null = isInsight(section) ? section : null;
  const own: Section | null = section === "summary" || isInsight(section) ? null : section;
  const payerMode: PayerMode = own != null ? PAYER_MODE[own] : insight ? "purchases" : "section";
  const purchases = own === "oof";
  // The purchase analyses' months, from their build ([] until it has run).
  const bought = meta && insight ? purchaseMonthsOf(meta, insight) : null;
  // The filters as the open tab applies them: each data source has months of its own (sales for
  // the Summary, Scheme and Cash & TPA; purchases for the rest).
  const shown = !meta ? filters
    : purchases ? oofFilters(meta, filters)
    : insight ? (bought?.length ? insightFilters(bought, filters) : filters)
    : salesFilters(meta, filters);
  const sectionInfo = PAGE_SECTIONS.find((x) => x.key === section);
  const views = pageViews(section);
  const where = plant === "ALL" ? "All hospitals" : displayRegion(selectedRegion.name);
  // An overview — the Summary or a section's Overview — is one screen of charts; the rest are tables.
  const overview = view === "overview";
  // A brand picked on another tab may have no use in this section: then the tab says so, and
  // where it was used, instead of drawing empty charts. Asked under the same filters the brand
  // list is (a hook: before the early returns).
  const brandRow = useBrandRow(insight ? null : shown.brand, brandQuery(shown, plant, own));
  const brandAbsent = !!filters.brand && own != null && brandRow !== undefined && !brandRow?.[own];

  // Tell the AI Analyst what is on screen (section, tab, month, hospital, filters), so a
  // question asked from here is read against it. A soft hint the user can remove from the
  // chat. It must run before the early returns below: it is a hook.
  useAiPageContext(meta && view && shown.month ? {
    page: "spend",
    label: `Spend analysis · ${sectionInfo?.label ?? section} · ${views.find((v) => v.key === view)?.label ?? view}`,
    section,
    view,
    month: shown.month,
    monthLabel: insight && bought
      ? (shown.month === "ALL" ? purchaseMonthsLabel(bought, bought.map((m) => m.period)) : purchaseMonthLabel(bought, shown.month))
      : shown.month === "ALL" ? monthsLabel(meta, purchases ? oofMonths(meta) : meta.months) : monthLabel(meta, shown.month),
    plant,
    hospital: displayRegion(selectedRegion.name),
    filters: {
      type: purchases || insight ? "not applied (purchases)" : shown.type,
      segment: shown.segment,
      payer: payerMode === "gov" ? "GOV"
        : payerMode === "section" ? "per section"
        : payerMode === "purchases" ? "not applied (purchases)"
        : shown.payer !== "CASH" && shown.payer !== "CASH(TPA)" ? "CASH+TPA"
        : shown.payer,
    },
  } : null);

  // The source and its date, said once for the page rather than on every chart.
  const asOf = dayLabel(insight ? meta?.purchase_built_at : purchases ? meta?.oof_built_at : meta?.built_at);
  const source = purchases || insight ? PURCHASE_SOURCE : SOURCE;
  const bar = (
    <PageBar title={TITLE} about={SUBTITLE} tabs={PAGE_SECTIONS} active={section}
      onTab={(s) => go({ section: s, view: pageViews(s).some((v) => v.key === view) ? (view as View) : "overview" })}
      subTabs={section !== "summary" && view && views.length > 1 ? { tabs: views, active: view, onTab: setView } : undefined}
      right={asOf ? `${source} · data as of ${asOf}` : source} />
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
    const first: View = view ?? "overview";
    const placeholder = first !== "overview" ? <Skeleton />
      : insight === "prices" ? <PricesOverviewSkeleton />
      : insight === "generic" ? <GenericOverviewSkeleton />
      : own == null ? <SummarySkeleton />
      : own === "cash" ? <CashOverviewSkeleton meta={meta} network={plant === "ALL"} />
      : own === "oof" ? <OofOverviewSkeleton />
      : <OverviewSkeleton />;
    return <OneScreenShell fit={first === "overview"} bar={bar} filters={<div aria-hidden="true" className="h-9" />}>{placeholder}</OneScreenShell>;
  }
  // Out of formulary and the purchase analyses read the purchase build, which does not need the
  // sales months.
  if (!meta.months?.length && !purchases && !insight) {
    return (
      <OneScreenShell fit={false} bar={bar} filters={null}>
        <Notice title="No spend months have been published yet">The build step reads the formulary line cache and HCG&apos;s scheme list: run python -m app.etl.spend.</Notice>
      </OneScreenShell>
    );
  }

  // A purchase analysis needs its build's months before it can ask for a month.
  if (insight && !bought?.length) {
    return (
      <OneScreenShell fit={false} bar={bar} filters={null}>
        <Notice title="Price variation and generic vs branded aren't published yet">The build step reads HCG&apos;s GRN extracts and each month&apos;s Item Master: run python -m app.etl.purchase.</Notice>
      </OneScreenShell>
    );
  }

  return (
    <OneScreenShell fit={overview && !brandAbsent} bar={bar}
      filters={<FilterBar meta={meta} filters={shown} onChange={setFilters} payerMode={payerMode} where={where} plant={plant} section={own} inLakhs={overview}
        insight={insight && bought ? { months: bought } : null} />}>
      {section === "summary" && <SpendSummary meta={meta} filters={shown} plant={plant} onGo={go} />}
      {own != null && brandAbsent && shown.brand && (
        <BrandNotHere brand={shown.brand} row={brandRow ?? null} section={own}
          onSection={(s) => go({ section: s, view: pageViews(s).some((v) => v.key === view) ? view : "overview" })}
          onClear={() => setFilters((f) => ({ ...f, brand: null }))} />
      )}
      {!brandAbsent && own === "scheme" && overview && <Overview meta={meta} filters={shown} plant={plant} onOpen={setView} />}
      {!brandAbsent && own === "cash" && overview && <CashOverview meta={meta} filters={shown} plant={plant} onOpen={setView}
        onSection={(s) => go({ section: s, view: "overview" })} />}
      {!brandAbsent && own === "oof" && overview && <OofOverview meta={meta} filters={shown} plant={plant} onOpen={setView} />}
      {!brandAbsent && (own === "scheme" || own === "cash") && view === "items" && <Items section={own} filters={shown} plant={plant} />}
      {!brandAbsent && (own === "scheme" || own === "cash") && view === "doctors" && <Doctors section={own} filters={shown} plant={plant} />}
      {!brandAbsent && own === "oof" && view === "items" && <OofBrands filters={shown} plant={plant} />}
      {!brandAbsent && own === "oof" && view === "vendors" && <OofVendors filters={shown} plant={plant} />}
      {insight === "prices" && overview && <PricesOverview meta={meta} filters={shown} plant={plant} molecule={molecule} onMolecule={setMolecule} onOpen={setView} />}
      {insight === "prices" && view === "products" && (
        <PricesProducts filters={shown} plant={plant} onPick={(key) => { setMolecule(key); setView("overview"); }} />
      )}
      {insight === "generic" && overview && <GenericOverview meta={meta} filters={shown} plant={plant} />}
    </OneScreenShell>
  );
}
