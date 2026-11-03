"use client";
// Compliance vs budget: every unit judged against its budget, each a bar on 0–100% in its status
// colour with its budget marked and the month before ticked (Few's bullet graph, as on the
// Formulary page), furthest below its budget first. A tab of the Hospitals tile's drawer; the
// tile's face prints each unit's compliance in its status colour, and this is where the gap to
// the budget is drawn. Only on the Value basis with every patient and material, where HCG's
// budgets apply: the Quantity basis or a filtered view says so in words instead. A row selects
// that unit.
import React from "react";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { BulletRows, type BulletRow } from "@/components/portfolio/ledger/bullets";
import { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import { SUB } from "@/components/portfolio/ledger/kit";
import { STATUS_LABEL, WITHIN_PTS } from "@/components/portfolio/ledger/status";
import { isNum, pct, pts, withSign } from "@/components/portfolio/ledger/format";
import { ExactTable, MethodText, PAGES, QUANTITY_LC, unitName, type ExecCtx } from "./shared";
import type { UnitRow } from "./api";

type Judged = UnitRow & { compliance_pct: number; budget_pct: number };
const isJudged = (u: UnitRow): u is Judged => isNum(u.compliance_pct) && isNum(u.budget_pct) && u.status != null;
const gapOf = (u: Judged) => u.compliance_pct - u.budget_pct;

/** Why there is nothing to judge, or null when there is. */
export function whyNoBudget(c: ExecCtx): string | null {
  if (c.units) return `No budget on ${QUANTITY_LC}: HCG's compliance budget is a drug-cost target. Switch the header to Value to compare.`;
  if (!c.judged) return "HCG sets each unit's budget for its whole drug spend, so it is not compared under the Patients or Material filter. Choose IP + OP and All materials to compare.";
  if (!c.d.units.some(isJudged)) return "No unit has a budget in HCG's MIS for this selection.";
  return null;
}

/** The drawer tab: every judged unit's bullet, furthest below first, then the exact gaps. */
export function BudgetView({ c }: { c: ExecCtx }) {
  const why = whyNoBudget(c);
  const units = c.d.units.filter(isJudged).sort((a, b) => gapOf(a) - gapOf(b) || unitName(a).localeCompare(unitName(b)));
  const row = (u: Judged): BulletRow => ({
    key: u.plant, label: unitName(u), value: u.compliance_pct, valueLabel: pct(u.compliance_pct, 1),
    target: u.budget_pct, targetLabel: `budget ${pct(u.budget_pct, 0)}`, status: u.status ?? undefined, selected: u.selected,
    // The month before, from the change the server sends (compliance less its change in points).
    prior: isNum(u.delta_pts) && c.prevLabel ? { value: u.compliance_pct - u.delta_pts, label: c.prevLabel } : null,
    note: `${withSign(gapOf(u), (v) => pts(v, 1))}`,
    onClick: () => c.select(u),
  });
  if (why) {
    return (
      <>
        <DrawerSection title="Every unit with a budget"><p className="text-[12.5px] leading-relaxed" style={{ color: SUB }}>{why}</p></DrawerSection>
        <LinkButton onClick={() => c.go(PAGES.formulary.href)}>Open {PAGES.formulary.name}</LinkButton>
      </>
    );
  }
  return (
    <>
      <DrawerSection title="Every unit against its budget" note="Furthest below its budget first; the black mark is the budget, the grey tick the month before. Select a row to show that hospital.">
        <BulletRows rows={units.map(row)} scale={{ kind: "pct", min: 0, max: 100, bars: true }} ariaLabel={`Every unit with a budget, furthest below first, ${c.when}`} />
      </DrawerSection>
      <DrawerSection title="Every unit with a budget, exact" note="Furthest below its budget first. Shaded = the hospital selected in the header.">
        <ExactTable rows={units} rowKey={(u) => u.plant} caption={`Compliance against budget, ${c.when}`} selected={(u) => u.selected}
          columns={[
            { label: "Unit", value: (u) => unitName(u), text: true },
            { label: "Compliance", value: (u) => pct(u.compliance_pct), raw: (u) => u.compliance_pct, unit: "%", strong: true },
            { label: "Budget", value: (u) => pct(u.budget_pct), raw: (u) => u.budget_pct, unit: "%" },
            { label: "Against budget", value: (u) => withSign(gapOf(u), (v) => pts(v)), raw: gapOf, unit: "pts" },
            { label: "Status", value: (u) => (u.status ? STATUS_LABEL[u.status] : "—"), raw: (u) => (u.status ? STATUS_LABEL[u.status] : null), text: true },
            { label: c.prevLabel ? `vs ${c.prevLabel}` : "Change", value: (u) => (isNum(u.delta_pts) ? withSign(u.delta_pts, (v) => pts(v)) : "—"), raw: (u) => u.delta_pts, unit: "pts" },
          ]} />
      </DrawerSection>
      <LinkButton onClick={() => c.go(PAGES.formulary.href)}>Open {PAGES.formulary.name}</LinkButton>
    </>
  );
}

export function BudgetMethod() {
  return (
    <MethodText>
      <p>Formulary compliance is formulary ÷ (formulary + out of formulary), pooled on drug cost; non-formulary is outside the ratio. Each unit&apos;s bar runs from 0 to its compliance on a 0–100% scale, coloured by its status against HCG&apos;s budget for it (the black mark): met when it prints at or above the budget (HCG&apos;s MIS prints whole %), within when up to {WITHIN_PTS} pts below that, below beyond it. The grey tick is the month before, from the change the server sends.</p>
      <p>Every unit with a budget is listed, the furthest below its budget first; a unit at 99.9% against a 100% budget has met it (HCG&apos;s whole-% rule). On the page, each unit&apos;s compliance carries the same status: its mark (✓ met, ~ within {WITHIN_PTS} pts, ✕ below) and a tint of its colour.</p>
      <p>Budgets are HCG&apos;s, set per unit for its whole drug spend, so they are compared only on the Value basis with every patient type and material. All hospitals together have no budget.</p>
    </MethodText>
  );
}
