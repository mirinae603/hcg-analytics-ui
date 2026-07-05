// "use client";
// import React, { useEffect, useState } from "react";
// import { ApexOptions } from "apexcharts";
// import dynamic from "next/dynamic";
// import ChartTab from "../common/ChartTab";
// import DropdownWithSearch from "../common/FilterSearch";

// const ReactApexChart = dynamic(() => import("react-apexcharts"), {
//   ssr: false,
// });

// interface StockChangeData {
//   Year: number;
//   Month: string;
//   "OP Sales": number;
//   "IP Issue": number;
//   "Internal Consumption": number;
// }


// interface MaterialOption {
//   Material: string;
//   "Material Description": string;
// }

// type TabType = "optionOne" | "optionTwo" ; 

// export default function StatisticsChart_KPI_9() {
//     const [selectedTab, setSelectedTab] = useState<TabType>("optionOne");
//     const [rawData, setRawData] = useState<StockChangeData[]>([]);
//     const [showChart, setShowChart] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const [selectedFilter, setSelectedFilter] = useState<MaterialOption | null>(null);
//     const [optionsFilter, setOptionsFilter] = useState<MaterialOption[]>([]);


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
//       name: "Monthly Purchase Value",
//       data: [] as number[],
//     },
//   ]);
//   const [categories, setCategories] = useState<string[]>([]);
  
//   useEffect(() => { 
//   const fetchData = async () => {
//     if (!selectedFilter) return;

//     try {
//       setIsLoading(true);
//       const viewType = selectedTab === "optionTwo" ? "weekly" : "monthly";
//       const res = await fetch(`http://localhost:8000/kpi_9?Plant=CHENNAI`);
//       const data: StockChangeData[] = await res.json();
//       setRawData(data);
//       setTimeout(() => {
//         setShowChart(true);
//         setIsLoading(false);
//       }, 300);
//     } catch (err) {
//       console.error("Failed to fetch chart data:", err);
//       setIsLoading(false);
//     }
//   };

//   fetchData();
// }, [selectedFilter, selectedTab]);


  
//   useEffect(() => {
//   if (rawData.length === 0) return;

//   const formatted = rawData
//     .map((entry) => {
//       if (!entry.Month || !entry.Year) return null;
//       const date = new Date(`${entry.Month} 1, ${entry.Year}`);
//       return {
//         category: date.toLocaleDateString("en-US", {
//           month: "short",
//           year: "numeric",
//         }),
//         "OP Sales": entry["OP Sales"],
//         "IP Issue": entry["IP Issue"],
//         "Internal Consumption": entry["Internal Consumption"],
//       };
//     })
//     .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

//   setCategories(formatted.map((d) => d.category));
//   setSeries([
//     {
//       name: "OP Sales",
//       data: formatted.map((d) => d["OP Sales"]),
//     },
//     {
//       name: "IP Issue",
//       data: formatted.map((d) => d["IP Issue"]),
//     },
//     {
//       name: "Internal Consumption",
//       data: formatted.map((d) => d["Internal Consumption"]),
//     },
//   ]);
// }, [rawData]);



  
//   const yValues = series[0].data;
//   const maxY = Math.max(...yValues);
//   const minY = Math.min(...yValues);

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

// const options: ApexOptions = {
//   chart: {
//     type: "bar",
//     height: 310,
//     stacked: true,
//     toolbar: { show: false },
//     fontFamily: "Outfit, 'Segoe UI', sans-serif",
//     animations: {
//       enabled: true,
//       easing: "easeinout",
//       speed: 1000,
//       animateGradually: { enabled: true, delay: 200 },
//       dynamicAnimation: { enabled: true, speed: 800 },
//     },
//   },

//   colors: ["#4F46E5", "#10B981", "#F59E0B"],

//   plotOptions: {
//     bar: {
//       borderRadius: 3, // more rounded
//       columnWidth: "70%",
//       distributed: false,
      
//     },
//   },

//   fill: {
//     type: "gradient",
//     gradient: {
//       shade: "dark",
//       type: "vertical",
//       shadeIntensity: 0.1,
//       gradientToColors: ["#818CF8", "#6EE7B7", "#FCD34D"],
//       opacityFrom: 0.85,
//       opacityTo: 0.60,
//       stops: [0, 85, 100],
//     },
//   },

//   dataLabels: {
//     enabled: false,
//     style: {
//       fontSize: "12px",
//       fontWeight: 500,
//       colors: ["#374151"],
//     },
//     background: {
//       enabled: true,
//       foreColor: "#fff",
//       padding: 4,
//       borderRadius: 6,
//       borderWidth: 0,
//       opacity: 0.8,
//       dropShadow: {
//         enabled: true,
//         top: 1,
//         left: 0,
//         blur: 3,
//         color: "#000",
//         opacity: 0.25,
//       },
//     },
//     formatter: (val: number) =>
//       val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0),
//   },

//   legend: {
//   show: true,
//   position: "top",
//   fontSize: "14px",
//   fontWeight: 600,
//   labels: {
//     colors: "#374151",
//   },
//   markers: {
//     shape: "circle",
//     fillColors: ["rgba(79, 70, 229, 0.55)", "rgba(16, 185, 129, 0.55)", "rgba(245, 158, 11, 0.55)"],
//   },
//   itemMargin: {
//     horizontal: 12,
//     vertical: 4,
//   },
// },


//   grid: {
//     borderColor: "#E5E7EB",
//     strokeDashArray: 4,
//     xaxis: { lines: { show: true } },
//     yaxis: { lines: { show: true } },
//     row: {
//       colors: ["#F3F4F6", "transparent"],
//       opacity: 0.6,
//     },
//     padding: { left: 20, right: 10, top: 10, bottom: 0 },
//   },

//   tooltip: {
//   shared: true,
//   theme: "light",
//   intersect: false,
//   style: {
//     fontSize: "13px",
//     fontFamily: "Outfit, 'Segoe UI', sans-serif",
//   },
//   x: {
//     format: "MMM yyyy",
//   },
//   y: {
//     formatter: (val: number) => {
//       if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)}Cr`;
//       if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(2)}L`;
//       if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
//       return `₹${val.toFixed(0)}`;
//     },
//   },
//   marker: {
//     show: true,
//   },
// },

//   xaxis: {
//     type: "category",
//     categories: categories,
//     axisBorder: { show: false },
//     axisTicks: { show: false },
//     labels: {
//       rotate: 0,
//       style: {
//         fontSize: "13px",
//         fontWeight: 500,
//         colors: "#6B7280",
//       },
//     },
//   },

//   yaxis: {
//   tickAmount: 10,
//   labels: {
//     offsetX: -8,
//     formatter: (val: number) => {
//   if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)}Cr`;
//   if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(2)}L`;
//   if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
//   return `₹${val.toFixed(0)}`;
// },
//     style: {
//       fontSize: "13px",
//       fontWeight: 500,
//       colors: "#6B7280",
//     },
//   },
//   axisBorder: { show: false },
//   axisTicks: { show: false },
// },
//   responsive: [
//     {
//       breakpoint: 768,
//       options: {
//         chart: { height: 260 },
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


//   return (
//     <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
//   <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
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
//     Monthly Purchase Value Over Time
//   </h3>
// </div>

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
//      <ReactApexChart
//   key={series.map((s) => s.data.length).join("-")}
//   options={options}
//   series={series}
//   type="bar"
//   height={510}
// />
//     )}
//   </div>
// </div>

// </div>

//   );
// }