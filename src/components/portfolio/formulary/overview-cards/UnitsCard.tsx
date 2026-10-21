"use client";
// Where a hospital stands among HCG's units, two ways, and the drawer both open (every unit
// with its budget, status and exact amounts):
//   PositionTile — one unit selected: every unit is a dot on one fitted axis (the OpenPrescribing
//                  pattern), the selected unit large and labelled with its % and rank, its
//                  budget ticked, and the network figure a dashed line when the API sends it.
//   UnitRankTile — all hospitals (what replaced the PAN units tab): one bullet row per unit,
//                  lowest compliance first, the unit's dot coloured by its status against its own
//                  budget from HCG's PAN MIS and that budget marked on the row.
// The axis is fitted (the units sit between ~77% and 100%), so a unit is a dot, never a bar.
// Clicking a unit selects it for the whole app; the selected unit goes back to all hospitals.
import React from "react";
import { useSelectHospital } from "@/context/RegionContext";
import { BulletRows, DotStrip, type BulletRow, type Dot } from "@/components/portfolio/ledger/bullets";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { StatusChip } from "@/components/portfolio/ledger/KpiCard";
import DetailDrawer, { DrawerSection, useDrawer } from "@/components/portfolio/ledger/DetailDrawer";
import { WITHIN_PTS, classify, type Status } from "@/components/portfolio/ledger/status";
import { INK, SUB, LINE, RULE, SEL_BG } from "@/components/portfolio/ledger/kit";
import { isNum, pct, pts, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import { fitDomain } from "@/components/portfolio/ledger/scale";
import { F_COL } from "../parts";
import { positionSummary } from "../summaries";
import { HowBuilt, MethodText, filterChips, wholeSpend, type OverviewScope } from "./shared";
import { effectiveMethod, inRatioOf, type Overview as OverviewData } from "../api";

type Unit = OverviewData["by_hospital"][number];

/** What both panels read from the unit list: each unit's status (budgets are set for a unit's
 *  whole drug spend, pooled, so under a narrower filter no unit is judged and no budget is
 *  drawn), the selected unit, the position summary, and how to select a unit. */
function useUnits(s: OverviewScope) {
  const selectHospital = useSelectHospital();
  const units = s.d.by_hospital || [];
  const judging = wholeSpend(s.filters);
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

  return (
    <>
      <ChartPanel id="position" title="How this hospital compares" context={`${s.when} · every hospital`} accent={F_COL} place={place}
        label={`Position among units, ${s.when}: ${summary}`} interactive onOpen={() => dr.show("units")} onInfo={() => dr.show("method")}>
        <DotStrip ariaLabel={`Compliance of every unit, ${s.when}`} dots={dots} domain={domain} format={(v) => pct(v)} caption={caption}
          reference={isNum(network) ? { value: network, label: "All units" } : null}
          target={budget != null ? { value: budget, label: "Budget" } : null} />
      </ChartPanel>
      <UnitsDrawer s={s} title="How this hospital compares" open={dr.open} first={dr.tab} onClose={dr.close} />
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
  const title = "Each hospital's compliance vs its target";

  return (
    <>
      <ChartPanel id="units" title={title} context={`${s.when} · lowest ${mean ? "mean " : ""}first`} accent={F_COL} place={place}
        label={`${title}, ${s.when}: ${summary}`} interactive onOpen={() => dr.show("units")} onInfo={() => dr.show("method")}>
        <BulletRows ariaLabel={`${title}, ${s.when}, lowest ${mean ? "mean " : ""}compliance first`} rows={rows}
          scale={{ kind: "pct", min, max }} onMore={() => dr.show("units")} empty="No unit has drug spend in this selection." />
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
        { key: "units", label: "Every unit", render: () => <UnitTable units={units} statusOf={statusOf} summary={summary} mean={mean} /> },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Every unit for the same months, patient type, material type and payer, whatever the hospital selector says, lowest compliance first. A unit with no formulary or out-of-formulary spend has no ratio and is listed last, unranked.</p>
                <p>Each unit is a dot on one axis fitted to every unit&apos;s figure, which does not start at zero; the black marker is the unit&apos;s own budget from HCG&apos;s PAN MIS{mean
                  ? <>. Under the mean method each figure, and the order, are the mean of the unit&apos;s onco and non-onco ratios</> : null}. With one unit selected, the dashed line is all units together, a ratio of their sums, when the API sends it.</p>
                <p>Status compares the whole percentage HCG&apos;s MIS would print with the unit&apos;s budget: met at or above it, within {WITHIN_PTS} pts up to {WITHIN_PTS} points below, otherwise more than {WITHIN_PTS} pts below. Budgets are set for a unit&apos;s whole drug spend, pooled, so no unit is judged under a patient-type, payer, material or mean filter.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}

function UnitTable({ units, statusOf, summary, mean }: {
  units: Unit[]; statusOf: (u: Unit) => Status; summary: string;
  /** The compliance column is the mean of each unit's onco and non-onco ratios. */
  mean: boolean;
}) {
  if (!units.length) return <p className="text-[12px]" style={{ color: SUB }}>No unit has drug spend in this selection.</p>;
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap";
  const td = "px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap";
  return (
    <DrawerSection title={`Every unit, lowest ${mean ? "mean " : ""}compliance first`} note={summary}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
              {["#", "Unit"].map((h) => <th key={h} scope="col" className={`${th} text-left`} style={{ letterSpacing: ".08em" }}>{h}</th>)}
              {[mean ? "Mean %" : "Compliance", "Budget", "Status", "vs budget", "Formulary", "In the ratio", "Out of formulary"].map((h) => (
                <th key={h} scope="col" className={`${th} text-right`} style={{ letterSpacing: ".08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const st = statusOf(u);
              return (
                <tr key={u.plant} style={{ borderBottom: `1px solid ${LINE}`, background: u.selected ? SEL_BG : undefined }}>
                  <td className="px-3 py-2 text-[11.5px] tabular-nums" style={{ color: SUB }}>{u.rank ?? "—"}</td>
                  <th scope="row" className="px-3 py-2 text-[12px] text-left" style={{ color: INK, fontWeight: u.selected ? 700 : 500 }}>{u.his_name || u.name}</th>
                  <td className={td} style={{ color: INK, fontWeight: 700 }}>{pct(u.compliance_pct)}</td>
                  <td className={td} style={{ color: SUB }}>{isNum(u.budget_pct) ? `${u.budget_pct}%` : "—"}</td>
                  <td className="px-3 py-2 text-right">{st === "none" ? <span className="text-[12px]" style={{ color: SUB }}>—</span> : <StatusChip status={st} />}</td>
                  <td className={td} style={{ color: INK }}>{st !== "none" && isNum(u.compliance_pct) && isNum(u.budget_pct) ? withSign(u.compliance_pct - u.budget_pct, pts) : "—"}</td>
                  <td className={td} style={{ color: INK }}>{rupeesExact(u.formulary)}</td>
                  <td className={td} style={{ color: INK }}>{rupeesExact(inRatioOf(u))}</td>
                  <td className={td} style={{ color: INK }}>{rupeesExact(u.out_of_formulary)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DrawerSection>
  );
}
