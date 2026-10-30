"use client";
// Spend Analysis (Out of formulary) — where the brand bought earns more than the one suggested
// for it. HCG adds its margin missed up NET, so these receipts lower the headline figure; the
// tile says by how much (the API's `better_loss`), and ranks the switches that would cost the
// most margin, as bars from zero in the margin-earned colour (what keeping the brand earns
// more). The drawer lists them with exact rupees and says how they enter the net figure.
import React from "react";
import { ChartPanel, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, KeyFigures, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { lakhs, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import { LOSS_COL, USED_COL, Method, sourceText, type Ctx } from "./context";
import { SwitchTable, brandOf, switchOf } from "./SwitchesTile";

function BetterDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  const rows = c.d.better_items || [];
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(-h.better_loss), comparator: `more earned by the brands bought than their suggestions would, ${c.when}` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title="How it enters the margin missed" note="HCG adds the margin missed up net over every receipt: these receipts lower it.">
                <KeyFigures figures={[
                  { label: "Missed where the suggestion earns more", value: rupeesExact(h.gain_loss), color: LOSS_COL, note: "the receipts where switching gains" },
                  { label: "Where the brand bought earns more", value: rupeesExact(h.better_loss), color: USED_COL, note: "the receipts where switching loses" },
                  { label: "Margin missed, net", value: rupeesExact(h.margin_loss), note: "the two together: HCG's figure" },
                ]} />
              </DrawerSection>
              <DrawerSection title={rows.length > 1 ? `The ${rows.length} switches that would cost the most` : "Switches that would cost margin"}
                note="Margin missed is negative here: the brand bought earns that much more than the suggested brand would on the same units.">
                <SwitchTable rows={rows} caption="Out-of-formulary brands that earn more than their suggestion" empty="In this selection every brand bought earns less than its suggested brand." />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>Per receipt, margin missed = the suggested brand&apos;s margin − the brand bought&apos;s, on the same units. Where the brand bought earns more, that is negative, and HCG&apos;s sheet adds it in: its figure is net. The app shows the net figure as the margin missed, as HCG does, and its two parts here.</p>
              <p>On the chart each switch is a bar from zero of what keeping the brand bought earns more, in the margin-earned colour.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function BetterTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const h = c.d.headline;
  const rows = c.d.better_items || [];
  const title = "Brand bought earns more";
  return (
    <>
      <ChartPanel id="better" title={title} context={c.context} accent={USED_COL} place={place} source={c.source}
        label={[
          `${title}: ${lakhs(-h.better_loss)} more earned than the suggested brands would, taken off the margin missed`, c.context,
          ...rows.slice(0, 3).map((r) => `${brandOf(r)} rather than ${switchOf(r)}: ${withSign(-r.margin_loss, lakhs)}`),
        ].join(". ")}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        <div className="flex flex-col h-full">
          <p className="flex-shrink-0 truncate text-[12px] pb-1" style={{ color: SUB }} title="Taken off the margin missed, as HCG counts it">
            <b className="tabular-nums" style={{ color: INK }}>{withSign(-h.better_loss, lakhs)}</b> earned more · taken off the margin missed
          </p>
          <PanelPart>
            {/* What keeping each brand earns more: minus its (negative) margin missed, as sent. */}
            <RankBars format={lakhs} color={USED_COL} ariaLabel={`${title}: what each brand bought earns more than its suggestion, ${c.context}`}
              empty="Every brand bought earns less than its suggested brand."
              rows={rows.map((r) => ({
                key: `${r.material}|${r.suggested_by}|${r.suggested_material}`, label: brandOf(r),
                sub: `rather than ${switchOf(r)} · ${sourceText(r)}`, value: -r.margin_loss, valueLabel: withSign(-r.margin_loss, lakhs), hatched: r.estimated,
              }))} />
          </PanelPart>
        </div>
      </ChartPanel>
      <BetterDrawer c={c} dr={dr} title={title} />
    </>
  );
}
