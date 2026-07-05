import React, { useState, useEffect } from 'react';

interface DOHCardProps {
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
  lastCalculated?: string;
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
  success: string;
  warning: string;
  danger: string;
  accent: string;
  neutral: string;
}

const defaultTheme: ColorTheme = {
  primary: '#6366F1',
  primaryLight: '#A5B4FC',
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  success: '#10B981',
  warning: '#F59E0B', 
  danger: '#EF4444',
  accent: '#8B5CF6',
  neutral: '#6B7280'
};

const DOHCard: React.FC<DOHCardProps> = ({
  daysOnHand,
  label = 'Days of Inventory on Hand',
  trend,
  criticalThreshold = 7,
  optimalRange = { min: 30, max: 60 },
  category,
  location,
  lastCalculated,
  className = '',
  theme: customTheme = {},
  animated = true
}) => {
  const mergedTheme: ColorTheme = { ...defaultTheme, ...customTheme };
  const [displayDays, setDisplayDays] = useState(animated ? 0 : daysOnHand);
  const [animationProgress, setAnimationProgress] = useState(animated ? 0 : 1);
  const [isHovered, setIsHovered] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Smooth animation with spring-like easing
  const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };

  // Animation effect
  useEffect(() => {
    setIsRefreshing(true);
    
    if (!animated) {
      setDisplayDays(daysOnHand);
      setAnimationProgress(1);
      setTimeout(() => setIsRefreshing(false), 100);
      return;
    }
    
    const duration = 1800;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const smoothProgress = easeOutElastic(rawProgress);
      
      setDisplayDays(Math.round(daysOnHand * smoothProgress));
      setAnimationProgress(smoothProgress);
      
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsRefreshing(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [daysOnHand, animated]);

  // Status calculation
  const getStatus = () => {
    if (daysOnHand <= criticalThreshold) {
      return {
        level: 'critical',
        color: mergedTheme.danger,
        text: 'Critical',
        bgColor: '#FEF2F2',
        borderColor: '#FECACA'
      };
    } else if (daysOnHand < optimalRange.min) {
      return {
        level: 'low',
        color: mergedTheme.warning,
        text: 'Below Optimal',
        bgColor: '#FFFBEB',
        borderColor: '#FDE68A'
      };
    } else if (daysOnHand >= optimalRange.min && daysOnHand <= optimalRange.max) {
      return {
        level: 'optimal',
        color: mergedTheme.success,
        text: 'Optimal',
        bgColor: '#F0FDF4',
        borderColor: '#BBF7D0'
      };
    } else {
      return {
        level: 'excess',
        color: mergedTheme.accent,
        text: 'Excess Stock',
        bgColor: '#FAF5FF',
        borderColor: '#DDD6FE'
      };
    }
  };

  const status = getStatus();

  // Progress calculation for the timeline bar
  const getTimelineProgress = () => {
    const maxRange = Math.max(optimalRange.max, daysOnHand) + 10;
    return Math.min((displayDays / maxRange) * 100, 100);
  };

  // Trend icon
  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconStyles = `w-4 h-4 transition-all duration-300 ${isHovered ? 'scale-110' : ''}`;
    
    return (
      <div className="flex items-center space-x-1">
        <svg className={iconStyles} viewBox="0 0 24 24" fill="none">
          {trend.direction === 'up' && (
            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke={mergedTheme.success} strokeWidth="2" strokeLinecap="round"/>
          )}
          {trend.direction === 'down' && (
            <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" stroke={mergedTheme.danger} strokeWidth="2" strokeLinecap="round"/>
          )}
          {trend.direction === 'stable' && (
            <path d="M22 12h-8m0 0l4-4m-4 4l4 4" stroke={mergedTheme.neutral} strokeWidth="2" strokeLinecap="round"/>
          )}
        </svg>
        {trend.percentage !== undefined && (
          <span 
            className="text-sm font-medium"
            style={{ color: trend.direction === 'up' ? mergedTheme.success : 
                          trend.direction === 'down' ? mergedTheme.danger : 
                          mergedTheme.neutral }}
          >
            {trend.direction !== 'stable' && (trend.direction === 'up' ? '+' : '-')}
            {Math.abs(trend.percentage)}%
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <div
        className={`relative w-full max-w-md rounded-3xl overflow-hidden transition-all duration-500 ease-out cursor-pointer border-0 ${
          isHovered ? 'shadow-xl scale-[1.0001] -translate-y-1' : 'shadow-lg scale-100'
        } ${className}`}
        style={{
          background: `linear-gradient(135deg, ${status.bgColor} 0%, ${mergedTheme.cardBackground} 100%)`,
          borderColor: isHovered ? status.color : status.borderColor
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated gradient overlay */}
        {isRefreshing && (
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${status.color}20 50%, transparent 100%)`,
              animation: 'shimmer 1.8s ease-out'
            }} 
          />
        )}

        {/* Header Section */}
        <div className="relative p-6 pb-4">
          <div className="flex items-start justify-between mb-0">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  {label}
                </h3>
              </div>
              
              {category && (
                <div className="flex items-center space-x-1 text-xs text-gray-400 mb-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 2v2H8a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-2V2h-4zM8 6h8v12H8V6z"/>
                  </svg>
                  <span>{category}</span>
                </div>
              )}
            </div>

            {trend && (
              <div className="flex-shrink-0">
                {getTrendIcon()}
              </div>
            )}
          </div>
        </div>

        {/* Main Display Area */}
        <div className="px-6 pb-6">
          {/* Large Number Display */}
          <div className="flex items-end space-x-2 mb-6">
            <div
              className="text-5xl font-black leading-none transition-all duration-500"
              style={{
                color: status.color,
                opacity: animationProgress,
                transform: `scale(${0.8 + (animationProgress * 0.2)})`
              }}
            >
              {displayDays}
            </div>
            <div className="text-lg font-medium text-gray-400 pb-1">
              days
            </div>
          </div>

          {/* Timeline Visualization */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
              <span>0d</span>
              <span>{criticalThreshold}d</span>
              <span>{optimalRange.min}d</span>
              <span>{optimalRange.max}d</span>
            </div>
            
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              {/* Background segments */}
              <div 
                className="absolute inset-y-0 left-0 bg-red-100"
                style={{ width: `${(criticalThreshold / (optimalRange.max + 20)) * 100}%` }}
              />
              <div 
                className="absolute inset-y-0 bg-green-100"
                style={{ 
                  left: `${(criticalThreshold / (optimalRange.max + 20)) * 100}%`,
                  width: `${((optimalRange.max - criticalThreshold) / (optimalRange.max + 20)) * 100}%`
                }}
              />
              
              {/* Progress indicator */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  background: `linear-gradient(90deg, ${status.color}, ${status.color}CC)`,
                  width: `${getTimelineProgress()}%`,
                  opacity: animationProgress
                }}
              />
              
              {/* Current position marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-md rounded-full transition-all duration-1000 ease-out"
                style={{
                  left: `calc(${getTimelineProgress()}% - 2px)`,
                  opacity: animationProgress
                }}
              />
            </div>
            
            {/* Threshold markers */}
            {/* <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-red-400">Critical</div>
              <div className="text-xs text-green-400">Optimal Range</div>
            </div> */}
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div
              className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-all duration-300 ${
                isHovered ? 'scale-105' : ''
              }`}
              style={{
                backgroundColor: `${status.color}15`,
                border: `1px solid ${status.color}30`
              }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: status.color }}
              />
              <span 
                className="text-sm font-semibold"
                style={{ color: status.color }}
              >
                {status.text}
              </span>
            </div>

            {lastCalculated && (
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>{lastCalculated}</span>
              </div>
            )}
          </div>
        </div>

        {/* Subtle glow effect on hover */}
        <div
          className={`absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-500 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `radial-gradient(circle at center, ${status.color}08 0%, transparent 70%)`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(300%) rotate(45deg); }
        }
      `}</style>
    </div>
  );
};

export default DOHCard;
