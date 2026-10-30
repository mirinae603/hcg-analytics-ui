"use client";
// Spend Analysis (Out of formulary) — the switches worth the most: each out-of-formulary brand
// bought → the brand suggested for it, ranked by margin missed as bars from zero, with where the
// suggestion came from under it (HCG's sheet or list; "Estimated" and hatched where it is the
// app's own match). The drawer carries HCG's "Top 10 materials list contribution in margin
// missed" with exact rupees and the way to every brand and vendor.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import { GRID_COLS, type Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB } from "@/components/portfolio/ledger/kit";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { num } from "@/lib/kpiFormat";
import type { OofSwitch, View } from "../api";
import { OOF_SOURCE, topTitle } from "../shared";
import { DataTable, type Col } from "../DataTable";
import { BRAND_COL, GAIN_SHARE_NOTE, Method, SourceTag, gainShare, sourceText, type Ctx } from "./context";

/** HCG's report lists ten; the tile shows the ones that fit and the drawer all of them. */
const SAID = 5;

export const brandOf = (r: Pick<OofSwitch, "material" | "material_desc">) => r.material_desc ?? r.material;
export const switchOf = (r: Pick<OofSwitch, "suggested_material" | "suggested_desc">) => r.suggested_desc ?? r.suggested_material ?? "—";
const shareText = (r: OofSwitch) => gainShare(r.share_of_total_pct);

type Ranked = { n: number; r: OofSwitch };

/** A list of switches with exact rupees: the brand bought → the suggested brand, where the
 *  suggestion came from, and the margins. Shared with the "brand bought earns more" drawer. */
export function SwitchTable({ rows, caption, empty }: { rows: OofSwitch[]; caption: string; empty?: string }) {
  const cols: Col<Ranked>[] = [
    { label: "#", render: (x) => x.n, align: "left" },
    {
      label: "Brand bought → suggested brand", align: "left", wrap: true, render: ({ r }) => (
        <span className="block min-w-0">
          <span className="block font-semibold" style={{ color: INK }} title={`${brandOf(r)} (${r.material})`}>{brandOf(r)}</span>
          <span className="block text-[11px] font-normal" style={{ color: SUB }}>
            → <span style={{ color: INK }}>{switchOf(r)}</span>{r.minor_group ? ` · ${r.minor_group}` : ""}
          </span>
        </span>
      ),
    },
    { label: "Suggested by", align: "left", render: ({ r }) => <SourceTag by={r.suggested_by} rule={r.rule} /> },
    { label: "Units", render: ({ r }) => num(r.qty) },
    { label: "Spent", render: ({ r }) => rupeesExact(r.purchase_value) },
    { label: "Margin earned", render: ({ r }) => rupeesExact(r.actual_margin) },
    { label: "Margin possible", render: ({ r }) => rupeesExact(r.potential_margin) },
    { label: "Margin missed", render: ({ r }) => <b>{rupeesExact(r.margin_loss)}</b> },
    { label: "% missed", render: ({ r }) => pct(r.loss_pct) },
    { label: "Share", render: ({ r }) => pct(r.share_of_total_pct, 1) },
  ];
  return <DataTable rows={rows.map((r, i) => ({ n: i + 1, r }))} rowKey={(x) => `${x.r.material}|${x.r.suggested_by}|${x.r.suggested_material}`}
    cols={cols} caption={caption} minWidth={1000} empty={empty} />;
}

function SwitchesDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const all = c.d.top_items || [];
  const h = c.d.headline;
  const goTo = (v: View) => { dr.close(); c.onOpen(v); };
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.margin_loss), comparator: `margin missed across ${num(h.brands)} brands bought, ${c.when}` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "top", label: all.length > 1 ? `Top ${all.length}` : "Brands", render: () => (
            <>
              <DrawerSection title={all.length > 1 ? `The ${all.length} switches with the most margin missed` : "Switches with a margin missed"}
                note={`${GAIN_SHARE_NOTE} The net margin missed is ${rupeesExact(h.margin_loss)}. "Suggested by" says where the suggested brand comes from; Estimated is the app's own match.`}>
                <SwitchTable rows={all} caption={`${title} by margin missed`} />
              </DrawerSection>
              <DrawerSection title="Every brand and vendor">
                <div className="flex flex-wrap gap-2">
                  <LinkButton onClick={() => goTo("items")}>All brands</LinkButton>
                  <LinkButton onClick={() => goTo("vendors")}>By vendor</LinkButton>
                </div>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>The brands bought out of formulary whose suggested brand would have earned the most more, for the same units: margin earned = units × (MRP excl GST − the price paid); margin possible = the same units × the suggested brand&apos;s (MRP excl GST − HCG Pharma price); margin missed = possible − earned; share = the switch&apos;s part of what switching would gain in the selection (the margin missed where the suggested brand earns more).</p>
              <p>On the chart each switch&apos;s margin missed is a bar from zero on one scale, in the brands&apos; colour; a hatched bar is a suggestion the app matched itself (Estimated). Under the brand: its molecule and where the suggestion came from.</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function SwitchesTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const all = c.d.top_items || [];
  const title = topTitle(all.length, "brands to switch");
  // A panel half the grid wide or more names both brands on the row; a narrower one puts the
  // suggested brand on the second line.
  const wide = place.span >= GRID_COLS / 2;
  const source = all.some((r) => r.estimated) ? OOF_SOURCE.estimate : c.source;
  return (
    <>
      <ChartPanel id="brands" title={title} context={c.context} accent={BRAND_COL} place={place} source={source}
        label={[
          title, c.context,
          ...all.slice(0, SAID).map((r, i) => `${i + 1}. ${brandOf(r)}, switch to ${switchOf(r)} (${sourceText(r)}): ${lakhs(r.margin_loss)} missed${shareText(r) ? `, ${shareText(r)}` : ""}`),
          `${num(c.d.headline.brands)} brands bought in all`,
        ].join(". ")}
        onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={BRAND_COL} signed ariaLabel={`${title} by margin missed, ${c.context}`} empty="No brand bought with a suggested brand in this selection."
          rows={all.map((r) => ({
            key: `${r.material}|${r.suggested_by}|${r.suggested_material}`,
            label: wide ? `${brandOf(r)} → ${switchOf(r)}` : brandOf(r),
            sub: [wide ? null : `→ ${switchOf(r)}`, r.minor_group, sourceText(r)].filter(Boolean).join(" · "),
            value: r.margin_loss, valueLabel: lakhs(r.margin_loss), aside: shareText(r), hatched: r.estimated,
          }))} />
      </ChartPanel>
      <SwitchesDrawer c={c} dr={dr} title={title} />
    </>
  );
}
