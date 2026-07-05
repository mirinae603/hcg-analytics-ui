"use client";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_SortingState,
  type MRT_ColumnFiltersState,
} from "material-react-table";
import { ArrowDownTrayIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { Download, Refresh } from "@mui/icons-material";
import debounce from "lodash.debounce";

interface StockChangeResponse {
  Year: string;
  Month: string;
  "Material ID": string;
  "Material Name": string;
  "Material Group": string;
  "COGS": string;
  "Avg Inventory Value": string;
  "ITR":string;
}

interface StockChangeRow {
  id: number;
  year: string;
  period: string;
  materialId: string;
  materialName: string;
  materialGroup: string;
  cogs: number;
  avgInventoryValue: number;
  itr:number;
}

interface CustomFilter {
  field: string;
  operator: string;
  value: string;
  id: string;
}

export default function RecordsTable_KPI_3() {
  const [data, setData] = useState<StockChangeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rowCount, setRowCount] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);

  // MRT state - Initialize with proper default values
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  

  // Convert MRT filters to backend format
  const buildQueryParams = () => {
    const filters = columnFilters
      .filter(f => f.id && f.value !== undefined && f.value !== null && f.value !== '')
      .map((f, i) => {
        const operator = 'contains'; // Default operator, can be enhanced
        const value = Array.isArray(f.value) ? f.value.join(',') : String(f.value);
        return `filter_field_${i}=${encodeURIComponent(f.id)}&filter_operator_${i}=${encodeURIComponent(operator)}&filter_value_${i}=${encodeURIComponent(value)}`;
      })
      .join("&");

    const sortParam =
      sorting.length > 0 && sorting[0].id && sorting[0].desc !== undefined
        ? `sort_field=${encodeURIComponent(sorting[0].id)}&sort_order=${encodeURIComponent(sorting[0].desc ? 'desc' : 'asc')}`
        : "";

    // Add global filter if present
    const globalFilterParam = globalFilter && globalFilter.trim() !== '' 
      ? `global_filter=${encodeURIComponent(globalFilter)}`
      : "";

    return [filters, sortParam, globalFilterParam].filter(Boolean).join("&");
  };

  const transformApiData = (data: StockChangeResponse[], startIndex = 0): StockChangeRow[] => {
    return data.map((entry, index) => ({
      id: startIndex + index,
      year: entry["Year"],
      period: entry["Month"],
      materialId: entry["Material ID"],
      materialName: entry["Material Name"],
      materialGroup: entry["Material Group"],
      cogs: parseFloat(entry["COGS"]) || 0,
      avgInventoryValue: parseFloat(entry["Avg Inventory Value"]) || 0,
      itr: parseFloat(entry["ITR"]) || 0,
    }));
  };

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsRefetching(true);
    setIsError(false);
    
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const query = buildQueryParams();
      console.log("➡️ Sending filter model:", { columnFilters, sorting, globalFilter });

      const url = `http://localhost:8000/kpi_3_table?Plant=CHENNAI&page=${pagination.pageIndex}&page_size=${pagination.pageSize}&${query}`;

      const res = await fetch(url, { signal });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const responseData = await res.json();
      const transformed = transformApiData(responseData.data, pagination.pageIndex * pagination.pageSize);
      // console.log("KPI 3 Recieved Table Data ", responseData);
      if (isMountedRef.current) {
        setData(transformed);
        setRowCount(responseData.total);
        setIsError(false);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to fetch data:", err);
        setIsError(true);
        setData([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }

    return () => controller.abort();
  }, [pagination.pageIndex, pagination.pageSize, columnFilters, sorting]);

  
  useEffect(() => {
    const debouncedFetch = debounce(() => fetchData(), 300);
    debouncedFetch();
    return debouncedFetch.cancel;
  }, [fetchData]);

  const exportToCSV = async () => {
    const queryParams = buildQueryParams();
    const url = `http://localhost:8000/kpi_3_table?Plant=CHENNAI&page=0&page_size=100000&${queryParams}`;

    try {
      const res = await fetch(url);
      const responseData = await res.json();
      const allRows = transformApiData(responseData.data);

      const headers = columns.map(col => col.header);
      const csvRows = [
        headers.join(","),
        ...allRows.map(row =>
          columns.map(col => {
            const val = row[col.accessorKey as keyof StockChangeRow];
            return typeof val === "number" ? val.toFixed(2) : `"${val ?? ""}"`;
          }).join(",")
        ),
      ];

      const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const blobUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "stock-level-change.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export filtered data:", err);
    }
  };
  
  // Define columns
  const columns = useMemo<MRT_ColumnDef<StockChangeRow>[]>(
  () => [
    {
      accessorKey: "year",
      header: "Year",
      minSize: 80,
      maxSize: 120,
      grow: 1,
      filterVariant: "text",
      // filterSelectOptions: ["2023", "2024", "2025"],
      muiFilterTextFieldProps: {
        placeholder: "Filter by year",
        fullWidth: true,
      },
    },
    {
      accessorKey: "period",
      header: "Month",
      minSize: 100,
      grow: 2,
      filterVariant: "text",
      muiFilterTextFieldProps: {
        placeholder: "Filter by week",
        fullWidth: true,
      },
    },
    {
      accessorKey: "materialId",
      header: "Material ID",
      minSize: 130,
      grow: 2,
      filterVariant: "text",
      muiFilterTextFieldProps: {
        placeholder: "Filter by material ID",
        fullWidth: true,
      },
    },
    {
      accessorKey: "materialName",
      header: "Material Name",
      minSize: 150,
      grow: 3,
      filterVariant: "text",
      muiFilterTextFieldProps: {
        placeholder: "Filter by material name",
        fullWidth: true,
      },
    },
    {
      accessorKey: "materialGroup",
      header: "Material Group",
      minSize: 150,
      grow: 2,
      filterVariant: "text",
      muiFilterTextFieldProps: {
        placeholder: "Filter by material group",
        fullWidth: true,
      },
    },
    {
      accessorKey: "cogs",
      header: "COGS",
      minSize: 150,
      grow: 2,
      filterVariant: "range",
      muiTableBodyCellProps: { align: "right" },
      muiTableHeadCellProps: { align: "right" },
      muiFilterTextFieldProps: {
        placeholder: "Min-Max",
        fullWidth: true,
      },
      Cell: ({ cell }) => (
        <Box sx={{ textAlign: "right", pr: 1 }}>
          {cell.getValue<number>()?.toFixed(2) ?? "0.00"}
        </Box>
      ),
    },
    {
      accessorKey: "avgInventoryValue",
      header: "Avg Inventory Value",
      minSize: 170,
      grow: 2,
      filterVariant: "range",
      muiTableBodyCellProps: { align: "right" },
      muiTableHeadCellProps: { align: "right" },
      muiFilterTextFieldProps: {
        placeholder: "Min-Max",
        fullWidth: true,
      },
      Cell: ({ cell }) => (
        <Box sx={{ textAlign: "right", pr: 1 }}>
          {cell.getValue<number>()?.toFixed(2) ?? "0.00"}
        </Box>
      ),
    },
    {
      accessorKey: "itr",
      header: "ITR",
      minSize: 170,
      grow: 2,
      filterVariant: "range",
      muiTableBodyCellProps: { align: "right" },
      muiTableHeadCellProps: { align: "right" },
      muiFilterTextFieldProps: {
        placeholder: "Min-Max",
        fullWidth: true,
      },
      Cell: ({ cell }) => (
        <Box sx={{ textAlign: "right", pr: 1 }}>
          {cell.getValue<number>()?.toFixed(2) ?? "0.00"}
        </Box>
      ),
    },
  ],
  []
);


  const table = useMaterialReactTable({
  columns,
  data,
  manualFiltering: true,
  manualPagination: true,
  manualSorting: true,
  rowCount,
  state: {
    columnFilters,
    globalFilter,
    isLoading,
    pagination,
    showAlertBanner: isError,
    showProgressBars: isRefetching,
    sorting,
  },

  onColumnFiltersChange: setColumnFilters,
  onGlobalFilterChange: setGlobalFilter,
  onPaginationChange: setPagination,
  onSortingChange: setSorting,

  enableGlobalFilter: false, // 🔴 DISABLE GLOBAL FILTER
  enableFullScreenToggle: false,
  enableColumnFilterModes: false,
  enableColumnActions: true,
  enableColumnResizing: true,
  enableStickyHeader: true,
  enableRowSelection: false,
  enableColumnOrdering: false,
  enableColumnPinning: true,
  enableDensityToggle: true,
  enableHiding: true,
  enableRowActions: false,

  muiSearchTextFieldProps: undefined, // 🔴 REMOVE OR UNSET IF PRESENT

  // initialState: {
  //   density: "comfortable",
  //   showGlobalFilter: false, // 🔴 HIDE INITIAL GLOBAL FILTER
  //   columnFilters: [],
  //   pagination: {
  //     pageIndex: 0,
  //     pageSize: 10,
  //   },
  //   sorting: [],
  // },

    muiPaginationProps: {
      color: "primary",
      rowsPerPageOptions: [10, 25, 50, 100],
      shape: "rounded",
      variant: "outlined",
    },
    paginationDisplayMode: "pages",
    muiTableProps: {
      sx: {
        tableLayout: "fixed",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 600,
        fontSize: "14px",
        backgroundColor: "#F9FAFB",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "13px",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxHeight: "600px",
      },
    },
    // Add default filter functions to prevent controlled/uncontrolled issues
    filterFns: {
      contains: (row, id, filterValue) => {
        return row.getValue(id)?.toString().toLowerCase().includes(filterValue.toLowerCase()) ?? false;
      },
      equals: (row, id, filterValue) => {
        return row.getValue(id) === filterValue;
      },
      startsWith: (row, id, filterValue) => {
        return row.getValue(id)?.toString().toLowerCase().startsWith(filterValue.toLowerCase()) ?? false;
      },
    },
    renderTopToolbarCustomActions: ({ table }) => (
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Tooltip title="Refresh Data">
          <IconButton onClick={fetchData} disabled={isRefetching}>
            <Refresh />
          </IconButton>
        </Tooltip>
        <Button
          onClick={exportToCSV}
          startIcon={<Download />}
          variant="outlined"
          size="small"
          sx={{ textTransform: "none" }}
        >
          Export CSV
        </Button>
        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 1,
          ml: 2,
          fontSize: "14px",
          color: "text.secondary"
        }}>
          <span>{rowCount.toLocaleString()} records</span>
        </Box>
      </Box>
    ),
    initialState: {
      density: "comfortable",
      showGlobalFilter: false,
      columnFilters: [],
      globalFilter: "",
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
      sorting: [],
    },
  });

  if (!hasMounted) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <h2 className="text-xl text-gray-800 dark:text-white sm:flex-1">
          Inventory Turn-Over Ratio
        </h2>
      </div>

      <MaterialReactTable table={table} />
    </div>
  );
}