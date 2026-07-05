// "use client";
// import React, { useEffect, useState } from "react";
// import { ApexOptions } from "apexcharts";
// import dynamic from "next/dynamic";
// import ChartTab from "../common/ChartTab";
// import DropdownWithSearch from "../common/FilterSearch";
// import { useRegion } from '@/context/RegionContext'
// const ReactApexChart = dynamic(() => import("react-apexcharts"), {
//   ssr: false,
// });

// interface StockChangeData {
//   "First Date of the Week": string;
//   "Return Rate (%)": string;
// }

// interface MaterialOption {
//   Material: string;
//   "Material Description": string;
// }

// type TabType = "optionOne" | "optionTwo" ; 

// export default function StatisticsChart_KPI_4() {
//     const [selectedTab, setSelectedTab] = useState<TabType>("optionOne");
//     const [rawData, setRawData] = useState<StockChangeData[]>([]);
//     const [showChart, setShowChart] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const [selectedFilter, setSelectedFilter] = useState<MaterialOption | null>(null);
//     const [optionsFilter, setOptionsFilter] = useState<MaterialOption[]>([]);
//     const { selectedRegion } = useRegion()

//   useEffect(() => {
//   fetch("/material_descriptions.json")
//     .then((res) => res.json())
//     .then((data: MaterialOption[]) => {
//       setOptionsFilter(data);
//       setSelectedFilter(data[0]); // default selection
//     })
//     .catch((err) => console.error("Failed to load options:", err));
// }, []);

//   const [series, setSeries] = useState([
//     {
//       name: "Stock Change",
//       data: [] as number[],
//     },
//   ]);
//   const [categories, setCategories] = useState<string[]>([
//   "Jan", "Feb", "Mar", "Apr", "May", "Jun",
//   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
// ]);

  
//  useEffect(() => {
//    const fetchData = async () => {
//      if (!selectedFilter) return;
 
//      try {
//        setIsLoading(true);
//        const viewType = selectedTab === "optionTwo" ? "weekly" : "monthly";
//        const res = await fetch(`http://localhost:8000/kpi_4?Plant=CHENNAI&Material=${selectedFilter.Material}&ViewType=${viewType}`);
//        const data: StockChangeData[] = await res.json();
//        setRawData(data);
//        console.log("Recieved KPI 4 Chart Data : ", data)
//        setTimeout(() => {
//          setShowChart(true);
//          setIsLoading(false);
//        }, 300);
//      } catch (err) {
//        console.error("Failed to fetch chart data:", err);
//        setIsLoading(false);
//      }
//    };
 
//    fetchData();
//  }, [selectedFilter, selectedTab]);

  
//   useEffect(() => {
//     if (rawData.length === 0) return;

//    if (selectedTab === "optionTwo") {
//   const weeklyByYear: { [year: string]: { [weekLabel: string]: number } } = {};
//   const labelSet = new Set<string>();

//   rawData.forEach((entry) => {
//     const date = new Date(entry["First Date of the Week"]);
//     const year = date.getFullYear().toString();
//     const month = date.toLocaleString("en-US", { month: "short" });
//     const day = String(date.getDate()).padStart(2, "0");
//     const label = `${month} ${day}`; // e.g., "Jan 08"

//     if (!weeklyByYear[year]) {
//       weeklyByYear[year] = {};
//     }

//     weeklyByYear[year][label] = Number(entry["Return Rate (%)"]);
//     labelSet.add(label);
//   });

//   // Create sorted category list: e.g., Jan 01 → Jan 08 → Jan 15 ...
//   const allCategories = Array.from(labelSet).sort((a, b) => {
//     const parseDate = (str: string) => new Date(`2020 ${str}`); // use dummy year for sorting
//     return parseDate(a).getTime() - parseDate(b).getTime();
//   });

//   setCategories(allCategories);

//   const newSeries = Object.entries(weeklyByYear).map(([year, weekData]) => {
//     const alignedData = allCategories.map((label) => weekData[label] ?? 0);
//     return {
//       name: year,
//       data: alignedData,
//     };
//   });

//   setSeries(newSeries);
// }

//     if (selectedTab === "optionOne") {
//     // 📅 Monthly View — handled directly from backend
//     const combined = rawData
//       .map((entry) => {
//         if (entry.Month === undefined || entry.Year === undefined) return null;

//         const month = entry.Month.toString().padStart(2, "0");
//         const year = entry.Year;
//         const date = new Date(`${year}-${month}-01`);
//         const formatted = date.toLocaleDateString("en-US", {
//           month: "short",
//           year: "numeric",
//         });

//         return {
//           date: formatted,
//           value: Number(entry["Return Rate (%)"]),
//         };
//       })
//       .filter((item): item is { date: string; value: number } => item !== null)
//       .sort((a, b) => new Date(`01 ${a.date}`).getTime() - new Date(`01 ${b.date}`).getTime());

//     const seriesByYear: { [year: string]: { [month: string]: number } } = {};

// combined.forEach(({ date, value }) => {
//   const [monthStr, yearStr] = date.split(" ");
//   if (!seriesByYear[yearStr]) {
//     seriesByYear[yearStr] = {};
//   }
//   seriesByYear[yearStr][monthStr] = value;
// });

// const monthOrder = [
//   "Jan", "Feb", "Mar", "Apr", "May", "Jun",
//   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
// ];

// setCategories(monthOrder);

// const newSeries = Object.entries(seriesByYear).map(([year, monthData]) => {
//   return {
//     name: year,
//     data: monthOrder.map((m) => monthData[m] ?? 0),
//   };
// });

// setSeries(newSeries);

//   }
// }, [selectedTab, rawData]);
  
//   const allYValues = series.flatMap(s => s.data);
//   const maxY = Math.max(...allYValues);
//   const minY = Math.min(...allYValues);


//   const yPadding = (maxY - minY) * 0.1; // reduce to 10% padding
// const adjustedMinY = Math.max(0, Math.floor(minY - yPadding));
// const adjustedMaxY = Math.ceil(maxY + yPadding);
//   // const paddedCategories = [...categories, "Permanent"];

//   const data = series[0].data;

//   // Find maximum positive value (Max Return)
//   const maxPositive = Math.max(...data.filter(value => value > 0));
//   const maxPositiveIndex = data.indexOf(maxPositive);

//   // Find maximum negative value (Max Sale)
//   const maxNegative = Math.min(...data.filter(value => value < 0));
//   const maxNegativeIndex = data.indexOf(maxNegative);

//   // 1. Create yearly regions
// const redShades = [
//   "rgba(219, 234, 254, 0.6)", // blue-100
//   "rgba(191, 219, 254, 0.5)", // blue-200
//   "rgba(147, 197, 253, 0.4)", // blue-300
//   "rgba(96, 165, 250, 0.35)", // blue-400
// ];


// const uniqueYears = Array.from(
//   new Set(
//     categories.map((label) =>
//       selectedTab === "optionTwo" ? label.split(" ")[2] : label.split(" ")[1]
//     )
//   )
// );
// // 🔍 Find global max & min across all series
// let globalMax = -Infinity;
// let globalMin = Infinity;
// let maxSeriesIndex = 0;
// let minSeriesIndex = 0;
// let maxDataPointIndex = 0;
// let minDataPointIndex = 0;

// series.forEach((s, sIndex) => {
//   s.data.forEach((value, dIndex) => {
//     if (value != null && value > globalMax) {
//       globalMax = value;
//       maxSeriesIndex = sIndex;
//       maxDataPointIndex = dIndex;
//     }
//     if (value != null && value < globalMin) {
//       globalMin = value;
//       minSeriesIndex = sIndex;
//       minDataPointIndex = dIndex;
//     }
//   });
// });


// const yearRegions = uniqueYears.map((year, index) => {
//   const startIndex = categories.findIndex((label) => label.includes(year));
//   const endIndex = categories.map((label) => label.includes(year)).lastIndexOf(true) + 1;

//   return {
//     x: categories[startIndex] || categories[0],
//     x2: categories[endIndex - 1] || categories[categories.length - 1],
//     fillColor: redShades[index % redShades.length],
//     opacity: 0.3, // opacity could be increased slightly if still too light
//     label: {
//       text: year,
//       style: {
//         color: "#991B1B", // darker red text
//         fontSize: "12px",
//         fontWeight: 500,
//       },
//     },
//   };
// });


// const yearColors = [
//   {
//     stroke: "rgba(58,134,255,0.4)", // Soft blue with 80% opacity
//     fill: "#E0F0FF",
//   },
//   {
//     stroke: "rgba(0,178,140,0.4)", // Teal with 80% opacity
//     fill: "#D7F7F0",
//   },
//   {
//     stroke: "rgba(255,107,170,0.4)", // Pink with 80% opacity
//     fill: "#FFE8F1",
//   },
//   {
//     stroke: "rgba(255,181,94,0.4)", // Peach-orange with 80% opacity
//     fill: "#FFF2E1",
//   },
// ];


// const allDiscreteMarkers: (ApexDiscretePoint | null)[] = [];

// series.forEach((s, seriesIndex) => {
//   s.data.forEach((value, dataPointIndex) => {
//     const isZero = value === 0;

//     allDiscreteMarkers.push({
//       seriesIndex,
//       dataPointIndex,
//       fillColor: isZero ? "#ffffff" : "#ffffff", // both white, can change if needed
//       strokeColor: isZero
//         ? "rgba(208, 202, 202, 0.8)" // light gray stroke for zero
//         : "rgba(70, 95, 255, 0.5)",  // blue stroke for normal
//       size: isZero ? 2 : 5,
//       shape: "circle",
//       // strokeWidth: 1.5,
//     });
//   });
// });

// // Add max/min point markers
// allDiscreteMarkers.push(
//   {
//     seriesIndex: maxSeriesIndex,
//     dataPointIndex: maxDataPointIndex,
//     fillColor: "rgba(209, 250, 223, 0.4)",
//     strokeColor: "rgba(22, 163, 74, 0.8)",
//     size: 8,
//     shape: "circle",
//     // strokeWidth: 2,
//   },
//   // {
//   //   seriesIndex: minSeriesIndex,
//   //   dataPointIndex: minDataPointIndex,
//   //   fillColor: "rgba(254, 202, 202, 0.4)",
//   //   strokeColor: "rgba(220, 38, 38, 0.8)",
//   //   size: 8,
//   //   shape: "circle",
//   //   // strokeWidth: 2,
//   // }
// );

// // ✅ Filter out nulls
// const conditionalMarkers: ApexDiscretePoint[] = allDiscreteMarkers.filter(
//   (m): m is ApexDiscretePoint => m !== null
// );


//   const options: ApexOptions = {
//   chart: {
//   type: "area",
//   height: 310,
//   toolbar: {
//     show: false,
//   },
//   fontFamily: "Outfit, 'Segoe UI', sans-serif",
//   animations: {
//   enabled: true,
//   speed: 1600,
//   animateGradually: {
//     enabled: true,
//     delay: 150,
//   },
//   dynamicAnimation: {
//     enabled: true,
//     speed: 800,
//   },
// },
//   dropShadow: {
//     enabled: true,
//     top: 4,
//     left: 0,
//     blur: 6,
//     opacity: 0.1,
//   },
// },

//   colors: yearColors.map((c) => c.stroke),


//   stroke: {
//   curve: "smooth",
//   width: 3,
//   colors: yearColors.map((c) => c.stroke),
// },


//   fill: {
//   type: "gradient",
//   gradient: {
//     shade: "light",
//     type: "vertical",
//     shadeIntensity: 0.3,
//     gradientToColors: yearColors.map((c) => c.fill),
//     inverseColors: false,
//     opacityFrom: 0.35, // slightly more visible
//     opacityTo: 0.05,
//     stops: [0, 90, 100],
//   },
// },


//   legend: {
//   show: true,
//   position: "top",
//   horizontalAlign: "center",
//   fontSize: "13px",
//   fontWeight: 500,
//   labels: {
//     colors: "#6B7280",
//   },
// },


//   grid: {
//   borderColor: "#E5E7EB",
//   strokeDashArray: 3,
//   xaxis: { lines: { show: true } },
//   yaxis: { lines: { show: true } },
//   row: {
//     colors: ["#F9FAFB", "transparent"],
//     opacity: 0.5,
//   },
//   padding: {
//     left: 30,
//     right: 30,
//     top: 0,
//     bottom: 0,
//   },
// },



//   dataLabels: {
//     enabled: false,
//   },

//   tooltip: {
//     theme: "light",
//     x: {
//       format: "MMM yyyy",
//     },
//     style: {
//       fontSize: "13px",
//       fontFamily: "Outfit, 'Segoe UI', sans-serif",
//     },
//   },

//   xaxis: {
//   type: "category",
//   categories: categories,
//   axisBorder: { show: true },
//   axisTicks: { show: false },
//   tickAmount: 6,
//   tooltip: {
//     enabled: true,
//     offsetY: 0,
//     style: {
//       fontSize: '12px',
//       fontFamily: "Outfit, 'Segoe UI', sans-serif",
//     },
//   },
//   labels: {
//     rotate: 0,
//     offsetX: 0,
//     style: {
//       fontSize: "13px",
//       fontWeight: 500,
//       colors: "#6B7280",
//     },
//   },
// },



//   yaxis: {
//   min: adjustedMinY,
//   max: adjustedMaxY,
//   tickAmount: 5,
//   labels: {
//     offsetX: -10,
//     formatter: function (value) {
//       return typeof value === "number" && !isNaN(value) ? value.toFixed(2) : "0.00";
//     },
//     style: {
//       fontSize: "13px",
//       fontWeight: 500,
//       colors: "#6B7280",
//       fontFamily: "Outfit, 'Segoe UI', sans-serif",
//     },
//   },
//   axisBorder: {
//     show: false,
//   },
//   axisTicks: {
//     show: true,
//   },
//   title: {
//     text: "",
//   },
// },
// // Ensure markers look clean and ONLY one circle shows
// markers: {
//   size: 0, // Hide default markers
//   hover: {
//     size: 7,         // Enlarged on hover
//     sizeOffset: 2,   // Offset helps make the hover effect more noticeable
//   },
//   discrete: conditionalMarkers,
// },


// annotations: {
//   points: [
//     {
//       x: categories[maxDataPointIndex],
//       y: globalMax,
//       seriesIndex: maxSeriesIndex,
//       marker: { size: 0 },
//       label: {
//         text: "Peak ITR",
//         offsetX: -15,
//         offsetY: -15,
//         borderColor: "rgba(22, 163, 74, 0.5)",
//         borderWidth: 4,
//         style: {
//           background: "#ffffff",
//           color: "#16A34A",
//           fontSize: "11px",
//           fontWeight: 600,
//           padding: {
//             left: 10,
//             right: 10,
//             top: 5,
//             bottom: 5,
//           },
//         },
//       },
//     },
//     // {
//     //   x: categories[minDataPointIndex],
//     //   y: globalMin,
//     //   seriesIndex: minSeriesIndex,
//     //   marker: { size: 0 },
//     //   label: {
//     //     text: "Max Sale",
//     //     offsetX: -15,
//     //     offsetY: -15,
//     //     borderColor: "rgba(163, 22, 22, 0.3)",
//     //     borderWidth: 4,
//     //     style: {
//     //       background: "#ffffff",
//     //       color: "#DC2626",
//     //       fontSize: "11px",
//     //       fontWeight: 600,
//     //       padding: {
//     //         left: 10,
//     //         right: 10,
//     //         top: 5,
//     //         bottom: 5,
//     //       },
//     //     },
//     //   },
//     // },
//   ],
// },


//   responsive: [
//     {
//       breakpoint: 768,
//       options: {
//         chart: {
//           height: 260,
//         },
//         xaxis: {
//           labels: {
//             style: {
//               fontSize: "11px",
//             },
//           },
//         },
//         yaxis: {
//           labels: {
//             style: {
//               fontSize: "11px",
//             },
//           },
//         },
//       },
//     },
//   ],
// };

// console.log("Prepared Series : ", series)
//   return (
//     <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
  
//       <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
//     {/* Left: Tabs */}
//     {/* <div className="w-full sm:w-auto sm:order-1">
//       <ChartTab
//   selected={selectedTab}
//   onChange={(val) => setSelectedTab(val)}
// />

//     </div> */}

//     {/* Center: Heading */}
//    <div className="w-full text-center sm:w-auto sm:order-2 py-2">
//   <h3 className="text-lg sm:text-xl font-medium text-gray-700 dark:text-gray-200 tracking-normal">
//     Return Rate Percentage
//   </h3>
// </div>

//     {/* Right: Dropdown */}
//     <div className="w-full sm:w-auto flex justify-end sm:order-3">
//       <DropdownWithSearch
//   optionsFilter={optionsFilter}
//   selectedOption={selectedFilter}
//   onChange={setSelectedFilter}
// />

//     </div>
//   </div>

//   <div className="max-w-full overflow-hidden custom-scrollbar">
//   <div className="w-full">
//     {isLoading ? (
//       <div className="flex flex-col items-center justify-center h-[310px] space-y-4">
//         <div className="relative">
//           <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-b-transparent animate-spin"></div>
//           <div className="absolute inset-0 rounded-full blur-sm opacity-50 bg-gradient-to-tr from-blue-400 to-blue-600 animate-pulse"></div>
//         </div>
//         <p className="text-sm text-gray-500 animate-pulse">Loading chart...</p>
//       </div>
//     ) : (
//       <ReactApexChart
//         key={selectedTab + series[0].data.length}
//         options={options}
//         series={series}
//         type="area"
//         height={510}
//       />
//     )}
//   </div>
// </div>

// </div>

//   );
// }