"use client";
import React, { useState, useEffect } from 'react';
import ActivityStats from './cards_collection/line_plot_card_blue';
import StockLevelCard from "@/components/ecommerce/cards_collection/stocklevelcard";
import DOHCard from "@/components/ecommerce/cards_collection/daysonhand2";
import { useRegion } from '@/context/RegionContext'

// Region-based stock data mapping
const stockDataByRegion = {
  "Bangalore": {
    currentStock: 648021,
    lowStockThreshold: 507356
  },
  "Chennai": {
    currentStock: 134105,
    lowStockThreshold: 1134879
  },
  "Hyderabad East": {
    currentStock: 496854,
    lowStockThreshold: 3490083
  },
  "Hyderabad West": {
    currentStock: 169253,
    lowStockThreshold: 1485345
  },
  "Vijayawada": {
    currentStock: 1509487,
    lowStockThreshold: 1159214
  }
};

// Region-based DIH (Days In Hand) data
const dihDataByRegion = {
  "Bangalore": {
    currentDIH: 73,
    lastMonthDIH: 103,
    location: "Bangalore"
  },
  "Chennai": {
    currentDIH: 71,
    lastMonthDIH: 86,
    location: "Chennai"
  },
  "Hyderabad East": {
    currentDIH: 42,
    lastMonthDIH: 108,
    location: "Hyderabad East"
  },
  "Hyderabad West": {
    currentDIH: 19,
    lastMonthDIH: 72,
    location: "Hyderabad West"
  },
  "Vijayawada": {
    currentDIH: 166,
    lastMonthDIH: 179,
    location: "Vijayawada"
  }
};

// Region-based Activity Stats data
const activityDataByRegion = {
  "Bangalore": [
    { day: 'Sept', value: 61 },
    { day: 'Oct', value: 70 },
    { day: 'Nov', value: 110 },
    { day: 'Dec', value: 86 },
    { day: 'Jan', value: 77 },
    { day: 'Feb', value: 95 },
    { day: 'Mar', value: 131 }
  ],
  "Chennai": [
    { day: 'Sept', value: 726 },
    { day: 'Oct', value: 81 },
    { day: 'Nov', value: 90 },
    { day: 'Dec', value: 76 },
    { day: 'Jan', value: 85 },
    { day: 'Feb', value: 89 },
    { day: 'Mar', value: 74 }
  ],
  "Hyderabad East": [
    { day: 'Sept', value: 32 },
    { day: 'Oct', value: 30 },
    { day: 'Nov', value: 30 },
    { day: 'Dec', value: 31 },
    { day: 'Jan', value: 26 },
    { day: 'Feb', value: 19 },
    { day: 'Mar', value: 38 }
  ],
  "Hyderabad West": [
    { day: 'Sept', value: 42 },
    { day: 'Oct', value: 54 },
    { day: 'Nov', value: 38 },
    { day: 'Dec', value: 41 },
    { day: 'Jan', value: 20 },
    { day: 'Feb', value: 26 },
    { day: 'Mar', value: 62 }
  ],
  "Vijayawada": [
    { day: 'Sept', value: 1040 },
    { day: 'Oct', value: 30 },
    { day: 'Nov', value: 41 },
    { day: 'Dec', value: 36 },
    { day: 'Jan', value: 29 },
    { day: 'Feb', value: 22 },
    { day: 'Mar', value: 39 }
  ]
};

// TypeScript interfaces for data structure
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

// Default hardcoded data (easily replaceable with CSV data)
const defaultKPIData: StockKPIData = {
  stockLevel: {
    currentStock: 648021,
    unit: "Units",
    label: "Current Stock Level",
    lowStockThreshold: 507356,
    trend: {
      direction: 'up',
      percentage: 18.5,
      period: 'last Month'
    }
  },
  daysOnHand: {
    daysOnHand: 73,
    trend: {
      direction: 'down',
      percentage: 29.1,
      period: 'vs last month',
      previousValue: 103
    },
    criticalThreshold: 7,
    optimalRange: { min: 45, max: 90 },
    category: "Summary",
    location: "Bangalore",
    lastCalculated: "Based on 30 Days of Stock Movements",
    animated: true
  },
  activityStats: [
    { day: 'Sept', value: 61 },
    { day: 'Oct', value: 70 },
    { day: 'Nov', value: 110 },
    { day: 'Dec', value: 86 },
    { day: 'Jan', value: 77 },
    { day: 'Feb', value: 95 },
    { day: 'Mar', value: 131 }
  ]
};

interface StockKPICardsProps {
  data?: StockKPIData;
  isLoading?: boolean;
}

const StockKPICards: React.FC<StockKPICardsProps> = ({ 
  data = defaultKPIData, 
  isLoading: externalLoading = false 
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentKPIData, setCurrentKPIData] = useState<StockKPIData>(defaultKPIData);
  const { selectedRegion } = useRegion();

  // Update KPI data when region changes
  useEffect(() => {
    const regionName = selectedRegion?.name ?? "Chennai";
    const regionStockData = stockDataByRegion[regionName as keyof typeof stockDataByRegion] || stockDataByRegion["Chennai"];
    const regionDIHData = dihDataByRegion[regionName as keyof typeof dihDataByRegion] || dihDataByRegion["Chennai"];
    const regionActivityData = activityDataByRegion[regionName as keyof typeof activityDataByRegion] || activityDataByRegion["Chennai"];
    
    // Calculate trend direction and percentage for stock level
    const stockTrend = regionStockData.currentStock > regionStockData.lowStockThreshold ? 'up' : 'down';
    const stockPercentage = Math.abs(((regionStockData.currentStock - regionStockData.lowStockThreshold) / regionStockData.lowStockThreshold) * 100);

    // Calculate DIH trend direction and percentage
    const dihTrend = regionDIHData.currentDIH > regionDIHData.lastMonthDIH ? 'up' : 'down';
    const dihPercentage = Math.abs(((regionDIHData.currentDIH - regionDIHData.lastMonthDIH) / regionDIHData.lastMonthDIH) * 100);

    const updatedKPIData: StockKPIData = {
      ...data,
      stockLevel: {
        ...data.stockLevel,
        currentStock: regionStockData.currentStock,
        lowStockThreshold: regionStockData.lowStockThreshold,
        trend: {
          ...data.stockLevel.trend,
          direction: stockTrend,
          percentage: parseFloat(stockPercentage.toFixed(1))
        }
      },
      daysOnHand: {
        ...data.daysOnHand,
        daysOnHand: regionDIHData.currentDIH,
        location: regionDIHData.location,
        trend: {
          ...data.daysOnHand.trend,
          direction: dihTrend,
          percentage: parseFloat(dihPercentage.toFixed(1)),
          previousValue: regionDIHData.lastMonthDIH
        }
      },
      activityStats: regionActivityData
    };

    setCurrentKPIData(updatedKPIData);
  }, [selectedRegion, data]);

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
      {/* Main KPI Dashboard Row */}
      <div className="flex gap-4 w-full">
        {/* Stock Level Card - 30% */}
        <div className="w-[30%]">
          <StockLevelCard
            currentStock={currentKPIData.stockLevel.currentStock}
            unit={currentKPIData.stockLevel.unit}
            label={currentKPIData.stockLevel.label}
            lowStockThreshold={currentKPIData.stockLevel.lowStockThreshold}
            trend={currentKPIData.stockLevel.trend}
          />
        </div>

        {/* Activity Statistics Card - 40% */}
        <div className="w-[40%]">
          <ActivityStats data={currentKPIData.activityStats} />
        </div>

        {/* Days on Hand Card - 30% */}
        <div className="w-[30%]">
          <DOHCard 
            daysOnHand={currentKPIData.daysOnHand.daysOnHand}
            trend={currentKPIData.daysOnHand.trend}
            criticalThreshold={currentKPIData.daysOnHand.criticalThreshold}
            optimalRange={currentKPIData.daysOnHand.optimalRange}
            category={currentKPIData.daysOnHand.category}
            location={currentKPIData.daysOnHand.location}
            lastCalculated={currentKPIData.daysOnHand.lastCalculated}
            animated={currentKPIData.daysOnHand.animated}
          />
        </div>
      </div>

      {/* Secondary Metrics Row - Ready for additional cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Additional KPI cards can be added here */}
      </div>
    </div>
  );
};

export default StockKPICards;
