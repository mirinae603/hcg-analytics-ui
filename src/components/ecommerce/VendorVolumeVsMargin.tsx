"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import DropdownWithSearchVendor from "../common/VendorFilterSearch";
import { useRegion } from '@/context/RegionContext'
import {DASHBOARD_API_BASE_URL} from '@/utils/config';

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface KPI7Data {
  Year: number;
  Month: string;
  "GRN Volume": number;
  Margin: number;
  "Margin (%)": number;
}

interface MaterialOption {
  VendorID: string;
  VendorName: string;
}

export default function VendorVolumeVsMarginChart() {
  const [data, setData] = useState<KPI7Data[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<MaterialOption | null>(null);
  const [vendorOptions, setVendorOptions] = useState<MaterialOption[]>([]);
  const [marginType, setMarginType] = useState<"Margin" | "Margin (%)">("Margin");
  const { selectedRegion } = useRegion();

  useEffect(() => {
    const regionName = selectedRegion?.name ?? "";
    fetch(`/${regionName}_vendor_name_mapping.json`)
      .then((res) => res.json())
      .then((data: Record<string, string>) => {
        // Convert the object keys/values into MaterialOption[]
        const formattedVendors = Object.values(data).map((v) => ({
          VendorID: v,
          VendorName: v,
        }));

        // Add "All Vendors" as the first option
        const allVendorsOption = {
          VendorID: "All Vendors",
          VendorName: "All Vendors",
        };

        const vendorOptionsWithAll = [allVendorsOption, ...formattedVendors];
        setVendorOptions(vendorOptionsWithAll);
        setSelectedVendor(vendorOptionsWithAll[0]); // This will select "All Vendors" by default
      })
      .catch((err) => console.error("Failed to load options:", err));
  }, [selectedRegion]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedVendor) return;
      setIsLoading(true);
      try {
        const regionName = selectedRegion?.name ?? "";
        const baseUrl = `${DASHBOARD_API_BASE_URL}/kpi/vendor-volume-vs-margin`;
        const query = new URLSearchParams({
          Plant: regionName,
          Vendor: selectedVendor.VendorName,
          frequency: "Monthly", // Add frequency parameter
        });

        const res = await fetch(`${baseUrl}?${query.toString()}`);
        const result: KPI7Data[] = await res.json();
        console.log("Received Data Chart: ", result);
        
        // Ensure data has proper structure
        const processedData = result.map(item => ({
          ...item,
          "GRN Volume": Number(item["GRN Volume"]) || 0,
          "Margin": Number(item.Margin) || 0,
          "Margin (%)": Number(item["Margin (%)"]) || 0,
        }));
        
        setData(processedData);
      } catch (err) {
        console.error("Failed to fetch KPI 7 data:", err);
        setData([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedVendor, selectedRegion]);

  const shortMonthMap: { [key: string]: string } = {
    January: "Jan",
    February: "Feb",
    March: "Mar",
    April: "Apr",
    May: "May",
    June: "Jun",
    July: "Jul",
    August: "Aug",
    September: "Sep",
    October: "Oct",
    November: "Nov",
    December: "Dec",
  };

  const categories = data.map(
    (d) => `${shortMonthMap[d.Month] || d.Month} ${d.Year}`
  );

  const volumeSeries = data.map((d) => d["GRN Volume"]);
  const marginSeries = data.map((d) =>
    marginType === "Margin" ? d.Margin : d["Margin (%)"]
  );

  console.log("Margin Data:", marginSeries);
  
  // Calculate min/max for percentage view
  const marginPercentValues = data.map((d) => d["Margin (%)"]);
  const minMarginPercent = marginPercentValues.length > 0 ? Math.min(...marginPercentValues) : 0;
  const maxMarginPercent = marginPercentValues.length > 0 ? Math.max(...marginPercentValues) : 100;

  // Round min and max slightly for better display
  const yAxisPercentMin = Math.floor(minMarginPercent - 1);
  const yAxisPercentMax = Math.ceil(maxMarginPercent + 1);

  const options: ApexOptions = {
    chart: {
      type: "line",
      height: 500,
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: false,
      },
      stacked: false,
      fontFamily: "Outfit, 'Segoe UI', sans-serif",
      animations: {
        enabled: true,
        speed: 1200,
        animateGradually: {
          enabled: true,
          delay: 200,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 400,
        },
      },
      dropShadow: {
        enabled: true,
        top: 2,
        left: 0,
        blur: 4,
        opacity: 0.08,
      },
    },
    colors: ["#A5B4FC", "#34D399"], // soft blue, soft green
    stroke: {
      width: [0, 3],
      curve: "smooth",
      colors: ["#A5B4FC", "rgba(52, 211, 153, 0.9)"],
    },
    fill: {
      type: ["solid", "gradient"],
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.4,
        inverseColors: false,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
        colorStops: [],
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "55%",
        borderRadius: 3,
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: false,
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
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    xaxis: {
      categories,
      labels: {
        rotate: 0,
        style: {
          fontSize: "13px",
          fontWeight: 500,
          colors: "#6B7280",
        },
      },
      axisTicks: { show: false },
      axisBorder: { show: true },
      tooltip: {
        enabled: true,
        style: {
          fontSize: "12px",
          fontFamily: "Outfit, 'Segoe UI', sans-serif",
        },
      },
    },
    yaxis: [
      {
        title: {
          text: "GRN Volume",
          style: { color: "#4B5563", fontSize: "13px", fontWeight: 500 },
        },
        labels: {
          style: {
            fontSize: "13px",
            fontWeight: 500,
            colors: "#6366F1",
            fontFamily: "Outfit, 'Segoe UI', sans-serif",
          },
          formatter: (val) => (val ? Math.round(val).toLocaleString() : "0"),
        },
      },
      {
        opposite: true,
        title: {
          text: marginType === "Margin" ? "Unit Margin (₹)" : "Margin (%)",
          style: { color: "#4B5563", fontSize: "13px", fontWeight: 500 },
        },
        min: marginType === "Margin (%)" ? yAxisPercentMin : undefined,
        max: marginType === "Margin (%)" ? yAxisPercentMax : undefined,
        tickAmount: marginType === "Margin (%)" ? 6 : undefined,
        labels: {
          style: {
            fontSize: "13px",
            fontWeight: 500,
            colors: "#10B981",
            fontFamily: "Outfit, 'Segoe UI', sans-serif",
          },
          formatter: (val: number) => {
            if (marginType === "Margin (%)") return `${val.toFixed(1)}%`;
            if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
            if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
            if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
            return `₹${Math.round(val)}`;
          },
        },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      theme: "light",
      style: {
        fontSize: "13px",
        fontFamily: "Outfit, 'Segoe UI', sans-serif",
      },
      y: {
        formatter: (val: number, { seriesIndex }) => {
          if (seriesIndex === 1) { // Margin - format as currency or percentage
            if (marginType === "Margin (%)") return `${val.toFixed(2)}%`;
            if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)}Cr`;
            if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(2)}L`;
            if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
            return `₹${Math.round(val)}`;
          } else {
            return val.toLocaleString(); // Volume - formatted number
          }
        },
      },
    },
    legend: {
      position: "top",
      fontSize: "13px",
      labels: {
        colors: "#6B7280",
      },
      fontFamily: "Outfit, 'Segoe UI', sans-serif",
    },
    markers: {
      size: 6,
      colors: ["rgba(147, 245, 214, 0.75)"], // Soft translucent green fill
      strokeColors: "#fcfffeff", // Solid green border
      strokeWidth: 2,
      shape: "circle",
      hover: {
        size: 8,
      },
      discrete: [
        {
          seriesIndex: 1,
          dataPointIndex: undefined,
          fillColor: "rgba(255, 255, 255, 0.25)",
          strokeColor: "#c5c7c6ff",
          size: 6,
        },
      ],
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 400 },
          xaxis: {
            labels: {
              style: { fontSize: "11px" },
              rotate: -45,
            },
          },
          yaxis: [
            {
              labels: {
                style: { fontSize: "11px" },
              },
            },
            {
              labels: {
                style: { fontSize: "11px" },
              },
            },
          ],
        },
      },
    ],
  };

  const series = [
    {
      name: "GRN Volume",
      type: "column",
      data: volumeSeries,
      zIndex: 0,
    },
    {
      name: marginType === "Margin" ? "Unit Margin" : "Margin (%)",
      type: "area",
      data: marginSeries,
      zIndex: 10,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Margin Type Switch */}
        <div className="w-full text-center sm:w-auto sm:order-2 py-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            {["Margin", "Margin (%)"].map((type) => (
              <button
                key={type}
                className={`px-3 py-2 font-medium rounded-md text-sm whitespace-nowrap hover:text-gray-900 dark:hover:text-white transition-all duration-200 ${
                  marginType === type
                    ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setMarginType(type as "Margin" | "Margin (%)")}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Vendor Dropdown */}
        <div className="w-full sm:w-auto flex gap-4 items-center sm:order-3">
          <DropdownWithSearchVendor
            optionsFilter={vendorOptions}
            selectedOption={selectedVendor}
            onChange={setSelectedVendor}
          />
        </div>
      </div>

      {/* Chart Container */}
      <div className="max-w-full overflow-hidden custom-scrollbar">
        <div className="w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-b-transparent animate-spin"></div>
                <div className="absolute inset-0 rounded-full blur-sm opacity-50 bg-gradient-to-tr from-blue-400 to-blue-600 animate-pulse"></div>
              </div>
              <p className="text-sm text-gray-500 animate-pulse">Loading chart...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
              <div className="w-16 h-16 text-gray-300">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900 dark:text-white">No data available</p>
                <p className="text-sm text-gray-500">Try selecting a different vendor or check your data source.</p>
              </div>
            </div>
          ) : (
            <ReactApexChart
              key={`${selectedVendor?.VendorName || 'default'}-${marginType}-${data.length}`}
              options={options}
              series={series}
              type="line"
              height={500}
            />
          )}
        </div>
      </div>
    </div>
  );
}
