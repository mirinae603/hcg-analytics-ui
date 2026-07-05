import React, { useState, useRef, useEffect } from 'react';

interface ActivityDataPoint {
  day: string;
  value: number;
  label?: string;
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
}

interface ActivityStatsProps {
  data?: ActivityDataPoint[];
  className?: string;
  theme?: Partial<ColorTheme>;
  showTooltip?: boolean;
  animated?: boolean;
  title?: string;
}

const defaultTheme: ColorTheme = {
  primary: '#1abbedff',
  primaryLight: '#67E8F9',
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#9CA3AF',
  chartBackground: '#ffffffff',
  shadowColor: 'rgba(156, 163, 175, 0.5)',
  gridColor: '#E5E7EB'
};

const ActivityStats: React.FC<ActivityStatsProps> = ({ 
  data = [
    { day: 'Mon', value: 32, label: '32 activities' },
    { day: 'Tue', value: 15, label: '15 activities' },
    { day: 'Wed', value: 28, label: '28 activities' },
    { day: 'Thu', value: 48, label: '48 activities' },
    { day: 'Fri', value: 38, label: '38 activities' },
    { day: 'Sat', value: 18, label: '18 activities' },
    { day: 'Sun', value: 42, label: '42 activities' }
  ],
  className = '',
  theme: customTheme = {},
  showTooltip = true,
  animated = true,
  title = 'Stock Out Events'
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [animatedData, setAnimatedData] = useState<ActivityDataPoint[]>(animated ? data.map(d => ({ ...d, value: 0 })) : data);
  const [animationProgress, setAnimationProgress] = useState(animated ? 0 : 1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const mergedTheme: ColorTheme = { ...defaultTheme, ...customTheme };

  // Smooth, elegant easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Ultra-smooth animations for all chart elements
  useEffect(() => {
    setIsRefreshing(true);
    
    if (!animated) {
      setAnimatedData(data);
      setAnimationProgress(1);
      setTimeout(() => setIsRefreshing(false), 100);
      return;
    }
    
    const duration = 2400; // Same duration as StockLevelCard
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const smoothProgress = easeInOutCubic(rawProgress);
      
      // Animate all data points with ultra-smooth easing
      const newAnimatedData = data.map(item => ({
        ...item,
        value: Math.floor(item.value * smoothProgress)
      }));
      
      setAnimatedData(newAnimatedData);
      setAnimationProgress(smoothProgress);
      
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsRefreshing(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [data, animated]);

  // Chart dimensions - increased height, reduced padding
  const chartWidth = 580;
  const chartHeight = 150; // Increased from 90
  const chartPadding = 10; // Reduced from 15
  const usableHeight = chartHeight - (chartPadding * 2);
  const maxValue = Math.max(...data.map(d => d.value));

  // Create smooth curve path - UPDATED to use animated data
  const createSmoothPath = (): string => {
    const points = animatedData.map((item, index) => {
      const columnWidth = chartWidth / animatedData.length;
      const x = (index * columnWidth) + (columnWidth / 2);
      return {
        x: x,
        y: chartPadding + usableHeight - ((item.value / maxValue) * usableHeight)
      };
    });

    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      const cp1x = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.4;
      const cp2x = currentPoint.x - (currentPoint.x - prevPoint.x) * 0.4;
      
      path += ` C ${cp1x} ${prevPoint.y}, ${cp2x} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}`;
    }
    
    return path;
  };

  // Get point coordinates - CORRECTED VERSION using animated data
  const getPointCoordinates = () => {
    return animatedData.map((item, index) => {
      // Calculate x position to match column centers
      const columnWidth = chartWidth / animatedData.length;
      const x = (index * columnWidth) + (columnWidth / 2);
      
      return {
        x: x,
        y: chartPadding + usableHeight - ((item.value / maxValue) * usableHeight),
        value: item.value,
        day: item.day,
        label: item.label
      };
    });
  };

  const points = getPointCoordinates();
  const peakIndex = data.findIndex(item => item.value === Math.max(...data.map(d => d.value)));

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !showTooltip) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * chartWidth;
    
    let closestIndex = 0;
    let minDistance = Math.abs(x - points[0].x);
    
    points.forEach((point, index) => {
      const distance = Math.abs(x - point.x);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    // Increased tolerance since columns are wider
    const columnWidth = chartWidth / data.length;
    if (minDistance < columnWidth / 2) {
      setHoveredPoint(closestIndex);
      setTooltipPosition({
        x: event.clientX,
        y: event.clientY - 70
      });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <>
      <div 
        className={`relative rounded-3xl p-4 max-w-3xl mx-auto ${className}`}
        style={{ 
          backgroundColor: mergedTheme.cardBackground,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255,255,255,0.8)`
        }}
      >
        {/* Elegant refresh effect */}
        {isRefreshing && (
          <div 
            className="absolute inset-0 opacity-10 rounded-3xl"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${mergedTheme.primary}15 50%, transparent 70%)`,
              animation: 'elegant-sweep 2.4s ease-out'
            }} 
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-0">
          <h2
            className="text-2xl font-simple tracking-tight leading-snug transition-opacity duration-500"
            style={{
              color: mergedTheme.primary,
              fontFamily: "'Poppins', sans-serif",
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              opacity: animationProgress * 0.8 + 0.2
            }}
          >
            {title}
          </h2>

          <div className="w-15 h-10 flex items-center justify-center">
            <svg 
              viewBox="0 0 24 24" 
              className="w-27 h-27 transition-all duration-500" 
              style={{ 
                color: mergedTheme.primary,
                opacity: animationProgress * 0.8 + 0.2
              }}
            >
              <path
                d="M3 12h2l1-4 3 8 1-6 1 2h2"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Chart Container */}
        <div 
          className="relative rounded-2xl px-4 py-4 overflow-hidden"
          style={{ backgroundColor: mergedTheme.chartBackground }}
        >
          {/* Data-driven Background Columns with ANIMATED heights */}
          <div className="absolute inset-4 flex items-end justify-between">
            {animatedData.map((item, index) => {
              const columnHeight = Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0);
              return (
                <div 
                  key={index}
                  className="rounded-xl opacity-30 flex-1 mx-1 transition-all duration-300"
                  style={{ 
                    height: `${columnHeight}%`,
                    backgroundColor: mergedTheme.gridColor,
                    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.06)`,
                    opacity: animationProgress * 0.3
                  }}
                />
              );
            })}
          </div>

          {/* Chart SVG with increased height */}
          <div className="relative z-10 h-36">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full cursor-pointer"
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Multiple Shadow Layers for Enhanced 3D Effect */}
              <path
                d={createSmoothPath()}
                stroke="rgba(156, 163, 175, 0.1)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="translate(4, 14)"
                style={{
                  opacity: animationProgress * 0.5
                }}
              />
              
              {/* Main Path with ANIMATED drawing */}
              <path
                d={createSmoothPath()}
                stroke={mergedTheme.primary}
                strokeWidth="6.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: 'drop-shadow(0 14px 4px rgba(6, 182, 212, 0.2))',
                  opacity: animationProgress
                }}
              />
              
              {/* Data Points with Enhanced Shadows and ANIMATED appearance */}
              {points.map((point, index) => (
                <g key={index} style={{ opacity: animationProgress }}>
                  {/* Hover Area */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="18"
                    fill="transparent"
                    className="cursor-pointer"
                  />
                  
                  {/* Multiple Point Shadows for 3D effect */}
                  {(index === peakIndex || hoveredPoint === index) && (
                    <>
                      <circle
                        cx={point.x + 4}
                        cy={point.y + 8}
                        r={index === peakIndex ? "4" : "4.5"}
                        fill="rgba(156, 163, 175, 0.2)"
                      />
                      <circle
                        cx={point.x + 3}
                        cy={point.y + 6}
                        r={index === peakIndex ? "4" : "4.5"}
                        fill="rgba(156, 163, 175, 0.3)"
                      />
                      <circle
                        cx={point.x + 2}
                        cy={point.y + 4}
                        r={index === peakIndex ? "4" : "4.5"}
                        fill="rgba(156, 163, 175, 0.4)"
                      />
                    </>
                  )}
                  
                  {/* Point Circle */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={index === peakIndex ? "7.5" : hoveredPoint === index ? "7.5" : "0"}
                    fill={mergedTheme.primary}
                    stroke={mergedTheme.cardBackground}
                    strokeWidth="4.5"
                    className="transition-all duration-500"
                    style={{
                      filter: 'drop-shadow(0 3px 6px rgba(83, 92, 94, 0.4))'
                    }}
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Day Labels - positioned directly below columns with ANIMATED appearance */}
        <div className="flex justify-between px-4 mt-2">
          {data.map((item, index) => (
            <div key={item.day} className="flex-1 flex justify-center">
              <span
                className="text-sm font-medium transition-all duration-500"
                style={{ 
                  color: index === peakIndex || hoveredPoint === index 
                    ? mergedTheme.primary 
                    : mergedTheme.textSecondary,
                  transform: hoveredPoint === index ? 'translateY(-2px)' : 'translateY(0)',
                  fontWeight: hoveredPoint === index ? '600' : '500',
                  opacity: animationProgress * 0.8 + 0.2
                }}
              >
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Tooltip */}
      {showTooltip && hoveredPoint !== null && (
        <div
          className="fixed z-50 px-4 py-3 text-sm font-medium rounded-2xl pointer-events-none transition-all duration-500"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            background: 'rgba(255, 255, 255, 0.15)',
            color: mergedTheme.cardBackground,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.10)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transform: 'translateX(-50%) translateY(-6px)',
            minWidth: '100px',
            maxWidth: '200px',
          }}
        >
          <div className="text-center space-y-1">
            <div className="font-semibold text-base text-gray-400/90 tracking-wide">
              {data[hoveredPoint].day}
            </div>
            <div className="text-xs text-blue-400/80">
              {data[hoveredPoint].label || `${data[hoveredPoint].value} StockOuts`}
            </div>
          </div>

          {/* Tooltip Arrow */}
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2"
            style={{
              width: 10,
              height: 10,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '6px solid rgba(202, 225, 248, 0.8)',
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes elegant-sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
      `}</style>
    </>
  );
};

export default ActivityStats;
