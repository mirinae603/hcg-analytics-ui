"use client";
// The months each data source covers, and the stock count's date, read from the backend
// (GET /meta/windows) so no page writes "6 months" or "31 May 2026" in. A new stock count, or a
// new month of data, then changes every label on the next load with no code change.
//
// One request per page load, shared by every component that asks: the windows only move when the
// data is rebuilt. While it loads, or if it fails, useWindows() gives null and the helpers below
// give "" — a caller leaves the window out of its sentence rather than guess one.
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

/** One source's months: the first and last 'YYYY-MM', how many months hold data, and the months
 *  missing inside that span (the consumption extracts have no Aug 2026). */
export type Window = { from: string; to: string; months: number; gaps: string[] };

export type WindowKey =
  | "consumption"              // internal goods-issue, every month received
  | "consumption_to_snapshot"  // the issues up to the stock count: days on hand, turnover, non-moving, stock-outs
  | "grn"                      // goods receipts: cycle time, purchase value
  | "po"                       // purchase orders
  | "legacy_sales"             // the older billed-sales tables, kept to their months on purpose
  | "sales"                    // HIS pharmacy sales: formulary, spend, revenue, exports
  | "purchases";               // the purchase build: prices, generic vs branded, out of formulary

export type Windows = {
  inventory_snapshot: string | null;           // 'YYYY-MM-DD', the stock count's date
  windows: Record<WindowKey, Window | null>;   // null: that source is not built
  skus_total: number | null;                   // materials held at the count or issued up to it
  skus_in_stock: number | null;                // materials held at the count
  stock_value: number | null;                  // the count's book value at cost, ₹
  hospitals: number | null;                    // plants with any data (the hospital picker's list)
  about: Partial<Record<WindowKey, string>>;   // each window in plain words, for a tooltip
  data_as_of: string | null;                   // newest build time, ISO UTC
};

let pending: Promise<Windows> | null = null;
let loaded: Windows | null = null;

function load(): Promise<Windows> {
  if (!pending) {
    pending = apiFetch<Windows>("/meta/windows")
      .then((d) => { loaded = d; return d; })
      .catch((e) => { pending = null; throw e; });   // a later mount tries again
  }
  return pending;
}

/** The data windows, or null while loading / on error. */
export function useWindows(): Windows | null {
  const [w, setW] = useState<Windows | null>(loaded);
  useEffect(() => {
    // The shared request can land between this component's render (which read `loaded` as null)
    // and this effect: take the answer then, or the component would keep null until it remounts.
    // React skips the update when the render already had it.
    if (loaded) { setW(loaded); return; }
    let live = true;
    load().then((d) => { if (live) setW(d); }).catch(() => { /* the labels stay "" */ });
    return () => { live = false; };
  }, []);
  return w;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** '2026-05' -> 'May 2026'. */
export function monthLabel(ym: string): string {
  const m = MON[Number(ym.slice(5, 7)) - 1];
  return m ? `${m} ${ym.slice(0, 4)}` : ym;
}

/** 6 -> "6 months", 1 -> "1 month"; "" for none. */
export function monthsText(n: number | null | undefined): string {
  return n && n > 0 ? `${n} month${n === 1 ? "" : "s"}` : "";
}

/** A window's month count in words: "6 months"; "" when the window is unknown. */
export function monthsLabel(w: Pick<Window, "months"> | null | undefined): string {
  return monthsText(w?.months);
}

/** "Dec 2025 – May 2026, 6 months"; one month: "Aug 2026, 1 month"; a month with no data inside the
 *  span is named: "Dec 2025 – Sep 2026, 9 months (no Aug 2026)". "" when the window is unknown. */
export function windowLabel(w: (Pick<Window, "from" | "to" | "months"> & { gaps?: string[] }) | null | undefined): string {
  if (!w) return "";
  const span = w.from === w.to ? monthLabel(w.from) : `${monthLabel(w.from)} – ${monthLabel(w.to)}`;
  const gaps = w.gaps?.length ? ` (no ${w.gaps.map(monthLabel).join(", ")})` : "";
  return `${span}, ${monthsText(w.months)}${gaps}`;
}

/** The pill most pages carry: "6-month window"; "" when the window is unknown. */
export function windowPill(w: Pick<Window, "months"> | null | undefined): string {
  return w?.months ? `${w.months}-month window` : "";
}

/** The stock count's date as the pages print it: '2026-05-31' -> "31 May 2026"; "" when unknown. */
export function snapshotLabel(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  return `${Number(iso.slice(8, 10))} ${monthLabel(iso.slice(0, 7))}`;
}
