'use client'
// "This panel ignored your filter" — the counterpart to ScopeBanner.
//
// ScopeBanner promises "every figure below covers this category only". A handful of
// metrics genuinely cannot honour that: they ship pre-aggregated, or sit on tables with
// no material column at all (departmental consumption is recorded per cost centre and
// month, with no item-level breakdown). src/lib/categoryScope.ts already keeps the
// Category param off those endpoints, so the number they show is correct — it is the
// *label* that would lie. This badge is the retraction, placed on the panel itself.
//
// Same warm tokens as ScopeBanner and the Simulated tag, so it reads as the existing
// "read this with a caveat" voice rather than a new alert style.
const WARM_BG = '#fff8ed', WARM_RING = '#fadcae', WARM_INK = '#a56a15'

export default function UnscopedBadge({
  reason,
  className = '',
  style,
}: {
  /** Why this metric cannot be filtered — shown on hover. */
  reason: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      title={`${reason} The figure shown covers all categories.`}
      className={`inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${className}`}
      style={{ background: WARM_BG, color: WARM_INK, border: `1px solid ${WARM_RING}`, ...style }}
    >
      All categories
    </span>
  )
}
