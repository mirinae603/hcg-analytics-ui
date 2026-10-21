"use client";
// The two slim rows above a one-screen overview, in place of the title block, the tab card and
// the filter card that took ~380px before a single chart:
//   PageBar     — one 40px row: the page title with an (i) holding what the page measures, the
//                 tabs (Spend adds its section's views as a second, smaller group), and on the
//                 right the source and "data as of", said once per page rather than per chart.
//   FilterStrip — one 36px row of compact chip selects ("Month  Aug-26 ▾"), and on the right
//                 the selection in words. A filter that does not apply to the open tab shows as a
//                 locked chip whose title says why.
// Neither wraps: on a narrow screen each row scrolls sideways inside itself.
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbChevronDown, TbInfoCircle, TbLock } from "react-icons/tb";
import { CARD, INK, SUB, RULE, LEDGER_2 } from "./kit";

// ─────────────────────────────────────────────────────────────────────────────
// PageBar
// ─────────────────────────────────────────────────────────────────────────────
export type BarTab<T extends string> = { key: T; label: string; title?: string };

/** Underline tabs; arrow keys, Home and End move between them, as in the drawer's tabs. */
function Tabs<T extends string>({ label, tabs, active, onTab, small = false }: {
  label: string; tabs: BarTab<T>[]; active: T; onTab: (t: T) => void; small?: boolean;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.key === active);
    const to = e.key === "ArrowRight" ? (i + 1) % tabs.length
      : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onTab(tabs[to].key);
    refs.current[tabs[to].key]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className="flex items-stretch self-stretch flex-shrink-0">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button key={t.key} ref={(el) => { refs.current[t.key] = el; }} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1}
            title={t.title} onClick={() => { if (!on) onTab(t.key); }}
            className={`hcg-tab relative whitespace-nowrap transition-colors ${small ? "px-2 text-[12px]" : "px-2.5 text-[13px]"}`}
            style={{ color: on ? INK : SUB, fontWeight: on ? 700 : 500 }}>
            {t.label}
            <span aria-hidden="true" className="absolute left-2 right-2 bottom-0 rounded-full" style={{ height: 2, background: on ? INK : "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}

const POP_W = 340;

/** The (i) beside the title: a small popover with what the page measures. In a portal, because
 *  the bar scrolls sideways and would clip it. */
function About({ topic, text }: { topic: string; text: string }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const open = at != null;

  const show = () => {
    const r = btn.current?.getBoundingClientRect();
    if (r) setAt({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - POP_W - 8)) });
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setAt(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { close(); btn.current?.focus(); } };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button ref={btn} type="button" onClick={() => (open ? setAt(null) : show())} aria-expanded={open} aria-controls={id}
        aria-label={`About ${topic}`} title={text}
        className="hcg-tab inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0" style={{ color: SUB }}>
        <TbInfoCircle size={15} aria-hidden="true" />
      </button>
      {at && typeof document !== "undefined" && createPortal(
        <div ref={pop} id={id} role="note" className="fixed rounded-[10px] px-3.5 py-2.5 text-[12px] leading-relaxed"
          style={{ top: at.top, left: at.left, width: POP_W, zIndex: 55, background: CARD, color: INK, border: `1px solid ${RULE}`, boxShadow: "0 18px 44px -24px rgba(30,38,34,.4)" }}>
          {text}
        </div>,
        document.body,
      )}
    </>
  );
}

export function PageBar<T extends string, U extends string = string>({ title, about, tabs, active, onTab, subTabs, right }: {
  title: string;
  /** What the page measures, behind the (i): the old subtitle. */
  about?: string;
  tabs: BarTab<T>[];
  active: T;
  onTab: (t: T) => void;
  /** A second, smaller group: the views of the active tab (Spend's Overview · Brands · Doctors). */
  subTabs?: { tabs: BarTab<U>[]; active: U; onTab: (u: U) => void };
  /** The right end: "HIS IP + OP sales · data as of 10-Oct-26". */
  right?: React.ReactNode;
}) {
  return (
    // In fit mode the AI Analyst's launcher docks over the bar's right end: 44px are kept free.
    <div className="flex items-center gap-2.5 h-10 min-w-0 overflow-x-auto no-scrollbar whitespace-nowrap fit:onescreen:pr-11"
      style={{ borderBottom: `1px solid ${RULE}` }}>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <h1 className="text-[15px] font-semibold" style={{ color: INK, letterSpacing: "-.01em" }}>{title}</h1>
        {about && <About topic={title} text={about} />}
      </div>
      <Tabs label={`${title} views`} tabs={tabs} active={active} onTab={onTab} />
      {subTabs && subTabs.tabs.length > 0 && (
        <>
          <span aria-hidden="true" className="w-px h-4 flex-shrink-0" style={{ background: RULE }} />
          <Tabs label={`${tabs.find((t) => t.key === active)?.label ?? title} views`} tabs={subTabs.tabs} active={subTabs.active} onTab={subTabs.onTab} small />
        </>
      )}
      {right && <div className="ml-auto pl-3 text-[11px] flex-shrink-0" style={{ color: SUB }}>{right}</div>}
      <style jsx global>{`
        .hcg-tab:hover{color:${INK}!important}
        .hcg-tab:focus-visible{outline:2px solid ${INK};outline-offset:-3px;border-radius:8px}
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterStrip
// ─────────────────────────────────────────────────────────────────────────────
export type FilterOption = { key: string; label: string; disabled?: boolean };
export type FilterControl = {
  key: string;
  /** The muted word inside the chip: "Month". */
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  /** Set when the filter does not apply to the open tab: the reason, as the chip's title. The
   *  chip shows `value` (the fixed one) and cannot be changed. */
  locked?: string;
};

function Chip({ c }: { c: FilterControl }) {
  const id = useId();
  const locked = c.locked != null;
  return (
    <label htmlFor={id} title={c.locked} className="hcg-chip relative inline-flex items-center h-7 flex-shrink-0 rounded-full pl-3 pr-7 text-[12px]"
      style={{ background: locked ? LEDGER_2 : CARD, border: `1px ${locked ? "dashed" : "solid"} ${RULE}`, cursor: locked ? "not-allowed" : "pointer" }}>
      <span style={{ color: SUB }}>{c.label}</span>
      <select id={id} value={c.value} disabled={locked} onChange={(e) => c.onChange(e.target.value)}
        aria-describedby={locked ? `${id}-why` : undefined}
        className="appearance-none bg-transparent pl-1.5 font-semibold focus:outline-none"
        style={{ color: INK, cursor: "inherit" }}>
        {c.options.map((o) => <option key={o.key} value={o.key} disabled={o.disabled}>{o.label}</option>)}
      </select>
      {locked && <span id={`${id}-why`} className="sr-only">{c.locked}</span>}
      <span aria-hidden="true" className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: SUB }}>
        {locked ? <TbLock size={12} /> : <TbChevronDown size={13} />}
      </span>
    </label>
  );
}

export function FilterStrip({ controls, selection, children }: {
  controls: FilterControl[];
  /** The selection in words: "KR Bangalore · Aug-26 · IP only · ₹ in lakhs, exact rupees in details". */
  selection: React.ReactNode;
  /** Controls of a page's own after the chips (Spend's Brand search), drawn in the same chip style. */
  children?: React.ReactNode;
}) {
  return (
    <div role="group" aria-label="Filters" className="flex items-center gap-2 h-9 min-w-0 overflow-x-auto no-scrollbar">
      {controls.map((c) => <Chip key={c.key} c={c} />)}
      {children}
      <div className="ml-auto pl-2 min-w-0 truncate text-[11.5px]" style={{ color: SUB }}>{selection}</div>
      <style jsx global>{`
        .hcg-chip{transition:border-color .15s ease}
        .hcg-chip:hover:not(:has(select:disabled)){border-color:${INK}55!important}
        .hcg-chip:has(select:focus-visible){outline:2px solid ${INK};outline-offset:1px}
      `}</style>
    </div>
  );
}
