import React, { useState, useEffect } from 'react';
import { useRegion } from '@/context/RegionContext'

interface StockLevelCardProps {
  currentStock: number;
  unit?: string;
  label?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
    period?: string;
    previousValue?: number;
  };
  lowStockThreshold?: number;
  restockDate?: string;
  supplier?: string;
  location?: string;
  lastUpdated?: string;
  className?: string;
  theme?: Partial<ColorTheme>;
  animated?: boolean;
  useHardcodedData?: boolean; // Add this line
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
  warning: '#F59E0B',
  danger: '#f28080ff',
  accent: '#8B5CF6'
};

const hardcodedData = {
  'Bangalore': {'2024-2025': 540, '2023-2024': 4577},
  'Chennai': {'2024-2025': 1176, '2023-2024': 2977},
  'Hyderabad East': {'2024-2025': 380, '2023-2024': 1912},
  'Hyderabad West': {'2024-2025': 508, '2023-2024': 2278},
  'Vijayawada': {'2024-2025': 1726, '2023-2024': 3989}
};


const StockLevelCard: React.FC<StockLevelCardProps> = ({
  currentStock,
  unit = 'Units',
  label = 'Current Stock Level',
  trend,
  lowStockThreshold = 1000,
  restockDate,
  supplier,
  location,
  lastUpdated,
  className = '',
  theme: customTheme = {},
  animated = true,
  useHardcodedData = true // Add this line
}) => {
  const { selectedRegion } = useRegion()
  const regionName = selectedRegion?.name ?? "Chennai"
  const mergedTheme: ColorTheme = { ...defaultTheme, ...customTheme };
  const getDisplayData = () => {
  const locationData = hardcodedData[regionName as keyof typeof hardcodedData]
    || Object.values(hardcodedData)[0];
    return {
      currentStock: locationData['2024-2025'],
      previousStock: locationData['2023-2024']
    };
};

const displayData = getDisplayData();
console.log("Status Check HardCode Use : ", useHardcodedData, displayData.currentStock, displayData.previousStock);
const effectiveCurrentStock = displayData.currentStock;
const effectivePreviousStock = displayData.previousStock;
  const [displayStock, setDisplayStock] = useState(animated ? 0 : currentStock);
  const [displayCircularProgress, setDisplayCircularProgress] = useState(animated ? 0 : Math.min(currentStock / effectivePreviousStock , 1));
  const [displayBottomProgress, setDisplayBottomProgress] = useState(animated ? 0 : Math.min(currentStock / (effectivePreviousStock  * 1.5), 1));
  const [animationOpacity, setAnimationOpacity] = useState(animated ? 0 : 1);
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Smooth, elegant easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Ultra-smooth animations for all progress elements
  useEffect(() => {
    setIsRefreshing(true);
    
    const targetCircularProgress = Math.min(effectiveCurrentStock / (effectivePreviousStock  ), 1);
    const targetBottomProgress = Math.min(effectiveCurrentStock / (effectivePreviousStock  ), 1);
    
    if (!animated) {
      setDisplayStock(effectiveCurrentStock);
      setDisplayCircularProgress(targetCircularProgress);
      setDisplayBottomProgress(targetBottomProgress);
      setAnimationOpacity(1);
      setTimeout(() => setIsRefreshing(false), 100);
      return;
    }
    
    const duration = 2400; // Longer for smoother animation
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const smoothProgress = easeInOutCubic(rawProgress);
      
      // Animate all elements with ultra-smooth easing
      setDisplayStock(Math.floor(effectiveCurrentStock * smoothProgress));
      setDisplayCircularProgress(targetCircularProgress * smoothProgress);
      setDisplayBottomProgress(targetBottomProgress * smoothProgress);
      
      // Fade in opacity gradually
      setAnimationOpacity(Math.min(smoothProgress * 1.5, 1));
      
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsRefreshing(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [effectiveCurrentStock, effectivePreviousStock , animated]);

  // Auto-hide tooltip
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // Refined stock status
  const getStockStatus = () => {
    const ratio = effectiveCurrentStock / effectivePreviousStock ;
    
    if (ratio <= 0.15) {
      return { 
        status: 'critical', 
        color: mergedTheme.danger, 
        text: 'Critical', 
        bgGradient: `linear-gradient(135deg, ${mergedTheme.danger}08, ${mergedTheme.danger}03)`
      };
    } else if (ratio <= 0.4) {
      return { 
        status: 'low', 
        color: mergedTheme.warning, 
        text: 'Low Stock', 
        bgGradient: `linear-gradient(135deg, ${mergedTheme.warning}08, ${mergedTheme.warning}03)`
      };
    } else if (ratio <= 0.8) {
      return { 
        status: 'moderate', 
        color: '#3B82F6', 
        text: 'Moderate', 
        bgGradient: `linear-gradient(135deg, #3B82F608, #3B82F603)`
      };
    } else {
      return { 
        status: 'healthy', 
        color: mergedTheme.success, 
        text: 'Healthy', 
        bgGradient: `linear-gradient(135deg, ${mergedTheme.success}08, ${mergedTheme.success}03)`
      };
    }
  };

  const stockStatus = getStockStatus();

  // Smart formatting
  const formatNumber = (num: number, compact: boolean = false): string => {
    if (compact) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // Subtle trend analysis
  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconClass = "w-3 h-3 sm:w-4 sm:h-4 transition-all duration-500 ease-out";
    const color = trend.direction === 'up' ? mergedTheme.success : 
                  trend.direction === 'down' ? mergedTheme.danger : 
                  mergedTheme.textSecondary;
    
    return (
      <svg className={`${iconClass} ${isHovered ? 'scale-105' : ''}`} viewBox="0 0 24 24" fill="none">
        {trend.direction === 'up' && (
          <path d="M7 14l5-5 5 5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        )}
        {trend.direction === 'down' && (
          <path d="M7 10l5 5 5-5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        )}
        {trend.direction === 'stable' && (
          <path d="M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        )}
      </svg>
    );
  };

  const getTrendColor = () => {
    if (!trend) return mergedTheme.textSecondary;
    return trend.direction === 'up' ? mergedTheme.success : 
           trend.direction === 'down' ? mergedTheme.danger : 
           mergedTheme.textSecondary;
  };

  // Restock calculation
  const getDaysUntilRestock = () => {
    if (!restockDate) return null;
    const today = new Date();
    const restock = new Date(restockDate);
    const diffTime = restock.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilRestock = getDaysUntilRestock();

  // Tooltip content
  const getTooltipContent = () => {
    const percentage = Math.round((effectiveCurrentStock / effectivePreviousStock ) * 100);
    const remaining = effectiveCurrentStock - effectivePreviousStock ;
    
    return (
      <div className="text-xs space-y-1">
        <div className="font-semibold">{formatNumber(effectiveCurrentStock)} {unit} in stock</div>
        <div className="text-gray-300">
          {remaining >= 0 
            ? `${formatNumber(remaining)} above forecast` 
            : `${formatNumber(Math.abs(remaining))} below forecast`}
        </div>
        {trend?.previousValue && (
          <div className="text-gray-300">
            Previous: {formatNumber(trend.previousValue)} {unit}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <div
        className={`relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-700 ease-out cursor-pointer ${
          isHovered ? 'shadow-xl scale-[1.008]' : 'shadow-lg scale-100'
        } ${className}`}
        style={{
          background: `white`,
          border: `0px solid ${stockStatus.color}15`
        }}
        onMouseEnter={() => {
          setIsHovered(true);
          setShowTooltip(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowTooltip(false);
        }}
      >
        {/* Elegant refresh effect */}
        {isRefreshing && (
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${stockStatus.color}15 50%, transparent 70%)`,
              animation: 'elegant-sweep 2.4s ease-out'
            }} 
          />
        )}

        {/* Main Content */}
        <div className="flex-1 items-center p-3 sm:p-4 lg:p-6">
          {/* Header */}
          <div className="mb-0 sm:mb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
              {/* Elegant label */}
              <h3
                className={`text-xs sm:text-sm lg:text-md font-bold text-gray-400 leading-tight transition-colors duration-500 ${
                  isHovered ? 'text-gray-500' : ''
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {/* {label} */}
                Zero Stock SKU's
              </h3>

              {/* Subtle trend */}
              {trend && (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className={`flex items-center space-x-1 transition-all duration-500`}>
                    {getTrendIcon()}
                    <span
                      className="text-xs sm:text-sm font-semibold transition-colors duration-500"
                      style={{ color: getTrendColor() }}
                    >
                      {trend.percentage !== undefined &&
                        `${trend.direction === 'down' ? '-' : trend.direction === 'up' ? '+' : ''}${Math.abs(trend.percentage)}%`
                      }
                    </span>
                  </div>
                  {trend.period && (
                    <span className="text-xs text-gray-500 hidden sm:inline transition-opacity duration-500">
                      {trend.period}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {location && (
              <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500 mt-1 transition-all duration-500">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
            
          {/* Stock Display Layout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center">
            {/* Left Section: Smooth number animation */}
            <div className="flex-1 mb-3 sm:mb-4 w-full sm:w-auto">
  {/* Label (optional, currently empty) */}
  <div className="text-sm text-gray-500 mb-1"></div>

  {/* Number and Units Inline */}
  <div className="flex items-baseline space-x-1 transition-all duration-500">
    <div
      className="text-2xl sm:text-3xl mt-4 lg:text-4xl font-black text-gray-600 leading-none"
      style={{
        fontFamily: "'Poppins', sans-serif",
        opacity: animationOpacity,
        color:stockStatus.color
      }}
    >
      {formatNumber(displayStock)}
    </div>
    <div className="text-sm sm:text-base text-gray-400 font-medium">
      SKU's
    </div>
  </div>
      <div className="my-3 border-t border-gray-200"></div>
  {/* Threshold */}
   <div className="flex items-end space-x-1 transition-all duration-500">
    
  <div className="text-xl sm:text-xl font-semibold text-gray-400 transition-colors duration-500">
    {formatNumber(effectivePreviousStock, false)}
  </div>
  <div className="text-xs sm:text-sm text-gray-400 font-medium mb-0.5">
    SKUs
  </div>
</div>

  {/* <div className="text-sm sm:text-base font-medium text-gray-400 mt-2 ml-1 transition-colors duration-500">
    {formatNumber(effectivePreviousStock , false)} 
    
  </div> */}

  {/* Forecast Section (Improved) */}
  <div className="mt-2 ml-1 p-0 bg-white rounded-md transition-all duration-500">
    <div className="flex items-center text-sm sm:text-sm font-sm text-gray-400 tracking-wide">
      <span className="w-4 h-4 bg-purple-200 rounded-sm mr-2"></span>
      as of Now
    </div>
    
  </div>
</div>



            {/* Right Section: Fluid circular progress */}
            <div className="flex flex-col items-center mt-10 justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 ml-0 sm:ml-4 lg:ml-6 self-center sm:self-auto">
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
                    stroke={stockStatus.color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.min(displayCircularProgress, 1))}`}
                    style={{
                      filter: `drop-shadow(0 2px 12px ${stockStatus.color}25)`,
                      opacity: animationOpacity
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span 
                    className="text-sm sm:text-base lg:text-lg font-bold transition-all duration-500"
                    style={{ 
                      color: stockStatus.color,
                      opacity: animationOpacity
                    }}
                  >
                    {Math.round(Math.min(displayCircularProgress * 100, 100))}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center mt-1 sm:mt-2 hidden sm:block transition-opacity duration-500">
                of total SKU's
              </div>
            </div>
          </div>
            
          {/* Elegant status row */}
          {/* Elegant status row - BEST WORKING VERSION */}
<div className="flex items-center justify-between mt-2">
  <div
    className={`px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-xl sm:rounded-xl flex items-center space-x-0 sm:space-x-2 transition-all duration-500 border-0 ${
      isHovered ? 'scale-102' : ''
    }`}
    style={{ 
      backgroundColor: `color-mix(in srgb, ${stockStatus.color} 10%, transparent)`,
      borderColor: `color-mix(in srgb, ${stockStatus.color} 0%, transparent)`
    }}
  >
    <div
      className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-500"
      style={{ backgroundColor: stockStatus.color }}
    />
    <span 
      className="text-xs sm:text-sm font-semibold transition-all duration-500"
      style={{ color: stockStatus.color }}
    >
      {stockStatus.text}
    </span>
  </div>
</div>

        </div>

        {/* Bottom Section - Subtle elegance */}
        {/* <div 
          className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 border-t flex items-center justify-between transition-all duration-500"
          style={{ 
            borderColor: 'rgba(0,0,0,0.06)',
            background: 'rgba(255,255,255,0.5)'
          }}
        >
          
          <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-600">
            {supplier && (
              <div className="flex items-center space-x-1 transition-opacity duration-500">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 4v4h4V4h-4zm-2-2h8a2 2 0 0 1 2 2v8h-2V4h-6V2zM4 8v12h12V8H4zm-2-2h16v16H2V6z"/>
                </svg>
                <span className="truncate max-w-20 sm:max-w-32">{supplier}</span>
              </div>
            )}
            
            {lastUpdated && (
              <div className="flex items-center space-x-1 hidden sm:flex transition-opacity duration-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>{lastUpdated}</span>
              </div>
            )}
          </div>

          
          {daysUntilRestock !== null && (
            <div className={`flex items-center space-x-1 sm:space-x-2 transition-all duration-500 ${
              daysUntilRestock <= 3 ? 'animate-pulse' : ''
            }`}>
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                <path 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  d="M8 2v4m8-4v4M3 8h18M5 8v12a2 2 0 002 2h10a2 2 0 002-2V8H5z"
                />
              </svg>
              <span 
                className="text-xs sm:text-sm font-semibold"
                style={{ 
                  color: daysUntilRestock <= 3 ? mergedTheme.danger : 
                         daysUntilRestock <= 7 ? mergedTheme.warning : 
                         mergedTheme.success 
                }}
              >
                {daysUntilRestock >= 0 ? `${daysUntilRestock}d` : 'Overdue'}
              </span>
            </div>
          )}
        </div> */}

        {/* Ultra-smooth animated progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isHovered ? 'h-2.5 shadow-sm' : ''
            }`}
            style={{
              backgroundColor: stockStatus.color,
              width: `${displayBottomProgress * 100}%`,
              opacity: animationOpacity * (isHovered ? 0.85 : 0.7),
              boxShadow: `0 0 12px ${stockStatus.color}30`,
              borderRadius: '0 2px 0 0'
            }}
          />
        </div>
      </div>

      {/* Refined tooltip */}
      {/* {showTooltip && (
        <div 
          className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full z-50 transition-all duration-500 ease-out"
          style={{
            animation: 'elegant-fade-in 0.5s ease-out'
          }}
        >
          <div 
            className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl relative backdrop-blur-sm"
            style={{
              background: 'rgba(17, 24, 39, 0.95)',
              filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.2))'
            }}
          >
            {getTooltipContent()}
           
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 border-6 border-transparent"
              style={{ borderTopColor: 'rgba(17, 24, 39, 0.95)' }}
            />
          </div>
        </div>
      )} */}

      <style jsx>{`
        @keyframes elegant-sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        
        @keyframes elegant-fade-in {
          0% { opacity: 0; transform: translateX(-50%) translateY(calc(-100% + 8px)) scale(0.96); }
          100% { opacity: 1; transform: translateX(-50%) translateY(-100%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default StockLevelCard;
