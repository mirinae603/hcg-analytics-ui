"use client";
// The one server-paged table behind every KPI page and analysis tab. Besides paging, sorting and
// search it carries the table's own filters — a FacetBar with whatever the endpoint offers
// (Month, Hospital, Category, Class, Manufacturer, Payer …, each value with its row count) —
// and an export of exactly the rows those filters and the search match, all of them, in a file
// named after them. The request and answer shapes live in table/query.ts.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef, type MRT_PaginationState, type MRT_SortingState } from "material-react-table";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, InputAdornment, Snackbar, TextField } from "@mui/material";
import { Close, Download, Search } from "@mui/icons-material";
import { Col } from "@/lib/kpiRegistry";
import { fmt, num } from "@/lib/kpiFormat";
import FacetBar from "./table/FacetBar";
import { CONFIRM_ROWS, EXCEL_MAX_ROWS, ExportError, estimateBytes, exportAll } from "./table/exportCsv";
import {
  exportFileName, getTable, isAbort, localDate, namedScope, selectionParams, TableError,
  type Facet, type Params, type Row, type ScopeChip, type Selection,
} from "./table/query";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const NO_SELECTION: Selection = {};

/** The params that place the table in its page: hospital, the card's category and the page's
 *  own filters. The server applies them before anything else and echoes them as `scope`. */
function scopeParams(plant?: string, category?: string, extra?: Record<string, string>): Params {
  const p: Params = [];
  if (plant) p.push(["Plant", plant]);
  // Only ever set when the CARD this table belongs to offers a category control.
  if (category) p.push(["Category", category]);
  // Page-level extras (Month, Group, Scope on Non-Moving Inventory …) — merged in the same
  // spirit as `category` above: whatever the rest of the page is filtered to, the table
  // underneath must agree, never silently show something else under the same label.
  if (extra) for (const [k, v] of Object.entries(extra)) if (v) p.push([k, v]);
  return p;
}

export default function KpiTable({ kpiKey, plant, columns, endpoint, category, extraParams, onRowClick }: {
  kpiKey: string;
  plant?: string;
  columns: Col[];
  endpoint?: string;
  category?: string;
  extraParams?: Record<string, string>;
  onRowClick?(row: Row): void;
}) {
  // `endpoint` overrides the default `/kpi/{kpiKey}/table` URL — needed for KPIs whose
  // backend route doesn't follow the generic nested-table naming convention (e.g.
  // /kpi/vendor-volume-vs-margin-table is a flat route, not /kpi/vendor-volume-vs-margin/table).
  const base = endpoint ?? `/kpi/${kpiKey}/table`;
  const [rows, setRows] = useState<Row[]>([]);
  const [rowCount, setRowCount] = useState(0);
  // Column totals over EVERY row the filters and search match (not just this page), sent by
  // the server as `sums` when the endpoint names its money/quantity columns. A table whose
  // endpoint sends no `sums` gets no footer, exactly as before.
  const [sums, setSums] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 15 });
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  // Our own search box (see renderToolbarInternalActions below). The text updates on every
  // keystroke; the server is asked only once typing pauses for 300 ms.
  const [searchText, setSearchText] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setGlobalFilter(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  // The table's own filters, kept per endpoint: another endpoint offers other fields, and a
  // field a table does not offer is refused (400), never silently ignored.
  const [picked, setPicked] = useState<{ base: string; sel: Selection }>({ base, sel: NO_SELECTION });
  const selection = picked.base === base ? picked.sel : NO_SELECTION;
  const setSelection = useCallback((sel: Selection) => setPicked({ base, sel }), [base]);
  // The filter options and scope from the last answer that carried them. Paging and sorting
  // move no counts, so they keep these and only a filter change asks again (facets=1).
  const [options, setOptions] = useState<{ base: string; facets: Facet[]; scope: ScopeChip[] | null } | null>(null);
  const opts = options?.base === base ? options : null;

  // The request minus paging, in one place: the list, the filter typeahead and the export all
  // send exactly this, so the file holds what the screen shows. The search is literal text,
  // in the columns on screen only (hidden ids no longer match).
  const scope = scopeParams(plant, category, extraParams);
  const filters: Params = [...scope, ...selectionParams(selection)];
  if (globalFilter) filters.push(["global_filter", globalFilter], ["search_fields", columns.map((c) => c.field).join(",")]);
  const sortParams: Params = sorting[0] ? [["sort_field", sorting[0].id], ["sort_order", sorting[0].desc ? "desc" : "asc"]] : [];
  // A new filter set starts again at page 1. Without this, paging to page 6 and then
  // narrowing the filter asked the server for page 6 of a result that has two pages, and
  // the table showed "no records" above a footer that still counted rows.
  const filterSig = JSON.stringify([base, filters]);
  const lastSig = useRef(filterSig);
  const optionsSig = useRef<string | null>(null);

  useEffect(() => {
    if (lastSig.current !== filterSig) {
      lastSig.current = filterSig;
      if (pagination.pageIndex !== 0) { setPagination((p) => ({ ...p, pageIndex: 0 })); return; }
    }
    const withFacets = optionsSig.current !== filterSig;
    const ctrl = new AbortController();
    setIsLoading(true);
    getTable(base, [
      ...filters, ...sortParams,
      ["page", String(pagination.pageIndex)], ["page_size", String(pagination.pageSize)],
      ...(withFacets ? [["facets", "1"] as [string, string]] : []),
    ], ctrl.signal)
      .then((d) => {
        setRows(d.data || []); setRowCount(d.total || 0); setError(null);
        setSums(d.sums && typeof d.sums === "object" ? d.sums : null);
        // An endpoint that has not adopted the filter contract sends no `facets`: no filter
        // buttons, while search and export work as before.
        if (withFacets) { optionsSig.current = filterSig; setOptions({ base, facets: d.facets ?? [], scope: d.scope ?? null }); }
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        if (isAbort(e)) return;
        // A 4xx says what was wrong with the request (an unknown filter names the ones offered).
        setError(e instanceof TableError && e.status < 500 ? `Error loading data: ${e.message}` : "Error loading data");
        setRows([]); setSums(null); setIsLoading(false);
      });
    return () => ctrl.abort();
    // `filterSig` carries every filter param (plant, category, extraParams, facets, search):
    // leaving any of them out let the chart and gauge above the table move to a new filter
    // while the table underneath silently kept showing the old one.
  }, [filterSig, pagination.pageIndex, pagination.pageSize, sorting]); // eslint-disable-line react-hooks/exhaustive-deps

  // The values of one facet narrowed to `text`, for a facet with more values than it lists.
  const searchValues = useCallback(async (field: string, text: string, signal: AbortSignal) => {
    const d = await getTable(base, [...filters, ["facets", "only"], [`fq.${field}`, text]], signal);
    return d.facets?.find((f) => f.field === field) ?? null;
  }, [filterSig]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Export ────────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState<{ done: number; total: number } | null>(null);
  const [confirmBig, setConfirmBig] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const exportCtrl = useRef<AbortController | null>(null);
  useEffect(() => () => exportCtrl.current?.abort(), []);
  const confirmTitle = useId();

  const runExport = async () => {
    setConfirmBig(false);
    const ctrl = new AbortController();
    exportCtrl.current = ctrl;
    setExporting({ done: 0, total: rowCount });
    try {
      await exportAll({
        base, params: [...filters, ...sortParams], columns, signal: ctrl.signal,
        fileName: exportFileName(kpiKey, namedScope(opts?.scope ?? null, scope), opts?.facets ?? [], selection, globalFilter, localDate()),
        onProgress: (done, total) => setExporting({ done, total }),
      });
    } catch (e: unknown) {
      if (!isAbort(e)) {
        setNotice(e instanceof ExportError ? e.message
          : e instanceof TableError && e.status < 500 ? `The export failed: ${e.message}`
          : "The export failed, try again.");
      }
    } finally {
      exportCtrl.current = null;
      setExporting(null);
    }
  };
  // A very large file is asked about first: it takes a while, and an Excel sheet holds at most
  // 1,048,576 rows.
  const startExport = () => { if (rowCount > CONFIRM_ROWS) setConfirmBig(true); else void runExport(); };
  const bytes = confirmBig ? estimateBytes(rows, columns, rowCount) : null;

  // A footer row only when the server summed at least one of the columns on screen and
  // something matched: "Total" under the first column, each sum under its own column in that
  // column's format. Columns the server did not sum (rates, names) stay blank: a total is
  // never made up here.
  const footer = !!sums && rowCount > 0 && columns.some((c) => isNum(sums?.[c.field]));
  const cols = useMemo<MRT_ColumnDef<Row>[]>(
    () => columns.map((c, i) => {
      const align = c.kind && c.kind !== "text" && c.kind !== "date" ? "right" : "left";
      const v = sums?.[c.field];
      return {
        accessorKey: c.field, header: c.label,
        muiTableHeadCellProps: { align },
        muiTableBodyCellProps: { align },
        Cell: ({ cell }) => fmt(cell.getValue(), c.kind),
        ...(footer ? {
          muiTableFooterCellProps: { align, sx: { fontWeight: 700, whiteSpace: "nowrap" } },
          Footer: () => (i === 0
            ? <span title={`Sum over all ${num(rowCount)} matching rows, not just this page`}>
                Total · {num(rowCount)} rows{isNum(v) ? ` · ${fmt(v, c.kind)}` : ""}
              </span>
            : isNum(v) ? fmt(v, c.kind) : ""),
        } : {}),
      };
    }), [columns, sums, footer, rowCount]);

  const table = useMaterialReactTable<Row>({
    columns: cols, data: rows,
    manualPagination: true, manualSorting: true, manualFiltering: true,
    rowCount,
    state: { pagination, sorting, globalFilter, isLoading, showAlertBanner: !!error },
    onPaginationChange: setPagination, onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    enableColumnFilters: false, enableDensityToggle: false, enableHiding: false, enableFullScreenToggle: false,
    muiToolbarAlertBannerProps: error ? { color: "error", children: error } : undefined,
    initialState: { showGlobalFilter: true },
    // material-react-table 3.2 builds its search box with `inputProps`/`InputProps`, which
    // MUI 9's TextField no longer accepts: they fell through to a <div> (the React console
    // error) and the search icon and clear button never showed. We hide the built-in box and
    // draw the same one with MUI 9's `slotProps`, in the same place on the right, followed by
    // the export.
    positionGlobalFilter: "none",
    renderToolbarInternalActions: () => (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 1 }}>
        <TextField
          value={searchText} onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search" size="small" variant="outlined"
          slotProps={{
            htmlInput: { autoComplete: "off", "aria-label": "Search" },
            input: {
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="Clear search" size="small" disabled={!searchText} onClick={() => setSearchText("")}>
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        {exporting ? (
          <Box role="status" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 13, color: "text.secondary", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            Exporting {num(exporting.done)} / {num(exporting.total)}
            <Button size="small" onClick={() => exportCtrl.current?.abort()} sx={{ textTransform: "none", minWidth: 0 }}>Cancel</Button>
          </Box>
        ) : (
          <Button onClick={startExport} disabled={isLoading || !!error || rowCount === 0} startIcon={<Download />}
            variant="outlined" size="small" sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            title="A CSV of every row the filters and search match, with the columns on screen">
            Export {num(rowCount)} {rowCount === 1 ? "row" : "rows"}
          </Button>
        )}
      </Box>
    ),
    renderTopToolbarCustomActions: () => (opts?.facets.length
      ? <FacetBar facets={opts.facets} selected={selection} onChange={setSelection} searchValues={searchValues} />
      : null),
    muiTableBodyRowProps: onRowClick
      ? ({ row }) => ({ onClick: () => onRowClick(row.original), sx: { cursor: "pointer" } })
      : undefined,
    muiTablePaperProps: { elevation: 0, sx: { borderRadius: "14px", border: "1px solid #eaecf2" } },
  });

  return (
    <>
      <MaterialReactTable table={table} />
      <Dialog open={confirmBig} onClose={() => setConfirmBig(false)} aria-labelledby={confirmTitle}>
        <DialogTitle id={confirmTitle}>Export {num(rowCount)} rows?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bytes != null ? `The file will be about ${num(Math.max(1, Math.round(bytes / 1e6)))} MB and takes a while to build. ` : "The file is large and takes a while to build. "}
            {rowCount > EXCEL_MAX_ROWS
              ? `Excel opens only the first ${num(EXCEL_MAX_ROWS)} rows of a sheet; narrow the filters to open all of it in Excel.`
              : `Excel opens up to ${num(EXCEL_MAX_ROWS)} rows.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBig(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button onClick={() => void runExport()} variant="contained" disableElevation sx={{ textTransform: "none" }}>Export</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!notice} autoHideDuration={8000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Alert severity="error" variant="filled" onClose={() => setNotice(null)}>{notice}</Alert>
      </Snackbar>
    </>
  );
}
