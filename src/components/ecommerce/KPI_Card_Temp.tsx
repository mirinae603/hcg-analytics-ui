// // StockKPICards.tsx
// "use client";
// import React, { useState, useEffect } from 'react';

// import ActivityStats from './cards_collection/line_plot_card_blue';
// interface KPICardProps {
//   title: string;
//   value: string | number;
//   subtitle?: string;
//   trend?: 'up' | 'down' | 'neutral';
//   trendValue?: string;
//   icon: React.ReactNode;
//   isLoading?: boolean;
//   sparklineData?: number[];
//   size?: 'normal' | 'wide';
// }

// import Card_KPI1 from "@/components/ecommerce/cards_collection/column_card"
// import StockLevelCard from "@/components/ecommerce/cards_collection/stocklevelcard"
// const KPICard: React.FC<KPICardProps> = ({
//   title,
//   value,
//   subtitle,
//   trend = 'neutral',
//   trendValue,
//   icon,
//   isLoading = false,
//   sparklineData = [],
//   size = 'normal'
// }) => {
//   const [animatedValue, setAnimatedValue] = useState<number>(0);

//   useEffect(() => {
//     if (typeof value === 'number') {
//       const timer = setTimeout(() => {
//         setAnimatedValue(value);
//       }, 300);
//       return () => clearTimeout(timer);
//     }
//   }, [value]);

//   const getTrendColor = (): string => {
//     switch (trend) {
//       case 'up': return 'text-emerald-600 bg-emerald-50';
//       case 'down': return 'text-red-600 bg-red-50';
//       default: return 'text-gray-600 bg-gray-50';
//     }
//   };

//   const getTrendIcon = (): React.ReactNode => {
//     switch (trend) {
//       case 'up': return (
//         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
//           <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
//         </svg>
//       );
//       case 'down': return (
//         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
//           <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 15.586l5.293-5.293a1 1 0 011.414 0z" clipRule="evenodd" />
//         </svg>
//       );
//       default: return (
//         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
//           <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
//         </svg>
//       );
//     }
//   };

//   return (
//     <div className={`bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-blue-100 transition-all duration-500 ease-out hover:-translate-y-1 ${size === 'wide' ? 'md:col-span-2' : ''}`}>
      
//       {/* Header */}
//       <div className="flex items-start justify-between mb-6">
//         <div className="flex items-center space-x-3">
//           <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center text-xl shadow-sm">
//             {icon}
//           </div>
//           <div>
//             <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
//               {title}
//             </h3>
//             {subtitle && (
//               <p className="text-xs text-gray-500 mt-1">
//                 {subtitle}
//               </p>
//             )}
//           </div>
//         </div>
        
//         {trendValue && (
//           <div className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-medium ${getTrendColor()}`}>
//             {getTrendIcon()}
//             <span>{trendValue}</span>
//           </div>
//         )}
//       </div>

//       {/* Main Value */}
//       <div className="mb-4">
//         {isLoading ? (
//           <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
//         ) : (
//           <div className="text-3xl font-bold text-gray-900 tabular-nums">
//             {typeof value === 'number' ? animatedValue.toLocaleString() : value}
//           </div>
//         )}
//       </div>

//       {/* Sparkline for wide cards */}
//       {sparklineData.length > 0 && (
//         <div className="h-16 mb-2">
//           <svg width="100%" height="100%" className="overflow-visible">
//             <defs>
//               <linearGradient id={`area-${title.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
//                 <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1"/>
//                 <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
//               </linearGradient>
//             </defs>
            
//             {/* Area fill */}
//             <path
//               d={`M 0,60 ${sparklineData.map((point, index) => 
//                 `L ${(index / (sparklineData.length - 1)) * 100}%,${60 - (point / Math.max(...sparklineData)) * 50}`
//               ).join(' ')} L 100%,60 Z`}
//               fill={`url(#area-${title.replace(/\s+/g, '')})`}
//             />
            
//             {/* Line */}
//             <polyline
//               points={sparklineData.map((point, index) => 
//                 `${(index / (sparklineData.length - 1)) * 100}%,${60 - (point / Math.max(...sparklineData)) * 50}`
//               ).join(' ')}
//               stroke="#3B82F6"
//               strokeWidth="2"
//               fill="none"
//               className="drop-shadow-sm"
//             />
//           </svg>
//         </div>
//       )}

//       {/* Bottom accent */}
//       <div className="w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full opacity-20" />
//     </div>
//   );
// };

// const StockKPICards: React.FC = () => {
//   const [isLoading, setIsLoading] = useState<boolean>(true);

//   useEffect(() => {
//     const timer = setTimeout(() => setIsLoading(false), 1200);
//     return () => clearTimeout(timer);
//   }, []);

//   // Sample data for sparklines
//   const stockData = [100, 105, 98, 110, 115, 108, 120, 125, 118, 130, 135, 145];
//   const yoyData = [95, 97, 100, 103, 105, 107, 108, 110, 112, 115, 118, 120];

//   return (
//     <div className="space-y-6 p-0">
//       {/* <KPICard
//           title="Current Stock"
//           value={12450}
//           subtitle="Total available units"
//           trend="neutral"
//           trendValue="Live"
//           icon="📦"
//           isLoading={isLoading}
//           size="wide"
//           sparklineData={stockData}
//         /> */}

//         {/* <KPICard
//           title="YoY Growth"
//           value="+8.2%"
//           subtitle="Year over year change"
//           trend="up"
//           trendValue="+2.1%"
//           icon="📈"
//           isLoading={isLoading}
//           size="wide"
//           sparklineData={yoyData}
//         /> */}
//       {/* Top Row - Main metrics */}
//       <div className="flex gap-4 w-full">
//   {/* First Component - 60% width */}
//   <div className="w-[40%]">
//     <ActivityStats 
//       data={[
//         { day: 'Sept', value: 25 },
//         { day: 'Oct', value: 35 },
//         { day: 'Nov', value: 20 },
//         { day: 'Dec', value: 50 },
//         { day: 'Jan', value: 30 },
//         { day: 'Feb', value: 15 },
//         { day: 'Mar', value: 45 }
//       ]}
//     />
//   </div>

//   {/* Second Component - 20% width */}
//   <div className="w-[30%]">
//     <StockLevelCard
//       currentStock={880}
//       unit="Units"
//       label="Current Stock Level"
//       lowStockThreshold={1000}
//       trend={{
//         direction: 'up',
//         percentage: 12.5,
//         period: 'last Week'
//       }}
//     />
//   </div>

//   {/* Third Component - 20% width */}
//   <div className="w-[20%]">
//     <StockLevelCard
//       currentStock={150}
//       unit="Items"
//       label="Current Stock Level"
//       lowStockThreshold={1000}
//       trend={{
//         direction: 'down',
//         percentage: 12.5,
//         period: 'last Week'
//       }}
//     />
//   </div>
// </div>


//       {/* Middle Row - Secondary metrics */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//       {/* <div className="lg:col-span-2">
//         <StockLevelCard
//   currentStock={8750}
//   unit="Products"
//   label="Current Stock Level"
//   lowStockThreshold={10000}
//   trend={{
//     direction: 'down',
//     percentage: 5.2,
//     period: 'last week'
//   }}
// />
// </div>
// <div className="lg:col-span-2">
// <StockLevelCard
//   currentStock={150}
//   unit="Items"
//   label="Critical Items"
//   lowStockThreshold={1000}
//   trend={{
//     direction: 'down',
//     percentage: 12.5,
//     period: 'yesterday'
//   }}
// />
// </div>
// <div className="lg:col-span-2">
// <StockLevelCard
//   currentStock={25000}
//   unit="Units"
//   label="Main Warehouse"
//   lowStockThreshold={5000}
//   trend={{
//     direction: 'up',
//     percentage: 8.3,
//     period: 'this month'
//   }}
// />
// </div> */}
//         {/* <KPICard
//           title="12M Average"
//           value={11875}
//           subtitle="Rolling 12-month average"
//           trend="neutral"
//           trendValue="Stable"
//           icon="🔄"
//           isLoading={isLoading}
//         />

//         <KPICard
//           title="Stock Events"
//           value="3 | 5"
//           subtitle="Stockouts | Overstocks"
//           trend="down"
//           trendValue="-40%"
//           icon="⚠️"
//           isLoading={isLoading}
//         />

//         <KPICard
//           title="Days on Hand"
//           value={45}
//           subtitle="Current inventory days"
//           trend="up"
//           trendValue="+5 days"
//           icon="📊"
//           isLoading={isLoading}
//         /> */}

//       </div>


//     </div>
//   );
// };

// export default StockKPICards;
