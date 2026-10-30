"use client";
// Spend Analysis (Generic vs branded) — the months, on two tiles that share one drawer:
//   MonthTile — what was bought each month, generic and branded stacked into one bar, with the %
//               branded as a line riding the bar tops.
//   ExtraTile — the cost of branded each month: what branded purchases cost above the cheapest
//               generic of the same product that month, with that as a % of the branded value
//               that had a generic to compare with, as the line.
// Every purchase month is drawn; the Month filter only shades its months. The drawer has both
// charts and the month table (with which months have an Item Master).
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { MonthCombo, type ComboMonth, type ComboSeries } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { MonthTable, type MonthCol } from "../Trend";
import { BRANDED_COL, GENERIC_COL, RATE_COL, GENERIC_SOURCE, Method, type Ctx, type Month } from "./context";

const PARTS: ComboSeries[] = [
  { key: "generic", label: "Generic", color: GENERIC_COL },
  { key: "branded", label: "Branded", color: BRANDED_COL },
];
const EXTRA: ComboSeries[] = [{ key: "extra", label: "Branded above the cheapest generic", color: BRANDED_COL }];
const BRANDED_LINE = { label: "% branded", color: RATE_COL, decimals: 1 };
const EXTRA_LINE = { label: "% above generic", color: RATE_COL, decimals: 1 };

/** Every purchase month; a month with no purchase has no bar (rather than a bar at zero). */
function partsMonths(c: Ctx): ComboMonth[] {
  const sel = new Set(c.d.scope?.months || []);
  return (c.d.by_month || []).map((r) => {
    const any = r.lines > 0;
    return { key: r.period, label: r.label, selected: sel.has(r.period), pct: r.branded_pct, values: { generic: any ? r.generic_value : null, branded: any ? r.branded_value : null } };
  });
}
function extraMonths(c: Ctx): ComboMonth[] {
  const sel = new Set(c.d.scope?.months || []);
  return (c.d.by_month || []).map((r) => ({
    key: r.period, label: r.label, selected: sel.has(r.period), pct: r.extra_vs_generic_pct,
    values: { extra: r.branded_lines > 0 ? r.extra_vs_generic : null },
  }));
}

const TABLE_COLS: MonthCol<Month>[] = [
  { label: "Generic", render: (r) => rupeesExact(r.generic_value) },
  { label: "Branded", render: (r) => rupeesExact(r.branded_value) },
  { label: "% branded", render: (r) => pct(r.branded_pct) },
  { label: "Branded compared", render: (r) => rupeesExact(r.compared_value) },
  { label: "Above the cheapest generic", render: (r) => <b>{rupeesExact(r.extra_vs_generic)}</b> },
  { label: "% above", render: (r) => pct(r.extra_vs_generic_pct) },
  { label: "Item Master", render: (r) => (r.item_master ? "yes" : "none") },
];

const partsAria = (c: Ctx) => `Generic and branded purchases by month, ${c.where}, stacked, with the % branded as a line on the bar tops`;
const extraAria = (c: Ctx) => `What branded purchases cost above the cheapest generic by month, ${c.where}, with that % as a line on the bar tops`;

function MonthsDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  const sel = new Set(c.d.scope?.months || []);
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.extra_vs_generic), comparator: `branded above the cheapest generic, ${pct(h.extra_vs_generic_pct)} of the branded value compared, ${c.when}` }}
      source={GENERIC_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "months", label: "Generic and branded", render: () => (
            <>
              <DrawerSection title="Bought by month" note="Generic and branded stacked into one bar from zero; the line joins the bar tops, each point labelled with that month's % branded. Months in your selection are shaded.">
                <MonthCombo months={partsMonths(c)} series={PARTS} line={BRANDED_LINE} format={lakhs} ariaLabel={partsAria(c)} />
              </DrawerSection>
              <DrawerSection title="Month by month" note={`${c.w.extraNote} Item Master: whether the month has its own (the formulary split needs one).`}>
                <MonthTable rows={c.d.by_month || []} cols={TABLE_COLS} selected={sel} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "extra", label: "Above generic", render: () => (
            <DrawerSection title="Branded above the cheapest generic, by month" note="Bars from zero; the line joins the bar tops, each point labelled with that month's % above (of the branded value that had a generic). Months in your selection are shaded.">
              <MonthCombo months={extraMonths(c)} series={EXTRA} line={EXTRA_LINE} format={lakhs} ariaLabel={extraAria(c)} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>Every month with a GRN file is drawn; the Month filter only shades its months, the other filters apply. Bars start from zero on one scale; a % is read from the labels on its line, never from a second scale.</p>
              <p>{c.w.extraNote} A month&apos;s cheapest generic is that month&apos;s, at any hospital.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function MonthTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const title = "Generic and branded by month";
  return (
    <>
      <ChartPanel id="months" title={title} context={c.where} accent={GENERIC_COL} place={place} source={GENERIC_SOURCE}
        label={[partsAria(c), `${c.when}: generic ${lakhs(h.generic_value)}, branded ${lakhs(h.branded_value)}, ${pct(h.branded_pct, 1)} branded`].join(". ")}
        onOpen={() => dr.show("months")} onInfo={() => dr.show("method")}>
        <MonthCombo months={partsMonths(c)} series={PARTS} line={BRANDED_LINE} format={lakhs} ariaLabel={partsAria(c)} />
      </ChartPanel>
      <MonthsDrawer c={c} dr={dr} title={title} />
    </>
  );
}

export function ExtraTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const title = "Branded above generic, by month";
  return (
    <>
      <ChartPanel id="extra" title={title} context={c.where} accent={BRANDED_COL} place={place} source={GENERIC_SOURCE}
        label={[extraAria(c), `${c.when}: ${lakhs(h.extra_vs_generic)}, ${pct(h.extra_vs_generic_pct, 1)} of the branded value compared`].join(". ")}
        onOpen={() => dr.show("extra")} onInfo={() => dr.show("method")}>
        <MonthCombo months={extraMonths(c)} series={EXTRA} line={EXTRA_LINE} format={lakhs} ariaLabel={extraAria(c)} />
      </ChartPanel>
      <MonthsDrawer c={c} dr={dr} title={title} />
    </>
  );
}
