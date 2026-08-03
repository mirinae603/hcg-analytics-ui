'use client'
// The one reusable "what's inside this bar?" surface.
//
// DESIGN NOTES
// ------------
// * It REPLACES the chart's own tooltip rather than floating a second box beside it.
//   The panel's first line is exactly what the old tooltip said (label + value); the
//   breakdown grows underneath it. One box, one hover, no duelling popups.
// * Hover-intent: nothing is requested until the pointer has rested ~200ms, so sweeping
//   across a 12-bar chart fires one request, not twelve. Every result is cached per
//   slice, so coming back to a bar is instant and shows no skeleton at all.
// * The panel never claims the top 10 are the whole story — it always closes with how
//   much of the bar those rows actually cover (`covered_pct` from the backend).
// * Touch has no hover, so a tap PINS the panel (close button, Esc, outside-click). On a
//   coarse pointer we skip hover entirely and go straight to tap-to-pin, which means the
//   same information is reachable on a tablet as on a desktop.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TbX, TbChevronRight } from 'react-icons/tb'
import { DrillResult, DrillQuery, fetchDrill, drillCacheKey } from '@/lib/drilldown'

const HOVER_INTENT_MS = 200
const PANEL_W = 340
const FONT = "Outfit, 'Segoe UI', sans-serif"

const INK = '#1b1c22', INK2 = '#41444f', MUT = '#8a8f9d', LINE = '#eef0f4', BORDER = '#e4e6ec'
const ACCENT = '#465fff', ACCENT_SOFT = 'rgba(70,95,255,0.10)'

// Module-level cache: survives remounts and page-to-page navigation within a session,
// so a returning user's hover is instant. Bounded so it can't grow unbounded.
const CACHE = new Map<string, DrillResult>()
const CACHE_MAX = 120
function remember(k: string, v: DrillResult) {
  if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value as string)
  CACHE.set(k, v)
}

type Anchor = { x: number; y: number }
type Spec = Omit<DrillQuery, 'slice'> & {
  /** Formats the measure — pass the chart's own formatter so the panel speaks its language. */
  format: (n: number) => string
  /** Plain noun for the list heading ("items", "hospitals"). */
  label: string
  /** Optional: what the dimension is called, for the header eyebrow. */
  dimLabel?: string
}

export function useDrillDown(spec: Spec | null) {
  const [slice, setSlice] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<Anchor>({ x: 0, y: 0 })
  const [pinned, setPinned] = useState(false)
  const [data, setData] = useState<DrillResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abort = useRef<AbortController | null>(null)
  const pinnedRef = useRef(false)
  pinnedRef.current = pinned

  const coarse = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches,
    []
  )

  const cancelPending = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    abort.current?.abort()
    abort.current = null
  }, [])

  const load = useCallback((s: string) => {
    if (!spec) return
    const q: DrillQuery = { ...spec, slice: s }
    const key = drillCacheKey(q)
    const hit = CACHE.get(key)
    if (hit) { setData(hit); setLoading(false); setFailed(false); return }

    setLoading(true); setFailed(false); setData(null)
    const ac = new AbortController()
    abort.current = ac
    fetchDrill(q, ac.signal)
      .then((r) => { remember(key, r); if (!ac.signal.aborted) { setData(r); setLoading(false) } })
      .catch((e) => {
        if (ac.signal.aborted || e?.name === 'AbortError') return
        setFailed(true); setLoading(false)
      })
  }, [spec])

  /** Pointer rested on a slice — start the intent timer. */
  const enter = useCallback((s: string, x: number, y: number) => {
    if (!spec || pinnedRef.current || coarse) return
    cancelPending()
    setSlice(s); setAnchor({ x, y }); setData(null); setLoading(false); setFailed(false)
    timer.current = setTimeout(() => load(s), HOVER_INTENT_MS)
  }, [spec, coarse, cancelPending, load])

  const move = useCallback((x: number, y: number) => {
    if (pinnedRef.current) return
    setAnchor({ x, y })
  }, [])

  const leave = useCallback(() => {
    if (pinnedRef.current) return
    cancelPending()
    setSlice(null); setData(null); setLoading(false); setFailed(false)
  }, [cancelPending])

  /** Tap / click — freeze the panel so it can be read and scrolled. */
  const pin = useCallback((s: string, x: number, y: number) => {
    if (!spec) return
    cancelPending()
    setSlice(s); setAnchor({ x, y }); setPinned(true)
    load(s)
  }, [spec, cancelPending, load])

  const close = useCallback(() => {
    cancelPending()
    setPinned(false); setSlice(null); setData(null); setLoading(false); setFailed(false)
  }, [cancelPending])

  useEffect(() => () => cancelPending(), [cancelPending])

  // Esc closes a pinned panel — standard dismissal for anything modal-ish.
  useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned, close])

  const panel =
    spec && slice ? (
      <DrillPanel
        slice={slice}
        anchor={anchor}
        pinned={pinned}
        loading={loading}
        failed={failed}
        data={data}
        format={spec.format}
        label={spec.label}
        dimLabel={spec.dimLabel}
        onClose={close}
      />
    ) : null

  return { enter, move, leave, pin, close, panel, pinned, coarse, active: slice }
}

// ─── panel ────────────────────────────────────────────────────────────────────

function Row({ it, max, format }: { it: any; max: number; format: (n: number) => string }) {
  const w = max > 0 ? Math.max((it.value / max) * 100, 1.5) : 0
  return (
    <div className="relative flex items-center gap-2 rounded-md px-1.5 py-[5px]">
      {/* Length is share-of-largest so the eye can compare; the % label is the true
          share of the hovered slice. Two different jobs, two different encodings. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-md"
        style={{ width: `${w}%`, background: ACCENT_SOFT }}
      />
      <span className="relative w-4 shrink-0 text-right text-[10px] font-bold tabular-nums" style={{ color: MUT }}>
        {it.rank}
      </span>
      <span className="relative min-w-0 flex-1 truncate text-[11.5px] font-medium" style={{ color: INK2 }} title={it.name}>
        {it.name}
      </span>
      <span className="relative shrink-0 text-[11.5px] font-bold tabular-nums" style={{ color: INK }}>
        {format(it.value)}
      </span>
      <span className="relative w-9 shrink-0 text-right text-[10.5px] tabular-nums" style={{ color: MUT }}>
        {it.share_pct.toFixed(1)}%
      </span>
    </div>
  )
}

function DrillPanel({
  slice, anchor, pinned, loading, failed, data, format, label, dimLabel, onClose,
}: {
  slice: string
  anchor: Anchor
  pinned: boolean
  loading: boolean
  failed: boolean
  data: DrillResult | null
  format: (n: number) => string
  label: string
  dimLabel?: string
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const boxRef = useRef<HTMLDivElement | null>(null)

  // Outside-click dismissal, pinned only.
  useEffect(() => {
    if (!pinned) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) onClose()
    }
    // Deferred so the click that pinned it doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDown) }
  }, [pinned, onClose])

  if (!mounted) return null

  // Flip near the viewport edges so the panel is never clipped or off-screen.
  const vw = window.innerWidth, vh = window.innerHeight
  const estH = data ? Math.min(150 + data.items.length * 26, 460) : 190
  const left = anchor.x + 18 + PANEL_W > vw - 12 ? Math.max(12, anchor.x - 18 - PANEL_W) : anchor.x + 18
  const top = Math.max(12, Math.min(anchor.y - 24, vh - estH - 12))

  const max = data?.items?.length ? Math.max(...data.items.map((i) => i.value)) : 0

  return createPortal(
    <div
      ref={boxRef}
      role="tooltip"
      className="pointer-events-auto"
      style={{
        position: 'fixed', left, top, width: PANEL_W, zIndex: 9999, fontFamily: FONT,
        background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14,
        boxShadow: '0 22px 54px -20px rgba(20,24,50,0.34), 0 3px 10px -4px rgba(20,24,50,0.10)',
        // The panel must not eat pointer events while it merely follows the cursor,
        // or the chart underneath stops receiving hover.
        pointerEvents: pinned ? 'auto' : 'none',
        animation: 'ddIn .16s cubic-bezier(.22,1,.36,1) both',
        overflow: 'hidden',
      }}
    >
      <style>{`@keyframes ddIn{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:none}}
        @keyframes ddPulse{0%,100%{opacity:.55}50%{opacity:.9}}`}</style>

      {/* ── header: exactly what the native tooltip used to say ── */}
      <div className="px-3.5 pt-3 pb-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {dimLabel && (
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUT }}>
                {dimLabel}
              </div>
            )}
            <div className="truncate text-[13.5px] font-extrabold leading-tight" style={{ color: INK }} title={slice}>
              {slice}
            </div>
          </div>
          {pinned && (
            <button
              onClick={onClose}
              aria-label="Close breakdown"
              className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[#f2f3f6]"
              style={{ color: MUT }}
            >
              <TbX size={14} />
            </button>
          )}
        </div>
        {data && (
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[16px] font-extrabold tabular-nums" style={{ color: INK }}>
              {format(data.slice_total)}
            </span>
            <span className="text-[11px] tabular-nums" style={{ color: MUT }}>
              {data.slice_share_pct.toFixed(1)}% of total
            </span>
          </div>
        )}
      </div>

      {/* ── body ── */}
      <div className="px-2 py-1.5">
        {loading && (
          <>
            <div className="px-1.5 pb-1.5 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUT }}>
              Top {label} inside
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-1.5 py-[5px]">
                <div className="h-3 w-4 rounded" style={{ background: LINE, animation: `ddPulse 1.1s ease ${i * 70}ms infinite` }} />
                <div className="h-3 flex-1 rounded" style={{ background: LINE, animation: `ddPulse 1.1s ease ${i * 70}ms infinite` }} />
                <div className="h-3 w-10 rounded" style={{ background: LINE, animation: `ddPulse 1.1s ease ${i * 70}ms infinite` }} />
              </div>
            ))}
          </>
        )}

        {!loading && failed && (
          <div className="px-2 py-4 text-center text-[11.5px]" style={{ color: MUT }}>
            Breakdown unavailable for this slice.
          </div>
        )}

        {!loading && !failed && data && (
          data.items.length ? (
            <>
              <div className="flex items-baseline justify-between px-1.5 pb-1 pt-1">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUT }}>
                  Top {data.returned} {label} inside
                </span>
                <span className="text-[10px] tabular-nums" style={{ color: MUT }}>
                  of {data.count.toLocaleString('en-IN')}
                </span>
              </div>
              {data.items.map((it) => (
                <Row key={it.key + it.rank} it={it} max={max} format={format} />
              ))}
            </>
          ) : (
            <div className="px-2 py-4 text-center text-[11.5px]" style={{ color: MUT }}>
              No items in this slice.
            </div>
          )
        )}
      </div>

      {/* ── footer: the honesty line. Ten rows are rarely the whole bar. ── */}
      {!loading && data && data.items.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-3.5 py-2 text-[10.5px]"
          style={{ borderTop: `1px solid ${LINE}`, background: '#fafbfc', color: MUT }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
          <span>
            These {data.returned} cover <b className="tabular-nums" style={{ color: INK2 }}>{data.covered_pct.toFixed(1)}%</b> of this{' '}
            {dimLabel ? dimLabel.toLowerCase() : 'slice'}
          </span>
          {!pinned && (
            <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 font-semibold" style={{ color: ACCENT }}>
              click to pin <TbChevronRight size={11} />
            </span>
          )}
        </div>
      )}
    </div>,
    document.body
  )
}

export default DrillPanel
