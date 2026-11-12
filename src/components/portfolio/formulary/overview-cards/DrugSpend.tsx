"use client";
// Drug spend on the Overview, three panels and the drawers behind them:
//   Drug spend by group — the groups as bars from zero on one scale, in lakhs, each with the
//     month before ticked: formulary, out of formulary, non formulary (hatched: outside the
//     ratio) and any spend the Item Master does not class; then, within formulary, the
//     restricted and preferred brands billed to scheme patients and the restricted brands billed
//     to cash & TPA, each with its share of the drug spend of all payers. A group opens what it
//     is, month by month (FigureDrawer); a scheme row the scheme drawer.
//   By month — formulary and out-of-formulary spend as bars from zero with the compliance % on
//     its own axis, as HCG's "Actual vs Budget" charts do.
//   By Item Master class — every class as a bar from zero in its group's colour, the largest
//     that fit and "+N more".
// All three open one drawer (DrugSpendDrawer): the exact figures, every month, every class and
// the method. On the quantity view every panel counts units sold instead of rupees (s.m), and no
// budget line is drawn.
import React, { useState } from "react";
import { MonthCombo } from "@/components/portfolio/ledger/charts";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { LegendItem } from "@/components/portfolio/ledger/legend";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import type { GoodWhen } from "@/components/portfolio/ledger/status";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures } from "@/components/portfolio/ledger/DetailDrawer";
import { useArmed, INK, SUB, RULE, TRACK, EASE } from "@/components/portfolio/ledger/kit";
import { isNum, pct, withSign } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { F_COL, OOF_COL, NF_COL, X_COL, GROUP_COL, GROUP_LABEL, LinkButton, Swatch, RATE_COL } from "../parts";
import { HowBuilt, MethodText, MonthTable, filterChips, shareOfRatio, wholeSpend, type OverviewScope } from "./shared";
import { SCHEME_COL, SchemeDrawer, blocksOf } from "./SchemeCard";
import { changeOf, type Measure } from "../measure";
import { effectiveMethod, inRatioOf, monthLabel, type TrendRow, type View } from "../api";

const IN_GROUPS = new Set(["A", "B", "C"]);

/** Drug spend in classes the month's Item Master does not list (group X). It is in all drug
 *  spend but in none of the three groups, so the panel names it for the groups to add up. */
function notInMaster(s: OverviewScope): number {
  return (s.d.by_class || []).filter((c) => !IN_GROUPS.has(c.formulary_group)).reduce((t, c) => t + c.cost, 0);
}

/** The three groups of drug spend, by their headline field. */
export type SpendGroup = "formulary" | "out_of_formulary" | "non_formulary";

const GROUPS: Record<SpendGroup, {
  label: string; color: string; hatched?: boolean;
  /** Which way a change is good: only out-of-formulary spend has a direction HCG wants. */
  goodWhen: GoodWhen;
  /** What the group is, in the words of the measure on screen. */
  what: (m: Measure) => string;
  links: { view: View; label: string }[];
}> = {
  formulary: {
    label: "Formulary", color: F_COL, goodWhen: "neutral",
    what: (m) => `${m.units ? "Units sold of" : "Drug spend on"} items whose Item Master class is in group A: formulary, including the restricted, preferred and scheme classes. It is the top of the compliance ratio.`,
    links: [{ view: "items", label: "Items tab · Formulary" }],
  },
  out_of_formulary: {
    label: "Out of formulary", color: OOF_COL, goodWhen: "down",
    what: (m) => `${m.units ? "Units sold of" : "Drug spend on"} group B items, approved out of formulary. It is the only other term in the compliance ratio, so every ${m.units ? "unit" : "rupee"} here lowers the %.`,
    links: [{ view: "items", label: "Out-of-formulary items" }, { view: "doctors", label: "Out of formulary by doctor" }],
  },
  non_formulary: {
    label: "Non formulary", color: NF_COL, hatched: true, goodWhen: "neutral",
    what: (m) => m.units
      ? "Units sold of group C items, non formulary. They sit outside HCG's ratio, so they never move the compliance %."
      : "Drug spend on group C items, non formulary. It is real money but sits outside HCG's ratio, so it never moves the compliance %.",
    links: [{ view: "items", label: "Items tab · Non formulary" }],
  },
};
const GROUP_KEYS = Object.keys(GROUPS) as SpendGroup[];

/** The caption over the scheme rows: they are classes inside formulary spend, so they are not
 *  added to the groups above them, and their % is of the drug spend (or units) of every payer. */
const within = (m: Measure) => `Within formulary · % of drug ${m.noun}`;

// ─────────────────────────────────────────────────────────────────────────────
// Drug spend by group
// ─────────────────────────────────────────────────────────────────────────────
export function DrugSpendTile({ s, place }: { s: OverviewScope; place: Place }) {
  const spend = useDrawer();
  const figure = useDrawer();
  const scheme = useDrawer();
  // Which group the figure drawer shows; kept while it slides out so its content does not change.
  const [group, setGroup] = useState<SpendGroup>("formulary");
  const h = s.d.headline;
  const { m, prev } = s;
  const other = notInMaster(s);
  const showGroup = (g: SpendGroup) => { setGroup(g); figure.show("summary"); };

  const rows: RankRow[] = [
    ...GROUP_KEYS.map((g): RankRow => ({
      key: g, label: GROUPS[g].label, value: h[g], valueLabel: m.short(h[g]), color: GROUPS[g].color, hatched: GROUPS[g].hatched,
      aside: g === "non_formulary" ? "outside the ratio" : undefined,
      tick: prev ? prev.row[g] : null, tickLabel: prev ? `${prev.label} ${m.short(prev.row[g])}` : undefined,
      group: "", onClick: () => showGroup(g),
    })),
    ...(other > 0 ? [{
      key: "x", label: GROUP_LABEL.X, value: other, valueLabel: m.short(other), color: X_COL, aside: "not in any group",
      group: "", onClick: () => spend.show("class"),
    }] : []),
    ...(s.d.scheme ? blocksOf(s.d.scheme).map((k): RankRow => ({
      key: k.key, label: k.label, sub: k.payer, value: k.b.cost, valueLabel: `${m.short(k.b.cost)} · ${pct(k.b.share_pct, 1)}`,
      color: SCHEME_COL, group: within(m), onClick: () => scheme.show("summary"),
    })) : []),
  ];
  const legend: LegendItem[] | undefined = prev ? [{ key: "prior", label: prev.label, color: INK, shape: "tick" }] : undefined;
  const label = [
    `Drug ${m.noun} by group, ${s.context}`,
    ...rows.map((r) => `${r.label} ${r.valueLabel}${r.aside ? `, ${r.aside}` : ""}`),
    `All drug ${m.noun} ${m.short(h.total)}`,
  ].join(". ");

  return (
    <>
      <ChartPanel id="drug-spend" title={`Where the drug ${m.noun} went`} context={`${s.context} · ${m.short(h.total)}${m.units ? " units" : ""} in all`} accent={F_COL}
        place={place} legend={legend} label={label} interactive onOpen={() => spend.show("summary")} onInfo={() => spend.show("method")}>
        <RankBars ariaLabel={`Drug ${m.noun} by group, ${s.context}`} rows={rows} format={m.short} color={F_COL} onMore={() => spend.show("summary")} />
      </ChartPanel>
      <DrugSpendDrawer s={s} open={spend.open} first={spend.tab} onClose={spend.close} />
      <FigureDrawer s={s} group={group} open={figure.open} first={figure.tab} onClose={figure.close} />
      <SchemeDrawer s={s} open={scheme.open} first={scheme.tab} onClose={scheme.close} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// By month
// ─────────────────────────────────────────────────────────────────────────────
/** A trend panel shows a year at most, ending at the selected month (MonthCombo's window). */
const TREND_MONTHS = 12;

export function MonthTrendTile({ s, place }: { s: OverviewScope; place: Place }) {
  const dr = useDrawer();
  const { m } = s;
  const trend = [...(s.d.trend || [])].sort((a, b) => a.period.localeCompare(b.period));
  const sel = new Set(s.d.scope?.months || []);
  // One dashed budget line, only when every month carries the same budget and the figure is
  // the one it was set for (never on units); a budget that changes between years is listed in
  // the drawer.
  const budgets = Array.from(new Set(s.months.map((c) => c.budget).filter(isNum)));
  const target = m.budgetJudged && wholeSpend(s.filters) && budgets.length === 1 ? budgets[0] : null;
  const months = trend.map((r) => {
    // A published month with nothing here has no bars, rather than bars of zero.
    const none = r.compliance_pct == null && !r.formulary && !r.out_of_formulary;
    return {
      key: r.period, label: r.label || monthLabel(s.meta, r.period), pct: r.compliance_pct, selected: sel.has(r.period),
      values: none ? { f: null, oof: null } : { f: r.formulary, oof: r.out_of_formulary },
    };
  });
  // Past a year the panel shows the year ending at the selected month, and says so.
  const last = months.filter((c) => c.selected).pop() ?? months[months.length - 1];
  const span = trend.length > TREND_MONTHS && last ? `the ${TREND_MONTHS} months to ${last.label}` : "every month";
  const what = `Formulary and out-of-formulary ${m.noun} by month with compliance %`;
  const label = `${what}, ${s.where}: `
    + months.map((c) => `${c.label} ${pct(c.pct)}`).join(", ") + (target != null ? `. Budget ${target}%` : m.units ? ". No budget on quantity" : "");

  return (
    <>
      <ChartPanel id="trend" title={`Formulary vs out-of-formulary ${m.noun} by month`} context={`${s.where} · ${span}`} accent={F_COL}
        place={place} label={label} onOpen={() => dr.show("month")} onInfo={() => dr.show("method")}>
        <MonthCombo ariaLabel={`${what}, ${s.where}`} format={m.short}
          series={[{ key: "f", label: m.units ? "Formulary units" : "Formulary", color: F_COL }, { key: "oof", label: m.units ? "Out of formulary units" : "Out of formulary", color: OOF_COL }]}
          line={{ label: m.units ? "Compliance % on quantity" : "Compliance %", color: RATE_COL, decimals: 2 }} window={TREND_MONTHS}
          target={target != null ? { value: target, label: `budget ${target}%`, axis: "line" } : null}
          months={months} />
      </ChartPanel>
      <DrugSpendDrawer s={s} open={dr.open} first={dr.tab} onClose={dr.close} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// By Item Master class
// ─────────────────────────────────────────────────────────────────────────────
const GROUP_ORDER = ["A", "B", "C", "X"];

export function ClassesTile({ s, place }: { s: OverviewScope; place: Place }) {
  const dr = useDrawer();
  const { m } = s;
  // `cost` holds each class's amount on the basis: units sold on the quantity view.
  const classes = [...(s.d.by_class || [])].sort((a, b) => b.cost - a.cost);
  const groupOf = (g: string) => (GROUP_COL[g] ? g : "X");
  const rows: RankRow[] = classes.map((c) => ({
    key: c.formulary_class, label: c.formulary_class, value: c.cost, valueLabel: `${m.short(c.cost)} · ${pct(c.share_pct, 1)}`,
    color: GROUP_COL[groupOf(c.formulary_group)], hatched: c.formulary_group === "C",
  }));
  // The colour is the class's group, which the bars do not print: the legend names it.
  const present = new Set(classes.map((c) => groupOf(c.formulary_group)));
  const legend: LegendItem[] = GROUP_ORDER.filter((g) => present.has(g))
    .map((g) => ({ key: g, label: GROUP_LABEL[g], color: GROUP_COL[g], hatched: g === "C" }));
  const label = [
    `Drug ${m.noun} by Item Master class, ${s.context}, largest first`,
    ...rows.map((r, i) => `${r.label} (${GROUP_LABEL[groupOf(classes[i].formulary_group)]}) ${r.valueLabel} of drug ${m.noun}`),
  ].join(". ");

  return (
    <>
      <ChartPanel id="classes" title={`Drug ${m.noun} by drug class`} context={`${s.context} · ${classes.length} classes`} accent={F_COL}
        place={place} legend={legend} label={label} onOpen={() => dr.show("class")} onInfo={() => dr.show("method")}>
        <RankBars ariaLabel={`Drug ${m.noun} by Item Master class, ${s.context}`} rows={rows} format={m.short} color={F_COL} />
      </ChartPanel>
      <DrugSpendDrawer s={s} open={dr.open} first={dr.tab} onClose={dr.close} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawers
// ─────────────────────────────────────────────────────────────────────────────
/** One group's spend: what it is, the exact amount against the month before, every month, and
 *  the tabs that list what is behind it. */
export function FigureDrawer({ s, group, open, first, onClose }: { s: OverviewScope; group: SpendGroup; open: boolean; first?: string; onClose: () => void }) {
  const g = GROUPS[group];
  const { m } = s;
  const h = s.d.headline;
  const v = h[group];
  const prev = s.prev;
  const pv = prev?.row[group];
  const delta = prev ? changeOf(m, v, pv, g.goodWhen, `vs ${prev.label}`) : undefined;
  const go = (view: View) => { onClose(); s.onOpen(view); };

  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={first}
      eyebrow={`Drug ${m.noun} · Overview`} title={`${g.label}${m.units ? " quantity" : ""} · ${s.where}`}
      kpi={{ value: m.exact(v), comparator: prev && isNum(pv) ? `${prev.label}: ${m.exact(pv)}` : `of ${m.exact(h.total)} drug ${m.noun}`, delta }}
      source="computed" asOf={s.asOf} filters={filterChips(s, { method: false })}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title={`What ${g.label.toLowerCase()} ${m.noun} is`}>
                <p className="text-[13.5px] leading-relaxed" style={{ color: INK }}>{g.what(m)}</p>
              </DrawerSection>
              <DrawerSection title="Key figures" note={m.source}>
                <KeyFigures figures={[
                  { label: g.label, value: m.exact(v), color: g.color, hatched: g.hatched, note: s.when },
                  ...(prev && isNum(pv) ? [
                    { label: prev.label, value: m.exact(pv), note: "the month before" },
                    { label: "Change", value: withSign(v - pv, m.exact), note: `vs ${prev.label}` },
                  ] : []),
                  { label: `All drug ${m.noun}`, value: m.exact(h.total), note: "formulary + out of formulary + non formulary" },
                ]} />
              </DrawerSection>
              <DrawerSection title="What is behind it">
                <div className="flex flex-wrap gap-2">
                  {g.links.map((l) => <LinkButton key={l.label} onClick={() => go(l.view)}>{l.label}</LinkButton>)}
                </div>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "month", label: "By month", render: () => (
            <MonthTable s={s} caption={`${g.label} ${m.noun} by month, ${s.where}`} columns={[
              { key: "value", label: g.label, value: (r) => m.exact(r[group]), strong: true, raw: (r) => r[group], unit: m.unit },
              { key: "change", label: "Change", value: (r, before) => (before ? withSign(r[group] - before[group], m.exact) : "—"), raw: (r, before) => (before ? r[group] - before[group] : null), unit: m.unit },
              { key: "all", label: `All drug ${m.noun}`, value: (r) => m.exact(r.total), raw: (r) => r.total, unit: m.unit },
            ]} />
          ),
        },
        { key: "method", label: "Method", render: () => <HowBuilt s={s} /> },
      ]} />
  );
}

export function DrugSpendDrawer({ s, open, first, onClose }: { s: OverviewScope; open: boolean; first?: string; onClose: () => void }) {
  const h = s.d.headline;
  const { m } = s;
  const other = notInMaster(s);
  const go = (v: View) => { onClose(); s.onOpen(v); };
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={first} size="wide"
      eyebrow={`Drug ${m.noun} · Overview`} title={`Drug ${m.noun} · ${s.where}`}
      kpi={{ value: m.exact(h.total), comparator: `all drug ${m.noun} · ${m.exact(inRatioOf(h))} in the ratio` }}
      source="computed" asOf={s.asOf} filters={filterChips(s)}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title="How it adds up" note={`${m.source} · ${num(h.lines)} drug lines in scope`}>
                <KeyFigures figures={[
                  { label: "Formulary", value: m.exact(h.formulary), color: F_COL, note: "group A, the top of the ratio" },
                  { label: "Out of formulary", value: m.exact(h.out_of_formulary), color: OOF_COL, note: "group B, the only other term in the ratio" },
                  { label: "In the ratio", value: m.exact(inRatioOf(h)), note: `formulary + out of formulary; ${shareOfRatio(s)}` },
                  { label: "Non formulary", value: m.exact(h.non_formulary), color: NF_COL, hatched: true, note: "group C, outside the ratio" },
                  ...(other > 0 ? [{ label: GROUP_LABEL.X, value: m.exact(other), color: X_COL, note: "classes the month's Item Master does not list" }] : []),
                  { label: `All drug ${m.noun}`, value: m.exact(h.total), note: `every drug line; consumables are not drug ${m.noun}` },
                ]} />
              </DrawerSection>
              <DrawerSection title="What is behind it">
                <div className="flex flex-wrap gap-2">
                  <LinkButton onClick={() => go("items")}>Items</LinkButton>
                  <LinkButton onClick={() => go("doctors")}>Doctors</LinkButton>
                </div>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "month", label: "By month", render: () => (
            <MonthTable s={s} caption={`Drug ${m.noun} and compliance by month, ${s.where}`} columns={[
              { key: "f", label: "Formulary", value: (r) => m.exact(r.formulary), raw: (r) => r.formulary, unit: m.unit },
              { key: "ratio", label: "Total in the ratio", value: (r) => m.exact(inRatioOf(r)), raw: (r) => inRatioOf(r), unit: m.unit },
              { key: "oof", label: "Out of formulary", value: (r) => m.exact(r.out_of_formulary), raw: (r) => r.out_of_formulary, unit: m.unit },
              { key: "pct", label: "Compliance", value: (r) => pct(r.compliance_pct), strong: true, raw: (r) => r.compliance_pct, unit: "%" },
              // No budget column on quantity: the budget is a drug-cost target.
              ...(m.budgetJudged ? [{ key: "budget", label: "Budget", value: (r: TrendRow) => (isNum(r.budget_pct) ? `${r.budget_pct}%` : "—"), raw: (r: TrendRow) => r.budget_pct, unit: "%" as const }] : []),
              { key: "nf", label: "Non formulary", value: (r) => m.exact(r.non_formulary), raw: (r) => r.non_formulary, unit: m.unit },
            ]} />
          ),
        },
        { key: "class", label: "By Item Master class", render: () => <Classes s={s} /> },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Every drug line is put in a group by its class in that month&apos;s Item Master: group A is formulary, group B is out of formulary, group C is non formulary.</p>
                <p>Compliance % = Formulary ÷ (Formulary + Out of formulary){effectiveMethod(s.filters) === "mean"
                  ? <>, taken for onco and for non-onco and averaged under the mean method; the pooled % is the one ratio of the two amounts</> : null}{m.units ? <>, here on units sold</> : null}. {m.units
                  ? <>Non formulary units are outside HCG&apos;s ratio; consumables are not drugs at all.</>
                  : <>Non formulary spend is real money but outside HCG&apos;s ratio; consumables are not drug spend at all.</>}</p>
                <p>The month chart stacks both amounts into one bar per month, from zero; the line joins the bar tops and each point is labelled with that month's compliance %, fitted to the months shown and labelled. {m.budgetJudged
                  ? <>The dashed budget line is drawn only when one budget covers every month shown and the figure is the one it was set for (all patients, all payers, pooled); otherwise each month&apos;s budget is in the By month table.</>
                  : <>No budget line on quantity: HCG&apos;s budget is a drug-cost target, so a quantity figure is never set against it.</>}</p>
                <p>The class chart draws each class&apos;s {m.noun} as a bar from zero on one scale, coloured by its group; the classes that do not fit are listed under By Item Master class.</p>
                {m.units && <p>Quantity adds tablets, vials and bottles together (the sales files keep no unit of measure), so these amounts compare like with like only within one item.</p>}
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}

/** Drug spend by Item Master class, largest first, each class coloured by its group. */
function Classes({ s }: { s: OverviewScope }) {
  const on = useArmed();
  const { m } = s;
  const rows = [...(s.d.by_class || [])].sort((a, b) => b.cost - a.cost);
  const max = Math.max(1, ...rows.map((r) => r.cost));
  const total = s.d.headline?.total;
  const lines = rows.reduce((t, r) => t + (Number(r.lines) || 0), 0);
  const grid = "minmax(0,1.3fr) minmax(0,1fr) 150px 64px";
  return (
    <DrawerSection title={`Drug ${m.noun} by Item Master class`}
      note={`Classes in group A count as formulary; group B is out of formulary; group C (non formulary) is outside the ratio. Each share is of ${m.exact(total)} drug ${m.noun}.`}>
      {!rows.length ? <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p> : (
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const col = GROUP_COL[r.formulary_group] ?? GROUP_COL.X;
            const hatched = r.formulary_group === "C";
            return (
              <div key={r.formulary_class} className="grid items-center gap-3" style={{ gridTemplateColumns: grid }}
                title={`${r.formulary_class} — ${GROUP_LABEL[r.formulary_group] ?? r.formulary_group} · ${num(r.lines)} lines`}>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Swatch color={col} hatched={hatched} />
                  <span className="text-[12px] truncate" style={{ color: INK }}>{r.formulary_class}</span>
                </span>
                <span className="relative h-[6px] rounded-full overflow-hidden" style={{ background: TRACK }}>
                  <span className="absolute left-0 top-0 bottom-0 rounded-full"
                    style={{ width: on ? `${(r.cost / max) * 100}%` : "0%", background: col, opacity: hatched ? 0.6 : 1, transition: `width 600ms ${EASE} ${100 + i * 30}ms` }} />
                </span>
                <span className="text-[12px] font-semibold tabular-nums text-right whitespace-nowrap" style={{ color: INK }}>{m.exact(r.cost)}</span>
                <span className="text-[11.5px] tabular-nums text-right" style={{ color: SUB }}>{pct(r.share_pct)}</span>
              </div>
            );
          })}
          <div className="grid items-center gap-3 pt-2 mt-1" style={{ gridTemplateColumns: grid, borderTop: `1px solid ${RULE}` }}>
            <span className="text-[12px] font-semibold" style={{ color: INK }}>{rows.length} classes · {num(lines)} lines</span>
            <span />
            <span className="text-[12px] font-bold tabular-nums text-right whitespace-nowrap" style={{ color: INK }}>{m.exact(total)}</span>
            <span />
          </div>
          <p className="text-[10.5px] mt-1" style={{ color: SUB }}>bar = the class&apos;s {m.noun} against the largest class, from zero</p>
        </div>
      )}
    </DrawerSection>
  );
}
