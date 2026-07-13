import React, { useState, useEffect } from 'react';

// Inventory Aging is a stock-VALUE metric (₹), not a unit count (client feedback #13).
const inrCr = (v: number) => {
  const a = Math.abs(v || 0);
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  if (a >= 1e3) return `₹${(v / 1e3).toFixed(0)}K`;
  return `₹${Math.round(v || 0)}`;
};

interface StockAgingCardProps {
  agingData: {
    fresh: number;
    aging: number;
    problem: number;
    deadStock: number;
  };
  totalItems?: number;
  label?: string;
  className?: string;
  animated?: boolean;
}

const StockAgingCard: React.FC<StockAgingCardProps> = ({
  agingData,
  totalItems,
  label = 'Stock Health',
  className = '',
  animated = true
}) => {
  const [displayData, setDisplayData] = useState(animated ? 
    { fresh: 0, aging: 0, problem: 0, deadStock: 0 } : 
    agingData
  );
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const calculatedTotal = totalItems || Object.values(agingData).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!animated) {
      setDisplayData(agingData);
      setProgress(1);
      return;
    }

    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      const spring = t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      setProgress(spring);
      setDisplayData({
        fresh: Math.round(agingData.fresh * spring),
        aging: Math.round(agingData.aging * spring),
        problem: Math.round(agingData.problem * spring),
        deadStock: Math.round(agingData.deadStock * spring),
      });
      
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [agingData, animated]);

  const getHealthMetrics = () => {
    const freshPercent = (agingData.fresh / calculatedTotal) * 100;
    const criticalPercent = ((agingData.problem + agingData.deadStock) / calculatedTotal) * 100;
    
    let score = Math.max(0, Math.min(100, freshPercent - (criticalPercent * 1.5)));
    let status = 'Critical';
    let color = '#F87171';
    let bgColor = 'rgba(248, 113, 113, 0.08)';
    
    if (score >= 80) { status = 'Excellent'; color = '#6dcba9ff'; bgColor = 'rgba(52, 211, 153, 0.08)'; }
    else if (score >= 65) { status = 'Good'; color = '#79b2f6ff'; bgColor = 'rgba(96, 165, 250, 0.08)'; }
    else if (score >= 50) { status = 'Fair'; color = '#f9d16dff'; bgColor = 'rgba(251, 191, 36, 0.08)'; }
    else if (score >= 30) { status = 'Poor'; color = '#fbaa67ff'; bgColor = 'rgba(251, 146, 60, 0.08)'; }
    
    return { score: Math.round(score), status, color, bgColor };
  };

  const health = getHealthMetrics();

  const stockSegments = [
    { key: 'fresh', label: '<3 Months', value: displayData.fresh, color: '#56d3a5ff', lightColor: '#D1FAE5' },
    { key: 'aging', label: '3–6 Months', value: displayData.aging, color: '#80b7f9ff', lightColor: '#DBEAFE' },
    { key: 'problem', label: '6–12 Months', value: displayData.problem, color: '#fcb77fff', lightColor: '#FFEDD5' },
    { key: 'deadStock', label: '1+ Year', value: displayData.deadStock, color: '#f98686ff', lightColor: '#FEE2E2' }
  ];
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
        className={`relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-700 ease-out cursor-pointer ${
          isHovered ? 'shadow-lg scale-[1.004]' : 'shadow-sm scale-100'
        } ${className}`}
        style={{
          background: `white`,
        }}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
      <div
        className={`
          relative w-full h-full rounded-3xl overflow-hidden backdrop-blur-sm
          transition-all duration-700 ease-out cursor-pointer group
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          hover:shadow-2xl hover:shadow-slate-200/20 hover:-translate-y-1
        `}
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)',
          border: '0px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, ${health.color} 2px, transparent 2px),
                            radial-gradient(circle at 80% 50%, ${health.color} 1px, transparent 1px)`,
            backgroundSize: '24px 24px, 16px 16px'
          }} />
        </div>

        {/* Header Section - Responsive */}
        <div className="relative p-3 sm:p-5 pb-2 sm:pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3">
            <div className="flex-1 mb-2 sm:mb-0">
              <h3
                className={`text-xs sm:text-sm lg:text-md font-bold text-gray-400 mb-3 leading-tight transition-colors duration-500 ${
                  isHovered ? 'text-gray-500' : ''
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >{label}</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg sm:text-2xl font-semibold text-slate-500 tracking-tight">
                  {inrCr(calculatedTotal)}
                </span>
                <span className="text-xs text-slate-500 font-medium">stock value</span>
              </div>
            </div>
            
            {/* Health Score - Responsive */}
            <div className="flex items-center space-x-2 self-start">
              <div 
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-medium border"
                style={{ 
                  backgroundColor: health.bgColor,
                  color: health.color,
                  borderColor: `${health.color}20`
                }}
              >
                {health.status}
              </div>
              <div 
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: health.color }}
              >
                {health.score}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Adaptive Layout */}
        <div className="relative flex-1 px-3 sm:px-5 py-0 pb-3 overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center lg:items-start h-full">
            
            {/* Donut Chart - Responsive */}
            <div className="relative flex-shrink-0 mb-4 lg:mb-0 lg:mr-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-28 lg:h-28 xl:w-32 xl:h-32">
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 120 120" 
                  className="transform -rotate-90"
                >
                  <defs>
                    {stockSegments.map((segment, index) => (
                      <linearGradient key={index} id={`gradient-${segment.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={segment.color} />
                        <stop offset="100%" stopColor={segment.color} stopOpacity="0.8" />
                      </linearGradient>
                    ))}
                  </defs>
                  
                  {/* Background circle */}
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  
                  {/* Data arcs */}
                  {(() => {
                    let currentAngle = 0;
                    return stockSegments.map((segment, index) => {
                      const percentage = segment.value / calculatedTotal;
                      const angle = percentage * 360 * progress;
                      const startAngle = currentAngle;
                      currentAngle += angle;
                      
                      if (angle < 1) return null;
                      
                      const radius = 50;
                      const strokeWidth = 12;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDasharray = `${(angle / 360) * circumference} ${circumference}`;
                      const strokeDashoffset = -(startAngle / 360) * circumference;
                      
                      return (
                        <circle
                          key={index}
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke={`url(#gradient-${segment.key})`}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-300 hover:stroke-opacity-80"
                          style={{
                            filter: `drop-shadow(0 2px 4px ${segment.color}20)`
                          }}
                        />
                      );
                    });
                  })()}
                </svg>
                
                {/* Center Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: health.color }} />
                    <div className="text-xs text-slate-600 font-medium">Health</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats and Insights Container */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row flex-1 w-full space-y-0 sm:space-y-0 sm:space-x-4 lg:space-x-0 lg:space-y-4 xl:space-y-0 xl:space-x-4">
              
              {/* Stats Grid - Responsive */}
              <div className="flex-1 space-y-1.5 sm:space-y-2">
               {stockSegments.map((segment, index) => {
  const percentage = calculatedTotal > 0 ? (segment.value / calculatedTotal) * 100 : 0;
  return (
    <div key={index}>
      <div className="flex items-center justify-between group/item py-0.5">
        <div className="flex items-center space-x-2">
          <div 
            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-transform group-hover/item:scale-125"
            style={{ backgroundColor: segment.color }}
          />
          <span className="text-xs font-medium text-slate-500 truncate">
            {segment.label}
          </span>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 text-right flex-shrink-0">
          <span className="text-xs font-semibold text-slate-500">
            {inrCr(segment.value)}
          </span>
          <span 
            className="text-xs font-medium"
            style={{ color: segment.color }}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      {/* Compact horizontal separator */}
      {index !== stockSegments.length - 1 && (
        <div className="h-px bg-slate-200 my-0.5" />
      )}
    </div>
  );
})}

              </div>

              {/* Insights Panel - Responsive */}
              <div className="flex-shrink-0">
                <div 
                  className="flex flex-row sm:flex-col items-center justify-center space-x-4 sm:space-x-0 sm:space-y-3 p-2 sm:p-3 rounded-2xl  min-h-[60px] sm:min-h-[120px]"
                  style={{ 
                    backgroundColor: 'rgba(248, 250, 252, 0.8)',
                    borderColor: 'rgba(226, 232, 240, 0.6)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  {/* Fresh Stock */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-0.5">Fresh</div>
                    <div className="text-sm font-semibold text-emerald-600">
                      {((displayData.fresh / calculatedTotal) * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="w-px h-4 sm:w-4 sm:h-px bg-slate-200" />
                  
                  {/* At Risk */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-0.5">Risk</div>
                    <div className="text-sm font-semibold text-orange-500">
                      {(((displayData.problem + displayData.deadStock) / calculatedTotal) * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                 
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div 
            className="absolute inset-0 rounded-3xl"
            style={{
              background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${health.color}08, transparent 40%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StockAgingCard;
