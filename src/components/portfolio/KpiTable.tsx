"use client";
import { useEffect, useMemo, useState } from "react";
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { Box, Button } from "@mui/material";
import { Download } from "@mui/icons-material";
import { Col } from "@/lib/kpiRegistry";
import { fmt } from "@/lib/kpiFormat";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

export default function KpiTable({ kpiKey, plant, columns }: { kpiKey: string; plant?: string; columns: Col[] }) {
  const [rows, setRows] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    const run = async () => {
      setIsLoading(true);
      const p = new URLSearchParams();
      if (plant) p.set("Plant", plant);
      p.set("page", String(pagination.pageIndex));
      p.set("page_size", String(pagination.pageSize));
      if (globalFilter) p.set("global_filter", globalFilter);
      if (sorting[0]) { p.set("sort_field", sorting[0].id); p.set("sort_order", sorting[0].desc ? "desc" : "asc"); }
      try {
        const res = await fetch(`${DASHBOARD_API_BASE_URL}/kpi/${kpiKey}/table?${p.toString()}`, { signal: ctrl.signal });
        const d = await res.json();
        setRows(d.data || []); setRowCount(d.total || 0); setIsError(false);
      } catch (e: any) { if (e.name !== "AbortError") { setIsError(true); setRows([]); } }
      finally { setIsLoading(false); }
    };
    run();
    return () => ctrl.abort();
  }, [kpiKey, plant, pagination.pageIndex, pagination.pageSize, sorting, globalFilter]);

  const cols = useMemo<MRT_ColumnDef<any>[]>(
    () => columns.map((c) => ({
      accessorKey: c.field, header: c.label,
      muiTableHeadCellProps: { align: c.kind && c.kind !== "text" && c.kind !== "date" ? "right" : "left" },
      muiTableBodyCellProps: { align: c.kind && c.kind !== "text" && c.kind !== "date" ? "right" : "left" },
      Cell: ({ cell }) => fmt(cell.getValue(), c.kind),
    })), [columns]);

  const exportCsv = async () => {
    const p = new URLSearchParams(); if (plant) p.set("Plant", plant);
    p.set("page", "0"); p.set("page_size", "5000"); if (globalFilter) p.set("global_filter", globalFilter);
    const res = await fetch(`${DASHBOARD_API_BASE_URL}/kpi/${kpiKey}/table?${p.toString()}`);
    const d = await res.json();
    const head = columns.map((c) => `"${c.label}"`).join(",");
    const body = (d.data || []).map((r: any) => columns.map((c) => `"${String(r[c.field] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${kpiKey}.csv`; a.click();
  };

  const table = useMaterialReactTable({
    columns: cols, data: rows,
    manualPagination: true, manualSorting: true, manualFiltering: true,
    rowCount,
    state: { pagination, sorting, globalFilter, isLoading, showAlertBanner: isError },
    onPaginationChange: setPagination, onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    enableColumnFilters: false, enableDensityToggle: false, enableHiding: false, enableFullScreenToggle: false,
    muiToolbarAlertBannerProps: isError ? { color: "error", children: "Error loading data" } : undefined,
    initialState: { showGlobalFilter: true },
    muiTablePaperProps: { elevation: 0, sx: { borderRadius: "14px", border: "1px solid #eaecf2" } },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: "flex", gap: 1, p: "4px" }}>
        <Button onClick={exportCsv} startIcon={<Download />} variant="outlined" size="small" sx={{ textTransform: "none" }}>Export CSV</Button>
      </Box>
    ),
  });

  return <MaterialReactTable table={table} />;
}
