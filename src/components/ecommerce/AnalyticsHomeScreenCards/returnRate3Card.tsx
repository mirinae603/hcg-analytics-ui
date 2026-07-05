// import React, { useState, useEffect, useMemo } from 'react';

// interface ReturnRateCardProps {
//   currentReturnRate: number;
//   label?: string;
//   trend?: {
//     direction: 'up' | 'down' | 'stable';
//     percentage?: number;
//     period?: string;
//   };
//   targetReturnRate?: number;
//   industryAverage?: number;
//   className?: string;
//   animated?: boolean;
// }

// // Memoized status icons to prevent re-renders
// const StatusIcons = {
//   excellent: React.memo(() => (
//     <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//       <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
//       <path d="m9 12 2 2 4-4" />
//     </svg>
//   )),
//   good: React.memo(() => (
//     <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//       <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
//       <path d="M3.5 12h4l2-3 2 6 2-3h4" />
//     </svg>
//   )),
//   fair: React.memo(() => (
//     <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//       <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
//       <path d="M12 9v4" />
//       <path d="m12 17 .01 0" />
//     </svg>
//   )),
//   poor: React.memo(() => (
//     <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//       <circle cx="12" cy="12" r="10" />
//       <path d="m15 9-6 6" />
//       <path d="m9 9 6 6" />
//     </svg>
//   )),
//   critical: React.memo(() => (
//     <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//       <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
//       <line x1="12" y1="8" x2="12" y2="12" />
//       <line x1="12" y1="16" x2="12.01" y2="16" />
//     </svg>
//   ))
// };

// const ReturnRateCard: React.FC<ReturnRateCardProps> = ({
//   currentReturnRate,
//   label = 'Return Rate',
//   trend,
//   targetReturnRate = 2.0,
//   industryAverage = 3.5,
//   className = '',
//   animated = true
// }) => {
//   const [displayReturnRate, setDisplayReturnRate] = useState(animated ? 0 : currentReturnRate);
//   const [isHovered, setIsHovered] = useState(false);

//   // Memoized calculations to prevent recalculation
//   const calculations = useMemo(() => {
//     const returnedItems = Math.round((currentReturnRate / 100) * 1000);
//     const itemCount = Math.min(Math.max(Math.floor(currentReturnRate / 1.2), 1), 4); // Reduced max items
//     const journeySpeed = Math.max(6 - (currentReturnRate / 2), 3); // Faster base speed
    
//     return { returnedItems, itemCount, journeySpeed };
//   }, [currentReturnRate]);

//   // Memoized status calculation
//   const status = useMemo(() => {
//     if (currentReturnRate <= 1.0) return { 
//       status: 'excellent' as const, 
//       color: '#10B981',
//       flowColor: '#34D399',
//       gradientFrom: '#F0FDF4',
//       gradientTo: '#DCFCE7',
//       icon: <StatusIcons.excellent />
//     };

//     if (currentReturnRate <= 2.0) return { 
//       status: 'good' as const, 
//       color: '#0EA5E9',
//       flowColor: '#06B6D4',
//       gradientFrom: '#F0F9FF',
//       gradientTo: '#E0F2FE',
//       icon: <StatusIcons.good />
//     };

//     if (currentReturnRate <= 4.0) return { 
//       status: 'fair' as const, 
//       color: '#F59E0B',
//       flowColor: '#FBBF24',
//       gradientFrom: '#FFFBEB',
//       gradientTo: '#FEF3C7',
//       icon: <StatusIcons.fair />
//     };

//     if (currentReturnRate <= 7.0) return { 
//       status: 'poor' as const, 
//       color: '#F97316',
//       flowColor: '#FB923C',
//       gradientFrom: '#FFF7ED',
//       gradientTo: '#FFEDD5',
//       icon: <StatusIcons.poor />
//     };

//     return { 
//       status: 'critical' as const, 
//       color: '#EF4444',
//       flowColor: '#F87171',
//       gradientFrom: '#FEF2F2',
//       gradientTo: '#FECACA',
//       icon: <StatusIcons.critical />
//     };
//   }, [currentReturnRate]);

//   // Optimized animation with requestAnimationFrame batching
//   useEffect(() => {
//     if (!animated) {
//       setDisplayReturnRate(currentReturnRate);
//       return;
//     }
    
//     let animationId: number;
//     const duration = 2000; // Reduced duration
//     const startTime = performance.now();
    
//     const animate = (currentTime: number) => {
//       const elapsed = currentTime - startTime;
//       const progress = Math.min(elapsed / duration, 1);
//       const eased = progress * (2 - progress); // Simpler easing function
      
//       setDisplayReturnRate(currentReturnRate * eased);
      
//       if (progress < 1) {
//         animationId = requestAnimationFrame(animate);
//       }
//     };
    
//     animationId = requestAnimationFrame(animate);
//     return () => cancelAnimationFrame(animationId);
//   }, [currentReturnRate, animated]);

//   // Pre-calculated return reasons (static)
//   const returnReasons = useMemo(() => [
//     { icon: '🔧', reason: 'Defect', color: '#EF4444' },
//     { icon: '📅', reason: 'Expired', color: '#F59E0B' },
//     { icon: '❌', reason: 'Wrong', color: '#F97316' },
//     { icon: '📦', reason: 'Damaged', color: '#DC2626' }
//   ], []);

//   // Memoized journey items - only create when needed
//   const journeyItems = useMemo(() => {
//     const { itemCount, journeySpeed } = calculations;
    
//     return Array.from({ length: itemCount }, (_, i) => {
//       const reason = returnReasons[i % returnReasons.length];
      
//       return (
//         <div
//           key={`journey-${i}`}
//           className="absolute flex flex-col items-center will-change-transform"
//           style={{
//             // Use CSS custom properties for better performance
//             '--journey-speed': `${journeySpeed}s`,
//             '--delay': `${i * (journeySpeed / itemCount)}s`,
//             animation: `return-journey var(--journey-speed) ease-in-out infinite var(--delay)`,
//           }}
//         >
//           <div 
//             className="w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold shadow-md border"
//             style={{
//               background: `${reason.color}CC`, // Simplified gradient
//               borderColor: `${reason.color}80`,
//               color: 'white',
//             }}
//           >
//             {reason.icon}
//           </div>
          
//           <div 
//             className="mt-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white border opacity-0"
//             style={{
//               borderColor: reason.color,
//               color: reason.color,
//               fontSize: '9px',
//               animation: `reason-reveal var(--journey-speed) ease-in-out infinite var(--delay)`
//             }}
//           >
//             {reason.reason}
//           </div>
//         </div>
//       );
//     });
//   }, [calculations, returnReasons]);

//   // Simplified ripples with reduced count
//   const impactRipples = useMemo(() => {
//     const rippleCount = Math.min(Math.floor(currentReturnRate / 2) + 1, 2); // Max 2 ripples
    
//     return Array.from({ length: rippleCount }, (_, i) => (
//       <div
//         key={`ripple-${i}`}
//         className="absolute rounded-full border-2 pointer-events-none will-change-transform"
//         style={{
//           width: '16px',
//           height: '16px',
//           borderColor: status.flowColor,
//           opacity: 0,
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           animation: `impact-ripple ${2.5 + (i * 0.5)}s ease-out infinite ${i * 1}s`,
//         }}
//       />
//     ));
//   }, [currentReturnRate, status.flowColor]);

//   return (
//     <div className="relative w-full max-w-lg mx-auto">
//       <div
//         className={`relative w-full h-61 rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer backdrop-blur-lg ${
//           isHovered ? 'shadow-2xl scale-[1.01]' : 'shadow-xl'
//         } ${className}`}
//         style={{
//           background: `linear-gradient(135deg, ${status.gradientFrom} 0%, ${status.gradientTo} 50%, rgba(255,255,255,0.9) 100%)`,
//           border: `1px solid rgba(255,255,255,0.3)`,
//         }}
//         onMouseEnter={() => setIsHovered(true)}
//         onMouseLeave={() => setIsHovered(false)}
//       >
//         {/* Header Section */}
//         <div className="absolute top-0 left-0 right-0 h-20 p-5 flex justify-between items-start">
//           <div className="flex-1">
//             <h3 className="text-sm font-semibold text-slate-600 mb-2 tracking-wide">
//               {label}
//             </h3>
//             <div className="flex items-baseline space-x-3">
//               <span 
//                 className="text-3xl font-light tracking-tight"
//                 style={{ 
//                   color: status.color,
//                 }}
//               >
//                 {displayReturnRate.toFixed(1)}%
//               </span>
//               <span className="text-sm text-slate-500 font-medium">
//                 returned
//               </span>
//             </div>
//           </div>
          
//           {/* Performance Indicator */}
//           <div className="absolute top-5 right-35">
//             <div className="flex items-center space-x-2 text-xs text-slate-500 px-3 py-1.5 rounded-md bg-white bg-opacity-25">
//               <div 
//                 className="w-2 h-2 rounded-full animate-pulse"
//                 style={{ 
//                   backgroundColor: status.flowColor,
//                 }}
//               />
//               <span className="font-medium">
//                 {currentReturnRate <= targetReturnRate ? 'OK' : 'HIGH'}
//               </span>
//             </div>
//           </div>

//           <div
//             className="px-2 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition-all duration-300 ml-0 flex items-center"
//             style={{
//               background: `${status.color}20`,
//               color: status.color,
//             }}
//           >
//             {status.icon}
//             <span className="ml-1">
//               {status.status === 'excellent' ? 'Excellence' :
//                status.status === 'good' ? 'Healthy' :
//                status.status === 'fair' ? 'Caution' :
//                status.status === 'poor' ? 'Poor' : 'Critical'}
//             </span>
//           </div>
//         </div>

//         {/* Main Return Journey Visualization */}
//         <div className="absolute top-20 left-0 right-0 h-26 px-6 py-4">
//           <div className="relative h-full">
            
//             {/* Healthcare Facility (Source) */}
//             <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
//               <div 
//                 className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg relative"
//                 style={{ 
//                   background: `${status.color}30`,
//                   border: `2px solid ${status.color}50`,
//                 }}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" style={{ color: status.color }}>
//                   <path d="M9 12h6" />
//                   <path d="M12 9v6" />
//                   <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
//                   <path d="M16 16h.01" />
//                 </svg>
                
//                 <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white font-bold"
//                      style={{ background: status.flowColor }}>
//                   {calculations.itemCount}
//                 </div>
//               </div>
//               <div className="text-xs text-slate-500 mt-2 text-center font-medium">Hospital</div>
//             </div>

//             {/* Return Journey Path */}
//             <div className="absolute inset-x-16 top-1/2 transform -translate-y-1/2">
//               <div className="relative h-16">
//                 {/* Simplified journey path */}
//                 <div 
//                   className="absolute top-6 left-0 right-0 h-1 rounded-full"
//                   style={{ 
//                     background: `linear-gradient(90deg, ${status.color}30, ${status.flowColor}20, ${status.color}30)`,
//                   }}
//                 />
                
//                 {/* Optimized dotted line with CSS animation */}
//                 <div 
//                   className="absolute top-9 left-0 right-0 h-0.5 rounded-full opacity-40"
//                   style={{ 
//                     background: `repeating-linear-gradient(90deg, ${status.flowColor} 0px, ${status.flowColor} 3px, transparent 3px, transparent 6px)`,
//                     animation: `path-flow 4s linear infinite`
//                   }}
//                 />

//                 {/* Memoized journey items */}
//                 <div className="absolute inset-0">
//                   {journeyItems}
//                 </div>
//               </div>
//             </div>

//             {/* Return Processing Center */}
//             <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
//               <div 
//                 className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden"
//                 style={{ 
//                   background: `${status.color}40`,
//                   border: `2px solid ${status.color}60`,
//                 }}
//               >
//                 {impactRipples}
                
//                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 z-10 relative" style={{ color: status.color }}>
//                   <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
//                   <path d="M21 3v5h-5" />
//                   <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
//                   <path d="M8 16H3v5" />
//                 </svg>
                
//                 <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white font-bold animate-pulse"
//                      style={{ background: status.flowColor }}>
//                   ⚡
//                 </div>
//               </div>
//               <div className="text-xs text-slate-500 mt-2 text-center font-medium">Returns</div>
//             </div>
//           </div>
//         </div>

//         {/* Bottom Stats Section */}
//         <div className="absolute -bottom-3 left-0 right-0 h-24 p-4">
//           <div className="h-full flex justify-between items-center px-4 rounded-3xl bg-white bg-opacity-20">
//             <div className="text-center flex-1">
//               <div 
//                 className="text-lg font-semibold"
//                 style={{ color: status.color }}
//               >
//                 {calculations.returnedItems}
//               </div>
//               <div className="text-xs text-slate-500 font-medium">
//                 items/month
//               </div>
//             </div>
            
//             <div className="text-center flex-1">
//               <div className="text-lg font-semibold text-slate-600">
//                 {targetReturnRate}%
//               </div>
//               <div className="text-xs text-slate-500 font-medium">
//                 target
//               </div>
//             </div>
            
//             <div className="text-center flex-1">
//               <div className="text-lg font-semibold text-slate-600">
//                 {industryAverage}%
//               </div>
//               <div className="text-xs text-slate-500 font-medium">
//                 industry
//               </div>
//             </div>

//             {trend && (
//               <div className="text-center flex-1">
//                 <div 
//                   className="text-lg font-semibold flex items-center justify-center"
//                   style={{ 
//                     color: trend.direction === 'down' ? '#10B981' : 
//                            trend.direction === 'up' ? '#EF4444' : '#64748B'
//                   }}
//                 >
//                   <span className="mr-1">
//                     {trend.direction === 'up' && '↗'}
//                     {trend.direction === 'down' && '↘'}
//                     {trend.direction === 'stable' && '→'}
//                   </span>
//                   {trend.percentage}%
//                 </div>
//                 <div className="text-xs text-slate-500 font-medium">
//                   {trend.period}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Optimized CSS animations - moved to single style block */}
//       <style jsx>{`
//         @keyframes return-journey {
//           0% { 
//             left: 0%;
//             opacity: 0;
//             transform: translateY(-50%) scale(0.9);
//           }
//           15%, 85% { 
//             opacity: 1;
//             transform: translateY(-50%) scale(1);
//           }
//           100% { 
//             left: 100%;
//             opacity: 0;
//             transform: translateY(-50%) scale(0.9);
//           }
//         }
        
//         @keyframes reason-reveal {
//           0%, 25%, 75%, 100% { opacity: 0; }
//           35%, 65% { opacity: 1; }
//         }
        
//         @keyframes impact-ripple {
//           0% { width: 16px; height: 16px; opacity: 0.6; }
//           100% { width: 48px; height: 48px; opacity: 0; }
//         }
        
//         @keyframes path-flow {
//           0% { transform: translateX(0); }
//           100% { transform: translateX(-6px); }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default React.memo(ReturnRateCard);
