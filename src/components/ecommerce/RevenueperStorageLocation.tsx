"use client";
import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import ChartTab from "../common/ChartTab";
import DropdownWithSearch from "../common/FilterSearch";
import { useRegion } from '@/context/RegionContext'
import FilterTabSwitcher from "../common/FilterTabSwitcher";
import {DASHBOARD_API_BASE_URL} from '@/utils/config';

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface StockChangeData {
  Year:string
  Month:string
  "Week End": string;
  "Amount in LC": string;
}

interface MaterialOption {
  Material: string;
  "Material Description": string;
}
interface MaterialGroupOption {
  "Material Group": string;
}



export default function RevenueperStorageLocationChart() {
    
    const [rawData, setRawData] = useState<StockChangeData[]>([]);
    const [showChart, setShowChart] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<MaterialOption | null>(null);
    const [optionsFilter, setOptionsFilter] = useState<MaterialOption[]>([]);
    const { selectedRegion } = useRegion()
    type FilterTabType = "material" | "group";
    const [filterTab, setFilterTab] = useState<FilterTabType>("material");
    const [selectedGroup, setSelectedGroup] = useState<MaterialGroupOption | null>(null);
    const [groupOptions, setGroupOptions] = useState<MaterialGroupOption[]>([]);

  useEffect(() => {
      const regionName = selectedRegion?.name ?? "";
      fetch(`/${regionName}_Material_Catalogue.json`)
        .then((res) => res.json())
        .then((data: MaterialOption[]) => {
          const extendedData = [
            { Material: "All Items", "Material Description": "All SKUs" },
            ...data,
          ];
          setOptionsFilter(extendedData);
          setSelectedFilter(extendedData[2]); // default selection
        })
        .catch((err) => console.error("Failed to load options:", err));
    }, [selectedRegion]);
    
      useEffect(() => {
      const regionName = selectedRegion?.name ?? "";
      fetch(`/${regionName}_Material_Group_Catalogue.json`)
        .then((res) => res.json())
        .then((data: MaterialGroupOption[]) => {
          
          setGroupOptions(data);
          setSelectedGroup(data[0]);
        })
        .catch((err) => console.error("Failed to load group options:", err));
    }, []);

  const [series, setSeries] = useState([
    {
      name: "Revenue",
      data: [] as number[],
    },
  ]);
  const [categories, setCategories] = useState<string[]>([]);
  
  useEffect(() => {
  const fetchData = async () => {
    if (!selectedFilter) return;

    try {
      setIsLoading(true);
      const regionName = selectedRegion?.name ?? "";

      const baseUrl = `${DASHBOARD_API_BASE_URL}/kpi/revenue-per-storage-location`;
      const query = new URLSearchParams({
        Plant: regionName,
      });


      const res = await fetch(`${baseUrl}?${query.toString()}`);
      const data: StockChangeData[] = await res.json();
      console.log("Recieved Data : ", data);
      setRawData(data);
      setTimeout(() => {
        setShowChart(true);
        setIsLoading(false);
      }, 300);
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
      setIsLoading(false);
    }
  };

  fetchData();
}, [filterTab, selectedFilter, selectedGroup, selectedRegion]);


  
  useEffect(() => {
  if (rawData.length === 0) return;

    // 📅 Monthly View — handled directly from backend
    const combined = rawData
      .map((entry) => {
        if (entry.Month === undefined || entry.Year === undefined) return null;

        const month = entry.Month.toString().padStart(2, "0");
        const year = entry.Year;
        const date = new Date(`${year}-${month}-01`);
        const formatted = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        return {
          date: formatted,
          value: Number(entry["Amount in LC"]),
        };
      })
      .filter((item): item is { date: string; value: number } => item !== null)
      .sort((a, b) => new Date(`01 ${a.date}`).getTime() - new Date(`01 ${b.date}`).getTime());

    setCategories(combined.map((d) => d.date));
    setSeries([{ name: "Revenue", data: combined.map((d) => d.value) }]);
  
}, [rawData]);


  
  const yValues = series[0].data;
  const maxY = Math.max(...yValues);
  const minY = Math.min(...yValues);

  const yPadding = (maxY - minY) * 0.1; // reduce to 10% padding
const adjustedMinY = Math.max(0, Math.floor(minY - yPadding));
const adjustedMaxY = Math.ceil(maxY + yPadding);
  // const paddedCategories = [...categories, "Permanent"];

  const data = series[0].data;

  // Find maximum positive value (Max Return)
  const maxPositive = Math.max(...data.filter(value => value > 0));
  const maxPositiveIndex = data.indexOf(maxPositive);

  // Find maximum negative value (Max Sale)
  const maxNegative = Math.min(...data.filter(value => value < 0));
  const maxNegativeIndex = data.indexOf(maxNegative);

  // 1. Create yearly regions
const redShades = [
  "rgba(219, 234, 254, 0.6)", // blue-100
  "rgba(191, 219, 254, 0.5)", // blue-200
  "rgba(147, 197, 253, 0.4)", // blue-300
  "rgba(96, 165, 250, 0.35)", // blue-400
];






  const options: ApexOptions = {
  chart: {
  type: "bar",
  height: 310,
  toolbar: {
    show: true,
  },
  zoom: {
      enabled: false,
    },
  fontFamily: "Outfit, 'Segoe UI', sans-serif",
  animations: {
    enabled: true,
    speed: 1200,
    animateGradually: {
      enabled: true,
      delay: 300,
    },
    dynamicAnimation: {
      enabled: true,
      speed: 800,
    },
  },
},

  colors: ["#465FFF"],

  plotOptions: {
    bar: {
      borderRadius: 6,
      columnWidth: "70%",
      distributed: false,
      dataLabels: {
        position: "top", // show values on top of bars
      },
    },
  },

  fill: {
    type: "gradient",
    gradient: {
      shade: "light",
      type: "vertical",
      shadeIntensity: 0.4,
      gradientToColors: ["#9CA3FF"],
      opacityFrom: 0.6,
      opacityTo: 0.3,
      stops: [0, 90, 100],
    },
  },


  legend: {
    show: false,
  },

  grid: {
    borderColor: "#E5E7EB",
    strokeDashArray: 3,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } },
    row: {
      colors: ["#F9FAFB", "transparent"],
      opacity: 0.5,
    },
    padding: {
      left: 30,
      right: 10,
      top: 0,
      bottom: 0,
    },
  },

  tooltip: {
    theme: "light",
    x: {
      format:  "MMM yyyy",
    },
    y: {
    formatter: function (value: number) {
      if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
      if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
      if (value >= 1e3) return `₹${(value / 1e3).toFixed(2)}K`;
      return `₹${value.toFixed(0)}`;
    },
  },
    style: {
      fontSize: "13px",
      fontFamily: "Outfit, 'Segoe UI', sans-serif",
    },
  },

  xaxis: {
    type: "category",
    categories: categories,
    axisBorder: { show: true },
    axisTicks: { show: false },
    tickAmount: 4,
    tooltip: {
      enabled: true,
      offsetY: 0,
      style: {
        fontSize: "12px",
        fontFamily: "Outfit, 'Segoe UI', sans-serif",
      },
    },
    labels: {
      rotate: 0,
      offsetX: 0,
      style: {
        fontSize: "13px",
        fontWeight: 500,
        colors: "#6B7280",
      },
    },
  },

  yaxis: {
    min: adjustedMinY,
    max: adjustedMaxY,
    tickAmount: 5,
    labels: {
      offsetX: -10,
      formatter: function (value: number) {
      if (typeof value !== "number" || isNaN(value)) return "₹0";

      if (value >= 1e7) {
        return `₹${(value / 1e7).toFixed(2)}Cr`; // Crores
      } else if (value >= 1e5) {
        return `₹${(value / 1e5).toFixed(2)}L`; // Lakhs
      } else if (value >= 1e3) {
        return `₹${(value / 1e3).toFixed(2)}K`; // Thousands
      } else {
        return `₹${value.toFixed(0)}`; // Below 1000
      }
    },
      style: {
        fontSize: "13px",
        fontWeight: 500,
        colors: "#6B7280",
        fontFamily: "Outfit, 'Segoe UI', sans-serif",
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: true,
    },
  },
  dataLabels: {
  enabled: true,
  offsetY: -12,
  style: {
    fontSize: "10px",
    fontWeight: 500,
    colors: ["#374151"], // Slate-700
  },
  background: {
    enabled: true,
    foreColor: "#fff",
    padding: 4,
    borderRadius: 4,
    borderWidth: 0,
    opacity: 0.7,
    dropShadow: {
      enabled: true,
      top: 1,
      left: 0,
      blur: 2,
      color: "#000",
      opacity: 0.2,
    },
  },
 formatter: function (value: number) {
      if (typeof value !== "number" || isNaN(value)) return "₹0";

      if (value >= 1e7) {
        return `₹${(value / 1e7).toFixed(2)}Cr`; // Crores
      } else if (value >= 1e5) {
        return `₹${(value / 1e5).toFixed(2)}L`; // Lakhs
      } else if (value >= 1e3) {
        return `₹${(value / 1e3).toFixed(2)}K`; // Thousands
      } else {
        return `₹${value.toFixed(0)}`; // Below 1000
      }
    },
},

  annotations: {
    points: [
      {
        x: categories[maxPositiveIndex],
        y: maxPositive,
        marker: { size: 0 },
        label: {
          text: "Max Revenue",
          offsetX: -10,
          offsetY: -15,
          borderColor: "rgba(159, 163, 226, 0.5)",
          borderWidth: 3,
          style: {
            background: "#ffffff",
            color: "#465FFF",
            fontSize: "11px",
            fontWeight: 600,
            padding: {
              left: 8,
              right: 8,
              top: 4,
              bottom: 4,
            },
          },
        },
      },
    ],
  },

  responsive: [
    {
      breakpoint: 768,
      options: {
        chart: {
          height: 260,
        },
        xaxis: {
          labels: {
            style: {
              fontSize: "11px",
            },
          },
        },
        yaxis: {
          labels: {
            style: {
              fontSize: "11px",
            },
          },
        },
      },
    },
  ],
};



  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      
  <h2 className="text-2xl font-light text-gray-800 mb-0 mt-5 text-center opacity-90 tracking-wide transition-all duration-500 ease-in-out">
  Revenue per Storage Location
</h2>
<div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">

   <div className="w-full text-center sm:w-auto sm:order-2 py-2">
  
  <div className="flex gap-2">
  <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
    {["Hyderabad"].map((type) => (
      <button
        key={type}
        className={`px-3 py-2 font-medium rounded-md text-sm whitespace-nowrap  ${
          false
            ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        Selected Region
      </button>
    ))}
  </div>

  <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
    {["Hyderabad"].map((type) => (
      <button
        key={type}
        className={`px-3 py-2 font-medium rounded-md text-sm whitespace-nowrap ${
          true
            ? "text-gray-500 dark:text-white bg-white "
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {selectedRegion?.name}
      </button>
    ))}
  </div>
</div>

</div>

    

  </div>

  <div className="max-w-full overflow-hidden custom-scrollbar">
  <div className="w-full">
    {isLoading ? (
      <div className="flex flex-col items-center justify-center h-[310px] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-b-transparent animate-spin"></div>
          <div className="absolute inset-0 rounded-full blur-sm opacity-50 bg-gradient-to-tr from-blue-400 to-blue-600 animate-pulse"></div>
        </div>
        <p className="text-sm text-gray-500 animate-pulse">Loading chart...</p>
      </div>
    ) : (
      <ReactApexChart
        key={series[0].data.length}
        options={options}
        series={series}
        type="bar"
        height={510}
      />
    )}
  </div>
</div>

</div>

  );
}