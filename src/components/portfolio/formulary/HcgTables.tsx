"use client";
// Formulary Compliance — what the Overview's compliance and consumption panels share:
//   • the compliance months from trend[] (complianceMonths), and the "HCG view" chart of the
//     compliance drawer's Trend tab: clustered Budget / Actual bars per month (HcgChart),
//   • the consumption rows by segment and by payer, in their fixed order.
//
// Every figure here is ours, recomputed from the HIS sales lines for the months the app has
// data for. On the quantity view the chart carries units sold instead of rupees, and the budget
// bars are left out (a units figure is never set against HCG's drug-cost budget).
import React, { useState } from "react";
import { Readout, useArmed, useSlots, inr as inrShort, INK, SUB, LINE, STONE, SEL_BG, EASE } from "@/components/portfolio/ledger/kit";
import { inr, pct } from "@/lib/kpiFormat";
import { Pills, Swatch, RATE_COL } from "./parts";
import { count, countShort, type Measure } from "./measure";
import {
  effectiveMethod, fyOf, inRatioOf, monthLabel,
  type ConsumptionRow, type Filters, type Meta, type Overview as OverviewData, type PayerRow,
} from "./api";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const whole = (v: number | null | undefined) => (isNum(v) ? `${Math.round(v)}%` : "—");
/** A figure in a readout: rupees in lakhs / crores, or units. */
const shortOf = (m: Measure) => (m.units ? count : (v: number | null | undefined) => inr(v));

// ─────────────────────────────────────────────────────────────────────────────
// The compliance months, from trend[]
// ─────────────────────────────────────────────────────────────────────────────
export type CompMonth = {
  period: string; label: string; fy: string;
  budget: number | null;
  actual: number | null;
  method: string;
  formulary: number | null; inRatio: number | null; nonFormulary: number | null;
  selected: boolean;
};

export function complianceMonths(d: OverviewData, meta: Meta, filters: Filters): CompMonth[] {
  // Each month's own budget; an API that sends none falls back to the default target.
  const fallback = meta.target_pct ?? null;
  const sel = new Set(d.scope?.months || []);
  const method = effectiveMethod(filters);
  return (d.trend || [])
    .map((r) => ({
      period: r.period, label: r.label || monthLabel(meta, r.period), fy: fyOf(r.period),
      budget: r.budget_pct === undefined ? fallback : r.budget_pct, actual: r.compliance_pct, method,
      formulary: r.formulary, inRatio: inRatioOf(r), nonFormulary: r.non_formulary,
      selected: sel.has(r.period),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/** The financial years present, oldest first, and the one to open on: the latest year with a
 *  compliance figure (HCG's chart is always the current FY to date). */
function useFy(months: CompMonth[]) {
  const fys = Array.from(new Set(months.map((m) => m.fy)));
  const withFigure = months.filter((m) => m.actual != null);
  const def = withFigure.length ? withFigure[withFigure.length - 1].fy : fys[fys.length - 1];
  const [fy, setFy] = useState<string | null>(null);
  const cur = fy && fys.includes(fy) ? fy : def;
  return { fys, cur, setFy };
}

function FyPills({ fys, cur, onChange }: { fys: string[]; cur: string | undefined; onChange: (v: string) => void }) {
  if (fys.length < 2 || !cur) return null;
  return <Pills value={cur} onChange={onChange} options={fys.map((f) => ({ key: f, label: f }))} />;
}

const methodWord = (m: string) => (m === "mean" ? "mean of onco & non-onco" : m === "pooled" ? "pooled" : m);

// ─────────────────────────────────────────────────────────────────────────────
// HCG VIEW — clustered Budget / Actual bars per month, axis 94–101% like HCG's chart
// ─────────────────────────────────────────────────────────────────────────────
export function HcgChart({ months, m }: { months: CompMonth[]; m: Measure }) {
  const on = useArmed();
  const { fys, cur, setFy } = useFy(months);
  const rows = months.filter((m) => m.fy === cur);
  const W = 560, H = 312, PL = 40, PR = 8, PT = 26, PB = 66;
  const PW = W - PL - PR, PH = H - PT - PB;
  const n = Math.max(rows.length, 1), slotW = PW / n;
  const bw = Math.max(6, Math.min(slotW * 0.3, 30)), gap = Math.min(4, slotW * 0.05);
  const vals = rows.flatMap((r) => [r.actual, r.budget]).filter(isNum);
  // HCG's axis runs 94–101%. Widen it downwards only when a month falls below 94%.
  const minV = Math.min(94, ...vals);
  const lo = minV < 94 ? Math.floor(minV) - 1 : 94;
  const hi = Math.max(101, Math.ceil(Math.max(0, ...vals)) + 1);
  const step = hi - lo > 10 ? 2 : 1;
  const Y = (v: number) => PT + PH - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * PH;
  const base = PT + PH;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  const { hi: k, onMove, onLeave } = useSlots(W, PL, slotW, n);
  const a = k != null ? rows[k] : null;
  const money = slotW < 76 ? (m.units ? countShort : inrShort) : m.units ? count : (v: number) => inr(v);
  const amount = shortOf(m);
  // No month carries a budget on units: no Budget key, bars or readout then.
  const budgeted = m.budgetJudged;
  const unit = m.units ? "units" : "₹";

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]" style={{ color: SUB }}>
          {budgeted && <span className="inline-flex items-center gap-1.5"><Swatch color={STONE} />Budget</span>}
          <span className="inline-flex items-center gap-1.5"><Swatch color={RATE_COL} />Actual (app){m.units ? ", on quantity" : ""}</span>
          {!budgeted && m.units && <span>No budget on quantity</span>}
        </div>
        <FyPills fys={fys} cur={cur} onChange={setFy} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 6, cursor: "crosshair" }} preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={onLeave} role="img" aria-label={budgeted ? "Formulary compliance budget against actual, by month, as in HCG's MIS chart" : "Formulary compliance on quantity by month, as in HCG's MIS chart; no budget on quantity"}>
        {rows.map((r, i) => r.selected && (
          <rect key={`s-${r.period}`} x={PL + i * slotW + 3} y={PT - 22} width={slotW - 6} height={PH + 22 + 52} rx={10} fill={SEL_BG} />
        ))}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} y1={Y(t)} x2={W - PR} y2={Y(t)} stroke={LINE} strokeWidth="1" />
            <text x={PL - 6} y={Y(t) + 3.5} textAnchor="end" style={{ fontSize: 9.5, fill: SUB }}>{t}%</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = PL + i * slotW + slotW / 2;
          const xb = cx - gap / 2 - bw, xa = cx + gap / 2;
          const hb = isNum(r.budget) ? base - Y(r.budget) : 0;
          const ha = isNum(r.actual) ? base - Y(r.actual) : 0;
          const act = k === i;
          const delay = 120 + i * 50;
          return (
            <g key={r.period} style={{ opacity: k == null || act ? 1 : 0.5, transition: "opacity 170ms" }}>
              <rect x={xb} y={on ? base - hb : base} width={bw} height={on ? hb : 0} rx={3} fill={STONE} opacity={0.85}
                style={{ transition: `y 620ms ${EASE} ${delay}ms, height 620ms ${EASE} ${delay}ms` }} />
              {isNum(r.budget) && (
                <text x={xb + bw / 2} y={base - hb - 5} textAnchor="middle" style={{ fontSize: 9, fill: SUB, opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" }}>{whole(r.budget)}</text>
              )}
              <rect x={xa} y={on ? base - ha : base} width={bw} height={on ? ha : 0} rx={3} fill={RATE_COL}
                style={{ transition: `y 620ms ${EASE} ${delay + 40}ms, height 620ms ${EASE} ${delay + 40}ms` }} />
              <text x={xa + bw / 2} y={base - ha - 5} textAnchor="middle"
                style={{ fontSize: 10, fontWeight: 700, fill: RATE_COL, opacity: on ? 1 : 0, transition: "opacity 400ms ease 700ms" }}>{whole(r.actual)}</text>
              <text x={cx} y={base + 15} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: r.selected || act ? 700 : 500, fill: r.selected || act ? INK : SUB }}>{r.label}</text>
              <text x={cx} y={base + 28} textAnchor="middle" style={{ fontSize: 8.5, fill: SUB }}>F {isNum(r.formulary) ? money(r.formulary) : "—"}</text>
              <text x={cx} y={base + 39} textAnchor="middle" style={{ fontSize: 8.5, fill: SUB }}>A+B {isNum(r.inRatio) ? money(r.inRatio) : "—"}</text>
            </g>
          );
        })}
        <line x1={PL} y1={base} x2={W - PR} y2={base} stroke={INK} strokeWidth="1" />
      </svg>
      <Readout k={k} dark minH={52}>
        {a ? (
          <span><b>{a.label}</b> — {budgeted ? <>budget {whole(a.budget)} · </> : null}actual <b style={{ color: RATE_COL }}>{pct(a.actual, 2)}</b> ({methodWord(a.method)})
            {" "}· formulary <b>{amount(a.formulary)}</b> of <b>{amount(a.inRatio)}</b> formulary + out of formulary{m.units ? " units" : ""}
            <span style={{ color: SUB }}> · non formulary {amount(a.nonFormulary)} (outside the ratio)</span></span>
        ) : (
          <span style={{ color: SUB }}>
            HCG&apos;s chart: axis from {lo}%, not zero, so a one-point gap looks large · labels are whole % like HCG&apos;s · under each month: F = formulary {unit}, A+B = formulary + out of formulary {unit}
          </span>
        )}
      </Readout>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The consumption rows, by segment and by payer
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_LABEL: Record<string, string> = { onco: "Onco", "non-onco": "Non-onco", all: "Total" };
const SEG_ORDER: Record<string, number> = { onco: 0, "non-onco": 1, all: 2 };

/** The consumption rows in a fixed order (onco, non-onco, total); none from an older API. */
export function consumptionRows(d: OverviewData): ConsumptionRow[] {
  return [...(d.consumption?.rows ?? [])].sort((a, b) => (SEG_ORDER[a.segment] ?? 9) - (SEG_ORDER[b.segment] ?? 9));
}

/** What the consumption figures cover, as the API words it. */
export const consumptionScope = (d: OverviewData) =>
  d.consumption?.scope_note || "Drugs only. Every payer and both segments; Month, hospital and patient type apply.";

const PAYER_ORDER: Record<string, number> = { CASH: 0, "CASH(TPA)": 1, GOV: 2, ALL: 9 };

/** The payer rows in a fixed order (cash, cash TPA, GOV, then the total). */
export function payerRows(d: OverviewData): PayerRow[] {
  return [...(d.by_payer?.rows ?? [])].sort((a, b) => (PAYER_ORDER[a.payer] ?? 5) - (PAYER_ORDER[b.payer] ?? 5));
}
