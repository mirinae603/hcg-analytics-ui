"use client";
// Spend Analysis, Scheme overview — the month tile, drawn the way HCG's monthly spend
// email draws it: bars = the margin missed in rupees (from zero), a line = its % (its own
// fitted, labelled axis). In the panel it shows the year ending at the selected month, which
// is shaded; its exact figures (HCG's month table) and method open in the headline drawer.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import { MonthCombo } from "@/components/portfolio/ledger/charts";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { lakhs, pct } from "@/components/portfolio/ledger/format";
import type { Meta, Overview } from "../api";
import { RATE_COL, SCHEME_COL, WORDS, monthRows, type Scope } from "./context";

export function MonthTile({ d, meta, scope, place, onOpen, onInfo }: {
  d: Overview; meta: Meta; scope: Scope; place: Place;
  /** Opens HCG's month table (the headline drawer's "As in HCG mail" tab). */
  onOpen: () => void;
  onInfo: () => void;
}) {
  const w = WORDS;
  const title = `${w.loss} by month`;
  const sel = new Set(d.scope?.months || []);
  const rows = monthRows(d, meta);
  const label = [
    `${title}, ${scope.where}, scheme patients`,
    rows.map((r) => `${r.label}${sel.has(r.period) ? " (selected)" : ""} ${lakhs(r.loss)}, ${pct(r.pct)}`).join("; "),
  ].join(". ");

  return (
    <ChartPanel id="month" title={title} context={`${scope.where} · your months shaded`} accent={SCHEME_COL} place={place} label={label}
      onOpen={onOpen} onInfo={onInfo}>
      <MonthCombo ariaLabel={`${w.loss} by month, ${scope.where}, with ${w.pct} as a line`}
        series={[{ key: "loss", label: w.loss, color: SCHEME_COL }]}
        line={{ label: w.pct, color: RATE_COL, decimals: 2 }}
        months={rows.map((r) => ({
          key: r.period, label: r.label, pct: r.pct, selected: sel.has(r.period), values: { loss: r.loss },
        }))} />
    </ChartPanel>
  );
}
