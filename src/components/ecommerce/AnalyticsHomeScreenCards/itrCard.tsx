import React, { useState, useEffect } from 'react';

interface ITRCardProps {
  currentITR: number;
  label?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
    period?: string;
    previousValue?: number;
    valueChange?: number;
  };
  targetITR?: number;
  industryAverage?: number;
  daysInInventory?: number;
  lastCalculation?: string;
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
  primary: '#6366F1',
  primaryLight: '#A5B4FC',
  background: '#ffffffff',
  cardBackground: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#9CA3AF',
  chartBackground: '#ffffffff',
  shadowColor: 'rgba(156, 163, 175, 0.5)',
  gridColor: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  accent: '#8B5CF6'
};

const ITRCard: React.FC<ITRCardProps> = ({
  currentITR,
  label = 'Inventory Turnover Ratio',
  trend,
  targetITR = 12,
  industryAverage = 8,
  daysInInventory = Math.round(365 / currentITR),
  lastCalculation,
  category,
  location,
  lastUpdated,
  className = '',
  theme: customTheme = {},
  animated = true
}) => {
  const mergedTheme: ColorTheme = { ...defaultTheme, ...customTheme };
  const [displayITR, setDisplayITR] = useState(animated ? 0 : currentITR);
  const [displayRotation, setDisplayRotation] = useState(animated ? 0 : (currentITR / targetITR) * 360);
  const [displayDays, setDisplayDays] = useState(animated ? 365 : daysInInventory);
  const [animationOpacity, setAnimationOpacity] = useState(animated ? 0 : 1);
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Smooth, elegant easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Ultra-smooth animations
  useEffect(() => {
    setIsRefreshing(true);
    
    if (!animated) {
      setDisplayITR(currentITR);
      setDisplayRotation((currentITR / targetITR) * 360);
      setDisplayDays(daysInInventory);
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
      
      setDisplayITR(currentITR * smoothProgress);
      setDisplayRotation(((currentITR / targetITR) * 360) * smoothProgress);
      setDisplayDays(365 - ((365 - daysInInventory) * smoothProgress));
      setAnimationOpacity(Math.min(smoothProgress * 1.5, 1));
      
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsRefreshing(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [currentITR, targetITR, daysInInventory, animated]);

  // Auto-hide tooltip
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // ITR Performance Analysis with unique color scheme
  const getITRStatus = () => {
    const targetRatio = currentITR / targetITR;
    const industryRatio = currentITR / industryAverage;
    
    // Excellent Performance (>120% of target)
    if (targetRatio >= 1.2) {
      return { 
        status: 'excellent', 
        color: '#10B981', // Emerald
        lightColor: '#ECFDF5',
        darkColor: '#064E3B',
        text: 'Excellent', 
        description: 'Outstanding efficiency',
        bgGradient: `radial-gradient(circle at 30% 30%, #10B98108, transparent 70%)`,
        intensity: 'high'
      };
    }
    // Strong Performance (100-119% of target)
    else if (targetRatio >= 1.0) {
      return { 
        status: 'strong', 
        color: '#3B82F6', // Blue
        lightColor: '#EFF6FF',
        darkColor: '#1E3A8A',
        text: 'Strong', 
        description: 'Above target',
        bgGradient: `radial-gradient(circle at 30% 30%, #3B82F608, transparent 70%)`,
        intensity: 'medium-high'
      };
    }
    // Good Performance (80-99% of target)
    else if (targetRatio >= 0.8) {
      return { 
        status: 'good', 
        color: '#6366F1', // Indigo
        lightColor: '#F0F9FF',
        darkColor: '#312E81',
        text: 'Good', 
        description: 'Near target',
        bgGradient: `radial-gradient(circle at 30% 30%, #6366F108, transparent 70%)`,
        intensity: 'medium'
      };
    }
    // Moderate Performance (60-79% of target)
    else if (targetRatio >= 0.6) {
      return { 
        status: 'moderate', 
        color: '#8B5CF6', // Purple
        lightColor: '#FAF5FF',
        darkColor: '#581C87',
        text: 'Moderate', 
        description: 'Below target',
        bgGradient: `radial-gradient(circle at 30% 30%, #8B5CF608, transparent 70%)`,
        intensity: 'medium-low'
      };
    }
    // Concerning Performance (40-59% of target)
    else if (targetRatio >= 0.4) {
      return { 
        status: 'concerning', 
        color: '#F59E0B', // Amber
        lightColor: '#FFFBEB',
        darkColor: '#92400E',
        text: 'Concerning', 
        description: 'Needs improvement',
        bgGradient: `radial-gradient(circle at 30% 30%, #F59E0B08, transparent 70%)`,
        intensity: 'low'
      };
    }
    // Critical Performance (<40% of target)
    else {
      return { 
        status: 'critical', 
        color: '#EF4444', // Red
        lightColor: '#FEF2F2',
        darkColor: '#991B1B',
        text: 'Critical', 
        description: 'Poor efficiency',
        bgGradient: `radial-gradient(circle at 30% 30%, #EF444408, transparent 70%)`,
        intensity: 'very-low'
      };
    }
  };

  const itrStatus = getITRStatus();

  // Enhanced formatting for ITR
  const formatITR = (ratio: number): string => {
    return ratio.toFixed(1);
  };

  // Trend analysis
  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconClass = "w-3 h-3 sm:w-4 sm:h-4 transition-all duration-500 ease-out";
    const color = trend.direction === 'up' ? '#10B981' : 
                  trend.direction === 'down' ? '#EF4444' : 
                  '#6B7280';
    
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

  // Tooltip content
  const getTooltipContent = () => {
    const targetPercentage = Math.round((currentITR / targetITR) * 100);
    const industryComparison = Math.round((currentITR / industryAverage) * 100);
    
    return (
      <div className="text-xs space-y-1.5">
        <div className="font-semibold text-white">{formatITR(currentITR)}x Current ITR</div>
        <div className="text-gray-200">
          Target: {formatITR(targetITR)}x ({targetPercentage}%)
        </div>
        <div className="text-gray-200">
          Industry Avg: {formatITR(industryAverage)}x ({industryComparison}%)
        </div>
        <div className="text-gray-200">
          Days in Inventory: {Math.round(displayDays)} days
        </div>
        <div className="text-gray-200">
          {currentITR > industryAverage 
            ? `${(currentITR - industryAverage).toFixed(1)}x above industry` 
            : `${(industryAverage - currentITR).toFixed(1)}x below industry`}
        </div>
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
          background: 'white',
          border: `1px solid ${itrStatus.lightColor}`,
          boxShadow: isHovered 
            ? `0 20px 40px -12px ${itrStatus.color}15, 0 8px 16px -8px ${itrStatus.color}10`
            : `0 4px 16px -4px ${itrStatus.color}08`
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
            className="absolute inset-0 opacity-10"
            style={{
              background: `conic-gradient(from 0deg, transparent 30%, ${itrStatus.color}20 50%, transparent 70%)`,
              animation: 'elegant-spin 2.4s ease-out'
            }} 
          />
        )}

        {/* Radial background gradient */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: itrStatus.bgGradient
          }}
        />

        {/* Main Content */}
        <div className="relative flex-1 items-center p-3 sm:p-4 lg:p-6">
          {/* Header */}
          <div className="mb-0 sm:mb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
              {/* Label */}
              <h3
                className={`text-xs sm:text-sm lg:text-md font-bold text-gray-400 leading-tight transition-colors duration-500 ${
                  isHovered ? 'text-gray-500' : ''
                }`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {label}
              </h3>

              {/* Trend */}
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
          </div>
            
          {/* ITR Display Layout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center">
            {/* Left Section: ITR Value */}
            <div className="flex-1 mb-0 sm:mb-0 w-full sm:w-auto">
              {/* ITR Value Display */}
              <div className="flex items-baseline space-x-1 transition-all duration-500">
                <div
                  className="text-2xl sm:text-3xl mt-0 lg:text-4xl font-black leading-none"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    opacity: animationOpacity,
                    color: itrStatus.color,
                    fontWeight: '800'
                  }}
                >
                  {formatITR(displayITR)}
                </div>
                <div className="text-sm sm:text-base text-gray-400 font-medium">
                  x/year
                </div>
              </div>
              
              <div className="my-3 border-t" style={{ borderColor: itrStatus.lightColor }}></div>
              
              {/* Target and Days */}
              <div className="flex items-center gap-x-4 text-sm sm:text-base font-medium text-gray-400 transition-colors duration-500">
                {/* Target Value */}
                <span>
                  {formatITR(targetITR)}x target
                </span>

                {/* Days in Inventory */}
                <div className="flex items-center text-sm font-normal text-gray-400 tracking-wide rounded-md px-2 py-1"
                     style={{ backgroundColor: "transparent" }}>
                  <span 
                    className="w-4 h-4 rounded-sm mr-2"
                    style={{ backgroundColor: itrStatus.color, opacity: 0.2 }}
                  ></span>
                  <span style={{ color: "black", opacity: 0.5 }}>
                    {Math.round(displayDays)} days
                  </span>
                </div>
              </div>
            </div>

            {/* Right Section: Rotating Speed Indicator */}
            <div className="flex flex-col items-center mt-2 justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 ml-0 sm:ml-4 lg:ml-6 self-center sm:self-auto">
              <div className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 transition-transform duration-700 ease-out ${
                isHovered ? 'scale-105' : ''
              }`}>
                
                {/* Outer Ring - Target */}
                <div 
                  className="absolute inset-0 rounded-full border-4 opacity-20"
                  style={{ borderColor: itrStatus.lightColor }}
                />
                
                {/* Rotating Speed Dial */}
                <div 
                  className="absolute inset-2 rounded-full border-4 transition-all duration-2400 ease-out"
                  style={{
                    borderColor: `${itrStatus.color}40`,
                    transform: `rotate(${displayRotation}deg)`,
                    borderTopColor: itrStatus.color,
                    borderRightColor: `${itrStatus.color}60`,
                    opacity: animationOpacity
                  }}
                >
                  {/* Speed Indicator Dot */}
                  <div 
                    className="absolute w-2 h-2 rounded-full top-0 left-1/2 transform -translate-x-1/2 -translate-y-1"
                    style={{ backgroundColor: itrStatus.color }}
                  />
                </div>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span 
                    className="text-lg sm:text-xl lg:text-2xl font-bold transition-all duration-500"
                    style={{ 
                      color: itrStatus.color,
                      opacity: animationOpacity,
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    ⚡
                  </span>
                  <span 
                    className="text-xs font-medium mt-1"
                    style={{ 
                      color: itrStatus.color,
                      opacity: animationOpacity * 0.8
                    }}
                  >
                    {Math.round((currentITR / targetITR) * 100)}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-400 text-center mt-1 sm:mt-2 hidden sm:block transition-opacity duration-500">
                turnover speed
              </div>
            </div>
          </div>
            
          {/* Status row */}
          <div className="flex items-center justify-between mt-3">
            <div
              className={`px-3 sm:px-3 py-1 sm:py-1 rounded-xl sm:rounded-xl flex items-center space-x-2 sm:space-x-2 transition-all duration-500 ${
                isHovered ? 'scale-102' : ''
              }`}
              style={{ 
                backgroundColor: itrStatus.lightColor,
              }}
            >
              <div
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-500"
                style={{ backgroundColor: itrStatus.color }}
              />
              <span 
                className="text-sm sm:text-sm font-medium transition-all duration-500"
                style={{ color: itrStatus.color }}
              >
                {itrStatus.text}
              </span>
            </div>

            {/* Industry Comparison */}
            <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h2v2H7V7zm4 0h2v2h-2V7zm4 0h2v2h-2V7zM7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
              </svg>
              <span>vs {formatITR(industryAverage)}x avg</span>
            </div>
          </div>
        </div>

        {/* Dynamic wave progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isHovered ? 'h-2.5' : ''
            }`}
            style={{
              background: `linear-gradient(90deg, ${itrStatus.color}, ${itrStatus.color}80, ${itrStatus.color})`,
              width: `${Math.min((displayITR / targetITR) * 100, 100)}%`,
              opacity: animationOpacity * (isHovered ? 0.8 : 0.6),
              boxShadow: `0 0 8px ${itrStatus.color}25`,
              borderRadius: '0 2px 0 0'
            }}
          />
        </div>
      </div>

      {/* Enhanced Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: '50%',
            bottom: '100%',
            transform: 'translateX(-50%) translateY(-8px)',
            animation: 'elegant-fade-in 0.3s ease-out'
          }}
        >
          {getTooltipContent()}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #1F2937'
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes elegant-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes elegant-fade-in {
          0% { opacity: 0; transform: translateX(-50%) translateY(calc(-100% + 8px)) scale(0.96); }
          100% { opacity: 1; transform: translateX(-50%) translateY(-100%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ITRCard;
