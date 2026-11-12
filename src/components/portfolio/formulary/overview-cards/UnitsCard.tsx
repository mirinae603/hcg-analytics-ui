"use client";
// Where a hospital stands among HCG's units, two ways, and the drawer both open (every unit
// with its budget, status and exact amounts, and every unit's mix):
//   PositionTile — one unit selected: every unit is a dot on one fitted axis (the OpenPrescribing
//                  pattern), the selected unit large and labelled with its % and rank, its
//                  budget ticked, and the network figure a dashed line when the API sends it.
//   UnitRankTile — all hospitals (what replaced the PAN units tab): one bullet row per unit,
//                  lowest compliance first, the unit's dot coloured by its status against its own
//                  budget from HCG's PAN MIS and that budget marked on the row. Under it, the way
//                  to "Mix by unit".
//   Mix by unit  — a drawer tab: each unit's drug consumption as one 100% bar, formulary / out of
//                  formulary / non formulary. Unlike the compliance ratio, non
//                  formulary is inside these bars, and no budget is ticked on them: the budget is
//                  set for the ratio, not for these shares.
// The axis is fitted (the units sit between ~77% and 100%), so a unit is a dot, never a bar.
// Clicking a unit selects it for the whole app; the selected unit goes back to all hospitals.
// On the quantity view every figure counts units sold, and no unit is judged against a budget.
import React from "react";
import { TbArrowRight } from "react-icons/tb";
import { useSelectHospital } from "@/context/RegionContext";
import { BulletRows, DotStrip, type BulletRow, type Dot } from "@/components/portfolio/ledger/bullets";
import { StackBars, type StackRow, type StackSegment } from "@/components/portfolio/ledger/charts";
import { ChartPanel, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { StatusChip } from "@/components/portfolio/ledger/KpiCard";
import DetailDrawer, { DrawerSection, useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { STATUS_LABEL, WITHIN_PTS, classify, type Status } from "@/components/portfolio/ledger/status";
import { INK, SUB, LINE, RULE, SEL_BG, RowStyles } from "@/components/portfolio/ledger/kit";
import { isNum, pct, pts, withSign } from "@/components/portfolio/ledger/format";
import { fitDomain } from "@/components/portfolio/ledger/scale";
import { F_COL, OOF_COL, NF_COL, FORMULARY_PAGE } from "../parts";
import { DownloadCsv, type CsvColumn } from "@/components/portfolio/table/DownloadCsv";
import { positionSummary } from "../summaries";
import type { Measure } from "../measure";
import { HowBuilt, MethodText, filterChips, wholeSpend, type OverviewScope } from "./shared";
import { effectiveMethod, inRatioOf, type Overview as OverviewData } from "../api";

type Unit = OverviewData["by_hospital"][number];

/** The height of the "Mix by unit" line under the ranking: the stacked page adds it to the
 *  panel's least height so no unit row gives way to it. */
export const MIX_LINK_H = 22;

/** What both panels read from the unit list: each unit's status (budgets are set for a unit's
 *  whole drug spend, pooled, in rupees, so under a narrower filter or on units no unit is judged
 *  and no budget is drawn), the selected unit, the position summary, and how to select a unit. */
function useUnits(s: OverviewScope) {
  const selectHospital = useSelectHospital();
  const units = s.d.by_hospital || [];
  const judging = s.m.budgetJudged && wholeSpend(s.filters);
  const statusOf = (u: Unit): Status => (judging ? classify(u.compliance_pct, u.budget_pct) : "none");
  const judged = units.filter((u) => statusOf(u) !== "none");
  const ranked = units.filter((u) => u.rank != null).length;
  const me = units.find((u) => u.selected) ?? null;
  const summary = positionSummary({
    where: s.network ? null : s.where,
    rank: me?.rank ?? null,
    ranked,
    judged: judged.length,
    met: judged.filter((u) => statusOf(u) === "met").length,
    noun: s.m.noun,
  });
  // Under the mean method a unit's % (and so the order) averages its onco and non-onco ratios.
  const mean = effectiveMethod(s.filters) === "mean";
  return { units, judging, statusOf, ranked, me, summary, mean, select: (u: Unit) => selectHospital(u) };
}

const nameOf = (u: Unit) => u.his_name || u.name;

export function PositionTile({ s, place }: { s: OverviewScope; place: Place }) {
  const dr = useDrawer();
  const { units, judging, statusOf, ranked, me, summary, mean, select } = useUnits(s);
  const dots: Dot[] = units.map((u) => ({
    key: u.plant, label: nameOf(u), value: u.compliance_pct, selected: u.selected, status: statusOf(u), onClick: () => select(u),
  }));
  const network = s.d.network?.compliance_pct;
  const budget = judging && me && isNum(me.budget_pct) ? me.budget_pct : null;
  const domain = fitDomain([...units.map((u) => u.compliance_pct), network, budget].filter(isNum), { cap: 100 });
  const caption = me?.rank != null ? `${me.rank} of ${ranked}, lowest ${mean ? "mean " : ""}first` : "not ranked";
  const title = s.m.units ? "How this hospital compares on quantity" : "How this hospital compares";

  return (
    <>
      <ChartPanel id="position" title={title} context={`${s.when} · every hospital${s.m.units ? " · no budget on quantity" : ""}`} accent={F_COL} place={place}
        label={`Position among units${s.m.units ? ", on quantity" : ""}, ${s.when}: ${summary}`} interactive onOpen={() => dr.show("units")} onInfo={() => dr.show("method")}>
        <DotStrip ariaLabel={`Compliance of every unit${s.m.units ? " on quantity" : ""}, ${s.when}`} dots={dots} domain={domain} format={(v) => pct(v)} caption={caption}
          reference={isNum(network) ? { value: network, label: "All units" } : null}
          target={budget != null ? { value: budget, label: "Budget" } : null} />
      </ChartPanel>
      <UnitsDrawer s={s} title={title} open={dr.open} first={dr.tab} onClose={dr.close} />
    </>
  );
}

export function UnitRankTile({ s, place }: { s: OverviewScope; place: Place }) {
  const dr = useDrawer();
  const { units, judging, statusOf, summary, mean, select } = useUnits(s);
  const rows: BulletRow[] = units.map((u) => ({
    key: u.plant, label: nameOf(u), value: u.compliance_pct, valueLabel: pct(u.compliance_pct),
    target: judging ? u.budget_pct : null, status: statusOf(u), selected: u.selected, onClick: () => select(u),
  }));
  // One axis for every unit and every budget; each row is judged against its own budget, so no
  // single set of status bands is drawn behind them.
  const [min, max] = fitDomain(rows.flatMap((r) => [r.value, r.target]).filter(isNum), { cap: 100 });
  const title = s.m.units ? "Each hospital's compliance on quantity" : "Each hospital's compliance vs its target";
  const order = `lowest ${mean ? "mean " : ""}first`;

  return (
    <>
      <ChartPanel id="units" title={title} context={`${s.when} · ${order}${s.m.units ? " · no budget on quantity" : ""}`} accent={F_COL} place={place}
        label={`${title}, ${s.when}: ${summary}`} interactive onOpen={() => dr.show("units")} onInfo={() => dr.show("method")}>
        <div className="flex flex-col h-full">
          <PanelPart>
            <BulletRows ariaLabel={`${title}, ${s.when}, lowest ${mean ? "mean " : ""}compliance first`} rows={rows}
              scale={{ kind: "pct", min, max }} onMore={() => dr.show("units")} empty={`No unit has drug ${s.m.noun} in this selection.`} />
          </PanelPart>
          {units.length > 0 && (
            <div className="flex-shrink-0 flex justify-end" style={{ height: MIX_LINK_H, paddingTop: 4 }}>
              <button type="button" onClick={() => dr.show("mix")} aria-haspopup="dialog"
                aria-label={`Mix by unit: each hospital's formulary, out-of-formulary and non formulary share of its drug ${s.m.noun}`}
                className="hcg-row inline-flex items-center gap-1 rounded px-1.5 text-[11.5px] font-semibold" style={{ color: INK }}>
                Mix by unit<TbArrowRight size={12} aria-hidden="true" />
              </button>
              <RowStyles />
            </div>
          )}
        </div>
      </ChartPanel>
      <UnitsDrawer s={s} title={title} open={dr.open} first={dr.tab} onClose={dr.close} />
    </>
  );
}

export function UnitsDrawer({ s, title, open, first, onClose }: { s: OverviewScope; title: string; open: boolean; first?: string; onClose: () => void }) {
  const { units, statusOf, summary, mean } = useUnits(s);
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={first} size="wide"
      eyebrow="Formulary compliance · Overview" title={`${title} · ${s.when}`}
      source="computed" asOf={s.asOf} filters={filterChips(s, { hospital: false })}
      tabs={[
        { key: "units", label: "Every unit", render: () => <UnitTable units={units} statusOf={statusOf} summary={summary} mean={mean} m={s.m} when={s.when} /> },
        { key: "mix", label: "Mix by unit", render: () => <UnitMix s={s} units={units} /> },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Every unit for the same months, patient type, material type and payer, whatever the hospital selector says, lowest compliance first. A unit with no formulary or out-of-formulary {s.m.noun} has no ratio and is listed last, unranked.</p>
                <p>Each unit is a dot on one axis fitted to every unit&apos;s figure, which does not start at zero{s.m.budgetJudged ? <>; the black marker is the unit&apos;s own budget from HCG&apos;s PAN MIS</> : null}{mean
                  ? <>. Under the mean method each figure, and the order, are the mean of the unit&apos;s onco and non-onco ratios</> : null}. With one unit selected, the dashed line is all units together, a ratio of their sums, when the API sends it.</p>
                <p>{s.m.budgetJudged
                  ? <>Status compares the whole percentage HCG&apos;s MIS would print with the unit&apos;s budget: met at or above it, within {WITHIN_PTS} pts up to {WITHIN_PTS} points below, otherwise more than {WITHIN_PTS} pts below. Budgets are set for a unit&apos;s whole drug spend, pooled, so no unit is judged under a patient-type, payer, material or mean filter.</>
                  : <>No budget on quantity: HCG sets each unit&apos;s budget on drug cost, so on quantity no budget is marked and no unit is judged. Switch the header to Value for HCG&apos;s budgets.</>}</p>
                <p>Mix by unit: each unit&apos;s drug consumption (formulary + out of formulary + non formulary{s.m.units ? ", in units sold" : ", at cost"}) as one bar of 100%, with each part&apos;s share of it, lowest formulary share first. These shares follow the same filters as the ranking. Non formulary is inside them, unlike the compliance ratio, and no budget is ticked on them: HCG&apos;s budget is set for the ratio, not for these shares.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}

function UnitTable({ units, statusOf, summary, mean, m, when }: {
  units: Unit[]; statusOf: (u: Unit) => Status; summary: string;
  /** The compliance column is the mean of each unit's onco and non-onco ratios. */
  mean: boolean;
  m: Measure;
  /** "Aug-26": the months the table is of, for its download's name. */
  when: string;
}) {
  if (!units.length) return <p className="text-[12px]" style={{ color: SUB }}>No unit has drug {m.noun} in this selection.</p>;
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap";
  const td = "px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap";
  // On units there is no budget at all, so its three columns go; under a narrowing filter they
  // stay, showing each budget with no status, as before.
  const budgetCols = m.budgetJudged;
  const u = m.units ? " units sold" : "";
  const gap = (row: Unit) => (statusOf(row) !== "none" && isNum(row.compliance_pct) && isNum(row.budget_pct) ? row.compliance_pct - row.budget_pct : null);
  const csv: CsvColumn<Unit>[] = [
    { label: "#", value: (row) => row.rank ?? "", raw: (row) => row.rank },
    { label: "Unit", value: (row) => nameOf(row), text: true },
    { label: "Plant", value: (row) => row.plant, text: true },
    { label: mean ? "Mean %" : "Compliance", value: (row) => pct(row.compliance_pct), raw: (row) => row.compliance_pct, unit: "%" },
    ...(budgetCols ? [
      { label: "Budget", value: (row: Unit) => (isNum(row.budget_pct) ? `${row.budget_pct}%` : "—"), raw: (row: Unit) => row.budget_pct, unit: "%" as const },
      { label: "Status", value: (row: Unit) => { const st = statusOf(row); return st === "none" ? "" : STATUS_LABEL[st]; }, text: true },
      { label: "vs budget", value: (row: Unit) => { const g = gap(row); return isNum(g) ? withSign(g, pts) : "—"; }, raw: gap, unit: "pts" as const },
    ] : []),
    { label: `Formulary${u}`, value: (row) => m.exact(row.formulary), raw: (row) => row.formulary, unit: m.unit },
    { label: "In the ratio", value: (row) => m.exact(inRatioOf(row)), raw: (row) => inRatioOf(row), unit: m.unit },
    { label: `Out of formulary${u}`, value: (row) => m.exact(row.out_of_formulary), raw: (row) => row.out_of_formulary, unit: m.unit },
  ];
  return (
    <DrawerSection title={`Every unit, lowest ${mean ? "mean " : ""}compliance first`}
      note={m.units ? `${summary} Amounts are units sold. No budget on quantity.` : summary}>
      <DownloadCsv rows={units} columns={csv} page={FORMULARY_PAGE} caption={`Every unit's ${mean ? "mean " : ""}compliance${m.units ? " on quantity" : ""}, ${when}`} />
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
              {["#", "Unit"].map((h) => <th key={h} scope="col" className={`${th} text-left`} style={{ letterSpacing: ".08em" }}>{h}</th>)}
              {[mean ? "Mean %" : "Compliance", ...(budgetCols ? ["Budget", "Status", "vs budget"] : []), `Formulary${u}`, "In the ratio", `Out of formulary${u}`].map((h) => (
                <th key={h} scope="col" className={`${th} text-right`} style={{ letterSpacing: ".08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((row) => {
              const st = statusOf(row);
              return (
                <tr key={row.plant} style={{ borderBottom: `1px solid ${LINE}`, background: row.selected ? SEL_BG : undefined }}>
                  <td className="px-3 py-2 text-[11.5px] tabular-nums" style={{ color: SUB }}>{row.rank ?? "—"}</td>
                  <th scope="row" className="px-3 py-2 text-[12px] text-left" style={{ color: INK, fontWeight: row.selected ? 700 : 500 }}>{nameOf(row)}</th>
                  <td className={td} style={{ color: INK, fontWeight: 700 }}>{pct(row.compliance_pct)}</td>
                  {budgetCols && (
                    <>
                      <td className={td} style={{ color: SUB }}>{isNum(row.budget_pct) ? `${row.budget_pct}%` : "—"}</td>
                      <td className="px-3 py-2 text-right">{st === "none" ? <span className="text-[12px]" style={{ color: SUB }}>—</span> : <StatusChip status={st} />}</td>
                      <td className={td} style={{ color: INK }}>{isNum(gap(row)) ? withSign(gap(row) as number, pts) : "—"}</td>
                    </>
                  )}
                  <td className={td} style={{ color: INK }}>{m.exact(row.formulary)}</td>
                  <td className={td} style={{ color: INK }}>{m.exact(inRatioOf(row))}</td>
                  <td className={td} style={{ color: INK }}>{m.exact(row.out_of_formulary)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DrawerSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mix by unit
// ─────────────────────────────────────────────────────────────────────────────
const MIX_SEGMENTS: StackSegment[] = [
  { key: "f", label: "Formulary", color: F_COL },
  { key: "oof", label: "Out of formulary", color: OOF_COL },
  { key: "nf", label: "Non formulary", color: NF_COL, hatched: true },
];

/** A unit's drug consumption, formulary + out of formulary + non formulary. The API sends it; an
 *  API from before the unit split does not, and then the three are added here (a sum, not a
 *  ratio: every share below is the server's). */
const totalOf = (u: Unit) => u.total ?? (Number(u.formulary) || 0) + (Number(u.out_of_formulary) || 0) + (Number(u.non_formulary) || 0);

/** Lowest formulary share first, as the ranking is lowest compliance first; a unit with nothing in
 *  its consumption (no shares) last; ties by name, so the order never shuffles. */
function byFormularyShare(a: Unit, b: Unit): number {
  const x = a.formulary_share_pct, y = b.formulary_share_pct;
  if (isNum(x) !== isNum(y)) return isNum(x) ? -1 : 1;
  return (isNum(x) && isNum(y) ? x - y : 0) || nameOf(a).localeCompare(nameOf(b));
}

/** Each unit's formulary, out-of-formulary and non formulary share of its drug consumption, as
 *  one 100% bar per unit (the kit's StackBars), the shares the server's own. */
function UnitMix({ s, units }: { s: OverviewScope; units: Unit[] }) {
  const { m } = s;
  const sorted = [...units].sort(byFormularyShare);
  if (!sorted.length) return <p className="text-[12px]" style={{ color: SUB }}>No unit has drug {m.noun} in this selection.</p>;
  const rows: StackRow[] = sorted.map((u) => ({
    key: u.plant, label: nameOf(u), selected: u.selected, aside: m.short(totalOf(u)),
    values: { f: u.formulary, oof: u.out_of_formulary, nf: u.non_formulary },
  }));

  return (
    <DrawerSection title={`Each unit's drug ${m.noun}, split three ways`}
      note={`One bar per unit: formulary, out of formulary and non formulary as parts of the unit's total${m.units ? " units sold" : " drug spend at cost"}, adding to 100%. The figure after each bar is that total. Same months, patients, material and payer as the page; every hospital whatever the selector says. Lowest formulary share first. No budget is ticked on these shares: HCG's budget is set for the compliance ratio, Formulary ÷ (Formulary + Out of formulary).`}>
      <StackBars ariaLabel={`Formulary, out-of-formulary and non formulary share of each unit's drug ${m.noun}, ${s.when}`}
        segments={MIX_SEGMENTS} rows={rows} format={m.short} asideWidth={84} maxHeight={rows.length * 30 + 24}
        empty={`No unit has drug ${m.noun} in this selection.`} />
    </DrawerSection>
  );
}
