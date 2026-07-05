"use client";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { debounce } from 'lodash';
import { useMemo, useCallback } from 'react';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}



const StyledWrapper_loader = styled.div`
  .l {
    color: black;
    opacity: 0;
    animation: pass 2s ease-in-out infinite;
    animation-delay: 0.2s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  .o {
    color: black;
    opacity: 0;
    animation: pass 2s ease-in-out infinite;
    animation-delay: 0.4s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  .a {
    color: black;
    opacity: 0;
    animation: pass 2s ease-in-out infinite;
    animation-delay: 0.6s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  .d {
    color: black;
    opacity: 0;
    animation: pass 2s ease-in-out infinite;
    animation-delay: 0.8s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  .i {
    color: black;
    opacity: 0;
    animation: pass 2s ease-in-out infinite;
    animation-delay: 1s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  .n {
    color: black;
    opacity: 0;
    animation: pass 2s ease-in-out infinite;
    animation-delay: 1.2s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  .g {
    color: black;
    opacity: 0;
    animation: pass 2s ease-in-out infinite;
    animation-delay: 1.4s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  .d1 {
    color: black;
    opacity: 0;
    animation: pass1 2s ease-in-out infinite;
    animation-delay: 1.6s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  .d2 {
    color: black;
    opacity: 0;
    animation: pass1 2s ease-in-out infinite;
    animation-delay: 2s;
    letter-spacing: 0.5em;
    text-shadow: 2px 2px 3px #919191;
  }

  @keyframes pass {
    0% {
      opacity: 1;
    }

    50% {
      opacity: 0;
    }

    100% {
      opacity: 1;
    }
  }

  @keyframes pass1 {
    0% {
      opacity: 1;
    }

    50% {
      opacity: 0;
    }

    100% {
      opacity: 1;
    }
  }`;
const StyledWrapper = styled.div`
  /* The loader container */
  .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200px;
    height: 100px;
    margin-top: -100px;
    margin-left: -100px;
    perspective: 1000px;
    transform-style: preserv3d;
  }

  .loader--reflect {
    margin-top: 0;
  }

  .loader--reflect:after {
    content: '';
    position: absolute;
    top: 0;
    left: -25%;
    width: 150%;
    height: 110%;
    background: linear-gradient(0deg, rgba(238, 238, 238, 1), rgba(238, 238, 238, 1) 20%, rgba(238, 238, 238, 0.3));
  }


  /* The bar */
  .bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 20px;
    height: 100px;
    background-color: #1e3f57;
    transform: scaleY(0);
    transform-style: preserve3d;
    animation: bar 3s cubic-bezier(.81,.04,.4,.7) infinite;
  }

  .bar:nth-child(2) {
    left: 20px;
    background-color: #264a63;
    animation-delay: 50ms;
  }

  .bar:nth-child(3) {
    left: 40px;
    background-color: #2d566f;
    animation-delay: 100ms;
  }

  .bar:nth-child(4) {
    left: 60px;
    background-color: #35617a;
    animation-delay: 150ms;
  }

  .bar:nth-child(5) {
    left: 80px;
    background-color: #3d6d86;
    animation-delay: 200ms;
  }

  .bar:nth-child(6) {
    left: 100px;
    background-color: #447892;
    animation-delay: 250ms;
  }

  .bar:nth-child(7) {
    left: 120px;
    background-color: #4c849e;
    animation-delay: 300ms;
  }

  .bar:nth-child(8) {
    left: 140px;
    background-color: #548fa9;
    animation-delay: 350ms;
  }

  .bar:nth-child(9) {
    left: 160px;
    background-color: #5c9bb5;
    animation-delay: 400ms;
  }

  .bar:nth-child(10) {
    left: 180px;
    background-color: #63a6c1;
    animation-delay: 450ms;
  }

  .loader--reflect .bar {
    animation-name: bar-reflect;
  }

  @keyframes bar {
    0% {
      transform: rotateZ(-180deg) rotateX(-360deg);
    }

    75%,100% {
      transform: rotateZ(0) rotateX(0);
    }
  }

  @keyframes bar-reflect {
    0% {
      transform: rotateZ(180deg) rotateX(360deg);
    }

    75%,100% {
      transform: rotateZ(0) rotateX(0);
    }
  }`;

interface DataRow {
  [key: string]: any;
}

interface FilteredDataResponse {
  data: DataRow[];
  week_filter: string;
  plant_filter?: string;
  total_records: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface WeeklyDataTableProps {
  apiBaseUrl?: string;
  initialWeek?: string;
  plantName?: string;
  title?: string;
  description?: string;
  className?: string;
}

function DownloadCSV({ data, filename = 'weekly_data.csv' }: { data: DataRow[], filename?: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownload = async () => {
    if (!data || data.length === 0) return;
    
    setIsDownloading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const csvRows: string[] = [];
    const allHeaders = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allHeaders.add(key));
    });
    const headers = Array.from(allHeaders).sort();
    
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return String(value);
      });
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
      
      <div className="absolute inset-0 w-14 h-14 rounded-full bg-slate-900/5 group-hover:bg-slate-900/8 transition-all duration-500 group-hover:scale-125"></div>
      
      <button 
        onClick={handleDownload}
        disabled={isDownloading || !data || data.length === 0}
        className="relative w-14 h-14 rounded-full 
                   bg-white/80 hover:bg-white/90 backdrop-blur-md
                   shadow-lg hover:shadow-xl
                   border border-slate-200/50 hover:border-slate-300/60
                   disabled:opacity-60 disabled:cursor-not-allowed
                   transition-all duration-300 ease-out hover:scale-105
                   group flex items-center justify-center"
      >
        {isDownloading ? (
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-slate-600 animate-spin"></div>
          </div>
        ) : (
          <svg className="w-6 h-6 text-slate-700 group-hover:text-slate-900 transition-colors duration-200" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap backdrop-blur-sm pointer-events-none">
          Export CSV ({data?.length || 0} rows)
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900/90"></div>
        </div>
      </button>
    </div>
  );
}

const StyledWrapper_button = styled.div`
  /* === removing default button style ===*/
  .button {
    margin: 0;
    height: auto;
    background: transparent;
    padding: 0;
    border: none;
    cursor: pointer;
    border-radius: 50px; /* Makes the button pill-shaped */
    overflow: hidden; /* Ensures content inside the button doesn't overflow */
  }

  /* button styling */
  .button {
    --border-right: 5px;
    --text-stroke-color: rgba(100, 149, 237, 0.7); /* Light blue with opacity */
    --animation-color: #508fd5ff; /* Elegant light blue */
    --fs-size: 2em;
    letter-spacing: 3px;
    text-decoration: none;
    font-size: var(--fs-size);
    font-family: "Pacifico", cursive;

    position: relative;
    color: transparent;
    -webkit-text-stroke: 1px var(--text-stroke-color);
  }
  
  /* this is the text, when you hover on button */
  .hover-text {
    position: absolute;
    box-sizing: border-box;
    content: attr(data-text);
    color: var(--animation-color);
    width: 0%;
    inset: 0;
    border-right: var(--border-right) solid var(--animation-color);
    overflow: hidden;
    transition: 0.5s;
    -webkit-text-stroke: 1px var(--animation-color);

    /* Apply border-radius to the hover-text to make sure the line is rounded */
    border-radius: 50px; /* Same as the button's border-radius */
  }
  
  /* hover */
  .button:hover .hover-text {
    width: 100%;
    filter: drop-shadow(0 0 23px var(--animation-color));
  }
`;



export default function DataTableInsights({ 
  apiBaseUrl = "http://localhost:8000", 
  initialWeek = "week_1",
  plantName = "All",
  title = "",
  description,
  className = ""
}: WeeklyDataTableProps) {
  const [data, setData] = useState<DataRow[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>(initialWeek);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>(['week_1', 'week_2', 'week_3', 'week_4']);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'desc' });
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  
  // ✅ NEW: Generation flow states
  const [showInitialSelection, setShowInitialSelection] = useState<boolean>(true);
  const [currentProgressStep, setCurrentProgressStep] = useState<number>(0);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const debouncedHandleWeekSelection = useCallback(
  debounce((weekValue: string) => {
    setSelectedWeek(weekValue);
    setIsWeekDropdownOpen(false);
  }, 300), // 300ms delay
  []
);

  // ✅ NEW: Progress steps configuration
  const progressSteps = [
    {
      id: 1,
      title: "Combining Data",
      description: "Combining data for last few years with latest records",
      duration: 2500
    },
    {
      id: 2,
      title: "Analyzing Trends", 
      description: "Analyzing trends and patterns",
      duration: 2000
    },
    {
      id: 3,
      title: "Preparing Results",
      description: "Preparing the forecast results",
      duration: 1500
    }
  ];

  // ✅ Fixed Column Configuration - Removed Plant, Added Cash_Flow_Prediction
  const getColumnConfig = () => {
    const baseColumns = [
      { key: 'Material', displayName: 'Material ID', width: '140px' },
      { key: 'Material Name', displayName: 'Material Name', width: '200px' },
      { key: 'Order_Quantity', displayName: 'Replenishment Qty', width: '160px' },
      { key: 'Demand_Forecast', displayName: 'Forecast Quantity', width: '150px' },
      { key: 'Cash_Flow_Prediction', displayName: 'Cash Flow Prediction', width: '160px' },
      { key: 'Stock', displayName: 'Closing Stock Qty', width: '150px' },
      { key: 'Stock_Value', displayName: 'Closing Stock Value (₹)', width: '170px' },
      { key: 'Aging', displayName: 'Aging Risk', width: '120px' },
    ];

    // Add week-specific columns dynamically
    const weekColumns = [
      { 
        key: `Cash_Flow_Prediction_${selectedWeek}`, 
        displayName: `${selectedWeek.replace('_', ' ').toUpperCase()} Cash Flow`, 
        width: '160px'
      },
      { 
        key: `Demand_Forecast_${selectedWeek}`, 
        displayName: `${selectedWeek.replace('_', ' ').toUpperCase()} Demand`, 
        width: '150px'
      }
    ];

    return [...baseColumns, ...weekColumns];
  };

  // Load available weeks
  useEffect(() => {
    const loadWeeks = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/weeks`);
        if (response.ok) {
          const data = await response.json();
          setAvailableWeeks(data.weeks || ['week_1', 'week_2', 'week_3', 'week_4']);
        }
      } catch (err) {
        console.error('Error loading weeks:', err);
      }
    };

    loadWeeks();
  }, [apiBaseUrl]);

  // ✅ MODIFIED: Handle generation with progress running alongside main animation
  const handleGenerateForecast = async () => {
    setShowInitialSelection(false);
    setLoading(true);
    setCurrentProgressStep(0);
    setError(null);
    setHasGenerated(true);

    // Start progress animation alongside the main loading
    const startProgressAnimation = async () => {
  setCurrentProgressStep(1); // Start immediately
  
  const totalDuration = 8000; // 8 seconds total
  const pauseDuration = 2000; // 2 seconds pause between steps
  const totalPauses = (progressSteps.length - 1) * pauseDuration; // 2 pauses × 2s = 4s
  const totalFillTime = totalDuration - totalPauses; // 8s - 4s = 4s for filling
  const fillTimePerStep = totalFillTime / progressSteps.length; // 4s ÷ 3 = ~1.33s per step
  
  for (let i = 0; i < progressSteps.length; i++) {
    const startStep = i + 1;
    const endStep = i + 2;
    
    // Gradually animate step over calculated time
    const animationFrames = 33; // 33 frames for smooth animation
    const frameDelay = fillTimePerStep / animationFrames; // ~40ms per frame
    
    for (let frame = 0; frame <= animationFrames; frame++) {
      const progress = frame / animationFrames;
      const currentValue = startStep + progress;
      setCurrentProgressStep(currentValue);
      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }
    
    // 2 second pause between steps (except after last step)
    if (i < progressSteps.length - 1) {
      await new Promise(resolve => setTimeout(resolve, pauseDuration));
    }
  }
};




    // Start progress animation immediately
    startProgressAnimation();
    
    try {
      const params = new URLSearchParams({ week: selectedWeek });
      if (plantName && plantName !== "All") {
        params.append("plant", plantName);
      }
      
      await sleep(10000);
      const response = await fetch(`${apiBaseUrl}/api/data?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const result: FilteredDataResponse = await response.json();
      console.log("Received Data : ", result);
      setData(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching data';
      setError(errorMessage);
      console.error('Error fetching data:', err);
      setData([]);
    } finally {
      setLoading(false);
      setCurrentProgressStep(0); // Reset progress
    }
  };

  // ✅ MODIFIED: Only fetch when generate is clicked, not on mount
  useEffect(() => {
    if (hasGenerated && !showInitialSelection) {
      // Reset and regenerate when week changes after initial generation
      handleGenerateForecast();
    }
  }, [selectedWeek, plantName, apiBaseUrl]);

  // Initialize sort config when data loads
  useEffect(() => {
    if (data && data.length > 0 && sortConfig.key === '') {
      setSortConfig({ key: 'Material', direction: 'asc' });
    }
  }, [data]);

  // ✅ Fixed: Proper event handler for select element
  const handleWeekChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWeek(event.target.value);
  };

  const handleWeekSelection = (weekValue: string) => {
  // Immediate UI feedback
  setIsWeekDropdownOpen(false);
  // Debounced data processing
  debouncedHandleWeekSelection(weekValue);
};

  // ✅ Get filtered column headers based on available data
  const getFilteredColumns = () => {
    if (!data || data.length === 0) return [];
    
    const columnConfig = getColumnConfig();
    const availableKeys = new Set(Object.keys(data[0]));
    
    return columnConfig.filter(col => availableKeys.has(col.key));
  };

  // Sorting logic
  const sortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let sortableData = [...data];
    
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bVal === null) return sortConfig.direction === 'asc' ? -1 : 1;
        
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

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (sortConfig.key === columnName) {
      return sortConfig.direction === 'asc' ? (
        <svg className="w-3 h-3 ml-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3 ml-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 8l4-4 4 4H5zM5 12l4 4 4-4H5z" />
      </svg>
    );
  };

  const formatCellValue = (value: any, columnKey: string): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-slate-400 font-medium italic">—</span>;
  }
  
  
  if (columnKey === 'Aging') {
    // Determine risk level based on text content
    const hasYears = value.includes('Year') || value.includes('Years');
    const hasMonths = value.includes('Month') || value.includes('Months');
    const isNoRisk = value.includes('No') || value.toLowerCase().includes('no risk') || value === 'No';
    
    let colorConfig;
    
    if (isNoRisk) {
      // GREEN - No Risk
      colorConfig = {
        bg: 'bg-gradient-to-r from-green-100 to-emerald-50',
        text: 'text-green-700',
        border: 'border-green-200/60',
        dot: 'bg-green-500',
        label: 'No Risk'
      };
    } else if (hasMonths) {
      // BLUE - Medium Risk (Months)
      colorConfig = {
        bg: 'bg-gradient-to-r from-blue-100 to-sky-50',
        text: 'text-blue-700',
        border: 'border-blue-200/60',
        dot: 'bg-blue-500',
        label: 'Medium Risk'
      };
    } else if (hasYears) {
      // RED - High Risk (Years)
      colorConfig = {
        bg: 'bg-gradient-to-r from-red-100 to-rose-50',
        text: 'text-red-700',
        border: 'border-red-200/60',
        dot: 'bg-red-500',
        label: 'High Risk'
      };
    } else {
      // DEFAULT - Unknown
      colorConfig = {
        bg: 'bg-gradient-to-r from-gray-100 to-slate-50',
        text: 'text-gray-700',
        border: 'border-gray-200/60',
        dot: 'bg-gray-500',
        label: 'Unknown'
      };
    }
    
    return (
      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full shadow-sm ${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border}`}>
        <div className={`w-1.5 h-1.5 rounded-full mr-2 shadow-sm ${colorConfig.dot}`}></div>
        {value}
      </span>
    );
  }

  if (columnKey === 'Material Name') {
    return (
      <div className="max-w-full">
        <span 
          className="text-slate-700 font-medium text-sm block hover:text-blue-600 transition-colors cursor-default"
          title={String(value)}
        >
          {String(value)}
        </span>
      </div>
    );
  }
  
  if (typeof value === 'number') {
    let colorClass = 'text-slate-600 font-medium';
    let bgClass = '';
    
    if (columnKey.includes('Cash_Flow') || columnKey === 'Cash_Flow_Prediction') {
      colorClass = 'text-emerald-400 font-semibold';
      bgClass = 'bg-emerald-50/50 px-2 py-1 rounded-md';
    } else if (columnKey.includes('Stock_Value')) {
      colorClass = 'text-violet-400 font-semibold';
      bgClass = 'bg-violet-50/50 px-2 py-1 rounded-md';
    } else if (columnKey.includes('Demand')) {
      colorClass = 'text-amber-400 font-semibold';
      bgClass = 'bg-amber-50/50 px-2 py-1 rounded-md';
    } else if (columnKey.includes('Order_Quantity')) {
      colorClass = 'text-blue-400 font-semibold';
      bgClass = 'bg-blue-50/50 px-2 py-1 rounded-md';
    } else if (columnKey.includes('Stock')) {
      colorClass = 'text-indigo-400 font-semibold';
      bgClass = 'bg-indigo-50/50 px-2 py-1 rounded-md';
    }
    
    return (
      <span className={`${colorClass} text-sm ${bgClass} transition-all duration-200`}>
        {value.toLocaleString()}
      </span>
    );
  }

  if (columnKey === 'Material') {
    return (
      <span className="text-cyan-600 font-mono text-sm font-semibold tracking-wider bg-cyan-50/50 px-2 py-1 rounded-md border border-cyan-100">
        {String(value)}
      </span>
    );
  }
  
  return <span className="text-slate-600 text-sm font-medium">{String(value)}</span>;
};

// Enhanced column width configuration with generous spacing
const getColumnWidth = (columnKey: string): string => {
  const widthMap: Record<string, string> = {
    'Material': '160px',
    'Material Name': '280px', // Much wider for full names
    'Order_Quantity': '180px',
    'Demand_Forecast': '180px',
    'Cash_Flow_Prediction': '200px',
    'Stock': '160px',
    'Stock_Value': '200px',
    'Aging': '140px',
    // Week-specific columns
    [`Cash_Flow_Prediction_${selectedWeek}`]: '200px',
    [`Demand_Forecast_${selectedWeek}`]: '180px',
  };
  
  return widthMap[columnKey] || '160px'; // Default width
};

  const filteredColumns = getFilteredColumns();

  return (
    <div className={`rounded-2xl px-0 pb-0 pt-0 dark:bg-slate-900/98  transition-all duration-100 ease-out sm:px-4 sm:pt-0 ${
    loading 
      ? 'bg-transparent backdrop-blur-sm' 
      : 'bg-transparent backdrop-blur-sm'
  } ${className}`}>
      {/* Original Header Design */}
      <div className="flex flex-col gap-0 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full text-left sm:w-auto py-0">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-500 dark:text-slate-200">
            {title}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {description}
          </p>
        </div>
      </div>

      {/* ✅ NEW: Initial Selection Interface */}
      {showInitialSelection && (
        <div className="flex flex-col items-center justify-center min-h-[100px] space-y-0 animate-in fade-in-0 duration-700">
          {/* <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2m0 10V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
              Generate Forecast Report
            </h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
              Select your preferred forecast period and generate comprehensive insights
            </p>
          </div> */}

         <div className="w-full max-w-3xl mx-auto p-6">
  {/* Soft Neutral Container */}
  <div className="bg-stone-50/80 backdrop-blur-sm rounded-3xl border border-stone-200/60 shadow-lg shadow-stone-900/5 overflow-hidden">
    
    {/* Content */}
    <div className="p-8 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-light text-stone-800 tracking-tight">
          Generate Forecast Data
        </h2>
        <p className="text-stone-600 font-normal">
          Select analysis timeframe
        </p>
      </div>

      {/* Subtle Segmented Control */}
      <div className="relative bg-stone-100/60 rounded-2xl p-2">
        
        {/* Active Indicator */}
        <div 
          className="absolute top-2 bg-white/95 rounded-xl shadow-sm h-12 transition-all duration-300 ease-out border border-stone-200/40"
          style={{
            width: `calc(${100 / availableWeeks.length}% - 8px)`,
            left: '8px',
            transform: `translateX(${availableWeeks.indexOf(selectedWeek) * 100}%)`
          }}
        />
        
        {/* Options */}
        <div className="relative flex">
          {availableWeeks.map((week, index) => {
            const labels = ['7 Days', '14 Days', '21 Days', '28 Days'];
            const dates = ['Apr 6', 'Apr 13', 'Apr 20', 'Apr 27'];
            const isSelected = selectedWeek === week;
            
            return (
              <button
                key={week}
                onClick={() => handleWeekSelection(week)}
                className={`
                  flex-1 h-12 px-4 rounded-xl transition-colors duration-200
                  flex flex-col items-center justify-center relative z-10
                  ${isSelected 
                    ? 'text-stone-800 font-medium' 
                    : 'text-stone-500 hover:text-stone-600 font-normal'
                  }
                `}
              >
                <span className="text-sm">{labels[index]}</span>
                <span className="text-xs text-stone-400">{dates[index]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status & Clean Action */}
      <div className="flex items-center justify-between">
        
        {/* Status */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
            <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-stone-800">
              {selectedWeek 
                ? `${selectedWeek.replace('week_', '')} Week Duration` 
                : 'No Period Selected'
              }
            </p>
            <p className="text-sm text-stone-500">
              {selectedWeek ? 'Based on Historical Movement' : 'Choose timeframe above'}
            </p>
          </div>
        </div>
        <StyledWrapper_button>
      <button className="button" onClick={handleGenerateForecast} data-text="Awesome">
        <span className="actual-text">&nbsp;Forecast&nbsp;</span>
        <span aria-hidden="true" className="hover-text">&nbsp;Forecast&nbsp;</span>
      </button>
    </StyledWrapper_button>
        {/* Clean Minimal Button */}
        {/* <button
          onClick={handleGenerateForecast}
          disabled={!selectedWeek}
          className={`
            px-7 py-3 rounded-xl text-sm font-medium transition-all duration-200
            ${selectedWeek 
              ? 'bg-stone-800 text-white hover:bg-stone-700' 
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }
          `}
        >
          Generate
        </button> */}
      </div>
    </div>
  </div>
</div>




        </div>
      )}

      {/* ✅ Loading with Horizontal Progress Bar Above Original Animation */}
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-8">
         
          {/* 🌟 Ultra-Elegant Frosted Glassmorphism Progress Stepper */}
<div style={{
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '60px 20px',
  borderRadius: '30px',
  background: 'linear-gradient(145deg, #f0f4ff 0%, #e6f3ff 25%, #fff0f5 50%, #f5f0ff 75%, #f0fff4 100%)',
  position: 'relative',
  overflow: 'hidden'
}}>

  {/* Main Progress Container */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    height: '90px',
    background: 'transparent',
    marginBottom: '48px',
    padding: '0 20px'
  }}>
    
    {progressSteps.map((step, index) => {
      const stepProgress = Math.max(0, Math.min(1, (currentProgressStep - index - 1)));
      const isCompleted = currentProgressStep > index + 2;
      const isActive = currentProgressStep > index + 1 && currentProgressStep <= index + 2;
      const isUpcoming = currentProgressStep <= index + 1;
      
      // Soft, dreamy color palette
      const colors = [
        { 
          primary: 'linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)', 
          glow: 'rgba(167, 243, 208, 0.4)',
          shadow: '0 8px 32px rgba(167, 243, 208, 0.3)'
        },
        { 
          primary: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)', 
          glow: 'rgba(147, 197, 253, 0.4)',
          shadow: '0 8px 32px rgba(147, 197, 253, 0.3)'
        },
        { 
          primary: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)', 
          glow: 'rgba(196, 181, 253, 0.4)',
          shadow: '0 8px 32px rgba(196, 181, 253, 0.3)'
        },
        { 
          primary: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)', 
          glow: 'rgba(253, 186, 116, 0.4)',
          shadow: '0 8px 32px rgba(253, 186, 116, 0.3)'
        },
        { 
          primary: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)', 
          glow: 'rgba(252, 165, 165, 0.4)',
          shadow: '0 8px 32px rgba(252, 165, 165, 0.3)'
        }
      ];
      
      const stepColor = colors[index % colors.length];
      
      return (
        <div key={step.id} style={{
          position: 'relative',
          flex: '1',
          height: '70px',
          background: 'transparent',
          marginLeft: index > 0 ? '-18px' : '0',
          zIndex: progressSteps.length - index,
          transform: isActive ? 'scale(1.0001) translateY(-0px)' : 'scale(1)',
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}>
          
          {/* Animated Progress Fill */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${stepProgress * 100}%`,
            background: stepColor.primary,
            borderTopLeftRadius: '10px',
            borderTopRightRadius: '32px',
            borderBottomRightRadius: '32px',
            borderBottomLeftRadius: '10px',
            clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)',
            transition: 'width 40ms ease-out',
            overflow: 'hidden',
            border: '0px solid rgba(255, 255, 255, 0.4)',
          }}>
            
            {/* Liquid Shimmer Effect */}
            {stepProgress > 0 && stepProgress < 1 && (
              <div style={{
                position: 'absolute',
                top: 0,
                right: '-80px',
                width: '80px',
                height: '100%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%)',
                borderRadius: '32px',
                animation: 'liquidShimmer 1.33s ease-in-out infinite',// ← Updated for 8s total
                opacity: 0.8
              }} />
            )}
            
            {/* Floating Particles */}
            {stepProgress > 0 && (
              <>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: '3px',
                    height: '3px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '50%',
                    top: `${15 + i * 20}%`,
                    right: `${5 + i * 12}px`,
                    animation: `floatParticle${i + 1} ${1.33 + i * 0.2}s ease-in-out infinite`, // ← Updated timing
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)'
                  }} />
                ))}
              </>
            )}
            
            {/* Gentle Pulse for Active */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
                borderRadius: '32px',
                animation: 'gentleGlow 1.33s ease-in-out infinite' // ← Updated for 8s timing
              }} />
            )}
          </div>
          
          {/* Step Content */}
         <div style={{
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  color: stepProgress > 0.5 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(71, 85, 105, 0.8)',
  zIndex: 10,
  transition: 'all 0.6s ease',
  // ✅ NEW: Horizontal layout container
  display: 'flex',
  alignItems: 'center',
  gap: '12px', // Space between title and number
  width: 'auto'
}}>
  
  {/* Step Title - Now on the LEFT */}
  <div style={{
    fontSize: '15px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    textShadow: stepProgress > 0.5 ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
    whiteSpace: 'nowrap' // Prevents text wrapping
  }}>
    {step.title}
  </div>
  
  {/* Icon Container - Now on the RIGHT */}
  <div style={{
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    marginLeft:'30px',
    background: stepProgress > 0.5 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    border: '1.5px solid rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(10px)',
    boxShadow: stepProgress > 0.5 
      ? '0 4px 16px rgba(255, 255, 255, 0.2)' 
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.6s ease',
    transform: isActive ? 'scale(1.15)' : 'scale(1)',
    flexShrink: 0 // Prevents the circle from shrinking
  }}>
    {isCompleted ? (
      <span style={{ color: '#10b981', fontSize: '16px', filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' }}>✓</span>
    ) : (
      <span style={{ 
        fontSize: '11px', 
        letterSpacing: '0.5px',
        fontWeight: '700'
      }}>
        {String(index + 1).padStart(2, '0')}
      </span>
    )}
  </div>
</div>

        </div>
      );
    })}
  </div>

  {/* Enhanced Step Details */}
  <div style={{
  display: 'grid',
  gridTemplateColumns: `repeat(${progressSteps.length}, 1fr)`,
  gap: '24px',
  padding: '0 20px'
}}>
  {progressSteps.map((step, index) => {
    const stepProgress = Math.max(0, Math.min(1, (currentProgressStep - index - 1)));
    const isCompleted = currentProgressStep > index + 2;
    const isActive = currentProgressStep > index + 1 && currentProgressStep <= index + 2;
    const isUpcoming = currentProgressStep <= index + 1;
    
    // ✅ Blur based on stepProgress
    const blurAmount = isUpcoming 
      ? 8 
      : isActive 
        ? 8 * (1 - stepProgress) 
        : 0;
    
    const opacity = isUpcoming 
      ? 0.3 
      : isActive 
        ? 0.3 + (0.7 * stepProgress) 
        : 1;
    
    // ✅ NEW: Subtle background color progression
    const getBackgroundColor = () => {
      if (isCompleted) {
        return 'rgba(240, 253, 244, 0.6)'; // Very light green-white tint
      } else if (isActive) {
        const progress = stepProgress;
        // Gradually shift from grey → light blue → light green → white
        if (progress < 0.33) {
          // Grey to light blue
          const factor = progress / 0.33;
          return `rgba(${248 - Math.round(8 * factor)}, ${250 - Math.round(5 * factor)}, ${252 - Math.round(2 * factor)}, ${0.15 + (0.1 * factor)})`;
        } else if (progress < 0.66) {
          // Light blue to light green
          const factor = (progress - 0.33) / 0.33;
          return `rgba(${240 + Math.round(8 * factor)}, ${245 + Math.round(8 * factor)}, ${250 + Math.round(4 * factor)}, ${0.25 + (0.15 * factor)})`;
        } else {
          // Light green to white
          const factor = (progress - 0.66) / 0.34;
          return `rgba(${248 + Math.round(7 * factor)}, ${253 + Math.round(2 * factor)}, ${254}, ${0.4 + (0.2 * factor)})`;
        }
      } else {
        return 'rgba(248, 250, 252, 0.15)'; // Light grey
      }
    };
    
    return (
      <div key={`${step.id}-detail`} style={{
        padding: '14px',
        background: getBackgroundColor(), // ✅ NEW: Subtle color progression
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        backdropFilter: `blur(${20 + blurAmount}px)`,
        boxShadow: isActive 
          ? `0 ${12 + (8 * stepProgress)}px 40px rgba(59, 130, 246, ${0.15 + (0.1 * stepProgress)}), inset 0 1px 0 rgba(255, 255, 255, 0.6)`
          : isCompleted
            ? '0 8px 32px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
            : '0 4px 16px rgba(31, 38, 135, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        filter: `blur(${blurAmount}px)`,
        opacity: opacity,
        transform: isActive 
          ? `translateY(${-4 * stepProgress}px) scale(${0.95 + (0.07 * stepProgress)})`
          : isCompleted
            ? 'translateY(0) scale(1)'
            : 'translateY(8px) scale(0.95)',
        transition: 'all 0.1s ease-out',
        textAlign: 'center'
      }}>
        
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          // ✅ FIXED: Grey colors only
          color: isCompleted 
            ? '#7bc59dff' // Dark grey
            : isActive 
              ? '#6aa0e1ff' // Medium grey 
              : '#9ca3af', // Light grey
          margin: '0 0 8px 0',
          transition: 'color 0.5s ease',
          textShadow: 'none' // No text shadow
        }}>
          {step.title}
        </h4>
        
        <p style={{
          fontSize: '12px',
          // ✅ FIXED: Grey colors only
          color: isCompleted 
            ? '#6b7280' // Medium grey
            : isActive 
              ? '#9ca3af' // Light grey
              : '#d1d5db', // Very light grey
          lineHeight: '1.5',
          margin: '0 0 16px 0',
          opacity: isUpcoming ? 0.5 : (isActive ? 0.6 + (0.4 * stepProgress) : 1),
          transition: 'all 0.5s ease'
        }}>
          {step.description}
        </p>
        
        {/* Progress indicator */}
        <div style={{
          width: '100%',
          height: '5px',
          background: 'rgba(226, 232, 240, 0.5)',
          borderRadius: '1px',
          overflow: 'hidden',
          marginTop: '12px'
        }}>
          <div style={{
            width: `${stepProgress * 100}%`,
            height: '100%',
            background: isCompleted 
              ? 'linear-gradient(90deg, #79e7c2ff, #78edc8ff)' 
              : 'linear-gradient(90deg, #6ba0f4ff, #7199f0ff)',
            borderRadius: '1px',
            transition: 'width 0.1s ease-out',
            boxShadow: stepProgress > 0 ? `0 0 ${8 + (4 * stepProgress)}px rgba(59, 130, 246, ${0.3 + (0.2 * stepProgress)})` : 'none'
          }} />
        </div>
      </div>
    );
  })}
</div>



  {/* Enhanced CSS Animations - Updated for 8s timing */}
  <style>{`
    @keyframes liquidShimmer {
      0%, 100% { 
        transform: translateX(0) scale(1); 
        opacity: 0.6; 
      }
      50% { 
        transform: translateX(-20px) scale(1.1); 
        opacity: 1; 
      }
    }
    
    @keyframes gentleGlow {
      0%, 100% { 
        transform: translateX(-100%); 
        opacity: 0; 
      }
      50% { 
        transform: translateX(0); 
        opacity: 0.8; 
      }
    }
    
    @keyframes floatParticle1 {
      0%, 100% { 
        transform: translateY(0) rotate(0deg) scale(0.8); 
        opacity: 0.4; 
      }
      50% { 
        transform: translateY(-12px) rotate(180deg) scale(1.2); 
        opacity: 1; 
      }
    }
    
    @keyframes floatParticle2 {
      0%, 100% { 
        transform: translateY(0) rotate(0deg) scale(0.6); 
        opacity: 0.3; 
      }
      60% { 
        transform: translateY(-8px) rotate(120deg) scale(1); 
        opacity: 0.8; 
      }
    }
    
    @keyframes floatParticle3 {
      0%, 100% { 
        transform: translateY(0) rotate(0deg) scale(0.7); 
        opacity: 0.5; 
      }
      40% { 
        transform: translateY(-15px) rotate(240deg) scale(1.1); 
        opacity: 0.9; 
      }
    }
    
    @keyframes floatParticle4 {
      0%, 100% { 
        transform: translateY(0) rotate(0deg) scale(0.9); 
        opacity: 0.3; 
      }
      70% { 
        transform: translateY(-10px) rotate(300deg) scale(1.3); 
        opacity: 0.7; 
      }
    }
  `}</style>
</div>


 {/* ✅ Your Original Loading Animation - Untouched */}
          {/* <div className="h-100 space-y-0">
            <StyledWrapper_loader>
              <div className="loader">
                <span className="l">F</span>
                <span className="o">o</span>
                <span className="a">r</span>
                <span className="d">e</span>
                <span className="i">c</span>
                <span className="n">a</span>
                <span className="g">s</span>
                <span className="g">t</span>
                <span className="n">i</span>
                <span className="g">n</span>
                <span className="g">g</span>
                <span className="d1">.</span>
                <span className="d2">.</span>
              </div>
            </StyledWrapper_loader>
            <StyledWrapper>
              <div>
                <div className="loader">
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                </div>
                <div className="loader loader--reflect">
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                </div>
              </div>
            </StyledWrapper>
            
          </div> */}
          
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-8 text-center rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Error Loading Data</h3>
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          <button 
            onClick={() => handleGenerateForecast()}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-800 dark:text-red-200 rounded-md transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && sortedData.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-4xl font-medium text-center text-slate-800 tracking-tight leading-snug bg-gradient-to-br from-blue-500/80 to-blue-300/70 bg-clip-text text-transparent drop-shadow-sm">
  Forecast Summary
</h2>

          {/* Table Header with Original Export Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800/50 dark:via-slate-900/50 dark:to-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="p-5 rounded-xl bg-sky-100 dark:bg-sky-900/30">
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-500 dark:text-slate-200">
                  {(() => {
                    const getWeekDisplayName = (weekValue: string) => {
                      const weekMapping: Record<string, string> = {
                        'week_1': 'Next 7 Days',
                        'week_2': 'Next 14 Days', 
                        'week_3': 'Next 21 Days',
                        'week_4': 'Next 28 Days'
                      };
                      return weekMapping[weekValue] || weekValue.replace('_', ' ').toUpperCase();
                    };
                    return getWeekDisplayName(selectedWeek);
                  })()} Report
                </h4>

                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {sortedData.length} records from {plantName}
                </p>
              </div>
            </div>
            
            <div className="w-full sm:w-auto flex items-center gap-4">
  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
    Select Week
  </label>
  
  <div className="relative">
    <div 
      className="flex gap-1 p-1 overflow-x-auto scroll-smooth bg-slate-100 dark:bg-slate-800 rounded-xl scrollbar-hide"
      style={{
        maxWidth: '400px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {availableWeeks.map((week) => {
        const getWeekDisplayName = (weekValue: string) => {
          const weekMapping: Record<string, string> = {
            'week_1': '6 Apr',
            'week_2': '13 Apr', 
            'week_3': '20 Apr',
            'week_4': '27 Apr'
          };
          return weekMapping[weekValue] || weekValue.replace('_', ' ').toUpperCase();
        };

        const isActive = selectedWeek === week;
        
        return (
          <button
            key={week}
            onClick={() => handleWeekSelection(week)}
            disabled={loading}
            className={`
              flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium 
              transition-all duration-200 whitespace-nowrap min-w-[75px]
              ${isActive 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }
              ${loading ? 'opacity-50' : ''}
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
            `}
          >
            {getWeekDisplayName(week)}
          </button>
        );
      })}
    </div>
  </div>
  
  <style jsx>{`
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
  `}</style>
</div>


            <DownloadCSV data={sortedData} filename={`${plantName}_${selectedWeek}.csv`} />
          </div>
          
          {/* Fixed Height Table with Enhanced Colors and No Text Wrapping */}
{/* Beautiful Light Soft-Themed Table */}
<div className="rounded-2xl border border-blue-100/60 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 backdrop-blur-sm overflow-hidden shadow-lg shadow-blue-100/50">
  <div 
    className="overflow-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50 hover:scrollbar-thumb-blue-300"
    style={{ 
      height: '600px',
    }}
  >
    <div style={{ minWidth: '1800px' }}> {/* Much wider for better column spacing */}
      <table className="w-full relative">
        {/* Soft Light Header */}
        <thead className="sticky top-0 z-20">
          <tr className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b-2 border-blue-200/60 shadow-sm backdrop-blur-sm">
            {filteredColumns.map(column => (
              <th
                key={column.key}
                onClick={() => requestSort(column.key)}
                className="group px-6 py-5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide cursor-pointer hover:bg-blue-100/50 transition-all duration-300 border-r border-blue-100/60 last:border-r-0"
                style={{ 
                  width: getColumnWidth(column.key), // Dynamic width function
                  minWidth: getColumnWidth(column.key),
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold text-xs leading-tight">
                    {column.displayName}
                  </span>
                  {getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Soft Light Body */}
        <tbody className="divide-y divide-blue-100/40 bg-white/80">
          {sortedData.map((row, index) => (
            <tr 
              key={index} 
              className={`hover:bg-gradient-to-r hover:from-blue-50/60 hover:via-indigo-50/40 hover:to-blue-50/60 transition-all duration-300 group ${
                index % 2 === 0 
                  ? 'bg-white/90' 
                  : 'bg-blue-50/20'
              }`}
            >
              {filteredColumns.map(column => (
                <td 
                  key={column.key}
                  className={`px-6 py-4 text-sm border-r border-blue-50/60 last:border-r-0 ${
                    typeof row[column.key] === 'number' ? 'text-right' : 'text-left'
                  }`}
                  style={{ 
                    width: getColumnWidth(column.key),
                    minWidth: getColumnWidth(column.key),
                  }}
                >
                  <div className="flex items-center overflow-hidden">
                    {column.key === filteredColumns[0]?.key && (
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 mr-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex-shrink-0 shadow-sm"></div>
                    )}
                    <div className="truncate" title={String(row[column.key])}>
                      {formatCellValue(row[column.key], column.key)}
                    </div>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>

        </div>
      )}

      {/* No Data State */}
      {!loading && !error && sortedData.length === 0 && hasGenerated && (
        <div className="p-12 text-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Data Available</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No records found for {selectedWeek.replace('_', ' ').toUpperCase()}
          </p>
        </div>
      )}
    </div>
  );
}

