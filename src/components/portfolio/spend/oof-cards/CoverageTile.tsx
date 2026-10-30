"use client";
// Spend Analysis (Out of formulary) — where the suggested brands came from: the money spent on
// out-of-formulary brands as one 100% bar, split by who suggested the brand each receipt is set
// against (HCG's worksheet of the month, HCG's pair from another month, HCG's list, the app's
// own match marked Estimated) and the receipts left out of the margins (parked by HCG, or no
// alternative mapped). Under it, the biggest brands bought with no alternative, as bars from
// zero: they are shown, as HCG asked, but add nothing to the margins.
import React from "react";
import { ChartPanel, LinkButton, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { PartBar, RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { OofNoAlternative, View } from "../api";
import { coverageParts, lossMethod, plural } from "../shared";
import { DataTable, type Col } from "../DataTable";
import { SUGGESTED, Method, type Ctx } from "./context";

const NONE_COL = SUGGESTED.none.color;
const nameOf = (u: OofNoAlternative) => u.material_desc ?? u.material;

function CoverageDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  const parts = coverageParts(h.coverage);
  const none = c.d.no_alternative || [];
  const goTo = (v: View) => { dr.close(); c.onOpen(v); };
  const cols: Col<OofNoAlternative>[] = [
    {
      label: "Brand bought", align: "left", wrap: true, render: (u) => (
        <span className="block" title={`${nameOf(u)} (${u.material})`}>
          <span className="block font-semibold" style={{ color: INK }}>{nameOf(u)}</span>
          <span className="block text-[11px]" style={{ color: SUB }}>{[u.minor_group, u.manufacturer].filter(Boolean).join(" · ")}</span>
        </span>
      ),
    },
    { label: "Why", align: "left", render: (u) => (u.status === "unpriced" ? `Suggested ${u.suggested_desc ?? u.suggested_material ?? ""}, no price` : "No alternative mapped") },
    { label: "Units", render: (u) => num(u.qty) },
    { label: "Spent", render: (u) => rupeesExact(u.purchase_value) },
    { label: "Hospitals", render: (u) => num(u.hospitals) },
    { label: "Vendors", render: (u) => num(u.vendors) },
  ];
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.counted_value), comparator: `of the ${rupeesExact(h.purchase_value)} spent has a suggested brand, so counts in the margins` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <DrawerSection title="By where the suggested brand came from" note="The money spent on out-of-formulary brands in the selection (Base Price × units), in the API's own words.">
              <KeyFigures figures={parts.map(([key, b]) => ({
                label: b.label, value: rupeesExact(b.value), color: SUGGESTED[key].color, hatched: SUGGESTED[key].hatched,
                note: `${pct(b.share_pct)} · ${plural(b.brands, "brand")} · ${plural(b.lines, "receipt")}${b.counted ? "" : " · not counted"}`,
              }))} />
            </DrawerSection>
          ),
        },
        {
          key: "none", label: "No alternative", render: () => (
            <DrawerSection title="The biggest brands bought with no alternative" note="By money spent. They are shown, as HCG asked, but add nothing to the margins. Every brand is in the Brands tab.">
              <DataTable rows={none} rowKey={(u) => `${u.material}|${u.status}`} cols={cols} caption="Out-of-formulary brands bought with no alternative mapped, by money spent" minWidth={720}
                empty="Every out-of-formulary brand bought in this selection has a suggested brand." />
              <div className="mt-4"><LinkButton onClick={() => goTo("items")}>All brands</LinkButton></div>
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{lossMethod("oof").basis}</p>
              <p>Counted: HCG&apos;s worksheet, HCG&apos;s pair from another month, HCG&apos;s list and the app&apos;s match (Estimated). Not counted: receipts HCG parked (it doubts the Item Master&apos;s flag) and brands with no suggested brand, or one with no price; they are shown, and add nothing to the margins.</p>
              <p>On the chart the whole bar is the money spent; under it, the biggest brands with no alternative, as bars from zero on their own scale.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function CoverageTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const parts = coverageParts(h.coverage);
  const none = c.d.no_alternative || [];
  const title = "Where the suggested brands came from";
  return (
    <>
      <ChartPanel id="coverage" title={title} context={c.context} accent={SUGGESTED.hcg_sheet.color} place={place} source={c.source}
        label={[
          title, c.context, `${lakhs(h.purchase_value)} spent`,
          ...parts.map(([, b]) => `${b.label} ${pct(b.share_pct, 1)}, ${lakhs(b.value)}`),
          ...none.slice(0, 3).map((u) => `no alternative: ${nameOf(u)} ${lakhs(u.purchase_value)}`),
        ].join(". ")}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        {parts.length ? (
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
              <PartBar ariaLabel={`Money spent on out-of-formulary brands by where the suggested brand came from, ${c.context}`}
                whole={`${lakhs(h.purchase_value)} spent · ${plural(h.brands, "brand")}`}
                parts={parts.map(([key, b]) => ({ key, label: SUGGESTED[key].short, share: b.share_pct, valueLabel: lakhs(b.value), color: SUGGESTED[key].color, hatched: SUGGESTED[key].hatched }))} />
            </div>
            {none.length > 0 && (
              <>
                <p className="flex-shrink-0 mt-2 text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".08em" }}>Largest with no alternative</p>
                <PanelPart>
                  <RankBars format={lakhs} color={NONE_COL} ariaLabel="The biggest out-of-formulary brands bought with no alternative, by money spent"
                    rows={none.map((u) => ({ key: `${u.material}|${u.status}`, label: nameOf(u), sub: u.minor_group ?? undefined, value: u.purchase_value, valueLabel: lakhs(u.purchase_value) }))} />
                </PanelPart>
              </>
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>{c.w.none}.</p>
        )}
      </ChartPanel>
      <CoverageDrawer c={c} dr={dr} title={title} />
    </>
  );
}
