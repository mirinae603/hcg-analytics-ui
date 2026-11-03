'use client'

// The dashboard-wide Value ↔ Quantity switch, beside the hospital selector: HCG asked for "one side
// quantity, one side value; click value and the whole dashboard changes to value". The choice
// lives in BasisContext (it carries from page to page and survives a reload); this is only its
// control. It reaches the pages in BASIS_PAGE_LIST, not yet the whole dashboard: its note names
// them, so nobody is told it flips every page.
//
// A radio group, so it reads and works the way a screen reader and a keyboard expect: Tab lands
// on the chosen option, the arrow keys (and Home / End) move the choice, and each option says
// whether it is checked. The note on what quantity counts shows on hover and on keyboard focus (Escape
// puts it away), and is the group's description for a screen reader, so nobody has to hover to
// learn it.
//
// It is shown only on the pages that read it (BASIS_PAGES): anywhere else it would sit in the
// header doing nothing. The choice itself is kept while it is hidden, so it is still set when
// the user comes back to a page that reads it.
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { usePathname } from 'next/navigation'
import { BASIS_OPTIONS, useBasis } from '@/context/BasisContext'

/** The pages that read the switch, by the first segment of their path (a tab lives in the
 *  query, so every tab of these pages is covered), each with its name and how it answers Quantity:
 *  the Executive overview, Formulary compliance and Revenue & margin count units sold where they
 *  can ('units'); Spend analysis is rupees only and says so in its page bar when Quantity is on
 *  ('rupees'), so the switch there is answered rather than ignored. Every other page (inventory,
 *  procurement, consumption, forecasting, the KPI pages, the AI analyst, admin, data exports, the
 *  older revenue history, the home screen) has no quantity view, so the switch is not shown there.
 *  Add a page here when it starts reading useBasis(): the note below names it from this list. */
const BASIS_PAGE_LIST: readonly { segment: string; name: string; answers: 'units' | 'rupees' }[] = [
  { segment: 'executive', name: 'the Executive overview', answers: 'units' },
  { segment: 'formulary', name: 'Formulary', answers: 'units' },
  { segment: 'revenue', name: 'Revenue & margin', answers: 'units' },
  { segment: 'spend', name: 'Spend', answers: 'rupees' },
]

export const BASIS_PAGES: ReadonlySet<string> = new Set(BASIS_PAGE_LIST.map((p) => p.segment))

/** "a", "a and b", "a, b and c". */
const inWords = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const named = (answers: 'units' | 'rupees') => inWords(BASIS_PAGE_LIST.filter((p) => p.answers === answers).map((p) => p.name))

/** What the switch changes, in plain words: which pages it turns to units sold (HCG asked for
 *  the whole dashboard; it does not reach every page yet, and the note does not claim it does),
 *  which stay in rupees, and what quantity counts. "Quantity", never "Units": HCG calls its
 *  hospitals units. */
export const BASIS_NOTE = [
  `Quantity turns ${named('units')} to units sold where they can.`,
  named('rupees') ? `${named('rupees')} stays in rupees.` : '',
  'Quantity adds tablets, vials and bottles together; money measures stay in rupees.',
  'Other pages have no quantity view yet, so the switch is hidden there.',
].filter(Boolean).join(' ')

/** Whether the page at `pathname` reads the switch. The first segment is compared whole, so a
 *  trailing slash makes no difference and /revenueMargin is not /revenue. */
export function basisApplies(pathname: string | null | undefined): boolean {
  const first = (pathname ?? '').split('/').find(Boolean) ?? ''
  return BASIS_PAGES.has(first)
}

/** How far each arrow key moves the choice. */
const STEP = new Map<string, number>([['ArrowRight', 1], ['ArrowDown', 1], ['ArrowLeft', -1], ['ArrowUp', -1]])

export default function BasisToggle({ className = '' }: { className?: string }) {
  const { basis, setBasis } = useBasis()
  const shown = basisApplies(usePathname())
  const noteId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  // Escape hides the note until the pointer or focus leaves and comes back.
  const [quiet, setQuiet] = useState(false)

  const pick = (i: number) => {
    const o = BASIS_OPTIONS[i]
    if (!o) return
    if (o.key !== basis) setBasis(o.key)
    refs.current[i]?.focus()
  }

  // Roving focus inside the group: the arrows wrap round, Home and End go to the ends.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === 'Escape') { setQuiet(true); return }
    const n = BASIS_OPTIONS.length
    const step = STEP.get(e.key)
    const j = step != null ? (i + step + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (j == null) return
    e.preventDefault()
    pick(j)
  }

  // After every hook: a page without a quantity view gets no switch (the header and the phone
  // menu both place this component, so both follow the one list).
  if (!shown) return null

  return (
    <div className={`group relative ${className}`} onMouseLeave={() => setQuiet(false)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setQuiet(false) }}>
      <div role="radiogroup" aria-label="Show figures as" aria-describedby={noteId}
        className="flex items-center gap-0.5 rounded-lg bg-white p-1 shadow-xs ring-1 ring-inset ring-blue-100">
        {BASIS_OPTIONS.map((o, i) => {
          const on = o.key === basis
          return (
            <button key={o.key} ref={(el) => { refs.current[i] = el }} type="button" role="radio" aria-checked={on}
              tabIndex={on ? 0 : -1} onClick={() => pick(i)} onKeyDown={(e) => onKeyDown(e, i)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:px-3 ${
                on ? 'bg-[#4f5bd5] text-white shadow-xs' : 'text-blue-900 hover:bg-blue-50'}`}>
              {o.label}
            </button>
          )
        })}
      </div>
      {/* The note: below the switch on hover or keyboard focus; always the group's description. */}
      <div id={noteId} role="tooltip"
        className={`pointer-events-none invisible absolute right-0 top-full z-[70] mt-2 w-72 rounded-lg bg-blue-950 px-3 py-2 text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity ${
          quiet ? '' : 'group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'}`}>
        {BASIS_NOTE}
      </div>
    </div>
  )
}

