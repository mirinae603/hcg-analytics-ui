'use client'

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TbBuildingHospital, TbBuildings } from 'react-icons/tb'
import { useRegion, displayRegion } from '@/context/RegionContext'
import { byKey } from '@/lib/kpiRegistry'
import { DASHBOARD_API_BASE_URL } from '@/utils/config'

type Plant = { id: number; name: string; code: string; avatar: string; domains: string[] }

// Which data domain the current page belongs to — so we only offer plants that
// actually have data for it (a corporate office has no inventory, etc.).
const FC_PATHS = ['/salesQuantityForecast', '/cashFlowForecast', '/stockReplenishmentForecast']
function sectionDomain(pathname: string): string | null {
  if (pathname.startsWith('/kpi/')) return byKey(pathname.split('/')[2] || '')?.portfolio ?? null
  if (pathname.startsWith('/inventory')) return 'inventory'
  if (pathname.startsWith('/procurement')) return 'procurement'
  if (pathname.startsWith('/consumption')) return 'consumption'
  if (pathname.startsWith('/forecasting') || FC_PATHS.includes(pathname)) return 'forecasting'
  return null   // executive summary etc. → show every plant
}

// Inline hospital icon — no external image (the old icons8 URL was blocked).
function PlantIcon({ code, size = 24 }: { code?: string; size?: number }) {
  const isAll = !code || code === 'ALL'
  const Icon = isAll ? TbBuildings : TbBuildingHospital
  return (
    <span className="shrink-0 flex items-center justify-center rounded-md"
      style={{ width: size, height: size, background: '#eef1ff', color: '#4f5bd5' }}>
      <Icon size={Math.round(size * 0.6)} />
    </span>
  )
}

const ALL_PLANTS: Plant = { id: -1, name: 'All Plants', code: 'ALL', avatar: '', domains: [] }

export default function RegionFilter() {
  const { selectedRegion, setSelectedRegion } = useRegion()
  const [regions, setRegions] = useState<Plant[]>([ALL_PLANTS])
  const [query, setQuery] = useState('')
  const pathname = usePathname() || ''
  const domain = sectionDomain(pathname)

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/meta/plants`)
      .then((r) => r.json())
      .then((d) => {
        const list: Plant[] = (d.plants || []).map((p: any, i: number) => ({
          id: i, name: p.name, code: p.code, avatar: '', domains: p.domains || [],
        }))
        if (list.length) setRegions(list.some((r) => r.code === 'ALL') ? list : [ALL_PLANTS, ...list])
      })
      .catch(() => {})
  }, [])

  // If the selected plant has no data for the section we're now on, fall back to
  // All Plants so the page never shows a confusing wall of zeros.
  useEffect(() => {
    if (!domain || selectedRegion.code === 'ALL') return
    const r = regions.find((x) => x.code === selectedRegion.code)
    if (r && r.domains.length && !r.domains.includes(domain)) setSelectedRegion(ALL_PLANTS as any)
  }, [domain, regions]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = regions.filter((r) => {
    if (r.code !== 'ALL' && domain && r.domains.length && !r.domains.includes(domain)) return false
    if (!query) return true
    return r.name.toLowerCase().includes(query.toLowerCase()) || r.code?.toLowerCase().includes(query.toLowerCase())
  })

  return (
    /* Clearing the query on select stops a stale filter from greeting the user next
       time they open the menu — previously it reopened still showing one result. */
    <Listbox value={selectedRegion} onChange={(r) => { setSelectedRegion(r); setQuery('') }}>
      <div className="relative mt-0">
        <ListboxButton className="grid w-full min-w-[210px] cursor-pointer grid-cols-1 rounded-lg bg-white py-2.5 pr-3 pl-3 text-left text-blue-900 shadow-xs ring-1 ring-inset ring-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-200 sm:text-sm transition-all">
          <span className="col-start-1 row-start-1 flex items-center gap-2.5 pr-6">
            <PlantIcon code={selectedRegion.code} />
            <span className="block truncate font-medium">{displayRegion(selectedRegion.name)}</span>
          </span>
          <ChevronUpDownIcon aria-hidden="true" className="col-start-1 row-start-1 size-5 self-center justify-self-end text-blue-400 sm:size-4" />
        </ListboxButton>

        {/* `anchor` portals the panel to the top layer and flips it when it would run
            off-screen. The old `absolute z-10` sat inside the header's stacking context,
            so on short viewports the list was clipped by the header instead of flipping. */}
        <ListboxOptions
          anchor={{ to: 'bottom start', gap: 8 }}
          className="z-[70] w-[calc(100vw-2rem)] sm:w-[max(var(--button-width),20rem)] sm:max-w-[26rem]
                     max-h-[min(20rem,var(--anchor-max-height,20rem))] overflow-y-auto overscroll-contain
                     rounded-xl bg-white pb-1 text-sm shadow-[0_16px_40px_-12px_rgba(30,41,90,0.28)]
                     ring-1 ring-blue-100 focus:outline-none"
        >
          {/* z-20 is the actual bug fix. Every ListboxOption below carries `relative`,
              which paints it in the same stacking context — with no z-index here, the
              rows scrolled straight over the search field. The solid background and
              bottom rule give the scrolled list somewhere to visibly stop. */}
          <div className="sticky top-0 z-20 bg-white px-2 pt-2 pb-2 border-b border-blue-50">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hospital…"
              aria-label="Search hospital"
              className="w-full rounded-lg border border-blue-100 bg-white px-2.5 py-2 text-sm text-blue-900 placeholder:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              onClick={(e) => e.stopPropagation()}
              /* Listbox owns type-ahead: without this, typing "b" jumped the selection
                 to a plant instead of filtering, and space closed the menu. */
              onKeyDown={(e) => { if (e.key !== 'Escape' && e.key !== 'Enter') e.stopPropagation() }}
            />
          </div>
          <div className="pt-1">
            {filtered.map((region) => (
              <ListboxOption key={region.id} value={region}
                className="group relative mx-1 cursor-pointer select-none rounded-lg py-2.5 sm:py-2 pr-3 pl-2.5 text-blue-900 hover:bg-blue-50 data-focus:bg-blue-100 data-selected:bg-blue-100 data-selected:font-semibold transition-colors">
                <div className="flex items-center gap-2.5">
                  <PlantIcon code={region.code} size={22} />
                  {/* min-w-0 lets the name truncate instead of shoving the code off the
                      panel — long names used to push "HC40" past the right edge. */}
                  <span className="block truncate min-w-0 flex-1">{displayRegion(region.name)}</span>
                  {region.code && region.code !== 'ALL' && (
                    <span className="shrink-0 tabular-nums text-xs font-medium text-blue-400">{region.code}</span>
                  )}
                </div>
              </ListboxOption>
            ))}
            {/* Two different empty states. Saying "no hospital with data here" to
                someone who simply mistyped a name is misleading — it reads as a data
                gap when it is a search miss. */}
            {!filtered.length && (
              <div className="px-4 py-6 text-center">
                {query ? (
                  <>
                    <div className="text-sm text-gray-500">No hospital matches “{query}”.</div>
                    <button type="button" onClick={() => setQuery('')}
                      className="mt-2 text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline">
                      Clear search
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">No hospital has data for this section.</div>
                )}
              </div>
            )}
          </div>
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
