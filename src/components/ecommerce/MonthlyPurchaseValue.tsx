"use client";
import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import DropdownWithSearch from "../common/FilterSearch";
import { useRegion } from '@/context/RegionContext'
import FilterTabSwitcher from "../common/FilterTabSwitcher";
import {DASHBOARD_API_BASE_URL} from '@/utils/config';

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface StockChangeData {
  Year: string
  Month: string
  "Week End": string;
  "Monthly Purchase Value": string;
}

interface MaterialOption {
  Material: string;
  "Material Description": string;
}

interface MaterialGroupOption {
  "Material Group": string;
}

export default function MonthlyPurchaseValueChart() {
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
  
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>('2024-25');
  const [availableFinancialYears, setAvailableFinancialYears] = useState<string[]>([]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  // Helper function to convert calendar year to financial year
  const getFinancialYear = (year: number, month: number): string => {
    if (month >= 4) { // April to March
      return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
  };

  // Helper function to get financial year from calendar year and month name
  const getFinancialYearFromData = (yearStr: string, monthName: string): string => {
    const year = parseInt(yearStr);
    const monthNumber = monthNameToNumber[monthName as keyof typeof monthNameToNumber];
    const monthNum = parseInt(monthNumber);
    
    return getFinancialYear(year, monthNum);
  };

  // Month name to number mapping
  const monthNameToNumber = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };

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
        setSelectedFilter(extendedData[0]);
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
        const regionName = selectedRegion?.name ?? "";

        const baseUrl = `${DASHBOARD_API_BASE_URL}/kpi/monthly-purchase-value`;
        const query = new URLSearchParams({
          Plant: regionName,
        });

        if (filterTab === "material" && selectedFilter) {
          query.append("Material", selectedFilter.Material);
        } else if (filterTab === "group" && selectedGroup) {
          query.append("MaterialGroup", selectedGroup["Material Group"]);
        } else {
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${baseUrl}?${query.toString()}`);
        const data: StockChangeData[] = await res.json();
        console.log("Fetched Data : ", data)
        setRawData(data);

        // Generate financial years from the data
        const financialYearsSet = new Set<string>();
        data.forEach(item => {
          if (item.Year && item.Month) {
            const fyear = getFinancialYearFromData(item.Year, item.Month);
            financialYearsSet.add(fyear);
          }
        });
        
        const fyears = Array.from(financialYearsSet).sort();
        setAvailableFinancialYears(fyears);

        // Set default to latest financial year
        if (!selectedFinancialYear && fyears.length > 0) {
          setSelectedFinancialYear(fyears[fyears.length - 1]);
        }

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
    if (rawData.length === 0 || !selectedFinancialYear) return;

    // Financial year months in order (April to March)
    const financialYearMonths = [
      { month: '04', name: 'Apr', year: 0 },
      { month: '05', name: 'May', year: 0 },
      { month: '06', name: 'Jun', year: 0 },
      { month: '07', name: 'Jul', year: 0 },
      { month: '08', name: 'Aug', year: 0 },
      { month: '09', name: 'Sep', year: 0 },
      { month: '10', name: 'Oct', year: 0 },
      { month: '11', name: 'Nov', year: 0 },
      { month: '12', name: 'Dec', year: 0 },
      { month: '01', name: 'Jan', year: 1 },
      { month: '02', name: 'Feb', year: 1 },
      { month: '03', name: 'Mar', year: 1 }
    ];

    // Parse financial year (e.g., "2024-25" -> startYear: 2024, endYear: 2025)
    const [startYearStr, endYearStr] = selectedFinancialYear.split('-');
    const startYear = parseInt(startYearStr);
    const endYear = parseInt(`20${endYearStr}`);

    // Filter data for selected financial year
    const financialYearData = rawData.filter(entry => {
      if (!entry.Year || !entry.Month) return false;
      
      const entryFY = getFinancialYearFromData(entry.Year, entry.Month);
      return entryFY === selectedFinancialYear;
    });

    // Create lookup map for the data
    const dataMap = new Map();
    financialYearData.forEach(entry => {
      if (entry.Month) {
        const monthNumber = monthNameToNumber[entry.Month as keyof typeof monthNameToNumber];
        const entryYear = parseInt(entry.Year);
        
        // Create a unique key combining year and month
        const dataKey = `${entryYear}-${monthNumber}`;
        dataMap.set(dataKey, Number(entry["Monthly Purchase Value"]) || 0);
      }
    });

    // Build complete data array for financial year
    const completeData = financialYearMonths.map(({ month, name, year }) => {
      const actualYear = year === 0 ? startYear : endYear;
      const dataKey = `${actualYear}-${month}`;
      
      return {
        date: `${name} ${actualYear}`,
        value: dataMap.get(dataKey) || 0
      };
    });

    setCategories(completeData.map(d => d.date));
    setSeries([{ name: "Monthly Purchase Value", data: completeData.map(d => d.value) }]);
    
  }, [rawData, selectedFinancialYear]);

  const yValues = series[0].data;
  const maxY = Math.max(...yValues);
  const minY = Math.min(...yValues);

  const yPadding = (maxY - minY) * 0.2;
  const adjustedMinY = Math.max(0, Math.floor(minY - yPadding));
  const adjustedMaxY = Math.ceil(maxY + yPadding);

  const data = series[0].data;
  const maxPositive = Math.max(...data.filter(value => value > 0));
  const maxPositiveIndex = data.indexOf(maxPositive);

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
        columnWidth: "50%",
        distributed: false,
        dataLabels: {
          position: "top",
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
        opacityTo: 0.05,
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
        format: "MMM yyyy",
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
      tickAmount: 12,
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
            return `₹${(value / 1e7).toFixed(2)}Cr`;
          } else if (value >= 1e5) {
            return `₹${(value / 1e5).toFixed(2)}L`;
          } else if (value >= 1e3) {
            return `₹${(value / 1e3).toFixed(2)}K`;
          } else {
            return `₹${value.toFixed(0)}`;
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
      offsetY: -22,
      style: {
        fontSize: "11px",
        fontWeight: 500,
        colors: ["#374151"],
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
          return `₹${(value / 1e7).toFixed(2)}Cr`;
        } else if (value >= 1e5) {
          return `₹${(value / 1e5).toFixed(2)}L`;
        } else if (value >= 1e3) {
          return `₹${(value / 1e3).toFixed(2)}K`;
        } else {
          return `₹${value.toFixed(0)}`;
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
            text: "Max Purchase",
            offsetX: -0,
            offsetY: -25,
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
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full text-center sm:w-auto sm:order-2 py-2">
          {/* Optional heading can be added here */}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            className="flex items-center justify-between w-32 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <span>FY {selectedFinancialYear}</span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isYearDropdownOpen && (
            <div className="absolute top-12 left-0 w-32 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2 animate-in fade-in-0 zoom-in-95 duration-200">
              {availableFinancialYears.map(fyear => (
                <button
                  key={fyear}
                  onClick={() => {
                    setSelectedFinancialYear(fyear);
                    setIsYearDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-blue-50 transition-colors duration-150 ${
                    selectedFinancialYear === fyear ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
                  }`}
                >
                  FY {fyear}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:order-3">
          <FilterTabSwitcher selected={filterTab} onChange={setFilterTab} />

          {filterTab === "material" ? (
            <DropdownWithSearch
              optionsFilter={optionsFilter}
              selectedOption={selectedFilter}
              onChange={setSelectedFilter}
            />
          ) : (
            <DropdownWithSearch
              optionsFilter={groupOptions.map((g) => ({
                Material: g["Material Group"],
                "Material Description": g["Material Group"],
              }))}
              selectedOption={
                selectedGroup
                  ? {
                      Material: selectedGroup["Material Group"],
                      "Material Description": selectedGroup["Material Group"],
                    }
                  : null
              }
              onChange={(selected) => {
                const group = groupOptions.find(
                  (g) => g["Material Group"] === selected.Material
                );
                if (group) setSelectedGroup(group);
              }}
            />
          )}
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
              height={410}
            />
          )}
        </div>
      </div>
    </div>
  );
}
