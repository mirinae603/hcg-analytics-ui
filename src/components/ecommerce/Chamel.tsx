import React, { useState, useRef } from 'react';

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
}

const defaultTheme: ColorTheme = {
  primary: '#06B6D4',
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
  showTooltip = true
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  const mergedTheme: ColorTheme = { ...defaultTheme, ...customTheme };

  // Chart dimensions - increased height, reduced padding
  const chartWidth = 580;
  const chartHeight = 150; // Increased from 90
  const chartPadding = 10; // Reduced from 15
  const usableHeight = chartHeight - (chartPadding * 2);
  const maxValue = Math.max(...data.map(d => d.value));

  // Create smooth curve path - UPDATED
const createSmoothPath = (): string => {
  const points = data.map((item, index) => {
    const columnWidth = chartWidth / data.length;
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


  // Get point coordinates - CORRECTED VERSION
const getPointCoordinates = () => {
  return data.map((item, index) => {
    // Calculate x position to match column centers
    const columnWidth = chartWidth / data.length;
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
        className={`relative rounded-3xl p-4 max-w-3xl mx-auto ${className}`} // Reduced padding from p-5 to p-4
        style={{ 
          backgroundColor: mergedTheme.cardBackground,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255,255,255,0.8)`
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-0"> {/* Reduced margin from mb-10 to mb-6 */}
          <h2 
            className="text-2xl font-light tracking-wide"
            style={{ color: mergedTheme.primary }}
          >
            Activity Stats
          </h2>
          <div className="w-15 h-10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-27 h-27" style={{ color: mergedTheme.primary }}>
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
          className="relative rounded-2xl px-4 py-4 overflow-hidden" // Reduced padding from px-8 py-8
          style={{ backgroundColor: mergedTheme.chartBackground }}
        >
          {/* Data-driven Background Columns with increased height */}
          <div className="absolute inset-4 flex items-end justify-between"> {/* Changed from inset-8 to inset-4 */}
            {data.map((item, index) => {
              const columnHeight = Math.max((item.value / maxValue) * 100, 10); // Minimum height of 10%
              return (
                <div 
                  key={index}
                  className="rounded-xl opacity-30 flex-1 mx-1"
                  style={{ 
                    height: `${columnHeight}%`,
                    backgroundColor: mergedTheme.gridColor,
                    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.06)`
                  }}
                />
              );
            })}
          </div>

          {/* Chart SVG with increased height */}
          <div className="relative z-10 h-36"> {/* Increased from h-24 to h-36 */}
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
                
              />
{/*               
              <path
                d={createSmoothPath()}
                stroke="rgba(156, 163, 175, 0.4)"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="translate(3, 18)"
              />
              
              <path
                d={createSmoothPath()}
                stroke="rgba(156, 163, 175, 0.5)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="translate(2, 18)"
              /> */}
              
              {/* Main Path */}
              <path
                d={createSmoothPath()}
                stroke={mergedTheme.primary}
                strokeWidth="6.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: 'drop-shadow(0 14px 4px rgba(6, 182, 212, 0.2))'
                }}
              />
              
              {/* Data Points with Enhanced Shadows */}
              {points.map((point, index) => (
                <g key={index}>
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
                    className="transition-all duration-300"
                    style={{
                      filter: 'drop-shadow(0 3px 6px rgba(83, 92, 94, 0.4))'
                    }}
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Day Labels - positioned directly below columns */}
        <div className="flex justify-between px-4 mt-2"> {/* Added mt-2 and reduced px */}
          {data.map((item, index) => (
            <div key={item.day} className="flex-1 flex justify-center"> {/* Center align each label */}
              <span
                className="text-sm font-medium transition-all duration-300"
                style={{ 
                  color: index === peakIndex || hoveredPoint === index 
                    ? mergedTheme.textPrimary 
                    : mergedTheme.textSecondary,
                  transform: hoveredPoint === index ? 'translateY(-2px)' : 'translateY(0)',
                  fontWeight: hoveredPoint === index ? '600' : '500'
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
          className="fixed z-50 px-4 py-3 text-sm font-medium rounded-xl pointer-events-none transition-all duration-300"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            backgroundColor: mergedTheme.textPrimary,
            color: mergedTheme.cardBackground,
            boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)`,
            transform: 'translateX(-50%) translateY(-4px)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="text-center">
            <div className="font-semibold text-base">{data[hoveredPoint].day}</div>
            <div className="text-xs opacity-90 mt-1">
              {data[hoveredPoint].label || `${data[hoveredPoint].value} activities`}
            </div>
          </div>
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${mergedTheme.textPrimary}`
            }}
          />
        </div>
      )}
    </>
  );
};

export default ActivityStats;
