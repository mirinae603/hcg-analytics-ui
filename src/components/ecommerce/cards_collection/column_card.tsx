// import React from "react";

// const Card_KPI1 = ({
//   kpi1Label,
//   kpi1Value,
//   kpi1Change,

//   kpi2Label,
//   kpi2Value,
//   kpi2Change,

//   chartData = [40, 60, 75, 45, 85, 65, 95], // percentage values for bars
//   footerLabel = "Last 7 days",
//   liveStatus = true,
// }) => {
//   return (
//     <div className="group relative flex w-80 flex-col rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 border border-gray-100">
//       {/* Elegant gradient border effect */}
//       <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 opacity-0 blur-sm transition-all duration-300 group-hover:opacity-20" />
//       <div className="absolute inset-[1px] rounded-[15px] bg-white" />

//       <div className="relative">
//         {/* KPI Metrics */}
//         <div className="mb-6 grid grid-cols-2 gap-4">
//           <div className="rounded-xl bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 border border-gray-100 hover:border-blue-200 transition-colors duration-200">
//             <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
//               {kpi1Label}
//             </p>
//             <p className="text-2xl font-bold text-gray-800 mt-1">{kpi1Value}</p>
//             <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 mt-2">
//               <svg
//                 className="h-3 w-3"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M7 11l5-5m0 0l5 5m-5-5v12"
//                 />
//               </svg>
//               {kpi1Change}
//             </span>
//           </div>
//           <div className="rounded-xl bg-gradient-to-br from-gray-50 to-purple-50/30 p-4 border border-gray-100 hover:border-purple-200 transition-colors duration-200">
//             <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
//               {kpi2Label}
//             </p>
//             <p className="text-2xl font-bold text-gray-800 mt-1">{kpi2Value}</p>
//             <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 mt-2">
//               <svg
//                 className="h-3 w-3"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M7 11l5-5m0 0l5 5m-5-5v12"
//                 />
//               </svg>
//               {kpi2Change}
//             </span>
//           </div>
//         </div>

//         {/* Chart Section */}
//         <div className="mb-6 h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-indigo-50/50 p-4 border border-gray-100">
//           <div className="flex h-full w-full items-end justify-between gap-1.5">
//             {chartData.map((height, i) => {
//               const colorClass =
//                 i % 3 === 0
//                   ? "from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 bg-blue-100"
//                   : i % 3 === 1
//                   ? "from-indigo-500 to-indigo-400 hover:from-indigo-600 hover:to-indigo-500 bg-indigo-100"
//                   : "from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 bg-purple-100";

//               return (
//                 <div
//                   key={i}
//                   className={`h-[${height}%] w-4 rounded-t-md ${colorClass} relative overflow-hidden`}
//                 >
//                   <div
//                     className={`w-full rounded-t-md bg-gradient-to-t ${colorClass}`}
//                     style={{ height: `${height - 10}%` }}
//                   />
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2 group/dropdown cursor-pointer">
//             <span className="text-sm font-medium text-gray-600">{footerLabel}</span>
//             <svg
//               className="h-4 w-4 text-gray-400 transition-transform duration-200 group-hover/dropdown:text-gray-600 group-hover/dropdown:rotate-180"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M19 9l-7 7-7-7"
//               />
//             </svg>
//           </div>
//           {liveStatus && (
//             <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600 border border-emerald-200">
//               <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
//               Live
//             </span>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Card_KPI1;
