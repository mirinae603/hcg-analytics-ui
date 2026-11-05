"use client";
// Data exports: HCG asked for its IP & OP sales consolidated report and its GRN report as
// exports, separately. ONE static page with a tab each:
//   IP & OP sales by item — HIS pharmacy sales, one row per month × hospital × IP/OP × payer ×
//                           item × formulary class, with units, cost, revenue (MRP) and margin;
//   GRN purchases         — SAP goods-receipt lines, every plant, prices as SAP holds them.
// Each tab is a short header in plain words and the table itself, whose Export button writes
// the whole selection as a CSV (DatasetPanel). What a tab offers — its months, rows per month,
// columns and filters — comes from GET /export/meta, so a new month or column needs no change
// here.
//
// The frame is the one HCG's other pages use (PageBar + FilterStrip in the OneScreenShell),
// scrolling as their table tabs do. The tab lives in `?view=` and is synced with
// history.replaceState (no useSearchParams under static export). Filters are local to the page
// and kept per tab, since the two tables hold different months; the hospital is the global
// header selector.
import React, { useEffect, useState } from "react";
import { useRegion, displayRegion } from "@/context/RegionContext";
import { Skeleton } from "@/components/portfolio/ledger/kit";
import { OneScreenShell } from "@/components/portfolio/ledger/onescreen";
import { PageBar } from "@/components/portfolio/ledger/pagebar";
import { dayLabel } from "@/components/portfolio/ledger/format";
import { Notice } from "../formulary/parts";
import { errText, plantParam } from "../formulary/api";
import FilterBar from "./FilterBar";
import DatasetPanel from "./DatasetPanel";
import {
  DEFAULT_FILTERS, DEFAULT_TAB, TABS, fitFilters, getMeta, readView,
  type DatasetKey, type ExportMeta, type Filters,
} from "./api";

const TITLE = "Data exports";
const ABOUT = "IP & OP sales by item and GRN purchases as CSV files, a tab each. Pick the hospital in the header and the month and filters here: the table shows the rows, and its Export button writes every row it matches.";

export default function ExportsPage() {
  const { selectedRegion } = useRegion();
  const plant = plantParam(selectedRegion);
  // The tab the URL or a click asked for: undefined until the URL has been read, null when none
  // was asked for. Read in an effect, never during render (see FormularyPage: on a client
  // navigation into the page Next writes the new URL after render).
  const [picked, setPicked] = useState<DatasetKey | null | undefined>(undefined);
  const [meta, setMeta] = useState<ExportMeta | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<DatasetKey, Filters>>({ sales: DEFAULT_FILTERS, grn: DEFAULT_FILTERS });

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

  // Follow links to this same page while it is open (a sidebar entry for one tab): Next keeps
  // the page mounted for a query-only change, so nothing else would tell it. Back/forward
  // arrive as popstate.
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

  const tab: DatasetKey = picked ?? DEFAULT_TAB;
  const tabLabel = TABS.find((t) => t.key === tab)?.label ?? tab;
  const ds = meta?.datasets.find((d) => d.key === tab) ?? null;
  const ready = !!ds && ds.available && ds.months.length > 0;
  // The filters as applied, fitted to the open table while rendering: until a month is picked
  // the tab opens on the table's latest month.
  const shown = ds ? fitFilters(ds, filters[tab]) : filters[tab];
  const setShown = (f: Filters) => setFilters((all) => ({ ...all, [tab]: f }));
  const where = plant === "ALL" ? "All hospitals" : displayRegion(selectedRegion.name);
  const asOf = dayLabel(ds?.built_at ?? meta?.data_as_of);

  const bar = (
    <PageBar title={TITLE} about={ABOUT} tabs={TABS} active={tab} onTab={setPicked}
      right={asOf ? `data as of ${asOf}` : undefined} />
  );
  // The frame keeps a row for the strip whatever is in it, so the content never jumps.
  const strip = ready && ds
    ? <FilterBar ds={ds} filters={shown} onChange={setShown} where={where} />
    : <div aria-hidden="true" className="h-9" />;

  let content: React.ReactNode;
  if (metaErr) {
    content = <Notice title="Data exports aren't available">{metaErr}</Notice>;
  } else if (!meta || picked === undefined) {
    content = <Skeleton />;
  } else if (!ds) {
    content = <Notice title={`${tabLabel} isn't offered by the server yet`}>The export list (GET /export/meta) has no such table; the API is older than this page.</Notice>;
  } else if (!ds.available) {
    content = <Notice title={`${tabLabel} has not been built yet`}>{ds.note}</Notice>;
  } else if (!ready) {
    content = <Notice title={`${tabLabel} holds no months yet`}>{ds.note}</Notice>;
  } else {
    content = <DatasetPanel ds={ds} notes={meta.notes ?? []} filters={shown} plant={plant} />;
  }

  return (
    <OneScreenShell fit={false} bar={bar} filters={strip}>
      {content}
    </OneScreenShell>
  );
}
