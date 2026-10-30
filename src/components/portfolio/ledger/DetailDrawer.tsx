"use client";
// The detail drawer a KPI card opens: HCG's "click a card, see the detailed summary". A
// right-hand sheet on a desktop, a full-screen sheet on a phone. Its header repeats the card's
// figure, what it is compared with, its source and the filters it was computed under; below
// it, the same tabs on every card (Summary · Trend · Breakdown · As in HCG mail · Method).
// Only the open tab renders, so a tab that fetches does so when first viewed.
//
// Dialog behaviour: it renders in a portal on <body> (a card's entrance animation leaves a
// transform on its ancestors, which would trap a fixed panel inside them); the page behind
// stops scrolling; focus moves into the panel, Tab stays inside it, Esc / the scrim / the
// close button close it, and focus returns to whatever opened it.
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbX } from "react-icons/tb";
import { INK, SUB, LINE, RULE } from "./kit";
import { DeltaChip, SourceBadge, StatusChip, type DeltaProps } from "./KpiCard";
import { Swatch } from "./charts";
import type { SourceOf, Status } from "./status";

export type DrawerTab = { key: string; label: string; render: () => React.ReactNode; hidden?: boolean };
export type DrawerFilter = { label: string; value: string };
export type DrawerKpi = { value: string; comparator?: string; delta?: DeltaProps; status?: Status };

/** A card's drawer state: open, and the tab it opens on (the card opens its first tab, the
 *  (i) opens Method). The tab is kept while the drawer slides shut, so its content does not
 *  change under the animation. */
export type DrawerCtl = { open: boolean; tab?: string; show: (tab?: string) => void; close: () => void };

export function useDrawer(): DrawerCtl {
  const [s, setS] = useState<{ open: boolean; tab?: string }>({ open: false });
  return {
    ...s,
    show: (tab) => setS({ open: true, tab }),
    close: () => setS((p) => ({ ...p, open: false })),
  };
}

const SLIDE_MS = 340;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function DetailDrawer({
  open, onClose, eyebrow, title, kpi, source, asOf, filters, tabs, initialTab, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  /** "Formulary compliance · Overview". */
  eyebrow: string;
  title: React.ReactNode;
  kpi?: DrawerKpi;
  /** Where the figure comes from; a SourceSpec gives its badge the section's own words. */
  source?: SourceOf;
  asOf?: string | null;
  /** The filters the figure was computed under, shown read-only. */
  filters?: DrawerFilter[];
  tabs: DrawerTab[];
  initialTab?: string;
  /** 'wide' for tables with many columns. */
  size?: "md" | "wide";
}) {
  const uid = useId().replace(/:/g, "");
  const visible = tabs.filter((t) => !t.hidden);
  const [picked, setPicked] = useState<string | null>(null);
  const fallback = initialTab && visible.some((t) => t.key === initialTab) ? initialTab : visible[0]?.key;
  const active = picked && visible.some((t) => t.key === picked) ? picked : fallback;
  const current = visible.find((t) => t.key === active);

  // Mounted while open or sliding out; `shown` drives the slide.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (open) {
      if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
        openerRef.current = document.activeElement;
      }
      setMounted(true);
      // setTimeout, not requestAnimationFrame: rAF does not fire in a background tab.
      const id = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(id);
    }
    setShown(false);
    const id = setTimeout(() => { setMounted(false); setPicked(null); }, SLIDE_MS);
    return () => clearTimeout(id);
  }, [open]);

  // Focus in on mount; back to the opener once the panel is gone.
  useEffect(() => {
    if (mounted) {
      panelRef.current?.focus({ preventScroll: true });
      return;
    }
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  }, [mounted]);

  // Page scroll lock. Hiding a classic scrollbar widens the page; pad by exactly the width it
  // gained (measured, so overlay scrollbars and phones get no padding at all).
  useEffect(() => {
    if (!mounted) return;
    const b = document.body;
    const prev = { overflow: b.style.overflow, paddingRight: b.style.paddingRight };
    const before = b.clientWidth;
    const pad = parseFloat(getComputedStyle(b).paddingRight) || 0;
    b.style.overflow = "hidden";
    const gained = b.clientWidth - before;
    if (gained > 0) b.style.paddingRight = `${pad + gained}px`;
    return () => { b.style.overflow = prev.overflow; b.style.paddingRight = prev.paddingRight; };
  }, [mounted]);

  // Esc closes; Tab and Shift+Tab cycle inside the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (e.key === "Escape") { e.preventDefault(); onCloseRef.current(); return; }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
      if (!items.length) { e.preventDefault(); panel.focus(); return; }
      const first = items[0], last = items[items.length - 1], at = document.activeElement;
      if (e.shiftKey && (at === first || at === panel || !panel.contains(at))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === last || !panel.contains(at))) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onTabKey = (e: React.KeyboardEvent) => {
    const i = visible.findIndex((t) => t.key === active);
    const to = e.key === "ArrowRight" ? (i + 1) % visible.length
      : e.key === "ArrowLeft" ? (i - 1 + visible.length) % visible.length
      : e.key === "Home" ? 0 : e.key === "End" ? visible.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    setPicked(visible[to].key);
    tabRefs.current[visible[to].key]?.focus();
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0"
        style={{ zIndex: 60, background: "rgba(18,20,32,0.34)", backdropFilter: "blur(2px)", opacity: shown ? 1 : 0, transition: "opacity .3s ease" }} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} tabIndex={-1}
        className={[
          "fixed inset-0 flex flex-col bg-white outline-none",
          "sm:inset-y-0 sm:left-auto sm:right-0 sm:shadow-[-26px_0_64px_-22px_rgba(20,24,40,0.34)]",
          size === "wide" ? "sm:w-[min(1120px,96vw)]" : "sm:w-[min(880px,96vw)]",
          "transition-transform duration-[340ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
          shown ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full",
        ].join(" ")}
        style={{ zIndex: 61 }}>
        <div className="px-5 md:px-6 pt-5 pb-4" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: SUB }}>{eyebrow}</div>
              <h2 id={`${uid}-title`} className="text-[19px] font-extrabold leading-tight mt-0.5" style={{ color: INK }}>{title}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close details"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#f2f3f6] focus-visible:outline focus-visible:outline-2"
              style={{ color: SUB }}>
              <TbX size={19} />
            </button>
          </div>
          {kpi && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
              <span className="text-[26px] font-light tabular-nums leading-none" style={{ color: INK }}>{kpi.value}</span>
              {kpi.comparator && <span className="text-[12.5px] tabular-nums" style={{ color: SUB }}>{kpi.comparator}</span>}
              {kpi.status && <StatusChip status={kpi.status} />}
              {kpi.delta && <DeltaChip {...kpi.delta} />}
            </div>
          )}
          {(source || filters?.length) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
              {source && <SourceBadge source={source} asOf={asOf} />}
              {filters?.map((f) => (
                <span key={f.label} className="text-[11px] rounded-full px-2.5 py-[3px] whitespace-nowrap" style={{ color: SUB, border: `1px solid ${RULE}` }}>
                  {f.label}: <b style={{ color: INK, fontWeight: 600 }}>{f.value}</b>
                </span>
              ))}
            </div>
          )}
        </div>
        {visible.length > 1 && (
          <div role="tablist" aria-label="Detail views" onKeyDown={onTabKey}
            className="flex gap-1 px-3 overflow-x-auto no-scrollbar flex-shrink-0" style={{ borderBottom: `1px solid ${RULE}` }}>
            {visible.map((t) => {
              const on = t.key === active;
              return (
                <button key={t.key} ref={(el) => { tabRefs.current[t.key] = el; }} type="button" role="tab"
                  id={`${uid}-tab-${t.key}`} aria-selected={on} aria-controls={`${uid}-panel`} tabIndex={on ? 0 : -1}
                  onClick={() => setPicked(t.key)}
                  className="relative px-3 py-2.5 text-[13px] whitespace-nowrap transition-colors"
                  style={{ color: on ? INK : SUB, fontWeight: on ? 700 : 500 }}>
                  {t.label}
                  <span className="absolute left-2 right-2 -bottom-px rounded-full" style={{ height: 2, background: on ? INK : "transparent" }} />
                </button>
              );
            })}
          </div>
        )}
        <div role={visible.length > 1 ? "tabpanel" : undefined} id={`${uid}-panel`}
          aria-labelledby={visible.length > 1 && active ? `${uid}-tab-${active}` : undefined}
          className="flex-1 overflow-y-auto px-5 md:px-6 py-5">
          {current?.render()}
        </div>
      </div>
    </>,
    document.body,
  );
}

/** A titled block inside a drawer tab: the drawer's equivalent of a card's Head. */
export function DrawerSection({ title, note, children }: { title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <h3 className="text-[14px] font-semibold" style={{ color: INK }}>{title}</h3>
      {note && <p className="text-[12px] mt-1 leading-snug" style={{ color: SUB }}>{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** One of a drawer's key figures, already formatted (exact rupees in a drawer). `color` puts the
 *  legend key of the chart series it is beside the label; `hatched` for a figure outside a ratio. */
export type KeyFigure = { label: string; value: string; note?: string; color?: string; hatched?: boolean };

/** A drawer's "Key figures": each one's label, exact value and what it is, two to a row. */
export function KeyFigures({ figures }: { figures: KeyFigure[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {figures.map((f) => (
        <div key={f.label} className="min-w-0 pl-3" style={{ borderLeft: `1px solid ${RULE}` }}>
          <dt className="flex items-center gap-1.5">
            {f.color && <Swatch color={f.color} hatched={f.hatched} />}
            <span className="text-[10.5px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".08em" }}>{f.label}</span>
          </dt>
          <dd className="text-[17px] font-bold tabular-nums mt-1" style={{ color: INK }}>{f.value}</dd>
          {f.note && <dd className="text-[11px] leading-snug" style={{ color: SUB }}>{f.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
