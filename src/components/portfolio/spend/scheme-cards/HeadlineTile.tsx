"use client";
// Spend Analysis, Scheme overview — the headline tile and its drawer. The tile is HCG's
// Actual | Proposed drawn as a bridge (Waterfall): the spend on the brands scheme patients got,
// less the margin HCG missed (HCG: scheme margin missed), down to what the suggested
// brands would have cost for the same quantity, so the loss is the step between the two bars.
// Both sides use HCG's FY price list, as HCG's own report does. The drawer carries the written
// summary, actual vs proposed for every month, HCG's month table, the hospitals (once one is
// selected) and the method; the page lifts it (HeadlineDrawer), as the month tile opens it too.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { Waterfall } from "@/components/portfolio/ledger/bars";
import { MonthCombo } from "@/components/portfolio/ledger/charts";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { DrawerSection, type DrawerCtl, KeyFigures, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import type { DeltaProps } from "@/components/portfolio/ledger/KpiCard";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { INK, SUB, num } from "@/components/portfolio/ledger/kit";
import { LinkButton } from "../../formulary/parts";
import { MonthTable, type MonthCol, type TrendRow } from "../Trend";
import { monthBefore } from "../../formulary/api";
import type { Filters, Meta, Overview, View } from "../api";
import { lossMethod } from "../shared";
import { HospitalTable } from "./HospitalsTile";
import {
  LOSS_COL, PROPOSED_COL, RATE_COL, USED_COL, WORDS, MethodTab, filterChips, monthRows, type Scope,
} from "./context";

export function HeadlineTile({ d, scope, place, drawer }: {
  d: Overview; scope: Scope; place: Place;
  /** The page's HeadlineDrawer. */
  drawer: DrawerCtl;
}) {
  const h = d.headline;
  const w = WORDS;
  const any = h.lines > 0;
  const share = isNum(h.saving_pct) ? `${pct(h.saving_pct)} of spend` : undefined;
  const empty = `No scheme patient got a brand with ${w.aSug} suggestion here.`;
  const label = any
    ? `${w.bridge}, ${scope.context}. ${w.actual} ${lakhs(h.used_value)}; ${w.loss} ${lakhs(h.saving_missed)}${share ? ` (${share})` : ""}; ${w.proposed} ${lakhs(h.suggested_value)}`
    : `${w.bridge}, ${scope.context}. ${empty}`;

  return (
    <ChartPanel id="headline" title={w.bridge} context={scope.context} accent={USED_COL} place={place} label={label}
      onOpen={() => drawer.show("summary")} onInfo={() => drawer.show("method")}>
      {any ? (
        <Waterfall ariaLabel={`${w.actual} − ${w.loss} = ${w.proposed}`} format={lakhs}
          steps={[
            { key: "used", label: w.actual, value: h.used_value, kind: "total", color: USED_COL, valueLabel: lakhs(h.used_value), note: `${num(h.brands)} brands` },
            { key: "loss", label: w.loss, value: -h.saving_missed, kind: "delta", color: LOSS_COL, valueLabel: lakhs(-h.saving_missed), note: share },
            { key: "sug", label: w.proposed, value: h.suggested_value, kind: "total", color: PROPOSED_COL, valueLabel: lakhs(h.suggested_value), note: "same units" },
          ]} />
      ) : (
        <p className="text-[12px]" style={{ color: SUB }}>{empty}</p>
      )}
    </ChartPanel>
  );
}

/** The headline figure in full: the written summary, actual vs proposed every month, HCG's
 *  month table, the hospitals (once one is selected) and the method. */
export function HeadlineDrawer({ d, meta, filters, scope, drawer, onOpen }: {
  d: Overview; meta: Meta; filters: Filters; scope: Scope; drawer: DrawerCtl;
  onOpen: (v: View) => void;
}) {
  const h = d.headline;
  const w = WORDS;
  const rows = monthRows(d, meta);
  const prev = monthBefore(rows, d.scope?.months || []);
  const delta: DeltaProps | undefined = prev && isNum(prev.loss)
    ? { value: h.saving_missed - prev.loss, unit: "rs", goodWhen: "down", vsLabel: `vs ${prev.label}` }
    : undefined;
  const goTo = (v: View) => { drawer.close(); onOpen(v); };

  return (
    <DetailDrawer open={drawer.open} onClose={drawer.close} initialTab={drawer.tab}
      eyebrow={`${w.section} · Overview`} title={`${w.title} · ${scope.where}`}
      kpi={{
        value: rupeesExact(h.saving_missed),
        comparator: isNum(h.saving_pct) ? `${pct(h.saving_pct)} of ${rupeesExact(h.used_value)} ${w.actual.toLowerCase()}` : undefined,
        delta,
      }}
      source="computed" asOf={scope.asOf} filters={filterChips(filters, scope, meta)}
      tabs={[
        { key: "summary", label: "Summary", render: () => <SummaryTab d={d} meta={meta} scope={scope} prev={prev} onOpen={goTo} /> },
        { key: "trend", label: "Trend", render: () => <TrendTab d={d} rows={rows} /> },
        { key: "mail", label: "As in HCG mail", render: () => <MailTab d={d} rows={rows} /> },
        { key: "hospitals", label: "Hospitals", hidden: scope.network, render: () => <HospitalTable d={d} onPicked={drawer.close} /> },
        { key: "method", label: "Method", render: () => <MethodTab d={d} meta={meta} lines={headlineMethod(meta)} /> },
      ]} />
  );
}

/** The scheme figure is worked out in the words the Summary's scheme drawer uses (lossMethod). */
function headlineMethod(meta: Meta): React.ReactNode[] {
  const m = lossMethod("scheme", meta.scheme_list?.financial_year);
  return [
    m.basis, m.formula,
    "The tile draws the figure as a bridge: the spend on the brands used, less the loss, leaves what the suggested brands would have cost. Every bar starts from zero but the loss, which runs between the two.",
    "With one month selected, the drawer's header and summary compare with the month before.",
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAWER TABS
// ─────────────────────────────────────────────────────────────────────────────

function SummaryTab({ d, meta, scope, prev, onOpen }: {
  d: Overview; meta: Meta; scope: Scope; prev: TrendRow | null; onOpen: (v: View) => void;
}) {
  const h = d.headline;
  const w = WORDS;
  const fy = d.scheme_list?.financial_year || meta.scheme_list?.financial_year;
  const listed = meta.scheme_list?.switches;
  const lines: React.ReactNode[] = [
    <>For scheme (GOV) patients HCG&apos;s scheme list names a cheaper brand
      {listed != null ? <> for {num(listed)} brands</> : null}. {scope.network ? "Across all hospitals" : `At ${scope.where}`}, {scope.when}, {num(h.brands)} of them were used:
      {" "}{num(h.qty)} units, by {num(h.doctors)} doctor{h.doctors === 1 ? "" : "s"}{scope.network ? <> at {num(h.hospitals)} hospitals</> : null}.</>,
    <>At HCG&apos;s {fy ? `FY ${fy} ` : ""}list prices they cost {rupeesExact(h.used_value)}; the {w.sug} brands would have cost
      {" "}{rupeesExact(h.suggested_value)}. {w.loss}: <b style={{ color: INK }}>{rupeesExact(h.saving_missed)}</b>
      {isNum(h.saving_pct) ? <> ({pct(h.saving_pct)} of the spend)</> : null}.</>,
    ...(prev ? [<>{prev.label}, the month before: {w.loss.toLowerCase()} {rupeesExact(prev.loss)}, {pct(prev.pct)} of {rupeesExact(prev.actual)}.</>] : []),
    <>The bills for these lines came to {rupeesExact(h.bill_cost)}: what was billed, not list price.</>,
  ];
  const figures: KeyFigure[] = [
    { label: w.actual, value: rupeesExact(h.used_value), color: USED_COL, note: "qty × list price" },
    { label: w.proposed, value: rupeesExact(h.suggested_value), color: PROPOSED_COL, note: `same qty × ${w.sug} price` },
    { label: w.loss, value: rupeesExact(h.saving_missed), color: LOSS_COL, note: `${w.pct} ${pct(h.saving_pct)}` },
    { label: "Billed", value: rupeesExact(h.bill_cost), note: "the bills' cost for these lines" },
    { label: "Brands · units", value: `${num(h.brands)} · ${num(h.qty)}`, note: `${num(h.lines)} sales lines` },
    { label: "Doctors · hospitals", value: `${num(h.doctors)} · ${num(h.hospitals)}`, note: "who prescribed them, where" },
  ];
  return (
    <>
      <DrawerSection title="In brief">
        <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
          {lines.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      </DrawerSection>
      <DrawerSection title="Key figures" note="Exact rupees at HCG's FY list prices.">
        <KeyFigures figures={figures} />
      </DrawerSection>
      <DrawerSection title="Behind this figure">
        <div className="flex flex-wrap gap-2">
          <LinkButton onClick={() => onOpen("items")}>Brands behind it</LinkButton>
          <LinkButton onClick={() => onOpen("doctors")}>By doctor</LinkButton>
        </div>
      </DrawerSection>
    </>
  );
}

/** HCG's "Actual vs Budget" chart for this figure: the spend on the brands used beside the
 *  same quantity at the suggested brand's price, every month, with the % on its own axis. */
function TrendTab({ d, rows }: { d: Overview; rows: TrendRow[] }) {
  const w = WORDS;
  const sel = new Set(d.scope?.months || []);
  return (
    <DrawerSection title={`${w.actual} vs ${w.proposed.toLowerCase()}, every month`}
      note="Every published month, whatever the Month filter says; the months in your selection are shaded. The two bars stand one over the other from zero, the larger behind; the line joins the bar tops, each point labelled with the month's %.">
      <MonthCombo ariaLabel={`${w.actual} and ${w.proposed.toLowerCase()} by month, with ${w.pct} as a line`}
        layout="alternatives" series={[{ key: "used", label: w.actual, color: USED_COL }, { key: "sug", label: w.proposed, color: PROPOSED_COL }]}
        line={{ label: w.pct, color: RATE_COL, decimals: 2 }}
        months={rows.map((r) => ({
          key: r.period, label: r.label, pct: r.pct, selected: sel.has(r.period),
          values: { used: r.actual, sug: r.proposed },
        }))} />
    </DrawerSection>
  );
}

/** HCG's table under its chart: Actual, Proposed, Loss and % missed for every month. */
function MailTab({ d, rows }: { d: Overview; rows: TrendRow[] }) {
  const w = WORDS;
  const sel = new Set(d.scope?.months || []);
  const cols: MonthCol<TrendRow>[] = [
    { label: w.actual, render: (r) => rupeesExact(r.actual) },
    { label: w.proposed, render: (r) => rupeesExact(r.proposed) },
    { label: w.loss, render: (r) => <b>{rupeesExact(r.loss)}</b> },
    { label: w.pct, render: (r) => pct(r.pct) },
  ];
  return (
    <DrawerSection title="Month by month"
      note="HCG's 'Scheme Margin Loss' table: spend on the brands used, the same quantity at the suggested brands' price, the loss and % missed (= margin missed ÷ spend), per month.">
      <MonthTable rows={rows} cols={cols} selected={sel} />
    </DrawerSection>
  );
}
