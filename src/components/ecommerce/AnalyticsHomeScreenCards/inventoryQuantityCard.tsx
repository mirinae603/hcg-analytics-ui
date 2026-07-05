import React, { useState, useEffect } from 'react';

export interface StockLevelCardProps {
  currentStock: number;
  stockValue: number;
  lastMonthRevenue: number;
  margin: number;
  unit?: string;
  currency?: string;
  label?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
    period?: string;
    previousValue?: number;
  };
  lowStockThreshold?: number;
  maxStockValue?: number;
  monthlyRevenueTarget?: number;
  maxMargin?: number;
  restockDate?: string;
  supplier?: string;
  location?: string;
  lastUpdated?: string;
  className?: string;
  theme?: Partial<ColorTheme>;
  animated?: boolean;
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

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const StockLevelCard: React.FC<StockLevelCardProps> = ({
  currentStock,
  stockValue,
  lastMonthRevenue,
  margin,
  unit = 'Units',
  currency = '₹',
  label = 'Inventory Overview',
  trend,
  lowStockThreshold = 1000,
  maxStockValue = 200000,
  monthlyRevenueTarget = 100000,
  maxMargin = 30,
  restockDate,
  supplier,
  location,
  lastUpdated,
  className = '',
  theme: customTheme = {},
  animated = true
}) => {
  const mergedTheme: ColorTheme = { ...defaultTheme, ...customTheme };
  const [displayStock, setDisplayStock] = useState(animated ? 0 : currentStock);
  const [displayValue, setDisplayValue] = useState(animated ? 0 : stockValue);
  const [displayRevenue, setDisplayRevenue] = useState(animated ? 0 : lastMonthRevenue);
  const [displayMargin, setDisplayMargin] = useState(animated ? 0 : margin);
  const [displayCircularProgress, setDisplayCircularProgress] = useState(0); // Always start from 0
  const [animationOpacity, setAnimationOpacity] = useState(animated ? 0 : 1);
  const [isHovered, setIsHovered] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'stock' | 'value' | 'revenue' | 'margin'>('stock');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Smooth easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Calculate progress based on active metric
  const calculateProgress = (metric: string) => {
    switch (metric) {
      case 'stock':
        return Math.min(currentStock / lowStockThreshold, 1);
      case 'value':
        return Math.min(stockValue / maxStockValue, 1);
      case 'revenue':
        return Math.min(lastMonthRevenue / monthlyRevenueTarget, 1);
      case 'margin':
        return Math.min(margin / maxMargin, 1);
      default:
        return 0;
    }
  };

  // FIXED: Main animation for initial load and data changes
  useEffect(() => {
    setIsRefreshing(true);
    
    const targetProgress = calculateProgress(activeMetric);
    
    if (!animated) {
      setDisplayStock(currentStock);
      setDisplayValue(stockValue);
      setDisplayRevenue(lastMonthRevenue);
      setDisplayMargin(margin);
      setDisplayCircularProgress(targetProgress);
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
      
      setDisplayStock(Math.floor(currentStock * smoothProgress));
      setDisplayValue(stockValue * smoothProgress);
      setDisplayRevenue(lastMonthRevenue * smoothProgress);
      setDisplayMargin(margin * smoothProgress);
      
      // FIXED: Animate progress from 0 to target
      setDisplayCircularProgress(targetProgress * smoothProgress);
      setAnimationOpacity(Math.min(smoothProgress * 1.5, 1));
      
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsRefreshing(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [currentStock, stockValue, lastMonthRevenue, margin, lowStockThreshold, maxStockValue, monthlyRevenueTarget, maxMargin, animated]);

  // FIXED: Separate animation for metric changes - start from 0 to new target
  useEffect(() => {
    const targetProgress = calculateProgress(activeMetric);
    
    if (!animated) {
      setDisplayCircularProgress(targetProgress);
      return;
    }
    
    // Reset to 0 and animate to new target
    setDisplayCircularProgress(0);
    
    const duration = 1800; // Smooth duration for metric switches
    const startTime = Date.now();
    
    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const smoothProgress = easeInOutCubic(rawProgress);
      
      // FIXED: Always start from 0 and go to target
      setDisplayCircularProgress(targetProgress * smoothProgress);
      
      if (rawProgress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };
    
    // Small delay to see the reset to 0
    setTimeout(() => {
      requestAnimationFrame(animateProgress);
    }, 100);
    
  }, [activeMetric]);

  // Auto-cycle through metrics
  useEffect(() => {
    // const metrics: Array<'stock' | 'value' | 'revenue' | 'margin'> = ['stock', 'value', 'revenue', 'margin'];
    const metrics: Array<'stock' | 'value' | 'revenue' > = ['stock', 'value', 'revenue'];
    let currentIndex = 0;
    
    const cycleTimer = setInterval(() => {
      if (!isHovered) {
        currentIndex = (currentIndex + 1) % metrics.length;
        setActiveMetric(metrics[currentIndex]);
      }
    }, 5000);

    return () => clearInterval(cycleTimer);
  }, [isHovered]);

  // Smart formatting
  const formatNumber = (num: number, compact: boolean = false): string => {
    if (compact) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // Update the formatCurrency function to handle Indian currency format
const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`; // Crores
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`; // Lakhs
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`; // Thousands
  return `₹${Math.round(amount).toLocaleString('en-IN')}`; // Indian number format
};


  // Get current metric display data with proper colors
  const getMetricData = () => {
    switch (activeMetric) {
      case 'stock':
        const stockColor = currentStock >= lowStockThreshold ? mergedTheme.success : 
                          currentStock >= lowStockThreshold * 0.5 ? mergedTheme.warning : 
                          mergedTheme.danger;
        return {
          value: displayStock,
          suffix: unit,
          label: 'Current Stock Quantity',
          color: stockColor,
          format: 'number',
          progressLabel: 'of target'
        };
      case 'value':
        const valueColor = stockValue >= maxStockValue * 0.8 ? mergedTheme.success : 
                          stockValue >= maxStockValue * 0.5 ? mergedTheme.primary : 
                          mergedTheme.warning;
        return {
          value: displayValue,
          suffix: '',
          label: 'Current Stock Value',
          color: valueColor,
          format: 'currency',
          progressLabel: 'of maximum'
        };
      case 'revenue':
        const revenueColor = lastMonthRevenue >= monthlyRevenueTarget ? mergedTheme.success : 
                            lastMonthRevenue >= monthlyRevenueTarget * 0.8 ? mergedTheme.accent : 
                            mergedTheme.warning;
        return {
          value: displayRevenue,
          suffix: '',
          label: 'Last Month Revenue',
          color: revenueColor,
          format: 'currency',
          progressLabel: 'of target'
        };
      // case 'margin':
      //   const marginColor = margin >= 20 ? mergedTheme.success : 
      //                      margin >= 10 ? mergedTheme.warning : 
      //                      mergedTheme.danger;
      //   return {
      //     value: displayMargin,
      //     suffix: '%',
      //     label: 'Last Month Margin',
      //     color: marginColor,
      //     format: 'percentage',
      //     progressLabel: 'efficiency'
      //   };
      default:
        return {
          value: displayStock,
          suffix: unit,
          label: 'Current Stock',
          color: mergedTheme.primary,
          format: 'number',
          progressLabel: 'of target'
        };
    }
  };

  const currentMetric = getMetricData();

  // Format display value
  const formatDisplayValue = () => {
    const { value, format } = currentMetric;
    
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return Math.round(value);
      default:
        return formatNumber(value);
    }
  };

  // Get status based on current metric with proper logic
  const getMetricStatus = () => {
    switch (activeMetric) {
      case 'stock':
        if (currentStock >= lowStockThreshold) {
          return { status: 'healthy', color: mergedTheme.success, text: 'Well Stocked' };
        } else if (currentStock >= lowStockThreshold * 0.5) {
          return { status: 'moderate', color: mergedTheme.warning, text: 'Moderate Stock' };
        } else {
          return { status: 'critical', color: mergedTheme.danger, text: 'Low Stock' };
        }
      
      case 'value':
        if (displayCircularProgress >= 0.8) {
          return { status: 'excellent', color: mergedTheme.success, text: 'High Value' };
        } else if (displayCircularProgress >= 0.5) {
          return { status: 'good', color: mergedTheme.primary, text: 'Good Value' };
        } else {
          return { status: 'low', color: mergedTheme.warning, text: 'Low Value' };
        }
      
      case 'revenue':
        if (lastMonthRevenue >= monthlyRevenueTarget) {
          return { status: 'excellent', color: mergedTheme.success, text: 'Target Met' };
        } else if (lastMonthRevenue >= monthlyRevenueTarget * 0.8) {
          return { status: 'good', color: mergedTheme.accent, text: 'On Track' };
        } else {
          return { status: 'behind', color: mergedTheme.warning, text: 'Below Target' };
        }
      
      // case 'margin':
      //   if (margin >= 20) {
      //     return { status: 'excellent', color: mergedTheme.success, text: 'Excellent Margin' };
      //   } else if (margin >= 10) {
      //     return { status: 'good', color: mergedTheme.warning, text: 'Good Margin' };
      //   } else {
      //     return { status: 'low', color: mergedTheme.danger, text: 'Low Margin' };
      //   }
      
      default:
        return { status: 'unknown', color: mergedTheme.textSecondary, text: 'Unknown' };
    }
  };

  const metricStatus = getMetricStatus();

  // FIXED: Contextual quick stats based on selected metric
  const getQuickStats = () => {
    switch (activeMetric) {
      case 'stock':
        return [
  { 
    value: (() => {
      if (!lowStockThreshold || lowStockThreshold === 0) return 'No Data';
      
      const percentChange = ((currentStock - lowStockThreshold) / lowStockThreshold) * 100;
      const sign = percentChange > 0 ? '↑ +' : percentChange < 0 ? '↓ ' : '';
      
      return `${sign}${Math.abs(percentChange).toFixed(2)}%`;
    })(),
    label: 'vs Last FY',
    color: currentStock >= lowStockThreshold ? mergedTheme.success : mergedTheme.danger
  },
  { 
    value: formatNumber(lowStockThreshold, true), 
    label: 'Last FY', 
    color: '#9CA3AF' 
  },
  { 
    value: currentStock > lowStockThreshold 
           ? `+${formatNumber(currentStock - lowStockThreshold, true)}` 
           : `-${formatNumber(lowStockThreshold - currentStock, true)}`, 
    label: 'vs Last FY', 
    color: currentStock >= lowStockThreshold ? mergedTheme.success : mergedTheme.danger 
  }
]

;
      
      case 'value':
        return [
  { 
    value: (() => {
      if (!maxStockValue || maxStockValue === 0) return 'No Data';
      
      const percentChange = ((stockValue - maxStockValue) / maxStockValue) * 100;
      const sign = percentChange > 0 ? '↑ +' : percentChange < 0 ? '↓ ' : '';
      
      return `${sign}${Math.abs(percentChange).toFixed(2)}%`;
    })(),
    label: 'vs Last FY',
    color: stockValue >= maxStockValue ? mergedTheme.success : mergedTheme.danger
  },
  { 
    value: formatCurrency(maxStockValue), 
    label: 'Last FY', 
    color: '#9CA3AF' 
  },
  { 
    value: stockValue > maxStockValue 
           ? `+${formatCurrency(stockValue - maxStockValue)}` 
           : `-${formatCurrency(maxStockValue - stockValue)}`, 
    label: 'vs Last FY', 
    color: stockValue >= maxStockValue ? mergedTheme.success : mergedTheme.danger 
  }
]
;
      
      case 'revenue':
        return [
  { 
    value: (() => {
      if (!monthlyRevenueTarget || monthlyRevenueTarget === 0) return 'No Data';

      const percentChange = ((displayRevenue - monthlyRevenueTarget) / monthlyRevenueTarget) * 100;
      const sign = percentChange > 0 ? '↑ +' : percentChange < 0 ? '↓ ' : '';

      return `${sign}${Math.abs(percentChange).toFixed(2)}%`;
    })(),
    label: 'vs last FY',
    color: displayRevenue >= monthlyRevenueTarget ? mergedTheme.success : mergedTheme.warning
  },
  { 
    value: formatCurrency(monthlyRevenueTarget),
    label: 'last FY',
    color: '#9CA3AF'
  },
  { 
    value: displayRevenue >= monthlyRevenueTarget
           ? `+${formatCurrency(displayRevenue - monthlyRevenueTarget)}`
           : `-${formatCurrency(monthlyRevenueTarget - displayRevenue)}`,
    label: 'vs last FY',
    color: displayRevenue >= monthlyRevenueTarget ? mergedTheme.success : mergedTheme.warning
  }
]
;
      
      // case 'margin':
      //   return [
      //     { 
      //       value: Math.round(displayMargin) + '%', 
      //       label: 'Current', 
      //       color: currentMetric.color 
      //     },
      //     { 
      //       value: maxMargin + '%', 
      //       label: 'Best Case', 
      //       color: '#9CA3AF' 
      //     },
      //     { 
      //       value: Math.round((margin / maxMargin) * 100) + '%', 
      //       label: 'Efficiency', 
      //       color: margin >= maxMargin * 0.7 ? mergedTheme.success : mergedTheme.warning 
      //     }
      //   ];
      
      default:
        return [
          { value: formatNumber(displayStock, true), label: 'Stock', color: '#6B7280' },
          { value: formatCurrency(displayValue), label: 'Value', color: '#6B7280' },
          { value: Math.round(displayMargin) + '%', label: 'Margin', color: '#6B7280' }
        ];
    }
  };

  const quickStats = getQuickStats();

  return (
    <div className="relative">
      <div
        className={`relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-700 ease-out cursor-pointer ${
          isHovered ? 'shadow-lg scale-[1.008]' : 'shadow-sm scale-100'
        } ${className}`}
        style={{ 
          background: 'white', 
          border: `1px solid ${currentMetric.color}20`,
          boxShadow: isHovered ? `0 8px 32px ${currentMetric.color}15` : `0 2px 8px ${currentMetric.color}08`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Elegant refresh effect */}
        {isRefreshing && (
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${currentMetric.color}15 50%, transparent 70%)`,
              animation: 'elegant-sweep 2.4s ease-out'
            }} 
          />
        )}

        {/* Main Content */}
        <div className="flex-1 items-center p-3 sm:p-4 lg:p-6">
          {/* Header with metric tabs */}
          <div className="mb-0">
            {/* Smart metric selector with proper colors */}
            <div className="flex space-x-1 bg-gray-50 rounded-lg p-1">
              {/* {(['stock', 'value', 'revenue', 'margin'] as const).map((metric) => { */}
              {(['stock', 'value', 'revenue'] as const).map((metric) => {

                // Get color for each metric based on their performance
                const getMetricColor = (metricType: string) => {
                  switch (metricType) {
                    case 'stock':
                      return currentStock >= lowStockThreshold ? mergedTheme.success : 
                             currentStock >= lowStockThreshold * 0.5 ? mergedTheme.warning : 
                             mergedTheme.danger;
                    case 'value':
                      return stockValue >= maxStockValue * 0.8 ? mergedTheme.success : mergedTheme.primary;
                    case 'revenue':
                      return lastMonthRevenue >= monthlyRevenueTarget ? mergedTheme.success : mergedTheme.accent;
                    case 'margin':
                      return margin >= 20 ? mergedTheme.success : 
                             margin >= 10 ? mergedTheme.warning : 
                             mergedTheme.danger;
                    default:
                      return mergedTheme.primary;
                  }
                };
                
                return (
                  <button
                    key={metric}
                    onClick={() => setActiveMetric(metric)}
                    className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-300 ${
                      activeMetric === metric ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                    }`}
                    style={{
                      color: activeMetric === metric ? getMetricColor(metric) : '#9CA3AF'
                    }}
                  >
                    {metric === 'stock' ? 'Stock' : 
                    //  metric === 'value' ? 'Value' : 
                    metric === 'value' ? 'Value' : 'Revenue'}
                    {/* //  metric === 'revenue' ? 'Revenue' : 'Margin'} */}
                  </button>
                );
              })}
            </div>
          </div>
            
          {/* Main Display Layout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center">
            {/* Left Section: Current metric display */}
            <div className="flex-1 mb-0 sm:mb-0 w-full sm:w-auto">
            <div 
  className="text-sm mb-1 transition-all duration-500 font-medium"
  style={{ 
    color: currentMetric.color,
    opacity: 0.8,
    transition: 'color 0.5s ease-out, opacity 0.3s ease-out'
  }}
>
  {currentMetric.label}
</div>


              {/* Dynamic number display */}
<div className="flex items-baseline space-x-1 transition-all duration-500">
  <div
    className="text-2xl sm:text-3xl lg:text-4xl font-black leading-none transition-all duration-500"
    style={{
      fontFamily: "'Poppins', sans-serif",
      opacity: animationOpacity,
      color: currentMetric.color
    }}
  >
    {formatDisplayValue()}
  </div>
  {currentMetric.suffix && (
    <div 
      className="text-sm sm:text-base font-medium transition-all duration-500"
      style={{ 
        color: currentMetric.color, // Changed from currentMetric.color + '70' to currentMetric.color
        opacity: animationOpacity * 0.8 // Use opacity instead of color transparency
      }}
    >
      {currentMetric.suffix}
    </div>
  )}
</div>

              
              <div 
                className="my-3 border-t transition-all duration-500" 
                style={{ borderColor: currentMetric.color + '20' }}
              ></div>
              
              {/* CONTEXTUAL quick stats that change based on metric */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {quickStats.map((stat, index) => (
                  <div key={`${activeMetric}-stat-${index}`} className="text-center transition-all duration-500">
                    <div 
                      className="font-semibold transition-all duration-500"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-gray-400 transition-all duration-300">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Section: Dynamic circular progress */}
            <div className="flex flex-col items-center mt-2 justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 ml-0 sm:ml-4 lg:ml-6 self-center sm:self-auto">
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
                    stroke={currentMetric.color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - displayCircularProgress)}`}
                    style={{
                      filter: `drop-shadow(0 2px 12px ${currentMetric.color}25)`,
                      opacity: animationOpacity,
                      transition: 'stroke 0.5s ease-out'  // Remove stroke-dashoffset transition for smooth animation
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span 
                    className="text-sm sm:text-base lg:text-lg font-bold transition-all duration-500"
                    style={{ 
                      color: currentMetric.color,
                      opacity: animationOpacity
                    }}
                  >
                    {Math.round(displayCircularProgress * 100)}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center mt-1 sm:mt-2 hidden sm:block transition-opacity duration-500">
                {currentMetric.progressLabel}
              </div>
            </div>
          </div>
            
          {/* FIXED: Status indicator with contextual colors and text */}
          <div className="flex items-center justify-between mt-1">
            <div
              className={`px-2 py-1 rounded-md flex items-center space-x-2 transition-all duration-500 ${
                isHovered ? 'scale-102' : ''
              }`}
              style={{ 
  backgroundColor: hexToRgba(metricStatus.color, 0.15),
  border: `0px solid ${hexToRgba(metricStatus.color, 0.3)}`,
  transition: 'background-color 0.5s ease-out, border-color 0.5s ease-out'
}}
            >
              <div
                className="w-2.5 h-2.5 rounded-md transition-all duration-500"
                style={{ backgroundColor: metricStatus.color }}
              />
              <span 
                className="text-xs sm:text-xs font-sm transition-all duration-500"
                style={{ color: metricStatus.color }}
              >
                {metricStatus.text}
              </span>
            </div>
            
            {/* Location if provided */}
            {location && (
              <div className="flex items-center mr-7 space-x-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
                <span className="truncate max-w-20">{location}</span>
              </div>
            )}
          </div>
        </div>

        {/* FIXED: Dynamic animated bottom progress bar using displayCircularProgress */}
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isHovered ? 'h-2.5 shadow-sm' : ''
            }`}
            style={{
              backgroundColor: currentMetric.color,
              width: `${displayCircularProgress * 100}%`,  // FIXED: Use displayCircularProgress instead of currentMetric.progress
              opacity: animationOpacity * (isHovered ? 0.85 : 0.7),
              boxShadow: `0 0 12px ${currentMetric.color}30`,
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

export default StockLevelCard;
