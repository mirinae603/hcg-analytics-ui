'use client'
// Drill-down as a spreadable prop bag — the thing that makes "what's inside this bar?"
// a ONE-LINE change on a hand-rolled chart.
//
// WHY THIS EXISTS
// ---------------
// Drill-down used to live inside ApexKpiChart, which meant it only ever appeared on the
// generic /kpi/{key} fallback page. Every KPI worth drilling into has a bespoke detail
// page that draws its own <div> bars, <rect> heat cells, SVG donuts and ranked pill
// lists — so in practice the feature shipped to nobody. Twenty-seven bespoke pages will
// never adopt a feature that costs a hundred lines of tooltip logic each.
//
// So the tooltip, the hover-intent, the cache, the AbortController, the pinning and the
// scope wiring all live here, and a chart adopts drill-down like this:
//
//     const drill = useDrillBind({ kpi: 'current-stock-value', dim: 'material_group',
//                                 label: 'items', dimLabel: 'Category', format: inrAbbr })
//     …
//     <div className="bar-row" {...drill.bind(row.rawMaterialGroup)}>…</div>
//     {drill.panel}
//
// Two lines at the call site. That is the difference between this landing on fifteen
// charts and landing on two.
//
// PLANT IS NOT THE CALLER'S PROBLEM; CATEGORY IS THE CARD'S
// ---------------------------------------------------------
// The hook reads the active plant from RegionContext itself, so a caller cannot forget
// it. Category is different: there is no global category scope, so a drill request is
// only narrowed when the CARD it was launched from is itself split by category. Pass
// `category` on the spec in that case; omit it and the request carries no Category at
// all, which is the correct default for every card that cannot be split.
//
// PASSING null DISABLES IT
// ------------------------
// `useDrillBind(null)` and `drill.bind(null)` both return inert props, so a chart can
// switch drill-down off per mode (e.g. a "Top SKUs" grouping, where drilling from an
// item into items is circular) without conditional hooks.
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRegion } from '@/context/RegionContext'
import { useDrillDown, DrillFact } from '@/components/portfolio/DrillTooltip'
import { DrillQuery, DrillResult, DrillBy } from '@/lib/drilldown'
import { noteLiveDrill, runDrillSelfCheck } from '@/lib/drillSelfCheck'

export type { DrillBy }

export type DrillBindSpec = {
  /** Registry KPI key (or a /drill/meta extra like `reorder-priority`). */
  kpi: string
  /** The column the chart is grouped by — the slice values you pass to bind(). */
  dim: string
  /** What the top-N list contains. Defaults to individual items. */
  by?: DrillBy
  /** Numeric column to rank by. Omit only when the table's default measure is the one
   *  the chart is already showing — a wrong measure silently ranks by the wrong thing. */
  measure?: string
  /** Plain noun for the list heading: "Top 10 <label> inside". */
  label: string
  /** What the dimension is called, shown as the panel's eyebrow. */
  dimLabel?: string
  /** Formats the measure — pass the chart's own formatter so the panel speaks its language. */
  format: (n: number) => string
  /** How many rows to ask for. Default 10. */
  n?: number
  /**
   * Whether a click pins the panel. Default true.
   *
   * Set false on an element whose click already DOES something — the priority-band rows
   * filter the requisition list below them. Pinning as well would leave a floating panel
   * over a page the user just navigated. There, hover peeks and click still filters.
   */
  pinOnClick?: boolean
  /** Facts the chart's own tooltip showed, so replacing it loses nothing. */
  details?: (slice: string) => DrillFact[]
  /** Non-/drill/top-items source, for slices computed inside a bespoke endpoint. */
  fetcher?: (q: DrillQuery, signal?: AbortSignal) => Promise<DrillResult>
  /**
   * Material category to narrow the breakdown to — ONLY when the card this drill hangs
   * off is itself split by category, in which case pass that card's own selection so the
   * panel and the chart above it agree. Omitted (the default) sends no Category param,
   * i.e. the breakdown covers every category, exactly like the chart it came from.
   */
  category?: string
}

/** Handlers a chart already needs on the same element; bind() calls them first. */
type Chained = {
  onMouseEnter?: (e: React.MouseEvent<any>) => void
  onMouseLeave?: (e: React.MouseEvent<any>) => void
  onClick?: (e: React.MouseEvent<any>) => void
}

export type DrillProps = Chained & {
  onMouseMove?: (e: React.MouseEvent<any>) => void
  'data-drill'?: string
}

// One stylesheet for the whole app: anything bind() touched gets a pointer cursor.
// Done through a data attribute rather than a style/className in the prop bag, because
// those two props collide with what the call sites already set — and a drill-down that
// silently drops a chart's own inline width would be worse than no drill-down.
const STYLE_ID = 'drill-bind-style'
function useDrillCursor() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = '[data-drill]{cursor:pointer}'
    document.head.appendChild(el)
  }, [])
}

/**
 * Dev-only wiring for the self-check.
 *
 * Exposes `__drillCheck()` in the console and runs it automatically on `?drillcheck=1`,
 * so verifying all ~34 configs is one call instead of hovering thirty charts. Installed
 * from here because this hook is the one thing every drilled chart already imports.
 */
function useDrillSelfCheck() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return
    const w = window as any
    if (w.__drillCheck) return
    w.__drillCheck = runDrillSelfCheck
    if (new URLSearchParams(window.location.search).has('drillcheck')) {
      runDrillSelfCheck()
    }
  }, [])
}

/**
 * Attach `/drill/top-items` to any element.
 *
 * Returns `bind(slice)` — a spreadable prop bag — and `panel`, which must be rendered
 * once somewhere inside the component (it portals to <body>, so position is irrelevant).
 */
export function useDrillBind(spec: DrillBindSpec | null) {
  const { selectedRegion } = useRegion()
  const region = selectedRegion?.name ?? 'All Plants'
  useDrillCursor()
  useDrillSelfCheck()

  // The callbacks (format / details / fetcher) are recreated on every render at every
  // call site. Holding them in a ref and keying the spec on its scalar fields keeps the
  // object identity stable, so the hover-intent timer and the in-flight request below
  // are never torn down mid-hover just because the parent re-rendered.
  const live = useRef(spec)
  live.current = spec

  const key = [
    spec?.kpi, spec?.dim, spec?.by, spec?.measure, spec?.label, spec?.dimLabel,
    spec?.n, !!spec?.details, !!spec?.fetcher, spec?.pinOnClick !== false, region, spec?.category ?? '',
  ].join('|')

  const pins = spec?.pinOnClick !== false

  // Dev drift guard: a config wired here but absent from WIRED_DRILLS would not be
  // covered by __drillCheck(), which is how a stale list quietly stops being a check.
  useEffect(() => {
    if (spec) noteLiveDrill(spec.kpi, spec.dim, spec.by ?? 'material')
  }, [spec?.kpi, spec?.dim, spec?.by]) // eslint-disable-line react-hooks/exhaustive-deps

  const resolved = useMemo(() => {
    const s = live.current
    if (!s) return null
    return {
      kpi: s.kpi,
      dim: s.dim,
      by: s.by ?? 'material',
      measure: s.measure,
      label: s.label,
      dimLabel: s.dimLabel,
      n: s.n,
      canPin: s.pinOnClick !== false,
      // Plant always comes from the header selector. Category comes from the card, and
      // is undefined unless that card actually offers a category control.
      plant: region,
      category: s.category || undefined,
      format: (v: number) => (live.current?.format ?? String)(v),
      details: s.details ? (sl: string) => live.current?.details?.(sl) ?? [] : undefined,
      fetcher: s.fetcher
        ? (q: DrillQuery, signal?: AbortSignal) => live.current!.fetcher!(q, signal)
        : undefined,
    }
    // `key` is the value-identity of everything above; `live` covers the callbacks.
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const dd = useDrillDown(resolved)

  /**
   * Props for one slice. `slice` MUST be the raw backend value, not the display label —
   * a chart that strips an "M065-" prefix or truncates to 20 chars for the axis would
   * otherwise send a string that matches no rows and get a confidently empty panel.
   */
  const bind = useCallback(
    (slice: string | number | null | undefined, chain?: Chained): DrillProps => {
      const s = slice == null ? '' : String(slice)
      if (!resolved || !s) return chain ?? {}
      const props: DrillProps = {
        'data-drill': s,
        onMouseEnter: (e) => { chain?.onMouseEnter?.(e); dd.enter(s, e.clientX, e.clientY) },
        onMouseMove: (e) => dd.move(e.clientX, e.clientY),
        onMouseLeave: (e) => { chain?.onMouseLeave?.(e); dd.leave() },
      }
      // On a coarse pointer there is no hover at all, so the tap has to pin or the
      // breakdown is unreachable on a tablet. Otherwise, when pinning is off, `onClick`
      // is left OFF THE OBJECT ENTIRELY rather than set to undefined: this bag is meant
      // to be spread last, and `{...{onClick: undefined}}` would silently overwrite the
      // element's own handler. (It did — the priority-band rows stopped filtering the
      // requisition list until this was an omitted key instead of an undefined value.)
      if (pins || dd.coarse) {
        props.onClick = (e) => { chain?.onClick?.(e); dd.pin(s, e.clientX, e.clientY) }
      } else if (chain?.onClick) {
        props.onClick = chain.onClick
      }
      return props
    },
    [resolved, dd, pins]
  )

  return { bind, panel: dd.panel, active: dd.active, pinned: dd.pinned, coarse: dd.coarse, close: dd.close }
}

export default useDrillBind
