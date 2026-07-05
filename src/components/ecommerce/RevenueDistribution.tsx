"use client";
import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useRegion } from '@/context/RegionContext'
import {DASHBOARD_API_BASE_URL} from '@/utils/config';

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface StockChangeData {
  Year: number;
  Month: string;
  "OP Sales": number;
  "IP Issue": number;
  "Internal Consumption": number;
}

interface MaterialOption {
  Material: string;
  "Material Description": string;
}

// Add interface for top 3 materials data
interface Top3MaterialsData {
  [key: string]: {
    "OP Sales": [string, number][];
    "IP Issue": [string, number][];
    "Internal Consumption": [string, number][];
  };
}

type TabType = "optionOne" | "optionTwo";

export default function RevenueDistributionChart() {
    const [selectedTab, setSelectedTab] = useState<TabType>("optionOne");
    const [rawData, setRawData] = useState<StockChangeData[]>([]);
    const [showChart, setShowChart] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { selectedRegion } = useRegion()
    const [selectedFilter, setSelectedFilter] = useState<MaterialOption | null>(null);
    const [optionsFilter, setOptionsFilter] = useState<MaterialOption[]>([]);
    // Add state for top 3 materials data
    const [top3MaterialsData, setTop3MaterialsData] = useState<Top3MaterialsData>({});

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

  // Add useEffect to load top 3 materials data
  useEffect(() => {
    fetch('/top3_materials_report.json')
      .then((res) => res.json())
      .then((data: Top3MaterialsData) => {
        setTop3MaterialsData(data);
      })
      .catch((err) => console.error("Failed to load top 3 materials data:", err));
  }, []);

  const [series, setSeries] = useState([
    {
      name: "Monthly Purchase Value",
      data: [] as number[],
    },
  ]);
  const [categories, setCategories] = useState<string[]>([]);
  
  useEffect(() => {
  const fetchData = async () => {
    if (!selectedFilter) return;

    try {
      setIsLoading(true);
      const viewType = selectedTab === "optionTwo" ? "weekly" : "monthly";
      const regionName = selectedRegion?.name ?? "";

      const res = await fetch(`${DASHBOARD_API_BASE_URL}/kpi/revenue-distribution?Plant=${regionName}`);
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
}, [selectedFilter, selectedTab, selectedRegion]);
  
  useEffect(() => {
  if (rawData.length === 0) return;

  const formatted = rawData
    .map((entry) => {
      if (!entry.Month || !entry.Year) return null;
      const date = new Date(`${entry.Month} 1, ${entry.Year}`);
      return {
        category: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        "OP Sales": entry["OP Sales"],
        "IP Issue": entry["IP Issue"],
        "Internal Consumption": entry["Internal Consumption"],
        // Add original month/year for lookup
        originalMonth: entry.Month,
        originalYear: entry.Year,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  setCategories(formatted.map((d) => d.category));
  setSeries([
    {
      name: "OP Sales",
      data: formatted.map((d) => d["OP Sales"]),
    },
    {
      name: "IP Issue",
      data: formatted.map((d) => d["IP Issue"]),
    },
    {
      name: "Internal Consumption",
      data: formatted.map((d) => d["Internal Consumption"]),
    },
  ]);
}, [rawData]);

  // Helper function to get top 3 materials for tooltip
  const getTop3Materials = (categoryIndex: number, seriesName: string) => {
    if (!rawData[categoryIndex]) return [];
    
    const regionName = selectedRegion?.name ?? "Hyderabad East";
    const month = rawData[categoryIndex].Month;
    const year = rawData[categoryIndex].Year;
    const key = `${regionName}|${year}|${month}`;
    
    const categoryData = top3MaterialsData[key];
    if (!categoryData || !categoryData[seriesName as keyof typeof categoryData]) return [];
    
    return categoryData[seriesName as keyof typeof categoryData] || [];
  };
  
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

const options: ApexOptions = {
  chart: {
    type: "bar",
    height: 310,
    stacked: true,
    toolbar: {
    show: true,
  },
  zoom: {
      enabled: false,
    },
    fontFamily: "Outfit, 'Segoe UI', sans-serif",
    animations: {
      enabled: true,
      speed: 1000,
      animateGradually: { enabled: true, delay: 200 },
      dynamicAnimation: { enabled: true, speed: 800 },
    },
  },

  colors: ["#4F46E5", "#10B981", "#F59E0B"],

  plotOptions: {
    bar: {
      borderRadius: 3, // more rounded
      columnWidth: "70%",
      distributed: false,
    },
  },

  fill: {
    type: "gradient",
    gradient: {
      shade: "dark",
      type: "vertical",
      shadeIntensity: 0.1,
      gradientToColors: ["#818CF8", "#6EE7B7", "#FCD34D"],
      opacityFrom: 0.85,
      opacityTo: 0.60,
      stops: [0, 85, 100],
    },
  },

  dataLabels: {
    enabled: false,
    style: {
      fontSize: "12px",
      fontWeight: 500,
      colors: ["#374151"],
    },
    background: {
      enabled: true,
      foreColor: "#fff",
      padding: 4,
      borderRadius: 6,
      borderWidth: 0,
      opacity: 0.8,
      dropShadow: {
        enabled: true,
        top: 1,
        left: 0,
        blur: 3,
        color: "#000",
        opacity: 0.25,
      },
    },
    formatter: (val: number) =>
      val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0),
  },

  legend: {
  show: true,
  position: "top",
  fontSize: "14px",
  fontWeight: 600,
  labels: {
    colors: "#374151",
  },
  markers: {
    shape: "circle",
    fillColors: ["rgba(79, 70, 229, 0.55)", "rgba(16, 185, 129, 0.55)", "rgba(245, 158, 11, 0.55)"],
  },
  itemMargin: {
    horizontal: 12,
    vertical: 4,
  },
},

  grid: {
    borderColor: "#E5E7EB",
    strokeDashArray: 4,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } },
    row: {
      colors: ["#F3F4F6", "transparent"],
      opacity: 0.6,
    },
    padding: { left: 20, right: 10, top: 10, bottom: 0 },
  },

  // Updated tooltip configuration - always on top and visible

  
tooltip: {
  shared: false,
  theme: "light", 
  intersect: true,
  style: {
    fontSize: "10px",
    fontFamily: "Outfit, 'Segoe UI', sans-serif",
  },
  // Add these properties to prevent clipping
  fixed: {
    enabled: false, // Keep false to allow dynamic positioning
  },
  // Ensure tooltip stays within bounds
  followCursor: true,
  // Add custom positioning logic
  custom: function({ series, seriesIndex, dataPointIndex, w }) {
    const seriesName = w.config.series[seriesIndex].name;
    const value = series[seriesIndex][dataPointIndex];
    const categoryName = categories[dataPointIndex];
    
    // Calculate total for this column (all series combined)
    const totalColumn = series.reduce((sum: number, s: number[]) => sum + (s[dataPointIndex] || 0), 0);
    const percentage = totalColumn > 0 ? ((value / totalColumn) * 100).toFixed(1) : '0.0';
    
    // Get the series color for consistent theming
    const seriesColor = w.config.colors[seriesIndex];
    
    // Get top 3 materials for this category and series
    const top3Materials = getTop3Materials(dataPointIndex, seriesName);
    
    // Format the value
    const formatValue = (val: number) => {
      if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)}Cr`;
      if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(2)}L`;
      if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
      return `₹${val.toFixed(0)}`;
    };

    return `
      <div style="
        background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%);
        border: 0px solid rgba(255, 255, 255, 0.8);
        border-radius: 10px;
        padding: 14px;
        backdrop-filter: blur(8px);
        min-width: 200px;
        font-family: 'Outfit', 'Segoe UI', sans-serif;
        box-shadow: 0 15px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -5px rgba(0,0,0,0.1);
        position: fixed !important;
        z-index: 9999 !important;
        max-height: 400px;
        overflow-y: auto;
        transform: translateY(-100%) !important;
        margin-top: -10px !important;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(226,232,240,0.4);
          padding-bottom: 6px;
        ">
          <div style="display: flex; align-items: center;">
            <div style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${seriesColor};
              margin-right: 6px;
              box-shadow: 0 0 0 2px rgba(255,255,255,0.8);
            "></div>
            <div style="
              font-size: 12px;
              font-weight: 600;
              color: #1e293b;
            ">${seriesName}</div>
          </div>
          <div style="
            font-size: 10px;
            color: ${seriesColor};
            font-weight: 700;
            background: ${seriesColor}15;
            padding: 2px 6px;
            border-radius: 4px;
          ">${percentage}%</div>
        </div>
        
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        ">
          <div style="
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            background: linear-gradient(135deg, ${seriesColor}15 0%, ${seriesColor}08 100%);
            padding: 6px 10px;
            border-radius: 6px;
            border: 1px solid ${seriesColor}25;
          ">${formatValue(value)}</div>
          <div style="
            font-size: 9px;
            color: #64748b;
            font-weight: 500;
            text-align: right;
          ">${categoryName}</div>
        </div>

        ${top3Materials.length > 0 ? `
          <div style="
            border-top: 1px solid rgba(226,232,240,0.4);
            padding-top: 10px;
            margin-top: 2px;
          ">
            <div style="
              font-size: 9px;
              font-weight: 600;
              color: #475569;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            ">Top 3 Materials</div>
            
            ${top3Materials.map((material, index) => {
              const [materialName, materialValue] = material;
              const shortName = materialName.length > 22 ? materialName.substring(0, 22) + "..." : materialName;
              const materialPercentage = value > 0 ? ((materialValue / value) * 100).toFixed(0) : '0';
              
              return `
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 4px 6px;
                  margin-bottom: 3px;
                  background: rgba(248,250,252,0.6);
                  border-radius: 5px;
                  border-left: 2px solid ${seriesColor};
                " title="${materialName}">
                  <div style="
                    font-size: 9px;
                    color: #334155;
                    font-weight: 500;
                    flex: 1;
                    margin-right: 6px;
                    line-height: 1.2;
                  ">
                    <span style="
                      display: inline-block;
                      width: 12px;
                      height: 12px;
                      background: ${seriesColor}20;
                      color: ${seriesColor};
                      border-radius: 50%;
                      text-align: center;
                      line-height: 12px;
                      font-size: 7px;
                      font-weight: 700;
                      margin-right: 4px;
                    ">${index + 1}</span>
                    ${shortName}
                  </div>
                  <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 1px;
                  ">
                    <div style="
                      font-size: 9px;
                      color: #0f172a;
                      font-weight: 600;
                      background: rgba(255,255,255,0.8);
                      padding: 1px 4px;
                      border-radius: 3px;
                      line-height: 1.1;
                    ">${formatValue(materialValue)}</div>
                    <div style="
                      font-size: 7px;
                      color: ${seriesColor};
                      font-weight: 700;
                      background: ${seriesColor}10;
                      padding: 1px 3px;
                      border-radius: 2px;
                    ">${materialPercentage}%</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },
},

  xaxis: {
    type: "category",
    categories: categories,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      rotate: 0,
      style: {
        fontSize: "13px",
        fontWeight: 500,
        colors: "#6B7280",
      },
    },
  },

  yaxis: {
  tickAmount: 10,
  labels: {
    offsetX: -8,
    formatter: (val: number) => {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(2)}L`;
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
},
    style: {
      fontSize: "13px",
      fontWeight: 500,
      colors: "#6B7280",
    },
  },
  axisBorder: { show: false },
  axisTicks: { show: false },
},
  responsive: [
    {
      breakpoint: 768,
      options: {
        chart: { height: 260 },
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
   
   <div className="w-full text-center sm:w-auto sm:order-2 py-2">
  
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
  key={series.map((s) => s.data.length).join("-")}
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
