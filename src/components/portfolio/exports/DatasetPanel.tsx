"use client";
// One export tab: a short header in plain words, then the table. The header says what one row
// is and what the rows leave out (meta's own note, so the page and the API cannot disagree),
// which months the table holds, how many rows the month picked has, and where they come from.
// The table is the shared KpiTable on the dataset's endpoint, with meta's columns: its Export
// button pages the server 5,000 rows at a time and writes every row the page filters, the
// table's own filters and the search match — the whole selection, not the page on screen — and
// asks first above CONFIRM_ROWS (table/exportCsv). The title wears the "Current stock value"
// page's header, as the analysis screens' headline tiles do: a coral icon chip beside it.
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { TbFileSpreadsheet } from "react-icons/tb";
import { Card, Head, INK, SUB, CORAL, CORAL_TINT, num } from "@/components/portfolio/ledger/kit";
import { CONFIRM_ROWS } from "../table/exportCsv";
import { exportParams, monthWords, monthsHeld, narrowing, rowsIn, tableColumns, type ExportDataset, type Filters } from "./api";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;

/** The month picked and its rows in words, from meta's rows per month (every hospital, before
 *  any filter). Meta cannot count a narrower selection, so the words say where that count is.
 *  `narrowedBy` names what narrows it ("hospital"), null when nothing does. */
function selectionWords(ds: ExportDataset, f: Filters, narrowedBy: string | null): string {
  const rows = rowsIn(ds, f.month);
  const head = `${monthWords(ds, f.month)}: ${plural(rows, "row", "rows")} in all.`;
  if (narrowedBy) return `${head} With the ${narrowedBy} picked the table keeps a part of them; its Export button counts the rows it will write.`;
  return rows > CONFIRM_ROWS ? `${head} Above ${num(CONFIRM_ROWS)} rows the export asks before it builds the file.` : head;
}

export default function DatasetPanel({ ds, notes, filters, plant }: {
  ds: ExportDataset;
  /** meta's notes for both datasets (no identifiers kept, a file holds what its table shows). */
  notes: string[];
  /** Already fitted to `ds` (fitFilters). */
  filters: Filters;
  /** The global hospital as a Plant= value ('ALL' for every hospital). */
  plant: string;
}) {
  const columns = useMemo(() => tableColumns(ds), [ds]);
  const params = exportParams(ds, filters);
  const hospital = plant !== "ALL", filtered = narrowing(ds, filters).length > 0;
  const narrowedBy = hospital && filtered ? "hospital and filters" : hospital ? "hospital" : filtered ? "filters" : null;
  const facts: [string, string][] = [
    ["Months held", monthsHeld(ds)],
    ["This selection", selectionWords(ds, filters, narrowedBy)],
    ["Source", ds.source],
  ];

  return (
    <Card delay={60}>
      <Head label={(
        <span className="inline-flex items-center gap-2.5">
          <span aria-hidden="true" className="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0" style={{ background: CORAL_TINT, color: CORAL }}>
            <TbFileSpreadsheet size={17} />
          </span>
          {ds.label}
        </span>
      )} badge={`${plural(ds.rows, "row", "rows")} · ${plural(ds.months.length, "month", "months")}`} note={ds.note} />
      <dl className="grid gap-x-5 gap-y-1.5 text-[12px] leading-snug" style={{ gridTemplateColumns: "max-content minmax(0,1fr)" }}>
        {facts.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt style={{ color: SUB }}>{k}</dt>
            <dd style={{ color: INK }}>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
      {notes.length > 0 && (
        <ul className="mt-3 mb-4 pl-4 list-disc space-y-1 text-[11.5px] leading-snug" style={{ color: SUB }}>
          {notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
      {/* Keyed by dataset: one table's sort, page and search name columns the other does not
          have, so a tab switch starts the table afresh instead of carrying them over. */}
      <KpiTable key={ds.key} kpiKey={`export-${ds.key}`} endpoint={ds.endpoint} plant={plant} columns={columns} extraParams={params} />
    </Card>
  );
}
