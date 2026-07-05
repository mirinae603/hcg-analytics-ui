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

// Status Icons (same as before)
const ExcellentIcon = () => (
  <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const GoodIcon = () => (
  <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    <path d="M3.5 12h4l2-3 2 6 2-3h4" />
  </svg>
);

const FairIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="m12 17 .01 0" />
  </svg>
);

const PoorIcon = () => (
  <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

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
  const [pulseIntensity, setPulseIntensity] = useState(0);

  // Animate return rate value and flow intensity
  useEffect(() => {
    if (!animated) {
      setDisplayReturnRate(currentReturnRate);
      setFlowIntensity(currentReturnRate);
      setPulseIntensity(currentReturnRate);
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
      setPulseIntensity(currentReturnRate * eased);
      
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
  
  // Return rate status
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
  const returnedItems = Math.round((currentReturnRate / 100) * 1000);

  // Generate floating particles in the circulation system
  const generateCirculationParticles = () => {
    const particleCount = Math.min(Math.max(Math.floor(flowIntensity / 1.2), 2), 8);
    const baseSpeed = Math.max(8 - (flowIntensity / 1.5), 3);
    
    const medicalIcons = [
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-white">
        <path d="m18 2 4 4" />
        <path d="m17 7 3 3" />
        <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
        <path d="m9 11 4 4" />
        <path d="m5 19-3 3" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-white">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-white">
        <path d="M9 12h6" />
        <path d="M12 9v6" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        <path d="M16 16h.01" />
      </svg>
    ];
    
    return Array.from({ length: particleCount }, (_, i) => (
      <div
        key={`${animationKey}-particle-${i}`}
        className="absolute w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${status.flowColor}95, ${status.color}85)`,
          border: `1px solid ${status.flowColor}60`,
          boxShadow: `0 2px 8px ${status.flowColor}40`,
          animation: `circulation-flow ${baseSpeed}s linear infinite ${i * (baseSpeed / particleCount)}s`,
        }}
      >
        {medicalIcons[i % medicalIcons.length]}
      </div>
    ));
  };

  // Generate pulsing waves in the center reactor
  const generatePulseWaves = () => {
    const waveCount = Math.min(Math.floor(pulseIntensity / 1.5) + 1, 4);
    
    return Array.from({ length: waveCount }, (_, i) => (
      <div
        key={`${animationKey}-wave-${i}`}
        className="absolute rounded-full border-2 opacity-40"
        style={{
          width: `${40 + (i * 15)}px`,
          height: `${40 + (i * 15)}px`,
          borderColor: status.flowColor,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: `pulse-wave ${2 + (i * 0.3)}s ease-out infinite ${i * 0.4}s`,
        }}
      />
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

        {/* Header Section */}
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
          
          {/* Performance Indicator */}
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

        {/* Main Circulation System - Revolutionary Design */}
        <div className="absolute top-20 left-0 right-0 h-26 px-4 py-2">
          <div className="relative h-full">
            
            {/* Central Processing Reactor */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm relative overflow-hidden"
                style={{ 
                  background: `radial-gradient(circle, ${status.color}20, ${status.color}40, ${status.color}60)`,
                  border: `2px solid ${status.color}50`,
                  boxShadow: `0 0 30px ${status.color}30, inset 0 0 20px ${status.color}20`
                }}
              >
                {/* Pulsing waves from center */}
                {generatePulseWaves()}
                
                {/* Central icon */}
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-6 h-6 z-10 relative"
                  style={{ color: status.color }}
                >
                  <path d="M12 2v4" />
                  <path d="m16.2 7.8 2.9-2.9" />
                  <path d="M18 12h4" />
                  <path d="m16.2 16.2 2.9 2.9" />
                  <path d="M12 18v4" />
                  <path d="m4.9 19.1 2.9-2.9" />
                  <path d="M2 12h4" />
                  <path d="m4.9 4.9 2.9 2.9" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
            </div>

            {/* Circular Pipeline System */}
            <div className="absolute inset-0">
              {/* Main circulation path - invisible track for particles */}
              <svg 
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 200 100"
                style={{ zIndex: 1 }}
              >
                {/* Outer circulation ring */}
                <ellipse 
                  cx="100" 
                  cy="50" 
                  rx="85" 
                  ry="35" 
                  fill="none" 
                  stroke={status.flowColor} 
                  strokeWidth="3"
                  strokeDasharray="8,4"
                  opacity="0.3"
                  style={{
                    animation: `ring-rotate ${Math.max(6 - (flowIntensity / 2), 2)}s linear infinite`
                  }}
                />
                
                {/* Inner circulation ring */}
                <ellipse 
                  cx="100" 
                  cy="50" 
                  rx="65" 
                  ry="25" 
                  fill="none" 
                  stroke={status.color} 
                  strokeWidth="2"
                  strokeDasharray="5,3"
                  opacity="0.4"
                  style={{
                    animation: `ring-rotate ${Math.max(8 - (flowIntensity / 1.5), 3)}s linear infinite reverse`
                  }}
                />
              </svg>

              {/* Floating particles in circulation */}
              <div className="absolute inset-0" style={{ zIndex: 2 }}>
                {generateCirculationParticles()}
              </div>
            </div>

            {/* Distribution Points */}
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm"
                style={{ 
                  background: `linear-gradient(135deg, ${status.color}90, ${status.color}70)`,
                  border: `1px solid ${status.color}40`,
                  boxShadow: `0 4px 15px ${status.color}20`
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
              </div>
              <div className="text-xs text-slate-500 mt-1 text-center font-medium">Sales</div>
            </div>
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm"
                style={{ 
                  background: `linear-gradient(135deg, ${status.color}90, ${status.color}70)`,
                  border: `1px solid ${status.color}40`,
                  boxShadow: `0 4px 15px ${status.color}20`
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
              </div>
              <div className="text-xs text-slate-500 mt-1 text-center font-medium">Returns</div>
            </div>
          </div>
        </div>

        {/* Bottom Stats Section */}
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
        @keyframes circulation-flow {
          0% { 
            offset-distance: 0%;
            opacity: 0;
            transform: scale(0.8);
          }
          10% { 
            opacity: 1;
            transform: scale(1);
          }
          90% { 
            opacity: 1;
            transform: scale(1);
          }
          100% { 
            offset-distance: 100%;
            opacity: 0;
            transform: scale(0.8);
          }
        }
        
        @keyframes circulation-flow {
          0% {
            transform: rotate(0deg) translateX(85px) rotate(0deg);
            opacity: 0;
            scale: 0.8;
          }
          10% {
            opacity: 1;
            scale: 1;
          }
          90% {
            opacity: 1;
            scale: 1;
          }
          100% {
            transform: rotate(360deg) translateX(85px) rotate(-360deg);
            opacity: 0;
            scale: 0.8;
          }
        }
        
        @keyframes pulse-wave {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0.8;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
        
        @keyframes ring-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ReturnRateCard;
