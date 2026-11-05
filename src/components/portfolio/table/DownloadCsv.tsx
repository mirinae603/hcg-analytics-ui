"use client";
// The "Download CSV" a drawer's exact table carries (HCG asked for tables it can take away):
// exactly the rows and columns the table prints, by the app's export rules — the Executive
// overview's exactCsv (a BOM so Excel reads ₹, CRLF line ends, RFC 4180 quoting, raw numbers,
// text a spreadsheet would run as a formula defused) — in a file named after the page, the table
// and the selection it was computed under. The paged lists export through KpiTable instead
// (table/exportCsv exportAll), which asks the server for every row.
import React from "react";
import { TbDownload } from "react-icons/tb";
import { INK } from "@/components/portfolio/ledger/kit";
import { csvName, exactCsv, type ExactColumn } from "@/components/portfolio/executive/shared";
import { saveBlob } from "./exportCsv";

/** One column of a downloaded table: what it prints (`value`) and the figure the file holds
 *  (`raw`: exact rupees, a % as a number, never the printed text), with what that figure is
 *  counted in (`unit`, added to its heading). A column without `raw` writes its printed text
 *  when that is plain text (a name), else nothing. */
export type CsvColumn<T> = ExactColumn<T>;

/** "Spend analysis - Hospitals ranked by margin missed All hospitals Aug-26.csv". csvName names
 *  the Executive overview's files ("Executive overview - <caption>.csv"); a table on another page
 *  carries its own page's name before the caption, cleaned and cut the same way (worked out when
 *  a file is saved, not when this module loads). */
export function tableCsvName(page: string, caption: string): string {
  const executive = csvName("").slice(0, -".csv".length);
  return `${page} - ${csvName(caption).slice(executive.length)}`;
}

/** The download button above a table: `page` is the page's name ("Spend analysis"), `caption`
 *  says what the rows are and for which selection. Nothing to download, no button. */
export function DownloadCsv<T>({ rows, columns, page, caption }: { rows: T[]; columns: CsvColumn<T>[]; page: string; caption: string }) {
  if (!rows.length) return null;
  const download = () => saveBlob(new Blob([exactCsv(rows, columns)], { type: "text/csv;charset=utf-8" }), tableCsvName(page, caption));
  return (
    <div className="flex justify-end mb-1">
      <button type="button" onClick={download} aria-label={`Download CSV: ${caption}`}
        className="inline-flex items-center gap-1 text-[11.5px] font-semibold rounded hover:underline focus-visible:outline focus-visible:outline-2"
        style={{ color: INK }}>
        <TbDownload size={13} aria-hidden="true" />Download CSV
      </button>
    </div>
  );
}
