import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface DOHCardProps {
  daysOnHand: number;
  label?: string;
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
  supplier?: string;  
  restockScheduled?: string;
  lastCalculated?: string;
  className?: string;
  theme?: Partial<PremiumTheme>;
  animated?: boolean;
}

interface PremiumTheme {
  primary: string;
  primaryLight: string;
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  warning: string;
  danger: string;
  accent: string;
  neutral: string;
}

// Enhanced soft, frosty theme with soothing colors
const defaultTheme: PremiumTheme = {
  primary: '#6366F1', // Soft indigo
  primaryLight: '#C7D2FE', // Very light indigo
  background: '#FAFBFF', // Soft white with blue tint
  cardBackground: 'rgba(255, 255, 255, 0.85)', // Semi-transparent white
  textPrimary: '#374151', // Soft dark gray
  textSecondary: '#9CA3AF', // Muted gray
  success: '#10B981', // Soft emerald
  warning: '#F59E0B', // Soft amber
  danger: '#F87171', // Soft red
  accent: '#8B5CF6', // Soft purple
  neutral: '#94A3B8' // Soft slate
};

const DOHPremiumCard: React.FC<DOHCardProps> = ({
  daysOnHand,
  label = 'Days of Inventory on Hand',
  trend,
  criticalThreshold = 7,
  optimalRange = { min: 30, max: 60 },
  category,
  location,
  supplier,
  restockScheduled,
  lastCalculated,
  className = '',
  theme: customTheme = {},
  animated = true
}) => {
  const mergedTheme: PremiumTheme = { ...defaultTheme, ...customTheme };
  const [displayDays, setDisplayDays] = useState(animated ? 0 : daysOnHand);
  const [liquidHeight, setLiquidHeight] = useState(0); // Direct height control
  const [animationOpacity, setAnimationOpacity] = useState(animated ? 0 : 1);
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  // Calculate target liquid height - memoized for performance
  const targetLiquidHeight = useMemo(() => {
    const maxDays = Math.max(optimalRange.max * 1.5, daysOnHand);
    return Math.min((daysOnHand / maxDays) * 100, 100);
  }, [daysOnHand, optimalRange.max]);

  // Unified animation system - FIXED
  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsRefreshing(true);
    
    if (!animated) {
      setDisplayDays(daysOnHand);
      setLiquidHeight(targetLiquidHeight);
      setAnimationOpacity(1);
      setTimeout(() => setIsRefreshing(false), 100);
      return;
    }

    // Animation parameters
    const duration = 6200; // Optimized duration
    
    // Reset states for fresh animation
    setDisplayDays(0);
    setLiquidHeight(0);
    setAnimationOpacity(0);
    
    startTimeRef.current = Date.now();
    
    const animate = () => {
      if (!startTimeRef.current) return;
      
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function - no conflicts
      const easeOutQuart = (t: number): number => {
        return 1 - Math.pow(1 - t, 4);
      };
      
      const easedProgress = easeOutQuart(progress);
      
      // Update all animated properties simultaneously
      setDisplayDays(Math.round(daysOnHand * easedProgress));
      setLiquidHeight(targetLiquidHeight * easedProgress);
      setAnimationOpacity(Math.min(progress * 1.5, 1));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRefreshing(false);
        animationRef.current = undefined;
      }
    };
    
    // Start animation with small delay for smoother initialization
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 100);
    
    // Cleanup function - prevents conflicts
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    
  }, [daysOnHand, animated, targetLiquidHeight]);

  // Auto-hide tooltip
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // Enhanced soft status determination with frosty colors
  const getStatus = () => {
    if (daysOnHand <= criticalThreshold) {
      return {
        level: 'critical',
        color: '#F87171', // Soft coral red
        text: 'Critical Low',
        bgGradient: `linear-gradient(135deg, rgba(248, 113, 113, 0.03), rgba(248, 113, 113, 0.01))`,
        intensity: 1.2
      };
    } else if (daysOnHand < optimalRange.min) {
      return {
        level: 'warning',
        color: '#FBBF24', // Soft golden yellow
        text: 'Below Target',
        bgGradient: `linear-gradient(135deg, rgba(251, 191, 36, 0.03), rgba(251, 191, 36, 0.01))`,
        intensity: 1.0
      };
    } else if (daysOnHand <= optimalRange.max) {
      return {
        level: 'optimal',
        color: '#34D399', // Soft mint green
        text: 'Within Range',
        bgGradient: `linear-gradient(135deg, rgba(52, 211, 153, 0.03), rgba(52, 211, 153, 0.01))`,
        intensity: 0.8
      };
    } else {
      return {
        level: 'excess',
        color: '#A78BFA', // Soft lavender
        text: 'Excess Stock',
        bgGradient: `linear-gradient(135deg, rgba(167, 139, 250, 0.03), rgba(167, 139, 250, 0.01))`,
        intensity: 0.9
      };
    }
  };

  const status = getStatus();

  // Enhanced trend visualization with soft colors
  const getTrendVisualization = () => {
    if (!trend) return null;

    const trendColor = trend.direction === 'up' ? '#34D399' : 
                      trend.direction === 'down' ? '#F87171' : 
                      '#94A3B8';

    return (
      <div className="flex items-center space-x-2">
        <div 
          className="w-7 h-7 rounded-md backdrop-blur-sm flex items-center justify-center transition-all duration-500"
          style={{
            backgroundColor: `rgba(255, 255, 255, 0.3)`,
            borderColor: `${trendColor}20`,
            boxShadow: `0 4px 16px rgba(0, 0, 0, 0.05)`
          }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            {trend.direction === 'up' && (
              <path d="M7 14l5-5 5 5" stroke={trendColor} strokeWidth="2.5" strokeLinecap="round"/>
            )}
            {trend.direction === 'down' && (
              <path d="M7 10l5 5 5-5" stroke={trendColor} strokeWidth="2.5" strokeLinecap="round"/>
            )}
            {trend.direction === 'stable' && (
              <path d="M5 12h14" stroke={trendColor} strokeWidth="2.5" strokeLinecap="round"/>
            )}
          </svg>
        </div>
        
        {trend.percentage !== undefined && (
          <div className="flex flex-col">
            <span 
              className="text-sm font-bold leading-tight"
              style={{ color: trendColor }}
            >
              {trend.direction !== 'stable' && (trend.direction === 'up' ? '+' : '')}
              {trend.percentage} %
            </span>
            {trend.period && (
              <span className="text-xs leading-tight" style={{ color: mergedTheme.textSecondary }}>
                {trend.period}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Days until restock calculation
  const getDaysUntilRestock = () => {
    if (!restockScheduled) return null;
    const today = new Date();
    const restock = new Date(restockScheduled);
    const diffTime = restock.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilRestock = getDaysUntilRestock();

  return (
    <div className="relative">
      <div
        className={`relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-3xl overflow-hidden transition-all duration-700 ease-out cursor-pointer backdrop-blur-xl  ${
          isHovered ? 'shadow-2xl scale-[1.008] shadow-gray-200' : 'shadow-md scale-100 shadow-gray-100'
        } ${className}`}
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.9) 0%, 
              rgba(255, 255, 255, 0.7) 50%, 
              rgba(248, 250, 252, 0.8) 100%
            ),
            ${status.bgGradient}
          `,
          border: `1px solid rgba(255, 255, 255, 0.3)`,
          
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
        {/* Enhanced frosty shimmer effect */}
        {isRefreshing && (
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `linear-gradient(45deg, 
                transparent 30%, 
                rgba(255, 255, 255, 0.4) 40%,
                rgba(255, 255, 255, 0.6) 50%,
                rgba(255, 255, 255, 0.4) 60%,
                transparent 70%
              )`,
              animation: 'premium-sweep 2.2s ease-out'
            }} 
          />
        )}

        {/* Main Content */}
        <div className="relative p-3 sm:p-4 lg:p-5 z-10">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-0">
            <div className="flex-1">
              <div className="flex items-center space-x-2.5 mb-1.5">
                <div 
                  className="w-1 h-8 rounded-full shadow-lg"
                  style={{
                    background: `linear-gradient(to bottom, ${status.color}, ${status.color}80)`,
                    boxShadow: `0 0 16px rgba(${status.color.slice(1).match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, 0.3)`
                  }}
                />
                <div>
                  <h3 
                    className="text-md sm:text-md font-semibold tracking-wide leading-tight"
                    style={{ color: mergedTheme.textSecondary }}
                  >
                    {label}
                  </h3>
                  {category && (
                    <div 
                      className="text-xs mt-0.5"
                      style={{ color: mergedTheme.textSecondary }}
                    >
                      Summary
                    </div>
                  )}
                </div>
              </div>

              {location && (
                <div className="flex items-center space-x-1 mt-1 text-xs ml-2.5" style={{ color: mergedTheme.textSecondary }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>

            {trend && getTrendVisualization()}
          </div>

          {/* Days Display with Liquid Container */}
          <div className="flex items-center space-x-4 mb-0">
            {/* Left: Number Display */}
            <div className="flex-1">
              <div className="flex items-baseline space-x-2">
                <div
                  className="text-3xl sm:text-4xl lg:text-5xl font-black leading-none transition-all duration-500"
                  style={{
                    color: status.color,
                    opacity: animationOpacity,
                    textShadow: `0 4px 16px rgba(${status.color.slice(1).match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, 0.2)`
                  }}
                >
                  {displayDays}
                </div>
                <div 
                  className="text-sm sm:text-base font-medium pb-1"
                  style={{ color: mergedTheme.textSecondary }}
                >
                  days
                </div>
              </div>
              
              <div 
                className="mt-1 text-xs"
                style={{ color: mergedTheme.textSecondary }}
              >
                Current Inventory Level
              </div>
            </div>

            {/* Right: FIXED Smooth Liquid Level Indicator */}
            <div className="relative w-25 h-25 rounded-2xl overflow-hidden backdrop-blur-sm border"
                 style={{
                   background: 'rgba(255, 255, 255, 0.2)',
                   borderColor: 'rgba(255, 255, 255, 0.3)',
                   boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.03)'
                 }}>
              
              <div className="absolute inset-0">
                {/* FIXED: Direct height control - no CSS transitions */}
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-b-2xl"
                  style={{
                    height: `${liquidHeight}%`, // Directly controlled by state
                    background: `linear-gradient(to top, ${status.color}70, ${status.color}40, ${status.color}20)`,
                    opacity: animationOpacity,
                    boxShadow: `0 -4px 16px rgba(${status.color.slice(1).match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, 0.2)`
                  }}
                >
                  {/* Wave effect - only shows when liquid is present */}
                  {liquidHeight > 5 && (
                    <div
                      className="absolute top-0 left-0 right-0 h-3 rounded-full opacity-80"
                      style={{
                        background: `radial-gradient(ellipse at center, rgba(255, 255, 255, 0.6), ${status.color}80 70%, transparent 100%)`,
                        transform: 'translateY(-50%)',
                        animation: 'smooth-wave 1.5s ease-in-out infinite',
                        backdropFilter: 'blur(4px)'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status and Meta Information */}
          <div className="space-y-2">
            {/* Status Row */}
            <div className="flex mt-2 items-center justify-between">
              <div
                className={`px-3 py-1.5 rounded-2xl flex items-center space-x-2 transition-all duration-500 backdrop-blur-sm border ${
                  isHovered ? 'scale-102' : ''
                }`}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  borderColor: `${status.color}30`,
                  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.05)`
                }}
              >
                <div
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    backgroundColor: status.color,
                    boxShadow: `0 0 0px ${status.color}60`
                  }}
                />
                <span 
                  className="text-sm font-semibold"
                  style={{ color: status.color }}
                >
                  {status.text}
                </span>
              </div>

              {/* Optimal range indicator */}
              <div 
                className="text-xs mt-3"
                style={{ color: mergedTheme.textSecondary }}
              >
                Target - {optimalRange.min}-{optimalRange.max} days
              </div>
            </div>

            {/* Bottom meta information */}
            {/* <div 
              className="flex items-center justify-between text-xs pt-0"
              style={{
                color: mergedTheme.textSecondary,
                borderTop: `0px solid rgba(0, 0, 0, 0.05)`
              }}
            > */}
              {/* <div className="flex items-center space-x-3"> */}
                {/* {supplier && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className="truncate max-w-20">{supplier}</span>
                  </div>
                )} */}
                
                {/* {lastCalculated && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>{lastCalculated}</span>
                  </div>
                )} */}
              {/* </div> */}
{/* 
              {daysUntilRestock !== null && (
                <div className={`flex items-center space-x-1 ${daysUntilRestock <= 3 ? 'animate-pulse' : ''}`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
                    <path 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      d="M8 2v4m8-4v4M3 8h18M5 8v12a2 2 0 002 2h10a2 2 0 002-2V8H5z"
                    />
                  </svg>
                  <span 
                    className="font-medium"
                    style={{ 
                      color: daysUntilRestock <= 3 ? '#F87171' : 
                             daysUntilRestock <= 7 ? '#FBBF24' : 
                             '#34D399'
                    }}
                  >
                    {daysUntilRestock >= 0 ? `${daysUntilRestock}d` : 'Overdue'}
                  </span>
                </div>
              )} */}
            {/* </div> */}
          </div>
        </div>
      </div>

      {/* Enhanced frosty tooltip */}
      {showTooltip && (
        <div 
          className="absolute top-3 left-5 transform -translate-x-1/2 -translate-y-full z-50"
          style={{
            opacity: showTooltip ? 1 : 0,
            transition: 'opacity 0.3s ease-out'
          }}
        >
          <div 
            className="relative px-4 py-3 rounded-3xl backdrop-blur-2xl border"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(255, 255, 255, 0.95) 0%, 
                  rgba(255, 255, 255, 0.85) 50%,
                  rgba(248, 250, 252, 0.9) 100%
                )
              `,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              boxShadow: `
                0 25px 50px rgba(0, 0, 0, 0.08),
                0 8px 32px rgba(0, 0, 0, 0.04),
                inset 0 1px 0 rgba(255, 255, 255, 0.8)
              `
            }}
          >
            {/* Tooltip Content */}
            <div className="text-sm space-y-2.5">
              <div 
                className="font-bold text-base leading-tight"
                style={{ color: status.color }}
              >
                {displayDays} days remaining
              </div>
              
              <div style={{ color: mergedTheme.textSecondary }} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span>Health Status:</span>
                  <span 
                    className="font-semibold px-2 py-0.5 rounded-lg text-xs backdrop-blur-sm"
                    style={{ 
                      backgroundColor: `rgba(255, 255, 255, 0.6)`,
                      color: status.color,
                      border: `1px solid ${status.color}20`
                    }}
                  >
                    {Math.round((daysOnHand / optimalRange.max) * 100)}%
                  </span>
                </div>
                
                <div className="text-xs">
                  {daysOnHand >= optimalRange.min ? 
                    `${Math.round(daysOnHand - optimalRange.min)} days above minimum target` : 
                    `${Math.round(optimalRange.min - daysOnHand)} days below minimum target`}
                </div>
                
                {trend?.previousValue && (
                  <div className="text-xs border-t pt-1.5 mt-2" style={{ borderColor: 'rgba(0, 0, 0, 0.05)' }}>
                    Previous: {trend.previousValue} days
                    <span 
                      className="ml-2 font-medium"
                      style={{ 
                        color: trend.direction === 'up' ? '#34D399' : 
                               trend.direction === 'down' ? '#F87171' : 
                               '#94A3B8'
                      }}
                    >
                      ({trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                      {Math.abs(daysOnHand - trend.previousValue)} days)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced frosty tooltip arrow */}
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 backdrop-blur-sm border-r border-b"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.95), 
                    rgba(248, 250, 252, 0.9)
                  )
                `,
                borderColor: 'rgba(255, 255, 255, 0.4)',
                marginTop: '-6px'
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes premium-sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        
        @keyframes smooth-wave {
          0%, 100% { 
            transform: translateY(-50%) scaleY(0.9); 
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-50%) scaleY(1.1); 
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default DOHPremiumCard;
