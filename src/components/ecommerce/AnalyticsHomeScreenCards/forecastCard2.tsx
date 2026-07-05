import React, { useState, useEffect } from 'react';
import { useRegion } from '@/context/RegionContext'

export interface StockLevelCardProps {
  region: string;
  forecastData?: any;
  label?: string;
  currency?: string;
  className?: string;
  theme?: Partial<ColorTheme>;
  animated?: boolean;
}
// Add this interface definition after your existing interfaces
interface WeekData {
  Cash_Flow_Prediction: number;
  Demand_Forecast: number;
  Order_Quantity: number;
  Stock: number;
  Stock_Value: number;
}

interface RegionData {
  week_1: WeekData;
  week_2: WeekData;
  week_3: WeekData;
  week_4: WeekData;
}

interface ForecastData {
  [key: string]: RegionData;
}


interface ColorTheme {
  primary: string;
  primaryLight: string;
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  chartBackground: string;
  shadowColor: string;
  gridColor: string;
  success: string;
  warning: string;
  danger: string;
  accent: string;
}

const defaultTheme: ColorTheme = {
  primary: '#1abbedff',
  primaryLight: '#67E8F9',
  background: '#ffffffff',
  cardBackground: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#9CA3AF',
  chartBackground: '#ffffffff',
  shadowColor: 'rgba(156, 163, 175, 0.5)',
  gridColor: '#E5E7EB',
  success: '#48cca0ff',
  warning: '#e0ab4eff',
  danger: '#f28080ff',
  accent: '#b397f5ff'
};

// Embedded forecast data as fallback
const FALLBACK_DATA: ForecastData = {
  "Chennai": {
    "week_1": {
      "Cash_Flow_Prediction": 26410,
      "Demand_Forecast": 451,
      "Order_Quantity": 260,
      "Stock": 191,
      "Stock_Value": 938945
    },
    "week_2": {
      "Cash_Flow_Prediction": 132585,
      "Demand_Forecast": 2429,
      "Order_Quantity": 997,
      "Stock": 1432,
      "Stock_Value": 3217026
    },
    "week_3": {
      "Cash_Flow_Prediction": 435951,
      "Demand_Forecast": 9431,
      "Order_Quantity": 3254,
      "Stock": 6177,
      "Stock_Value": 9872929
    },
    "week_4": {
      "Cash_Flow_Prediction": 1080734,
      "Demand_Forecast": 18982,
      "Order_Quantity": 7335,
      "Stock": 11647,
      "Stock_Value": 23122354
    }
  },
  "Bangalore": {
    "week_1": {
      "Cash_Flow_Prediction": 17182,
      "Demand_Forecast": 1213,
      "Order_Quantity": 510,
      "Stock": 703,
      "Stock_Value": 47539
    },
    "week_2": {
      "Cash_Flow_Prediction": 339276,
      "Demand_Forecast": 18122,
      "Order_Quantity": 6639,
      "Stock": 11483,
      "Stock_Value": 757564
    },
    "week_3": {
      "Cash_Flow_Prediction": 1364308,
      "Demand_Forecast": 44414,
      "Order_Quantity": 19061,
      "Stock": 25353,
      "Stock_Value": 2072974
    },
    "week_4": {
      "Cash_Flow_Prediction": 2557752,
      "Demand_Forecast": 88151,
      "Order_Quantity": 39447,
      "Stock": 48704,
      "Stock_Value": 2584412
    }
  },
  "Vijayawada": {
    "week_1": {
      "Cash_Flow_Prediction": 4797,
      "Demand_Forecast": 1530,
      "Order_Quantity": 583,
      "Stock": 947,
      "Stock_Value": 128200
    },
    "week_2": {
      "Cash_Flow_Prediction": 57119,
      "Demand_Forecast": 4910,
      "Order_Quantity": 2756,
      "Stock": 2154,
      "Stock_Value": 527579
    },
    "week_3": {
      "Cash_Flow_Prediction": 171398,
      "Demand_Forecast": 8831,
      "Order_Quantity": 5560,
      "Stock": 3271,
      "Stock_Value": 1104735
    },
    "week_4": {
      "Cash_Flow_Prediction": 303563,
      "Demand_Forecast": 16908,
      "Order_Quantity": 9361,
      "Stock": 7547,
      "Stock_Value": 1964979
    }
  },
  "Hyderabad East": {
    "week_1": {
      "Cash_Flow_Prediction": 496354,
      "Demand_Forecast": 23466,
      "Order_Quantity": 6257,
      "Stock": 17209,
      "Stock_Value": 27318700
    },
    "week_2": {
      "Cash_Flow_Prediction": 3569426,
      "Demand_Forecast": 208729,
      "Order_Quantity": 63333,
      "Stock": 145396,
      "Stock_Value": 110974072
    },
    "week_3": {
      "Cash_Flow_Prediction": 8315753,
      "Demand_Forecast": 392130,
      "Order_Quantity": 178395,
      "Stock": 213735,
      "Stock_Value": 184170573
    },
    "week_4": {
      "Cash_Flow_Prediction": 12556878,
      "Demand_Forecast": 587055,
      "Order_Quantity": 322633,
      "Stock": 264422,
      "Stock_Value": 205291995
    }
  },
  "Hyderabad West": {
    "week_1": {
      "Cash_Flow_Prediction": 105135,
      "Demand_Forecast": 9880,
      "Order_Quantity": 3932,
      "Stock": 5948,
      "Stock_Value": 4348350
    },
    "week_2": {
      "Cash_Flow_Prediction": 1385030,
      "Demand_Forecast": 57553,
      "Order_Quantity": 21473,
      "Stock": 36080,
      "Stock_Value": 38756939
    },
    "week_3": {
      "Cash_Flow_Prediction": 4322508,
      "Demand_Forecast": 105859,
      "Order_Quantity": 51582,
      "Stock": 54277,
      "Stock_Value": 94462784
    },
    "week_4": {
      "Cash_Flow_Prediction": 6354172,
      "Demand_Forecast": 149465,
      "Order_Quantity": 89895,
      "Stock": 59570,
      "Stock_Value": 102761346
    }
  }
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ForecastStockLevelCard: React.FC<StockLevelCardProps> = ({
  region,
  forecastData,
  label = 'Inventory Planning',
  currency = '₹',
  className = '',
  theme: customTheme = {},
  animated = true
}) => {
  const mergedTheme: ColorTheme = { ...defaultTheme, ...customTheme };
  const [forecastPeriod, setForecastPeriod] = useState<'1w' | '2w' | '3w' | '1m'>('1w');
  const [displayValues, setDisplayValues] = useState({
    replenishmentRequired: 0,
    cumulativeDemand: 0,
    expectedCashFlow: 0,
    currentStock: 0,
    stockValue: 0,
    pendingOrders: 0,
    daysOfStock: 0,
    stockTurnover: 0
  });
  const { selectedRegion } = useRegion()
  const [displayCircularProgress, setDisplayCircularProgress] = useState(0);
  const [animationOpacity, setAnimationOpacity] = useState(animated ? 0 : 1);
  const [isHovered, setIsHovered] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [jsonData, setJsonData] = useState<ForecastData>(FALLBACK_DATA);
  const [isLoading, setIsLoading] = useState(false);

  // Load forecast data - now just uses fallback data
  useEffect(() => {
    if (forecastData) {
      setJsonData(forecastData);
    } else {
      setJsonData(FALLBACK_DATA);
    }
  }, [forecastData]);
  
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  
  // Calculate cumulative demand and replenishment based on period
  const getRegionData = () => {
    if (!jsonData || !region || !jsonData[region]) {
      return null;
    }

    const regionData = jsonData[region];
    
    // Use week_1 data for current stock and pending orders
    const currentStock = regionData.week_1?.Stock || 0;
    const pendingOrders = regionData.week_1?.Order_Quantity || 0;
    const stockValue = regionData.week_1?.Stock_Value || 0;

    let cumulativeDemand = 0;
    let expectedCashFlow = 0;
    let weeks = 1;

    // Calculate cumulative values based on selected period
    switch (forecastPeriod) {
      case '1w':
        weeks = 1;
        cumulativeDemand = regionData.week_1?.Demand_Forecast || 0;
        expectedCashFlow = regionData.week_1?.Cash_Flow_Prediction || 0;
        break;
      case '2w':
        weeks = 2;
        cumulativeDemand = (regionData.week_1?.Demand_Forecast || 0) + 
                          (regionData.week_2?.Demand_Forecast || 0);
        expectedCashFlow = (regionData.week_1?.Cash_Flow_Prediction || 0) + 
                          (regionData.week_2?.Cash_Flow_Prediction || 0);
        break;
      case '3w':
        weeks = 3;
        cumulativeDemand = (regionData.week_1?.Demand_Forecast || 0) + 
                          (regionData.week_2?.Demand_Forecast || 0) + 
                          (regionData.week_3?.Demand_Forecast || 0);
        expectedCashFlow = (regionData.week_1?.Cash_Flow_Prediction || 0) + 
                          (regionData.week_2?.Cash_Flow_Prediction || 0) + 
                          (regionData.week_3?.Cash_Flow_Prediction || 0);
        break;
      case '1m':
        weeks = 4;
        cumulativeDemand = (regionData.week_1?.Demand_Forecast || 0) + 
                          (regionData.week_2?.Demand_Forecast || 0) + 
                          (regionData.week_3?.Demand_Forecast || 0) + 
                          (regionData.week_4?.Demand_Forecast || 0);
        expectedCashFlow = (regionData.week_1?.Cash_Flow_Prediction || 0) + 
                          (regionData.week_2?.Cash_Flow_Prediction || 0) + 
                          (regionData.week_3?.Cash_Flow_Prediction || 0) + 
                          (regionData.week_4?.Cash_Flow_Prediction || 0);
        break;
    }

    // Calculate replenishment required (considering pending orders)
    const availableStock = currentStock;
    const replenishmentRequired = Math.max(0, cumulativeDemand - availableStock);
    console.log("Captured Replenishment : ", replenishmentRequired, availableStock, cumulativeDemand)
    
    // Calculate days of stock coverage
    const dailyDemand = cumulativeDemand / (weeks * 7);
    const daysOfStock = dailyDemand > 0 ? Math.round(availableStock / dailyDemand) : 999;

    // Calculate stock turnover (annual basis approximation)
    const monthlyDemand = (regionData.week_1?.Demand_Forecast || 0) + 
                         (regionData.week_2?.Demand_Forecast || 0) + 
                         (regionData.week_3?.Demand_Forecast || 0) + 
                         (regionData.week_4?.Demand_Forecast || 0);
    const stockTurnover = stockValue > 0 && monthlyDemand > 0 ? 
      ((monthlyDemand * 12) / (stockValue / 1000)) : 0; // Simplified turnover calculation

    return {
      replenishmentRequired,
      cumulativeDemand,
      expectedCashFlow,
      currentStock,
      stockValue,
      pendingOrders,
      daysOfStock,
      stockTurnover: Math.round(stockTurnover * 10) / 10 // Round to 1 decimal
    };
  };

  // Calculate risk level based on replenishment urgency
  const calculateRiskLevel = (replenishment: number, daysOfStock: number) => {
    if (replenishment <= 0 && daysOfStock > 14) {
      return { level: 'Low', color: mergedTheme.success };
    }
    if (replenishment > 0 && daysOfStock > 7) {
      return { level: 'Medium', color: mergedTheme.warning };
    }
    return { level: 'High', color: mergedTheme.danger };
  };

  const currentData = getRegionData();
  const riskAssessment = currentData ? 
    calculateRiskLevel(currentData.replenishmentRequired, currentData.daysOfStock) : 
    { level: 'Low', color: mergedTheme.success };

  // Animation effects
  useEffect(() => {
    if (!currentData) return;

    setIsRefreshing(true);
    
    const targetValues = {
      replenishmentRequired: currentData.replenishmentRequired,
      cumulativeDemand: currentData.cumulativeDemand,
      expectedCashFlow: currentData.expectedCashFlow,
      currentStock: currentData.currentStock,
      stockValue: currentData.stockValue,
      pendingOrders: currentData.pendingOrders,
      daysOfStock: currentData.daysOfStock,
      stockTurnover: currentData.stockTurnover
    };

    // Calculate fulfillment rate for circular progress (100% - replenishment gap)
    const fulfillmentRate = currentData.cumulativeDemand > 0 ? 
      Math.max(0, Math.min(1, (currentData.cumulativeDemand - currentData.replenishmentRequired) / currentData.cumulativeDemand)) : 1;
    
    if (!animated) {
      setDisplayValues(targetValues);
      setDisplayCircularProgress(fulfillmentRate);
      setAnimationOpacity(1);
      setTimeout(() => setIsRefreshing(false), 100);
      return;
    }
    
    const duration = 2400;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const smoothProgress = easeInOutCubic(rawProgress);
      
      setDisplayValues({
        replenishmentRequired: Math.floor(targetValues.replenishmentRequired * smoothProgress),
        cumulativeDemand: Math.floor(targetValues.cumulativeDemand * smoothProgress),
        expectedCashFlow: targetValues.expectedCashFlow * smoothProgress,
        currentStock: Math.floor(targetValues.currentStock * smoothProgress),
        stockValue: targetValues.stockValue * smoothProgress,
        pendingOrders: Math.floor(targetValues.pendingOrders * smoothProgress),
        daysOfStock: Math.floor(targetValues.daysOfStock * smoothProgress),
        stockTurnover: targetValues.stockTurnover * smoothProgress
      });
      
      setDisplayCircularProgress(fulfillmentRate * smoothProgress);
      setAnimationOpacity(Math.min(smoothProgress * 1.5, 1));
      
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsRefreshing(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [forecastPeriod, region, jsonData, animated]);

  // Auto-cycle through periods
  useEffect(() => {
    if (isLoading || !jsonData) return;
    
    const periods: Array<'1w' | '2w' | '3w' | '1m'> = ['1w', '2w', '3w', '1m'];
    let currentIndex = 0;
    
    const cycleTimer = setInterval(() => {
      if (!isHovered) {
        currentIndex = (currentIndex + 1) % periods.length;
        setForecastPeriod(periods[currentIndex]);
      }
    }, 8000);

    return () => clearInterval(cycleTimer);
  }, [isHovered, isLoading, jsonData]);

  // Formatting functions
  const formatNumber = (num: number, compact: boolean = false): string => {
    if (compact) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    }
    return Math.round(num).toLocaleString();
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '1w': return '1 Week';
      case '2w': return '2 Weeks';
      case '3w': return '3 Weeks';
      case '1m': return '1 Month';
      default: return period;
    }
  };

  const riskColor = riskAssessment.color;

  // Loading state
  if (isLoading || !jsonData) {
    return (
      <div className={`w-full max-w-sm rounded-2xl p-6 ${className}`} style={{ background: 'white', border: '1px solid #E5E7EB' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-500 text-sm">Loading {region} data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (!currentData || (!currentData.cumulativeDemand && !currentData.currentStock)) {
    return (
      <div className={`w-full max-w-sm rounded-2xl p-6 ${className}`} style={{ background: 'white', border: '1px solid #E5E7EB' }}>
        <div className="text-center text-red-500">
          <div className="text-sm">No data available for region: {region}</div>
          <div className="text-xs text-gray-400 mt-1">Available regions: {Object.keys(jsonData).join(', ')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-700 ease-out cursor-pointer ${
          isHovered ? 'shadow-lg scale-[1.008]' : 'shadow-sm scale-100'
        } ${className}`}
        style={{ 
          background: 'white', 
          border: `1px solid ${riskColor}20`,
          boxShadow: isHovered ? `0 8px 32px ${riskColor}15` : `0 2px 8px ${riskColor}08`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Elegant refresh effect */}
        {isRefreshing && (
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${riskColor}15 50%, transparent 70%)`,
              animation: 'elegant-sweep 2.4s ease-out'
            }} 
          />
        )}

        {/* Main Content */}
        <div className="flex-1 items-center p-4 sm:p-4 lg:p-4">
          {/* Header with period selector */}
          <div className="mb-0">
            {/* Period selector with improved labels */}
            <div className="flex space-x-1 bg-gray-50 rounded-lg p-1">
              {(['1w', '2w', '3w', '1m'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setForecastPeriod(period)}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-300 ${
                    forecastPeriod === period ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                  }`}
                  style={{
                    color: forecastPeriod === period ? riskColor : '#9CA3AF'
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
            
          {/* Main Display Layout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center">
            {/* Left Section: Main metric display - Replenishment Required */}
            <div className="flex-1 mb-0 sm:mb-0 w-full sm:w-auto">
              {/* Primary value - Replenishment Required */}
              <div className="flex items-baseline space-x-1 transition-all duration-500 mb-2 mt-3">
                <div
                  className="text-2xl sm:text-3xl lg:text-4xl font-black leading-none transition-all duration-500"
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    opacity: animationOpacity,
                    color: riskColor
                  }}
                >
                  {displayValues.replenishmentRequired === 0 ? '0' : formatNumber(displayValues.replenishmentRequired)}
                </div>
                <div 
                  className="text-sm sm:text-base font-medium transition-all duration-500"
                  style={{ 
                    color: riskColor,
                    opacity: animationOpacity * 0.8
                  }}
                >
                  Units
                </div>
              </div>

              <div 
                className="text-xs text-gray-500 mb-3"
                style={{ opacity: animationOpacity }}
              >
                Replenishment Required ({getPeriodLabel(forecastPeriod)})
              </div>
              
              <div 
                className="my-3 border-t transition-all duration-500" 
                style={{ borderColor: riskColor + '20' }}
              ></div>
              
              {/* Six key metrics in 3x2 grid with better names */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center transition-all duration-500">
                  <div 
                    className="font-semibold transition-all duration-500"
                    style={{ color: mergedTheme.primary }}
                  >
                    {formatNumber(displayValues.cumulativeDemand)}
                  </div>
                  <div className="text-gray-400 transition-all duration-300">Expected Demand</div>
                </div>
                <div className="text-center transition-all duration-500">
                  <div 
                    className="font-semibold transition-all duration-500"
                    style={{ color: mergedTheme.success }}
                  >
                    {formatNumber(displayValues.currentStock)}
                  </div>
                  <div className="text-gray-400 transition-all duration-300">Current Stock</div>
                </div>
                 <div className="text-center transition-all duration-500">
                  <div 
                    className="font-semibold transition-all duration-500"
                    style={{ color: mergedTheme.primary }}
                  >
                    {formatCurrency(displayValues.expectedCashFlow)}
                  </div>
                  <div className="text-gray-400 transition-all duration-300">Expected Cash Flow</div>
                </div>
              </div>
            </div>

            {/* Right Section: Circular progress - Fulfillment Rate */}
            <div className="flex flex-col items-center mt-4 justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 ml-0 sm:ml-4 lg:ml-6 self-center sm:self-auto">
              <div className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 transition-transform duration-700 ease-out ${
                isHovered ? 'scale-105' : ''
              }`}>
                <svg className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={riskColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - displayCircularProgress)}`}
                    style={{
                      filter: `drop-shadow(0 2px 12px ${riskColor}25)`,
                      opacity: animationOpacity,
                      transition: 'stroke 0.5s ease-out'
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span 
                    className="text-sm sm:text-base lg:text-lg font-bold transition-all duration-500"
                    style={{ 
                      color: riskColor,
                      opacity: animationOpacity
                    }}
                  >
                    {Math.round(displayCircularProgress * 100)}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center mt-1 sm:mt-2 hidden sm:block transition-opacity duration-500">
                Fulfillment Rate
              </div>
            </div>
          </div>
            
          {/* Status indicator */}
          <div className="flex items-center justify-between mt-3">
            <div
              className={`px-2 py-1 rounded-md flex items-center space-x-2 transition-all duration-500 ${
                isHovered ? 'scale-102' : ''
              }`}
              style={{ 
                backgroundColor: hexToRgba(riskColor, 0.15),
                border: `0px solid ${hexToRgba(riskColor, 0.3)}`,
                transition: 'background-color 0.5s ease-out, border-color 0.5s ease-out'
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-md transition-all duration-500"
                style={{ backgroundColor: riskColor }}
              />
              <span 
                className="text-xs sm:text-xs font-sm transition-all duration-500"
                style={{ color: riskColor }}
              >
                {riskAssessment.level} Priority
              </span>
            </div>
            
            <div className="flex items-center mr-7 space-x-1 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              <span className="truncate max-w-20">{region}</span>
            </div>
          </div>
        </div>

        {/* Dynamic animated bottom progress bar - shows fulfillment readiness */}
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isHovered ? 'h-2.5 shadow-sm' : ''
            }`}
            style={{
              backgroundColor: riskColor,
              width: `${displayCircularProgress * 100}%`,
              opacity: animationOpacity * (isHovered ? 0.85 : 0.7),
              boxShadow: `0 0 12px ${riskColor}30`,
              borderRadius: '0 2px 0 0'
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes elegant-sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
      `}</style>
    </div>
  );
};

export default ForecastStockLevelCard;
