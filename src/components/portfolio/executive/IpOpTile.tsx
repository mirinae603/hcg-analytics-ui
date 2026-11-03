"use client";
// IP vs OP: inpatient and outpatient sales as a donut, the whole in its centre, each part's share
// (the API's), sales and margin % beside it. On the Quantity basis the split is of units sold and
// the centre counts them; the margin % stays a rupee ratio. A slice opens the drawer. With no
// sales in the selection there is no split to draw, and the panel says so instead of a grey ring.
//
// The drawer has the same sales split the other way too: by material type and formulary bucket,
// the treemap of where the money goes (TreemapView), which the one-screen page has no room for on
// its face.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { Donut, type DonutSlice } from "@/components/portfolio/ledger/donut";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { SUB } from "@/components/portfolio/ledger/kit";
import { isNum, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { ExactTable, HowBuilt, IP_COL, MethodText, OP_COL, PAGES, QUANTITY, filterChips, kpiShort, sizeShort, unitsExact, type ExecCtx } from "./shared";
import { TREEMAP_TITLE, TreemapMethod, TreemapView } from "./TreemapView";

const TITLE = "IP vs OP";
const TYPE_COL: Record<string, string> = { IP: IP_COL, OP: OP_COL };
/** Each part's name beside the ring: the title already says IP and OP, and a quarter of a
 *  1280px screen has no room for "Outpatient (OP)". The drawer keeps the API's names. */
const FACE_LABEL: Record<string, string> = { IP: "Inpatient", OP: "Outpatient" };

function slicesOf(c: ExecCtx): DonutSlice[] {
  return c.d.ip_op.map((r) => ({
    key: r.type, label: FACE_LABEL[r.type] ?? r.label, share: r.share_pct, color: TYPE_COL[r.type] ?? IP_COL,
    valueLabel: sizeShort(c.units ? r.qty : r.mrp, c.units), note: `margin ${pct(r.margin_pct, 1)}`,
  }));
}

export function IpOpTile({ c, place }: { c: ExecCtx; place: Place }) {
  const dr = useDrawer();
  const slices = slicesOf(c);
  const sales = c.kpi("sales");
  // The whole as the slices print their parts (units sold in lakhs on the Quantity basis), and
  // "Revenue", not "Revenue (MRP)": the ring's hole on a narrow tile has room for one word.
  const centre = { value: sales ? (c.units ? sizeShort(sales.value, true) : kpiShort(sales, sales.value)) : "—", label: c.units ? "Units sold" : "Revenue" };
  const split = slices.some((s) => isNum(s.share) && s.share > 0);
  const label = split
    ? `${TITLE}, ${c.context}: ${slices.map((s) => `${s.label} ${pct(s.share, 1)}, ${s.valueLabel}, ${s.note}`).join("; ")}`
    : `${TITLE}, ${c.context}: no sales in this selection`;
  return (
    <>
      <ChartPanel id="ip-op" title={TITLE} context={c.units ? "of units sold" : "of revenue"} accent={IP_COL} place={place}
        label={label} interactive={split} onOpen={() => dr.show("detail")} onInfo={() => dr.show("method")}>
        {split
          ? <Donut slices={slices} centre={centre} ariaLabel={`${TITLE}, ${c.context}`} onSlice={() => dr.show("detail")} />
          : <p className="text-[12px]" style={{ color: SUB }}>No sales in this selection, so there is no IP and OP split.</p>}
      </ChartPanel>
      <IpOpDrawer c={c} dr={dr} />
    </>
  );
}

function IpOpDrawer({ c, dr }: { c: ExecCtx; dr: DrawerCtl }) {
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab}
      eyebrow="Executive overview" title={`Inpatient and outpatient · ${c.where}`}
      source="computed" asOf={c.asOf} filters={filterChips(c, { counted: "mixed" })}
      tabs={[
        {
          key: "detail", label: "Detail", render: () => (
            <>
              <DrawerSection title="IP and OP" note={`Exact rupees; the share is of revenue at MRP, or of units sold on the ${QUANTITY} basis.`}>
                <ExactTable rows={c.d.ip_op} rowKey={(r) => r.type} caption={`IP and OP, ${c.context}`}
                  columns={[
                    { label: "Patients", value: (r) => r.label, text: true },
                    { label: "Revenue (MRP)", value: (r) => rupeesExact(r.mrp), raw: (r) => r.mrp, unit: "₹", strong: !c.units },
                    { label: "Margin", value: (r) => rupeesExact(r.margin), raw: (r) => r.margin, unit: "₹" },
                    { label: "Margin %", value: (r) => pct(r.margin_pct), raw: (r) => r.margin_pct, unit: "%", strong: true },
                    { label: "Units sold", value: (r) => unitsExact(r.qty), raw: (r) => r.qty, unit: "units", strong: c.units },
                    { label: c.units ? "Share of units" : "Share of revenue", value: (r) => pct(r.share_pct), raw: (r) => r.share_pct, unit: "%" },
                  ]} empty="No sales in this selection." />
              </DrawerSection>
              <LinkButton onClick={() => c.go(PAGES.revenue.href)}>Open {PAGES.revenue.name}</LinkButton>
            </>
          ),
        },
        { key: "money", label: TREEMAP_TITLE, render: () => <TreemapView c={c} /> },
        {
          key: "method", label: "Method", render: () => (
            <>
              <DrawerSection title="IP vs OP">
                <MethodText>
                  <p>The ring splits the selection&apos;s pharmacy sales between inpatients (IP) and outpatients (OP), by MRP on the Value basis and by units sold on the {QUANTITY} basis; the centre is the whole. Each part&apos;s share is the server&apos;s, and its margin % is margin ÷ MRP, a rupee ratio on either basis.</p>
                  <p>With the Patients filter on IP or OP, the other part has nothing to show.</p>
                </MethodText>
              </DrawerSection>
              <DrawerSection title={TREEMAP_TITLE}><TreemapMethod c={c} /></DrawerSection>
              <HowBuilt c={c} />
            </>
          ),
        },
      ]} />
  );
}
