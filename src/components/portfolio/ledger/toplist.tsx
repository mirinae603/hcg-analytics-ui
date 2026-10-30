"use client";
// The "top 5 by X" lists on the overviews (out-of-formulary brands, doctors, margin loss by
// doctor). They ask the very list endpoint the matching table tab pages through, for one page of
// five sorted by that figure, so every figure matches that tab row for row; the drawer lists the
// five in exact rupees and moves to the full tab, where each row drills further.
//   useTopRows    — the first page of `n` rows of `path`, largest `sortField` first.
//   TopListDrawer — the drawer: "Top 5" (the rows, numbered, words left and figures right, and the
//                   way to the full tab) and "Method".
import React from "react";
import DetailDrawer, { DrawerSection, type DrawerFilter, type DrawerKpi } from "./DetailDrawer";
import { INK, SUB, LINE, RULE } from "./kit";
import { LinkButton } from "./panel";
import type { SourceOf } from "./status";
import { cachedFetch, toQuery, useFetched } from "@/components/portfolio/formulary/api";

/** How many rows a top list holds. */
export const TOP_N = 5;

/** The {data, total, sums} page every table endpoint answers with. */
export type TablePage<T> = { data: T[]; total: number; sums?: Record<string, number> };

// Pages are cached per query for the life of the page, like the overviews themselves.
const pageCache = new Map<string, Promise<TablePage<unknown>>>();
const getPage = (url: string) => cachedFetch(pageCache, url);

/** The first page of `n` rows of `path` for `params`, largest `sortField` first; keeps the last
 *  page on screen while the next one loads. */
export function useTopRows<T>(path: string, params: Record<string, string>, sortField: string, n = TOP_N): { page: TablePage<T> | null; error: string | null } {
  const query = toQuery({ ...params, page: "0", page_size: String(n), sort_field: sortField, sort_order: "desc" });
  const { data, error } = useFetched(getPage, `${path}?${query}`);
  return { page: data as TablePage<T> | null, error };
}

export type TopColumn<T> = {
  label: string;
  value: (r: T) => string;
  /** Words read left; figures right. */
  text?: boolean;
  /** The figure the list is ranked by, in bold. */
  strong?: boolean;
};

/** The rows, numbered, words left and figures right. */
function TopTable<T>({ rows, rowKey, columns, empty }: { rows: T[]; rowKey: (r: T) => string; columns: TopColumn<T>[]; empty: string }) {
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>{empty}</p>;
  const cell = (c: TopColumn<T>) => `px-3 py-2 text-[12px] ${c.text ? "text-left" : "text-right tabular-nums whitespace-nowrap"}`;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
            <th scope="col" className="px-3 py-2 text-[10.5px] font-semibold uppercase text-left" style={{ letterSpacing: ".08em" }}>#</th>
            {columns.map((c) => (
              <th key={c.label} scope="col" className={`px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap ${c.text ? "text-left" : "text-right"}`}
                style={{ letterSpacing: ".08em" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r)} style={{ borderBottom: `1px solid ${LINE}` }}>
              <td className="px-3 py-2 text-[11.5px] tabular-nums" style={{ color: SUB }}>{i + 1}</td>
              {columns.map((c) => <td key={c.label} className={cell(c)} style={{ color: INK, fontWeight: c.strong ? 700 : 400 }}>{c.value(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TopListDrawer<T>({
  open, onClose, initialTab, eyebrow, title, kpi, source = "computed", asOf, filters,
  listTitle, listNote, rows, rowKey, columns, empty, linkTitle, linkNote, linkLabel, onOpenTab, method,
}: {
  open: boolean;
  onClose: () => void;
  /** "top" (the card) or "method" (its (i)). */
  initialTab?: string;
  eyebrow: string;
  title: string;
  /** The total the five are compared with, in exact rupees. */
  kpi?: DrawerKpi;
  source?: SourceOf;
  asOf: string | null;
  filters: DrawerFilter[];
  /** "The 5 largest", and what its share column is a share of. */
  listTitle: string;
  listNote: string;
  rows: T[];
  rowKey: (r: T) => string;
  columns: TopColumn<T>[];
  empty: string;
  /** The way to the full tab: "Every item", what that tab adds, and the button's words. */
  linkTitle: string;
  linkNote: string;
  linkLabel: string;
  /** Closes the drawer and opens the tab (the caller does both). */
  onOpenTab: () => void;
  /** The Method tab's content. */
  method: React.ReactNode;
}) {
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={initialTab} size="wide"
      eyebrow={eyebrow} title={title} kpi={kpi} source={source} asOf={asOf} filters={filters}
      tabs={[
        {
          key: "top", label: `Top ${TOP_N}`, render: () => (
            <>
              <DrawerSection title={listTitle} note={listNote}>
                <TopTable rows={rows} rowKey={rowKey} columns={columns} empty={empty} />
              </DrawerSection>
              <DrawerSection title={linkTitle} note={linkNote}>
                <LinkButton onClick={onOpenTab}>{linkLabel}</LinkButton>
              </DrawerSection>
            </>
          ),
        },
        { key: "method", label: "Method", render: () => method },
      ]} />
  );
}
