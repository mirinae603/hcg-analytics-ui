import React, { useState, useEffect } from 'react';

export interface ITRCardProps {
  currentITR: number;
  label?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
    period?: string;
  };
  targetITR?: number;
  industryAverage?: number;
  className?: string;
  animated?: boolean;
}
// 1. Express Lane — Cheetah Head (speed & agility)
const OptimizedIcon = () => (
  <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 10l3 1 4-2" />
    <path d="M15 14l-3 1-4-2" />
    <path d="M12 3v3" />
  </svg>
);

// 2. Fast Track — Falcon silhouette (fast, precise)
const HealthyIcon = () => (
  <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12l6 6 10-10-6 1-3-3-7 6z" />
  </svg>
);

// 3. Standard Flow — Fish swimming (steady, smooth flow)
const AdequateIcon = () => (
  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12c5 4 10 4 14 0-4-4-9-4-14 0z" />
    <circle cx="9" cy="12" r="1" />
  </svg>
);

// 4. Slow Lane — Tortoise (slow and steady)
const SlowIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="6" />
    <path d="M6 12h12" />
    <path d="M9 8l2 8" />
    <path d="M15 8l-2 8" />
  </svg>
);

// 5. Traffic Jam — Snail shell spiral (slow, congested)
const CriticalIcon = () => (
  <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 12l-4 4" />
    <path d="M12 12l4-4" />
    <path d="M7 17a5 5 0 017-7" />
  </svg>
);


const ITRCard: React.FC<ITRCardProps> = ({
  currentITR,
  label = 'Inventory Turnover Ratio',
  trend,
  targetITR = 12,
  industryAverage = 8,
  className = '',
  animated = true
}) => {
  const [displayITR, setDisplayITR] = useState(animated ? 0 : currentITR);
  const [beltSpeed, setBeltSpeed] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Animate ITR value and belt speed
  useEffect(() => {
    if (!animated) {
      setDisplayITR(currentITR);
      setBeltSpeed(currentITR);
      return;
    }
    
    const duration = 2500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      
      setDisplayITR(currentITR * eased);
      setBeltSpeed(currentITR * eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [currentITR, animated]);

  // Reset animation on hover
  useEffect(() => {
    if (isHovered) {
      setAnimationKey(prev => prev + 1);
    }
  }, [isHovered]);
  
  // Soft performance status with frosty colors
  const getITRStatus = () => {
    const baseline = Math.max(targetITR, industryAverage);
  const efficiency = currentITR / baseline;

  if (efficiency >= 1.2) return { 
    status: 'optimized',
    color: '#6366F1',
    bgColor: 'rgba(199, 210, 254, 0.15)',
    accentColor: 'rgba(99, 102, 241, 0.1)',
    beltColor: '#8B5CF6',
    gradientFrom: '#F8FAFF',
    gradientTo: '#EEF2FF',
    description: <><OptimizedIcon /> <span className="ml-1">High Turnover</span></>
  };

  if (efficiency >= 1.0) return { 
    status: 'healthy',
    color: '#0EA5E9',
    bgColor: 'rgba(186, 230, 253, 0.15)',
    accentColor: 'rgba(14, 165, 233, 0.1)',
    beltColor: '#06B6D4',
    gradientFrom: '#F0F9FF',
    gradientTo: '#E0F2FE',
    description: <><HealthyIcon /> <span className="ml-1">Healthy Turnover</span></>
  };

  if (efficiency >= 0.85) return { 
    status: 'adequate',
    color: '#10B981',
    bgColor: 'rgba(167, 243, 208, 0.15)',
    accentColor: 'rgba(16, 185, 129, 0.1)',
    beltColor: '#34D399',
    gradientFrom: '#F0FDF4',
    gradientTo: '#DCFCE7',
    description: <><AdequateIcon /> <span className="ml-1">Adequate Turnover</span></>
  };

  if (efficiency >= 0.7) return { 
    status: 'slow',
    color: '#F59E0B',
    bgColor: 'rgba(253, 230, 138, 0.15)',
    accentColor: 'rgba(245, 158, 11, 0.1)',
    beltColor: '#FBBF24',
    gradientFrom: '#FFFBEB',
    gradientTo: '#FEF3C7',
    description: <><SlowIcon /> <span className="ml-1">Slow Turnover</span></>
  };

  return { 
    status: 'critical',
    color: '#EF4444',
    bgColor: 'rgba(254, 202, 202, 0.15)',
    accentColor: 'rgba(239, 68, 68, 0.1)',
    beltColor: '#F87171',
    gradientFrom: '#FEF2F2',
    gradientTo: '#FECACA',
    description: <><CriticalIcon /> <span className="ml-1">Excess Stock Risk</span></>
  };

  };

  const status = getITRStatus();
  const daysInInventory = Math.round(30 / currentITR);

  // Generate moving inventory boxes
  const generateBoxes = () => {
    const boxCount = Math.min(Math.max(Math.floor(beltSpeed / 3), 2), 6);
    const animationDuration = Math.max(4 - (beltSpeed / 6), 1.2);
    
    return Array.from({ length: boxCount }, (_, i) => (
   <div
  key={`${animationKey}-box-${i}`}
  className="absolute rounded-sm shadow-md backdrop-blur-sm flex items-center justify-center text-sm transition-all duration-300"
  style={{
  width: '24px',
  height: '16px',
  background: `linear-gradient(135deg, ${status.beltColor}80, ${status.beltColor}60)`,
  border: `1px solid ${status.beltColor}40`,
  animation: `conveyor-move ${animationDuration}s ease-in-out infinite ${i * (animationDuration / boxCount)}s`,
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '8px'
}}

>
  {/* Elegant Box/Package SVG */}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-[12px] h-[12px] text-white"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
</div>

    ));
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div
        className={`relative w-full h-61 rounded-3xl overflow-hidden transition-all duration-700 cursor-pointer backdrop-blur-lg ${
          isHovered ? 'shadow-2xl scale-[1.01] shadow-indigo-200/50' : 'shadow-xl shadow-slate-200/60'
        } ${className}`}
        style={{
          background: `linear-gradient(135deg, ${status.gradientFrom} 0%, ${status.gradientTo} 50%, rgba(255,255,255,0.9) 100%)`,
          border: `1px solid rgba(255,255,255,0.3)`,
          backdropFilter: 'blur(20px)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Subtle background pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, ${status.color} 1px, transparent 1px), radial-gradient(circle at 80% 50%, ${status.color} 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }}
        />

        {/* Fixed Header Section - Top 80px */}
        <div className="absolute top-0 left-0 right-0 h-20 p-5 flex justify-between items-start">
          <div className="flex-1">
            <h3
                className={`text-xs sm:text-sm lg:text-md font-bold text-gray-500 mb-2 leading-tight transition-colors duration-500 ${
                  isHovered ? 'text-gray-400' : ''
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
              {label}
            </h3>
            <div className="flex items-baseline space-x-3">
              <span 
                className="text-3xl font-semibold tracking-tight"
                style={{ 
                  color: status.color,
                  textShadow: `0 2px 10px ${status.color}20`
                }}
              >
                {displayITR.toFixed(1)}
              </span>
              <span className="text-sm text-slate-500 font-medium">
                turns/month
              </span>
                {/* Speed Indicator - Top Right */}
        <div className="absolute top-13 left-40">
          <div 
            className="flex items-center space-x-2 text-xs text-slate-500 px-3 py-1.5 rounded-md backdrop-blur-md"
            style={{ 
              background: 'rgba(255, 255, 255, 0.25)',
              border: '0px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            <div 
              className="w-2 h-2 rounded-full animate-pulse shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${status.beltColor}, ${status.color})`,
                boxShadow: `0 0 10px ${status.beltColor}50`
              }}
            />
            <span className="font-medium">
              {Math.round((currentITR / targetITR) * 100)}%
            </span>
          </div>
        </div>
            </div>
          </div>
        
          <div
  className="px-2 py-1.5 rounded-lg text-xs font-small backdrop-blur-sm transition-all duration-300 ml-0 flex items-center"
  style={{
    background: `linear-gradient(135deg, ${status.color}15, ${status.color}25)`,
    color: status.color,
    boxShadow: `0 4px 15px ${status.color}15`,
    whiteSpace: 'nowrap',
  }}
>
  {status.description}
</div>

        </div>

        

        {/* Main Conveyor Belt Section - Middle 140px */}
        <div className="absolute top-20 left-0 right-0 h-26 px-6 py-4">
          <div className="relative h-full">
            {/* Conveyor Belt Container with proper spacing for icons */}
            <div className="absolute inset-x-12 inset-y-0">
              {/* Frosty Belt Rails */}
              <div 
                className="absolute top-2 left-0 right-0 h-2 rounded-full backdrop-blur-sm"
                style={{ 
                  background: `linear-gradient(90deg, rgba(148, 163, 184, 0.3), rgba(203, 213, 225, 0.4))`,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
              <div 
                className="absolute bottom-2 left-0 right-0 h-2 rounded-full backdrop-blur-sm"
                style={{ 
                  background: `linear-gradient(90deg, rgba(148, 163, 184, 0.3), rgba(203, 213, 225, 0.4))`,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
              
              {/* Main Belt Area */}
              <div 
                className="absolute top-4 bottom-4 left-0 right-0 rounded-md overflow-hidden backdrop-blur-sm"
                style={{ 
                  background: `linear-gradient(135deg, ${status.accentColor}, rgba(255,255,255,0.1))`,
                  border: `1px solid rgba(255,255,255,0.2)`,
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)'
                }}
              >
                {/* Moving belt pattern */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `repeating-linear-gradient(
                      90deg,
                      ${status.beltColor}30 0px,
                      ${status.beltColor}30 12px,
                      transparent 12px,
                      transparent 24px
                    )`,
                    animation: `belt-pattern ${Math.max(3 - (beltSpeed / 8), 0.8)}s linear infinite`
                  }}
                />
                
                {/* Moving Inventory Boxes */}
                <div className="relative h-full">
                  {generateBoxes()}
                </div>
              </div>
            </div>

            {/* Start Point - Left side with proper positioning */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
  <div 
    className="w-10 h-10 rounded-md mt-4 flex items-center justify-center text-lg shadow-lg backdrop-blur-sm transition-all duration-300"
    style={{ 
      background: `linear-gradient(135deg, ${status.color}90, ${status.color}70)`,
      border: `1px solid ${status.color}40`,
      boxShadow: `0 6px 20px ${status.color}20`
    }}
  >
    {/* Custom Factory SVG Icon */}
    {/* <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="w-5 h-5 text-white"
    >
      <path d="M3 21V10l6 3V10l6 3V3h6v18H3z" />
      <path d="M13 16h.01" />
      <path d="M17 16h.01" />
      <path d="M9 16h.01" />
    </svg> */}
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
  </div>

  <div className="text-xs text-slate-500 mt-1.5 text-center font-medium">
    Stock
  </div>
</div>

            
            {/* End Point - Right side with proper positioning */}
           <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
  <div 
    className="w-10 h-10 rounded-md mt-4 flex items-center justify-center text-lg shadow-lg backdrop-blur-sm transition-all duration-300"
    style={{ 
      background: `linear-gradient(135deg, ${status.color}90, ${status.color}70)`,
      border: `1px solid ${status.color}40`,
      boxShadow: `0 6px 20px ${status.color}20`
    }}
  >
    {/* Custom SVG icon */}
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="w-5 h-5 text-white"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l1.68 10.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  </div>

  <div className="text-xs text-slate-500 mt-1.5 text-center font-medium">
    Sales
  </div>
</div>

          </div>
        </div>

        {/* Bottom Stats Section - Bottom 64px */}
        <div className="absolute -bottom-3 left-0 right-0 h-24 p-4">
          <div 
            className="h-full flex justify-between items-center px-4 rounded-3xl backdrop-blur-md"
            style={{ 
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <div className="text-center flex-1">
              <div 
                className="text-lg font-medium"
                style={{ color: status.color }}
              >
                {daysInInventory}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                days cycle
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-lg font-medium text-slate-500">
                {targetITR}×
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Highest Ever
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-lg font-medium text-slate-500">
                {industryAverage}×
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Rolling Avg
              </div>
            </div>

            {trend && (
              <div className="text-center flex-1">
                <div 
                  className="text-lg font-semibold flex items-center justify-center"
                  style={{ 
                    color: trend.direction === 'up' ? '#10B981' : 
                           trend.direction === 'down' ? '#EF4444' : '#64748B'
                  }}
                >
                 <span className="mr-1">
  {trend.direction === 'up' && (
    <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M7 7h10v10" />
    </svg>
  )}
  {trend.direction === 'down' && (
    <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l10-10M17 17H7V7" />
    </svg>
  )}
  {trend.direction === 'stable' && (
    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
    </svg>
  )}
</span>

                  {trend.percentage}%
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {trend.period}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes conveyor-move {
          0% { 
            left: -30px; 
            opacity: 0; 
            transform: translateY(-50%) scale(0.8);
          }
          15% { 
            opacity: 1; 
            transform: translateY(-50%) scale(1);
          }
          85% { 
            opacity: 1; 
            transform: translateY(-50%) scale(1);
          }
          100% { 
            left: calc(100% + 30px); 
            opacity: 0; 
            transform: translateY(-50%) scale(0.8);
          }
        }
        
        @keyframes belt-pattern {
          0% { transform: translateX(0); }
          100% { transform: translateX(24px); }
        }
      `}</style>
    </div>
  );
};

export default ITRCard;
