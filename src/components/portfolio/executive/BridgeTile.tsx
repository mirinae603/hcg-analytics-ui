"use client";
// The margin bridge (D3): the margin with every switch HCG suggests, less what was missed — cash &
// TPA margin, scheme saving and out-of-formulary margin — is the margin earned on sales. The API
// sends the steps from earned to possible; the panel reads them top to bottom from possible to
// earned, as every bridge in the app does (the Spend summary, Cash & TPA, Out of formulary), so
// each part missed is a loss drawn in the loss colour (the kit's waterfall paints a step that
// adds as a gain). The figures are the API's, unchanged, and nothing is added up here.
//
// Two of the parts are worked out on the sales lines, out of formulary on purchases (goods
// receipts) of the same months: each step says which, and the drawer says the last bar is an
// indication, not one ledger. Rupees on either basis.
//
// A part can be below zero: out-of-formulary brands bought that earned more margin than the
// suggested ones. Such a part adds to the margin earned instead of taking from it, so it is
// labelled with a plus and drawn as a gain, and its amount keeps its own sign.
import React from "react";
import { ChartPanel, LinkButton, usePanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { Waterfall, type WaterStep } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { SUB } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import { LOSS_COL, OOF_COL, PROPOSED_COL, USED_COL } from "@/components/portfolio/spend/shared";
import { ExactTable, HowBuilt, MethodText, PAGES, QUANTITY, RUPEES_ONLY, filterChips, type ExecCtx } from "./shared";
import type { BridgeStep } from "./api";

const TITLE = "Margin bridge";
const SOURCE_WORDS = { sales: "on sales lines", purchases: "on purchases (GRN)" } as const;
/** Each step's name on the face; the drawer and the accessible name carry the API's full names.
 *  A step the page does not know keeps its own. The ends say "on sales" and "with every switch":
 *  the Spend summary's bridge covers the cash & TPA patients' margin alone (with out of
 *  formulary), and its ends must not read as these. */
const FACE: Record<string, string> = {
  possible: "With every switch", cash: "Cash & TPA", scheme: "Scheme", oof: "Out of formulary", earned: "Earned on sales",
};
/** The same, short, for a panel too narrow for those (a quarter of a 1280px or 1440px screen):
 *  under the title "Margin bridge" the ends read as the margin possible and earned. */
const FACE_SHORT: Record<string, string> = { possible: "Possible", cash: "Cash & TPA", scheme: "Scheme", oof: "OOF", earned: "Earned" };
/** Below this body width the steps take their short names (the waterfall's names get a third of
 *  it, and drop their notes below the same width). */
const SHORT_NAMES_W = 320;

/** A part below zero earned more than its switch would have: it adds to the margin earned. */
const gained = (s: BridgeStep) => isNum(s.value) && s.value < 0;

/** The steps top to bottom: the total possible, each part missed as a loss (a part gained as a
 *  gain), the total earned, named from `names`. Nothing to draw when the selection has no margin
 *  at all (a hospital without sales sends every step as 0). */
function stepsOf(steps: BridgeStep[], names: Record<string, string> = FACE): WaterStep[] {
  const face = (s: BridgeStep) => names[s.key] ?? s.label;
  const totals = steps.filter((s) => s.kind === "total" && isNum(s.value));
  const earned = totals.find((s) => s.key === "earned") ?? totals[0];
  const possible = totals.find((s) => s.key === "possible") ?? totals[totals.length - 1];
  const parts = steps.filter((s) => s.kind === "delta" && isNum(s.value));
  if (!earned || !possible || earned === possible) return [];
  if ([...totals, ...parts].every((s) => s.value === 0)) return [];
  const total = (s: BridgeStep, color: string): WaterStep => ({
    key: s.key, label: face(s), kind: "total", value: s.value as number, color, valueLabel: lakhs(s.value), note: SOURCE_WORDS[s.source] ?? "",
  });
  return [
    total(possible, PROPOSED_COL),
    ...parts.map((s): WaterStep => {
      const source = SOURCE_WORDS[s.source] ?? "";
      return {
        key: s.key, label: `${gained(s) ? "+" : "−"} ${face(s)}`, kind: "delta", value: -(s.value as number),
        color: s.source === "purchases" ? OOF_COL : LOSS_COL, valueLabel: withSign(-(s.value as number), lakhs),
        note: gained(s) ? `earned more · ${source}` : source,
      };
    }),
    total(earned, USED_COL),
  ];
}

/** The waterfall on the face, with the step names its panel's width has room for. Drawn inside
 *  the ChartPanel, whose body size it reads. */
function FaceBridge({ c, steps }: { c: ExecCtx; steps: BridgeStep[] }) {
  const w = usePanel()?.size.w ?? Infinity;
  return (
    <Waterfall steps={stepsOf(steps, w < SHORT_NAMES_W ? FACE_SHORT : FACE)} format={lakhs}
      ariaLabel={`The margin with every switch, less each part missed, is the margin earned, ${c.where}`} />
  );
}

export function BridgeTile({ c, place }: { c: ExecCtx; place: Place }) {
  const dr = useDrawer();
  const steps = stepsOf(c.d.bridge.steps);
  const label = steps.length
    ? `${TITLE}, ${c.context}: ${[...c.d.bridge.steps].reverse().map((s) => `${s.label} ${lakhs(s.value)}`).join(", ")}`
    : `${TITLE}, ${c.context}: no sales in this selection`;
  return (
    <>
      <ChartPanel id="bridge" title={TITLE} context={`${c.when}${c.units ? ` · ${RUPEES_ONLY}` : ""}`} accent={LOSS_COL} place={place}
        label={label} onOpen={() => dr.show("detail")} onInfo={() => dr.show("method")}>
        {steps.length ? (
          <FaceBridge c={c} steps={c.d.bridge.steps} />
        ) : (
          <p className="text-[12px]" style={{ color: SUB }}>No sales in this selection, so there is no margin to bridge.</p>
        )}
      </ChartPanel>
      <BridgeDrawer c={c} dr={dr} />
    </>
  );
}

function BridgeDrawer({ c, dr }: { c: ExecCtx; dr: DrawerCtl }) {
  const steps = c.d.bridge.steps;
  const anyGained = steps.some((s) => s.kind === "delta" && gained(s));
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab}
      eyebrow="Executive overview" title={`${TITLE} · ${c.where}`}
      source="computed" asOf={c.asOf} filters={filterChips(c, { counted: "rupees" })}
      tabs={[
        {
          key: "detail", label: "Detail", render: () => (
            <>
              <DrawerSection title="Each step" note={`Exact rupees, from the margin earned to the margin with every switch, as the API sends them: each part missed adds to the margin earned.${anyGained ? " A part below zero earned more than its switch would have, so it takes away instead." : ""}`}>
                <ExactTable rows={steps} rowKey={(s) => s.key} caption={`Margin bridge, ${c.where}`}
                  columns={[
                    { label: "Step", value: (s) => s.label, text: true },
                    { label: "Amount", value: (s) => (s.kind === "delta" ? withSign(s.value, rupeesExact) : rupeesExact(s.value)), raw: (s) => s.value, unit: "₹", strong: true },
                    { label: "Worked out on", value: (s) => (s.source === "purchases" ? "purchases (goods receipts)" : "sales lines"), text: true },
                  ]} empty="No sales in this selection, so there is no margin to bridge." />
              </DrawerSection>
              <DrawerSection title="Read it with"><p className="text-[12.5px] leading-relaxed" style={{ color: SUB }}>{c.d.bridge.note}</p></DrawerSection>
              <LinkButton onClick={() => c.go(PAGES.spend.href)}>Open {PAGES.spend.name}</LinkButton>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Read top to bottom: the margin there would have been with every switch HCG suggests, less the cash &amp; TPA margin missed, the scheme saving missed and the out-of-formulary margin missed, is the margin earned on sales (MRP − cost). Each total bar starts at zero; each part floats from where the bar above ended.</p>
                <p>A part can be below zero: at some units the out-of-formulary brands bought earned more margin than the suggested ones. That part adds to the margin earned instead of taking from it, so it is labelled with a plus and drawn as a gain, and its amount keeps its minus sign in the table.</p>
                <p>This bridge is the selection&apos;s whole sales (every payer under the Patients and Material filters). The Spend summary&apos;s bridge covers the cash &amp; TPA patients&apos; margin (with out of formulary) alone and leaves the scheme saving out, so its ends are smaller.</p>
                <p>Cash &amp; TPA and scheme are worked out on the same sales lines at HCG&apos;s FY list prices, out of formulary on purchases (goods receipts) of the same months, drawn in its own colour. So the top bar is an indication, not one ledger. A part with no figures for this selection is left out and named below the table.</p>
                <p>The bridge is in rupees whatever the Value ↔ {QUANTITY} switch says.</p>
              </MethodText>
              <HowBuilt c={c} />
            </>
          ),
        },
      ]} />
  );
}
