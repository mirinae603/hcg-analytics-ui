'use client'
// The mirror image of ScopeBanner.
//
// ScopeBanner stops a filtered number being read as the company total. This stops the
// opposite mistake: a page that CANNOT honour the filter still sits under that amber
// strip, so without a word here its whole-portfolio figures would read as category
// figures. Renders nothing unless a filter is actually active.
import { useCategory, isFiltered } from '@/context/CategoryContext'

export default function NotScopedNote({ reason }: { reason: string }) {
  const { selectedCategory } = useCategory()
  if (!isFiltered(selectedCategory)) return null
  return (
    <div
      className="flex items-start gap-2 rounded-xl px-4 py-2.5 text-[12px]"
      style={{ background: '#f8f9fb', border: '1px solid #e7e8ee', color: '#6b7280' }}
    >
      <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#9ca3af' }} />
      <span>
        <b style={{ color: '#41444f' }}>Not split by material category.</b> {reason} Figures below cover all
        categories, not just {selectedCategory.name}.
      </span>
    </div>
  )
}
