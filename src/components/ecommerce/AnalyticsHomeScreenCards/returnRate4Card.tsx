import React, { useState, useEffect, useMemo } from 'react';

interface HistoricalData {
  thirtyDaysAgo: number;
  sixtyDaysAgo: number;
  ninetyDaysAgo: number;
}

export interface ReturnRateCardProps {
  currentReturnRate: number;
  historicalData: HistoricalData;
  label?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
    period?: string;
  };
  targetReturnRate?: number;
  industryAverage?: number;
  className?: string;
  animated?: boolean;
}

const ReturnRateCard: React.FC<ReturnRateCardProps> = React.memo(({
  currentReturnRate,
  historicalData,
  label = 'Return Rate Percent',
  trend,
  targetReturnRate = 2.0,
  industryAverage = 3.5,
  className = '',
  animated = true
}) => {
  // Animation states
  const [displayReturnRate, setDisplayReturnRate] = useState(animated ? 0 : currentReturnRate);
  const [displayHistoricalData, setDisplayHistoricalData] = useState({
    thirtyDaysAgo: animated ? 0 : historicalData.thirtyDaysAgo,
    sixtyDaysAgo: animated ? 0 : historicalData.sixtyDaysAgo,
    ninetyDaysAgo: animated ? 0 : historicalData.ninetyDaysAgo,
  });
  const [displayTrendPercentage, setDisplayTrendPercentage] = useState(animated ? 0 : (trend?.percentage || 0));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [contentVisible, setContentVisible] = useState(!animated);
  const [animationProgress, setAnimationProgress] = useState(animated ? 0 : 1);

  // Clean trend icon
  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconClass = "w-3 h-3 sm:w-4 sm:h-4 transition-all duration-300";
    const color = trend.direction === 'up' ? "#f37f7fff" : 
                  trend.direction === 'down' ? "#6defc4ff" : 
                  "#6B7280";
    
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none">
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
    if (!trend) return "#6B7280";
    return trend.direction === 'up' ? "#f57676ff" : 
           trend.direction === 'down' ? "#79efc8ff" : 
           "#6B7280";
  };

  // Status system helper function
  const getStatusForValue = (
  value: number,
) => {
  const base = Math.min(targetReturnRate ?? currentReturnRate, industryAverage ?? currentReturnRate);
  // console.log("Current : ", base, base*2.5)
  if (value <= base) return {
    level: 'optimal',
    color: '#10B981',
    bgColor: '#F0FDF4',
    label: 'Optimal',
    icon: '✓',
    temp: 'Stable'
  };
  if (value <= base * 1.5) return {
    level: 'good',
    color: '#0EA5E9',
    bgColor: '#F0F9FF',
    label: 'Good',
    icon: '◐',
    temp: 'Monitor'
  };
  if (value <= base * 2.5) return {
    level: 'warning',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    label: 'Warning',
    icon: '⚠',
    temp: 'Elevated'
  };
  if (value <= base * 3.5) return {
    level: 'critical',
    color: '#F97316',
    bgColor: '#FFF7ED',
    label: 'Critical',
    icon: '●',
    temp: 'Critical'
  };
  return {
    level: 'danger',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    label: 'Danger',
    icon: '🚨',
    temp: 'Failure'
  };
};


  // Status system for current value
  const status = useMemo(() => getStatusForValue(displayReturnRate), [displayReturnRate]);

  // Function to get cell styling based on value
  const getCellStyling = (value: number) => {
    const valueStatus = getStatusForValue(value);
    const opacity = Math.max(0.15, Math.min(value / 10, 0.85)); // Scale opacity based on severity
    
    // Extract RGB from hex color
    const hex = valueStatus.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
      color: opacity > 0.5 ? '#ffffff' : valueStatus.color,
      fontWeight: opacity > 0.4 ? '600' : '500',
      transition: 'all 0.3s ease',
    };
  };

  // Calculate thermometer fill percentage with animation
  const fillPercentage = useMemo(() => {
    const maxRate = 10;
    return Math.min((displayReturnRate / maxRate) * 100, 100);
  }, [displayReturnRate]);

  // Historical data for mini indicators
  const historicalPoints = useMemo(() => [
    { label: '1M', value: displayHistoricalData.thirtyDaysAgo },
    { label: '2M', value: displayHistoricalData.sixtyDaysAgo },
    { label: '3M', value: displayHistoricalData.ninetyDaysAgo },
  ], [displayHistoricalData]);

  // Enhanced animation with gradual fade-in
  useEffect(() => {
    if (!animated) {
      setDisplayReturnRate(currentReturnRate);
      setDisplayHistoricalData(historicalData);
      setDisplayTrendPercentage(trend?.percentage || 0);
      setContentVisible(true);
      setAnimationProgress(1);
      return;
    }
    
    // Show loader and hide content
    setIsRefreshing(true);
    setContentVisible(false);
    setAnimationProgress(0);
    
    let rafId: number;
    const start = performance.now();
    const duration = 1800; // Longer duration for gradual animation
    
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * (2 - progress); // Smooth easing
      
      // Update animation progress for fade effects
      setAnimationProgress(progress);
      
      // Start showing content after 40% of animation
      if (progress > 0.4) {
        setContentVisible(true);
      }
      
      // Animate return rate
      setDisplayReturnRate(currentReturnRate * eased);
      
      // Animate historical data with slight delays
      const delayedProgress1 = Math.max(0, (progress - 0.1) * 1.11);
      const delayedProgress2 = Math.max(0, (progress - 0.2) * 1.25);
      const delayedProgress3 = Math.max(0, (progress - 0.3) * 1.43);
      
      setDisplayHistoricalData({
        thirtyDaysAgo: historicalData.thirtyDaysAgo * delayedProgress1,
        sixtyDaysAgo: historicalData.sixtyDaysAgo * delayedProgress2,
        ninetyDaysAgo: historicalData.ninetyDaysAgo * delayedProgress3,
      });
      
      // Animate trend percentage
      if (trend?.percentage) {
        setDisplayTrendPercentage(trend.percentage * eased);
      }
      
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // Hide loader with delay
        setTimeout(() => {
          setIsRefreshing(false);
        }, 400);
      }
    };
    
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      setIsRefreshing(false);
    };
  }, [currentReturnRate, historicalData, trend?.percentage, animated]);

  // Staggered animation delays for different elements
  const getElementStyle = (delay: number) => ({
    opacity: contentVisible ? 1 : 0,
    transform: contentVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
    transition: `all 0.6s ease-out ${delay}ms`,
  });

  return (
    <div
      className={`relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 ease-out cursor-pointer ${
        isHovered ? 'shadow-lg scale-[1.005]' : 'shadow-sm scale-100'
      } ${className}`}
      style={{
        background: `linear-gradient(135deg, ${status.bgColor} 0%, rgba(255,255,255,0.9) 100%)`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      
        
        {/* Header with staggered animation */}
        <div className="absolute top-0 left-0 right-0 h-16 p-4 flex justify-between items-start">
          <div className="flex-1" style={getElementStyle(0)}>
            <h3
                className={`text-xs sm:text-sm lg:text-md font-bold text-gray-400 mb-2 leading-tight transition-colors duration-500 ${
                  isHovered ? 'text-gray-500' : ''
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
              {label}
            </h3>
            <div className="flex items-baseline space-x-3">
              <span
  className="text-3xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
  style={{
    color: status.color, // dynamic color still supported
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.015em',
  }}
>
  {displayReturnRate.toFixed(1)}%
</span>

              <span className="text-sm text-slate-400 font-small">
                Return Rate
              </span>
            </div>
          </div>
          
          {trend && (
            <div className="flex items-center space-x-1 sm:space-x-2" style={getElementStyle(100)}>
              <div className="flex items-center space-x-1 transition-all duration-300">
                {getTrendIcon()}
                <span
                  className="text-xs sm:text-sm font-semibold"
                  style={{ 
                    color: getTrendColor(),
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {trend.percentage !== undefined &&
                    `${trend.direction === 'down' ? '-' : trend.direction === 'up' ? '+' : ''}${Math.abs(displayTrendPercentage).toFixed(1)}%`
                  }
                </span>
              </div>
              {trend.period && (
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {trend.period}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area with staggered animations */}
        <div className="absolute top-20 left-0 right-0 h-36 px-6 py-2">
          <div className="relative h-full flex items-center justify-between">
            
            {/* Left: Temperature Scale */}
            <div 
              className="flex flex-col justify-between h-full text-xs text-slate-500 font-mono py-2"
              style={getElementStyle(200)}
            >
              <span className="font-semibold">10 %</span>
              <span>5 %</span>
              <span className="font-semibold">0 %</span>
            </div>
            
            {/* Center: Thermometer and Status */}
            <div className="flex items-center space-x-8 flex-1 justify-center">
              {/* Thermometer */}
              <div className="relative" style={getElementStyle(300)}>
                <div 
                  className="w-6 h-28 rounded-full border-2 relative overflow-hidden"
                  style={{ 
                    borderColor: `${status.color}40`,
                    background: 'rgba(255,255,255,0.5)'
                  }}
                >
                  <div 
                    className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      height: `${fillPercentage}%`,
                      background: `linear-gradient(180deg, ${status.color}90, ${status.color}70)`,
                      boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`
                    }}
                  />
                </div>
                
                <div 
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full transition-all duration-1000"
                  style={{ 
                    background: `linear-gradient(135deg, ${status.color}50, ${status.color}30)`,
                    boxShadow: `0 2px 8px ${status.color}30`
                  }}
                />
              </div>
              
              {/* Status Icon, Text, Target and Industry Combined */}
              <div className="flex flex-col justify-center space-y-4 ml-4 min-w-max" style={getElementStyle(400)}>
                {/* Status Icon and Text */}
                <div className="flex flex-col space-x-4 items-center space-y-2">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm transition-all duration-500"
                    style={{ 
                      backgroundColor: `${status.color}15`,
                      color: status.color,
                      transform: `scale(${0.8 + (animationProgress * 0.2)})`
                    }}
                  >
                    {status.icon}
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-sm font-bold mr-2 tracking-wide"
                      style={{ color: status.color }}
                    >
                      {status.temp}
                    </div>
                  </div>
                </div>

                {/* Target */}
                <div className="flex items-center space-x-2 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full bg-blue-400 transition-all duration-500"
                    style={{
                      transform: `scale(${animationProgress})`,
                    }}
                  ></div>
                  <span className="text-slate-500 font-small">Lowest Ever {targetReturnRate}%</span>
                </div>

                {/* Industry */}
                <div className="flex items-center space-x-2 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full bg-slate-400 transition-all duration-500"
                    style={{
                      transform: `scale(${animationProgress})`,
                    }}
                  ></div>
                  <span className="text-slate-500 font-small">Rolling Avg {industryAverage}%</span>
                </div>
              </div>
            </div>
            
            {/* Right: Historical Data Table with Color Coding */}
            <div className="flex flex-col justify-center space-y-4 min-w-max" style={getElementStyle(600)}>
              {/* <span className="text-xs text-slate-500 font-medium">Historical</span> */}
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-xs text-left rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-500">Period</th>
                      <th className="px-3 py-2 font-semibold text-slate-500">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalPoints.map((point, index) => (
                      <tr 
                        key={point.label} 
                        className="border-t border-slate-100 transition-all duration-500 hover:shadow-sm"
                        style={{
                          opacity: contentVisible ? 1 : 0,
                          transform: contentVisible ? 'translateX(0)' : 'translateX(20px)',
                          transitionDelay: `${700 + (index * 100)}ms`
                        }}
                      >
                        <td className="px-3 py-2 font-medium text-slate-400">
                          {point.label}
                        </td>
                        <td 
                          className="px-3 py-2 rounded-md text-center font-medium transition-all duration-300"
                          style={{
                            ...getCellStyling(point.value),
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          {point.value.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
});

ReturnRateCard.displayName = 'ReturnRateCard';

export default ReturnRateCard;
