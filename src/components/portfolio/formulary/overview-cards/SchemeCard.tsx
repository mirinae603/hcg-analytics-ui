"use client";
// Scheme & restricted brands: the drawer the "within formulary" rows of the drug spend panel
// open. The restricted and preferred brands billed to GOV scheme patients, and the restricted
// brands billed to cash & TPA patients, each with its share of the drug spend of all payers; the
// onco / non-onco split in exact rupees and the way to the Scheme brands tab.
import React from "react";
import DetailDrawer, { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import { JADE_DEEP, INK, SUB, RULE } from "@/components/portfolio/ledger/kit";
import { pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { LinkButton, RATE_COL } from "../parts";
import { HowBuilt, MethodText, filterChips, type OverviewScope } from "./shared";
import type { Overview as OverviewData, SchemeBlock, View } from "../api";

/** Restricted and preferred brands are formulary classes: a part of formulary spend, so they
 *  take a deeper shade of the formulary jade. */
export const SCHEME_COL = JADE_DEEP;

type Kind = "restricted" | "preferred" | "restricted_cash_tpa";
const KINDS: { key: Kind; label: string; classes: string; payer: string }[] = [
  { key: "restricted", label: "Restricted for scheme", classes: "FORMULARYR + FORMULARYR-OPD", payer: "GOV schemes" },
  { key: "preferred", label: "Preferred for scheme", classes: "FORMULARYP", payer: "GOV schemes" },
  { key: "restricted_cash_tpa", label: "Restricted, cash & TPA", classes: "FORMULARYR + FORMULARYR-OPD", payer: "cash and insurance (TPA) patients" },
];

/** The scheme figures the API sent; the cash & TPA one is absent from an older API. */
export function blocksOf(scheme: OverviewData["scheme"]) {
  return KINDS.flatMap((k) => {
    const b = scheme[k.key];
    return b ? [{ ...k, b }] : [];
  });
}

export function SchemeDrawer({ s, open, first, onClose }: { s: OverviewScope; open: boolean; first?: string; onClose: () => void }) {
  const sc = s.d.scheme;
  const go = (v: View) => { onClose(); s.onOpen(v); };
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={first}
      eyebrow="Scheme brands · Overview" title={`Scheme & restricted brands · ${s.where}`}
      kpi={{ value: rupeesExact(sc?.restricted?.cost), comparator: `restricted for scheme · ${pct(sc?.restricted?.share_pct)} of drug spend` }}
      source="computed" asOf={s.asOf}
      filters={filterChips(s, { payer: "GOV, or cash & TPA, per figure", method: false })}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title="Key figures"
                note={sc?.base ? <>Each share is the value ÷ the drug spend of all payers in this selection, {rupeesExact(sc.base.all)} (onco {rupeesExact(sc.base.onco)}, non-onco {rupeesExact(sc.base.non_onco)}); the onco and non-onco shares use that segment&apos;s own drug spend.</> : undefined}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  {sc && blocksOf(sc).map((k) => <SchemeFigure key={k.key} label={k.label} classes={k.classes} payer={k.payer} b={k.b} />)}
                </div>
              </DrawerSection>
              <DrawerSection title="GOV-billed drug spend" note="Every drug billed to GOV schemes, of which the restricted and preferred brands above are a part.">
                <div className="text-[17px] font-bold tabular-nums" style={{ color: INK }}>{rupeesExact(sc?.gov_total)}</div>
              </DrawerSection>
              <DrawerSection title="Brand by brand">
                <LinkButton onClick={() => go("scheme")}>Scheme brands</LinkButton>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Restricted for scheme = drugs in the FORMULARYR and FORMULARYR-OPD classes billed to GOV schemes; preferred for scheme = FORMULARYP billed to GOV schemes. Only GOV-billed lines count for these two, whatever the Payer filter says.</p>
                <p>Restricted, cash &amp; TPA = the same restricted classes billed to cash and insurance (TPA) patients: HCG&apos;s third brand figure.</p>
                <p>All three are formulary classes, so they sit inside formulary spend and inside the compliance ratio. Their shares divide by the drug spend of every payer in the same selection, as HCG&apos;s report does.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}

function SchemeFigure({ label, classes, payer, b }: { label: string; classes: string; payer: string; b: SchemeBlock }) {
  return (
    <div className="min-w-0 pl-3" style={{ borderLeft: `1px solid ${RULE}` }}>
      <div className="text-[10.5px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".08em" }}>{label}</div>
      <div className="text-[17px] font-bold tabular-nums mt-1" style={{ color: INK }}>{rupeesExact(b.cost)}</div>
      <div className="text-[11.5px] tabular-nums" style={{ color: RATE_COL }}>{pct(b.share_pct)} of drug spend, all payers</div>
      <div className="mt-2 space-y-0.5 text-[11.5px] tabular-nums" style={{ color: SUB }}>
        <div>Onco <b style={{ color: INK }}>{rupeesExact(b.onco?.cost)}</b> · {pct(b.onco?.share_pct)} of onco</div>
        <div>Non-onco <b style={{ color: INK }}>{rupeesExact(b.non_onco?.cost)}</b> · {pct(b.non_onco?.share_pct)} of non-onco</div>
        <div>{num(b.lines)} lines · {classes}, billed to {payer}</div>
      </div>
    </div>
  );
}
