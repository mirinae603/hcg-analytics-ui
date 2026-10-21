"use client";
// Formulary Compliance — the compliance panel on the Overview, and the drawer it opens. The
// panel is Stephen Few's bullet graph, one row per figure: the overall compliance as a dot
// coloured by its status against the unit's budget (from HCG's PAN MIS), the budget as a black
// marker, the month before as a grey tick and the met / within / below bands behind it; then
// onco and non-onco on the same axis, in ink (HCG budgets the pooled figure, not the segments).
// For all hospitals the same panel is the network's compliance, with no budget: HCG budgets each
// unit. A row opens its drawer: the overall figure the written summary, the month-by-month
// charts, the onco / non-onco and IP / OP splits, HCG's Budget vs Actual table and the method;
// a segment the onco vs non-onco drawer. The (i) opens the drawer on Method.
//
// The axis is fitted to the figures (they sit between ~94% and 100%), so they are dots, never
// bars: a bar's length would claim a zero the axis does not have. In the drawer the Trend tab
// plots the GAP (points short of 100%, i.e. the out-of-formulary share for pooled) as bars
// from zero; a 0–100 axis would flatten 98.4 vs 99.2 into one line.
import React, { useState } from "react";
import { Readout, useArmed, useSlots, INK, SUB, LINE, EASE } from "@/components/portfolio/ledger/kit";
import type { DeltaProps } from "@/components/portfolio/ledger/KpiCard";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures } from "@/components/portfolio/ledger/DetailDrawer";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { BulletRows, type BulletRow } from "@/components/portfolio/ledger/bullets";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { STATUS_LABEL, WITHIN_PTS, classify } from "@/components/portfolio/ledger/status";
import { isNum, pct } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { F_COL, OOF_COL, NF_COL, LinkButton, Pills, fmtPts, RATE_COL } from "./parts";
import { BudgetActualTable, HcgChart } from "./HcgTables";
import { complianceSummary, rupees, type SegmentMove } from "./summaries";
import { SegmentsDrawer } from "./overview-cards/SegmentsCard";
import {
  HowBuilt, MethodText, SplitRows, budgetOf, filterChips, shareOfRatio,
  type BudgetView, type OverviewScope,
} from "./overview-cards/shared";
import { effectiveMethod, gapOf, inRatioOf, monthLabel, niceMax, type Overview as OverviewData, type View } from "./api";

/** Why the overall figure carries no budget marker, beside its label. */
const NO_BUDGET: Record<NonNullable<BudgetView["why"]>, string> = {
  network: "HCG budgets each unit",
  unit: "no budget set for this unit",
  filters: "budget is for all patients, pooled",
};

export default function ComplianceTile({ s, place }: { s: OverviewScope; place: Place }) {
  const dr = useDrawer();
  const seg = useDrawer();
  const { d, filters, prev } = s;
  const value = d.headline.compliance_pct;
  const budget = budgetOf(s);
  const target = budget.applies ? budget.value : null;
  const status = budget.applies ? classify(value, budget.value) : "none";
  const prior = prev ? { value: prev.row.compliance_pct, label: prev.label } : null;

  // With one material type chosen the overall figure IS that segment's: no segment rows.
  const segments: BulletRow[] = filters.segment === "ALL"
    ? (d.segments || []).map((g) => ({
        key: g.key, label: g.label, value: g.compliance_pct, valueLabel: pct(g.compliance_pct),
        prior: prev ? { value: prev.data?.segments?.find((p) => p.key === g.key)?.compliance_pct ?? null, label: prev.label } : null,
        onClick: () => seg.show("segments"),
      }))
    : [];
  const rows: BulletRow[] = [
    {
      key: "all", label: s.network ? "All units" : "Overall", value, valueLabel: pct(value),
      target, targetLabel: isNum(target) ? `budget ${target}%` : undefined, prior, status,
      note: budget.why ? NO_BUDGET[budget.why] : budget.applies ? STATUS_LABEL[status] : undefined,
      onClick: () => dr.show("summary"),
    },
    ...segments,
  ];
  // Each % as a bar on one axis from 0 to 100%, so 98% reads as a bar 98% full: a dot on an axis
  // fitted to 96–100% sat mid-track and read as misplaced. The budget and the month before are
  // ticks on the same axis; the bar takes the row's status colour, or the rate colour unjudged.
  const title = s.network ? "Network compliance" : "Formulary compliance vs budget";
  const label = [
    `${title}, ${s.context}: ${pct(value)}`,
    budget.applies ? `budget ${budget.value}%, ${STATUS_LABEL[status]}` : budget.why ? NO_BUDGET[budget.why] : null,
    prior ? `${prior.label} ${pct(prior.value)}` : null,
    ...segments.map((r) => `${r.label} ${r.valueLabel}`),
  ].filter(Boolean).join(". ");

  return (
    <>
      <ChartPanel id="compliance" title={title} context={s.context} accent={F_COL} place={place} label={label} interactive
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        <BulletRows ariaLabel={`Formulary compliance, ${s.context}`} rows={rows}
          scale={{ kind: "pct", min: 0, max: 100, bars: true, color: RATE_COL }} empty="No formulary or out-of-formulary drug spend in this selection." />
      </ChartPanel>
      <ComplianceDrawer s={s} open={dr.open} first={dr.tab} onClose={dr.close} />
      <SegmentsDrawer s={s} open={seg.open} first={seg.tab} onClose={seg.close} />
    </>
  );
}

export function ComplianceDrawer({ s, open, first, onClose }: { s: OverviewScope; open: boolean; first?: string; onClose: () => void }) {
  const { d, filters, where, prev } = s;
  const h = d.headline;
  const value = h.compliance_pct;
  const budget = budgetOf(s);
  const status = budget.applies ? classify(value, budget.value) : "none";
  const before = prev?.row.compliance_pct;
  const delta: DeltaProps | undefined = prev && isNum(value) && isNum(before)
    ? { value: value - before, unit: "pts", goodWhen: "up", vsLabel: `vs ${prev.label}` }
    : undefined;

  // The month before per segment, for the summary's "the fall is in non-onco" line.
  const segments: SegmentMove[] = filters.segment === "ALL"
    ? (d.segments || []).map((g) => ({
        label: g.label,
        pct: g.compliance_pct,
        prevPct: prev?.data?.segments?.find((p) => p.key === g.key)?.compliance_pct ?? null,
      }))
    : [];

  const goTo = (v: View) => { onClose(); s.onOpen(v); };

  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={first}
      eyebrow="Formulary compliance · Overview" title={`Formulary compliance · ${where}`}
      kpi={{ value: pct(value), comparator: budget.applies ? `Budget ${budget.value}%` : undefined, status, delta }}
      source="computed" asOf={s.asOf} filters={filterChips(s)}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <SummaryTab d={d} share={shareOfRatio(s)} lines={complianceSummary({
              where, when: s.when, pct: value, budget: budget.value, noBudget: budget.why,
              prev: prev ? { label: prev.label, pct: prev.row.compliance_pct } : null,
              segments, outOfFormulary: h.out_of_formulary, nonFormulary: h.non_formulary,
            })} />
          ),
        },
        { key: "trend", label: "Trend", render: () => <TrendPanel s={s} /> },
        { key: "breakdown", label: "Breakdown", render: () => <BreakdownTab s={s} onOpen={goTo} /> },
        { key: "mail", label: "As in HCG mail", render: () => <BudgetActualTable d={d} meta={s.meta} filters={filters} /> },
        { key: "method", label: "Method", render: () => <MethodTab s={s} budget={budget} /> },
      ]} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAWER TABS
// ─────────────────────────────────────────────────────────────────────────────

function SummaryTab({ d, share, lines }: {
  d: OverviewData;
  /** What the in-ratio amount's note says the % is (shareOfRatio). */
  share: string;
  lines: string[];
}) {
  const h = d.headline;
  return (
    <>
      <DrawerSection title="In brief">
        <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
          {lines.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      </DrawerSection>
      <DrawerSection title="Key figures" note={`Exact cost (TOTALCOSTPRICE) · ${num(h.lines)} drug lines in scope`}>
        <KeyFigures figures={[
          { label: "Formulary", value: rupees(h.formulary), color: F_COL, note: "in the ratio" },
          { label: "Out of formulary", value: rupees(h.out_of_formulary), color: OOF_COL, note: "in the ratio" },
          { label: "Formulary + out of formulary", value: rupees(inRatioOf(h)), note: `${share} of it` },
          { label: "Non formulary", value: rupees(h.non_formulary), color: NF_COL, hatched: true, note: "outside the ratio" },
          { label: "All drug spend", value: rupees(h.total), note: "formulary + out of formulary + non formulary" },
        ]} />
      </DrawerSection>
    </>
  );
}

function BreakdownTab({ s, onOpen }: { s: OverviewScope; onOpen: (v: View) => void }) {
  const { d, filters } = s;
  const h = d.headline;
  return (
    <>
      <DrawerSection title="Onco vs non-onco"
        note={filters.segment === "ALL"
          ? <>Each segment&apos;s own ratio. Pooled {pct(h.pooled_pct)} is HCG&apos;s current method; the mean of the two segments ({pct(h.mean_pct)}) was its earlier one.</>
          : "Material type is filtered to one segment, so only that segment has spend here."}>
        <SplitRows rows={(d.segments || []).map((g) => ({ key: g.key, label: g.label, s: g }))} />
      </DrawerSection>
      <DrawerSection title="Inpatient vs outpatient" note="The same ratio per patient type. IP and OP lines both come from the HIS consolidated sales file.">
        <SplitRows rows={(d.by_type || []).map((t) => ({ key: t.type, label: t.type === "IP" ? "Inpatient (IP)" : t.type === "OP" ? "Outpatient (OP)" : t.type, s: t }))} />
      </DrawerSection>
      <DrawerSection title="Where the out-of-formulary spend is">
        <div className="flex flex-wrap gap-2">
          <LinkButton onClick={() => onOpen("doctors")}>Out of formulary by doctor</LinkButton>
          <LinkButton onClick={() => onOpen("items")}>Out of formulary items</LinkButton>
        </div>
      </DrawerSection>
    </>
  );
}

function MethodTab({ s, budget }: { s: OverviewScope; budget: BudgetView }) {
  const h = s.d.headline;
  const method = effectiveMethod(s.filters);
  const gap = gapOf(h.compliance_pct);
  const hcgMis = s.meta.hcg_mis?.file;
  return (
    <>
      <MethodText>
        <p>
          {method === "mean" ? (
            <>Mean = the average of the onco ratio and the non-onco ratio, each Formulary ÷ (Formulary + Out of formulary): HCG&apos;s earlier method. A segment with nothing in its ratio is skipped.</>
          ) : (
            <>Pooled = Formulary ÷ (Formulary + Out of formulary){s.filters.segment === "ALL"
              ? <> over onco and non-onco drugs together: HCG&apos;s current method.</>
              : <> for the selected material type.</>}
              {gap != null && <> Of every ₹100 in the ratio, <b style={{ color: INK }}>₹{gap.toFixed(2)}</b> went to out-of-formulary items.</>}</>
          )}
        </p>
        <p>Non formulary items and consumables are outside the ratio. {num(h.lines)} drug lines in scope.</p>
        <p>
          {budget.value == null
            ? <>{budget.why === "network"
                ? <>Budget: HCG sets a compliance budget for each hospital, so all hospitals together have none.</>
                : <>Budget: HCG&apos;s PAN MIS sets no budget for this hospital.</>}
                {s.prev && <> The chart compares the figure with {s.prev.label} instead, the grey tick.</>}</>
            : h.budget_source === "hcg_mis"
              ? <>Budget = {budget.value}%, this hospital&apos;s FY budget in HCG&apos;s PAN MIS{hcgMis ? <> ({hcgMis})</> : null}.</>
              : <>Budget = {budget.value}%, the default target: HCG&apos;s PAN MIS, which sets each hospital&apos;s own, has not been read yet.</>}
          {" "}The status compares the whole percentage HCG&apos;s MIS would print with the budget: met when it prints at or above it,
          within {WITHIN_PTS} pts when it prints up to {WITHIN_PTS} points below, otherwise more than {WITHIN_PTS} pts below. The budget is set for
          a hospital&apos;s whole drug spend, pooled, so no status is shown under a patient-type, payer, material or mean filter.
          {budget.why === "filters" && s.prev && <> Under these filters the chart compares the figure with {s.prev.label}, the grey tick.</>}
        </p>
        <p>
          On the Overview each figure is a dot on one axis fitted to the figures, the months before and the budget: the axis does
          not start at zero, so the figures are dots, not bars. The grey tick is the month before; when the figure is judged against
          a budget, the black marker is the budget and the shaded bands behind it are met, within {WITHIN_PTS} pts and below.
        </p>
      </MethodText>
      <HowBuilt s={s} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TREND — the gap from 100% on a zero-based axis (default), or HCG's own Budget vs Actual
// bars on a 94–101% axis
// ─────────────────────────────────────────────────────────────────────────────
type TrendView = "gap" | "hcg";

function TrendPanel({ s }: { s: OverviewScope }) {
  const [view, setView] = useState<TrendView>("gap");
  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <Pills value={view} onChange={setView} options={[
          { key: "gap", label: "Gap from 100%", title: "Points short of 100%, on an axis from zero" },
          { key: "hcg", label: "HCG view", title: "Budget vs Actual bars per month, as in HCG's MIS chart" },
        ]} />
      </div>
      {view === "hcg" ? <HcgChart months={s.months} /> : <Trend s={s} />}
    </>
  );
}

/** Every published month, whatever the Month filter says — the months in the selection are shaded. */
function Trend({ s }: { s: OverviewScope }) {
  const { d, meta } = s;
  const on = useArmed();
  const rows = d.trend || [];
  const sel = new Set(d.scope?.months || []);
  const W = 560, H = 290, PL = 52, PR = 12, PT = 34, PB = 42;
  const PW = W - PL - PR, PH = H - PT - PB;
  const n = Math.max(rows.length, 1), slotW = PW / n, bw = Math.min(slotW * 0.46, 64);
  const gaps = rows.map((r) => gapOf(r.compliance_pct));
  const gmax = niceMax(Math.max(0.5, ...gaps.map((g) => g ?? 0)));
  const Y = (g: number) => PT + PH - (g / gmax) * PH;
  const { hi, onMove, onLeave } = useSlots(W, PL, slotW, n);
  const a = hi != null ? rows[hi] : null;

  return (
    <>
      <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>Every month · points short of 100%, from zero</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 6, cursor: "crosshair" }} preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={onLeave} role="img" aria-label="Out-of-formulary share by month, labelled with each month's compliance">
        {rows.map((r, i) => sel.has(r.period) && (
          <rect key={`s-${r.period}`} x={PL + i * slotW + 4} y={PT - 28} width={slotW - 8} height={PH + 28 + 30} rx={10} fill="rgba(22,32,28,.045)" />
        ))}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PL} y1={Y(gmax * f)} x2={W - PR} y2={Y(gmax * f)} stroke={LINE} strokeWidth="1" />
            <text x={PL - 8} y={Y(gmax * f) + 3.5} textAnchor="end" style={{ fontSize: 9.5, fill: SUB }}>{fmtPts(gmax * f)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const g = gaps[i];
          const bh = g == null ? 0 : (g / gmax) * PH;
          const x = PL + i * slotW + slotW / 2 - bw / 2;
          const isSel = sel.has(r.period), act = hi === i;
          return (
            <g key={r.period} style={{ opacity: hi == null || act ? 1 : 0.5, transition: "opacity 170ms" }}>
              <rect x={x} y={on ? PT + PH - bh : PT + PH} width={bw} height={on ? bh : 0} rx={4} fill={OOF_COL} opacity={isSel ? 1 : 0.42}
                style={{ transition: `y 640ms ${EASE} ${120 + i * 60}ms, height 640ms ${EASE} ${120 + i * 60}ms` }} />
              <text x={x + bw / 2} y={PT + PH - bh - 8} textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 700, fill: RATE_COL, opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" }}>{pct(r.compliance_pct)}</text>
              <text x={x + bw / 2} y={PT + PH + 18} textAnchor="middle"
                style={{ fontSize: 10.5, fontWeight: isSel || act ? 700 : 500, fill: isSel || act ? INK : SUB }}>{r.label || monthLabel(meta, r.period)}</text>
            </g>
          );
        })}
        <line x1={PL} y1={PT + PH} x2={W - PR} y2={PT + PH} stroke={INK} strokeWidth="1" />
      </svg>
      <Readout k={hi} dark minH={52}>
        {a ? (
          <span><b>{a.label || monthLabel(meta, a.period)}</b> — compliance <b style={{ color: RATE_COL }}>{pct(a.compliance_pct)}</b>
            {" "}of {rupees(inRatioOf(a))} · formulary {rupees(a.formulary)} · out of formulary <b style={{ color: OOF_COL }}>{rupees(a.out_of_formulary)}</b>
            <span style={{ color: SUB }}> · non formulary {rupees(a.non_formulary)} (outside the ratio)</span></span>
        ) : (
          <span style={{ color: SUB }}>bars = points short of 100% · labels = compliance · shaded = months in your selection</span>
        )}
      </Readout>
    </>
  );
}
