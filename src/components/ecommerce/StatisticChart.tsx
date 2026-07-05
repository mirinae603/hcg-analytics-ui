"use client";
import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import ChartTab from "../common/ChartTab";
import DropdownWithSearch from "../common/FilterSearch";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface StockChangeData {
  "First Date of the Week": string;
  "Stock Change": string;
}

interface MaterialOption {
  Material: string;
  "Material Description": string;
}

type TabType = "optionOne" | "optionTwo" ; 

export default function StatisticsChart() {
    const [selectedTab, setSelectedTab] = useState<TabType>("optionOne");
    const [rawData, setRawData] = useState<StockChangeData[]>([]);
    const [showChart, setShowChart] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<MaterialOption | null>(null);
    const [optionsFilter, setOptionsFilter] = useState<MaterialOption[]>([]);


  useEffect(() => {
  fetch("/material_descriptions.json")
    .then((res) => res.json())
    .then((data: MaterialOption[]) => {
      setOptionsFilter(data);
      setSelectedFilter(data[0]); // default selection
    })
    .catch((err) => console.error("Failed to load options:", err));
}, []);

  const [series, setSeries] = useState([
    {
      name: "Stock Change",
      data: [] as number[],
    },
  ]);
  const [categories, setCategories] = useState<string[]>([]);
  
  useEffect(() => {
  const fetchData = async () => {
    if (!selectedFilter) return;

    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:8000/kpi_1_material?Plant=CHENNAI&Material=${selectedFilter.Material}`);
      const data: StockChangeData[] = await res.json();
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
}, [selectedFilter]);

  
  useEffect(() => {
    if (rawData.length === 0) return;

    if (selectedTab === "optionTwo") {
  // Weekly - format as 'Mon DD YYYY' (e.g., Jul 08 2024)
  const dates = rawData.map((d) => {
    const date = new Date(d["First Date of the Week"]);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month} ${day} ${year}`; // ✅ This gives 'Jul 08 2024'
  });


  const quantities = rawData.map((d) => Number(d["Stock Change"]));

  setCategories(dates);
  setSeries([{ name: "Stock Change", data: quantities }]);
}


    if (selectedTab === "optionOne") {
      //  Monthly
      const monthlyData: { [key: string]: number } = {};
      rawData.forEach((entry) => {
        const date = new Date(entry["First Date of the Week"]);
        const monthKey = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(entry["Stock Change"]);
      });

      const sortedKeys = Object.keys(monthlyData).sort(
        (a, b) => new Date(`01 ${a}`).getTime() - new Date(`01 ${b}`).getTime()
      );
      setCategories(sortedKeys);
      setSeries([{ name: "Stock Change", data: sortedKeys.map((k) => monthlyData[k]) }]);
    }

  }, [selectedTab, rawData]);
  
  const yValues = series[0].data;
  const maxY = Math.max(...yValues);
  const minY = Math.min(...yValues);

  const yPadding = (maxY - minY) * 0.2; // 20% padding

  const adjustedMinY = Math.floor(minY - yPadding);
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


const uniqueYears = Array.from(
  new Set(
    categories.map((label) =>
      selectedTab === "optionTwo" ? label.split(" ")[2] : label.split(" ")[1]
    )
  )
);

const yearRegions = uniqueYears.map((year, index) => {
  const startIndex = categories.findIndex((label) => label.includes(year));
  const endIndex = categories.map((label) => label.includes(year)).lastIndexOf(true) + 1;

  return {
    x: categories[startIndex] || categories[0],
    x2: categories[endIndex - 1] || categories[categories.length - 1],
    fillColor: redShades[index % redShades.length],
    opacity: 0.3, // opacity could be increased slightly if still too light
    label: {
      text: year,
      style: {
        color: "#991B1B", // darker red text
        fontSize: "12px",
        fontWeight: 500,
      },
    },
  };
});


  const options: ApexOptions = {
  chart: {
  type: "area",
  height: 310,
  toolbar: {
    show: false,
  },
  fontFamily: "Outfit, 'Segoe UI', sans-serif",
  animations: {
  enabled: true,
  speed: 1600,
  animateGradually: {
    enabled: true,
    delay: 3400,
  },
  dynamicAnimation: {
    enabled: true,
    speed: 800,
  },
},
  dropShadow: {
    enabled: true,
    top: 4,
    left: 0,
    blur: 6,
    opacity: 0.1,
  },
},

  colors: ["#465FFF"],

  stroke: {
  curve: "smooth",
  width: 3,
  colors: ["rgba(70, 95, 255, 0.4)"], // softened blue
},


  fill: {
    type: "gradient",
    gradient: {
      shade: "light",
      type: "vertical",
      shadeIntensity: 0.4,
      gradientToColors: ["#9CA3FF"],
      inverseColors: false,
      opacityFrom: 0.5,
      opacityTo: 0,
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



  dataLabels: {
    enabled: false,
  },

  tooltip: {
    theme: "light",
    x: {
      format: "MMM yyyy",
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
  tickAmount: 6,
  tooltip: {
    enabled: true,
    offsetY: 0,
    style: {
      fontSize: '12px',
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
    formatter: function (value) {
      return value.toFixed(0); // You could add "$" or "%" if it's financial
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
  title: {
    text: "", // Optional: Add label like 'Revenue ($)' or similar
  },
},
// Ensure markers look clean and ONLY one circle shows
markers: {
  size: 5,
  colors: ["#ffffff"],
  strokeColors: "rgba(70, 95, 255, 0.5)",
  strokeWidth: 1.5,
  shape: "circle",
  hover: {
    size: 6,
    sizeOffset: 2,
  },
  discrete: [
    {
      seriesIndex: 0,
      dataPointIndex: series[0].data.indexOf(Math.max(...series[0].data)),
      fillColor: "rgba(209, 250, 223, 0.4)", // green-100 with opacity
      strokeColor: "rgba(22, 163, 74, 0.8)",
      size: 8,
      shape: "circle",
    },
    {
      seriesIndex: 0,
      dataPointIndex: series[0].data.indexOf(Math.min(...series[0].data)),
      fillColor: "rgba(254, 202, 202, 0.4)", // red-100 with opacity
      strokeColor: "rgba(220, 38, 38, 0.8)",
      size: 8,
      shape: "circle",
    },
  ],
},

annotations: {
  // Highlight different year regions
  // xaxis: yearRegions,

  // Highlight Max Return and Max Sale points
  points: [
    {
      x: categories[maxPositiveIndex],
      y: maxPositive,
      marker: { size: 0 },
      label: {
        text: "Max Return",
        offsetX: -15,
        offsetY: -15,
        borderColor: "rgba(22, 163, 74, 0.5)",
        borderWidth: 4,
        style: {
          background: "#ffffff",
          color: "#16A34A",
          fontSize: "11px",
          fontWeight: 600,
          padding: {
            left: 10,
            right: 10,
            top: 5,
            bottom: 5,
          },
        },
      },
    },
    {
      x: categories[maxNegativeIndex],
      y: maxNegative,
      marker: { size: 0 },
      label: {
        text: "Max Sale",
        offsetX: -15,
        offsetY: -15,
        borderColor: "rgba(163, 22, 22, 0.3)",
        borderWidth: 4,
        style: {
          background: "#ffffff",
          color: "#DC2626",
          fontSize: "11px",
          fontWeight: 600,
          padding: {
            left: 10,
            right: 10,
            top: 5,
            bottom: 5,
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
  <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
    {/* Left: Tabs */}
    <div className="w-full sm:w-auto sm:order-1">
      <ChartTab
  selected={selectedTab}
  onChange={(val) => setSelectedTab(val)}
/>

    </div>

    {/* Center: Heading */}
   <div className="w-full text-center sm:w-auto sm:order-2 py-2">
  <h3 className="text-lg sm:text-xl font-medium text-gray-700 dark:text-gray-200 tracking-normal">
    Stock Level Change Over Time
  </h3>
</div>

    {/* Right: Dropdown */}
    <div className="w-full sm:w-auto flex justify-end sm:order-3">
      <DropdownWithSearch
  optionsFilter={optionsFilter}
  selectedOption={selectedFilter}
  onChange={setSelectedFilter}
/>

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
        key={selectedTab + series[0].data.length}
        options={options}
        series={series}
        type="area"
        height={510}
      />
    )}
  </div>
</div>

</div>

  );
}