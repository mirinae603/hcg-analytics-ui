'use client'
// A category filter that belongs to ONE CARD.
//
// WHY IT LIVES ON THE CARD
// ------------------------
// This started life as a single control in the page header. It could not be honoured
// everywhere, so three rounds of scaffolding grew around it to explain where it did
// NOT apply — a page-wide banner, an "All categories" badge on the panels it missed, a
// retraction note above the bespoke pages, and an allowlist of endpoints allowed to
// receive the param. All of that was apologising for a control being somewhere it
// could not act.
//
// So the control moved onto the card. Its PRESENCE is the signal: a card that can be
// split by material category has one, a card that cannot has nothing at all. There is
// no banner, no badge and no note to maintain, because there is nothing to explain —
// you cannot filter what offers you no filter.
//
// THE RULE FOR ADDING ONE
// -----------------------
// Curl the card's endpoint with and without `?Category=Onco Drugs`. If the numbers
// move, the card gets a control. If they cannot move — the table was pre-aggregated
// past material grain, or its `category` column means something else (the PO spend
// taxonomy on kpi_purchase_value) — it gets nothing. Never wire one on a hunch: an
// inert control is exactly the bug this file exists to undo.
//
// ADOPTING IT — TWO SHAPES, BOTH TWO LINES
// ----------------------------------------
// A. The card already owns its fetch — use `useCardCategory`:
//
//      const cat = useCardCategory({ accent: CORAL, label: 'Stock value breakdown' })
//      // ...header:  {cat.chip}
//      new URLSearchParams({ Plant: region, ...cat.q })   // + cat.category in the deps
//
// B. The card reads a payload the PAGE fetched — use `useCardScope`. It hands back the
//    page's own object untouched at All Categories, and this card's private narrowed
//    copy the moment a category is picked, so nothing else on the page moves:
//
//      const scope = useCardScope(`/kpi/near-expiry/insights?Plant=${region}`, data,
//                                 { accent: EMBER, label: 'Expiry ladder' })
//      // ...header:  {scope.chip}   ...body: read scope.data instead of data
//
// State is LOCAL — a plain useState inside the hook. There is deliberately no context
// and no provider: two cards on one page filter independently, and a card's selection
// cannot leak onto a card that has no business honouring it. Nothing here patches
// window.fetch.
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TbAlertTriangle, TbChevronDown, TbFilter, TbX } from 'react-icons/tb'
import { DASHBOARD_API_BASE_URL } from '@/utils/config'

export type CategoryCoverage = {
  stock_value?: number
  consumption_cost?: number
  billed_revenue?: number
  reorder_lines?: number
  has_stock?: boolean
  has_consumption?: boolean
  has_billing?: boolean
  has_reorder?: boolean
  note?: string | null
}

export type CategoryOption = {
  key: string
  name: string
  value: number
  skus: number
  share_pct: number
  coverage?: CategoryCoverage
}

/**
 * Which family of numbers the card is built on. Only used to phrase the honest
 * one-liner when a filter empties the card — `/meta/categories` already reports, per
 * category, which domains it has data in, so the card can say WHY it is empty instead
 * of looking broken.
 *
 * `stock` is the default because a stock-derived card can never legitimately be empty
 * for a category that holds stock, so the generic wording is the right one there.
 */
export type CardDomain = 'stock' | 'consumption' | 'billing' | 'reorder' | 'procurement'

const HAS_KEY: Partial<Record<CardDomain, keyof CategoryCoverage>> = {
  stock: 'has_stock',
  consumption: 'has_consumption',
  billing: 'has_billing',
  reorder: 'has_reorder',
  // `procurement` deliberately has no entry. /meta/categories' coverage block is built
  // from the stock / consumption / billing / reorder frames, none of which describes
  // what a hospital BUYS, so there is no honest has_* verdict to inherit — and every
  // one of the six buckets holds real PO spend, so there is nothing to flag anyway.
  // See PROC_SHARE below for the number the procurement menu uses instead.
}

// The MEASURED amount behind each domain, as opposed to the has_* heuristic above.
// The two answer different questions and the menu needs both:
//   has_* is a JUDGEMENT ("is there meaningfully any?") — has_consumption is false for
//     Onco Drugs, which holds Rs 1,794 against Rs 25.2 Cr of stock. Real, but a rounding
//     error. That bucket stays SELECTABLE and flagged "no data", because the emptiness
//     is itself the finding.
//   VALUE_KEY is a FACT ("is it exactly zero?") — Unclassified holds Rs 0.00 of stock,
//     full stop. Offering it on a stock card is offering a guaranteed-blank result, so
//     it is hidden there. It reappears by itself on reorder cards, where it holds
//     10,614 of the 19,014 lines.
const VALUE_KEY: Partial<Record<CardDomain, keyof CategoryCoverage>> = {
  stock: 'stock_value',
  consumption: 'consumption_cost',
  billing: 'billed_revenue',
  reorder: 'reorder_lines',
  // `procurement` is served by PROC_SHARE, not by `coverage` — see below.
}

// ── the procurement domain's own measure ──────────────────────────────────────
// PO spend per material bucket. It cannot come from `coverage`, and taking the stock
// number instead would be wrong in BOTH directions on the same row: Unclassified holds
// Rs 0.00 of stock and Rs 272.35 Cr of purchase orders — 41.9%, the LARGEST bucket on
// procurement. Reading `stock_value` there would hide the biggest thing on the page
// (the zero test above) and, if it survived, would print "0.0%" beside it.
//
// One request for the whole session, fired lazily the first time a procurement menu is
// opened, so a page that is never filtered issues nothing extra. It fails soft: with no
// shares the menu shows every bucket with no share hint, which is exactly what it did
// before this existed — never a hidden bucket and never a wrong percentage.
export type ProcShare = { value: number; share_pct: number }
let PROC_PROMISE: Promise<Record<string, ProcShare>> | null = null

function loadProcurementShares(): Promise<Record<string, ProcShare>> {
  if (!PROC_PROMISE) {
    const q = 'kpi=purchase-value&dim=material_category&by=material_category&measure=purchase_value&top=20'
    PROC_PROMISE = fetch(`${DASHBOARD_API_BASE_URL}/drill/top-items?${q}`)
      .then((r) => {
        if (!r.ok) throw new Error(`drill/top-items ${r.status}`)
        return r.json()
      })
      .then((j) => {
        const out: Record<string, ProcShare> = {}
        for (const it of (Array.isArray(j?.items) ? j.items : [])) {
          out[String(it.key ?? it.name)] = {
            value: Number(it.value ?? 0),
            share_pct: Number(it.share_pct ?? 0),
          }
        }
        if (!Object.keys(out).length) throw new Error('drill/top-items returned no buckets')
        return out
      })
      .catch((e) => { PROC_PROMISE = null; throw e })
  }
  return PROC_PROMISE
}

/** Reset hook for tests and a hard data refresh (mirrors resetCategoryOptions). */
export function resetProcurementShares() {
  PROC_PROMISE = null
}

// ── options, fetched exactly once for the whole app ──────────────────────────
// ~20 cards mount this hook. Without a shared promise that is 20 identical requests
// on every page load; with it, one. The list is a static snapshot on the backend, so
// caching it for the session cannot go stale.
export type OptionsStatus = 'loading' | 'ready' | 'error'

let OPTIONS_PROMISE: Promise<CategoryOption[]> | null = null

function loadOptions(): Promise<CategoryOption[]> {
  if (!OPTIONS_PROMISE) {
    OPTIONS_PROMISE = fetch(`${DASHBOARD_API_BASE_URL}/meta/categories`)
      .then((r) => {
        if (!r.ok) throw new Error(`meta/categories ${r.status}`)
        return r.json()
      })
      .then((j) => {
        const cats = Array.isArray(j?.categories) ? (j.categories as CategoryOption[]) : []
        // An empty list is a failure too: the control would open onto nothing and the
        // reader would be left prodding a dead chip.
        if (!cats.length) throw new Error('meta/categories returned no categories')
        return cats
      })
      .catch((e) => {
        // Do not memoise a failure — a transient error would otherwise disable every
        // category control for the rest of the session, and Retry could never recover.
        OPTIONS_PROMISE = null
        throw e
      })
  }
  return OPTIONS_PROMISE
}

/** Reset hook for tests, Retry, and a hard data refresh. */
export function resetCategoryOptions() {
  OPTIONS_PROMISE = null
}

export type CardCategory = {
  /** '' when All Categories. Put this in the effect's dependency array. */
  category: string
  setCategory: (c: string) => void
  /** Spread into a `new URLSearchParams({...})` literal. Empty when All. */
  q: Record<string, string>
  /** Append to a template-literal URL that already has a `?`. Empty when All. */
  qs: string
  /** True when a real category is selected. */
  active: boolean
  /** Pass to `useDrillBind({ ..., category: cat.drill })` so a drill inherits the card. */
  drill: string | undefined
  /** The control. Drop it in the card header. */
  chip: React.ReactNode
  /**
   * One honest line for when the filter empties the card. Renders nothing unless a
   * category is actually selected AND the card really came back empty, so an
   * untouched card is byte-identical to before this file existed.
   */
  note: (isEmpty: boolean) => React.ReactNode
  /** The chosen option's `/meta/categories` row, when loaded. */
  option: CategoryOption | null
  options: CategoryOption[]
  /** Whether `/meta/categories` has landed. Cards never need this; exposed for tests. */
  status: OptionsStatus
}

/**
 * Registry KPI keys whose `/kpi/{key}` endpoints really honour `?Category=`.
 *
 * This is the generic drill-down page's version of "does this card have a control" —
 * it renders one chart for whichever KPI it was routed to, so it cannot decide at
 * author time. Mirrors `respects_category` on GET /drill/matrix, which the backend
 * computes from the data rather than declaring; every entry was confirmed by curling
 * the endpoint with and without the param and diffing the response.
 *
 * The procurement entries below are served by a REGRAIN, not by a column: the
 * aggregates were cut past material grain (kpi_vendor_volume is plant x vendor,
 * kpi_fill_rate is one row per plant), so the backend rebuilds the request from
 * fact_po / fact_grn at material grain. That is invisible from the response, which is
 * exactly why this list and GET /meta/category-support exist.
 *
 * The absentees: kpi_consumption_by_department is plant x cost-centre x month with no
 * rebuild, and vendor-lead-time REFUSES the cut outright (400) because re-applying its
 * `gr_lines >= 3` median gate inside a bucket changes the vendor population it counts.
 * Note also that a `category` column is not evidence of support — kpi_purchase_value
 * carries the PO SPEND taxonomy, 1,360 values like "BARBOUR SUTURE", which is a
 * different dimension that happens to share the name.
 */
export const CATEGORY_CAPABLE_KPIS = new Set([
  'current-stock-value', 'inventory-aging', 'aging-distribution', 'days-on-hand',
  'inventory-health-score', 'non-moving-inventory', 'inventory-risk', 'stock-change',
  'near-expiry', 'inventory-turnover-ratio', 'inventory-valuation',
  'unit-sold-per-sku',
  'stock-radar', 'aging-risk-forecast', 'fulfillment-rate',
  'reorder-priority', 'replenishment',
  // Procurement. Every one of these was curled with and without the param and diffed;
  // `vendor-lead-time` is deliberately absent (it answers 400, not a filtered number).
  'purchase-value', 'monthly-purchase-value', 'procurement-variance',
  'vendor-volume-contribution', 'purchase-by-location', 'procurement-cycle-time',
  'fill-rate', 'vendor-volume-vs-margin',
])

/**
 * Which of those KPIs are PROCUREMENT, i.e. measured in purchase orders rather than in
 * stock on hand. Only the generic drill-down page needs this — every bespoke page names
 * its own domain — but it matters: on the stock domain Unclassified is hidden for
 * holding Rs 0.00 of stock, and on procurement it is the largest bucket there is.
 */
export const PROCUREMENT_KPIS = new Set([
  'purchase-value', 'monthly-purchase-value', 'procurement-variance',
  'vendor-volume-contribution', 'purchase-by-location', 'procurement-cycle-time',
  'fill-rate', 'vendor-volume-vs-margin',
])

export type CardCategoryOpts = {
  /** The page's own accent colour, so the active chip belongs to its card. */
  accent?: string
  /** What the card's numbers are made of — see CardDomain. */
  domain?: CardDomain
  /**
   * The card's own title, e.g. 'Stock value breakdown'. Purely for assistive tech: a
   * page carrying a dozen of these otherwise announces "All categories" a dozen times
   * with nothing to tell them apart. Costs one prop, so always pass it.
   */
  label?: string
  /** Overrides the collapsed label when nothing is selected. */
  allLabel?: string
  /** Start on a category other than All. Almost never wanted. */
  initial?: string
}

const MUT = '#8a8f9d'
const LINE = '#eceef3'

export function useCardCategory(opts: CardCategoryOpts = {}): CardCategory {
  const {
    accent = '#465fff', domain = 'stock', allLabel = 'All categories',
    initial = '', label,
  } = opts
  const [category, setCategory] = useState(initial)
  const [options, setOptions] = useState<CategoryOption[]>([])
  const [status, setStatus] = useState<OptionsStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setStatus((s) => (s === 'error' ? 'loading' : s))
    loadOptions().then(
      (o) => { if (alive) { setOptions(o); setStatus('ready') } },
      () => { if (alive) { setOptions([]); setStatus('error') } },
    )
    return () => { alive = false }
  }, [attempt])

  // Retry throws away the memoised rejection so every mounted chip recovers together.
  const retry = useCallback(() => { resetCategoryOptions(); setAttempt((n) => n + 1) }, [])

  const active = !!category
  const option = useMemo(
    () => options.find((o) => o.key === category || o.name === category) ?? null,
    [options, category]
  )

  const chip = (
    <CategoryChip
      value={category}
      onChange={setCategory}
      options={options}
      status={status}
      onRetry={retry}
      accent={accent}
      domain={domain}
      allLabel={allLabel}
      label={label}
    />
  )

  // NEAR-empty counts, not just empty. Onco has exactly Rs 1,794 of internal
  // consumption across the whole six-month window, so a consumption card filtered to
  // it draws one hairline bar reading "Rs 1.8 K" — technically not empty, and far more
  // alarming than a blank card, because it looks like the filter half-worked. Whenever
  // `/meta/categories` says the bucket has no data in THIS card's domain, the line is
  // shown regardless of what survived.
  const hasKey = HAS_KEY[domain]
  const domainMissing = !!option?.coverage && !!hasKey && option.coverage[hasKey] === false
  const note = useCallback(
    (isEmpty: boolean) => {
      if (!active || !(isEmpty || domainMissing)) return null
      return <CategoryEmptyNote category={category} option={option} domain={domain} />
    },
    [active, category, option, domain, domainMissing]
  )

  return {
    category,
    setCategory,
    q: active ? { Category: category } : {},
    qs: active ? `&Category=${encodeURIComponent(category)}` : '',
    active,
    drill: active ? category : undefined,
    chip,
    note,
    option,
    options,
    status,
  }
}

/**
 * A card's own copy of the page's data, re-fetched ONLY while its filter is on.
 *
 * Most bespoke pages load one `/insights` payload and cut it a dozen ways. If the
 * card's chip drove that shared fetch, picking a category on one panel would silently
 * rewrite every hero tile on the page — which is the page-level filter again, wearing
 * a card's clothes. So:
 *
 *   * All Categories  -> returns the page's data by reference. No request, no
 *                        re-render, byte-identical to before this existed.
 *   * a category      -> this card, alone, fetches its own narrowed copy. Everything
 *                        else on the page keeps showing the full picture, which also
 *                        makes the card's number directly comparable to the whole.
 *
 * Requests are aborted on change/unmount, and `loading` is only true while a real
 * request is in flight, so the card can show a skeleton without flickering on the
 * (instant) return to All.
 */
export function useCardScopedData<T>(
  pageData: T,
  category: string,
  fetcher: (category: string, signal: AbortSignal) => Promise<T>,
): { data: T; loading: boolean; failed: boolean } {
  const [scoped, setScoped] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const fn = useRef(fetcher)
  fn.current = fetcher

  useEffect(() => {
    if (!category) { setScoped(null); setLoading(false); setFailed(false); return }
    const ac = new AbortController()
    setLoading(true); setFailed(false)
    fn.current(category, ac.signal)
      .then((d) => { if (!ac.signal.aborted) { setScoped(d); setLoading(false) } })
      .catch((e) => {
        if (ac.signal.aborted || e?.name === 'AbortError') return
        setFailed(true); setLoading(false)
      })
    return () => ac.abort()
  }, [category])

  return { data: category && scoped ? scoped : pageData, loading, failed }
}

/** Append `Category` to a path, whatever punctuation it already carries. */
export function withCategory(url: string, category: string) {
  if (!category) return url
  return `${url}${url.includes('?') ? '&' : '?'}Category=${encodeURIComponent(category)}`
}

export type CardScope<T> = CardCategory & {
  /** The page's object at All Categories; this card's private narrowed copy otherwise. */
  data: T
  /** True only while this card's own request is in flight. */
  loading: boolean
  /** True when this card's own request failed — the card falls back to page data. */
  failed: boolean
}

/**
 * `useCardCategory` + `useCardScopedData` + the fetch, in one call.
 *
 * This is the shape almost every card wants, because almost every bespoke page loads
 * one payload and slices it: pass the URL the page already fetched (WITHOUT any
 * Category), plus the object it produced, and read `.data` instead. At All Categories
 * that is the page's object by reference — same identity, no request, no re-render —
 * so an unadopted-looking card behaves exactly as it did before.
 *
 *     const scope = useCardScope(`/kpi/inventory-risk/insights?Plant=${region}`, data,
 *                                { accent: RUST, label: 'Risk matrix' })
 *
 * Pass `null` for the url to keep the chip but opt out of fetching (the caller is
 * doing its own).
 */
export function useCardScope<T>(
  url: string | null,
  pageData: T,
  opts: CardCategoryOpts = {},
): CardScope<T> {
  const cat = useCardCategory(opts)
  const fetcher = useCallback(
    async (category: string, signal: AbortSignal): Promise<T> => {
      if (!url) return pageData
      const full = url.startsWith('http') ? url : `${DASHBOARD_API_BASE_URL}${url}`
      const res = await fetch(withCategory(full, category), { signal })
      if (!res.ok) throw new Error(`${res.status} ${full}`)
      return (await res.json()) as T
    },
    // `pageData` is deliberately out: it is only the no-url fallback, and including it
    // would rebuild the fetcher on every page refetch. useCardScopedData holds the
    // fetcher in a ref and keys its effect on `category` alone, so this is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url],
  )
  const { data, loading, failed } = useCardScopedData<T>(pageData, url ? cat.category : '', fetcher)
  return { ...cat, data, loading, failed }
}

// ── the control ──────────────────────────────────────────────────────────────
// Quiet by default and loud only when it is doing something: at rest it is a hairline
// ghost pill that reads as chrome, and the moment a category is picked it takes the
// card's accent and gains a clear (×) affordance. That contrast IS the "this card is
// filtered" indicator — with the control on the card there is no page-level banner to
// carry that message, so the chip has to carry it itself.
//
// The pill is a wrapper with TWO sibling buttons, not a button containing a button:
// nesting interactive elements is invalid HTML and makes the clear affordance
// unreachable for keyboard and screen-reader users. The wrapper owns the border and
// tint so the seam is invisible.
const PANEL_W = 244
const GAP = 6

/** Where the menu goes for a given trigger rect: right-aligned, viewport-clamped,
 *  flipped above the chip when there is no room below. */
function measure(el: HTMLElement | null, h: number) {
  if (!el || typeof window === 'undefined') return { top: -9999, left: -9999 }
  const r = el.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  const up = below < h + GAP + 8 && r.top > below
  return {
    top: up ? Math.max(8, r.top - h - GAP) : r.bottom + GAP,
    left: Math.min(Math.max(8, r.right - PANEL_W), Math.max(8, window.innerWidth - PANEL_W - 8)),
  }
}

function CategoryChip({
  value, onChange, options, status, onRetry, accent, domain, allLabel, label,
}: {
  value: string
  onChange: (v: string) => void
  options: CategoryOption[]
  status: OptionsStatus
  onRetry: () => void
  accent: string
  domain: CardDomain
  allLabel: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const wrap = useRef<HTMLDivElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const active = !!value
  const uid = useId().replace(/:/g, '')
  const listId = `cc-list-${uid}`

  const of = label ? ` for ${label}` : ''
  const triggerLabel = active
    ? `Material category${of}: ${value}. Change.`
    : `Split${of} by material category. Currently all categories.`

  return (
    <div
      ref={wrap}
      className="relative flex-shrink-0"
      style={{ fontFamily: "Outfit, 'Segoe UI', sans-serif" }}
    >
      <div
        className="inline-flex items-center rounded-full transition-all"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          height: 26,
          maxWidth: 200,
          background: active ? `${accent}14` : hover || open ? '#f7f8fa' : 'transparent',
          border: `1px solid ${active ? `${accent}3d` : LINE}`,
        }}
      >
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true) }
          }}
          title={active ? `Filtered to ${value} — click to change` : 'Split this card by material category'}
          aria-label={triggerLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          className="cc-trigger relative inline-flex min-w-0 items-center gap-1.5 rounded-full"
          style={{
            height: '100%',
            // The visible pill stays 26px so it reads as chrome, but a transparent
            // inset overlay pushes the real hit target past the 44px touch minimum
            // without moving a single pixel of layout.
            padding: active ? '0 4px 0 9px' : '0 8px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            color: active ? accent : MUT,
            background: 'transparent',
          }}
        >
          <span aria-hidden className="absolute" style={{ inset: '-10px -4px' }} />
          <TbFilter size={12} className="flex-shrink-0" style={{ opacity: active ? 1 : 0.75 }} />
          <span className="truncate">{active ? value : allLabel}</span>
          {!active && <TbChevronDown size={11} className="flex-shrink-0" style={{ opacity: 0.7 }} />}
        </button>

        {active && (
          <button
            type="button"
            aria-label={`Clear the ${value} category filter${of}`}
            onClick={() => { onChange(''); trigger.current?.focus() }}
            className="cc-trigger relative mr-[5px] flex h-[17px] w-[17px] flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: `${accent}22`, color: accent }}
          >
            <span aria-hidden className="absolute" style={{ inset: '-12px -8px -12px -4px' }} />
            <TbX size={10} />
          </button>
        )}
      </div>

      {/* Announced once per change, so a filtered card cannot silently become a
          different number for a screen-reader user. */}
      <span className="sr-only" role="status" aria-live="polite">
        {active ? `${label ? `${label}: ` : ''}filtered to ${value}` : ''}
      </span>

      <style>{`
        .cc-trigger{outline:none}
        .cc-trigger:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px ${accent}80}
        @keyframes ccIn{from{opacity:0;transform:translateY(-4px) scale(.985)}to{opacity:1;transform:none}}
      `}</style>

      {open && (
        <CategoryMenu
          id={listId}
          anchor={wrap}
          returnFocusTo={trigger}
          close={() => setOpen(false)}
          value={value}
          onChange={onChange}
          options={options}
          status={status}
          onRetry={onRetry}
          accent={accent}
          domain={domain}
          allLabel={allLabel}
          label={label}
        />
      )}
    </div>
  )
}

/**
 * The menu is PORTALLED to <body> and positioned fixed.
 *
 * Nearly every card on this product is a `rounded-3xl … overflow-hidden` panel, and an
 * absolutely-positioned menu inside one is simply clipped — the control would look
 * broken on a majority of the cards it is about to be added to. Fixed positioning off
 * the trigger's rect also escapes every ancestor stacking context and transform, and
 * lets the menu flip above the chip when it is near the bottom of the viewport.
 */
function CategoryMenu({
  id, anchor, returnFocusTo, close, value, onChange, options, status, onRetry,
  accent, domain, allLabel, label,
}: {
  id: string
  anchor: React.RefObject<HTMLDivElement | null>
  returnFocusTo: React.RefObject<HTMLButtonElement | null>
  close: () => void
  value: string
  onChange: (v: string) => void
  options: CategoryOption[]
  status: OptionsStatus
  onRetry: () => void
  accent: string
  domain: CardDomain
  allLabel: string
  label?: string
}) {
  const panel = useRef<HTMLDivElement | null>(null)

  // Positioned on the FIRST render, not in an effect. A menu that spends its first
  // paint at `visibility:hidden` cannot take focus — which silently cost the whole
  // keyboard path, because focus stayed on the trigger and arrow keys did nothing.
  const [pos, setPos] = useState(() => measure(anchor.current, 300))

  // The "All" row comes from the backend as a real option (key "All", the full
  // portfolio total). It is the reset, not a category, so it is rendered separately.
  const hasKey = HAS_KEY[domain]
  const valueKey = VALUE_KEY[domain]

  // Procurement measures itself. Loaded here rather than in the hook so a page nobody
  // filters makes no extra request at all — the menu only exists once it is opened.
  const [procShare, setProcShare] = useState<Record<string, ProcShare> | null>(null)
  useEffect(() => {
    if (domain !== 'procurement') return
    let alive = true
    loadProcurementShares().then(
      (s) => { if (alive) setProcShare(s) },
      () => { if (alive) setProcShare(null) },   // fail soft: no hints, nothing hidden
    )
    return () => { alive = false }
  }, [domain])

  // What this card's domain measures for a given bucket, whichever source that is.
  const measured = useCallback(
    (o: CategoryOption): number | undefined => {
      if (domain === 'procurement') return procShare ? procShare[o.key]?.value ?? 0 : undefined
      return valueKey ? (o.coverage?.[valueKey] as number | undefined) : undefined
    },
    [domain, procShare, valueKey],
  )

  // Drop any bucket that measures EXACTLY zero in this card's domain — picking it could
  // only ever return a blank card, so offering it is offering a dead end. In practice
  // that is Unclassified on every stock-based card (Rs 0.00 of stock, by definition:
  // these are materials with no material_type, and they hold none). On procurement it
  // drops nothing: all six buckets carry PO spend, Unclassified most of all.
  // Deliberately a zero test, not the has_* heuristic — see VALUE_KEY.
  const cats = useMemo(
    () => options.filter((o) => {
      if (o.key === 'All') return false
      const v = measured(o)
      return !(typeof v === 'number' && v === 0)
    }),
    [options, measured],
  )
  const rows = useMemo(
    () => [{ key: '', name: allLabel, noData: false, hint: undefined as string | undefined },
      ...cats.map((o) => {
        // `has_*` false means this category genuinely holds no data in this card's
        // domain (onco is dispensed through IP/OP billing, so it has next to no
        // internal consumption). Still selectable — the empty result is real data and
        // the reader is entitled to see it — but flagged up front so the click is
        // informed rather than a surprise.
        const noData = hasKey && o.coverage ? o.coverage[hasKey] === false : false
        // The share must be THIS domain's share. `o.share_pct` is the share of stock
        // value, which is a different question on a procurement card and a wrong answer
        // on Unclassified; while the procurement shares are still in flight there is no
        // hint at all, rather than a placeholder that would read as a real number.
        const share = domain === 'procurement' ? procShare?.[o.key]?.share_pct : o.share_pct
        return {
          key: o.key, name: o.name, noData,
          hint: noData ? 'no data' : typeof share === 'number' ? `${share.toFixed(1)}%` : undefined,
        }
      })],
    [cats, allLabel, hasKey, domain, procShare],
  )

  const selectedIdx = Math.max(0, rows.findIndex((r) => r.key === value))
  const [cursor, setCursor] = useState(selectedIdx)
  useEffect(() => { setCursor(Math.max(0, rows.findIndex((r) => r.key === value))) }, [rows, value])

  const place = useCallback(() => {
    const next = measure(anchor.current, panel.current?.offsetHeight ?? 300)
    setPos((p) => (p.top === next.top && p.left === next.left ? p : next))
  }, [anchor])

  // Re-measure once the real height is known (the estimate above only has to be close
  // enough to be focusable and on-screen), and again whenever the rows change.
  useLayoutEffect(() => { place() }, [place, rows.length, status])

  useEffect(() => {
    // Keyboard users land inside the menu; Escape puts them back on the chip.
    panel.current?.focus()
    const onScrollOrResize = () => place()
    // capture:true so scrolling ANY ancestor (these pages scroll inner panels) keeps
    // the menu pinned to its chip rather than stranding it mid-page.
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !anchor.current?.contains(t)) close()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('mousedown', onDown)
    }
  }, [place, close, anchor])

  const dismiss = useCallback(() => { close(); returnFocusTo.current?.focus() }, [close, returnFocusTo])
  const choose = useCallback((k: string) => { onChange(k); dismiss() }, [onChange, dismiss])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = rows.length
    if (e.key === 'Escape') { e.preventDefault(); dismiss() }
    else if (e.key === 'Tab') { close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % n) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c - 1 + n) % n) }
    else if (e.key === 'Home') { e.preventDefault(); setCursor(0) }
    else if (e.key === 'End') { e.preventDefault(); setCursor(n - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (rows[cursor]) choose(rows[cursor].key) }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panel}
      id={id}
      role="listbox"
      tabIndex={-1}
      aria-label={label ? `Material category for ${label}` : 'Material category'}
      aria-activedescendant={status === 'ready' ? `${id}-o${cursor}` : undefined}
      onKeyDown={onKeyDown}
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: PANEL_W,
        zIndex: 9999,
        outline: 'none',
        fontFamily: "Outfit, 'Segoe UI', sans-serif",
        border: `1px solid ${LINE}`,
        boxShadow: '0 20px 48px -22px rgba(20,24,50,0.32), 0 3px 10px -5px rgba(20,24,50,0.10)',
        animation: 'ccIn .14s cubic-bezier(.22,1,.36,1) both',
      }}
    >
      <style>{`@keyframes ccIn{from{opacity:0;transform:translateY(-4px) scale(.985)}to{opacity:1;transform:none}}`}</style>
      <div className="px-3 pb-1.5 pt-2.5 text-[9.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUT }}>
        Split this card by
      </div>

      {status === 'loading' && (
        <div className="px-3 pb-3 pt-1" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-1.5 h-[15px] rounded-md" style={{ background: '#f2f4f7', opacity: 1 - i * 0.22 }} />
          ))}
          <span className="sr-only">Loading categories</span>
        </div>
      )}

      {status === 'error' && (
        // An inert chip is the exact failure this redesign exists to remove, so when
        // the option list cannot load the menu says so plainly and offers the retry
        // rather than sitting on a permanent "Loading…".
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-start gap-2 text-[11.5px] leading-snug" style={{ color: '#6b7280' }}>
            <TbAlertTriangle size={13} className="mt-[2px] flex-shrink-0" style={{ color: '#c98a3a' }} />
            <span>Couldn&apos;t load the category list. This card is showing all categories.</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="cc-trigger mt-2 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}3d` }}
          >
            Retry
          </button>
        </div>
      )}

      {status === 'ready' && rows.map((r, i) => (
        <React.Fragment key={r.key || '__all'}>
          {i === 1 && <div style={{ height: 1, background: LINE, margin: '3px 0' }} />}
          <Row
            id={`${id}-o${i}`}
            label={r.name}
            hint={r.hint}
            muted={r.noData}
            selected={r.key === value}
            cursored={i === cursor}
            accent={accent}
            onSelect={() => choose(r.key)}
            onHover={() => setCursor(i)}
          />
        </React.Fragment>
      ))}
    </div>,
    document.body,
  )
}

function Row({
  id, label, hint, selected, cursored, accent, muted, onSelect, onHover,
}: {
  id: string
  label: string
  hint?: string
  selected: boolean
  cursored: boolean
  accent: string
  muted?: boolean
  onSelect: () => void
  onHover: () => void
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onMouseMove={onHover}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-[7px] text-left transition-colors"
      style={{ background: selected ? `${accent}0f` : cursored ? '#f6f7fa' : undefined }}
    >
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: selected ? accent : 'transparent', border: selected ? undefined : `1px solid ${LINE}` }}
      />
      <span
        className="min-w-0 flex-1 truncate text-[11.5px]"
        style={{ color: selected ? accent : muted ? '#a8adba' : '#41444f', fontWeight: selected ? 700 : 500 }}
      >
        {label}
      </span>
      {hint && (
        <span className="flex-shrink-0 text-[10px] tabular-nums" style={{ color: muted ? '#b9bec9' : MUT }}>
          {hint}
        </span>
      )}
    </div>
  )
}

// ── the honest empty line ────────────────────────────────────────────────────
/**
 * Shown only when a card's own filter emptied it.
 *
 * Onco Drugs reads ~zero on every consumption-derived number, and that is REAL: HCG
 * dispenses onco through IP/OP billing rather than internal consumption movements, so
 * fact_consumption holds 3 rows and Rs 1.8k of it across the whole six-month window.
 * An empty chart with no explanation reads as a broken filter, so the card says which
 * it is — using `/meta/categories`' own coverage note where the backend has one.
 */
export function CategoryEmptyNote({
  category, option, domain, className = '',
}: {
  category: string
  option: CategoryOption | null
  domain: CardDomain
  className?: string
}) {
  const cov = option?.coverage
  const hasKey = HAS_KEY[domain]
  const missing = cov && hasKey ? cov[hasKey] === false : false
  const text = missing
    ? cov?.note ||
      `${category} has no ${domain === 'consumption' ? 'internal consumption' : domain} data — this is real, not a failed load.`
    // "for the selected hospital" is the right hint on a stock card, where an empty
    // bucket usually means this site does not carry it. It is the WRONG hint on a
    // procurement card: `Unclassified` empties the material-group panels on Monthly SKU
    // Purchase at every hospital, because those materials carry no material group at
    // all. Nothing here can know which it is, so procurement states the fact and stops
    // rather than guessing at a cause.
    : domain === 'procurement'
      ? `No ${category} rows in this view.`
      : `No ${category} rows in this view for the selected hospital.`
  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[11.5px] leading-snug ${className}`}
      style={{ background: '#f7f8fa', color: '#6b7280', border: '1px solid #eceef3' }}
    >
      <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#c3c8d4' }} />
      <span>{text}</span>
    </div>
  )
}

export default useCardCategory
