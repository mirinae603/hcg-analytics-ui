"use client";
// The panel every one-screen overview is built from: a chart on a tile that fills its grid cell,
// with a one-line header (title, the hospital and period, the chart's legend, the (i) and a
// details button). A click opens the panel's DetailDrawer, where the exact rupees, the tables
// and the method live; the face carries charts with their key figures as labels, in lakhs.
//
//   ChartPanel      — the tile. Its body is ONE button that opens the drawer, unless the chart
//                     has buttons of its own (`interactive`: rows that select a hospital or open
//                     their own drawer), when only the ↗ in the header opens it.
//   usePanel        — what a chart inside a panel reads: the body's size, so the chart fills the
//                     cell instead of growing it. Null outside a panel (in a drawer), where a
//                     chart keeps its own height, legend and readout.
//   usePanelLegend  — a chart hands its legend to the panel header (or the top of the body when
//                     the header has no room for it).
//   usePanelReadout — a chart's hover readout takes the legend's place in the header while the
//                     pointer is on the chart: fixed height, nothing reflows.
//   PanelPart       — the part of a body a chart fills when it shares the body with something
//                     else (a line of figures over a bridge, a 100% bar over a list).
//   fitRows, MoreRows — a list shows the rows that fit and ends on "+N more" (the drawer has all).
//   InfoButton, LinkButton — the (i), and the pill that moves to another tab of the page.
//
// The (i) and ↗ are siblings of the body's button, never inside it: a button may not hold
// another, and a keyboard or screen-reader user must reach each on its own. The body's
// accessible name is `label`: the title and the key figures in words.
import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { TbArrowRight, TbArrowUpRight, TbInfoCircle } from "react-icons/tb";
import { CARD, INK, SUB, LINE, RULE, LEDGER_2, SH_CARD, SH_HOVER, tint } from "./kit";
import { Legend, legendWidth, type LegendItem } from "./legend";
import { SourceBadge } from "./KpiCard";
import { useSize, type Size } from "./minis";
import { clamp, textW } from "./scale";
import { sourceKind, type SourceOf } from "./status";
import { entranceDelay, placeProps, type Place } from "./onescreen";

// ─────────────────────────────────────────────────────────────────────────────
// What a chart inside a panel reads
// ─────────────────────────────────────────────────────────────────────────────
export type PanelApi = {
  /** The body's size in px, less the legend line when the legend sits in the body. */
  size: Size;
  setReadout: (node: React.ReactNode | null) => void;
  setLegend: (items: LegendItem[] | null) => void;
};

const PanelContext = createContext<PanelApi | null>(null);

export const usePanel = (): PanelApi | null => useContext(PanelContext);

/** Hands `items` to the panel's header; returns whether the chart is inside a panel (outside
 *  one it prints its own legend). Keyed on the items' content, so a chart can build the array
 *  afresh on every render. */
export function usePanelLegend(items: LegendItem[] | null): boolean {
  const panel = usePanel();
  const setLegend = panel?.setLegend;
  const key = items?.length ? JSON.stringify(items) : "";
  useEffect(() => {
    if (!setLegend) return;
    setLegend(key ? (JSON.parse(key) as LegendItem[]) : null);
    return () => setLegend(null);
  }, [setLegend, key]);
  return panel != null;
}

/** Shows `render()` in the panel's header while `active` is set (the hovered month or row) and
 *  the legend again when it is null. Does nothing outside a panel. */
export function usePanelReadout(active: string | number | null, render: () => React.ReactNode) {
  const setReadout = usePanel()?.setReadout;
  const renderRef = useRef(render);
  useEffect(() => { renderRef.current = render; });
  useEffect(() => {
    if (!setReadout) return;
    setReadout(active == null ? null : renderRef.current());
  }, [setReadout, active]);
  useEffect(() => () => setReadout?.(null), [setReadout]);
}

/** The rest of a panel's body, for a chart drawn under (or over) other content: the chart reads
 *  this part's size instead of the whole body's, so it fills what is left rather than spilling
 *  out of the panel. The part takes the flex space of a column body. Outside a panel (in a
 *  drawer) it adds nothing: the chart keeps its own height. */
export function PanelPart({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const panel = usePanel();
  const [ref, size] = useSize<HTMLDivElement>({ w: 0, h: 0 });
  const api = useMemo<PanelApi | null>(() => (panel ? { ...panel, size } : null), [panel, size]);
  if (!panel) return <>{children}</>;
  return (
    <div ref={ref} className={`relative flex-1 min-h-0 ${className}`}>
      {api && size.w > 0 && size.h > 0 ? <PanelContext.Provider value={api}>{children}</PanelContext.Provider> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lists that fit
// ─────────────────────────────────────────────────────────────────────────────
/** The height of the "+N more" line. */
export const MORE_H = 16;

export type Fit<T> = { shown: T[]; hidden: number; rowH: number };

/** The rows a list shows in `room` px: as many as fit at `minH` each (with what else the shown
 *  rows need, e.g. group captions, from `extra`), keeping a line for "+N more" when some do
 *  not, and never hiding the selected row (it takes the last place). Then the height each
 *  shown row gets, up to `maxH`. Outside a panel `room` is Infinity: every row, at `maxH`. */
export function fitRows<T extends { selected?: boolean }>(
  rows: T[], room: number, { minH, maxH, extra = () => 0 }: { minH: number; maxH: number; extra?: (shown: T[]) => number },
): Fit<T> {
  if (!Number.isFinite(room)) return { shown: rows, hidden: 0, rowH: maxH };
  const n = rows.length;
  const need = (k: number) => k * minH + extra(rows.slice(0, k)) + (k < n ? MORE_H : 0);
  let k = n;
  while (k > 0 && need(k) > room) k--;
  const sel = rows.findIndex((r) => r.selected);
  const shown = sel >= k && k > 0 ? [...rows.slice(0, k - 1), rows[sel]] : rows.slice(0, k);
  const left = room - extra(shown) - (k < n ? MORE_H : 0);
  return { shown, hidden: n - k, rowH: k ? clamp(Math.floor(left / k), minH, maxH) : minH };
}

/** Where a group of rows starts: its name (printed when there is one) and whether it is the
 *  list's first group (the others sit a hairline below the one before). */
export type GroupHead = { name: string; first: boolean };

const GROUP_CAPTION_H = 12;
const GROUP_GAP_H = 4;

/** The head each row starts, or null. A list of one group has none. `all` is the whole list
 *  when `rows` are the ones shown. Without `named` the groups keep only the hairline between
 *  them, for a panel with room for every row but not for the names over them. */
export function groupHeads<T extends { group?: string }>(rows: T[], all: T[] = rows, named = true): (GroupHead | null)[] {
  if (new Set(all.map((r) => r.group ?? "")).size < 2) return rows.map(() => null);
  return rows.map((r, i) => (i === 0 || r.group !== rows[i - 1].group ? { name: named ? r.group ?? "" : "", first: i === 0 } : null));
}

/** The height a group head takes above its first row. */
export const headH = (h: GroupHead | null) => (h ? (h.name ? GROUP_CAPTION_H : 0) + (h.first ? 0 : GROUP_GAP_H) : 0);

/** A group's name above its rows, a hairline above it unless it is the first group. */
export function GroupCaption({ head }: { head: GroupHead }) {
  return (
    <span aria-hidden={head.name ? undefined : true} className="flex items-end px-2 text-[10px] font-semibold uppercase whitespace-nowrap"
      style={{ height: headH(head), color: SUB, letterSpacing: ".08em", borderTop: head.first ? undefined : `1px solid ${LINE}` }}>
      {head.name}
    </span>
  );
}

/** "+N more". A button only when `onMore` is given, i.e. in an interactive panel; in a panel
 *  whose body is the button, the words are enough (the click opens the drawer anyway). */
export function MoreRows({ n, onMore }: { n: number; onMore?: () => void }) {
  if (n <= 0) return null;
  const cls = "block h-4 leading-4 px-1 text-[11px] font-semibold tabular-nums";
  return onMore ? (
    <button type="button" onClick={onMore} aria-haspopup="dialog" aria-label={`${n} more: open the full list`}
      className={`hcg-row rounded ${cls}`} style={{ color: SUB }}>+{n} more</button>
  ) : (
    <span className={cls} style={{ color: SUB }}>+{n} more</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Buttons
// ─────────────────────────────────────────────────────────────────────────────
function ButtonStyles() {
  return (
    <style jsx global>{`
      .hcg-info{transition:background-color .15s ease,color .15s ease}
      .hcg-info:hover{background:${LEDGER_2};color:${INK}!important}
      .hcg-info:focus-visible{outline:2px solid ${INK};outline-offset:1px}
    `}</style>
  );
}

/** The (i): opens what explains a figure, usually its drawer on the Method tab. `sm` fits a
 *  panel header. */
export function InfoButton({ topic, onClick, className = "", size = "md" }: {
  /** What it explains, for its accessible name: "About Formulary compliance %". */
  topic: string;
  onClick: () => void;
  className?: string;
  size?: "md" | "sm";
}) {
  return (
    <>
      <button type="button" onClick={onClick} aria-label={`About ${topic}`} aria-haspopup="dialog" title={`About ${topic}`}
        className={`hcg-info inline-flex items-center justify-center flex-shrink-0 rounded-full ${size === "sm" ? "w-6 h-6" : "w-8 h-8"} ${className}`}
        style={{ color: SUB }}>
        <TbInfoCircle size={size === "sm" ? 15 : 18} aria-hidden="true" />
      </button>
      <ButtonStyles />
    </>
  );
}

/** A pill button that moves to another tab of the page ("Out of formulary items →"). */
export function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-[#F5F1E7]"
      style={{ border: `1px solid ${RULE}`, color: INK }}>
      {children}<TbArrowRight size={13} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChartPanel
// ─────────────────────────────────────────────────────────────────────────────
function PanelStyles() {
  return (
    <style jsx global>{`
      .hcg-panel{transition:box-shadow .2s ease,border-color .2s ease}
      .hcg-panel:has(.hcg-panel-open:hover),.hcg-panel:has(.hcg-panel-more:hover){box-shadow:${SH_HOVER}!important;border-color:${INK}33!important}
      .hcg-panel-open:focus-visible{outline:2px solid ${INK};outline-offset:2px}
      .hcg-panel-more{transition:background-color .15s ease,color .15s ease}
      .hcg-panel-more:hover{background:${LEDGER_2};color:${INK}!important}
      .hcg-panel-more:focus-visible{outline:2px solid ${INK};outline-offset:1px}
    `}</style>
  );
}

// Header widths the legend has to share the line with: the 24px buttons, 12px of gaps, and
// the source badge when a figure is not computed ("ESTIMATED" at 10.5px, letter-spaced).
const BTN_W = 24;
const HEAD_GAPS = 12;
const BADGE_W = 78;
/** The context line is dropped below this width rather than shown as a lone "…". */
const CONTEXT_MIN = 48;

export type ChartPanelProps = {
  /** Stable: a test hook now, a deep link later ("compliance", "trend"). */
  id: string;
  /** HCG's name for what the chart shows, a few words. */
  title: string;
  /** Hospital and period, muted after the title: "KR Bangalore · Aug-26". */
  context?: string;
  /** The topic colour: a 4px strip along the top, washing faintly into the header below it. */
  accent?: string;
  place: Place;
  /** "estimate" (and "hcg") figures carry their badge in the header; computed ones need none. A
   *  SourceSpec gives the badge's tooltip the section's own words. */
  source?: SourceOf;
  /** The legend, when the chart does not hand over its own (usePanelLegend). */
  legend?: LegendItem[];
  /** The accessible name: the title and the key figures in words. */
  label: string;
  /** The chart has buttons of its own (rows, dots); only ↗ opens the drawer. */
  interactive?: boolean;
  /** Opens the panel's DetailDrawer on its first tab. */
  onOpen: () => void;
  /** Shows the (i); opens the drawer on Method. */
  onInfo?: () => void;
  children: React.ReactNode;
};

export function ChartPanel({ id, title, context, accent, place, source, legend, label, interactive = false, onOpen, onInfo, children }: ChartPanelProps) {
  const uid = useId().replace(/:/g, "");
  const [bodyRef, size] = useSize<HTMLDivElement>({ w: 0, h: 0 });
  const [readout, setReadout] = useState<React.ReactNode | null>(null);
  const [handed, setLegend] = useState<LegendItem[] | null>(null);
  const api = useMemo<PanelApi>(() => ({ size, setReadout, setLegend }), [size]);
  const items = legend ?? handed ?? [];
  const badge = source && sourceKind(source) !== "computed" ? source : null;

  // The legend shares the header line when it fits beside the title and the buttons; otherwise
  // it takes a line of its own at the top of the body, and the chart below gets less height.
  const free = size.w - textW(title, 13) - BTN_W * (onInfo ? 2 : 1) - (badge ? BADGE_W : 0) - HEAD_GAPS;
  const legendW = items.length ? legendWidth(items) : 0;
  const legendInHead = !items.length || legendW <= free;
  const contextRoom = free - (legendInHead ? legendW : 0);
  const p = placeProps(place);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    onOpen();
  };
  // Drawn once the body has a size: before that a chart would lay itself out at zero.
  const chart = size.w > 0 && size.h > 0 ? <PanelContext.Provider value={api}>{children}</PanelContext.Provider> : null;

  return (
    <section aria-labelledby={`${uid}-title`} data-panel={id}
      className={`led-card hcg-panel relative flex flex-col rounded-[14px] overflow-hidden ${p.className}`}
      style={{
        ...p.style, border: `1px solid ${LINE}`, boxShadow: SH_CARD, animationDelay: `${entranceDelay(place)}ms`,
        background: accent ? `linear-gradient(180deg, ${tint(accent, 0.075)} 0, ${CARD} 44px)` : CARD,
      }}>
      {accent && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[4px] pointer-events-none" style={{ background: accent }} />}

      <div className="flex items-center gap-1 h-[22px] mt-2.5 px-3 flex-shrink-0">
        <h3 id={`${uid}-title`} title={title} className="text-[13px] font-semibold leading-none truncate flex-shrink-0 max-w-[70%]"
          style={{ color: INK }}>{title}</h3>
        <div className="flex-1 min-w-0 flex items-center gap-2 pl-1.5 overflow-hidden">
          {readout != null ? (
            <span className="ml-auto truncate text-[11.5px] tabular-nums" style={{ color: INK, animation: "ledFade 140ms ease both" }}>{readout}</span>
          ) : (
            <>
              {context && contextRoom >= CONTEXT_MIN && <span className="truncate text-[11px] min-w-0" style={{ color: SUB }} title={context}>{context}</span>}
              {legendInHead && items.length > 0 && <span className="ml-auto flex-shrink-0"><Legend items={items} dense /></span>}
            </>
          )}
        </div>
        {badge && <span className="flex-shrink-0 ml-1"><SourceBadge source={badge} /></span>}
        {onInfo && <InfoButton topic={title} onClick={onInfo} size="sm" />}
        <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={`${title}: details`} title="Details"
          className="hcg-panel-more inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0" style={{ color: SUB }}>
          <TbArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 px-3 pt-1.5 pb-2.5">
        {!legendInHead && <div className="mb-1 flex-shrink-0"><Legend items={items} /></div>}
        <div ref={bodyRef} className="relative flex-1 min-h-0 @container">
          {interactive ? (
            <div role="group" aria-label={label} className="absolute inset-0">{chart}</div>
          ) : (
            // A div with the button role, not a <button>: the chart inside is divs and svg, which
            // a <button> may not hold, and its hover readout needs the pointer events.
            <div role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`${label}. Opens details`}
              onClick={onOpen} onKeyDown={onKey} className="hcg-panel-open absolute inset-0 cursor-pointer rounded-[8px]">{chart}</div>
          )}
        </div>
      </div>
      <PanelStyles />
    </section>
  );
}
