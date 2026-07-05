import React, { useState, useEffect } from 'react';

interface ReturnRateCardProps {
  currentReturnRate: number;
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

// 1. Excellent Zone — Shield (protection/quality)
const ExcellentIcon = () => (
  <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// 2. Good Zone — Heart with pulse (healthy operations)
const GoodIcon = () => (
  <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    <path d="M3.5 12h4l2-3 2 6 2-3h4" />
  </svg>
);

// 3. Fair Zone — Caution triangle
const FairIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="m12 17 .01 0" />
  </svg>
);

// 4. Poor Zone — X in circle (rejection)
const PoorIcon = () => (
  <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

// 5. Critical Zone — Alert octagon (stop/critical)
const CriticalIcon = () => (
  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ReturnRateCard: React.FC<ReturnRateCardProps> = ({
  currentReturnRate,
  label = 'Return Rate',
  trend,
  targetReturnRate = 2.0,
  industryAverage = 3.5,
  className = '',
  animated = true
}) => {
  const [displayReturnRate, setDisplayReturnRate] = useState(animated ? 0 : currentReturnRate);
  const [flowIntensity, setFlowIntensity] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Animate return rate value and flow intensity
  useEffect(() => {
    if (!animated) {
      setDisplayReturnRate(currentReturnRate);
      setFlowIntensity(currentReturnRate);
      return;
    }
    
    const duration = 2500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      
      setDisplayReturnRate(currentReturnRate * eased);
      setFlowIntensity(currentReturnRate * eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [currentReturnRate, animated]);

  // Reset animation on hover
  useEffect(() => {
    if (isHovered) {
      setAnimationKey(prev => prev + 1);
    }
  }, [isHovered]);
  
  // Return rate status with medical supply chain context
  const getReturnRateStatus = () => {
    if (currentReturnRate <= 1.0) return { 
      status: 'excellent', 
      color: '#10B981',
      bgColor: 'rgba(167, 243, 208, 0.15)',
      accentColor: 'rgba(16, 185, 129, 0.1)',
      flowColor: '#34D399',
      gradientFrom: '#F0FDF4',
      gradientTo: '#DCFCE7',
      description: <><ExcellentIcon /> <span className="ml-1">Excellence</span></>
    };

    if (currentReturnRate <= 2.0) return { 
      status: 'good', 
      color: '#0EA5E9',
      bgColor: 'rgba(186, 230, 253, 0.15)',
      accentColor: 'rgba(14, 165, 233, 0.1)',
      flowColor: '#06B6D4',
      gradientFrom: '#F0F9FF',
      gradientTo: '#E0F2FE',
      description: <><GoodIcon /> <span className="ml-1">Healthy</span></>
    };

    if (currentReturnRate <= 4.0) return { 
      status: 'fair', 
      color: '#F59E0B',
      bgColor: 'rgba(253, 230, 138, 0.15)',
      accentColor: 'rgba(245, 158, 11, 0.1)',
      flowColor: '#FBBF24',
      gradientFrom: '#FFFBEB',
      gradientTo: '#FEF3C7',
      description: <><FairIcon /> <span className="ml-1">Caution</span></>
    };

    if (currentReturnRate <= 7.0) return { 
      status: 'poor', 
      color: '#F97316',
      bgColor: 'rgba(254, 215, 170, 0.15)',
      accentColor: 'rgba(249, 115, 22, 0.1)',
      flowColor: '#FB923C',
      gradientFrom: '#FFF7ED',
      gradientTo: '#FFEDD5',
      description: <><PoorIcon /> <span className="ml-1">Poor</span></>
    };

    return { 
      status: 'critical', 
      color: '#EF4444',
      bgColor: 'rgba(254, 202, 202, 0.15)',
      accentColor: 'rgba(239, 68, 68, 0.1)',
      flowColor: '#F87171',
      gradientFrom: '#FEF2F2',
      gradientTo: '#FECACA',
      description: <><CriticalIcon /> <span className="ml-1">Critical</span></>
    };
  };

  const status = getReturnRateStatus();
  const returnedItems = Math.round((currentReturnRate / 100) * 1000); // Simulated volume

  // Generate floating return items (medical supplies)
  const generateReturnItems = () => {
    const itemCount = Math.min(Math.max(Math.floor(flowIntensity / 1.5), 1), 5);
    const animationDuration = Math.max(6 - (flowIntensity / 2), 2);
    
    const medicalIcons = [
      // Syringe
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
        <path d="m18 2 4 4" />
        <path d="m17 7 3 3" />
        <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
        <path d="m9 11 4 4" />
        <path d="m5 19-3 3" />
      </svg>,
      // Pills/Medication
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>,
      // Medical Kit
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
        <path d="M9 12h6" />
        <path d="M12 9v6" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        <path d="M16 16h.01" />
      </svg>
    ];
    
    return Array.from({ length: itemCount }, (_, i) => (
      <div
        key={`${animationKey}-return-${i}`}
        className="absolute rounded-lg shadow-lg backdrop-blur-sm flex items-center justify-center transition-all duration-300"
        style={{
          width: '28px',
          height: '20px',
          background: `linear-gradient(135deg, ${status.flowColor}90, ${status.flowColor}70)`,
          border: `1px solid ${status.flowColor}50`,
          animation: `return-flow ${animationDuration}s ease-in-out infinite ${i * (animationDuration / itemCount)}s`,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        {medicalIcons[i % medicalIcons.length]}
      </div>
    ));
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div
        className={`relative w-full h-61 rounded-3xl overflow-hidden transition-all duration-700 cursor-pointer backdrop-blur-lg ${
          isHovered ? 'shadow-2xl scale-[1.01] shadow-red-200/50' : 'shadow-xl shadow-slate-200/60'
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
            <h3 className="text-sm font-semibold text-slate-600 mb-2 tracking-wide">
              {label}
            </h3>
            <div className="flex items-baseline space-x-3">
              <span 
                className="text-3xl font-light tracking-tight"
                style={{ 
                  color: status.color,
                  textShadow: `0 2px 10px ${status.color}20`
                }}
              >
                {displayReturnRate.toFixed(1)}%
              </span>
              <span className="text-sm text-slate-500 font-medium">
                returned
              </span>
            </div>
          </div>
          
          {/* Performance Indicator - Top Right */}
          <div className="absolute top-5 right-35">
            <div 
              className="flex items-center space-x-2 text-xs text-slate-500 px-3 py-1.5 rounded-md backdrop-blur-md"
              style={{ 
                background: 'rgba(255, 255, 255, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              <div 
                className="w-2 h-2 rounded-full animate-pulse shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${status.flowColor}, ${status.color})`,
                  boxShadow: `0 0 10px ${status.flowColor}50`
                }}
              />
              <span className="font-medium">
                {currentReturnRate <= targetReturnRate ? 'OK' : 'HIGH'}
              </span>
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

        {/* Main Return Flow Section - Middle 140px */}
        <div className="absolute top-20 left-0 right-0 h-26 px-6 py-4">
          <div className="relative h-full">
            {/* Return Flow Container */}
            <div className="absolute inset-x-12 inset-y-0">
              {/* Flow Rails */}
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
              
              {/* Main Return Flow Area */}
              <div 
                className="absolute top-4 bottom-4 left-0 right-0 rounded-md overflow-hidden backdrop-blur-sm"
                style={{ 
                  background: `linear-gradient(135deg, ${status.accentColor}, rgba(255,255,255,0.1))`,
                  border: `1px solid rgba(255,255,255,0.2)`,
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)'
                }}
              >
                {/* Moving return flow pattern */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `repeating-linear-gradient(
                      -90deg,
                      ${status.flowColor}30 0px,
                      ${status.flowColor}30 8px,
                      transparent 8px,
                      transparent 16px
                    )`,
                    animation: `return-pattern ${Math.max(4 - (flowIntensity / 3), 1)}s linear infinite`
                  }}
                />
                
                {/* Floating Return Items */}
                <div className="relative h-full">
                  {generateReturnItems()}
                </div>
              </div>
            </div>

            {/* Sales/Distribution Point - Left side */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
              <div 
                className="w-10 h-10 rounded-md mt-4 flex items-center justify-center text-lg shadow-lg backdrop-blur-sm transition-all duration-300"
                style={{ 
                  background: `linear-gradient(135deg, ${status.color}90, ${status.color}70)`,
                  border: `1px solid ${status.color}40`,
                  boxShadow: `0 6px 20px ${status.color}20`
                }}
              >
                {/* Hospital/Healthcare facility icon */}
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
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                  <path d="M9 9v.01" />
                  <path d="M9 12v.01" />
                  <path d="M9 15v.01" />
                  <path d="M9 18v.01" />
                </svg>
              </div>
              <div className="text-xs text-slate-500 mt-1.5 text-center font-medium">
                Sales
              </div>
            </div>
            
            {/* Return Processing Center - Right side */}
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
              <div 
                className="w-10 h-10 rounded-md mt-4 flex items-center justify-center text-lg shadow-lg backdrop-blur-sm transition-all duration-300"
                style={{ 
                  background: `linear-gradient(135deg, ${status.color}90, ${status.color}70)`,
                  border: `1px solid ${status.color}40`,
                  boxShadow: `0 6px 20px ${status.color}20`
                }}
              >
                {/* Return/Recycle facility icon */}
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
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
              </div>
              <div className="text-xs text-slate-500 mt-1.5 text-center font-medium">
                Returns
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
                className="text-lg font-semibold"
                style={{ color: status.color }}
              >
                {returnedItems}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                items/month
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-lg font-semibold text-slate-600">
                {targetReturnRate}%
              </div>
              <div className="text-xs text-slate-500 font-medium">
                target
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-lg font-semibold text-slate-600">
                {industryAverage}%
              </div>
              <div className="text-xs text-slate-500 font-medium">
                industry
              </div>
            </div>

            {trend && (
              <div className="text-center flex-1">
                <div 
                  className="text-lg font-semibold flex items-center justify-center"
                  style={{ 
                    color: trend.direction === 'down' ? '#10B981' : 
                           trend.direction === 'up' ? '#EF4444' : '#64748B'
                  }}
                >
                  <span className="mr-1">
                    {trend.direction === 'up' && '↗'}
                    {trend.direction === 'down' && '↘'}
                    {trend.direction === 'stable' && '→'}
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
        @keyframes return-flow {
          0% { 
            right: -35px; 
            opacity: 0; 
            transform: translateY(-50%) scale(0.8) rotate(0deg);
          }
          15% { 
            opacity: 1; 
            transform: translateY(-50%) scale(1) rotate(5deg);
          }
          85% { 
            opacity: 1; 
            transform: translateY(-50%) scale(1) rotate(-5deg);
          }
          100% { 
            right: calc(100% + 35px); 
            opacity: 0; 
            transform: translateY(-50%) scale(0.8) rotate(0deg);
          }
        }
        
        @keyframes return-pattern {
          0% { transform: translateX(0); }
          100% { transform: translateX(-16px); }
        }
      `}</style>
    </div>
  );
};

export default ReturnRateCard;
