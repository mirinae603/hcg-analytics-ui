"use client";
// Onco vs non-onco: the drawer the onco and non-onco rows of the compliance panel open. Each
// segment's own compliance against the month before, the exact amounts behind each ratio, the
// same split by patient type, and the method. HCG budgets the two together (pooled), so the
// segments carry no budget of their own.
import React from "react";
import DetailDrawer, { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB, LINE, RULE } from "@/components/portfolio/ledger/kit";
import { isNum, pct, pts, withSign } from "@/components/portfolio/ledger/format";
import { HowBuilt, MethodText, SplitRows, filterChips, type OverviewScope } from "./shared";

type SegmentView = { key: string; label: string; now: number | null; before: number | null };

export function SegmentsDrawer({ s, open, first, onClose }: { s: OverviewScope; open: boolean; first?: string; onClose: () => void }) {
  const { d, prev } = s;
  const rows = (d.segments || []).map((g): SegmentView => ({
    key: g.key, label: g.label, now: g.compliance_pct,
    before: prev?.data?.segments?.find((p) => p.key === g.key)?.compliance_pct ?? null,
  }));
  // Why there is no change to show: several months are selected, or the first one is.
  const noCompare = prev ? null : (d.scope?.months?.length ?? 0) > 1
    ? "Pick one month to compare with the month before."
    : "No month before this one to compare with.";

  return (
    <DetailDrawer open={open} onClose={onClose} initialTab={first}
      eyebrow="Formulary compliance · Overview" title={`Onco and non-onco · ${s.where}`}
      source="computed" asOf={s.asOf} filters={filterChips(s)}
      tabs={[
        {
          key: "segments", label: "Onco vs non-onco", render: () => (
            <>
              <DrawerSection title={prev ? `Against ${prev.label}` : "Each segment"} note={noCompare ?? undefined}>
                <CompareTable rows={rows} now={s.when} before={prev?.label ?? null} />
              </DrawerSection>
              <DrawerSection title="The spend behind each ratio">
                <SplitRows rows={(d.segments || []).map((g) => ({ key: g.key, label: g.label, s: g }))} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "type", label: "IP vs OP", render: () => (
            <DrawerSection title="Inpatient vs outpatient" note="The same ratio per patient type, by the selected method.">
              <SplitRows rows={(d.by_type || []).map((t) => ({ key: t.type, label: t.type === "IP" ? "Inpatient (IP)" : t.type === "OP" ? "Outpatient (OP)" : t.type, s: t }))} />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Each segment&apos;s ratio is its own Formulary ÷ (Formulary + Out of formulary). Pooled ({pct(d.headline.pooled_pct)}) adds the two segments&apos; amounts before dividing: HCG&apos;s current method. The mean of the two ratios ({pct(d.headline.mean_pct)}) was its earlier one.</p>
                <p>HCG&apos;s budget is set for the pooled figure, so the segments are compared with the month before, not with a budget. On the Overview they are dots in ink on the compliance panel&apos;s axis, which does not start at zero; the grey tick is the month before.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}

/** Each segment's compliance, and beside it the month before and the change when there is one. */
function CompareTable({ rows, now, before }: { rows: SegmentView[]; now: string; before: string | null }) {
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase text-right whitespace-nowrap";
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <caption className="sr-only">Onco and non-onco compliance, {now}{before ? ` against ${before}` : ""}</caption>
        <thead>
          <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
            <th scope="col" className={`${th} text-left`} style={{ letterSpacing: ".08em" }}>Segment</th>
            <th scope="col" className={th} style={{ letterSpacing: ".08em" }}>{now}</th>
            {before && <th scope="col" className={th} style={{ letterSpacing: ".08em" }}>{before}</th>}
            {before && <th scope="col" className={th} style={{ letterSpacing: ".08em" }}>Change</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ borderBottom: `1px solid ${LINE}` }}>
              <th scope="row" className="px-3 py-2 text-[12.5px] font-semibold text-left" style={{ color: INK }}>{r.label}</th>
              <td className="px-3 py-2 text-[12.5px] font-bold tabular-nums text-right" style={{ color: INK }}>{pct(r.now)}</td>
              {before && <td className="px-3 py-2 text-[12.5px] tabular-nums text-right" style={{ color: SUB }}>{pct(r.before)}</td>}
              {before && (
                <td className="px-3 py-2 text-[12.5px] tabular-nums text-right" style={{ color: INK }}>
                  {isNum(r.now) && isNum(r.before) ? withSign(r.now - r.before, pts) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
