"use client";
// One-screen overviews. HCG's own Power BI dashboards, and the hospital formulary-compliance and
// spend dashboards it pointed to, show most of their charts on one screen instead of a page of
// cards to scroll. The Formulary and Spend overviews are framed the same way:
//
//   OneScreenShell — the page frame: PageBar, FilterStrip, then the content. On an Overview tab
//                    (`fit`) it is exactly the viewport below the app header, and the content row
//                    takes whatever the bar and the strip leave; on a table tab it is a normal
//                    scrolling page under the same bar and strip.
//   OneScreenGrid  — the content of an Overview: 12 columns × 3 rows of panels in fit mode; a
//                    one- or two-column stack that scrolls everywhere else.
//   Place          — where a panel sits in fit mode, typed. It travels through CSS variables, so
//                    no class name has to be generated per placement (Tailwind only sees fixed
//                    class names).
//   PanelSkeleton  — a panel's loading placeholder, in the panel's own place, so nothing jumps
//                    when the answer arrives.
//
// Fit mode is the `fit:` variant in globals.css: at least 1280px wide and 760px tall. Below it
// (1366×768 laptops, tablets, phones) the same panels stack in DOM order, which is therefore
// the priority order: the key figure, the trend, the composition, the split, where the unit
// stands, then the lists. Two abreast, a half-width panel moves up into a cell a full-width one
// would leave empty (a key figure followed by its trend), rather than leave a hole in the page.
import React, { useEffect } from "react";
import { LedgerStyles, PAGE, SKELETON } from "./kit";

/** A panel's place in the fit grid, 1-based: column `col` spanning `span` of 12, row `row`
 *  spanning `rows` (1 unless set) of 3. `minH` is its height in px when the page stacks (240
 *  unless set): a list that needs room, such as the ranking of every unit, asks for more. */
export type Place = { col: number; span: number; row: number; rows?: number; minH?: number };

export const GRID_COLS = 12;

/** A panel at least half the grid wide, or more than one row tall, takes both columns of the
 *  two-column stack. */
const isBig = (p: Place) => p.span >= GRID_COLS / 2 || (p.rows ?? 1) > 1;

// Whole class names only (no class glued to an interpolation), so Tailwind's scanner sees each.
const PLACED = "min-w-0 min-h-[var(--panel-min,240px)] fit:min-h-0 fit:[grid-column:var(--c)] fit:[grid-row:var(--r)]";
const PLACED_BIG = `${PLACED} md:col-span-2`;

/** The class names and CSS variables that put an element in `p`'s place. In fit mode the
 *  placement comes from --c / --r; in the stack it is ignored and --panel-min sets the height.
 *  (The `fit:` rules are emitted after the `md:` ones, so they win where both match.) */
export function placeProps(p: Place): { className: string; style: React.CSSProperties } {
  return {
    className: isBig(p) ? PLACED_BIG : PLACED,
    style: {
      "--c": `${p.col} / span ${p.span}`,
      "--r": `${p.row} / span ${p.rows ?? 1}`,
      ...(p.minH ? { "--panel-min": `${p.minH}px` } : {}),
    } as React.CSSProperties,
  };
}

/** Panels enter top-left first, row by row, a few ms apart. */
export const entranceDelay = (p: Place) => ((p.row - 1) * GRID_COLS + (p.col - 1)) * 6;

// Sized to the viewport below the header (AppHeader writes --app-header-h). svh, not dvh: dvh
// resizes as a phone's address bar slides, which would re-lay the grid while scrolling.
const FIT_FRAME = "fit:h-[calc(100svh-var(--app-header-h))] fit:grid fit:grid-rows-[auto_auto_minmax(0,1fr)] fit:overflow-hidden";

export function OneScreenShell({ fit, bar, filters, children }: {
  /** An Overview tab: one screen on a desktop. Table tabs pass false and scroll as pages do. */
  fit: boolean;
  /** The PageBar. */
  bar: React.ReactNode;
  /** The FilterStrip. */
  filters: React.ReactNode;
  children: React.ReactNode;
}) {
  // While an overview is on one screen the AI Analyst's launcher docks at the end of the
  // PageBar (AiFloater, `onescreen:`), off the bottom-right panel it would otherwise cover.
  useEffect(() => {
    if (!fit) return;
    const root = document.documentElement;
    root.dataset.onescreen = "fit";
    return () => { delete root.dataset.onescreen; };
  }, [fit]);

  return (
    <div className={`-m-4 md:-m-6 px-4 md:px-5 py-3 flex flex-col gap-y-2 min-h-[calc(100svh-var(--app-header-h))] ${fit ? FIT_FRAME : ""}`}
      style={{ background: PAGE }}>
      <LedgerStyles />
      {bar}
      {filters}
      <div className={fit ? "fit:min-h-0" : undefined}>{children}</div>
    </div>
  );
}

export function PanelSkeleton({ place }: { place: Place }) {
  const p = placeProps(place);
  return <div aria-hidden="true" className={`${p.className} rounded-[14px] animate-pulse`} style={{ ...p.style, background: SKELETON }} />;
}

export function OneScreenGrid({ ariaLabel, loading = false, stale = false, skeleton = [], children }: {
  /** What the grid shows, for screen readers: "Formulary compliance, KR Bangalore, Aug-26". */
  ariaLabel: string;
  /** No answer yet: the skeleton's places are drawn instead of the panels. */
  loading?: boolean;
  /** A new answer is loading while the last one stays on screen, dimmed. */
  stale?: boolean;
  /** The places of the panels that will arrive. */
  skeleton?: Place[];
  children: React.ReactNode;
}) {
  return (
    <div role="region" aria-label={ariaLabel} aria-busy={loading || stale || undefined}
      className="grid gap-3 grid-cols-1 md:grid-cols-2 md:grid-flow-dense fit:grid-cols-12 fit:grid-rows-3 fit:h-full fit:min-h-0"
      style={{ opacity: stale ? 0.6 : 1, transition: "opacity .2s ease" }}>
      {loading ? skeleton.map((p) => <PanelSkeleton key={`${p.row}-${p.col}`} place={p} />) : children}
    </div>
  );
}
