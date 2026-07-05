"use client";
import React, { useEffect, useState } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import DropdownWithSearch from "../common/FilterSearch";
import { useRegion } from '@/context/RegionContext'
import FilterTabSwitcher from "../common/FilterTabSwitcher";
import {DASHBOARD_API_BASE_URL} from '@/utils/config';

interface ForecastData {
  Material: string;
  Plant: string;
  "Posting Date": string;
  "Matl Group": string;
  sales_qty: number;
  Lower_Bound_Sales_Quantity_Forecast: number;
  Sales_Quantity_Forecast: number;
  Upper_Bound_Sales_Quantity_Forecast: number;
}

interface MaterialOption {
  Material: string;
  "Material Description": string;
}

interface MaterialGroupOption {
  "Material Group": string;
}

interface ChartDataPoint {
  week: string;
  actualSales: number | null;
  forecast: number | null;  // Change this
  lowerBound: number | null;  // Change this
  upperBound: number | null;  // Change this
  isFuture: boolean;
}

interface DownloadCSVProps {
  data: ChartDataPoint[];
  filename?: string;
}

function DownloadCSV({ data, filename = 'cashflow_forecast.csv' }: DownloadCSVProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!data || data.length === 0) return;
    
    setIsDownloading(true);
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const csvRows: string[] = [];
    const headers = ['Week', 'Actual Sales', 'Forecast', 'Lower Bound', 'Upper Bound', 'Status'];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = [
        `"${row.week}"`,
        row.actualSales !== null ? row.actualSales.toString() : '',
        row.forecast !== null ? row.forecast.toString() : '',
        row.lowerBound !== null ? row.lowerBound.toString() : '',
        row.upperBound !== null ? row.upperBound.toString() : '',
        row.isFuture ? 'Future' : 'Historical'
      ];
      csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setIsDownloading(false);
  };

  return (
    <div className="relative group">
  {/* Subtle breathing ring */}
  <div className="absolute inset-0 w-14 h-14 rounded-full bg-slate-900/5 group-hover:bg-slate-900/8 transition-all duration-500 group-hover:scale-125"></div>
  
  <button 
    onClick={handleDownload}
    disabled={isDownloading || !data || data.length === 0}
    className="relative w-14 h-14 rounded-full 
               bg-white/80 hover:bg-white/90
               backdrop-blur-md
               shadow-lg hover:shadow-xl
               border border-slate-200/50 hover:border-slate-300/60
               disabled:opacity-60 disabled:cursor-not-allowed
               transition-all duration-300 ease-out
               hover:scale-105
               group flex items-center justify-center"
  >
    {isDownloading ? (
      <div className="relative w-6 h-6">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-slate-600 animate-spin"></div>
      </div>
    ) : (
      <svg 
        className="w-6 h-6 text-slate-700 group-hover:text-slate-900 transition-colors duration-200" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
        />
      </svg>
    )}
    
    {/* Tooltip */}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap backdrop-blur-sm pointer-events-none">
      Export CSV ({data?.length || 0} rows)
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900/90"></div>
    </div>
  </button>
</div>

  );
}


interface ChartDataTableProps {
  data: ChartDataPoint[];
}

interface SortConfig {
  key: keyof ChartDataPoint | '';
  direction: 'asc' | 'desc';
}

function ChartDataTable({ data }: ChartDataTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'week', direction: 'desc' });

  useEffect(() => {
    if (data && data.length > 0 && sortConfig.key === '') {
      setSortConfig({ key: 'week', direction: 'desc' });
    }
  }, [data]);

  const sortedData = React.useMemo(() => {
    let sortableData = [...data];
    
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        // Special handling for week column - sort by actual date
        if (sortConfig.key === 'week') {
          const aDate = new Date(a.week);
          const bDate = new Date(b.week);
          
          // Handle invalid dates
          if (isNaN(aDate.getTime()) && isNaN(bDate.getTime())) return 0;
          if (isNaN(aDate.getTime())) return sortConfig.direction === 'asc' ? 1 : -1;
          if (isNaN(bDate.getTime())) return sortConfig.direction === 'asc' ? -1 : 1;
          
          // Compare dates
          if (aDate < bDate) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aDate > bDate) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        
        // Original sorting logic for other columns
        let aVal: any = a[sortConfig.key as keyof ChartDataPoint];
        let bVal: any = b[sortConfig.key as keyof ChartDataPoint];
        
        // Handle null values
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bVal === null) return sortConfig.direction === 'asc' ? -1 : 1;
        
        // String comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return sortableData;
  }, [data, sortConfig]);

  const requestSort = (key: keyof ChartDataPoint) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: keyof ChartDataPoint) => {
    if (sortConfig.key === columnName) {
      return sortConfig.direction === 'asc' ? (
        <svg className="w-4 h-4 ml-1 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 ml-1 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="mt-8 p-12 text-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Data Available</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Select filters to view forecast data in table format</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800/50 dark:via-slate-900/50 dark:to-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-5 rounded-xl bg-sky-100 dark:bg-sky-900/30">
            {/* <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6" />
            </svg> */}
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-500 dark:text-slate-200">
              Sales Quantity Forecast Table
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {sortedData.length} records
            </p>
          </div>
        </div>
        
        {/* Enhanced Download Button */}
        <DownloadCSV data={sortedData} />
      </div>
      
      {/* Scrollable Table Container */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm overflow-hidden shadow-sm">
        {/* Fixed Header */}
        <div className="bg-gradient-to-r from-slate-100/80 to-slate-50/80 dark:from-slate-900/80 dark:to-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/60">
          <table className="min-w-full">
            <thead>
              <tr>
                <th
                  onClick={() => requestSort('week')}
                  className="group px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex items-center">
                    <span>Week</span>
                    {getSortIcon('week')}
                  </div>
                </th>
                <th
                  onClick={() => requestSort('actualSales')}
                  className="group px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-end">
                    <span>Actual Sales</span>
                    {getSortIcon('actualSales')}
                  </div>
                </th>
                <th
                  onClick={() => requestSort('forecast')}
                  className="group px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-end">
                    <span>Forecast</span>
                    {getSortIcon('forecast')}
                  </div>
                </th>
                <th
                  onClick={() => requestSort('lowerBound')}
                  className="group px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-end">
                    <span>Lower Bound</span>
                    {getSortIcon('lowerBound')}
                  </div>
                </th>
                <th
                  onClick={() => requestSort('upperBound')}
                  className="group px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-end">
                    <span>Upper Bound</span>
                    {getSortIcon('upperBound')}
                  </div>
                </th>
                <th
                  onClick={() => requestSort('isFuture')}
                  className="group px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-center">
                    <span>Status</span>
                    {getSortIcon('isFuture')}
                  </div>
                </th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable Body */}
        <div className="max-h-250 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
          <table className="min-w-full">
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
              {sortedData.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors duration-150 group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-sky-400 dark:bg-sky-500 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      {row.week}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right font-mono">
                    {row.actualSales !== null ? (
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md">
                        {row.actualSales.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right font-mono">
                    {row.forecast !== null ? (
                      <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md">
                        {row.forecast.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right font-mono">
                    {row.lowerBound !== null ? (
                      <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md">
                        {row.lowerBound.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right font-mono">
                    {row.upperBound !== null ? (
                      <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-md">
                        {row.upperBound.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                      row.isFuture 
                        ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-700/50' 
                        : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200 border border-green-200 dark:border-green-700/50'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        row.isFuture ? 'bg-amber-500' : 'bg-green-500'
                      }`}></div>
                      {row.isFuture ? 'Future' : 'Historical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SalesForecastChart() {
  type LineKey = 'actualSales' | 'forecast' | 'upperBound' | 'lowerBound';
  const [rawData, setRawData] = useState<ForecastData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedRegion } = useRegion()
  const [selectedFilter, setSelectedFilter] = useState<MaterialOption | null>(null);
  const [optionsFilter, setOptionsFilter] = useState<MaterialOption[]>([]);
  type FilterTabType = "material" | "group";
  const [filterTab, setFilterTab] = useState<FilterTabType>("material");
  const [selectedGroup, setSelectedGroup] = useState<MaterialGroupOption | null>(null);
  const [groupOptions, setGroupOptions] = useState<MaterialGroupOption[]>([]);
  

  const [visibleLines, setVisibleLines] = useState<Record<LineKey, boolean>>({
  actualSales: true,
  forecast: true,
  upperBound: true,
  lowerBound: true
});


const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  // Load material options
  useEffect(() => {
    const regionName = selectedRegion?.name ?? "";
    if (!regionName) return;
    
    fetch(`/forecastMappings/${regionName}_forecast_material_catalogue.json`)
      .then((res) => res.json())
      .then((data: MaterialOption[]) => {
        const extendedData = [
          ...data,
        ];
        setOptionsFilter(extendedData);
        if (extendedData.length > 2) {
          setSelectedFilter(extendedData[1]);
        }
      })
      .catch((err) => console.error("Failed to load options:", err));
  }, [selectedRegion]);
  
  // Load group options
  useEffect(() => {
    const regionName = selectedRegion?.name ?? "";
    if (!regionName) return;
    
    fetch(`/${regionName}_Material_Group_Catalogue.json`)
      .then((res) => res.json())
      .then((data: MaterialGroupOption[]) => {
        setGroupOptions(data);
        if (data.length > 0) {
          setSelectedGroup(data[0]);
        }
      })
      .catch((err) => console.error("Failed to load group options:", err));
  }, [selectedRegion]);

  // Fetch forecast data
  // Fetch forecast data
useEffect(() => {
  const fetchData = async () => {
    const regionName = selectedRegion?.name ?? "";
    if (!regionName) return;
    
    const hasValidFilter = (filterTab === "material" && selectedFilter) || 
                          (filterTab === "group" && selectedGroup);
    
    // ✅ Guard clause - exit early if no valid filter
    if (!hasValidFilter) {
      setIsLoading(false);
      setRawData([]);
      return;
    }

    try {
      setIsLoading(true);
      const baseUrl = `${DASHBOARD_API_BASE_URL}/forecast/sales-forecast`;
      const query = new URLSearchParams({
        Plant: regionName,
      });

      if (filterTab === "material" && selectedFilter && selectedFilter.Material !== "All Items") {
        query.append("Material", selectedFilter.Material);
      } else if (filterTab === "group" && selectedGroup) {
        query.append("MaterialGroup", selectedGroup["Material Group"]);
      }

      const res = await fetch(`${baseUrl}?${query.toString()}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data: ForecastData[] = await res.json();
      
      setRawData(data || []);
      
    } catch (err) {
      console.error("Failed to fetch forecast data:", err);
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [filterTab, selectedFilter, selectedGroup, selectedRegion]);


  // Process data for Recharts
useEffect(() => {
  if (!rawData || rawData.length === 0) {
    setChartData([]);
    return;
  }

  try {
    // 1. Find the latest date with valid actual sales
    const latestActualDate = rawData.reduce((latest, entry) => {
      const saleQty = Number(entry.sales_qty);
      const entryDate = new Date(entry["Posting Date"]);

      if (!isNaN(saleQty) && saleQty > 0 && !isNaN(entryDate.getTime())) {
        return (!latest || entryDate > latest) ? entryDate : latest;
      }
      return latest;
    }, null as Date | null);

    const processedData = rawData
      .map((entry) => {
        if (!entry || !entry["Posting Date"]) return null;

        const postingDate = new Date(entry["Posting Date"]);
        if (isNaN(postingDate.getTime())) return null;

        const weekStart = new Date(postingDate);
        const dayOfWeek = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - dayOfWeek); // start of week

        const weekLabel = weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const isAfterLatestActual = latestActualDate ? postingDate > latestActualDate : false;

        return {
          week: weekLabel,
          weekDate: weekStart,
          actualSales: isAfterLatestActual ? null : (Number(entry.sales_qty) || 0),
          forecast: (entry.Sales_Quantity_Forecast !== undefined && !isNaN(Number(entry.Sales_Quantity_Forecast)))
            ? Number(entry.Sales_Quantity_Forecast)
            : null,
          lowerBound: (entry.Lower_Bound_Sales_Quantity_Forecast !== undefined && !isNaN(Number(entry.Lower_Bound_Sales_Quantity_Forecast)))
            ? Number(entry.Lower_Bound_Sales_Quantity_Forecast)
            : null,
          upperBound: (entry.Upper_Bound_Sales_Quantity_Forecast !== undefined && !isNaN(Number(entry.Upper_Bound_Sales_Quantity_Forecast)))
            ? Number(entry.Upper_Bound_Sales_Quantity_Forecast)
            : null,
          isFuture: isAfterLatestActual,
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => a!.weekDate.getTime() - b!.weekDate.getTime());

    // 3. Group by week and sum values
    const weeklyData = processedData.reduce((acc, curr) => {
      if (!curr) return acc;

      const existing = acc.find(item => item.week === curr.week);
      if (existing) {
        existing.actualSales = existing.actualSales !== null && curr.actualSales !== null 
          ? existing.actualSales + curr.actualSales 
          : (existing.actualSales ?? curr.actualSales);
        existing.forecast = existing.forecast !== null && curr.forecast !== null 
          ? existing.forecast + curr.forecast 
          : (existing.forecast ?? curr.forecast);
        existing.lowerBound = existing.lowerBound !== null && curr.lowerBound !== null 
          ? existing.lowerBound + curr.lowerBound 
          : (existing.lowerBound ?? curr.lowerBound);
        existing.upperBound = existing.upperBound !== null && curr.upperBound !== null 
          ? existing.upperBound + curr.upperBound 
          : (existing.upperBound ?? curr.upperBound);
      } else {
        acc.push(curr);
      }

      return acc;
    }, [] as NonNullable<typeof processedData[0]>[]);

    // 4. Find the first non-zero forecast value index
    const firstNonZeroForecastIndex = weeklyData.findIndex(item => 
      item.forecast !== null && item.forecast > 0
    );

    // 5. Clean forecast data before first non-zero value
    const cleanedData = weeklyData.map((item, index) => {
      if (index < firstNonZeroForecastIndex) {
        return {
          ...item,
          forecast: null,
          lowerBound: null,
          upperBound: null
        };
      }
      return item;
    });

    setChartData(cleanedData);

  } catch (error) {
    console.error("Error processing data:", error);
    setChartData([]);
  }
}, [rawData]);



  // Enhanced Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-200/30 rounded-lg shadow-sm">
        <p className="font-medium text-slate-700 mb-3 text-sm border-b border-slate-100 pb-2">
          Week of {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-slate-600">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-800 bg-slate-50/60 px-2 py-1 rounded">
                {entry.value !== null && entry.value !== undefined 
                  ? entry.value.toLocaleString() 
                  : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};


  // Add this function before your return statement
const handleLegendClick = (dataKey: LineKey) => {
  setVisibleLines(prev => ({
    ...prev,
    [dataKey]: !prev[dataKey]
  }));
};


const handleLegendMouseEnter = (dataKey: string) => {
  setHoveredLine(dataKey);
};

const handleLegendMouseLeave = () => {
  setHoveredLine(null);
};

  return (
    <>
    <div className="rounded-2xl border border-slate-200/40 bg-white/98 backdrop-blur-sm px-6 pb-6 pt-6 dark:border-slate-700/40 dark:bg-slate-900/98 shadow-sm transition-all duration-300 hover:shadow-md sm:px-8 sm:pt-8">
      
      <div className="flex flex-col gap-6 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full text-left sm:w-auto sm:order-2 py-3">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-500 dark:text-slate-200">
            Sales Quantity Forecast Analysis
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Weekly Actual vs Forecasted with Confidence Band
          </p>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-end sm:items-center gap-3 sm:order-3">
          {/* <FilterTabSwitcher selected={filterTab} onChange={setFilterTab} /> */}

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

      <div className="max-w-full overflow-hidden rounded-xl bg-slate-50/20 backdrop-blur-sm border border-slate-100/40">
        <div className="w-full h-[550px] p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-3 border-t-sky-300/60 border-r-emerald-300/40 border-b-violet-300/40 border-l-sky-300/60 animate-spin"></div>
                <div className="absolute inset-2 rounded-full bg-slate-100/40 animate-pulse"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-slate-500">Loading forecast data...</p>
                <div className="flex space-x-1 justify-center">
                  <div className="w-2 h-2 bg-sky-300/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-300/60 rounded-full animate-bounce animation-delay-100"></div>
                  <div className="w-2 h-2 bg-violet-300/60 rounded-full animate-bounce animation-delay-200"></div>
                </div>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="text-4xl opacity-20">📊</div>
              <p className="text-sm text-slate-500">No data available for the selected filters</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{
                  top: 0,
                  right: 0,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="upperBoundGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="lowerBoundGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef8886ff" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#ef8b86ff" stopOpacity={0.08}/>
                  </linearGradient>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="2 4" 
                  stroke="#e2e8f0" 
                  opacity={0.3}
                  strokeWidth={0.5}
                />
                
                <XAxis 
  dataKey="week" 
  angle={0}
  textAnchor="end"
  height={90}
  fontSize={11}
  stroke="#64748b"
  tick={{ 
    fill: '#64748b', 
    fontWeight: 400,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }}
  axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
  tickLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }}
  tickFormatter={(value, index) => {
    // Skip first label (index 0) and show only 6 labels total
    if (index === 0) return ''; // Skip first label
    if (index === 1) return '';
    // Calculate which labels to show for exactly 6 labels
    const totalDataPoints = chartData.length;
    const labelsToShow = 7;
    const interval = Math.floor((totalDataPoints - 1) / (labelsToShow - 1));
    
    // Show labels at calculated intervals, starting from index 1
    if ((index - 1) % interval === 0 && index <= (labelsToShow - 1) * interval + 1) {
      return value;
    }
    
    return '';
  }}
/>
                
                <YAxis 
                  fontSize={11}
                  stroke="#64748b"
                  tick={{ 
                    fill: '#64748b', 
                    fontWeight: 400,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                  axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  tickLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Legend 
                verticalAlign="top" 
  wrapperStyle={{
    fontSize: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#475569',
    fontWeight: 400,
    paddingBottom: '30px'
  }}
  iconType="circle"
  onClick={(e) => handleLegendClick(e.dataKey as LineKey)}
  onMouseEnter={(e) => handleLegendMouseEnter(e.dataKey as LineKey)}
  onMouseLeave={handleLegendMouseLeave}
  formatter={(value, entry) => (
    <span 
  style={{ 
    color: visibleLines[entry.dataKey as LineKey] ? entry.color : '#cbd5e1',
    opacity: hoveredLine && hoveredLine !== entry.dataKey ? 0.4 : 1,
    cursor: 'pointer',
    textDecoration: visibleLines[entry.dataKey as LineKey] ? 'none' : 'line-through'
  }}
>
  {value}
</span>

  )}
/>
                
                {/* Confidence Band - Upper (Light Purple) */}
                <Area
  type="monotone"
  dataKey="upperBound"
  stroke="#a5b4fc"
  strokeWidth={1.5}
  strokeDasharray="3 2"
  fill="url(#upperBoundGradient)"
  name="Upper Confidence"
  dot={false}
  connectNulls={false}
  hide={!visibleLines.upperBound}
  strokeOpacity={hoveredLine && hoveredLine !== 'upperBound' ? 0.3 : 0.6}
  fillOpacity={hoveredLine && hoveredLine !== 'upperBound' ? 0.1 : 0.25}
                  activeDot={{ 
                    r: 4, 
                    stroke: '#a5b4fc', 
                    strokeWidth: 1.5, 
                    fill: '#ffffff',
                    opacity: 0.9
                  }}
                  animationBegin={300}
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
                
                {/* Confidence Band - Lower (Light Purple) */}
                <Area
  type="monotone"
  dataKey="lowerBound"
  stroke="#c4b5fd"
  strokeWidth={1.5}
  strokeDasharray="3 2"
  fill="url(#lowerBoundGradient)"
  name="Lower Confidence"
  dot={false}
  connectNulls={false}
  hide={!visibleLines.lowerBound}
  strokeOpacity={hoveredLine && hoveredLine !== 'lowerBound' ? 0.3 : 0.6}
  fillOpacity={hoveredLine && hoveredLine !== 'lowerBound' ? 0.1 : 0.25}
                  activeDot={{ 
                    r: 4, 
                    stroke: '#c4b5fd', 
                    strokeWidth: 1.5, 
                    fill: '#ffffff',
                    opacity: 0.9
                  }}
                  animationBegin={400}
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
                
                {/* Forecast Line (Light Green) */}
                <Area
  type="monotone"
  dataKey="forecast"
  stroke="#ef9686ff"
  strokeWidth={2.5}
  strokeDasharray="6 3"
  fill="url(#forecastGradient)"
  name="Forecast"
  dot={false}
  connectNulls={false}
  hide={!visibleLines.forecast}
  strokeOpacity={hoveredLine && hoveredLine !== 'forecast' ? 0.3 : 0.7}
  fillOpacity={hoveredLine && hoveredLine !== 'forecast' ? 0.1 : 0.3}
                  activeDot={{ 
                    r: 5, 
                    stroke: '#86efac', 
                    strokeWidth: 2, 
                    fill: '#ffffff',
                    opacity: 1
                  }}
                  animationBegin={100}
                  animationDuration={2200}
                  animationEasing="ease-out"
                />
                
                {/* Actual Sales Line (Light Blue) */}
                <Area
  type="monotone"
  dataKey="actualSales"
  stroke="#7dd3fc"
  strokeWidth={2.5}
  name="Actual Sales"
  fill="url(#actualGradient)"
  connectNulls={false}
  dot={false}
  hide={!visibleLines.actualSales}
  strokeOpacity={hoveredLine && hoveredLine !== 'actualSales' ? 0.3 : 0.8}
  fillOpacity={hoveredLine && hoveredLine !== 'actualSales' ? 0.1 : 0.35}
                  activeDot={{ 
                    r: 5, 
                    stroke: '#7dd3fc', 
                    strokeWidth: 2, 
                    fill: '#ffffff',
                    opacity: 1
                  }}
                  animationBegin={600}
                  animationDuration={2400}
                  animationEasing="ease-out"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
     <div className="rounded-2xl border border-slate-200/40 bg-white/98 backdrop-blur-sm px-6 pb-6 pt-0 mt-10 dark:border-slate-700/40 dark:bg-slate-900/98 shadow-sm transition-all duration-300 hover:shadow-md sm:px-8 sm:pt-0">
    <ChartDataTable data={chartData} />
    </div>
    </>
  );
}
