// src/context/CategoryContext.tsx
'use client'
// Global material-category scope — the sibling of RegionContext.
//
// Region answers "which hospital am I looking at"; Category answers "which kind of
// stock". They are deliberately built the same way (context + header selector +
// localStorage) so a page only ever reads one scope and refetches on one key.
//
// The default is "All", which sends NO Category param at all — a user who never
// touches the control sees byte-identical numbers to before this shipped.
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRegion } from '@/context/RegionContext'

export interface CategoryCoverage {
  stock_value: number
  consumption_cost: number
  billed_revenue: number
  has_stock: boolean
  has_consumption: boolean
  has_billing: boolean
  note: string | null
}

export interface Category {
  key: string          // what we send to the API ("Onco Drugs"); "All" = no filter
  name: string         // what we show ("Onco Drugs" / "All Categories")
  value?: number       // stock value in that bucket
  skus?: number
  share_pct?: number
  coverage?: CategoryCoverage | null
}

export const ALL_CATEGORIES: Category = { key: 'All', name: 'All Categories', share_pct: 100 }

/** True when the user has narrowed the view — drives every "you are filtered" affordance. */
export const isFiltered = (c: Category) => !!c && c.key !== 'All'

interface CategoryContextType {
  selectedCategory: Category
  setSelectedCategory: (c: Category) => void
  /** Every bucket the backend offers, for the selector and for coverage notes. */
  categories: Category[]
  setCategories: (c: Category[]) => void
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined)

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCategory, setCategory] = useState<Category>(ALL_CATEGORIES)
  const [categories, setCategories] = useState<Category[]>([ALL_CATEGORIES])

  // Restore the last-selected category so a refresh keeps context, exactly like plant.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('selectedCategory')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.key) setCategory(parsed)
      }
    } catch { /* noop */ }
  }, [])

  const setSelectedCategory = (c: Category) => {
    setCategory(c)
    try { localStorage.setItem('selectedCategory', JSON.stringify(c)) } catch { /* noop */ }
  }

  return (
    <CategoryContext.Provider value={{ selectedCategory, setSelectedCategory, categories, setCategories }}>
      {children}
    </CategoryContext.Provider>
  )
}

export const useCategory = () => {
  const ctx = useContext(CategoryContext)
  if (!ctx) throw new Error('useCategory must be used within CategoryProvider')
  return ctx
}

/**
 * The one thing pages actually need: the current scope, pre-rendered.
 *
 *   const { region, catParam, scopeKey } = useScope()
 *   fetch(`${API}/kpi/x?Plant=${encodeURIComponent(region)}${catParam}`)
 *   useEffect(..., [scopeKey])
 *
 * `catParam` is "" on the default so no URL changes for an unfiltered user, and
 * `scopeKey` is the single dependency that makes a page refetch on either axis.
 */
export function useScope() {
  const { selectedRegion } = useRegion()
  const { selectedCategory } = useCategory()
  const region = selectedRegion?.name ?? 'All Plants'
  const category = selectedCategory ?? ALL_CATEGORIES
  const filtered = isFiltered(category)
  return {
    region,
    category,
    filtered,
    /** "" when unfiltered, else "&Category=Onco%20Drugs" — append to an existing query. */
    catParam: filtered ? `&Category=${encodeURIComponent(category.key)}` : '',
    /** Same value without the leading "&", for URLSearchParams callers. */
    catValue: filtered ? category.key : '',
    /** Single dep-array key covering both scope axes. */
    scopeKey: `${region}|${category.key}`,
  }
}
