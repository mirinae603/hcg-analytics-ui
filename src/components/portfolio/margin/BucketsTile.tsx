"use client";
// Revenue & margin — by formulary bucket: HCG's four buckets (Formulary, Out of formulary,
// Non-formulary, Consumables; and Not in Item Master when a selection has any), each as a bar
// from zero in its own hue, inpatient and outpatient under their own captions, with the
// bucket's margin % beside its revenue. A bucket follows each month's own Item Master;
// consumables are their own bucket whatever their class.
//
// Under the Quantity switch the bars are units sold (a volume view); the margin % stays a ratio of
// rupees. The drawer lays the buckets out the way HCG's sheet reads (IP and OP side by side),
// then every figure per patient type, and the method.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { Swatch } from "@/components/portfolio/ledger/legend";
import { INK, SUB, LINE, RULE, SEL_BG } from "@/components/portfolio/ledger/kit";
import { pct, rupeesExact } from "@/components/portfolio/ledger/format";
import {
  ACCENT, RUPEES_ONLY, TYPE_LONG, BlockTable, HowBuilt, MethodText, NoSales, bucketCol, filterChips, sizeOf, sizeShort, sizeWord,
  type RevScope,
} from "./shared";
import type { Block, BucketRow, TypeKey } from "./api";

const blockOf = (b: BucketRow, t: TypeKey): Block => (t === "IP" ? b.ip : b.op);

/** The patient type's whole selection (by_type), or null when the API leaves it out. */
const typeBlock = (s: RevScope, t: TypeKey): Block | null => (s.d.by_type ?? []).find((r) => r.type === t) ?? null;

/** The buckets with sales for at least one patient type in the selection, in HCG's order. */
const bucketsOf = (s: RevScope): BucketRow[] => (s.d.by_bucket ?? []).filter((b) => s.types.some((t) => blockOf(b, t).lines > 0));

export function BucketsTile({ s, place }: { s: RevScope; place: Place }) {
  const dr = useDrawer();
  const buckets = bucketsOf(s);
  const word = sizeWord(s.basis).toLowerCase();
  const rows: RankRow[] = s.types.flatMap((t) => {
    const total = typeBlock(s, t);
    return buckets.filter((b) => blockOf(b, t).lines > 0).map((b): RankRow => {
      const x = blockOf(b, t);
      const v = sizeOf(x, s.basis);
      return {
        key: `${t}-${b.key}`, label: b.label, value: v, color: bucketCol(b.key),
        valueLabel: `${sizeShort(v, s.basis)} · ${pct(x.margin_pct, 1)}`,
        group: `${TYPE_LONG[t]}${total ? ` · ${sizeShort(sizeOf(total, s.basis), s.basis)}` : ""}`,
      };
    });
  });
  const title = `${sizeWord(s.basis)} by formulary bucket`;
  const label = [
    `${title}, ${s.context}, ${word} and margin %`,
    ...rows.map((r) => `${r.group}: ${r.label} ${r.valueLabel}`),
  ].join(". ");
  return (
    <>
      <ChartPanel id="buckets" title={title} context={`${s.context} · ${word} · margin %${s.basis === "qty" ? ` (${RUPEES_ONLY})` : ""}`}
        accent={ACCENT} place={place} label={label} onOpen={() => dr.show("buckets")} onInfo={() => dr.show("method")}>
        {rows.length
          ? <RankBars ariaLabel={`${title}, ${s.context}: ${word} with margin % beside it`} rows={rows} format={(v) => sizeShort(v, s.basis)} color={ACCENT} />
          : <NoSales s={s} />}
      </ChartPanel>
      <BucketsDrawer s={s} dr={dr} />
    </>
  );
}

/** HCG's layout: one row per bucket, IP and OP side by side (revenue and margin %), then both. */
function SideBySide({ s }: { s: RevScope }) {
  const buckets = bucketsOf(s);
  const h = s.d.headline;
  if (!buckets.length) return <NoSales s={s} />;
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap text-right";
  const td = "px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap";
  const typed = s.types;
  const cells = (b: Block, strong: boolean) => (
    <>
      <td className={td} style={{ color: INK, fontWeight: strong ? 700 : 500 }}>{rupeesExact(b.mrp)}</td>
      <td className={td} style={{ color: INK }}>{rupeesExact(b.margin)}</td>
      <td className={td} style={{ color: INK, fontWeight: 700 }}>{pct(b.margin_pct)}</td>
    </>
  );
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <caption className="sr-only">{`Revenue and margin by formulary bucket, ${typed.length > 1 ? "IP and OP" : TYPE_LONG[typed[0]]}, ${s.context}`}</caption>
        <thead>
          <tr style={{ color: SUB }}>
            <th scope="col" />
            {typed.map((t) => <th key={t} scope="colgroup" colSpan={3} className="px-3 pt-2 text-[10.5px] font-semibold uppercase text-center" style={{ letterSpacing: ".08em", borderBottom: `1px solid ${LINE}` }}>{TYPE_LONG[t]}</th>)}
            {typed.length > 1 && <th scope="colgroup" colSpan={3} className="px-3 pt-2 text-[10.5px] font-semibold uppercase text-center" style={{ letterSpacing: ".08em", borderBottom: `1px solid ${LINE}` }}>IP + OP</th>}
          </tr>
          <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
            <th scope="col" className="px-3 py-2 text-[10.5px] font-semibold uppercase text-left" style={{ letterSpacing: ".08em" }}>Bucket</th>
            {[...typed, ...(typed.length > 1 ? ["all"] : [])].flatMap((t) => ["Revenue", "Margin", "Margin %"].map((h) => (
              <th key={`${t}-${h}`} scope="col" className={th} style={{ letterSpacing: ".08em" }}>{h}</th>
            )))}
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key} style={{ borderBottom: `1px solid ${LINE}` }}>
              <th scope="row" className="px-3 py-2 text-[12px] text-left whitespace-nowrap" style={{ color: INK, fontWeight: 600 }}>
                <span className="inline-flex items-center gap-1.5"><Swatch color={bucketCol(b.key)} />{b.label}</span>
              </th>
              {typed.map((t) => <React.Fragment key={t}>{cells(blockOf(b, t), false)}</React.Fragment>)}
              {typed.length > 1 && cells(b, true)}
            </tr>
          ))}
          <tr style={{ background: SEL_BG }}>
            <th scope="row" className="px-3 py-2 text-[12px] text-left" style={{ color: INK, fontWeight: 700 }}>Total</th>
            {typed.map((t) => { const r = typeBlock(s, t); return <React.Fragment key={t}>{r ? cells(r, true) : <td colSpan={3} />}</React.Fragment>; })}
            {typed.length > 1 && cells(h, true)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BucketsDrawer({ s, dr }: { s: RevScope; dr: DrawerCtl }) {
  const buckets = bucketsOf(s);
  const h = s.d.headline;
  const goItems = () => { dr.close(); s.onOpen("items"); };
  // Under Patients = IP (or OP) the API's buckets hold that type only: the titles say so.
  const one = s.types.length === 1 ? TYPE_LONG[s.types[0]] : null;
  const label = (b: BucketRow) => <span className="inline-flex items-center gap-1.5"><Swatch color={bucketCol(b.key)} />{b.label}</span>;
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow="Revenue & margin · Overview" title={`Revenue by formulary bucket · ${s.where}`}
      kpi={{ value: rupeesExact(h.mrp), comparator: `revenue · margin ${pct(h.margin_pct)}` }}
      source="computed" asOf={s.asOf} filters={filterChips(s)}
      tabs={[
        {
          key: "buckets", label: "By bucket", render: () => (
            <>
              <DrawerSection title={one ?? "IP and OP side by side"} note="Exact rupees; each margin % is the bucket's margin ÷ its MRP.">
                <SideBySide s={s} />
              </DrawerSection>
              <DrawerSection title={`Every figure, ${one ?? "IP + OP"}`} note="Each share is of the selection's revenue (MRP).">
                <BlockTable caption={`Revenue and margin by formulary bucket, ${s.context}`}
                  rows={buckets.map((b) => ({ key: b.key, label: label(b), b, share: b.share_pct }))}
                  total={{ label: "All buckets", b: h }} />
              </DrawerSection>
              <DrawerSection title="Behind the figures">
                <LinkButton onClick={goItems}>The items in each bucket</LinkButton>
              </DrawerSection>
            </>
          ),
        },
        ...s.types.map((t) => ({
          key: t, label: TYPE_LONG[t], render: () => (
            <DrawerSection title={TYPE_LONG[t]} note={`Every figure for ${t} sales, exact rupees.`}>
              <BlockTable caption={`Revenue and margin by formulary bucket, ${TYPE_LONG[t]}, ${s.context}`} shareLabel={null}
                rows={buckets.map((b) => ({ key: b.key, label: label(b), b: blockOf(b, t) }))}
                total={typeBlock(s, t) ? { label: `All ${t}`, b: typeBlock(s, t) as Block } : undefined} />
            </DrawerSection>
          ),
        })),
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Every sales line is put in a bucket: a consumable (material category Consumables) is Consumables whatever its class; a drug is Formulary (group A of that month&apos;s Item Master, restricted, preferred and scheme classes included), Out of formulary (group B), Non-formulary (group C), or Not in Item Master when the month&apos;s master does not list it (shown only when a selection has any).</p>
                <p>Each bar runs from zero on one scale for every bucket and both patient types, in the bucket&apos;s own colour; inpatient and outpatient sit under their own captions, each with its total. Beside each figure is the bucket&apos;s margin % for that patient type (margin ÷ MRP, a ratio of its sums).</p>
                <p>Under the Quantity switch the bars count units sold (vials, tablets and bottles added together); the margin % stays a ratio of rupees.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}
