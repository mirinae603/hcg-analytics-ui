import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { DASHBOARD_API_BASE_URL } from '@/utils/config';

import StockLevelCard from './inventoryQuantityCard';
import StockAgingCard from './agingCard';
import DOHCard from './dohCard';
import NearExpiryCard from './nearExpiryCard';
import ITRCard from './itr2Card';
import { useRegion } from '@/context/RegionContext'
// ---
// API Response Types (unchanged, kept for clarity and TypeScript support)
// ---

interface StockAgingData {
  fresh: number;
  aging: number;
  problem: number;
  deadStock: number;
  lastUpdated: string;
}

interface KpiStockLevelData {
  currentStock: number;
  stockValue: number;
  lastMonthRevenue: number;
  maxStockValue: number;
  monthlyRevenueTarget: number;
  margin: number;
  unit: string;
  currency: string;
  label: string;
  lowStockThreshold: number;
  location: string;
  supplier: string;
  lastUpdated: string;
}

interface NearExpiryData {
  value: number;
  skuCount: number;
}

interface DaysOnHandData {
  daysOnHand: number;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
    period?: string;
    previousValue?: number;
  };
  criticalThreshold?: number;
  optimalRange?: { min: number; max: number };
  category?: string;
  location?: string;
  lastCalculated?: string;
}

interface InventoryTurnoverData {
  currentITR: number;
  label: string;
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  targetITR: number;
  industryAverage: number;
}

interface DashboardData {
  stockAging: StockAgingData;
  kpiStockLevel: KpiStockLevelData;
  nearExpiry: NearExpiryData;
  daysOnHand: DaysOnHandData;
  inventoryTurnover: InventoryTurnoverData;
}

// ---
// Dashboard Component
// ---

const AnalyticsDashboardLayout: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedRegion } = useRegion()

  // NO category chips on this row, deliberately.
  //
  // They were here, and they worked. They came off because this is the ORIENTATION
  // screen: you land, read five headline numbers, and click into whichever one looks
  // wrong. Slicing is what the detail page behind each card is for, and that is where
  // every one of these still has its control. Leaving chips here bought a second way to
  // do the same thing at the cost of five dropdowns competing with the numbers they sit
  // on — and a filtered headline on a landing page is the single easiest number in the
  // product to screenshot out of context and misread as the portfolio total.
  //
  // Same reasoning covers the 12-tile grid below (see inventory/page.tsx): those tiles
  // are navigation, not analysis.

  // The expiry card wants the 0-30d / expired split, which /api/dashboard/all does not
  // carry — it exposes only nearExpiry.{value,skuCount}. Fetched separately rather than
  // widening that payload, because every KPI on the dashboard reads it and it is the
  // response the regression gate pins byte-for-byte.
  const [expiry, setExpiry] = useState<{ expired_value?: number; urgent_value?: number } | null>(null);

  useEffect(() => {
  const regionName = selectedRegion?.name ?? "Chennai"
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${DASHBOARD_API_BASE_URL}/api/dashboard/all?region=${regionName}`
      );
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Failed to load dashboard data';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };
  fetchDashboardData();
  // Secondary and non-blocking: the card renders its headline from the main payload,
  // so if this never lands the split bar simply collapses to one band.
  fetch(`${DASHBOARD_API_BASE_URL}/kpi/near-expiry/insights?Plant=${encodeURIComponent(regionName)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => setExpiry(j?.totals ?? null))
    .catch(() => setExpiry(null));
}, [selectedRegion]);


  if (isLoading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error loading dashboard: {error}</div>;
  if (!dashboardData) return <div>No data available</div>;

  return (
    <div className="space-y-10 p-0">
      <div className="flex flex-wrap lg:flex-nowrap gap-6 items-start w-full px-4">
        <div className="w-full lg:w-[33.33%]">
          <div className="relative w-full max-w-md mx-auto lg:mx-0">
            {/* Ambient lighting - enhanced default state */}
            <div className="absolute -top-6 -bottom-6 -left-6 -right-6 rounded-full animate-pulse opacity-20 hover:opacity-30 transition-opacity duration-1000"
                 style={{
                   background: 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 0%, transparent 70%)',
                   animationDuration: '4s'
                 }}></div>

            {/* Main container */}
            <div className="relative group cursor-default">
              {/* Enhanced magnetic hover effect background with visible default state */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-200/30 to-slate-300/30 
                              group-hover:from-blue-100/40 group-hover:to-blue-200/40
                              rounded-4xl transform scale-95 group-hover:scale-100 
                              transition-all duration-700 ease-out backdrop-blur-sm"></div>

              {/* Content wrapper with subtle default background */}
              <div className="relative p-8 bg-gradient-to-br from-slate-50/50 to-slate-100/30 rounded-4xl
                              group-hover:from-blue-50/60 group-hover:to-blue-50/40 
                              transition-all duration-500 backdrop-blur-sm border border-slate-50/50 
                              group-hover:border-blue-50/20 overflow-hidden">
                
                {/* Radial blue transition overlay */}
                <div className="absolute inset-0 bg-gradient-radial from-blue-100/30 via-blue-50/20 to-transparent 
                                opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out
                                transform scale-0 group-hover:scale-150 rounded-full
                                -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 w-full h-full"></div>
                
                {/* Floating geometric elements */}
                <div className="absolute top-3 right-2 w-10 h-10 opacity-15 group-hover:opacity-25 transition-opacity duration-500 z-10">
                  <div className="w-full h-full border-2 border-slate-400 group-hover:border-blue-300 rounded-full animate-spin"
                       style={{ animationDuration: '20s' }}></div>
                  <div className="absolute inset-2 border border-slate-500 group-hover:border-blue-400 rounded-full animate-spin"
                       style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
                </div>
                <div className="absolute top-3 left-2 w-10 h-10 opacity-15 group-hover:opacity-25 transition-opacity duration-500 z-10">
                  <div className="w-full h-full border-2 border-slate-400 group-hover:border-blue-300 rounded-full animate-spin"
                       style={{ animationDuration: '20s' }}></div>
                  <div className="absolute inset-2 border border-slate-500 group-hover:border-blue-400 rounded-full animate-spin"
                       style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
                </div>

                {/* Main heading structure */}
                <div className="text-center space-y-0 relative z-10">
                  {/* Top section */}
                  <div className="relative">
                    {/* Main title */}
                    <h1 className="text-4xl mt-8 font-semibold text-slate-500 group-hover:text-blue-400 transform group-hover:scale-105 
                                   transition-all duration-500 relative drop-shadow-sm"
                        style={{ letterSpacing: '-0.02em' }}>
                      Inventory KPI's

                      {/* Underline effect */}
                      <div className="absolute -bottom-1 mt-2 left-1/2 transform -translate-x-1/2 w-8 h-0.5 
                                      bg-gradient-to-r from-slate-400 to-slate-500 
                                      group-hover:from-blue-300 group-hover:to-blue-400 
                                      group-hover:w-24 transition-all duration-700"></div>
                    </h1>
                  </div>

                  {/* Separator with animation */}
                  <div className="flex items-center justify-center space-x-3 py-4">
                    <div className="w-6 h-px bg-slate-400 group-hover:bg-blue-400 group-hover:w-12 transition-all duration-500"
                         style={{ transitionDelay: '100ms' }}></div>

                    <div className="relative">
                      <div className="w-2.5 h-2.5 bg-slate-500 group-hover:bg-blue-500 rounded-full transition-colors duration-300 shadow-sm"></div>
                      <div className="absolute inset-0 w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping group-hover:animate-none opacity-0 group-hover:opacity-75"></div>
                    </div>

                    <div className="w-6 h-px bg-slate-400 group-hover:bg-blue-400 group-hover:w-12 transition-all duration-500"
                         style={{ transitionDelay: '200ms' }}></div>
                  </div>

                  {/* Subtitle */}
                  <div className="relative">
                    <h2 className="text-sm mt-5 font-medium text-slate-500 group-hover:text-blue-400 uppercase transition-colors duration-300"
                        style={{ letterSpacing: '0.25em' }}>
                      Supply Chain
                    </h2>

                    {/* Progress indicators */}
                    <div className="flex justify-center mt-3 space-x-1.5">
                      {[...Array(5)].map((_, i) => (
                        <div key={i}
                             className="w-0.5 bg-slate-400 group-hover:bg-blue-500 rounded-full transition-all duration-300 shadow-sm"
                             style={{
                               height: `${(i + 1) * 3}px`,
                               transitionDelay: `${i * 50}ms`
                             }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
       
        <div className="w-full lg:w-[33.33%]">
          <StockLevelCard {...dashboardData.kpiStockLevel} />
        </div>
        <div className="w-full lg:w-[33.33%]">
          <StockAgingCard
            agingData={{
              fresh: dashboardData.stockAging.fresh,
              aging: dashboardData.stockAging.aging,
              problem: dashboardData.stockAging.problem,
              deadStock: dashboardData.stockAging.deadStock,
            }}
            label="Inventory Aging"
            animated={true}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 -mt-3">
        <div>
          <DOHCard {...dashboardData.daysOnHand} />
        </div>
        {/* Expiry Risk replaces Return Rate % in this slot. Return Rate has no source
            data at all — no return or credit-note rows exist — so it rendered a
            hardcoded 0.0 behind a "Data N/A" veil, and that veil collapsed the card to
            zero height, leaving a visible hole in the row. Expiry risk is the one
            number on this screen with a deadline attached, and unlike the four beside
            it, waiting has a guaranteed cost. */}
        <div>
          <NearExpiryCard
            value={Number(dashboardData.nearExpiry?.value ?? 0)}
            skuCount={Number(dashboardData.nearExpiry?.skuCount ?? 0)}
            expiredValue={Number(expiry?.expired_value ?? 0)}
            urgentValue={Number(expiry?.urgent_value ?? 0)}
            totalStockValue={Number(dashboardData.kpiStockLevel?.stockValue ?? 0)}
            location={selectedRegion?.name ?? 'All Plants'}
          />
        </div>
        {/* currentITR is a real, live-computed value (portfolio-weighted sum/sum, not a
            mean-of-ratios — see dashboard_summary.py), so it is never veiled. Showing
            "Data N/A" over a genuine number was itself the bug (client screenshot
            review, 2026-07-25). */}
        <div>
          <ITRCard {...dashboardData.inventoryTurnover} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboardLayout;
