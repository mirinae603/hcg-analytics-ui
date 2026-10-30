"use client";
// Spend Analysis (Generic vs branded) — the branded products a generic of the same product
// undercut, most first: each bar what the branded purchases cost above the cheapest generic, in
// branded's colour; under the brand, the generic that undercut it and its unit price (it can be
// one cheap purchase, or a generic outside the formulary, so it is always named). The drawer lists
// them with exact rupees and the originator companies.
import React from "react";
import { ChartPanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import { purchaseMonthLabel, type GenericTop } from "../api";
import { topTitle } from "../shared";
import { DataTable, type Col } from "../DataTable";
import { productName, unitPrice } from "../insights";
import { BRANDED_COL, GENERIC_SOURCE, Method, type Ctx } from "./context";

const brandsOf = (t: GenericTop) => (t.brands.length ? t.brands.join(", ") : productName(t));
const versus = (t: GenericTop) => (t.generic_desc ? `vs ${t.generic_desc} at ${unitPrice(t.generic_price)}` : "no generic named");

function TopDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const h = c.d.headline;
  const all = c.d.top_molecules || [];
  type Ranked = { n: number; t: GenericTop };
  const cols: Col<Ranked>[] = [
    { label: "#", render: (x) => x.n, align: "left" },
    {
      label: "Branded product", align: "left", wrap: true, render: ({ t }) => (
        <span className="block min-w-0">
          <span className="block font-semibold" style={{ color: INK }}>{brandsOf(t)}</span>
          <span className="block text-[11px]" style={{ color: SUB }}>{productName(t)} · {t.companies.join(", ") || "company not named"}</span>
        </span>
      ),
    },
    { label: "Branded bought", render: ({ t }) => rupeesExact(t.branded_value) },
    { label: "Compared", render: ({ t }) => rupeesExact(t.compared_value) },
    { label: "Above the generic", render: ({ t }) => <b>{rupeesExact(t.extra_vs_generic)}</b> },
    { label: "% above", render: ({ t }) => pct(t.extra_vs_generic_pct) },
    { label: "Share", render: ({ t }) => pct(t.share_pct, 1) },
    {
      label: "Cheapest generic", align: "left", wrap: true, render: ({ t }) => (
        t.generic_desc ? (
          <span className="block min-w-0">
            <span className="block" style={{ color: INK }}>{t.generic_desc}</span>
            <span className="block text-[11px]" style={{ color: SUB }}>{unitPrice(t.generic_price)} a unit{t.generic_period ? ` · ${purchaseMonthLabel(c.months, t.generic_period)}` : ""}</span>
          </span>
        ) : "—"
      ),
    },
    { label: "Hospitals", render: ({ t }) => num(t.plants) },
  ];
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.extra_vs_generic), comparator: `branded above the cheapest generic, ${pct(h.extra_vs_generic_pct)} of the ${rupeesExact(h.compared_value)} branded value compared, ${c.when}` }}
      source={GENERIC_SOURCE} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "top", label: all.length > 1 ? `Top ${all.length}` : "Products", render: () => (
            <DrawerSection title="Branded products a generic of the same product undercut"
              note={`Share = the product's part of the ${rupeesExact(h.extra_vs_generic)} branded purchases cost above the cheapest generic in this selection. The cheapest generic is of the latest month in the selection; it can be one cheap purchase or a generic outside the formulary, so check it before switching.`}>
              <DataTable rows={all.map((t, i) => ({ n: i + 1, t }))} rowKey={(x) => x.t.molecule_key} cols={cols}
                caption="Branded products by what they cost above the cheapest generic" minWidth={1100} empty="No branded product had a cheaper generic in this selection." />
            </DrawerSection>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>{c.w.extraNote}</p>
              <p>Each product&apos;s bar runs from zero on one scale; under the brand, the generic it was set against and that generic&apos;s unit price.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function TopBrandedTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const all = c.d.top_molecules || [];
  const title = topTitle(all.length, "branded products with a cheaper generic");
  return (
    <>
      <ChartPanel id="top" title={title} context={c.context} accent={BRANDED_COL} place={place} source={GENERIC_SOURCE}
        label={[title, c.context, ...all.slice(0, 5).map((t, i) => `${i + 1}. ${brandsOf(t)}: ${lakhs(t.extra_vs_generic)} above the cheapest generic, ${versus(t)}`)].join(". ")}
        onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={BRANDED_COL} ariaLabel={`${title}, ${c.context}`} empty="No branded product had a cheaper generic in this selection."
          rows={all.map((t) => ({
            key: t.molecule_key, label: brandsOf(t), sub: versus(t),
            value: t.extra_vs_generic, valueLabel: lakhs(t.extra_vs_generic), aside: `${pct(t.extra_vs_generic_pct, 1)} above`,
          }))} />
      </ChartPanel>
      <TopDrawer c={c} dr={dr} title={title} />
    </>
  );
}
