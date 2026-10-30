"use client";
// Spend Analysis (Generic vs branded) — where generic and branded purchases sit in the Item
// Master: each class as one 100% bar split by the month's formulary flag (formulary, non
// formulary, out of formulary, not in the master), in the Formulary page's colours (out of
// formulary hatched, as solid ORANGE is branded on this screen; FLAG_STYLE). The split
// needs each month's own Item Master, so it covers the selected months that have one; a
// selection with none says so instead. The drawer has the flags and the formulary part by tier
// (preferred, scheme only, restricted) with exact rupees.
import React from "react";
import { ChartPanel, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { StackBars, type StackSegment } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { SUB } from "@/components/portfolio/ledger/kit";
import { Swatch } from "@/components/portfolio/ledger/legend";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { purchaseMonthLabel, purchaseMonthsLabel, type GenericClass, type GenericShare } from "../api";
import { DataTable, type Col } from "../DataTable";
import { FLAG_STYLE, GENERIC_COL, GENERIC_SOURCE, Method, type Ctx } from "./context";

/** The flags in the order the API sends them (formulary first), as StackBars segments. */
const segmentsOf = (classes: GenericClass[]): StackSegment[] => {
  const seen = new Map<string, string>();
  for (const k of classes) for (const f of k.flags) if (!seen.has(f.key)) seen.set(f.key, f.label);
  return [...seen].map(([key, label]) => ({ key, label: FLAG_STYLE[key]?.label ?? label, color: FLAG_STYLE[key]?.color ?? SUB, hatched: FLAG_STYLE[key]?.hatched }));
};

/** "Item Master months only: Jun-26, Jul-26, Aug-26 (Dec-25, … have none)", or why there is no
 *  split. The months are listed, not ranged: the ones without an Item Master need not be a run. */
function coverage(c: Ctx): string {
  const k = c.d.compliance;
  const list = (periods: string[]) => periods.map((p) => purchaseMonthLabel(c.months, p)).join(", ");
  const without = k?.months_without_item_master || [];
  const verb = without.length === 1 ? "has" : "have";
  if (!k?.available) return `The formulary split needs each month's own Item Master, and ${list(without)} ${verb} none.`;
  return without.length
    ? `Item Master months only: ${list(k.months)} (${list(without)} ${verb} none).`
    : `Each month's own Item Master: ${list(k.months)}.`;
}

type ShareRow = GenericShare & { cls: string };

const shareCols = (kind: "flag" | "tier"): Col<ShareRow>[] => [
  { label: "Class", align: "left", render: (r) => r.cls },
  {
    label: kind === "flag" ? "Item Master flag" : "Formulary tier", align: "left", render: (r) => (
      <span className="inline-flex items-center gap-1.5">{kind === "flag" && <Swatch color={FLAG_STYLE[r.key]?.color ?? SUB} hatched={FLAG_STYLE[r.key]?.hatched} />}{r.label}</span>
    ),
  },
  { label: "Value", render: (r) => rupeesExact(r.value) },
  { label: "Share of the class", render: (r) => <b>{pct(r.share_pct)}</b> },
];

/** A class's share on the formulary (the Item Master's FORMULARY flag), as the API gives it. */
const formularyShare = (g: GenericClass | undefined) => g?.flags.find((f) => f.key === "FORMULARY")?.share_pct ?? null;

function ComplianceDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const k = c.d.compliance;
  const classes = k?.by_class || [];
  const rows = (pick: (g: GenericClass) => GenericShare[]) => classes.flatMap((g) => pick(g).map((s) => ({ ...s, cls: g.label })));
  const branded = classes.find((g) => g.class === "branded"), generic = classes.find((g) => g.class === "generic");
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={k?.available ? { value: pct(formularyShare(branded)), comparator: `of branded purchases on the formulary (generic ${pct(formularyShare(generic))}), ${purchaseMonthsLabel(c.months, k.months)}` } : undefined}
      source={GENERIC_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "flags", label: "Formulary flag", render: () => (
            <DrawerSection title="Each class by the Item Master's flag" note={coverage(c)}>
              <DataTable rows={rows((g) => g.flags)} rowKey={(r) => `${r.cls}|${r.key}`} cols={shareCols("flag")}
                caption="Generic and branded purchases by formulary flag" empty="No formulary split for this selection." />
            </DrawerSection>
          ),
        },
        {
          key: "tiers", label: "Formulary tiers", render: () => (
            <DrawerSection title="The formulary part, by tier" note={`Preferred, scheme only, restricted and other formulary, from the Item Master's category; each a share of the class's whole value, so a class's tiers add up to its formulary share. ${coverage(c)}`}>
              <DataTable rows={rows((g) => g.tiers)} rowKey={(r) => `${r.cls}|${r.key}`} cols={shareCols("tier")}
                caption="Formulary purchases of each class by tier" empty="No formulary split for this selection." />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>Each class&apos;s bar is its value in the months with their own Item Master, split by that month&apos;s flag for each brand; the shares are the API&apos;s. Non formulary is hatched: it is outside the Formulary page&apos;s compliance ratio. Out of formulary is hatched orange, because solid orange is branded on this screen. {coverage(c)}</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function ComplianceTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const k = c.d.compliance;
  const classes = (k?.by_class || []).filter((g) => g.value > 0);
  const title = "In the formulary?";
  const segments = segmentsOf(classes);
  return (
    <>
      <ChartPanel id="compliance" title={title} context={k?.available ? purchaseMonthsLabel(c.months, k.months) : c.when} accent={GENERIC_COL} place={place} source={GENERIC_SOURCE}
        label={[`${title} Generic and branded purchases by the Item Master's formulary flag, ${c.where}`, coverage(c),
          ...classes.map((g) => `${g.label}: ${g.flags.filter((f) => f.value > 0).map((f) => `${f.label} ${pct(f.share_pct, 1)}`).join(", ")}`)].join(". ")}
        onOpen={() => dr.show("flags")} onInfo={() => dr.show("method")}>
        {k?.available && classes.length ? (
          <div className="flex flex-col h-full">
            <PanelPart>
              <StackBars segments={segments} ariaLabel={`${title}, ${c.where}`} format={lakhs}
                rows={classes.map((g) => ({
                  key: g.class, label: g.label, aside: lakhs(g.value),
                  values: Object.fromEntries(g.flags.map((f) => [f.key, f.value])),
                }))} />
            </PanelPart>
            {k.months_without_item_master.length > 0 && <p className="flex-shrink-0 truncate text-[11px] pt-1" style={{ color: SUB }} title={coverage(c)}>{coverage(c)}</p>}
          </div>
        ) : (
          <p className="text-[12px] leading-snug" style={{ color: SUB }}>{k?.available ? `${c.w.none}.` : coverage(c)}</p>
        )}
      </ChartPanel>
      <ComplianceDrawer c={c} dr={dr} title={title} />
    </>
  );
}
