"use client"
import React, { useState, useEffect, useRef } from 'react';

interface WarehouseInventoryCardProps {
  inventoryValue: number;
  yoyChangeRupees: number;
  yoyChangePercent: number;
  region: string;
  warehouseName?: string;
  previousValue?: number;
  period?: string;
  className?: string;
  animated?: boolean;
  utilizationRate?: number;
}

const WarehouseInventoryCard: React.FC<WarehouseInventoryCardProps> = ({
  inventoryValue,
  yoyChangeRupees,
  yoyChangePercent,
  region,
  warehouseName = '',
  previousValue,
  period = 'vs Last Year',
  className = '',
  animated = true,
  utilizationRate = 72
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [displayChange, setDisplayChange] = useState(0);
  const [displayPercent, setDisplayPercent] = useState(0);
  const [displayUtilization, setDisplayUtilization] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [glowAnimation, setGlowAnimation] = useState(0);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);


  // Calculate meaningful metrics
  const getInventoryMetrics = () => {
    const turnoverRatio = (inventoryValue / (previousValue || 1)) * 365 / 365; // Simplified inventory turnover
    const efficiency = yoyChangePercent > 0 ? 'Growing' : 'Declining';
    const velocityScore = Math.min(Math.abs(yoyChangePercent), 100);
    
    return {
      turnoverRatio: turnoverRatio.toFixed(1),
      efficiency,
      velocityScore: Math.round(velocityScore),
      growthMomentum: yoyChangePercent > 20 ? 'High' : yoyChangePercent > 5 ? 'Moderate' : 'Low'
    };
  };

  const metrics = getInventoryMetrics();

  // Sophisticated theme system with premium colors
  const getTheme = (changePercent: number) => {
    if (changePercent > 0) return {
      primary: '#00D4AA',
      gradient: 'linear-gradient(135deg, #00F5FF 0%, #00D4AA 100%)',
      background: 'linear-gradient(145deg, #FAFFFE 0%, #F0FFFC 100%)',
      shadow: 'rgba(0, 212, 170, 0.15)',
      accent: '#E6FFFA',
      glow: '#00F5FF',
      status: 'positive'
    };
    if (changePercent < 0) return {
      primary: '#FF6B6B',
      gradient: 'linear-gradient(135deg, #FF8A80 0%, #FF6B6B 100%)',
      background: 'linear-gradient(145deg, #FFFAFA 0%, #FFF5F5 100%)',
      shadow: 'rgba(255, 107, 107, 0.15)',
      accent: '#FFEBEE',
      glow: '#FF8A80',
      status: 'negative'
    };
    return {
      primary: '#667EEA',
      gradient: 'linear-gradient(135deg, #764BA2 0%, #667EEA 100%)',
      background: 'linear-gradient(145deg, #FAFBFF 0%, #F4F7FF 100%)',
      shadow: 'rgba(102, 126, 234, 0.15)',
      accent: '#EEF2FF',
      glow: '#764BA2',
      status: 'stable'
    };
  };

  const theme = getTheme(yoyChangePercent);

  // Premium currency formatting
  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
    if (absValue >= 100000) return `${(value / 100000).toFixed(1)}L`;
    if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return `${Math.round(value).toLocaleString('en-IN')}`;
  };

  // Smooth premium animations
  useEffect(() => {
    if (!animated) {
      setDisplayValue(inventoryValue);
      setDisplayChange(yoyChangeRupees);
      setDisplayPercent(yoyChangePercent);
      setDisplayUtilization(utilizationRate);
      return;
    }

    const duration = 2200;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apple-style easing
      const bezier = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      const easedProgress = bezier(progress);
      
      setDisplayValue(inventoryValue * easedProgress);
      setDisplayChange(yoyChangeRupees * easedProgress);
      setDisplayPercent(yoyChangePercent * easedProgress);
      setDisplayUtilization(utilizationRate * easedProgress);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 300);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [inventoryValue, yoyChangeRupees, yoyChangePercent, utilizationRate, animated]);

  // Glow animation
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowAnimation(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div
        ref={cardRef}
        className={`relative w-75 h-75 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${className}`}
        style={{
          background: theme.background,
          boxShadow: isHovered 
            ? `
                0 20px 60px -12px ${theme.shadow},
                0 8px 32px -8px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.8)
              `
            : `
                0 8px 32px -8px ${theme.shadow},
                0 4px 16px -4px rgba(0, 0, 0, 0.04),
                0 0 0 1px rgba(255, 255, 255, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.6)
              `,
          transform: isHovered ? 'translateY(-1px) scale(1.001)' : 'translateY(0) scale(1)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-32 h-32 rounded-full opacity-20 blur-xl transition-all duration-1000"
            style={{
              background: theme.gradient,
              top: '10%',
              right: '15%',
              transform: `scale(${1 + Math.sin(glowAnimation * 0.1) * 0.1})`
            }}
          />
          <div 
            className="absolute w-24 h-24 rounded-full opacity-10 blur-lg transition-all duration-1000"
            style={{
              background: theme.glow,
              bottom: '20%',
              left: '10%',
              transform: `scale(${1 + Math.cos(glowAnimation * 0.08) * 0.15})`
            }}
          />
        </div>

        {/* Glassmorphism overlay */}
        <div 
          className="absolute inset-0 backdrop-blur-sm"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative h-full flex flex-col p-7">
          
          {/* Header with floating status */}
          <div className="flex items-start justify-between mb-0">
            <div>
              <span className="text-sm font-semibold text-gray-500">
                Inventory Value YoY
              </span>
              <div className="mb-2">
                <div className="flex items-baseline justify-between mb-3"></div>
                {/* Percent Change with Arrow */}
                <div className="flexjustify-end">
                  <div
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium
                      shadow-sm ring-0 ring-inset
                      transition-all duration-300 ease-in-out
                      bg-opacity-10
                      dark:ring-white/10
                    `}
                    style={{
                      backgroundColor: `${theme.primary}1A`,
                      color: theme.primary,
                      borderColor: theme.primary,
                    }}
                  >
                    <span className="w-4 h-4" aria-hidden="true">
                      {displayPercent > 0 ? (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
                          <path d="M10 3l5 7H5l5-7z" />
                        </svg>
                      ) : displayPercent < 0 ? (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
                          <path d="M10 17l-5-7h10l-5 7z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
                          <path d="M4 10h12v1H4v-1z" />
                        </svg>
                      )}
                    </span>
                    <span className="tabular-nums">{Math.abs(displayPercent).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Circular progress indicator */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={theme.primary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: `${Math.abs(displayPercent) * 1.5}, 100`,
                    filter: `drop-shadow(0 2px 4px ${theme.shadow})`
                  }}
                />
              </svg>
              <div 
                className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                style={{ color: theme.primary }}
              >
                {Math.abs(displayPercent).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* YoY Change - Hero section */}
          <div className="flex-1 flex flex-col justify-between">
            
            {/* Change metrics with visual impact */}
            <div className="flex items-center justify-between w-full mt-4">
              <div className="relative">
                <div className="flex items-baseline gap-1 mb-2">
                  <div
                    className="text-4xl font-light tracking-tight"
                    style={{ color: 'gray' }}
                  >
                    ₹
                  </div>
                  <div
                    className="text-4xl font-medium tracking-tight"
                    style={{ color: 'gray' }}
                  >
                    {formatCurrency(displayValue)}
                  </div>
                </div>

                {/* Animated accent line */}
                <div 
                  className="h-1 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    background: theme.gradient,
                    width: `${(displayValue / inventoryValue) * 60}%`,
                    boxShadow: `0 2px 8px ${theme.shadow}`
                  }}
                />
              </div>

              {/* Right Side: Value and Percent */}
              <div className="space-y-1 text-right">
                {/* Main Value */}
                <div className="flex items-baseline gap-1 mb-2">
                   <div
                    className="text-2xl font-light tracking-tight"
                    style={{ color: theme.primary }}
                  >
                    ₹
                  </div>
                  <div 
                    className="text-2xl font-semibold tracking-tight"
                    style={{ color: theme.primary }}
                  >
                    {formatCurrency(previousValue || 0)}
                  </div>
                 
                </div>

                {/* Left Side: Period */}
                <p className="text-xs font-small text-gray-400">
                  {period}
                </p>
              </div>
            </div>

            {/* Bottom section with meaningful metrics */}
            <div 
              className="p-4 rounded-2xl backdrop-blur-sm mt-4"
              style={{ 
                background: `${theme.accent}40`,
                border: `0px solid ${theme.primary}20`
              }}
            >
              <div className="grid grid-cols-1 gap-4">
  {/* Growth Momentum - Full Width */}
  <div className="text-center">
    <div className="flex items-center justify-center mb-1">
      <span className="text-xs font-small text-gray-400 tracking-wider whitespace-nowrap">
        Growth Momentum
      </span>
    </div>
    <span 
      className="text-lg font-semibold whitespace-nowrap"
      style={{ color: theme.primary }}
    >
      {metrics.growthMomentum}
    </span>
  </div>
</div>

              
              {/* Progress bar representing velocity score */}
              <div className="relative h-2 bg-white bg-opacity-50 rounded-full overflow-hidden mt-3">
                <div 
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1500 ease-out"
                  style={{
                    width: `${metrics.velocityScore}%`,
                    background: theme.gradient,
                    boxShadow: `0 0 8px ${theme.shadow}`
                  }}
                />
                
                {/* Animated shimmer */}
                <div 
                  className="absolute top-0 left-0 h-full w-8 opacity-40"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${theme.glow}, transparent)`,
                    animation: `shimmer 2s infinite ease-in-out`,
                    animationDelay: '1s'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Premium glass reflection */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(255,255,255,0.4) 0%, 
                rgba(255,255,255,0.1) 25%, 
                transparent 50%
              )
            `,
            clipPath: 'polygon(0 0, 50% 0, 25% 100%, 0 100%)',
            opacity: isHovered ? 0.6 : 0.4
          }}
        />

        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(500%); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default WarehouseInventoryCard;
