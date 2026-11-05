"use client";
// Revenue & margin — the headline panel: HCG's ask in one place. Outpatient (OP) and inpatient
// (IP) revenue at MRP, the margin (MRP − cost) and the margin % (margin ÷ MRP), each with its
// change since the month before; under them how the revenue splits between IP and OP. The
// drawer carries the figures in sentences and in exact rupees, every month, the IP / OP table
// and the method.
//
// The figures are money whatever the Value ↔ Quantity switch says (units add vials and tablets
// together): under Units the panel keeps rupees and says so.
import React from "react";
import { TbReportMoney } from "react-icons/tb";
import { ChartPanel, LinkButton, usePanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { PartBar } from "@/components/portfolio/ledger/bars";
import { DeltaChip, deltaText, type DeltaProps } from "@/components/portfolio/ledger/KpiCard";
import DetailDrawer, { DrawerSection, KeyFigures, useDrawer, type DrawerCtl, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { Swatch } from "@/components/portfolio/ledger/legend";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, pct, pts, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import {
  IP_COL, OP_COL, MARGIN_COL, RATE_COL, RUPEES_ONLY, TYPE_COL, TYPE_LONG, BlockTable, HowBuilt, MethodText, MonthTable, NoSales,
  atWhere, blankCostWords, changeOf, deltaOf, filterChips, ptsChange, unitsExact, type RevScope,
} from "./shared";
import type { Block, TypeKey, TypeRow } from "./api";

/** One figure on the face: its key, its name, the figure and its change. */
type Fig = { key: string; label: string; color: string; value: string; delta?: DeltaProps; said: string };

/** The patient type's row of by_type; null when the API leaves it out. */
function typeRow(s: RevScope, t: TypeKey): TypeRow | null {
  return (s.d.by_type ?? []).find((r) => r.type === t) ?? null;
}

/** The type's revenue the month before: that month's trend row, same filters. */
function typeBefore(s: RevScope, t: TypeKey): number | null {
  const r = s.prev?.row;
  return r ? (t === "IP" ? r.ip : r.op).mrp : null;
}

function figures(s: RevScope): Fig[] {
  const h = s.d.headline;
  const p = s.prev;
  // OP first, as HCG asks for it ("OPD and IP revenue"); a type the Patients filter leaves
  // out is not shown at all rather than as a zero.
  const byType: Fig[] = (["OP", "IP"] as TypeKey[]).filter((t) => s.types.includes(t)).map((t) => {
    const v = typeRow(s, t)?.mrp ?? null;
    const delta = p ? deltaOf(v, typeBefore(s, t), "rs", p.label) : undefined;
    return { key: t, label: `${t} revenue`, color: TYPE_COL[t], value: lakhs(v), delta, said: `${TYPE_LONG[t]} revenue ${lakhs(v)}` };
  });
  return [
    ...byType,
    { key: "margin", label: "Margin", color: MARGIN_COL, value: lakhs(h.margin), delta: p ? deltaOf(h.margin, p.block.margin, "rs", p.label) : undefined, said: `Margin ${lakhs(h.margin)}` },
    {
      key: "pct", label: "Margin %", color: RATE_COL, value: pct(h.margin_pct),
      delta: p ? deltaOf(h.margin_pct, p.block.margin_pct, "pts", p.label) : undefined, said: `Margin ${pct(h.margin_pct)} of MRP`,
    },
  ];
}

/** How much room the IP / OP bar needs under the figures: the bar, its key line and its note. */
const SPLIT_H = 64;
/** A figure row's height. */
const ROW_H = 28;

function Face({ s, figs }: { s: RevScope; figs: Fig[] }) {
  const room = usePanel()?.size.h ?? Infinity;
  const both = s.types.length === 2;
  const ip = typeRow(s, "IP"), op = typeRow(s, "OP");
  const showBar = both && room >= figs.length * ROW_H + SPLIT_H;
  return (
    <div className="flex flex-col h-full">
      <dl className="flex-shrink-0">
        {figs.map((f) => (
          <div key={f.key} className="grid items-center gap-x-2.5" style={{ gridTemplateColumns: "minmax(0,1fr) auto auto", height: ROW_H }}>
            <dt className="inline-flex items-center gap-1.5 min-w-0 text-[12px]" style={{ color: SUB }}>
              <Swatch color={f.color} />
              <span className="truncate">{f.label}</span>
            </dt>
            <dd className="text-[20px] font-bold tabular-nums text-right leading-none" style={{ color: INK, letterSpacing: "-.02em" }}>{f.value}</dd>
            <dd className="text-right min-w-0">{f.delta ? <DeltaChip {...f.delta} /> : null}</dd>
          </div>
        ))}
      </dl>
      {both && (showBar ? (
        <div className="mt-auto pt-1.5">
          <PartBar ariaLabel={`Revenue by patient type, ${s.context}`} whole={`${lakhs(s.d.headline.mrp)} revenue, IP + OP`}
            parts={[
              { key: "IP", label: "IP", share: ip?.share_pct ?? null, valueLabel: lakhs(ip?.mrp), color: IP_COL },
              { key: "OP", label: "OP", share: op?.share_pct ?? null, valueLabel: lakhs(op?.mrp), color: OP_COL },
            ]} />
        </div>
      ) : (
        <p className="mt-auto pt-1 truncate text-[11.5px] tabular-nums" style={{ color: SUB }}>
          Revenue split · IP <b style={{ color: INK }}>{pct(ip?.share_pct, 1)}</b> · OP <b style={{ color: INK }}>{pct(op?.share_pct, 1)}</b>
        </p>
      ))}
    </div>
  );
}

export function HeadlineTile({ s, place }: { s: RevScope; place: Place }) {
  const dr = useDrawer();
  const h = s.d.headline;
  const figs = figures(s);
  const title = "Revenue and margin";
  const context = `${s.context}${s.basis === "qty" ? ` · ${RUPEES_ONLY}` : ""}`;
  const label = h.lines
    ? [`${title}, ${s.context}`, ...figs.map((f) => [f.said, f.delta ? deltaText(f.delta) : null].filter(Boolean).join(", "))].join(". ")
    : `${title}, ${s.context}. No pharmacy sales in this selection.`;
  return (
    <>
      <ChartPanel id="headline" title={title} context={context} icon={TbReportMoney} place={place} label={label}
        onOpen={() => dr.show("summary")} onInfo={() => dr.show("method")}>
        {h.lines ? <Face s={s} figs={figs} /> : <NoSales s={s} />}
      </ChartPanel>
      <HeadlineDrawer s={s} dr={dr} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer
// ─────────────────────────────────────────────────────────────────────────────
/** The headline in sentences: figures from the API, words around them. */
function brief(s: RevScope): string[] {
  const h = s.d.headline;
  if (!h.lines) return [`${atWhere(s)}: no pharmacy sales for this selection.`];
  const parts = s.types.length === 2
    ? (["IP", "OP"] as TypeKey[]).map((t) => { const r = typeRow(s, t); return `${rupeesExact(r?.mrp)} ${t === "IP" ? "inpatient" : "outpatient"} (${t}, ${pct(r?.share_pct, 1)})`; }).join(" and ")
    : null;
  const p = s.prev;
  const lines = [
    `${atWhere(s)}, pharmacy sales came to ${rupeesExact(h.mrp)} at MRP${parts ? `: ${parts}` : ""}.`,
    `They cost ${rupeesExact(h.cost)}, so the margin is ${rupeesExact(h.margin)}, ${pct(h.margin_pct)} of MRP.`,
  ];
  if (p) {
    const dm = h.mrp - p.block.mrp;
    const dp = isNum(h.margin_pct) && isNum(p.block.margin_pct) ? h.margin_pct - p.block.margin_pct : null;
    lines.push(`In ${p.label} sales were ${rupeesExact(p.block.mrp)} with a margin of ${pct(p.block.margin_pct)}: revenue is ${dm >= 0 ? "up" : "down"} ${rupeesExact(Math.abs(dm))}${dp != null ? ` and the margin % ${dp >= 0 ? "up" : "down"} ${pts(Math.abs(dp))}` : ""}.`);
  }
  const blank = blankCostWords(h);
  if (blank) lines.push(`${blank}, as the group's sheet does, so that MRP shows in full as margin.`);
  return lines;
}

function keyFigures(s: RevScope): KeyFigure[] {
  const h = s.d.headline;
  const p = s.prev;
  return [
    { label: "Revenue (MRP)", value: rupeesExact(h.mrp), note: "total MRP of the sales lines" },
    ...s.types.map((t): KeyFigure => {
      const r = typeRow(s, t);
      return { label: `${t} revenue`, value: rupeesExact(r?.mrp), color: TYPE_COL[t], note: `${pct(r?.share_pct)} of revenue · margin ${pct(r?.margin_pct)}` };
    }),
    { label: "Cost", value: rupeesExact(h.cost), note: "cost price of the same lines" },
    { label: "Margin", value: rupeesExact(h.margin), color: MARGIN_COL, note: "MRP − cost" },
    { label: "Margin %", value: pct(h.margin_pct), color: RATE_COL, note: "margin ÷ MRP" },
    { label: "Units sold", value: unitsExact(h.qty), note: `${num(h.lines)} sales lines` },
    ...(h.cost_missing_lines ? [{ label: "Blank cost price", value: `${num(h.cost_missing_lines)} lines`, note: `MRP ${rupeesExact(h.mrp_cost_missing)}, counted as cost 0` }] : []),
    ...(p ? [
      { label: `Revenue ${p.label}`, value: rupeesExact(p.block.mrp), note: `change ${withSign(h.mrp - p.block.mrp, rupeesExact)}` },
      { label: `Margin % ${p.label}`, value: pct(p.block.margin_pct), note: isNum(h.margin_pct) && isNum(p.block.margin_pct) ? `change ${ptsChange(h.margin_pct - p.block.margin_pct)}` : undefined },
    ] : []),
  ];
}

function HeadlineDrawer({ s, dr }: { s: RevScope; dr: DrawerCtl }) {
  const h = s.d.headline;
  const p = s.prev;
  const totalOf = (b: Block) => ({ label: "IP + OP", b });
  const goItems = () => { dr.close(); s.onOpen("items"); };
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow="Revenue & margin · Overview" title={`Revenue and margin · ${s.where}`}
      kpi={{
        value: rupeesExact(h.mrp),
        comparator: `revenue · margin ${rupeesExact(h.margin)}, ${pct(h.margin_pct)}`,
        delta: p ? deltaOf(h.mrp, p.block.mrp, "rs", p.label) : undefined,
      }}
      source="computed" asOf={s.asOf} filters={filterChips(s)}
      tabs={[
        {
          key: "summary", label: "Summary", render: () => (
            <>
              <DrawerSection title="In brief">
                <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
                  {brief(s).map((t) => <p key={t}>{t}</p>)}
                </div>
              </DrawerSection>
              <DrawerSection title="Key figures" note="Exact rupees for the selection, as the group's sheets carry them.">
                <KeyFigures figures={keyFigures(s)} />
              </DrawerSection>
              <DrawerSection title="Behind the figures">
                <LinkButton onClick={goItems}>Every item, with its revenue and margin</LinkButton>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "month", label: "By month", render: () => (
            <MonthTable s={s} caption={`Revenue and margin by month, ${s.where}`} columns={[
              { key: "ip", label: "IP revenue", value: (r) => rupeesExact(r.ip.mrp) },
              { key: "op", label: "OP revenue", value: (r) => rupeesExact(r.op.mrp) },
              { key: "mrp", label: "Revenue", value: (r) => rupeesExact(r.mrp), strong: true },
              { key: "change", label: "Change", value: changeOf((r) => r.mrp, rupeesExact) },
              { key: "margin", label: "Margin", value: (r) => rupeesExact(r.margin) },
              { key: "pct", label: "Margin %", value: (r) => pct(r.margin_pct), strong: true },
              { key: "qty", label: "Units sold", value: (r) => num(r.qty) },
            ]} />
          ),
        },
        {
          key: "types", label: "IP and OP", render: () => (
            <DrawerSection title="Inpatient and outpatient" note="Each share is of the selection's revenue (MRP).">
              <BlockTable caption={`Revenue and margin by patient type, ${s.context}`}
                rows={(s.d.by_type ?? []).filter((r) => s.types.includes(r.type)).map((r) => ({
                  key: r.type, b: r, share: r.share_pct,
                  label: <span className="inline-flex items-center gap-1.5"><Swatch color={TYPE_COL[r.type]} />{TYPE_LONG[r.type]}</span>,
                }))}
                total={s.types.length > 1 ? totalOf(h) : undefined} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Revenue is the total MRP of the HIS pharmacy sales lines, IP and OP; margin is MRP less the cost price of the same lines; margin % is the margin ÷ the MRP. Amounts are summed for the selection first and the % taken once — never an average of hospitals&apos; or months&apos; percentages.</p>
                <p>Each change compares the month selected with the month before it, for the same hospital and filters; IP and OP compare with that month&apos;s IP and OP. Under &ldquo;All months&rdquo; and for the first published month there is nothing to compare with, so no change is shown.</p>
                <p>The bar under the figures splits the revenue between IP and OP, each part its share of the whole. These figures are rupees whatever the Value ↔ Quantity switch says.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}
