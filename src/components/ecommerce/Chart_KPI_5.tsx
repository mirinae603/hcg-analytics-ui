"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useRegion } from '@/context/RegionContext'
import {DASHBOARD_API_BASE_URL} from '@/utils/config';

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AgingData {
  "Material Name": string;
  "Age Since Last Sale (days)": number;
  "Age Since Last Purchase (days)": number;
  "Aging": string;
  "closing_stock_value": number; // Add this line
}

interface CountUpProps {
  end: number;
  duration?: number;
}
const formatIndianCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value));
};

const formatIndianAbbreviated = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1e7) { // 1 crore
    return `₹${(value / 1e7).toFixed(1)} Cr`;
  } else if (absValue >= 1e5) { // 1 lakh
    return `₹${(value / 1e5).toFixed(1)} Lakh`;
  } else if (absValue >= 1e3) { // 1 thousand
    return `₹${(value / 1e3).toFixed(1)} K`;
  } else {
    return `₹${Math.round(value)}`;
  }
};



function CountUp({ end, duration = 1500 }: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.floor(progress * end);
      setCount(value);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return <>{count}</>;
}

export default function StatisticsChart_KPI5() {
  const [rawData, setRawData] = useState<AgingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedRegion } = useRegion()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const regionName = selectedRegion?.name ?? "";

      const baseUrl = `${DASHBOARD_API_BASE_URL}/kpi/inventory-aging`;
      const query = new URLSearchParams({
        Plant: regionName,
      });

      const res = await fetch(`${baseUrl}?${query.toString()}`);
      // const data = await res.json();
      // const res = await fetch("http://localhost:8000/kpi/inventory-aging?Plant=CHENNAI");
      const data = await res.json();
      console.log("Recieved Data : ", data);
      setRawData(data);
      setIsLoading(false);
    };
    fetchData();
  }, [selectedRegion]);

  const agingValue: Record<string, number> = {}; // Changed from agingCount to agingValue
let totalSaleDays = 0;
const zeroMoving: AgingData[] = [];

rawData.forEach(item => {
  agingValue[item.Aging] = (agingValue[item.Aging] || 0) + item.closing_stock_value; // Sum values instead of count
  if (item["Age Since Last Sale (days)"] > 180 && item["Age Since Last Purchase (days)"] > 180) {
    zeroMoving.push(item);
  }
  totalSaleDays += item["Age Since Last Sale (days)"];
});

console.log("Aging breakdown:", agingValue);
console.log("Raw data sample:", rawData.slice(0, 3));
  const totalItems = rawData.length;
  const avgSaleDays = totalItems ? Math.round(totalSaleDays / totalItems) : 0;

  const rankedZeroMoving = zeroMoving
  .sort((a, b) => b.closing_stock_value - a.closing_stock_value)
  .map((item, i) => ({ ...item, rank: i + 1 }));


  const maxSaleDays = Math.max(...rawData.map(item => item["Age Since Last Sale (days)"]));
const maxPurchaseDays = Math.max(...rawData.map(item => item["Age Since Last Purchase (days)"]));


  const agingCategories = Object.keys(agingValue);
const categoryValues = agingCategories.map(cat => agingValue[cat]); // Changed from categoryCounts to categoryValues


  const now = new Date();
  const trendCounts: Record<string, number> = {};

  zeroMoving.forEach(item => {
    const daysAgo = Math.max(item["Age Since Last Sale (days)"], item["Age Since Last Purchase (days)"]);
    const date = new Date(now.getTime() - daysAgo * 86400000);
    const month = date.toISOString().slice(0, 7);
    trendCounts[month] = (trendCounts[month] || 0) + 1;
  });

  const sortedMonths = Object.keys(trendCounts).sort();
  const lineChartSeries = [{ name: "Zero-Moving Items", data: sortedMonths.map(m => trendCounts[m]) }];

  const agingItemsMap: Record<string, AgingData[]> = {};

rawData.forEach(item => {
  if (!agingItemsMap[item.Aging]) {
    agingItemsMap[item.Aging] = [];
  }
  agingItemsMap[item.Aging].push(item);
});


  const doughnutOptions: ApexOptions = {
  chart: {
    type: "donut",
    fontFamily: 'Inter, system-ui, sans-serif',
    foreColor: '#1f2937',
    toolbar: {
    show: true,
  },
  zoom: {
      enabled: false,
    },
    background: 'transparent',
    dropShadow: {
      enabled: true,
      top: 2,
      left: 0,
      blur: 6,
      color: '#000',
      opacity: 0.08
    }
  },
  labels: agingCategories,
  colors: [
    "rgba(147, 197, 253, 0.75)",
    "rgba(134, 239, 172, 0.75)",
    "rgba(253, 224, 71, 0.75)",
    "rgba(252, 165, 165, 0.75)",
    "rgba(216, 180, 254, 0.75)",
    "rgba(165, 243, 252, 0.75)"
  ],
  fill: {
    type: 'solid',
    opacity: 1
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['rgba(255,255,255,0.6)']
  },
  legend: {
    show: true,
    position: "bottom",
    fontSize: '13px',
    fontWeight: 500,
    horizontalAlign: 'center',
    offsetY: 0,
    itemMargin: { horizontal: 10, vertical: 4 },
    labels: { colors: '#4B5563' }
  },
  plotOptions: {
    pie: {
      expandOnClick: false,
      donut: {
        size: '50%',
        labels: {
          show: true,
          name: {
            show: true,
            fontSize: '14px',
            fontWeight: 500,
            offsetY: -6,
            color: '#374151'
          },
          value: {
        show: true,
        fontSize: '24px', // Slightly smaller to fit abbreviated text
        fontWeight: 600,
        offsetY: 10,
        color: '#1f2937',
        formatter: (val: string) => {
    // Convert string back to number, then format
    const numericValue = parseFloat(val);
    return formatIndianAbbreviated(numericValue);
  }
      },
          total: {
  show: true,
  label: 'Total Value',
  fontSize: '13px',
  fontWeight: 500,
  color: '#6b7280',
  formatter: () => formatIndianAbbreviated(categoryValues.reduce((a, b) => a + b, 0))
}

        }
      }
    }
  },
  dataLabels: {
  enabled: true,
  formatter: (val) => {
    if (typeof val === 'number') {
      return `${val.toFixed(0)}%`;
    }
    return `${val}`; // fallback if string or array
  },
  style: {
    fontSize: '12px',
    fontWeight: 600,
    colors: ['#f9fafb']
  },
  dropShadow: { enabled: false }
},
  tooltip: {
  custom: function({ series, seriesIndex, w }) {
    const category = w.globals.labels[seriesIndex];
    const value = series[seriesIndex];
    const items = rawData.filter(item => item.Aging === category);
    const itemCount = items.length;
    const totalValue = categoryValues.reduce((a, b) => a + b, 0);

    // Sort items by closing_stock_value in descending order and take top 10
    const top10 = items
      .sort((a, b) => b.closing_stock_value - a.closing_stock_value)
      .slice(0, 10);

    const itemHTML = top10.map(item => `
  <div style="
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    font-size: 12px;
    color: #374151;
  ">
    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
      ${item["Material Name"]}
    </span>
    <span style="color: #059669; font-weight: 600;">
      ${formatIndianAbbreviated(item.closing_stock_value)}
    </span>
  </div>
`).join("");


    return `
      <div style="
        font-family: Inter, sans-serif;
        font-size: 13px;
        color: #1f2937;
        padding: 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        max-width: 300px;
      ">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
          ${category}
        </div>
       <div style="color: #4b5563; margin-bottom: 4px;">
  <strong>${formatIndianAbbreviated(value)}</strong> (${((value / totalValue) * 100).toFixed(1)}%)
</div>

        <div style="color: #6b7280; margin-bottom: 8px; font-size: 12px;">
          ${itemCount} items
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 6px;">
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Top items by value:</div>
          ${itemHTML}
        </div>
      </div>
    `;
  }
},


  states: {
  hover: {
    ...( {
      filter: {
        type: 'lighten',
        value: -0.1 // Decrease transparency
      }
    } as any)
  },
  active: {
    filter: {
      type: 'none'
    }
  }
}

};

  const lineChartOptions: ApexOptions = {
  chart: {
    type: "area",
    height: 240,
    fontFamily: 'Inter, system-ui, sans-serif',
    foreColor: '#4b5563', // softer gray (cool gray 600)
    toolbar: {
      show: true,
      tools: {
        download: true,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: true,
        reset: true,
      }
    },
    zoom: { enabled: true },
    animations: {
      enabled: true,
      speed: 900,
      animateGradually: {
        enabled: true,
        delay: 120
      },
      dynamicAnimation: {
        enabled: true,
        speed: 400
      }
    },
    dropShadow: {
      enabled: true,
      top: 6,
      left: 0,
      blur: 10,
      opacity: 0.1,
      color: '#60a5fa' // soft blue shadow
    },
    background: 'transparent',
  },
  xaxis: {
    categories: sortedMonths,
    labels: {
      rotate: -45,
      style: {
        fontSize: "11px",
        fontWeight: 500,
        colors: '#9ca3af' // cool gray 400
      }
    },
    axisBorder: {
      color: '#d1d5db' // cool gray 300
    },
    axisTicks: {
      color: '#d1d5db' // cool gray 300
    },
    tickPlacement: "on",
    title: {
      text: "Month",
      style: {
        fontSize: "12px",
        fontWeight: 600,
        color: '#6b7280' // cool gray 500
      }
    }
  },
  yaxis: {
    title: {
      text: "Zero-Moving Count",
      style: {
        fontSize: "12px",
        fontWeight: 600,
        color: '#6b7280' // cool gray 500
      }
    },
    labels: {
      style: {
        fontSize: "11px",
        colors: '#9ca3af' // cool gray 400
      }
    }
  },
  stroke: {
    curve: "smooth",
    width: 3,
    colors: ['#60a5fa'] // softer blue stroke
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "light",
      shadeIntensity: 0.4,
      type: "vertical",
      gradientToColors: ['#bfdbfe'], // light blue 200
      opacityFrom: 0.4,
      opacityTo: 0.05,
      stops: [0, 80, 100]
    }
  },
  colors: ["#3b82f6"], // blue-500 but softened by fill
  markers: {
    size: 5,
    colors: ['#ffffff'],
    strokeColors: '#60a5fa',
    strokeWidth: 2,
    hover: {
      size: 7,
      sizeOffset: 2
    },
    shape: 'circle',
   
  },
  tooltip: {
    shared: true,
    intersect: false,
    theme: 'light',
    style: {
      fontSize: '13px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    y: {
      formatter: (val) => val.toLocaleString()
    },
    marker: {
      show: true,
    }
  },
  grid: {
    borderColor: "#e5e7eb", // cool gray 200
    strokeDashArray: 5,
    row: {
      colors: ['#f9fafb', 'transparent'], // very subtle alternating rows
      opacity: 0.3
    },
    padding: {
      top: 15,
      right: 15,
      bottom: 5,
      left: 15
    }
  },
  dataLabels: {
    enabled: false
  },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'right',
    fontSize: '13px',
    fontWeight: 600,
    labels: {
      colors: '#6b7280' // cool gray 500
    },
  },
  annotations: {
    yaxis: [
      {
        y: 50, // example threshold, adjust or remove
        borderColor: '#a5b4fc', // soft indigo 300
        label: {
          borderColor: '#a5b4fc',
          style: {
            color: '#1e40af', // indigo 900
            background: '#c7d2fe', // indigo 200
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          text: 'Alert Threshold',
          orientation: 'horizontal',
        }
      }
    ]
  }
};



  return (
    <div className="min-h-screen bg-gray-50 p-0">
     <style jsx>{`
  :global(.apexcharts-tooltip) {
    transform: translateX(220px) translateY(320px) !important;
  }
`}</style>

      <div className="max-w-full mx-0 my-0">

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
              <h3 className="text-lg  text-gray-900 mb-6">Aging Categories</h3>
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-0 border-blue-600 border-t-transparent"></div>
                    <div className="text-gray-500 mt-3">Loading data...</div>
                  </div>
                </div>
              ) : (
                <ReactApexChart options={doughnutOptions} series={categoryValues} type="donut" height={460} />

              )}
              

            </div>
            
          </div>
          

          <div className="lg:col-span-2 flex flex-col space-y-6">
           <div className="grid grid-cols-2 gap-4">
  <div className="bg-indigo-50 bg-opacity-30 rounded-xl border border-indigo-100 p-6">
    <div className="text-sm font-small text-indigo-400 mb-1">Zero-Moving Items</div>
    <div className="text-3xl font-semibold text-rose-400 opacity-90">
      <CountUp end={zeroMoving.length} />
    </div>
    <div className="text-sm text-indigo-400 mt-1 opacity-80">
      out of total inventory
    </div>
  </div>

  <div className="bg-emerald-50 bg-opacity-30 rounded-xl border border-emerald-100 p-6">
  <div className="text-sm font-medium text-emerald-600 mb-1">Total Inventory Value</div>
  <div className="text-2xl font-semibold text-emerald-600 opacity-90">
    {formatIndianAbbreviated(categoryValues.reduce((a, b) => a + b, 0))}
  </div>
  <div className="text-sm text-emerald-500 mt-1 opacity-80">Current stock value</div>
</div>
<div className="bg-red-50 bg-opacity-30 rounded-xl border border-red-100 p-6">
  <div className="text-sm font-medium text-red-600 mb-1">Zero-Moving Value</div>
  <div className="text-2xl font-semibold text-red-600 opacity-90">
    {formatIndianAbbreviated(zeroMoving.reduce((sum, item) => sum + item.closing_stock_value, 0))}
  </div>
  <div className="text-sm text-red-500 mt-1 opacity-80">Stuck inventory value</div>
</div>


  <div className="bg-purple-50 bg-opacity-30 rounded-xl border border-purple-100 p-6">
    <div className="text-sm font-medium text-purple-400 mb-1">Zero Moving Item (%)</div>
    <div className="text-3xl font-semibold text-purple-500 opacity-90">
      {/* <CountUp end={maxSaleDays} /> */}
      {((zeroMoving.length / totalItems) * 100).toFixed(1)} %
    </div>
    <div className="text-sm text-purple-400 mt-1 opacity-80">of total Inventory</div>
  </div>

  {/* <div className="bg-pink-50 bg-opacity-20 rounded-xl border border-pink-100 p-6">
    <div className="text-sm font-medium text-pink-400 mb-1">Max Days Since Last Purchase</div>
    <div className="text-3xl font-semibold text-pink-500 opacity-90">
      <CountUp end={maxPurchaseDays} />
    </div>
    <div className="text-sm text-pink-400 mt-1 opacity-70">Oldest unpurchased item</div>
  </div> */}
</div>

            {/* <div className="bg-white rounded-lg border border-gray-200 p-6 flex-1">
              <h3 className="text-lg text-gray-500 mb-4">Zero-Moving Trend</h3>
              <ReactApexChart options={lineChartOptions} series={lineChartSeries} type="area" height={400} />
            </div> */}
            {!isLoading && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
  <div className="mt-4 bg-slate-50 rounded-2xl p-10">
    <h4 className="text-md font-bold text-blue-400 mb-3">Distribution by Category</h4>
    <div className="grid grid-cols-1 gap-2">
      {agingCategories.map((category, index) => {
        const value = categoryValues[index];
        const percentage = ((value / categoryValues.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
        const itemCount = rawData.filter(item => item.Aging === category).length;
        
        return (
          <div key={category} className="flex justify-between items-center text-sm">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ 
                  backgroundColor: [
                    "rgba(147, 197, 253, 0.85)",
                    "rgba(134, 239, 172, 0.85)",
                    "rgba(253, 224, 71, 0.85)",
                    "rgba(252, 165, 165, 0.85)",
                    "rgba(216, 180, 254, 0.85)",
                    "rgba(165, 243, 252, 0.85)"
                  ][index % 6]
                }}
              />
              <span className="font-bold text-gray-400">{category}</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-600">{formatIndianAbbreviated(value)}</div>
              <div className="text-xs text-gray-500">{itemCount} items •  {percentage}%</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
  </div>
)}
            
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Zero-Moving Items</h3>
            <p className="text-sm text-gray-500 mt-1">Items with no sales or purchases in the last 6 months</p>
          </div>

          <div className="overflow-x-auto">
            <div className="max-h-136 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {["Rank", "Material Name", "Closing Stock Value", "Days Since Last Sale", "Days Since Last Purchase"].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rankedZeroMoving.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No zero-moving items found</td>
                    </tr>
                  ) : (
                    rankedZeroMoving.map(item => (
                      <tr key={`${item["Material Name"]}-${item.rank}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.rank}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item["Material Name"]}</td>
                        <td className="px-6 py-4 text-sm text-red-400 font-medium">{formatIndianAbbreviated(item.closing_stock_value)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-bold">{item["Age Since Last Sale (days)"]} days</td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-semibold">{item["Age Since Last Purchase (days)"]} days</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
