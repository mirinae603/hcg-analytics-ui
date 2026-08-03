'use client'
// Installs the transport-level category scope (src/lib/categoryFetch.ts).
//
// Renders nothing. It exists purely so the patch has a mount point in the root
// layout, next to GlobalLoader, which patches window.fetch the same way — keeping
// both interceptors visible in one place instead of hiding one inside the other.
//
// The install runs at module evaluation (before React renders anything, so even the
// first request on a cold page load is scoped) and again from an effect, because
// Next can defer a client module's evaluation. Both calls are no-ops after the
// first — installCategoryFetch() is guarded by a flag on window, so React
// strict-mode's double-mount and dev HMR re-evals cannot stack patches.
import { useEffect } from 'react'
import { installCategoryFetch } from '@/lib/categoryFetch'

installCategoryFetch()

export default function CategoryScopeFetch() {
  useEffect(() => {
    installCategoryFetch()
  }, [])
  return null
}
