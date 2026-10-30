"use client";
// Spend Analysis (Out of formulary) — the vendors (the GRN's goods supplier) the out-of-formulary
// brands with the most margin missed came from, as bars from zero, each vendor in the next hue
// of the validated series (vendors have no hue of their own). Purchases have no doctor: the
// vendor is who to follow up with. A vendor is the supplier by name: one supplier can hold several
// SAP codes (one per region), counted once, its codes under its name.
// The drawer lists HCG's top ten with exact rupees and opens the Vendors tab, where each vendor
// drills to its brands.
import React from "react";
import { ChartPanel, LinkButton } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars } from "@/components/portfolio/ledger/bars";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SERIES, SUB, seriesCol } from "@/components/portfolio/ledger/kit";
import { lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import type { OofVendor, View } from "../api";
import { codesText, plural, topTitle } from "../shared";
import { DataTable, type Col } from "../DataTable";
import { GAIN_SHARE_NOTE, OOF_COL, Method, gainShare, type Ctx } from "./context";

const SAID = 5;

const vendorOf = (v: OofVendor) => v.vendor_name || v.vendor;
/** Under a bar: the one code, or how many a supplier holds (the drawer lists them). */
const codesShort = (v: OofVendor) => v.vendor_codes.length === 1 ? codesText(v.vendor_codes) : plural(v.vendor_codes.length, "SAP code");
const shareText = (v: OofVendor) => gainShare(v.share_of_total_pct);

type Ranked = { n: number; v: OofVendor };

function VendorsDrawer({ c, dr, title }: { c: Ctx; dr: DrawerCtl; title: string }) {
  const all = c.d.top_vendors || [];
  const h = c.d.headline;
  const goTo = (v: View) => { dr.close(); c.onOpen(v); };
  const cols: Col<Ranked>[] = [
    { label: "#", render: (x) => x.n, align: "left" },
    {
      label: "Vendor", align: "left", wrap: true, render: ({ v }) => (
        <span className="block min-w-0">
          <span className="block font-semibold" style={{ color: INK }}>{vendorOf(v)}</span>
          <span className="block text-[11px]" style={{ color: SUB }}>{codesText(v.vendor_codes)} · {plural(v.brands, "brand")} · {plural(v.hospitals, "hospital")}</span>
        </span>
      ),
    },
    { label: "Spent", render: ({ v }) => rupeesExact(v.purchase_value) },
    { label: "Margin earned", render: ({ v }) => rupeesExact(v.actual_margin) },
    { label: "Margin possible", render: ({ v }) => rupeesExact(v.potential_margin) },
    { label: "Margin missed", render: ({ v }) => <b>{rupeesExact(v.margin_loss)}</b> },
    { label: "% missed", render: ({ v }) => pct(v.loss_pct) },
    { label: "Share", render: ({ v }) => pct(v.share_of_total_pct, 1) },
    { label: "No alternative", render: ({ v }) => rupeesExact(v.no_alternative_value) },
  ];
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow={`${c.w.section} · Overview`} title={`${title} · ${c.where}`}
      kpi={{ value: rupeesExact(h.margin_loss), comparator: `margin missed across ${plural(h.vendors, "vendor")}, ${c.when}` }}
      source={c.source} asOf={c.asOf} filters={c.chips}
      tabs={[
        {
          key: "top", label: all.length > 1 ? `Top ${all.length}` : "Vendors", render: () => (
            <>
              <DrawerSection title={all.length > 1 ? `The ${all.length} vendors with the most margin missed` : "Vendors with a margin missed"}
                note={`${GAIN_SHARE_NOTE} The net margin missed is ${rupeesExact(h.margin_loss)}. No alternative = what was bought from the vendor of brands with no suggested brand (shown, not counted).`}>
                <DataTable rows={all.map((v, i) => ({ n: i + 1, v }))} rowKey={(x) => x.v.vendor} cols={cols}
                  caption={`${title} by margin missed`} minWidth={900} />
              </DrawerSection>
              <DrawerSection title="Every vendor" note="The Vendors tab lists them all, searchable; click a vendor there to see the brands bought from it.">
                <LinkButton onClick={() => goTo("vendors")}>All vendors</LinkButton>
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <Method c={c}>
              <p>A vendor is the GRN&apos;s goods supplier by name: one supplier can hold several SAP codes (one per region), and they count as one vendor. Each vendor&apos;s margin missed is summed over the out-of-formulary brands bought from it, net as HCG counts it.</p>
              <p>On the chart each vendor&apos;s margin missed is a bar from zero on one scale; the vendors take the series colours in order, so each bar can be told apart (their names say who they are).</p>
            </Method>
          ),
        },
      ]} />
  );
}

export function VendorsTile({ c, place }: { c: Ctx; place: Place }) {
  const dr = useDrawer();
  const all = c.d.top_vendors || [];
  const title = topTitle(all.length, "vendors by margin missed");
  return (
    <>
      <ChartPanel id="vendors" title={title} context={c.context} accent={OOF_COL} place={place} source={c.source}
        label={[
          title, c.context,
          ...all.slice(0, SAID).map((v, i) => `${i + 1}. ${vendorOf(v)} (${codesText(v.vendor_codes)}): ${lakhs(v.margin_loss)} missed${shareText(v) ? `, ${shareText(v)}` : ""}`),
          `${plural(c.d.headline.vendors, "vendor")} in all`,
        ].join(". ")}
        onOpen={() => dr.show("top")} onInfo={() => dr.show("method")}>
        <RankBars format={lakhs} color={seriesCol(0)} signed ariaLabel={`${title}, ${c.context}`} empty="No vendor in this selection."
          // One series hue each: as many vendors as the series has hues; the drawer lists the rest.
          rows={all.slice(0, SERIES.length).map((v, i) => ({
            key: v.vendor, label: vendorOf(v), sub: `${codesShort(v)} · ${plural(v.brands, "brand")}`,
            value: v.margin_loss, valueLabel: lakhs(v.margin_loss), aside: shareText(v), color: seriesCol(i),
          }))} />
      </ChartPanel>
      <VendorsDrawer c={c} dr={dr} title={title} />
    </>
  );
}
