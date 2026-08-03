'use client'
// A slim strip that appears ONLY while a category filter is active.
//
// The tinted header control says "a filter is on"; this says what it costs you —
// that every figure below is a subset, and how big a subset. Zero footprint on the
// default view (it renders nothing), one quiet line when narrowed, so a filtered
// number can never be misread as the company total.
import { useCategory, isFiltered, ALL_CATEGORIES } from '@/context/CategoryContext'
import { TbFilterOff, TbAlertTriangle } from 'react-icons/tb'

const WARM_BG = '#fff8ed', WARM_RING = '#f6e0bd', WARM_INK = '#a56a15', WARM_DOT = '#e08a1e'

const crore = (v?: number) => (v == null ? null : `₹${(v / 1e7).toFixed(2)} Cr`)

export default function ScopeBanner() {
  const { selectedCategory, setSelectedCategory } = useCategory()
  if (!isFiltered(selectedCategory)) return null

  const c = selectedCategory
  const thin = c.coverage && c.coverage.has_stock && !c.coverage.has_consumption

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-[12px] md:px-6"
      style={{ background: WARM_BG, borderBottom: `1px solid ${WARM_RING}`, color: WARM_INK }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: WARM_DOT }} />
      <span>
        Filtered to <b>{c.name}</b>
        {c.share_pct != null && (
          <>
            {' '}— <b className="tabular-nums">{c.share_pct.toFixed(c.share_pct >= 10 ? 1 : 2)}%</b> of stock value
            {crore(c.value) ? <span className="tabular-nums"> ({crore(c.value)})</span> : null}
          </>
        )}
        . Every figure below covers this category only.
      </span>

      {/* The honest caveat, straight from /meta/categories — an empty consumption chart
          here is the source data, not a broken filter. */}
      {thin && (
        <span className="inline-flex items-center gap-1.5" style={{ opacity: 0.9 }}>
          <TbAlertTriangle size={13} className="shrink-0" />
          <span className="max-w-[60ch] truncate md:whitespace-normal" title={c.coverage?.note || ''}>
            {c.coverage?.note}
          </span>
        </span>
      )}

      <button
        onClick={() => setSelectedCategory(ALL_CATEGORIES)}
        className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-colors hover:bg-[#fdeed6]"
        style={{ border: `1px solid ${WARM_RING}` }}
      >
        <TbFilterOff size={13} />
        Clear
      </button>
    </div>
  )
}
