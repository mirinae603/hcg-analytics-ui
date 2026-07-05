import React, { useState, useEffect } from 'react';

interface InventoryValuationCardProps {
  currentValuation: number;
  currency?: string;
  label?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
    period?: string;
    previousValue?: number;
    valueChange?: number;
  };
  targetValuation?: number;
  forecastedValuation?: number;
  costOfGoodsSold?: number;
  turnoverRatio?: number;
  lastRevaluation?: string;
  category?: string;
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
  warning: '#F59E0B',
  danger: '#f28080ff',
  accent: '#8B5CF6'
};

const InventoryValuationCard: React.FC<InventoryValuationCardProps> = ({
  currentValuation,
  currency = 'USD',
  label = 'Inventory Valuation',
  trend,
  targetValuation = currentValuation * 1.2,
  forecastedValuation = currentValuation * 1.15,
  costOfGoodsSold,
  turnoverRatio,
  lastRevaluation,
  category,
  location,
  lastUpdated,
  className = '',
  theme: customTheme = {},
  animated = true
}) => {
  const mergedTheme: ColorTheme = { ...defaultTheme, ...customTheme };
  const [displayValuation, setDisplayValuation] = useState(animated ? 0 : currentValuation);
  const [displayCircularProgress, setDisplayCircularProgress] = useState(animated ? 0 : Math.min(currentValuation / forecastedValuation, 1));
  const [displayBottomProgress, setDisplayBottomProgress] = useState(animated ? 0 : Math.min(currentValuation / (forecastedValuation * 1.1), 1));
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
    
    const targetCircularProgress = Math.min(currentValuation / forecastedValuation, 1);
    const targetBottomProgress = Math.min(currentValuation / (forecastedValuation * 1.1), 1);
    
    if (!animated) {
      setDisplayValuation(currentValuation);
      setDisplayCircularProgress(targetCircularProgress);
      setDisplayBottomProgress(targetBottomProgress);
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
      
      setDisplayValuation(currentValuation * smoothProgress);
      setDisplayCircularProgress(targetCircularProgress * smoothProgress);
      setDisplayBottomProgress(targetBottomProgress * smoothProgress);
      setAnimationOpacity(Math.min(smoothProgress * 1.5, 1));
      
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsRefreshing(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [currentValuation, forecastedValuation, animated]);

  // Auto-hide tooltip
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // Sophisticated valuation status with soft colors and multiple levels
  const getValuationStatus = () => {
    const forecastRatio = currentValuation / forecastedValuation;
    const targetRatio = currentValuation / targetValuation;
    
    // Excellent Performance (120%+ of forecast)
    if (forecastRatio >= 1.2) {
      return { 
        status: 'excellent', 
        color: '#10B981', // Soft emerald
        lightColor: '#D1FAE5', // Very light emerald
        text: 'Excellent', 
        description: 'Exceeding forecast',
        bgGradient: `linear-gradient(135deg, #10B98106, #10B98103)`,
        intensity: 'high'
      };
    }
    // Strong Performance (105-119% of forecast)
    else if (forecastRatio >= 1.05) {
      return { 
        status: 'strong', 
        color: '#059669', // Soft green
        lightColor: '#ECFDF5',
        text: 'Strong', 
        description: 'Above forecast',
        bgGradient: `linear-gradient(135deg, #05966906, #05966903)`,
        intensity: 'medium-high'
      };
    }
    // Good Performance (95-104% of forecast)
    else if (forecastRatio >= 0.95) {
      return { 
        status: 'good', 
        color: '#3B82F6', // Soft blue
        lightColor: '#DBEAFE',
        text: 'On Track', 
        description: 'Meeting forecast',
        bgGradient: `linear-gradient(135deg, #3B82F606, #3B82F603)`,
        intensity: 'medium'
      };
    }
    // Moderate Performance (85-94% of forecast)
    else if (forecastRatio >= 0.85) {
      return { 
        status: 'moderate', 
        color: '#a27ef6ff', // Soft purple
        lightColor: '#F3E8FF',
        text: 'Moderate', 
        description: 'Below forecast',
        bgGradient: `linear-gradient(135deg, #8B5CF606, #8B5CF603)`,
        intensity: 'medium-low'
      };
    }
    // Concerning Performance (70-84% of forecast)
    else if (forecastRatio >= 0.7) {
      return { 
        status: 'concerning', 
        color: '#f5be5fff', // Soft amber
        lightColor: '#FEF3C7',
        text: 'Concerning', 
        description: 'Well below forecast',
        bgGradient: `linear-gradient(135deg, #F59E0B06, #F59E0B03)`,
        intensity: 'low'
      };
    }
    // Critical Performance (<70% of forecast)
    else {
      return { 
        status: 'critical', 
        color: '#f46c6cff', // Soft red
        lightColor: '#FEE2E2',
        text: 'Critical', 
        description: 'Significantly undervalued',
        bgGradient: `linear-gradient(135deg, #EF444406, #EF444403)`,
        intensity: 'very-low'
      };
    }
  };

  const valuationStatus = getValuationStatus();

  // Enhanced formatting for currency with soft styling
  const formatCurrency = (amount: number, compact: boolean = false): string => {
    const currencySymbol = currency === 'USD' ? '$' : 
                          currency === 'EUR' ? '€' : 
                          currency === 'GBP' ? '£' : 
                          currency;
    
    if (compact) {
      if (amount >= 1000000000) return `${currencySymbol}${(amount / 1000000000).toFixed(1)}B`;
      if (amount >= 1000000) return `${currencySymbol}${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `${currencySymbol}${(amount / 1000).toFixed(1)}K`;
    }
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  // Subtle trend analysis with soft colors
  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconClass = "w-3 h-3 sm:w-4 sm:h-4 transition-all duration-500 ease-out";
    const color = trend.direction === 'up' ? '#10B981' : // Soft emerald
                  trend.direction === 'down' ? '#EF4444' : // Soft red
                  '#6B7280'; // Soft gray
    
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
    if (!trend) return '#6B7280';
    return trend.direction === 'up' ? '#10B981' : 
           trend.direction === 'down' ? '#EF4444' : 
           '#6B7280';
  };

  // Tooltip content with enhanced information
  const getTooltipContent = () => {
    const forecastPercentage = Math.round((currentValuation / forecastedValuation) * 100);
    const targetPercentage = Math.round((currentValuation / targetValuation) * 100);
    const variance = currentValuation - forecastedValuation;
    
    return (
      <div className="text-xs space-y-1.5">
        <div className="font-semibold text-white">{formatCurrency(currentValuation)} Current</div>
        <div className="text-gray-200">
          Forecast: {formatCurrency(forecastedValuation)} ({forecastPercentage}%)
        </div>
        <div className="text-gray-200">
          Target: {formatCurrency(targetValuation)} ({targetPercentage}%)
        </div>
        <div className="text-gray-200">
          {variance >= 0 
            ? `${formatCurrency(variance)} above forecast` 
            : `${formatCurrency(Math.abs(variance))} below forecast`}
        </div>
        {turnoverRatio && (
          <div className="text-gray-200">
            Turnover: {turnoverRatio.toFixed(1)}x annually
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
          border: `1px solid ${valuationStatus.lightColor}`,
          boxShadow: isHovered 
            ? `0 20px 40px -12px ${valuationStatus.color}15, 0 8px 16px -8px ${valuationStatus.color}10`
            : `0 4px 16px -4px ${valuationStatus.color}08`
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
        {/* Elegant refresh effect with soft colors */}
        {isRefreshing && (
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${valuationStatus.color}20 50%, transparent 70%)`,
              animation: 'elegant-sweep 2.4s ease-out'
            }} 
          />
        )}

        {/* Subtle background gradient */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: valuationStatus.bgGradient
          }}
        />

        {/* Main Content */}
        <div className="relative flex-1 items-center p-3 sm:p-4 lg:p-6">
          {/* Header */}
          <div className="mb-0 sm:mb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
              {/* Elegant label */}
              <h3
                className={`text-xs sm:text-sm lg:text-md font-bold text-gray-400 leading-tight transition-colors duration-500 ${
                  isHovered ? 'text-gray-500' : ''
                }`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {label}
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
                    <span className="text-xs text-gray-400 hidden sm:inline transition-opacity duration-500">
                      {trend.period}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* {location && (
              <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-400 mt-1 transition-all duration-500">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
                <span className="truncate">{location}</span>
              </div>
            )} */}
          </div>
            
          {/* Valuation Display Layout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center">
            {/* Left Section: Smooth currency animation */}
            <div className="flex-1 mb-0 sm:mb-0 w-full sm:w-auto">
              {/* Currency Value Display */}
              <div className="flex items-baseline space-x-1 transition-all duration-500">
                <div
                  className="text-2xl sm:text-3xl mt-0 lg:text-4xl font-black leading-none"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    opacity: animationOpacity,
                    color: valuationStatus.color,
                    fontWeight: '800'
                  }}
                >
                  {formatCurrency(displayValuation, true)}
                </div>
                <div className="text-sm sm:text-base text-gray-400 font-medium">
                  {currency}
                </div>
              </div>
              
              <div className="my-3 border-t" style={{ borderColor: valuationStatus.lightColor }}></div>
              
              {/* Forecast and Performance */}
              <div className="flex items-center gap-x-4 text-sm sm:text-base font-medium text-gray-400 transition-colors duration-500">
                {/* Forecasted Value */}
                <span>
                  {formatCurrency(forecastedValuation, true)} 
                </span>

                {/* Performance Indicator */}
                <div className="flex items-center text-sm font-normal text-gray-400 tracking-wide rounded-md px-2 py-1"
                     style={{ backgroundColor: "transparent" }}>
                  <span 
                    className="w-4 h-4 rounded-sm mr-2"
                    style={{ backgroundColor: "purple", opacity: 0.2 }}
                  ></span>
                  <span style={{ color:  "black", opacity: 0.5 }}>
                    Forecast
                  </span>
                </div>
              </div>
            </div>

            {/* Right Section: Enhanced circular progress */}
            <div className="flex flex-col items-center mt-2 justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 ml-0 sm:ml-4 lg:ml-6 self-center sm:self-auto">
              <div className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 transition-transform duration-700 ease-out ${
                isHovered ? 'scale-105' : ''
              }`}>
                <svg className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle with soft color */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={valuationStatus.lightColor}
                    strokeWidth="6"
                  />
                  {/* Progress circle with gradient effect */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={valuationStatus.color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.min(displayCircularProgress, 1))}`}
                    style={{
                      filter: `drop-shadow(0 2px 8px ${valuationStatus.color}20)`,
                      opacity: animationOpacity * 0.9
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span 
                    className="text-sm sm:text-base lg:text-lg font-bold transition-all duration-500"
                    style={{ 
                      color: valuationStatus.color,
                      opacity: animationOpacity,
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    {Math.round(Math.min(displayCircularProgress * 100, 100))}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-400 text-center mt-1 sm:mt-2 hidden sm:block transition-opacity duration-500">
                of forecast value
              </div>
            </div>
          </div>
            
          {/* Enhanced status row with soft styling */}
          <div className="flex items-center justify-between mt-3">
            <div
              className={`px-3 sm:px-3 py-1 sm:py-1 rounded-xl sm:rounded-xl flex items-center space-x-2 sm:space-x-2 transition-all duration-500  ${
                isHovered ? 'scale-102' : ''
              }`}
              style={{ 
                backgroundColor: valuationStatus.lightColor,
              }}
            >
              <div
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-500"
                style={{ backgroundColor: valuationStatus.color }}
              />
              <span 
                className="text-sm sm:text-sm font-medium transition-all duration-500"
                style={{ color: valuationStatus.color }}
              >
                {valuationStatus.text}
              </span>
            </div>

            {/* Additional Metrics with soft styling */}
            {turnoverRatio && (
              <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
                  <path d="M20 12a8 8 0 0 1-8 8v-2a6 6 0 0 0 6-6h2z"/>
                </svg>
                <span>{turnoverRatio.toFixed(1)}x</span>
              </div>
            )}
          </div>
        </div>

        {/* Ultra-smooth animated progress bar with gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isHovered ? 'h-2.5' : ''
            }`}
            style={{
              background: `linear-gradient(90deg, ${valuationStatus.color}, ${valuationStatus.color}80)`,
              width: `${displayBottomProgress * 100}%`,
              opacity: animationOpacity * (isHovered ? 0.8 : 0.6),
              boxShadow: `0 0 8px ${valuationStatus.color}25`,
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
        
        @keyframes elegant-fade-in {
          0% { opacity: 0; transform: translateX(-50%) translateY(calc(-100% + 8px)) scale(0.96); }
          100% { opacity: 1; transform: translateX(-50%) translateY(-100%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default InventoryValuationCard;
