"use client";
// Revenue & margin by month: IP and OP sales at MRP stacked into one bar per month from zero, the
// margin % a line riding the bar tops, each point labelled (HCG's "on top of the bar"). Every
// sales month is drawn whatever the Month filter says, the selected one shaded; the hospital and
// the other filters apply. Rupees on either basis: the bars are revenue, and margin has no units
// version. The drawer has every month exactly, with compliance beside it. Revenue is MRP, as the
// Revenue & margin page this panel links to names it.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { MonthCombo, type ComboMonth, type ComboSeries } from "@/components/portfolio/ledger/charts";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { isNum, lakhs, pct, pts, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import { ExactTable, HowBuilt, IP_COL, MethodText, OP_COL, PAGES, QUANTITY, RATE_COL, RUPEES_ONLY, filterChips, inSelection, unitsExact, type ExecCtx } from "./shared";
import type { TrendRow } from "./api";

const TITLE = "Revenue & margin by month";

function comboOf(c: ExecCtx): { series: ComboSeries[]; months: ComboMonth[] } {
  const t = c.d.scope.type;
  // Inpatient at the bottom: it is most of the sales, so OP sits on top where it reads.
  const series: ComboSeries[] = [
    ...(t !== "OP" ? [{ key: "IP", label: "IP", color: IP_COL }] : []),
    ...(t !== "IP" ? [{ key: "OP", label: "OP", color: OP_COL }] : []),
  ];
  const months: ComboMonth[] = c.d.trend.map((r) => ({
    key: r.period, label: r.label, pct: r.margin_pct,
    selected: inSelection(c, r.period),
    // A month with no sales in this selection has no bar, rather than a bar of zero.
    values: r.mrp ? { IP: r.ip_mrp, OP: r.op_mrp } : { IP: null, OP: null },
  }));
  return { series, months };
}

export function TrendTile({ c, place }: { c: ExecCtx; place: Place }) {
  const dr = useDrawer();
  const { series, months } = comboOf(c);
  const label = `${TITLE}, IP and OP at MRP with the margin %, ${c.where}: `
    + c.d.trend.map((r) => `${r.label} ${lakhs(r.mrp)}, margin ${pct(r.margin_pct, 1)}`).join("; ");
  return (
    <>
      <ChartPanel id="trend" title={TITLE} context={`${c.where}${c.units ? ` · ${RUPEES_ONLY}` : ""}`} accent={IP_COL}
        place={place} label={label} onOpen={() => dr.show("month")} onInfo={() => dr.show("method")}>
        <MonthCombo ariaLabel={`${TITLE}, with the margin % riding the bar tops, ${c.where}`} series={series} months={months}
          line={{ label: "Margin %", color: RATE_COL, decimals: 1 }} />
      </ChartPanel>
      <TrendDrawer c={c} dr={dr} />
    </>
  );
}

/** A month's change from the month before in the list, or null without both. */
const diffOf = (rows: TrendRow[], get: (r: TrendRow) => number | null) => (r: TrendRow): number | null => {
  const i = rows.indexOf(r);
  const a = get(r), b = i > 0 ? get(rows[i - 1]) : null;
  return isNum(a) && isNum(b) ? a - b : null;
};

function TrendDrawer({ c, dr }: { c: ExecCtx; dr: DrawerCtl }) {
  const { series, months } = comboOf(c);
  const rows = c.d.trend;
  const span = rows.length ? `${rows[0].label} – ${rows[rows.length - 1].label}` : "—";
  const mrpDiff = diffOf(rows, (r) => r.mrp);
  const pctDiff = diffOf(rows, (r) => r.margin_pct);
  // On the Quantity basis the formulary page's compliance is worked out on units sold.
  const compliance = c.units ? "Compliance (units)" : "Compliance";
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow="Executive overview" title={`${TITLE} · ${c.where}`}
      source="computed" asOf={c.asOf} filters={filterChips(c, { months: `${span} (every sales month)`, counted: "mixed" })}
      tabs={[
        {
          key: "month", label: "By month", render: () => (
            <>
              <DrawerSection title="IP and OP sales, with the margin %" note="Bars from ₹0, IP below OP; the line joins the bar tops and each point is that month's margin %.">
                <MonthCombo ariaLabel={`${TITLE}, ${c.where}`} series={series} months={months} line={{ label: "Margin %", color: RATE_COL, decimals: 2 }} height={300} />
              </DrawerSection>
              <DrawerSection title="Every month" note="Exact rupees, as the group's sheets carry them; shaded = your selection.">
                <ExactTable rows={rows} rowKey={(r) => r.period} caption={`Sales and margin by month, ${c.where}`}
                  selected={(r) => inSelection(c, r.period)}
                  columns={[
                    { label: "Month", value: (r) => r.label, text: true },
                    { label: "IP revenue", value: (r) => rupeesExact(r.ip_mrp), raw: (r) => r.ip_mrp, unit: "₹" },
                    { label: "OP revenue", value: (r) => rupeesExact(r.op_mrp), raw: (r) => r.op_mrp, unit: "₹" },
                    { label: "Revenue (MRP)", value: (r) => rupeesExact(r.mrp), raw: (r) => r.mrp, unit: "₹", strong: true },
                    { label: "Change, ₹", value: (r) => withSign(mrpDiff(r), rupeesExact), raw: mrpDiff, unit: "₹" },
                    { label: "Cost", value: (r) => rupeesExact(r.cost), raw: (r) => r.cost, unit: "₹" },
                    { label: "Margin", value: (r) => rupeesExact(r.margin), raw: (r) => r.margin, unit: "₹" },
                    { label: "Margin %", value: (r) => pct(r.margin_pct), raw: (r) => r.margin_pct, unit: "%", strong: true },
                    { label: "Change, pts", value: (r) => withSign(pctDiff(r), (v) => pts(v)), raw: pctDiff, unit: "pts" },
                    { label: compliance, value: (r) => pct(r.compliance_pct), raw: (r) => r.compliance_pct, unit: "%" },
                    { label: "Units sold", value: (r) => unitsExact(r.qty), raw: (r) => r.qty, unit: "units" },
                  ]} empty="No sales months in this selection." />
              </DrawerSection>
              <LinkButton onClick={() => c.go(PAGES.revenue.href)}>Open {PAGES.revenue.name}</LinkButton>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>One bar per sales month from zero: inpatient (IP) sales at MRP at the bottom, outpatient (OP) on top, so the bar is the month&apos;s whole sales. The line joins the bar tops; each point is labelled with that month&apos;s margin % (margin ÷ MRP, where margin = MRP − cost price, both summed first). There is one scale, rupees; the % is read from its labels, never from a second axis.</p>
                <p>Every sales month is drawn whatever the Month filter says; the month selected is shaded. The hospital, Patients and Material type apply. Compliance in the table is the formulary page&apos;s pooled figure for the same month and filters{c.units ? `, worked out on units sold on the ${QUANTITY} basis (so it is not the rupee figure)` : ""}.</p>
                <p>Revenue and margin are rupees whatever the Value ↔ {QUANTITY} switch says; units sold are in the table.</p>
              </MethodText>
              <HowBuilt c={c} />
            </>
          ),
        },
      ]} />
  );
}
