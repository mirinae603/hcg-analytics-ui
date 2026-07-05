'use client'

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { useEffect, useState } from 'react'
import { TbBuildingHospital, TbBuildings } from 'react-icons/tb'
import { useRegion } from '@/context/RegionContext'
import { DASHBOARD_API_BASE_URL } from '@/utils/config'

// Inline, self-contained hospital icon — no external image (the old icons8 URL was
// blocked by the browser, showing broken "?" placeholders).
function PlantIcon({ code, size = 24 }: { code?: string; size?: number }) {
  const isAll = !code || code === 'ALL'
  const Icon = isAll ? TbBuildings : TbBuildingHospital
  return (
    <span
      className="shrink-0 flex items-center justify-center rounded-md"
      style={{ width: size, height: size, background: '#eef1ff', color: '#4f5bd5' }}
    >
      <Icon size={Math.round(size * 0.6)} />
    </span>
  )
}

export default function RegionFilter() {
  const { selectedRegion, setSelectedRegion } = useRegion()
  const [regions, setRegions] = useState([{ id: 0, name: 'All Plants', code: 'ALL', avatar: '' }])
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/meta/plants`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.plants || []).map((p: any, i: number) => ({
          id: i, name: p.name, code: p.code, avatar: '',
        }))
        if (list.length) setRegions([{ id: -1, name: 'All Plants', code: 'ALL', avatar: '' }, ...list.filter((r: any) => r.code !== 'ALL')])
      })
      .catch(() => {})
  }, [])

  const filtered = query
    ? regions.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.code?.toLowerCase().includes(query.toLowerCase()))
    : regions

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
          {!filtered.length && <div className="px-4 py-3 text-sm text-gray-400">No hospital found.</div>}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
