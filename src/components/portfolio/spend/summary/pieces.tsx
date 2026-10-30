"use client";
// Spend Summary — the blocks its drawers are built from: a loss table, the month chart with
// HCG's month table under it, every hospital as a 100% bar, and the links on to the section
// that holds the full tables. Drawers print exact rupees with paise (the panels print lakhs),
// so a figure can be checked against HCG's sheets to the paisa.
import React from "react";
import { INK, SUB, LINE, RULE, SEL_BG } from "@/components/portfolio/ledger/kit";
import { MonthCombo, StackBars } from "@/components/portfolio/ledger/charts";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { useSelectHospital } from "@/context/RegionContext";
import { MonthTable } from "../Trend";
import { VIEWS, type Section, type View } from "../api";
import { LOSS_COL, PROPOSED_COL, RATE_COL, USED_COL } from "../shared";
import { KIND, type HospitalLoss, type KindWords, type LossKind, type LossRow, type MonthLoss } from "./model";

/** Where a drawer link goes: a section of this page and one of its tabs. */
export type Go = (loc: { section: Section; view: View }) => void;
export type GoLink = { label: string; section: Section; view: View };

/** The four figures HCG's tables carry for each row (actual, proposed, loss, % missed), in the
 *  words of the section the rows belong to. A `strong` row is a total. */
export function LossTable({ rows, words, strong = [] }: { rows: LossRow[]; words: KindWords; strong?: string[] }) {
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p>;
  const head = ["", words.actual, words.proposed, words.loss, "% missed"];
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[12.5px] tabular-nums" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 560 }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className={`px-2 py-2 text-[10px] font-semibold uppercase whitespace-nowrap ${i ? "text-right" : "text-left"}`}
                style={{ color: SUB, letterSpacing: ".06em", borderBottom: `1px solid ${RULE}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = strong.includes(r.key);
            const cell = { borderBottom: `1px solid ${LINE}`, color: INK, fontWeight: total ? 700 : 500 };
            return (
              <tr key={r.key} style={{ background: total ? SEL_BG : undefined }}>
                <th scope="row" className="px-2 py-[7px] text-left whitespace-nowrap" style={{ ...cell, fontWeight: total ? 700 : 600 }}>{r.label}</th>
                <td className="px-2 py-[7px] text-right whitespace-nowrap" style={cell}>{rupeesExact(r.actual)}</td>
                <td className="px-2 py-[7px] text-right whitespace-nowrap" style={cell}>{rupeesExact(r.proposed)}</td>
                <td className="px-2 py-[7px] text-right whitespace-nowrap" style={{ ...cell, fontWeight: 700 }}>{rupeesExact(r.loss)}</td>
                <td className="px-2 py-[7px] text-right whitespace-nowrap" style={cell}>{pct(r.pct, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Every published month: actual and proposed as bars from zero, in the colours the sections
 *  draw them in, the % missed as a line on its own axis, and HCG's month table under it in exact
 *  rupees. Months in the selection are shaded in both. */
export function LossTrend({ kind, months, selected, where }: { kind: LossKind; months: MonthLoss[]; selected: string[]; where: string }) {
  const w = KIND[kind];
  const sel = new Set(selected);
  return (
    <>
      <MonthCombo ariaLabel={`${w.title}: ${w.actual.toLowerCase()} and ${w.proposed.toLowerCase()} by month with the % missed as a line, ${where}`}
        layout="alternatives" series={[{ key: "actual", label: w.actual, color: USED_COL }, { key: "proposed", label: w.proposed, color: PROPOSED_COL }]}
        line={{ label: `% missed ${w.pctOf}`, color: RATE_COL, decimals: 1 }}
        months={months.map((m) => ({ key: m.period, label: m.label, pct: m.pct, selected: sel.has(m.period), values: { actual: m.actual, proposed: m.proposed } }))} />
      <div className="mt-5">
        <MonthTable rows={months} selected={sel} cols={[
          { label: w.actual, render: (r) => rupeesExact(r.actual) },
          { label: w.proposed, render: (r) => rupeesExact(r.proposed) },
          { label: w.loss, render: (r) => <b>{rupeesExact(r.loss)}</b> },
          { label: "% missed", render: (r) => pct(r.pct, 2) },
        ]} />
      </div>
    </>
  );
}

/** Every hospital as one 100% bar of the amount its % missed is a share of, in the shape of HCG's
 *  "Unit Inventory Distribution": for cash & TPA and out of formulary the margin possible (the
 *  margin lost, then the margin made), for scheme the spend (the loss, then the
 *  suggested spend). So the loss part, from the left, is the hospital's % missed; the loss in
 *  lakhs follows the bar. A row selects the hospital, the selected one again all hospitals. */
export function HospitalShares({ kind, rows }: { kind: LossKind; rows: HospitalLoss[] }) {
  const w = KIND[kind];
  const selectHospital = useSelectHospital();
  // Cash & TPA and out of formulary take their % of the margin possible, scheme of the spend.
  const margin = w.whole === "proposed";
  const base = margin ? { label: w.actual, color: USED_COL } : { label: w.proposed, color: PROPOSED_COL };
  return (
    <StackBars ariaLabel={`${w.title} by hospital, most missed first`} empty="No hospital has margin missed in this selection." asideWidth={84}
      onRow={(plant) => { const r = rows.find((x) => x.plant === plant); if (r) selectHospital(r); }}
      segments={[{ key: "loss", label: w.loss, color: LOSS_COL }, { key: "base", label: base.label, color: base.color }]}
      rows={rows.map((r) => ({ key: r.plant, label: r.label, selected: r.selected, aside: lakhs(r.loss), values: { loss: r.loss, base: margin ? r.actual : r.proposed } }))} />
  );
}

/** The links from a drawer to the section that holds the full tables. */
export function GoLinks({ links, onGo }: { links: GoLink[]; onGo: Go }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => <LinkButton key={`${l.section}-${l.view}`} onClick={() => onGo({ section: l.section, view: l.view })}>{l.label}</LinkButton>)}
    </div>
  );
}

/** A link to each of a section's tabs: its overview, its brands, its doctors (vendors, for
 *  out of formulary's purchases). */
export const sectionLinks = (kind: LossKind): GoLink[] => {
  const w = KIND[kind];
  return VIEWS[w.section].map((v) => ({ label: `${w.short} ${v.label.toLowerCase()}`, section: w.section, view: v.key }));
};

/** A drawer's Method tab: a few paragraphs, then the section's own notes as a list. */
export function MethodText({ lines, notes = [] }: { lines: React.ReactNode[]; notes?: string[] }) {
  return (
    <div className="space-y-3 text-[12.5px] leading-relaxed" style={{ color: SUB }}>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
      {notes.length > 0 && (
        <ul className="space-y-1.5 list-disc pl-5">
          {notes.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
    </div>
  );
}
