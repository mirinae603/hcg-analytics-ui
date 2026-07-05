'use client'

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TbBuildingHospital, TbBuildings } from 'react-icons/tb'
import { useRegion } from '@/context/RegionContext'
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
    <Listbox value={selectedRegion} onChange={setSelectedRegion}>
      <div className="relative mt-0">
        <ListboxButton className="grid w-full min-w-[210px] cursor-pointer grid-cols-1 rounded-lg bg-white py-2.5 pr-3 pl-3 text-left text-blue-900 shadow-xs ring-1 ring-inset ring-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-200 sm:text-sm transition-all">
          <span className="col-start-1 row-start-1 flex items-center gap-2.5 pr-6">
            <PlantIcon code={selectedRegion.code} />
            <span className="block truncate font-medium">{selectedRegion.name}</span>
          </span>
          <ChevronUpDownIcon aria-hidden="true" className="col-start-1 row-start-1 size-5 self-center justify-self-end text-blue-400 sm:size-4" />
        </ListboxButton>

        <ListboxOptions className="absolute z-10 mt-2 max-h-72 min-w-full w-max overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-blue-100 focus:outline-none">
          <div className="px-2 py-1 sticky top-0 bg-white">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hospital…"
              className="w-full rounded-md border border-blue-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filtered.map((region) => (
            <ListboxOption key={region.id} value={region}
              className="group relative cursor-pointer select-none rounded-md py-2 pr-8 pl-3 text-blue-900 hover:bg-blue-50 data-focus:bg-blue-100 data-selected:bg-blue-100 data-selected:font-semibold transition-all">
              <div className="flex items-center gap-2.5">
                <PlantIcon code={region.code} size={22} />
                <span className="block truncate">{region.name}</span>
                {region.code && region.code !== 'ALL' && (
                  <span className="ml-auto text-xs font-medium text-blue-400">{region.code}</span>
                )}
              </div>
            </ListboxOption>
          ))}
          {!filtered.length && <div className="px-4 py-3 text-sm text-gray-400">No hospital with data here.</div>}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
