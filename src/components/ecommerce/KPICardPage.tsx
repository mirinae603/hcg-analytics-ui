// StockKPICards.tsx
"use client";
import React, { useState, useEffect } from 'react';
import ActivityStats from './cards_collection/line_plot_card_blue';
import StockLevelCard from "@/components/ecommerce/cards_collection/stocklevelcard";
import DOHCard from "@/components/ecommerce/cards_collection/daysonhand2";

// Types for data structure
interface TrendData {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  period: string;
  previousValue?: number;
}

interface StockLevelData {
  currentStock: number;
  unit: string;
  label: string;
  lowStockThreshold: number;
  trend: TrendData;
}

interface DOHData {
  daysOnHand: number;
  trend: TrendData;
  criticalThreshold: number;
  optimalRange: { min: number; max: number };
  category: string;
  location: string;
  lastCalculated: string;
  animated: boolean;
}

interface ActivityData {
  day: string;
  value: number;
}

interface StockKPIData {
  stockLevel: StockLevelData;
  daysOnHand: DOHData;
  activityStats: ActivityData[];
}

// Default data structure (to be replaced with CSV data)
const defaultData: StockKPIData = {
  stockLevel: {
    currentStock: 648001,
    unit: "Units",
    label: "Current Stock Level",
    lowStockThreshold: 1000,
    trend: {
      direction: 'up',
      percentage: 12.5,
      period: 'last Week'
    }
  },
  daysOnHand: {
    daysOnHand: 50,
    trend: {
      direction: 'down',
      percentage: 12,
      period: 'vs last month',
      previousValue: 52
    },
    criticalThreshold: 7,
    optimalRange: { min: 30, max: 60 },
    category: "Raw Materials",
    location: "Warehouse A",
    lastCalculated: "2 hours ago",
    animated: true
  },
  activityStats: [
    { day: 'Sept', value: 25 },
    { day: 'Oct', value: 35 },
    { day: 'Nov', value: 20 },
    { day: 'Dec', value: 50 },
    { day: 'Jan', value: 30 },
    { day: 'Feb', value: 15 },
    { day: 'Mar', value: 45 }
  ]
};

interface StockKPICardsProps {
  data?: StockKPIData;
  isLoading?: boolean;
}

const StockKPICards: React.FC<StockKPICardsProps> = ({ 
  data = defaultData, 
  isLoading: externalLoading = false 
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!externalLoading) {
      const timer = setTimeout(() => setIsLoading(false), 1200);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(externalLoading);
    }
  }, [externalLoading]);

  return (
    <div className="space-y-6 p-0">
      {/* Main KPI Row */}
      <div className="flex gap-4 w-full">
        {/* Stock Level Card - 30% width */}
        <div className="w-[30%]">
          <StockLevelCard
            currentStock={data.stockLevel.currentStock}
            unit={data.stockLevel.unit}
            label={data.stockLevel.label}
            lowStockThreshold={data.stockLevel.lowStockThreshold}
            trend={data.stockLevel.trend}
          />
        </div>

        {/* Activity Stats Card - 40% width */}
        <div className="w-[40%]">
          <ActivityStats data={data.activityStats} />
        </div>

        {/* Days on Hand Card - 30% width */}
        <div className="w-[30%]">
          <DOHCard 
            daysOnHand={data.daysOnHand.daysOnHand}
            trend={data.daysOnHand.trend}
            criticalThreshold={data.daysOnHand.criticalThreshold}
            optimalRange={data.daysOnHand.optimalRange}
            category={data.daysOnHand.category}
            location={data.daysOnHand.location}
            lastCalculated={data.daysOnHand.lastCalculated}
            animated={data.daysOnHand.animated}
          />
        </div>
      </div>

      {/* Secondary metrics row can be added here */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Additional cards can be added here */}
      </div>
    </div>
  );
};

export default StockKPICards;
