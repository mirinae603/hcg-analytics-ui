// // "use client";
// // import React from "react";
// // // import Chart from "react-apexcharts";
// // import { ApexOptions } from "apexcharts";
// // import ChartTab from "../common/ChartTab";
// // import dynamic from "next/dynamic";

// // // Dynamically import the ReactApexChart component
// // const ReactApexChart = dynamic(() => import("react-apexcharts"), {
// //   ssr: false,
// // });

// // export default function StatisticsChart() {
// //   const options: ApexOptions = {
// //     legend: {
// //       show: false, // Hide legend
// //       position: "top",
// //       horizontalAlign: "left",
// //     },
// //     colors: ["#465FFF", "#9CB9FF"], // Define line colors
// //     chart: {
// //       fontFamily: "Outfit, sans-serif",
// //       height: 310,
// //       type: "line", // Set the chart type to 'line'
// //       toolbar: {
// //         show: false, // Hide chart toolbar
// //       },
// //     },
// //     stroke: {
// //       curve: "straight", // Define the line style (straight, smooth, or step)
// //       width: [2, 2], // Line width for each dataset
// //     },

// //     fill: {
// //       type: "gradient",
// //       gradient: {
// //         opacityFrom: 0.55,
// //         opacityTo: 0,
// //       },
// //     },
// //     markers: {
// //       size: 0, // Size of the marker points
// //       strokeColors: "#fff", // Marker border color
// //       strokeWidth: 2,
// //       hover: {
// //         size: 6, // Marker size on hover
// //       },
// //     },
// //     grid: {
// //       xaxis: {
// //         lines: {
// //           show: false, // Hide grid lines on x-axis
// //         },
// //       },
// //       yaxis: {
// //         lines: {
// //           show: true, // Show grid lines on y-axis
// //         },
// //       },
// //     },
// //     dataLabels: {
// //       enabled: false, // Disable data labels
// //     },
// //     tooltip: {
// //       enabled: true, // Enable tooltip
// //       x: {
// //         format: "dd MMM yyyy", // Format for x-axis tooltip
// //       },
// //     },
// //     xaxis: {
// //       type: "category", // Category-based x-axis
// //       categories: [
// //         "Jan",
// //         "Feb",
// //         "Mar",
// //         "Apr",
// //         "May",
// //         "Jun",
// //         "Jul",
// //         "Aug",
// //         "Sep",
// //         "Oct",
// //         "Nov",
// //         "Dec",
// //       ],
// //       axisBorder: {
// //         show: false, // Hide x-axis border
// //       },
// //       axisTicks: {
// //         show: false, // Hide x-axis ticks
// //       },
// //       tooltip: {
// //         enabled: false, // Disable tooltip for x-axis points
// //       },
// //     },
// //     yaxis: {
// //       labels: {
// //         style: {
// //           fontSize: "12px", // Adjust font size for y-axis labels
// //           colors: ["#6B7280"], // Color of the labels
// //         },
// //       },
// //       title: {
// //         text: "", // Remove y-axis title
// //         style: {
// //           fontSize: "0px",
// //         },
// //       },
// //     },
// //   };

// //   const series = [
// //     {
// //       name: "Sales",
// //       data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
// //     },
// //     {
// //       name: "Revenue",
// //       data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
// //     },
// //   ];
// //   return (
// //     <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
// //       <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
// //         <div className="w-full">
// //           <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
// //             Statistics
// //           </h3>
// //           <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
// //             Target you’ve set for each month
// //           </p>
// //         </div>
// //         <div className="flex items-start w-full gap-3 sm:justify-end">
// //           <ChartTab />
// //         </div>
// //       </div>

// //       <div className="max-w-full overflow-x-auto custom-scrollbar">
// //         <div className="min-w-[1000px] xl:min-w-full">
// //           <ReactApexChart
// //             options={options}
// //             series={series}
// //             type="area"
// //             height={310}
// //           />
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// "use client";
// import React, { useEffect, useState } from "react";
// import { ApexOptions } from "apexcharts";
// import dynamic from "next/dynamic";
// import ChartTab from "../common/ChartTab";

// const ReactApexChart = dynamic(() => import("react-apexcharts"), {
//   ssr: false,
// });

// interface StockChangeData {
//   "Posting Date": string;
//   "Qty in Un. of Entry": string;
// }

// export default function StatisticsChart() {
//   const [series, setSeries] = useState([
//     {
//       name: "Stock Change",
//       data: [] as number[],
//     },
//   ]);
//   const [categories, setCategories] = useState<string[]>([]);

//   useEffect(() => {
//   const fetchData = async () => {
//     try {
//       const res = await fetch(
//         "http://localhost:8000/kpi_1_material?Plant=BANGALORE&Material=10-0000003"
//       );
//       const data: StockChangeData[] = await res.json();

//       const dates = data.map((d) => d["Posting Date"]);
//       const quantities = data.map((d) => Number(d["Qty in Un. of Entry"]));

//       // Set categories immediately
//       setCategories(dates);

//       // Add a delay so ApexCharts can animate from empty state
//       setTimeout(() => {
//         setSeries([
//           {
//             name: "Stock Change",
//             data: quantities,
//           },
//         ]);
//       }, 200); // ~200ms delay helps ensure animation is visible
//     } catch (err) {
//       console.error("Failed to fetch chart data:", err);
//     }
//   };

//   fetchData();
// }, []);


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
//     delay: 300,
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

//   colors: ["#465FFF"],

//   stroke: {
//     curve: "smooth",
//     width: 3,
//   },

//   fill: {
//     type: "gradient",
//     gradient: {
//       shade: "light",
//       type: "vertical",
//       shadeIntensity: 0.4,
//       gradientToColors: ["#9CA3FF"],
//       inverseColors: false,
//       opacityFrom: 0.5,
//       opacityTo: 0,
//       stops: [0, 90, 100],
//     },
//   },

//   markers: {
//     size: 4,
//     colors: ["#ffffff"],
//     strokeColors: "#465FFF",
//     strokeWidth: 2,
//     hover: {
//       size: 7,
//     },
//   },

//   legend: {
//     show: false,
//   },

//   grid: {
//     borderColor: "#E5E7EB",
//     strokeDashArray: 5,
//     xaxis: {
//       lines: { show: false },
//     },
//     yaxis: {
//       lines: { show: true },
//     },
//     padding: {
//       left: 15,
//       right: 15,
//       top: 10,
//       bottom: 10,
//     },
//   },

//   dataLabels: {
//     enabled: false,
//   },

//   tooltip: {
//     theme: "light",
//     x: {
//       format: "dd MMM yyyy",
//     },
//     style: {
//       fontSize: "13px",
//       fontFamily: "Outfit, 'Segoe UI', sans-serif",
//     },
//   },

//   xaxis: {
//     type: "category",
//     categories: categories,
//     axisBorder: { show: false },
//     axisTicks: { show: false },
//     tickAmount: 6,
//     tooltip: { enabled: false },
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
//     labels: {
//       style: {
//         fontSize: "13px",
//         colors: ["#6B7280"],
//       },
//     },
//     title: {
//       text: "",
//     },
//   },

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


//   return (
//     <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
//       <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
//         <div className="w-full">
//           <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
//             Stock Change Chart
//           </h3>
//           <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
//             Daily material stock movement for selected plant
//           </p>
//         </div>
//         <div className="flex items-start w-full gap-3 sm:justify-end">
//           <ChartTab />
//         </div>
//       </div>

//       <div className="max-w-full overflow-x-auto custom-scrollbar">
//         <div className="min-w-[1000px] xl:min-w-full">
//           <ReactApexChart
//             options={options}
//             series={series}
//             type="area"
//             height={310}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }
