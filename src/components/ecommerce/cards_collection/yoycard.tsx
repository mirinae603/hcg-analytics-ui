"use client"
import React, { useState, useEffect, useRef, useMemo } from 'react';

interface YoYLiquidGaugeProps {
  yoyChange: number;
  label?: string;
  currentValue?: number;
  previousValue?: number;
  period?: string;
  category?: string;
  unit?: string;
  className?: string;
  animated?: boolean;
}

const YoYLiquidGauge: React.FC<YoYLiquidGaugeProps> = ({
  yoyChange,
  label = 'YoY Growth',
  currentValue,
  previousValue,
  period = 'vs Last Year',
  category,
  unit = '%',
  className = '',
  animated = true
}) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [liquidLevel, setLiquidLevel] = useState(50);
  const [waveOffset, setWaveOffset] = useState(0);
  const [particlePositions, setParticlePositions] = useState<Array<{x: number, y: number, opacity: number}>>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [morphShape, setMorphShape] = useState(0); // 0-1 for shape morphing
  
  const animationRef = useRef<number | undefined>(undefined);
  const waveAnimationRef = useRef<number | undefined>(undefined);

  // Dynamic color based on performance
  const getPerformanceColor = (value: number) => {
    if (value >= 15) return { 
      primary: '#00D9FF', secondary: '#0099CC', bg: 'rgba(0, 217, 255, 0.1)',
      name: 'Stellar', glow: '0 0 30px rgba(0, 217, 255, 0.3)'
    };
    if (value >= 5) return { 
      primary: '#10B981', secondary: '#059669', bg: 'rgba(16, 185, 129, 0.1)',
      name: 'Strong', glow: '0 0 30px rgba(16, 185, 129, 0.3)'
    };
    if (value > 0) return { 
      primary: '#22C55E', secondary: '#16A34A', bg: 'rgba(34, 197, 94, 0.1)',
      name: 'Positive', glow: '0 0 30px rgba(34, 197, 94, 0.3)'
    };
    if (value === 0) return { 
      primary: '#94A3B8', secondary: '#64748B', bg: 'rgba(148, 163, 184, 0.1)',
      name: 'Flat', glow: '0 0 30px rgba(148, 163, 184, 0.3)'
    };
    if (value >= -5) return { 
      primary: '#F59E0B', secondary: '#D97706', bg: 'rgba(245, 158, 11, 0.1)',
      name: 'Caution', glow: '0 0 30px rgba(245, 158, 11, 0.3)'
    };
    return { 
      primary: '#EF4444', secondary: '#DC2626', bg: 'rgba(239, 68, 68, 0.1)',
      name: 'Decline', glow: '0 0 30px rgba(239, 68, 68, 0.3)'
    };
  };

  const colors = getPerformanceColor(yoyChange);

  // Calculate target liquid level (inverted for upward flow)
  const targetLiquidLevel = useMemo(() => {
    const normalizedValue = Math.max(-30, Math.min(30, yoyChange));
    return 50 + (normalizedValue / 30) * 40; // 10-90% range
  }, [yoyChange]);

  // Generate floating particles
  useEffect(() => {
    const particles = Array.from({ length: 8 }, (_, i) => ({
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      opacity: 0.3 + Math.random() * 0.4
    }));
    setParticlePositions(particles);
  }, [yoyChange]);

  // Main animation
  useEffect(() => {
    if (!animated) {
      setDisplayPercentage(yoyChange);
      setLiquidLevel(targetLiquidLevel);
      return;
    }

    const duration = 3000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Elastic easing
      const easeOutElastic = (t: number): number => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : 
          Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      };

      const easedProgress = easeOutElastic(progress);
      
      setDisplayPercentage(yoyChange * progress);
      setLiquidLevel(50 + (targetLiquidLevel - 50) * easedProgress);
      setMorphShape(easedProgress);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 200);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [yoyChange, animated, targetLiquidLevel]);

  // Wave animation
  useEffect(() => {
    const animateWave = () => {
      setWaveOffset(prev => (prev + 1) % 360);
      waveAnimationRef.current = requestAnimationFrame(animateWave);
    };
    
    waveAnimationRef.current = requestAnimationFrame(animateWave);
    
    return () => {
      if (waveAnimationRef.current) cancelAnimationFrame(waveAnimationRef.current);
    };
  }, []);

  // SVG path for morphing container
  const getMorphPath = (progress: number) => {
    const morph = Math.sin(progress * Math.PI) * 20;
    return `M 20,50 
            Q 20,${20 - morph} 50,20 
            Q ${80 + morph},20 80,50 
            Q 80,${80 + morph} 50,80 
            Q ${20 - morph},80 20,50 Z`;
  };

  return (
    <div className="relative">
      <div
        className={`relative w-75 h-75 rounded-3xl mb-3 overflow-hidden transition-all duration-700 cursor-pointer ${
          isHovered ? 'scale-101' : 'scale-100'
        } ${className}`}
        style={{
          background: `radial-gradient(circle at 30% 30%, 
            rgba(255, 255, 255, 0.9) 0%, 
            rgba(255, 255, 255, 0.7) 40%,
            ${colors.bg} 100%)`,
          boxShadow: `
            ${colors.glow},
            0 25px 50px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8)
          `,
          border: `2px solid rgba(255, 255, 255, 0.5)`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated SVG Container */}
        <svg 
          className="absolute inset-0 w-full h-full" 
          viewBox="0 0 100 100" 
          style={{ overflow: 'visible' }}
        >
          {/* Morphing liquid shape */}
          <defs>
            <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} stopOpacity="0.9"/>
              <stop offset="50%" stopColor={colors.primary} stopOpacity="0.7"/>
              <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.9"/>
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Floating particles */}
          {particlePositions.map((particle, i) => (
            <circle
              key={i}
              cx={particle.x}
              cy={particle.y}
              r="1"
              fill={colors.primary}
              opacity={particle.opacity}
              style={{
                animation: `float-${i} ${3 + i * 0.5}s ease-in-out infinite`,
                filter: 'url(#glow)'
              }}
            />
          ))}

          {/* Main liquid blob */}
          <ellipse
            cx="50"
            cy={100 - liquidLevel}
            rx={25 + Math.sin(morphShape * Math.PI * 2) * 5}
            ry={15 + Math.cos(morphShape * Math.PI * 3) * 3}
            fill="url(#liquidGradient)"
            style={{
              filter: 'url(#glow)',
              transform: `rotate(${waveOffset * 0.5}deg)`,
              transformOrigin: '50% 50%'
            }}
          />

          {/* Animated wave surface */}
          <path
            d={`M 0,${100 - liquidLevel} 
                Q 25,${100 - liquidLevel - Math.sin(waveOffset * 0.1) * 3} 50,${100 - liquidLevel}
                Q 75,${100 - liquidLevel + Math.sin(waveOffset * 0.1) * 3} 100,${100 - liquidLevel}
                L 100,100 L 0,100 Z`}
            fill={colors.primary}
            opacity="0.6"
            style={{ filter: 'url(#glow)' }}
          />
        </svg>

        {/* Overlaid Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          {/* Main Percentage */}
          <div
            className="text-3xl font-medium mb-30 ml-40 transition-all duration-700"
            style={{
              color: `${colors.primary}80`,
              textShadow: `0 0 20px ${colors.primary}40`,
              transform: `scale(${1 + morphShape * 0.1})`
            }}
          >
            {displayPercentage >= 0 ? '+' : ''}{displayPercentage.toFixed(1)}%
          </div>

          <div 
            className="text-sm font-semibold mb-1"
            style={{ color: colors.secondary }}
          >
            {colors.name} Growth
          </div>

          <div className="text-xs opacity-60 mb-4" style={{ color: colors.secondary }}>
            {period}
          </div>

          {/* Performance Ring */}
         <div className="relative w-16 h-16 mr-auto">
  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
    <path
      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="2"
    />
    <path
      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      fill="none"
      stroke={colors.primary}
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray={`${Math.abs(displayPercentage) * 2}, 100`}
      style={{
        filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))',
        transition: 'stroke-dasharray 1s ease-out',
      }}
    />
  </svg>

  <div className="absolute inset-0 flex items-center justify-center">
    <div 
      className="text-xs font-bold"
      style={{ color: colors.primary }}
    >
      {Math.abs(displayPercentage).toFixed(0)}
    </div>
  </div>
</div>

        </div>

        {/* Floating label */}
        <div 
          className="absolute top-2 left-1 px-3 py-1 rounded-2xl  "
          style={{
            background: 'rgba(255, 255, 255, 0)',
            borderColor: 'rgba(255, 255, 255, 0)',
            color: colors.secondary
          }}
        >
          <div className="text-xs font-medium">{label}</div>
          {category && <div className="text-xs opacity-70">{category}</div>}
        </div>

        {/* Value comparison */}
        {currentValue && previousValue && (
          <div 
            className="absolute bottom-4 right-4 text-right"
            style={{ color: colors.secondary }}
          >
            <div className="text-xs opacity-70">Current</div>
            <div className="text-sm font-bold">
              {currentValue.toLocaleString()} {unit}
            </div>
            <div className="text-xs opacity-50">
              vs {previousValue.toLocaleString()} {unit} 
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        ${particlePositions.map((_, i) => `
          @keyframes float-${i} {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-${10 + i * 2}px) rotate(180deg); }
          }
        `).join('')}
      `}</style>
    </div>
  );
};

export default YoYLiquidGauge;
