// import React from 'react';
// import StockLevelCard from './inventoryQuantityCard'; // Adjust the import path as needed
// import InventoryValuationCard from './inventoryValuationCard';
// import ITRCard from './itr2Card';
// // import ReturnRateCard from './returnRateCard';
// import ReturnRateCard from './returnRate4Card';
// import StockAgingCard from './agingCard';
// import DOHCard from './dohCard';
// const AnalyticsDashboardLayout: React.FC = () => {

//     const stockData = {
//     fresh: 2422,      // 0-30 days
//     aging: 481,       // 31-60 days
//     problem: 604,     // 91-180 days
//     deadStock: 476     // 180+ days
//   };
//   const sampleData = {
//     currentReturnRate: 4.96,
//     historicalData: {
//       thirtyDaysAgo: 4.77,
//       sixtyDaysAgo: 4.23,
//       ninetyDaysAgo: 6.13
//     },
//     trend: {
//       direction: 'up' as const,
//       percentage: 4.1,
//       period: '30d'
//     },
//     targetReturnRate: 3.4,
//     industryAverage: 4.8
//   };
//   return (
//     <div className="space-y-10 p-0">
//       {/* Row 1 - KPI Card and Two Stock Cards */}
//       <div className="flex flex-wrap lg:flex-nowrap gap-6 items-start w-full px-4">
//         {/* Left Component - KPI Analytics Card */}
//         <div className="w-full lg:w-[33.33%]">
//           <div className="relative w-full max-w-md mx-auto lg:mx-0">
//             {/* Ambient lighting - enhanced default state */}
//             <div className="absolute -top-6 -bottom-6 -left-6 -right-6 rounded-full animate-pulse opacity-20 hover:opacity-30 transition-opacity duration-1000"
//                  style={{
//                    background: 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 0%, transparent 70%)',
//                    animationDuration: '4s'
//                  }}></div>

//             {/* Main container */}
//             <div className="relative group cursor-default">
//               {/* Enhanced magnetic hover effect background with visible default state */}
//               <div className="absolute inset-0 bg-gradient-to-r from-slate-200/30 to-slate-300/30 
//                               group-hover:from-blue-100/40 group-hover:to-blue-200/40
//                               rounded-4xl transform scale-95 group-hover:scale-100 
//                               transition-all duration-700 ease-out backdrop-blur-sm"></div>

//               {/* Content wrapper with subtle default background */}
//               <div className="relative p-8 bg-gradient-to-br from-slate-50/50 to-slate-100/30 rounded-4xl
//                               group-hover:from-blue-50/60 group-hover:to-blue-50/40 
//                               transition-all duration-500 backdrop-blur-sm border border-slate-50/50 
//                               group-hover:border-blue-50/20 overflow-hidden">
                
//                 {/* Radial blue transition overlay */}
//                 <div className="absolute inset-0 bg-gradient-radial from-blue-100/30 via-blue-50/20 to-transparent 
//                                 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out
//                                 transform scale-0 group-hover:scale-150 rounded-full
//                                 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 w-full h-full"></div>
                
//                 {/* Floating geometric elements */}
//                 <div className="absolute top-3 right-2 w-10 h-10 opacity-15 group-hover:opacity-25 transition-opacity duration-500 z-10">
//                   <div className="w-full h-full border-2 border-slate-400 group-hover:border-blue-300 rounded-full animate-spin"
//                        style={{ animationDuration: '20s' }}></div>
//                   <div className="absolute inset-2 border border-slate-500 group-hover:border-blue-400 rounded-full animate-spin"
//                        style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
//                 </div>
//                 <div className="absolute top-3 left-2 w-10 h-10 opacity-15 group-hover:opacity-25 transition-opacity duration-500 z-10">
//                   <div className="w-full h-full border-2 border-slate-400 group-hover:border-blue-300 rounded-full animate-spin"
//                        style={{ animationDuration: '20s' }}></div>
//                   <div className="absolute inset-2 border border-slate-500 group-hover:border-blue-400 rounded-full animate-spin"
//                        style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
//                 </div>

//                 {/* Main heading structure */}
//                 <div className="text-center space-y-0 relative z-10">
//                   {/* Top section */}
//                   <div className="relative">
//                     {/* Main title */}
//                     <h1 className="text-4xl mt-8 font-semibold text-slate-500 group-hover:text-blue-400 transform group-hover:scale-105 
//                                    transition-all duration-500 relative drop-shadow-sm"
//                         style={{ letterSpacing: '-0.02em' }}>
//                       Analytics KPI's

//                       {/* Underline effect */}
//                       <div className="absolute -bottom-1 mt-2 left-1/2 transform -translate-x-1/2 w-8 h-0.5 
//                                       bg-gradient-to-r from-slate-400 to-slate-500 
//                                       group-hover:from-blue-300 group-hover:to-blue-400 
//                                       group-hover:w-24 transition-all duration-700"></div>
//                     </h1>
//                   </div>

//                   {/* Separator with animation */}
//                   <div className="flex items-center justify-center space-x-3 py-4">
//                     <div className="w-6 h-px bg-slate-400 group-hover:bg-blue-400 group-hover:w-12 transition-all duration-500"
//                          style={{ transitionDelay: '100ms' }}></div>

//                     <div className="relative">
//                       <div className="w-2.5 h-2.5 bg-slate-500 group-hover:bg-blue-500 rounded-full transition-colors duration-300 shadow-sm"></div>
//                       <div className="absolute inset-0 w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping group-hover:animate-none opacity-0 group-hover:opacity-75"></div>
//                     </div>

//                     <div className="w-6 h-px bg-slate-400 group-hover:bg-blue-400 group-hover:w-12 transition-all duration-500"
//                          style={{ transitionDelay: '200ms' }}></div>
//                   </div>

//                   {/* Subtitle */}
//                   <div className="relative">
//                     <h2 className="text-sm mt-5 font-medium text-slate-500 group-hover:text-blue-400 uppercase transition-colors duration-300"
//                         style={{ letterSpacing: '0.25em' }}>
//                       Supply Chain
//                     </h2>

//                     {/* Progress indicators */}
//                     <div className="flex justify-center mt-3 space-x-1.5">
//                       {[...Array(5)].map((_, i) => (
//                         <div key={i}
//                              className="w-0.5 bg-slate-400 group-hover:bg-blue-500 rounded-full transition-all duration-300 shadow-sm"
//                              style={{
//                                height: `${(i + 1) * 3}px`,
//                                transitionDelay: `${i * 50}ms`
//                              }}></div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Right - Two Stock Cards */}
//         {/* <div className="flex flex-col sm:flex-row gap-6 flex-1 min-w-0"> */}
//           <div className="w-full lg:w-[33.33%]">
//             <StockLevelCard
//         currentStock={648021}
//         stockValue={55380884}
//         lastMonthRevenue={13795826}
//         maxStockValue = {131834983}
//         monthlyRevenueTarget={14426530}
//         margin={18.5}
//         unit="Units"
//         currency="₹"
//         label="Product A Inventory"
//         lowStockThreshold={507356}
//         location="Bangalore"
//         supplier="BidEasy"
//         lastUpdated="2 mins ago"
//       />
//           </div>
//           <div className="w-full lg:w-[33.33%]">
         
//  <StockAgingCard 
//         agingData={stockData}
//         label="Inventory Aging"
//         animated={true}
//       />

//           </div>
//         {/* </div> */}
//       </div>

//       {/* Row 2 - Three Stock Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 -mt-3">
//         {/* <ITRCard
//         currentITR={5.2}
//         label="Q3 Inventory Turnover"
//         trend={{
//           direction: 'up',
//           percentage: 15.3,
//           period: 'vs Q2',
//           previousValue: 8.8,
//           valueChange: 1.4
//         }}
//         targetITR={12}
//         industryAverage={8.5}
//         daysInInventory={36} // Will be auto-calculated if not provided
//         lastCalculation="2025-09-01"
//         category="Electronics"
//         location="North America"
//         lastUpdated="2025-09-05"
//         className="hover:shadow-2xl"
//         animated={true}
//       /> */}
//        <DOHCard 
//   daysOnHand={140}
//   trend={{
//     direction: 'down',
//     percentage: 12,
//     period: 'vs last month',
//     previousValue: 52
//   }}
//   criticalThreshold={7}
//   optimalRange={{ min: 90, max: 180 }}
//   category="Raw Materials"
//   location="Bangalore"
//   lastCalculated="2 hours ago"
//   animated={true}
// />
//         {/* <ReturnRateCard
//   currentReturnRate={0.3}
//   trend={{
//     direction: 'down',
//     percentage: 8,
//     period: 'vs last month'
//   }}
//   targetReturnRate={2.0}
//   industryAverage={3.5}
//   animated={true}
// /> */}
// <ReturnRateCard {...sampleData} />
// {/* <StockLevelCard
//           currentStock={880}
//           unit="Units"
//           label="Current Stock Level"
//           lowStockThreshold={1000}
//           trend={{
//             direction: 'up',
//             percentage: 12.5,
//             period: 'last Week',
//           }}
//         /> */}
//       <ITRCard
//         currentITR={0.69}
//         label="Inventory TurnOver Ratio"
//         trend={{
//           direction: 'up',
//           percentage: 86.4,
//           period: 'vs last Month'
//         }}
//         targetITR={0.44}
//         industryAverage={0.27}
//         className="hover:shadow-2xl"
//         animated={true}
//       />
//       </div>
//     </div>
//   );
// };

// export default AnalyticsDashboardLayout;
