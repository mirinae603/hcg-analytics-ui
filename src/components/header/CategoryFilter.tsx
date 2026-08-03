'use client'
// Global material-category selector — the sibling control to RegionFilter.
//
// FORM CHOICE (dropdown, not a segmented control):
//  · Six options at ~14 chars each is ~520px of segmented control. The header already
//    carries the sidebar toggle, the back button, RegionFilter (210px), the Bidezy×HCG
//    lockup and the user menu — a segment strip wraps below laptop widths.
//  · A matched pair of dropdowns reads as one idea ("scope"). A segment strip beside a
//    dropdown reads as two unrelated kinds of control.
//  · Segments imply cheap, equal, frequently-flipped peers. These buckets are wildly
//    unequal (Onco 41.7% of stock value vs Lab 1.4%) and each change refetches the page.
//    A dropdown has room to carry that share % — which is the thing that actually helps
//    someone choose — and a segment does not.
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { useEffect } from 'react'
import { TbCategory2, TbVaccine, TbPill, TbBandage, TbFlask, TbBox, TbHelpCircle, TbAlertTriangle } from 'react-icons/tb'
import { useCategory, Category, ALL_CATEGORIES, isFiltered } from '@/context/CategoryContext'
import { useRegion } from '@/context/RegionContext'
import { DASHBOARD_API_BASE_URL } from '@/utils/config'

// Restrained "you are looking at a subset" palette. These exact tokens are already the
// app's advisory tone (the Simulated badge on the inventory grid), so an active filter
// looks native rather than like a new alert style.
const WARM_BG = '#fff8ed', WARM_RING = '#fadcae', WARM_INK = '#a56a15', WARM_DOT = '#e08a1e'

const ICONS: Record<string, any> = {
  All: TbCategory2,
  'Onco Drugs': TbVaccine,
  'Other Drugs': TbPill,
  Consumables: TbBandage,
  Lab: TbFlask,
  'Non-Medical': TbBox,
  Unclassified: TbHelpCircle,
}

function CatIcon({ k, size = 24, active }: { k: string; size?: number; active?: boolean }) {
  const Icon = ICONS[k] || TbCategory2
  return (
    <span
      className="shrink-0 flex items-center justify-center rounded-md"
      style={{
        width: size,
        height: size,
        background: active ? '#fdeed6' : '#eef1ff',
        color: active ? WARM_INK : '#4f5bd5',
      }}
    >
      <Icon size={Math.round(size * 0.6)} />
    </span>
  )
}

const share = (c: Category) =>
  c.share_pct == null ? '' : c.share_pct >= 10 ? `${c.share_pct.toFixed(0)}%` : `${c.share_pct.toFixed(1)}%`

export default function CategoryFilter() {
  const { selectedCategory, setSelectedCategory, categories, setCategories } = useCategory()
  const { selectedRegion } = useRegion()
  const region = selectedRegion?.name ?? 'All Plants'
  const active = isFiltered(selectedCategory)

  // Buckets and their shares are plant-dependent, so refetch when the plant changes.
  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/meta/categories?Plant=${encodeURIComponent(region)}`)
      .then((r) => r.json())
      .then((d) => {
        const list: Category[] = (d?.categories || []).map((c: any) => ({
          key: c.key, name: c.name, value: c.value, skus: c.skus, share_pct: c.share_pct, coverage: c.coverage ?? null,
        }))
        if (!list.length) return
        setCategories(list.some((c) => c.key === 'All') ? list : [ALL_CATEGORIES, ...list])
        // Keep the live share/coverage on the selected bucket fresh for the header pill
        // and for any page that reads coverage to caption an empty chart.
        const me = list.find((c) => c.key === selectedCategory.key)
        if (me) setSelectedCategory(me)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region])

  return (
    <Listbox value={selectedCategory} onChange={setSelectedCategory}>
      <div className="relative mt-0">
        <ListboxButton
          title={
            active
              ? `Filtered to ${selectedCategory.name} — every figure on this page covers this category only`
              : 'All categories — showing the full portfolio'
          }
          className="grid w-full min-w-[190px] cursor-pointer grid-cols-1 rounded-lg py-2.5 pr-3 pl-3 text-left shadow-xs ring-1 ring-inset focus:outline-none focus:ring-1 sm:text-sm transition-all"
          style={{
            background: active ? WARM_BG : '#ffffff',
            color: active ? WARM_INK : '#1e3a8a',
            // @ts-expect-error CSS custom property consumed by the ring utility
            '--tw-ring-color': active ? WARM_RING : '#dbeafe',
          }}
        >
          <span className="col-start-1 row-start-1 flex items-center gap-2.5 pr-6">
            <CatIcon k={selectedCategory.key} active={active} />
            <span className="block truncate font-medium">
              {active ? selectedCategory.name : 'All Categories'}
            </span>
            {active && (
              <span
                className="ml-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                style={{ background: '#fdeed6', color: WARM_INK }}
              >
                {share(selectedCategory)}
              </span>
            )}
          </span>
          <ChevronUpDownIcon
            aria-hidden="true"
            className="col-start-1 row-start-1 size-5 self-center justify-self-end sm:size-4"
            style={{ color: active ? WARM_DOT : '#60a5fa' }}
          />
        </ListboxButton>

        <ListboxOptions className="absolute z-10 mt-2 max-h-[26rem] min-w-full w-max overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-blue-100 focus:outline-none">
          <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Scope by material category
          </div>
          {categories.map((c) => {
            const isAll = c.key === 'All'
            const thin = c.coverage && c.coverage.has_stock && !c.coverage.has_consumption
            return (
              <ListboxOption
                key={c.key}
                value={c}
                className="group relative cursor-pointer select-none rounded-md py-2 pr-3 pl-3 text-blue-900 hover:bg-blue-50 data-focus:bg-blue-100 data-selected:bg-blue-100 data-selected:font-semibold transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <CatIcon k={c.key} size={22} active={!isAll} />
                  <span className="block truncate">{isAll ? 'All Categories' : c.name}</span>
                  {/* Warn where the backend says this bucket has stock but effectively no
                      consumption movements (Onco is dispensed via IP/OP billing) — so an
                      empty consumption chart reads as data reality, not a broken filter. */}
                  {thin && (
                    <TbAlertTriangle
                      size={13}
                      className="shrink-0"
                      style={{ color: WARM_DOT }}
                      title="Stocked but barely consumed through internal movements — usage-based charts will look sparse for this category."
                    />
                  )}
                  <span className="ml-auto pl-6 text-xs font-medium tabular-nums text-blue-400">{share(c)}</span>
                </div>
              </ListboxOption>
            )
          })}
          {active && (
            <button
              onClick={() => setSelectedCategory(ALL_CATEGORIES)}
              className="mt-1 w-full border-t border-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50"
            >
              Clear filter — back to all categories
            </button>
          )}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
