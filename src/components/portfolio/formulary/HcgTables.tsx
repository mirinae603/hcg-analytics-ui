"use client";
// Formulary Compliance — the views laid out the way HCG's own emails lay them out, so a reader
// can hold the app next to the monthly mails and find every number:
//   • the MIS "Budget vs Actual" table and its clustered Budget / Actual chart (HcgChart),
//   • the spend email's "Onco and Non Onco Formulary Consumption" table,
//   • the payer-wise consumption (HCG's S5 'Summary' sheet).
//
// Every figure here is ours, recomputed from the HIS sales lines for the months the app has
// data for. The tables render bare: they sit on the "As in HCG mail" tab of the Overview
// panels' drawers, behind a chart that carries their summary.
import React, { useState } from "react";
import { Readout, useArmed, useSlots, inr as inrShort, INK, SUB, LINE, RULE, GRAPHITE, EASE } from "@/components/portfolio/ledger/kit";
import { inr, num, pct } from "@/lib/kpiFormat";
import { F_COL, OOF_COL, NF_COL, Pills, Swatch, RATE_COL } from "./parts";
import {
  effectiveMethod, fyOf, inRatioOf, monthLabel,
  type ConsumptionRow, type Filters, type Meta, type Overview as OverviewData, type PayerClassRow, type PayerRow,
} from "./api";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
/** Whole rupees with Indian grouping — HCG's tables print exact amounts, so these do too. */
const rs = (v: number | null | undefined) => (isNum(v) ? Math.round(v).toLocaleString("en-IN") : "—");
const rs2 = (v: number | null | undefined) => (isNum(v) ? `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "");
const whole = (v: number | null | undefined) => (isNum(v) ? `${Math.round(v)}%` : "—");

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
export function HcgChart({ months }: { months: CompMonth[] }) {
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
  const money = slotW < 76 ? inrShort : (v: number) => inr(v);

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]" style={{ color: SUB }}>
          <span className="inline-flex items-center gap-1.5"><Swatch color={GRAPHITE} />Budget</span>
          <span className="inline-flex items-center gap-1.5"><Swatch color={RATE_COL} />Actual (app)</span>
        </div>
        <FyPills fys={fys} cur={cur} onChange={setFy} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 6, cursor: "crosshair" }} preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={onLeave} role="img" aria-label="Formulary compliance budget against actual, by month, as in HCG's MIS chart">
        {rows.map((r, i) => r.selected && (
          <rect key={`s-${r.period}`} x={PL + i * slotW + 3} y={PT - 22} width={slotW - 6} height={PH + 22 + 52} rx={10} fill="rgba(22,32,28,.045)" />
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
              <rect x={xb} y={on ? base - hb : base} width={bw} height={on ? hb : 0} rx={3} fill={GRAPHITE} opacity={0.85}
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
          <span><b>{a.label}</b> — budget {whole(a.budget)} · actual <b style={{ color: RATE_COL }}>{pct(a.actual, 2)}</b> ({methodWord(a.method)})
            {" "}· formulary <b>{inr(a.formulary)}</b> of <b>{inr(a.inRatio)}</b> formulary + out of formulary
            <span style={{ color: SUB }}> · non formulary {inr(a.nonFormulary)} (outside the ratio)</span></span>
        ) : (
          <span style={{ color: SUB }}>
            HCG&apos;s chart: axis from {lo}%, not zero, so a one-point gap looks large · labels are whole % like HCG&apos;s · under each month: F = formulary ₹, A+B = formulary + out of formulary ₹
          </span>
        )}
      </Readout>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET VS ACTUAL — HCG's MIS table: months as columns
// ─────────────────────────────────────────────────────────────────────────────
// Excel's 3-colour scale (HCG colours the Actual cells red → yellow → green, lowest → highest).
const SCALE = [[248, 105, 107], [255, 235, 132], [99, 190, 123]];
function scaleBg(v: number, min: number, max: number): string {
  const t = max > min ? (v - min) / (max - min) : 1;
  const [a, b, f]: [number[], number[], number] = t < 0.5 ? [SCALE[0], SCALE[1], t * 2] : [SCALE[1], SCALE[2], (t - 0.5) * 2];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * f));
  return `rgba(${c[0]},${c[1]},${c[2]},.42)`;
}

/** HCG's MIS "Budget vs Actual" table for the hospital in scope, months as columns. Rendered
 *  bare (no card) because it sits in the compliance drawer's "As in HCG mail" tab. */
export function BudgetActualTable({ d, meta, filters }: { d: OverviewData; meta: Meta; filters: Filters }) {
  const months = complianceMonths(d, meta, filters);
  const { fys, cur, setFy } = useFy(months);
  const rows = months.filter((m) => m.fy === cur);
  const acts = rows.map((r) => r.actual).filter(isNum);
  const min = Math.min(...acts), max = Math.max(...acts);
  const where = !d.scope?.plant || d.scope.plant === "ALL" ? "All hospitals" : (d.scope.his_name || d.scope.plant_name || d.scope.plant);
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap";
  const td = "px-3 py-2 text-[12.5px] tabular-nums whitespace-nowrap text-right";
  const lab = "px-3 py-2 text-[11.5px] font-semibold whitespace-nowrap text-left sticky left-0";

  return (
    <div>
      <p className="text-[12px] leading-snug mb-3" style={{ color: SUB }}>
        HCG&apos;s monthly MIS table for {where}, {rows.length} months{cur ? ` of ${cur}` : ""}. Actual = Formulary ÷ (Formulary + Out of formulary), {methodWord(effectiveMethod(filters))}; non formulary is outside the ratio. Budget = HCG&apos;s compliance target. Every month is recomputed from the HIS sales lines.
      </p>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <FyPills fys={fys} cur={cur} onChange={setFy} />
      </div>
      {!rows.length ? <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${RULE}`, color: SUB }}>
                <th className={`${th} text-left sticky left-0 bg-white`} style={{ letterSpacing: ".08em" }}>Formulary compliance %</th>
                {rows.map((r) => (
                  <th key={r.period} className={`${th} text-right`} style={{ letterSpacing: ".08em", color: r.selected ? INK : SUB }}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className={`${lab} bg-white`} style={{ color: INK }}>Budget</td>
                {rows.map((r) => <td key={r.period} className={td} style={{ color: SUB }}>{whole(r.budget)}</td>)}
              </tr>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className={`${lab} bg-white`} style={{ color: INK }}>Actual</td>
                {rows.map((r) => (
                  <td key={r.period} className={td} style={{ color: INK, fontWeight: 700, background: isNum(r.actual) ? scaleBg(r.actual, min, max) : undefined }}
                    title={`${pct(r.actual, 4)} · ${methodWord(r.method)}`}>
                    {pct(r.actual, 2)}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className={`${lab} bg-white`} style={{ color: SUB }}>Method</td>
                {rows.map((r) => <td key={r.period} className={td} style={{ color: SUB, fontSize: 11 }}>{r.method === "mean" ? "mean" : r.method}</td>)}
              </tr>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className={`${lab} bg-white`} style={{ color: SUB }}><span className="inline-flex items-center gap-1.5"><Swatch color={F_COL} />Formulary (A)</span></td>
                {rows.map((r) => <td key={r.period} className={td} style={{ color: INK }} title={rs2(r.formulary)}>{isNum(r.formulary) ? inr(r.formulary) : "—"}</td>)}
              </tr>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className={`${lab} bg-white`} style={{ color: SUB }}><span className="inline-flex items-center gap-1.5"><Swatch color={OOF_COL} />Formulary + out of formulary (A + B)</span></td>
                {rows.map((r) => <td key={r.period} className={td} style={{ color: INK }} title={rs2(r.inRatio)}>{isNum(r.inRatio) ? inr(r.inRatio) : "—"}</td>)}
              </tr>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className={`${lab} bg-white`} style={{ color: SUB }}><span className="inline-flex items-center gap-1.5"><Swatch color={NF_COL} hatched />Non formulary (C, outside)</span></td>
                {rows.map((r) => <td key={r.period} className={td} style={{ color: SUB }} title={rs2(r.nonFormulary)}>{isNum(r.nonFormulary) ? inr(r.nonFormulary) : "—"}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] mt-3 leading-relaxed" style={{ color: SUB }}>
        HCG prints whole percentages; ours carry two decimals (hover a cell for four).
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONCO AND NON-ONCO CONSUMPTION — the spend email's table, value and % of total
// ─────────────────────────────────────────────────────────────────────────────
const CONS_VALUE: { key: keyof ConsumptionRow; label: string }[] = [
  // The total before the out-of-formulary column, in every Formulary table (HCG asked).
  { key: "formulary", label: "Formulary" },
  { key: "total", label: "Total consumption" },
  { key: "out_of_formulary", label: "Approved out of formulary" },
  { key: "non_formulary", label: "Non formulary" },
  { key: "restricted_scheme", label: "Restricted for scheme" },
  { key: "preferred_scheme", label: "Preferred for scheme" },
  { key: "restricted_cash_tpa", label: "Restricted for cash & TPA" },
];
const CONS_PCT: { key: keyof ConsumptionRow; label: string }[] = [
  { key: "formulary_pct", label: "Formulary" },
  { key: "oof_pct", label: "Approved out of formulary" },
  { key: "nf_pct", label: "Non formulary" },
  { key: "restricted_scheme_pct", label: "Restricted for scheme" },
  { key: "preferred_scheme_pct", label: "Preferred for scheme" },
  { key: "restricted_cash_tpa_pct", label: "Restricted for cash & TPA" },
];
export const SEG_LABEL: Record<string, string> = { onco: "Onco", "non-onco": "Non-onco", all: "Total" };
const SEG_ORDER: Record<string, number> = { onco: 0, "non-onco": 1, all: 2 };

/** The consumption rows in HCG's order (onco, non-onco, total); none from an older API. */
export function consumptionRows(d: OverviewData): ConsumptionRow[] {
  return [...(d.consumption?.rows ?? [])].sort((a, b) => (SEG_ORDER[a.segment] ?? 9) - (SEG_ORDER[b.segment] ?? 9));
}

/** What the consumption figures cover, as the API words it. */
export const consumptionScope = (d: OverviewData) =>
  d.consumption?.scope_note || "Drugs only. Every payer and both segments; Month, hospital and patient type apply.";

/** The spend email's "Onco and Non Onco Formulary Consumption" table. Rendered bare (no card)
 *  because it sits in the consumption card's drawer, on its "As in HCG mail" tab. */
export function ConsumptionTable({ d }: { d: OverviewData }) {
  const rows = consumptionRows(d);
  const th = "px-2.5 py-2 text-[10px] font-semibold uppercase text-right align-bottom";
  const td = "px-2.5 py-2 text-[12px] tabular-nums whitespace-nowrap text-right";

  return (
    <div>
      <p className="text-[12px] leading-snug mb-2" style={{ color: SUB }}>
        HCG&apos;s spend-email table. Here every % is the value ÷ that row&apos;s total consumption (Formulary + Approved out of formulary + Non formulary), so non formulary IS in the base — unlike the compliance %, which divides by Formulary + Out of formulary only. Both are HCG&apos;s own definitions; they answer different questions.
      </p>
      <p className="text-[11px] mb-3" style={{ color: SUB }}>{consumptionScope(d)}</p>
      {!rows.length ? <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr style={{ color: SUB }}>
                <th className="px-2.5 pt-1 text-left" />
                <th colSpan={CONS_VALUE.length} className="px-2.5 pt-1 text-[10px] font-bold uppercase text-center" style={{ letterSpacing: ".1em", borderBottom: `1px solid ${RULE}` }}>In value (₹)</th>
                <th colSpan={CONS_PCT.length} className="px-2.5 pt-1 text-[10px] font-bold uppercase text-center" style={{ letterSpacing: ".1em", borderBottom: `1px solid ${RULE}`, borderLeft: `1px solid ${RULE}` }}>% of total consumption</th>
              </tr>
              <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
                <th className="px-2.5 py-2 text-[10px] font-semibold uppercase text-left align-bottom sticky left-0 bg-white">Type</th>
                {CONS_VALUE.map((c) => <th key={c.key} className={th} style={{ letterSpacing: ".04em", minWidth: 92 }}>{c.label}</th>)}
                {CONS_PCT.map((c, i) => <th key={c.key} className={th} style={{ letterSpacing: ".04em", minWidth: 76, borderLeft: i === 0 ? `1px solid ${RULE}` : undefined }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tot = r.segment === "all";
                return (
                  <tr key={r.segment} style={{ borderBottom: `1px solid ${LINE}`, background: tot ? "#F7F4EC" : undefined }}>
                    <td className="px-2.5 py-2 text-[12px] font-semibold text-left sticky left-0" style={{ color: INK, background: tot ? "#F7F4EC" : "#fff" }}>{SEG_LABEL[r.segment] ?? r.segment}</td>
                    {CONS_VALUE.map((c) => {
                      const v = r[c.key] as number | null;
                      return <td key={c.key} className={td} style={{ color: INK, fontWeight: tot || c.key === "total" ? 700 : 500 }} title={rs2(v)}>{rs(v)}</td>;
                    })}
                    {CONS_PCT.map((c, i) => (
                      <td key={c.key} className={td} style={{ color: RATE_COL, fontWeight: tot ? 700 : 500, borderLeft: i === 0 ? `1px solid ${RULE}` : undefined }}>{pct(r[c.key] as number | null, 2)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] mt-3 leading-relaxed" style={{ color: SUB }}>
        Restricted / preferred for scheme = FORMULARYR + FORMULARYR-OPD / FORMULARYP billed to GOV schemes; restricted for cash &amp; TPA = the restricted classes billed to cash and insurance patients. Like HCG&apos;s table, those three are shares of the row&apos;s total consumption too.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSUMPTION BY PAYER — the payer-wise view (HCG's S5 'Summary' sheet)
// ─────────────────────────────────────────────────────────────────────────────
const PAYER_ORDER: Record<string, number> = { CASH: 0, "CASH(TPA)": 1, GOV: 2, ALL: 9 };
const payerLabel = (p: string) => (p === "ALL" ? "Total" : p);

/** The payer rows in the spend email's order (cash, cash TPA, GOV, then the total). */
export function payerRows(d: OverviewData): PayerRow[] {
  return [...(d.by_payer?.rows ?? [])].sort((a, b) => (PAYER_ORDER[a.payer] ?? 5) - (PAYER_ORDER[b.payer] ?? 5));
}

/** The spend email's payer-wise consumption, rendered bare for the payer card's drawer. */
export function PayerTable({ d }: { d: OverviewData }) {
  const [open, setOpen] = useState(false);
  const rows = payerRows(d);
  const classes = d.by_payer?.classes;
  if (!rows.length) return <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p>;
  const th = "px-3 py-2 text-[10px] font-semibold uppercase text-right";
  const td = "px-3 py-2 text-[12.5px] tabular-nums whitespace-nowrap text-right";
  const cols: { key: keyof PayerRow; label: string; title?: string }[] = [
    { key: "onco", label: "Onco" },
    { key: "non_onco", label: "Non-onco" },
    { key: "consumables", label: "Consumables" },
    { key: "total", label: "Total" },
  ];

  return (
    <div>
      <p className="text-[12px] leading-snug mb-3" style={{ color: SUB }}>
        The spend email&apos;s &lsquo;Onco and Non Onco Total Consumption Payer wise&rsquo;, built like HCG&apos;s S5 &lsquo;Summary&rsquo; sheet. Total includes consumables; % of total = that payer&apos;s total ÷ all payers&apos; total. Compliance % = Formulary ÷ (Formulary + Out of formulary) on that payer&apos;s drugs, by the selected method. Shows every payer and both material types whatever the Payer and Material type filters; Month, hospital and patient type apply.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase text-left" style={{ letterSpacing: ".08em" }}>Payer</th>
              {cols.map((c) => <th key={c.key} className={th} style={{ letterSpacing: ".08em" }}>{c.label} (₹)</th>)}
              <th className={th} style={{ letterSpacing: ".08em" }}>% of total</th>
              <th className={th} style={{ letterSpacing: ".08em" }}>Compliance %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tot = r.payer === "ALL";
              return (
                <tr key={r.payer} style={{ borderBottom: `1px solid ${LINE}`, background: tot ? "#F7F4EC" : undefined }}>
                  <td className="px-3 py-2 text-[12.5px] font-semibold text-left" style={{ color: INK }}>{payerLabel(r.payer)}</td>
                  {cols.map((c) => {
                    const v = r[c.key] as number;
                    return <td key={c.key} className={td} style={{ color: INK, fontWeight: tot || c.key === "total" ? 700 : 500 }} title={rs2(v)}>{rs(v)}</td>;
                  })}
                  <td className={td} style={{ color: SUB, fontWeight: tot ? 700 : 500 }}>{pct(r.share_pct, 2)}</td>
                  <td className={td} style={{ color: RATE_COL, fontWeight: 700 }}
                    title={`Formulary ${inr(r.formulary)} · out of formulary ${inr(r.out_of_formulary)} · non formulary ${inr(r.non_formulary)} (outside)`}>
                    {pct(r.compliance_pct, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {classes?.length ? (
        <div className="mt-4">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-[#F5F1E7]"
            style={{ border: `1px solid ${RULE}`, color: INK }}>
            {open ? "Hide" : "Show"} by class and IP/OP (HCG Summary layout)
          </button>
          {open && <ClassPivot rows={classes} />}
        </div>
      ) : null}
    </div>
  );
}

/** HCG's S5 'Summary' pivot: formulary class × payer, onco / non-onco split by IP and OP. */
function ClassPivot({ rows }: { rows: PayerClassRow[] }) {
  const sorted = [...rows].sort((a, b) =>
    a.formulary_class.localeCompare(b.formulary_class) || (PAYER_ORDER[a.payer] ?? 5) - (PAYER_ORDER[b.payer] ?? 5));
  const keys: (keyof PayerClassRow)[] = ["onco_ip", "onco_op", "onco", "non_onco_ip", "non_onco_op", "non_onco", "total"];
  const heads = ["Onco IP", "Onco OP", "Onco", "Non-onco IP", "Non-onco OP", "Non-onco", "Total"];
  // Grand total over the payer rows (an "ALL" row, if the API sends one per class, is already a subtotal).
  const grand = keys.map((k) => sorted.filter((r) => r.payer !== "ALL").reduce((s, r) => s + (Number(r[k]) || 0), 0));
  const td = "px-2.5 py-1.5 text-[11.5px] tabular-nums whitespace-nowrap text-right";
  return (
    <div className="overflow-x-auto mt-3">
      <table className="min-w-full border-collapse">
        <thead>
          <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
            <th className="px-2.5 py-2 text-[10px] font-semibold uppercase text-left">Class</th>
            <th className="px-2.5 py-2 text-[10px] font-semibold uppercase text-left">Payer</th>
            {heads.map((h) => <th key={h} className="px-2.5 py-2 text-[10px] font-semibold uppercase text-right">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const first = i === 0 || sorted[i - 1].formulary_class !== r.formulary_class;
            const sub = r.payer === "ALL";
            return (
              <tr key={`${r.formulary_class}|${r.payer}`} style={{ borderTop: first && i > 0 ? `1px solid ${RULE}` : `1px solid ${LINE}`, background: sub ? "#FBF9F4" : undefined }}>
                <td className="px-2.5 py-1.5 text-[11.5px] text-left" style={{ color: INK, fontWeight: 600 }}>{first ? r.formulary_class : ""}</td>
                <td className="px-2.5 py-1.5 text-[11.5px] text-left" style={{ color: sub ? INK : SUB, fontWeight: sub ? 700 : 500 }}>{sub ? "All payers" : r.payer}</td>
                {keys.map((k) => <td key={k} className={td} style={{ color: INK, fontWeight: sub || k === "total" ? 700 : 400 }} title={rs2(r[k] as number)}>{rs(r[k] as number)}</td>)}
              </tr>
            );
          })}
          <tr style={{ borderTop: `1px solid ${INK}`, background: "#F7F4EC" }}>
            <td className="px-2.5 py-2 text-[11.5px] font-bold text-left" style={{ color: INK }} colSpan={2}>Grand total</td>
            {grand.map((v, i) => <td key={keys[i]} className={td} style={{ color: INK, fontWeight: 700 }} title={rs2(v)}>{rs(v)}</td>)}
          </tr>
        </tbody>
      </table>
      <p className="text-[11px] mt-2" style={{ color: SUB }}>Drug spend only (onco + non-onco), every payer. Whole rupees; hover a cell for paise. {num(sorted.length)} rows.</p>
    </div>
  );
}
