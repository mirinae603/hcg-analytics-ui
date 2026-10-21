"use client";
// Brand rules — HCG's guidelines card. Every compliance MIS mail lists the same eight guidelines
// (the spend mail repeats the first six). Each one is shown with the brand-rule measure(s) that
// put a rupee figure on it for the current selection, so the reader sees the guideline, how
// much spend goes against it, and what that is a share of. Guidelines 7 and 8 are HCG's
// commentary, with no measure of their own.
import React from "react";
import Link from "next/link";
import { Card, Head, INK, SUB, RULE } from "@/components/portfolio/ledger/kit";
import { inr, pct } from "@/lib/kpiFormat";
import { OOF_COL, VERDICT, RATE_COL } from "./parts";
import { filterParams, inRatioOf, useOverview, type Filters, type RuleMeasure, type RulesOverview } from "./api";

type Guideline = {
  n: number;
  text: string;
  /** brand_rules.csv measure keys that measure this guideline (skipped if the API lacks one). */
  measures: string[];
  /** Also show all-payer out-of-formulary spend (from the Overview's headline). */
  oof?: boolean;
  link?: { href: string; label: string };
  note?: string;
};

// HCG's wording, from the compliance MIS mails (every one carries the same list).
const GUIDELINES: Guideline[] = [
  { n: 1, text: "Use low-cost brands for Government Scheme patients.", measures: ["restricted_scheme", "preferred_scheme"],
    link: { href: "/spend?section=scheme", label: "Scheme saving missed (Spend)" } },
  { n: 2, text: "Use high-margin brands for Cash and TPA patients to optimize profitability.", measures: ["scheme_brand_cash_tpa"],
    link: { href: "/spend?section=cash", label: "Cash & TPA margin lost (Spend)" } },
  { n: 3, text: "Restricted brands must not be used for either Scheme or Cash patients.", measures: ["restricted_scheme", "restricted_cash_tpa"] },
  { n: 4, text: "Strictly avoid the use of Out-of-Formulary brands.", measures: ["oof_scheme"], oof: true },
  { n: 5, text: "Formulary-preferred brands should not be used for Scheme patients.", measures: ["preferred_scheme"] },
  { n: 6, text: "Identify and closely monitor consultants prescribing Out-of-Formulary and Restricted brands to Scheme patients and take necessary steps to reduce such usage.",
    measures: ["restricted_scheme", "oof_scheme"],
    note: "Pick either measure: its Doctors table (below the brands) is the consultant-wise view." },
  { n: 7, text: "Increased usage of Out-of-Formulary and Restricted brands appears to be a key contributor to the lower compliance levels.",
    measures: [], oof: true,
    note: "HCG's own compliance formula counts restricted brands (FORMULARYR, FORMULARYR-OPD) inside Formulary (A) — in its S5 Summary sheet the FORMULARY* rows add up to the A column. So restricted use does not lower the compliance %; only out-of-formulary spend does." },
  { n: 8, text: "Strengthening adherence to formulary guidelines across all patient categories can help achieve budget targets and improve cost efficiency.",
    measures: [],
    note: "Commentary — no figure of its own. Compliance against HCG's budget is on the Overview tab (Budget vs Actual)." },
];

export default function Guidelines({ d, filters, plant, selected, onPick }: {
  d: RulesOverview; filters: Filters; plant: string; selected: string; onPick: (measure: string) => void;
}) {
  // All-payer out-of-formulary spend and compliance for the same selection (guidelines 4 and 7):
  // the Overview's own answer, so the figure is the one the Overview tab shows with Payer = All.
  const { data: ov } = useOverview({ Plant: plant, ...filterParams({ ...filters, payer: "ALL" }, { method: true }) });
  const byKey = new Map(d.measures.map((m) => [m.measure, m]));
  const h = ov?.headline;

  return (
    <Card delay={120}>
      <Head label="HCG guidelines"
        note="The eight guidelines in every HCG compliance MIS mail (the spend mail repeats 1–6), each with the measure that puts a figure on it for this selection. Shares are of all drug spend in the selection, every payer, as HCG divides them. Click a measure to open its trend, hospitals, brands and doctors below."
        badge={`drug spend ${inr(d.drug_spend.total)}`} />
      <ol className="flex flex-col">
        {GUIDELINES.map((g) => {
          const ms = g.measures.map((k) => byKey.get(k)).filter((m): m is RuleMeasure => !!m);
          return (
            <li key={g.n} className="grid gap-3 py-3" style={{ gridTemplateColumns: "26px minmax(0,1fr)", borderTop: g.n > 1 ? `1px solid ${RULE}` : undefined }}>
              <span className="w-[22px] h-[22px] rounded-full inline-flex items-center justify-center text-[11px] font-bold tabular-nums"
                style={{ color: INK, border: `1px solid ${RULE}` }}>{g.n}</span>
              <div className="min-w-0">
                <div className="text-[12.5px] leading-snug" style={{ color: INK }}>{g.text}</div>
                {(ms.length > 0 || g.oof || g.link) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ms.map((m) => <MeasureChip key={m.measure} m={m} base={d.drug_spend.total} active={m.measure === selected} onClick={() => onPick(m.measure)} />)}
                    {g.oof && h && (
                      <span className="inline-flex flex-wrap items-baseline gap-x-1.5 rounded-[10px] px-2.5 py-1.5 text-[11.5px] tabular-nums"
                        style={{ border: `1px solid ${RULE}`, color: SUB }}>
                        <span className="font-semibold" style={{ color: OOF_COL }}>Out of formulary, every payer</span>
                        <b style={{ color: INK }}>{inr(h.out_of_formulary)}</b>
                        <span>· compliance <b style={{ color: RATE_COL }}>{pct(h.compliance_pct, 2)}</b> of {inr(inRatioOf(h))} (formulary + out of formulary)</span>
                      </span>
                    )}
                    {g.link && (
                      <Link href={g.link.href} className="inline-flex items-center rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-semibold hover:bg-[#F5F1E7]"
                        style={{ border: `1px solid ${RULE}`, color: INK }}>
                        {g.link.label} →
                      </Link>
                    )}
                  </div>
                )}
                {g.note && <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: SUB }}>{g.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function MeasureChip({ m, base, active, onClick }: { m: RuleMeasure; base: number; active: boolean; onClick: () => void }) {
  const v = VERDICT[m.verdict] ?? VERDICT.info;
  return (
    <button type="button" onClick={onClick} title={`${m.label} — ${v.label.toLowerCase()} (${v.note})${m.rule_ref ? ` · ${m.rule_ref}` : ""}`}
      className="inline-flex flex-wrap items-baseline gap-x-1.5 rounded-[10px] px-2.5 py-1.5 text-[11.5px] tabular-nums text-left transition-colors hover:bg-[#F5F1E7]"
      style={{ border: `1px solid ${active ? INK : RULE}`, color: SUB, background: active ? "#fff" : undefined }}>
      <span className="text-[9.5px] font-bold uppercase" style={{ color: v.color, letterSpacing: ".06em" }}>{v.label}</span>
      <span className="font-semibold" style={{ color: INK }}>{m.label}</span>
      <b style={{ color: INK }}>{inr(m.cost)}</b>
      <span>· {pct(m.share_pct, 2)} of {inr(base)}</span>
    </button>
  );
}
