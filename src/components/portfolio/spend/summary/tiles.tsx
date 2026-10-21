"use client";
// Spend Summary — the panels of its one screen. Each is a chart whose key figures are its
// labels (lakhs on the face, exact rupees in the drawer it opens):
//   PartsTile        — each part's loss against its own HCG list: one bullet row per part, each
//                      on its own scale from zero (parts of different sections are never added).
//   BridgeTile       — margin possible → each part's loss → margin earned: HCG's combined
//                      CASH(TPA) & OUT OF FORMULARY table as a bridge (cash & TPA alone until the
//                      out-of-formulary table is built).
//   MarginMonthsTile — cash & TPA (and out-of-formulary) margin missed by month, the % missed a line.
//   WhereTile        — where each section's loss sits: material type and patient type.
//   HospitalsTile    — every hospital's cash & TPA loss; with one hospital selected, where it
//                      stands among them.
//   SchemeMonthsTile — the scheme margin missed by month, its % of the spend a line.
// The brand switches panel lives in ./TopSwitches with its drawer. A tile only draws; which
// drawer opens on which tab is the Summary's (`onShow`).
import React from "react";
import { INK } from "@/components/portfolio/ledger/kit";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { BulletRows, DotStrip, type BulletRow } from "@/components/portfolio/ledger/bullets";
import { RankBars, Waterfall, type WaterStep } from "@/components/portfolio/ledger/bars";
import { MonthCombo } from "@/components/portfolio/ledger/charts";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { isNum, lakhs, pct } from "@/components/portfolio/ledger/format";
import { fitDomain } from "@/components/portfolio/ledger/scale";
import { useSelectHospital } from "@/context/RegionContext";
import { monthBefore, monthLabel } from "../../formulary/api";
import type { CashOverview, Meta, Overview, WithOof } from "../api";
import { CASH_COL, HOSPITAL_COL, LOSS_COL, OOF_COL, PROPOSED_COL, RATE_COL, SCHEME_COL, USED_COL, sectionCol } from "../shared";
import { KIND, marginLoss, spendLoss, type Loss, type LossKind, type MonthLoss, type SectionLoss } from "./model";
import { LossByMonth } from "./drawers";
import { LossSplit, type SplitColumn, type SplitRow } from "./LossSplit";

/** The Summary's drawers: one per section, HCG's combined table, and the brand switches. */
export type DrawerKey = LossKind | "combined" | "switches";
/** Opens a drawer on a tab (its first when none is named). */
export type Show = (key: DrawerKey, tab?: string) => void;

/** A part's two figures on the face: its loss and the % missed, "₹ 78.08 L · 42.77%". */
const lossLabel = (l: Loss) => `${lakhs(l.loss)} · ${pct(l.pct, 2)}`;

/** An accessible name from its sentences, without the closing stop the panel adds its own after. */
const sentences = (...parts: (string | null)[]) => parts.filter(Boolean).join(". ");

/** "Jul-26: ₹ 75.73 L, 42.19%": the month before the selection, for an accessible name. */
const before = (prev: MonthLoss | null) => (prev ? `${prev.label}: ${lakhs(prev.loss)}, ${pct(prev.pct, 2)}` : null);

// ─────────────────────────────────────────────────────────────────────────────
// Margin missed, by part
// ─────────────────────────────────────────────────────────────────────────────
export function PartsTile({ place, cash, scheme, w, groups, oofReady, onShow }: {
  place: Place;
  cash: SectionLoss;
  scheme: SectionLoss;
  /** HCG's combined table; null until the out-of-formulary table is built. */
  w: WithOof | null;
  groups: Overview["groups"] | null;
  /** The out-of-formulary overview has arrived, so its drawer can open. */
  oofReady: boolean;
  onShow: Show;
}) {
  // Each row: what was earned or spent, what HCG's list proposes (the marker), and the loss
  // between them shaded. A cash & TPA margin falls short of the list, so its bar is the margin
  // made and the loss runs on to the marker; a scheme spend goes above the list, so its bar
  // stops at the marker and the loss runs on to the spend. Hence "margin / spend", not "actual".
  const part = (kind: LossKind, key: string, label: string, l: Loss, note: string, onClick?: () => void): BulletRow => ({
    key, label, note, onClick,
    value: l.actual, target: l.proposed, valueLabel: lossLabel(l),
    targetLabel: `${KIND[kind].proposed} ${lakhs(l.proposed)}`,
    hatched: KIND[kind].source === "estimate",
  });
  const rows: BulletRow[] = [
    part("cash", "cash", KIND.cash.short, cash.head, `margin missed, % ${KIND.cash.pctOf}`, () => onShow("cash")),
    ...(w ? [part("oof", "oof", KIND.oof.short, marginLoss(w.oof), `estimated · margin missed, % ${KIND.oof.pctOf}`, oofReady ? () => onShow("oof") : undefined)] : []),
    part("scheme", "scheme", KIND.scheme.short, scheme.head, `spent above the suggested brands, % ${KIND.scheme.pctOf}`, () => onShow("scheme")),
    ...(groups ? [
      part("scheme", "attis", "Attis", spendLoss(groups.attis), `${groups.attis.label}: ${pct(groups.attis.share_pct, 1)} of the scheme margin missed`, () => onShow("scheme", "slices")),
      part("scheme", "healthium", "Healthium", spendLoss(groups.healthium), `${groups.healthium.label}: ${pct(groups.healthium.share_pct, 1)} of the scheme margin missed`, () => onShow("scheme", "slices")),
    ] : []),
  ];
  const label = `Margin missed, by part, each against its own HCG list and never added: ${rows.map((r) => `${r.label} ${r.valueLabel}, ${r.note}`).join("; ")}`;
  return (
    <ChartPanel id="parts" title="Margin missed, by part" accent={USED_COL} place={place} label={label} interactive onOpen={() => onShow("cash")}>
      <BulletRows ariaLabel="Each part's loss against its own HCG list" rows={rows}
        scale={{
          kind: "rupee", perRow: true, format: lakhs,
          bar: { label: "Earned / spent", color: USED_COL }, marker: { label: "Possible (HCG's list)", color: INK }, gap: { label: "Missed", color: LOSS_COL },
        }} />
    </ChartPanel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Margin possible vs earned
// ─────────────────────────────────────────────────────────────────────────────
export function BridgeTile({ place, cash, w, onShow }: { place: Place; cash: SectionLoss; w: WithOof | null; onShow: Show }) {
  const t = w ? marginLoss(w.total) : cash.head;
  const loss = (key: string, label: string, l: Loss, color: string, note: string, hatched = false): WaterStep =>
    ({ key, label, kind: "delta", value: -l.loss, color, hatched, valueLabel: lakhs(-l.loss), note });
  const steps: WaterStep[] = [
    { key: "proposed", label: KIND.cash.proposed, kind: "total", value: t.proposed, color: PROPOSED_COL, valueLabel: lakhs(t.proposed), note: "had the suggested brands been used" },
    ...(w ? [
      loss("cash", `− ${KIND.cash.short}`, marginLoss(w.cash), LOSS_COL, `missed, ${pct(w.cash.loss_pct, 2)} of its possible`),
      loss("oof", `− ${KIND.oof.short}`, marginLoss(w.oof), OOF_COL, `missed (estimated), ${pct(w.oof.loss_pct, 2)} of its possible`, true),
    ] : [loss("cash", `− ${KIND.cash.loss}`, t, LOSS_COL, `${pct(t.pct, 2)} ${KIND.cash.pctOf}`)]),
    { key: "actual", label: KIND.cash.actual, kind: "total", value: t.actual, color: USED_COL, valueLabel: lakhs(t.actual), note: `${pct(t.pct, 2)} of the possible was missed` },
  ];
  const what = w ? "cash & TPA patients, incl. out-of-formulary brands" : "cash & TPA patients";
  const key: DrawerKey = w ? "combined" : "cash";
  const label = `Margin possible to margin earned, ${what}: ${steps.map((s) => `${s.label} ${s.valueLabel}`).join(", ")}; the margin missed is ${pct(t.pct, 2)} of the margin possible`;
  return (
    <ChartPanel id="bridge" title="Margin possible vs earned" context={what} accent={CASH_COL} place={place} source={w ? "estimate" : undefined}
      label={label} onOpen={() => onShow(key)} onInfo={() => onShow(key, "method")}>
      <Waterfall ariaLabel={`Margin possible, less each part's margin missed, to the margin earned, ${what}`} steps={steps} format={lakhs} />
    </ChartPanel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Margin missed by month
// ─────────────────────────────────────────────────────────────────────────────
export function MarginMonthsTile({ place, d, meta, cash, when, onShow }: {
  place: Place; d: CashOverview; meta: Meta; cash: SectionLoss; when: string; onShow: Show;
}) {
  const w = d.with_oof ?? null;
  const t = w ? marginLoss(w.total) : cash.head;
  const prev = w
    ? monthBefore((w.trend || []).map((r) => ({ period: r.period, label: r.label || monthLabel(meta, r.period), ...marginLoss(r) })), d.scope.months)
    : monthBefore(cash.trend, cash.scope.months);
  const what = w ? "cash & TPA patients, incl. out-of-formulary brands" : "cash & TPA patients";
  const key: DrawerKey = w ? "combined" : "cash";
  const label = sentences(`Margin missed by month, ${what}`, `${when}: ${lakhs(t.loss)}, ${pct(t.pct, 2)} of the margin possible`, before(prev));
  return (
    <ChartPanel id="margin-months" title="Margin missed by month" context={what} accent={CASH_COL} place={place} source={w ? "estimate" : undefined}
      label={label} onOpen={() => onShow(key, "trend")} onInfo={() => onShow(key, "method")}>
      <LossByMonth d={d} meta={meta} />
    </ChartPanel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Where margin was missed
// ─────────────────────────────────────────────────────────────────────────────
// The splits both sections have, in the order the rows are drawn.
const SPLITS = ["category", "type"] as const;

const splitRows = (sec: SectionLoss, split: string) => sec.splits.find((s) => s.key === split)?.rows ?? [];

export function WhereTile({ place, cash, scheme, onShow }: { place: Place; cash: SectionLoss; scheme: SectionLoss; onShow: Show }) {
  const sections = [cash, scheme];
  // Every slice either section has, once; patient types print as HCG writes them (IP, OP).
  const rows: SplitRow[] = [];
  for (const split of SPLITS) {
    for (const sec of sections) {
      for (const r of splitRows(sec, split)) {
        const key = `${split}:${r.key}`;
        if (!rows.some((x) => x.key === key)) rows.push({ key, label: split === "type" ? r.key : r.label, title: r.label, group: split });
      }
    }
  }
  const column = (sec: SectionLoss): SplitColumn => ({
    key: sec.kind,
    title: KIND[sec.kind].short,
    color: sectionCol(sec.kind),
    format: lakhs,
    values: Object.fromEntries(SPLITS.flatMap((split) => splitRows(sec, split).map((r): [string, number] => [`${split}:${r.key}`, r.loss]))),
    onOpen: () => onShow(sec.kind, "breakdown"),
  });
  const columns = sections.map(column);
  const label = `Where margin was missed, each section on its own scale: ${columns.map((c) => `${c.title}: ${rows.map((r) => `${r.title} ${lakhs(c.values[r.key])}`).join(", ")}`).join("; ")}`;
  return (
    <ChartPanel id="where" title="Where margin was missed" context="by material and patient type" accent={SCHEME_COL} place={place}
      label={label} interactive onOpen={() => onShow("cash", "breakdown")}>
      <LossSplit ariaLabel="Loss by material type and patient type, cash & TPA beside scheme" rows={rows} columns={columns} />
    </ChartPanel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Margin missed by hospital, or where this hospital stands
// ─────────────────────────────────────────────────────────────────────────────
/** An axis end prints whole ("29%"), a hospital's figure exactly ("42.77%"). */
const pctMark = (v: number) => (Number.isInteger(v) ? `${v}%` : pct(v, 2));

/** How many hospitals the ranking's accessible name reads out; its drawer lists every one. */
const SAID = 5;

export function HospitalsTile({ place, cash, network, onShow }: {
  place: Place;
  cash: SectionLoss;
  /** The % missed over every hospital, when the API sends it. */
  network: CashOverview["network"];
  onShow: Show;
}) {
  const selectHospital = useSelectHospital();
  const all = cash.hospitals;
  const one = !!cash.scope.plant && cash.scope.plant !== "ALL";
  const info = () => onShow("cash", "method");
  const open = () => onShow("cash", "hospitals");

  if (!one) {
    const label = `${KIND.cash.short} margin missed by hospital, most first: ${all.slice(0, SAID).map((h) => `${h.rank}. ${h.label} ${lakhs(h.loss)}, ${pct(h.pct, 2)}`).join("; ")}`;
    return (
      <ChartPanel id="hospitals" title="Margin missed by hospital" context="cash & TPA patients, most first" accent={HOSPITAL_COL} place={place}
        label={label} interactive onOpen={open} onInfo={info}>
        <RankBars ariaLabel={`${KIND.cash.short} margin missed by hospital`} format={lakhs} color={HOSPITAL_COL} onMore={open}
          empty="No hospital has a cash & TPA loss in this selection."
          rows={all.map((h) => ({
            key: h.plant, label: h.label, value: h.loss, valueLabel: lakhs(h.loss), aside: `${pct(h.pct, 2)} ${KIND.cash.pctOf}`,
            selected: h.selected, onClick: () => selectHospital(h),
          }))} />
      </ChartPanel>
    );
  }

  const here = all.find((h) => h.selected) ?? null;
  const netPct = network?.loss_pct;
  const ref = isNum(netPct) ? { value: netPct, label: "All hospitals" } : null;
  const caption = here ? `${here.rank} of ${all.length} by rupees lost` : `${all.length} hospitals`;
  const label = here
    ? `${here.label}: cash & TPA loss ${pct(here.pct, 2)} ${KIND.cash.pctOf}, ${caption}${ref ? `; all hospitals ${pct(ref.value, 2)}` : ""}`
    : `Cash & TPA % missed of ${all.length} hospitals; the one selected has none in this selection`;
  return (
    <ChartPanel id="hospitals" title="How this hospital compares" context="cash & TPA patients, % of margin missed" accent={HOSPITAL_COL} place={place}
      label={label} interactive onOpen={open} onInfo={info}>
      <DotStrip ariaLabel={`${KIND.cash.short} % missed ${KIND.cash.pctOf}, every hospital`} caption={caption} format={pctMark} reference={ref}
        domain={fitDomain([...all.map((h) => h.pct), ref?.value].filter(isNum))}
        dots={all.map((h) => ({ key: h.plant, label: h.label, value: h.pct, selected: h.selected, onClick: () => selectHospital(h) }))} />
    </ChartPanel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheme: margin missed by month
// ─────────────────────────────────────────────────────────────────────────────
export function SchemeMonthsTile({ place, scheme, when, onShow }: { place: Place; scheme: SectionLoss; when: string; onShow: Show }) {
  const sel = new Set(scheme.scope.months);
  const h = scheme.head;
  const label = sentences("Scheme: margin missed by month, scheme (GOV) patients", `${when}: ${lakhs(h.loss)}, ${pct(h.pct, 2)} ${KIND.scheme.pctOf}`,
    before(monthBefore(scheme.trend, scheme.scope.months)));
  return (
    <ChartPanel id="scheme-months" title="Scheme: margin missed by month" context="scheme (govt) patients" accent={SCHEME_COL} place={place}
      label={label} onOpen={() => onShow("scheme", "trend")} onInfo={() => onShow("scheme", "method")}>
      <MonthCombo ariaLabel={`Scheme: margin missed by month, with the % missed ${KIND.scheme.pctOf} as a line`}
        series={[{ key: "loss", label: "Margin missed", color: SCHEME_COL }]}
        line={{ label: "% missed", color: RATE_COL, decimals: 1 }}
        months={scheme.trend.map((m) => ({ key: m.period, label: m.label, pct: m.pct, selected: sel.has(m.period), values: { loss: m.loss } }))} />
    </ChartPanel>
  );
}
