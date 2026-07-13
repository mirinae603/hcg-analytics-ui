// src/context/RegionContext.tsx
'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Region {
  id: number
  name: string
  avatar: string
  code?: string
}

interface RegionContextType {
  selectedRegion: Region
  setSelectedRegion: (region: Region) => void
}

const defaultRegion: Region = {
 id: 0, name: 'All Plants', code: 'ALL', avatar: '',
}

const RegionContext = createContext<RegionContextType | undefined>(undefined)

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedRegion, setRegion] = useState<Region>(defaultRegion)

  // Restore the last-selected plant so a refresh / shared deep-link keeps context.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('selectedRegion')
      if (saved) setRegion(JSON.parse(saved))
    } catch { /* noop */ }
  }, [])

  const setSelectedRegion = (region: Region) => {
    setRegion(region)
    try { localStorage.setItem('selectedRegion', JSON.stringify(region)) } catch { /* noop */ }
  }

  return (
    <RegionContext.Provider value={{ selectedRegion, setSelectedRegion }}>
      {children}
    </RegionContext.Provider>
  )
}

export const useRegion = () => {
  const context = useContext(RegionContext)
  if (!context) {
    throw new Error('useRegion must be used within RegionProvider')
  }
  return context
}
