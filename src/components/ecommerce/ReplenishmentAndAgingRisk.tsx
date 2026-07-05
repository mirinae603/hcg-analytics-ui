"use client";
import React, { useEffect, useState } from "react";
import DropdownWithSearch from "../common/FilterSearch";
import { useRegion } from '@/context/RegionContext'
import {DASHBOARD_API_BASE_URL} from '@/utils/config';
import DataTableInsights from '@/components/ecommerce/ForecastInsights';



interface InventoryForecastData {
  aging_risk: string;
  demand_forecast: number;
  inventory_aging_risk: boolean;
  material_id: string;
  replenishment_quantity: number;
  plant: string;
  safe_stock: number;
  closing_stock: number;
  stock_replenishment_prediction: boolean;
}

interface MaterialOption {
  Material: string;
  "Material Description": string;
}

interface TopItem {
  material_id: string;
  replenishment_quantity: number;
  aging_risk: string;
  closing_stock: number;
  demand_forecast: number;
}

interface SummaryStats {
  total_materials: number;
  total_closing_stock: number;
  total_replenishment_needed: number;
  materials_needing_replenishment: number;
  materials_with_aging_risk: number;
  avg_demand_forecast: number;
  aging_risk_breakdown: {
    [key: string]: number;
  };
}

export default function ReplenishmentAndAgingRiskDashboard() {
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [allItemsStats, setAllItemsStats] = useState<SummaryStats | null>(null);
  const [topReplenishmentItems, setTopReplenishmentItems] = useState<TopItem[]>([]);
  const [topAgingRiskItems, setTopAgingRiskItems] = useState<TopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedRegion } = useRegion();
  const [selectedFilter, setSelectedFilter] = useState<MaterialOption | null>(null);
  const [optionsFilter, setOptionsFilter] = useState<MaterialOption[]>([]);
  
  // Load material options
  useEffect(() => {
    const regionName = selectedRegion?.name ?? "";
    if (!regionName) return;
    
    fetch(`/forecastMappings/${regionName}_forecast_material_catalogue.json`)
      .then((res) => res.json())
      .then((data: MaterialOption[]) => {
        const extendedData = [
          { Material: "All Items", "Material Description": "All Materials" },
          ...data,
        ];
        setOptionsFilter(extendedData);
        if (extendedData.length > 0) {
          setSelectedFilter(extendedData[0]);
        }
      })
      .catch((err) => console.error("Failed to load options:", err));
  }, [selectedRegion]);

  // Fetch data for "All Items" (for tables - this doesn't change)
  useEffect(() => {
    const fetchAllItemsData = async () => {
      const regionName = selectedRegion?.name ?? "";
      if (!regionName) return;
      
      try {
        const baseUrl = `${DASHBOARD_API_BASE_URL}/inventory/replenishment-data`;
        const query = new URLSearchParams({
          plant: regionName,
        });

        const res = await fetch(`${baseUrl}?${query.toString()}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const response = await res.json();
        console.log("Recieved Data : ", response);
        setAllItemsStats(response.summary_stats || null);
        setTopReplenishmentItems(response.top_replenishment || []);
        setTopAgingRiskItems(response.top_aging_risk || []);
        
      } catch (err) {
        console.error("Failed to fetch all items data:", err);
        setAllItemsStats(null);
        setTopReplenishmentItems([]);
        setTopAgingRiskItems([]);
      }
    };

    fetchAllItemsData();
  }, [selectedRegion]);

  // Fetch filtered data for cards
  useEffect(() => {
    const fetchFilteredData = async () => {
      const regionName = selectedRegion?.name ?? "";
      if (!regionName || !selectedFilter) return;
      
      try {
        setIsLoading(true);
        const baseUrl = `${DASHBOARD_API_BASE_URL}/inventory/replenishment-data`;
        const query = new URLSearchParams({
          plant: regionName,
        });

        if (selectedFilter.Material !== "All Items") {
          query.append("material_id", selectedFilter.Material);
        }

        const res = await fetch(`${baseUrl}?${query.toString()}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const response = await res.json();
        console.log("Recieved Data : ", response);
        setSummaryStats(response.summary_stats || null);
        
      } catch (err) {
        console.error("Failed to fetch filtered data:", err);
        setSummaryStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredData();
  }, [selectedFilter, selectedRegion]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

const getAgingRiskColor = (category: string) => {
  if (category.includes('1+') || category.includes('6+')) {
    // High Risk – Soft Rose with a deeper shade
    return 'bg-rose-300/40 text-rose-950 border border-rose-400/30 backdrop-blur-md';
  } else if (category.includes('<3') || category.includes('3+')) {
    // Medium Risk – Soft Blue, lighter and calming
    return 'bg-sky-200/40 text-sky-900 border border-sky-300/30 backdrop-blur-md';
  }

  // Low Risk – Soft Green, very light
  return 'bg-emerald-100/40 text-emerald-900 border border-emerald-200/30 backdrop-blur-md';
};

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    iconBg,
    isLoading 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    iconBg: string;
    isLoading?: boolean;
  }) => (
    <div className="group relative overflow-hidden bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/40 hover:bg-white hover:shadow-lg hover:shadow-slate-200/20 transition-all duration-500 ease-out">
      <div className="relative p-8">
        <div className="flex items-start justify-between mb-6">
          <div className={`w-14 h-14 rounded-2xl ${iconBg} shadow-sm`}>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500 tracking-wide">{title}</p>
          {isLoading ? (
            <div className="h-9 bg-slate-200/60 rounded-xl animate-pulse"></div>
          ) : (
            <p className="text-4xl font-light text-slate-800 tracking-tight">{value}</p>
          )}
          {subtitle && (
            <p className="text-sm text-slate-400 font-medium">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/30">
      <div className="max-w-7xl mx-auto px-6 py-0 lg:px-8">
        
        {/* Header */}
        <DataTableInsights 
        apiBaseUrl={DASHBOARD_API_BASE_URL}
        initialWeek="week_1"
        plantName={selectedRegion?.name}
        title=""
        description={""}
      />
  
  


        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-slate-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-2 border-transparent border-t-slate-400 rounded-full animate-spin"></div>
            </div>
            <p className="mt-6 text-slate-500 font-medium">Loading dashboard</p>
          </div>
        ) : (
          
          <div className="space-y-12">
            
          
            {/* Metrics Grid */}
<div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/40 mt-5">
<div className="flex justify-center">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
    <div className="bg-transparent rounded-2xl z-[9999] mb-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5">
        {/* Left side - Heading (commented out) */}
        {/* <div className="flex-1">
          <h1 className="text-2xl font-light text-slate-500 tracking-tight">
            Stock Replenishment and Aging Risk Forecast
          </h1>
        </div> */}
        
        {/* Right side - Dropdown */}
        <div className="flex-shrink-0 relative">
          <div className="bg-transparent backdrop-blur-sm rounded-2xl relative">
            <DropdownWithSearch
              optionsFilter={optionsFilter}
              selectedOption={selectedFilter}
              onChange={setSelectedFilter}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 p-7">
  {selectedFilter?.Material === "All Items" ? (
    // Cards for "All Items"
    <>
      <MetricCard
        title="Total Materials"
        value={summaryStats?.total_materials?.toLocaleString() || '0'}
        iconBg="bg-gradient-to-br from-blue-100 to-blue-200"
      />
      <MetricCard
        title="Current Stock"
        value={formatNumber(summaryStats?.total_closing_stock || 0)}
        iconBg="bg-gradient-to-br from-violet-100 to-violet-200"
      />
      <MetricCard
        title="Replenishment Needed"
        value={formatNumber(Math.round(summaryStats?.total_replenishment_needed || 0))}
        subtitle={`${summaryStats?.materials_needing_replenishment || 0} materials`}
        iconBg="bg-gradient-to-br from-amber-100 to-amber-200"
      />
      <MetricCard
        title="High Risk Items"
        value={summaryStats?.aging_risk_breakdown?.['1+ Year'] || 0}
        subtitle="1+ Year aging risk"
        iconBg="bg-gradient-to-br from-rose-100 to-rose-200"
      />
    </>
  ) : (
    // Cards for individual items
    <>
      <MetricCard
        title="Current Stock"
        value={formatNumber(summaryStats?.total_closing_stock || 0)}
        subtitle="Units in inventory"
        iconBg="bg-gradient-to-br from-violet-100 to-violet-200"
      />
      <MetricCard
        title="Replenishment Needed"
        value={formatNumber(Math.round(summaryStats?.total_replenishment_needed || 0))}
        subtitle="Units to replenish"
        iconBg="bg-gradient-to-br from-amber-100 to-amber-200"
      />
      <MetricCard
        title="Demand Forecast"
        value={formatNumber(Math.round(summaryStats?.avg_demand_forecast || 0))}
        subtitle="Predicted demand"
        iconBg="bg-gradient-to-br from-green-100 to-green-200"
      />
      <MetricCard
        title="Risk Category"
        value={Object.keys(summaryStats?.aging_risk_breakdown || {})[0] || 'N/A'}
        subtitle="Aging risk level"
        iconBg="bg-gradient-to-br from-rose-100 to-rose-200"
      />
    </>
  )}
</div>
</div>


            
            {allItemsStats?.aging_risk_breakdown && (
              <div className="bg-white backdrop-blur-sm rounded-3xl border border-slate-200/40 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100/60">
                  <h3 className="text-xl font-medium text-slate-900">Risk Distribution</h3>
                  <p className="text-slate-600 mt-2">Inventory aging risk breakdown across all categories</p>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {Object.entries(allItemsStats.aging_risk_breakdown)
                      .sort(([,a], [,b]) => b - a)
                      .map(([category, count]) => (
                      <div key={category} className={`p-6 rounded-2xl text-center transition-all duration-300 hover:scale-105 ${getAgingRiskColor(category)}`}>
                        <p className="font-light text-3xl mb-2">{count.toLocaleString()}</p>
                        <p className="text-sm font-medium">{category}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
           
            {/* Data Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              
              

              
            </div>
            {/* Replenishment Table */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/40 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-slate-100/60">
                  <h3 className="text-xl font-medium text-slate-900">
                    Top Replenishment Needs
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">Materials requiring immediate attention</p>
                </div>
                <div className="overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="bg-slate-50/80 sticky top-0">
                        <tr>
                          <th className="text-left py-4 px-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">Rank</th>
                          <th className="text-left py-4 px-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">Material ID</th>
                          <th className="text-right py-4 px-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity Needed</th>
                          <th className="text-right py-4 px-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">Current Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {topReplenishmentItems.slice(0, 20).map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/40 transition-colors duration-200">
                            <td className="py-5 px-8">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-700">{index + 1}</span>
                              </div>
                            </td>
                            <td className="py-5 px-8">
                              <code className="bg-slate-100 text-slate-800 px-3 py-2 rounded-xl text-sm font-mono">
                                {item.material_id}
                              </code>
                            </td>
                            <td className="py-5 px-8 text-right">
                              <span className="font-medium text-rose-600 text-lg">
                                {item.replenishment_quantity != null 
  ? Math.round(item.replenishment_quantity).toLocaleString() 
  : 'N/A'}

                              </span>
                            </td>
                            <td className="py-5 px-8 text-right text-slate-700 font-medium">
                              {item.closing_stock?.toLocaleString() || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {topReplenishmentItems.length === 0 && (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500 font-medium">No replenishment data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            {/* Aging Risk Table */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/40 overflow-hidden">
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-8 py-6 border-b border-slate-100/60">
                  <h3 className="text-xl font-medium text-slate-900">
                    Highest Aging Risk Items
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">Materials with critical aging concerns</p>
                </div>
                <div className="overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="bg-slate-50/80 sticky top-0">
                        <tr>
                          <th className="text-left py-4 px-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">Rank</th>
                          <th className="text-left py-4 px-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">Material ID</th>
                          <th className="text-left py-4 px-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">Risk Level</th>
                          <th className="text-right py-4 px-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {topAgingRiskItems.slice(0, 20).map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/40 transition-colors duration-200">
                            <td className="py-5 px-8">
                              <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-rose-700">{index + 1}</span>
                              </div>
                            </td>
                            <td className="py-5 px-8">
                              <code className="bg-slate-100 text-slate-800 px-3 py-2 rounded-xl text-sm font-mono">
                                {item.material_id}
                              </code>
                            </td>
                            <td className="py-5 px-8">
                              <span className={`inline-flex px-4 py-2 rounded-xl text-sm font-medium ${getAgingRiskColor(item.aging_risk)}`}>
                                {item.aging_risk}
                              </span>
                            </td>
                            <td className="py-5 px-8 text-right text-slate-900 font-medium text-lg">
                              {item.closing_stock?.toLocaleString() || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {topAgingRiskItems.length === 0 && (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500 font-medium">No aging risk data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
