"use client";
// Spend Summary — the drawers its panels open: HCG's "click a chart, see the detailed summary".
// Each opens on a written summary, then the month trend, every hospital, the splits and the
// method; the full brand and doctor tables stay in the sections, one link away.
//
//   SectionDrawer  — Cash & TPA, out of formulary or scheme, from the section's own overview.
//   CombinedDrawer — HCG's 'CASH(TPA) & OUT OF FORMULARY' table and its months.
//   LossByMonth    — the month chart the margin-loss panel and the combined drawer share.
import React from "react";
import { INK } from "@/components/portfolio/ledger/kit";
import { MonthCombo } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, KeyFigures, type DrawerTab } from "@/components/portfolio/ledger/DetailDrawer";
import { DELTA_THRESHOLD } from "@/components/portfolio/ledger/status";
import { pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { monthBefore, monthLabel } from "../../formulary/api";
import { MonthTable } from "../Trend";
import type { CashOverview, Filters, Meta, WithOof } from "../api";
import { RATE_COL, lossMethod } from "../shared";
import {
  KIND, filterChips, marginLoss, whenOf, whereOf,
  type LossKind, type MonthLoss, type SectionLoss,
} from "./model";
import { GoLinks, HospitalShares, LossTable, LossTrend, MethodText, sectionLinks, type Go } from "./pieces";

/** Exact rupees, as the drawers print every amount. */
const rx = rupeesExact;

const EVERY_FIGURE = "Every figure is summed for the selection and the % is taken once: never an average of hospital or monthly percentages.";

const NONE: Record<LossKind, string> = {
  cash: "no cash or TPA patient got a brand that HCG's cash list has a suggestion for.",
  oof: "no cash or TPA patient got an out-of-formulary brand with a formulary match.",
  scheme: "no scheme patient got a brand that HCG's scheme list has a suggestion for.",
};
const LEAD: Record<LossKind, (h: SectionLoss["head"]) => string> = {
  cash: (h) => `cash & TPA patients got brands that earned ${rx(h.actual)} in margin, where the brands HCG's cash list suggests would have earned ${rx(h.proposed)}.`,
  oof: (h) => `out-of-formulary brands given to cash & TPA patients earned ${rx(h.actual)} in margin, where the formulary brand of the same molecule, strength and form would have earned ${rx(h.proposed)}.`,
  scheme: (h) => `scheme (GOV) patients got brands that cost ${rx(h.actual)}, where the cheaper brands HCG's scheme list suggests would have cost ${rx(h.proposed)}.`,
};

const count = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;

/** The drawer's written summary. Words around figures the API sent, so it cannot disagree
 *  with the chart that opened it. */
function brief(sec: SectionLoss, where: string, when: string, prev: MonthLoss | null): string[] {
  const h = sec.head, w = KIND[sec.kind];
  if (h.pct == null && h.loss === 0) return [`${where}, ${when}: ${NONE[sec.kind]}`];
  const out = [`${where}, ${when}: ${LEAD[sec.kind](h)} The margin missed is ${rx(h.loss)}, ${pct(h.pct, 2)} ${w.pctOf}.`];
  if (prev) {
    const d = h.loss - prev.loss;
    out.push(Math.abs(d) < DELTA_THRESHOLD.rs
      ? `That is unchanged from ${prev.label} (${rx(prev.loss)}).`
      : `That is ${d > 0 ? "up" : "down"} ${rx(Math.abs(d))} from ${prev.label} (${rx(prev.loss)}, ${pct(prev.pct, 2)}).`);
  }
  out.push(`It comes from ${count(h.brands, "brand", "brands")}, used by ${count(h.doctors, "doctor", "doctors")} at ${count(h.hospitals, "hospital", "hospitals")}.`);
  if (sec.kind === "oof") out.push("This is the app's estimate: the formulary brand each one is set against is the app's own match until HCG sends its list.");
  return out;
}

// The method in the words the section's own drawers use (lossMethod), on the price list the
// section reads: the scheme list for scheme, the cash & TPA price list otherwise.
const methodOf = (kind: LossKind, meta: Meta) =>
  lossMethod(kind, kind === "scheme" ? meta.scheme_list?.financial_year : meta.cash_list?.financial_year);
function method(kind: LossKind, meta: Meta): string[] {
  const m = methodOf(kind, meta);
  return [m.basis, m.formula, EVERY_FIGURE];
}

export function SectionDrawer({ sec, meta, filters, open, initialTab, onClose, onGo, extraTabs = [] }: {
  sec: SectionLoss; meta: Meta; filters: Filters; open: boolean; initialTab?: string; onClose: () => void; onGo: Go;
  /** Tabs only this section has (scheme: its Attis and Healthium slices), after the Summary. */
  extraTabs?: DrawerTab[];
}) {
  const w = KIND[sec.kind];
  const h = sec.head;
  const where = whereOf(sec.scope), when = whenOf(meta, sec.scope);
  const prev = monthBefore(sec.trend, sec.scope.months);
  const whole = w.whole === "proposed" ? h.proposed : h.actual;
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={initialTab}
      eyebrow={`Spend summary · ${w.short}`} title={`${w.title} · ${where}`}
      kpi={{
        value: rx(h.loss),
        comparator: `${w.loss}: ${pct(h.pct, 2)} ${w.pctOf}, ${rx(whole)}`,
        delta: prev ? { value: h.loss - prev.loss, unit: "rs", goodWhen: "down", vsLabel: `vs ${prev.label}` } : undefined,
      }}
      source={w.source} asOf={sec.asOf} filters={filterChips(meta, filters, sec.scope, w.payer)}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title="In brief">
                <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>{brief(sec, where, when, prev).map((t, i) => <p key={i}>{t}</p>)}</div>
              </DrawerSection>
              <DrawerSection title="Key figures" note="Exact rupees, as HCG's sheets carry them.">
                <KeyFigures figures={[
                  { label: w.actual, value: rx(h.actual) },
                  { label: w.proposed, value: rx(h.proposed) },
                  { label: w.loss, value: rx(h.loss), note: `${pct(h.pct, 2)} ${w.pctOf}` },
                  ...sec.facts,
                ]} />
              </DrawerSection>
              <DrawerSection title="Full tables" note="Every brand and every doctor behind these figures, with the same filters.">
                <GoLinks links={sectionLinks(sec.kind)} onGo={onGo} />
              </DrawerSection>
            </>
          ),
        },
        ...extraTabs,
        {
          key: "trend", label: "Trend", render: () => (
            <DrawerSection title="Every month" note="Every published month, whatever the Month filter says; the months in your selection are shaded.">
              <LossTrend kind={sec.kind} months={sec.trend} selected={sec.scope.months} where={where} />
            </DrawerSection>
          ),
        },
        {
          key: "hospitals", label: "Hospitals", render: () => (
            <DrawerSection title="Every hospital, most missed first"
              note={`Each bar is the hospital's ${w.whole === "proposed" ? w.proposed.toLowerCase() : w.actual.toLowerCase()}, split into the ${w.loss.toLowerCase()} and its ${w.whole === "proposed" ? w.actual.toLowerCase() : w.proposed.toLowerCase()}, as the section draws it; the figure after it is the loss. Same months, patient type and material type; this list ignores the hospital selector. Click a hospital to select it, the selected one again for all hospitals.`}>
              <HospitalShares kind={sec.kind} rows={sec.hospitals} />
            </DrawerSection>
          ),
        },
        {
          key: "breakdown", label: "Breakdown", render: () => (
            <>{sec.splits.map((s) => (
              <DrawerSection key={s.key} title={s.title} note={s.note}><LossTable rows={s.rows} words={w} /></DrawerSection>
            ))}</>
          ),
        },
        { key: "method", label: "Method", render: () => <MethodText lines={method(sec.kind, meta)} notes={sec.notes} /> },
      ]} />
  );
}

/** HCG's combined cash & out-of-formulary loss by month as bars from zero, each part its own
 *  bar (they are added only in HCG's own table, never stacked here), with the % missed of both
 *  together as the line. Before the out-of-formulary table is built, cash & TPA alone. The
 *  legend's words are short enough to share a panel's header line. */
export function LossByMonth({ d, meta }: { d: CashOverview; meta: Meta }) {
  const w = d.with_oof;
  const sel = new Set(d.scope?.months || []);
  const label = (r: { period: string; label: string }) => r.label || monthLabel(meta, r.period);
  const months = w
    ? (w.trend || []).map((r) => ({ key: r.period, label: label(r), pct: r.loss_pct, selected: sel.has(r.period), values: { cash: r.cash_loss, oof: r.oof_loss } }))
    : (d.trend || []).map((r) => ({ key: r.period, label: label(r), pct: r.loss_pct, selected: sel.has(r.period), values: { cash: r.margin_loss } }));
  return (
    <MonthCombo ariaLabel={`${w ? "Cash & TPA and out-of-formulary" : "Cash & TPA"} margin missed by month, with the % missed of the margin possible${w ? " (both together)" : ""} as a line, ${whereOf(d.scope)}`}
      series={[
        { key: "cash", label: `${KIND.cash.short} missed`, color: KIND.cash.accent },
        ...(w ? [{ key: "oof", label: `${KIND.oof.short} missed (estimated)`, color: KIND.oof.accent, hatched: true }] : []),
      ]}
      line={{ label: "% missed", color: RATE_COL, decimals: 1 }}
      months={months} />
  );
}

export function CombinedDrawer({ d, w, meta, filters, asOf, open, initialTab, onClose, onGo }: {
  d: CashOverview; w: WithOof; meta: Meta; filters: Filters; asOf: string | null; open: boolean; initialTab?: string; onClose: () => void; onGo: Go;
}) {
  const t = marginLoss(w.total);
  const where = whereOf(d.scope);
  const months = (w.trend || []).map((r) => ({ period: r.period, label: r.label || monthLabel(meta, r.period), ...marginLoss(r), cash_loss: r.cash_loss, oof_loss: r.oof_loss }));
  const prev = monthBefore(months, d.scope.months);
  const cov = w.coverage;
  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={initialTab}
      eyebrow="Spend summary · Cash & TPA and out of formulary" title={`CASH(TPA) & OUT OF FORMULARY · ${where}`}
      kpi={{
        value: rx(t.loss),
        comparator: `Margin missed: ${pct(t.pct, 2)} of the margin possible, ${rx(t.proposed)}`,
        delta: prev ? { value: t.loss - prev.loss, unit: "rs", goodWhen: "down", vsLabel: `vs ${prev.label}` } : undefined,
      }}
      source="estimate" asOf={asOf}
      filters={filterChips(meta, filters, d.scope, KIND.cash.payer)}
      tabs={[
        {
          key: "mail", label: "As in HCG mail", render: () => (
            <>
              <DrawerSection title="CASH(TPA) & OUT OF FORMULARY"
                note={`HCG's table: each margin added up over the two rows and the % taken on the totals. The out-of-formulary row is the app's estimate (${num(cov.matched_brands)} of ${num(cov.brands)} brands matched to a formulary brand, ${pct(cov.matched_cost_pct, 1)} of their bill cost).`}>
                <LossTable words={KIND.cash} strong={["total"]} rows={[
                  { key: "cash", label: KIND.cash.short, ...marginLoss(w.cash) },
                  { key: "oof", label: "Out of formulary (estimate)", ...marginLoss(w.oof) },
                  { key: "total", label: "Total", ...t },
                ]} />
              </DrawerSection>
              <DrawerSection title="Full tables">
                <GoLinks onGo={onGo} links={[
                  { label: `${KIND.cash.short} overview`, section: "cash", view: "overview" },
                  { label: `${KIND.oof.short} overview`, section: "oof", view: "overview" },
                ]} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "trend", label: "Trend", render: () => (
            <DrawerSection title="Every month" note="Every published month, whatever the Month filter says; the months in your selection are shaded.">
              <LossByMonth d={d} meta={meta} />
              <div className="mt-5">
                <MonthTable rows={months} selected={new Set(d.scope.months)} cols={[
                  { label: "Total margin earned", render: (r) => rx(r.actual) },
                  { label: "Total margin possible", render: (r) => rx(r.proposed) },
                  { label: "Cash & TPA missed", render: (r) => rx(r.cash_loss) },
                  { label: "Out of formulary missed", render: (r) => rx(r.oof_loss) },
                  { label: "Total margin missed", render: (r) => <b>{rx(r.loss)}</b> },
                  { label: "% missed", render: (r) => pct(r.pct, 2) },
                ]} />
              </div>
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <MethodText lines={[
              w.note ?? "Cash & TPA and out of formulary together, as HCG's table shows them: each margin added up and the % taken on the totals.",
              `Cash & TPA: ${methodOf("cash", meta).formula}`,
              `Out of formulary: ${methodOf("oof", meta).basis} ${methodOf("oof", meta).formula}`,
              EVERY_FIGURE,
            ]} />
          ),
        },
      ]} />
  );
}
