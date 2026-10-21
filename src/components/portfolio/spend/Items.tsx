"use client";
// Spend Analysis — Brands tab, for every section. Scheme: brands used for scheme (GOV) patients
// that HCG's scheme list would replace (it can narrow to HCG's Attis or J&J & Covidien ->
// Healthium slice). Cash & TPA: brands used for cash and insurance patients that
// HCG's cash list would replace with a higher-margin brand. Most money first; clicking a brand
// opens the doctors who prescribed it. The table's footer carries the column totals (the API's
// `sums`), and the header states the total the "Share of total" column divides by.
import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head, SUB } from "@/components/portfolio/ledger/kit";
import { inr } from "@/lib/kpiFormat";
import { Pills, SlideOver } from "../formulary/parts";
import { isMargin, sectionParams, useTableSums, type Filters, type Section } from "./api";
import { doctorCols } from "./Doctors";
import { SHARES_NOTE } from "../table/query";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// Margin missed and its % sit right after the two brand names, in HCG's words: for scheme
// patients the margin HCG loses is the extra it pays for the brand used (spent − with the
// suggested brand), the 'Margin missed' of HCG's Scheme Margin Loss table.
const schemeCols = (suggested: string): Col[] => [
  { field: "material_desc", label: "Brand used" },
  { field: "material", label: "Material" },
  { field: "suggested_desc", label: suggested },
  { field: "saving_missed", label: "Margin missed", kind: "inr" },
  { field: "saving_pct", label: "% missed", kind: "pct2" },
  { field: "category", label: "Category" },
  { field: "hcg_category", label: "FY class" },
  { field: "used_price", label: "Price used", kind: "inr" },
  { field: "suggested_price", label: `${suggested} price`, kind: "inr" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "used_value", label: "Spent", kind: "inr" },
  { field: "suggested_value", label: `With ${suggested.toLowerCase()}`, kind: "inr" },
  { field: "share_pct", label: "Share of total", kind: "pct2" },
  { field: "doctors", label: "Doctors", kind: "num" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
];

// Margin missed, its % and the two margins behind it come first after the brand names, in
// HCG's words (Actual / Margin possible, Margin missed); the unit prices and HCG's bifurcation
// working follow.
const CASH_COLS: Col[] = [
  { field: "material_desc", label: "Brand used" },
  { field: "material", label: "Material" },
  { field: "suggested_desc", label: "Suggested brand" },
  { field: "margin_loss", label: "Margin missed", kind: "inr" },
  { field: "loss_pct", label: "% missed", kind: "pct2" },
  { field: "actual_margin", label: "Margin earned", kind: "inr" },
  { field: "potential_margin", label: "Margin possible", kind: "inr" },
  { field: "category", label: "Category" },
  { field: "hcg_category", label: "FY class" },
  { field: "used_margin", label: "Margin / unit used", kind: "inr" },
  { field: "used_margin_pct", label: "Used margin %", kind: "pct2" },
  { field: "suggested_margin", label: "Margin / unit suggested", kind: "inr" },
  { field: "suggested_margin_pct", label: "Suggested margin %", kind: "pct2" },
  { field: "margin_gap", label: "Gap / unit", kind: "inr" },
  { field: "cash_qty", label: "Cash + TPA qty", kind: "num" },
  // HCG's bifurcation (S6): for a bifurcated brand HCG allows SHARING × the molecule group's
  // all-payer qty at the hospital; only the excess over that counts. Blank for other brands.
  { field: "bifurcated", label: "Bifurcated", kind: "bool" },
  { field: "sharing", label: "SHARING", kind: "num" },
  { field: "group_qty", label: "Group qty", kind: "num" },
  { field: "allowed_qty", label: "Allowed qty", kind: "num" },
  { field: "excess_qty", label: "Excess qty", kind: "num" },
  { field: "qty", label: "Qty counted", kind: "num" },
  { field: "share_pct", label: "Share of total", kind: "pct2" },
  { field: "doctors", label: "Doctors", kind: "num" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
];

// Out of formulary: each out-of-formulary brand given to cash & TPA patients, the formulary
// brand of the same molecule, strength and form it is set against (the app's match), and HCG's
// cash margins on the bill. Brands with no match come last, with their bill only.
const OOF_COLS: Col[] = [
  { field: "material_desc", label: "Out-of-formulary brand" },
  { field: "material", label: "Material" },
  { field: "suggested_desc", label: "Formulary brand" },
  { field: "margin_loss", label: "Margin missed", kind: "inr" },
  { field: "loss_pct", label: "% missed", kind: "pct2" },
  { field: "actual_margin", label: "Margin earned", kind: "inr" },
  { field: "potential_margin", label: "Margin possible", kind: "inr" },
  { field: "molecule", label: "Molecule" },
  { field: "matched", label: "Matched", kind: "bool" },
  { field: "candidates", label: "Formulary options", kind: "num" },
  { field: "suggested_category", label: "Formulary brand class" },
  { field: "category", label: "Category" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "actual_cost", label: "Bill cost", kind: "inr" },
  { field: "bill_mrp", label: "Bill MRP", kind: "inr" },
  { field: "used_gst", label: "GST %", kind: "num" },
  { field: "used_margin", label: "Margin / unit used", kind: "inr" },
  { field: "used_margin_pct", label: "Used margin %", kind: "pct2" },
  { field: "suggested_price", label: "Formulary brand price", kind: "inr" },
  { field: "suggested_mrp", label: "Formulary brand MRP", kind: "inr" },
  { field: "suggested_margin", label: "Margin / unit formulary", kind: "inr" },
  { field: "suggested_margin_pct", label: "Formulary margin %", kind: "pct2" },
  { field: "margin_gap", label: "Gap / unit", kind: "inr" },
  { field: "share_pct", label: "Share of total", kind: "pct2" },
  { field: "doctors", label: "Doctors", kind: "num" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
];

export const brandCols = (section: Section): Col[] =>
  section === "cash" ? CASH_COLS : section === "oof" ? OOF_COLS : schemeCols("Suggested brand");

type SchemeGroup = "ALL" | "attis" | "healthium";
const GROUPS: { key: SchemeGroup; label: string }[] = [
  { key: "ALL", label: "Every suggestion" },
  { key: "attis", label: "Attis brands" },
  { key: "healthium", label: "J&J & Covidien → Healthium" },
];

const NOTE: Record<Section, string> = {
  scheme: "Scheme (GOV) patients only. Spent = quantity × the brand's list price; With suggested = the same quantity × the price of the brand HCG's scheme list suggests (FY price list, excl GST); Margin missed = spend − with suggested (HCG's scheme margin missed); % missed = margin missed ÷ spend. Click a brand to see the doctors who prescribed it.",
  oof: "Cash and TPA patients only, brands the month's Item Master flags OUT OF FORMULARY. Formulary brand = the brand flagged FORMULARY with the same molecule (Item Master 'Minor Group'), strength and form, priced in HCG's CASH&TPA list, with the best margin — the app's own match until HCG sends its list; 'Formulary options' says how many such brands there were to choose from. Margin earned = the bill's MRP excl GST (GST of the formulary brand) − the bill's cost; Margin possible = the same qty × the formulary brand's margin per unit (MRP excl GST − HCG Pharma price); Margin missed = margin possible − margin earned; % missed = margin missed ÷ margin possible. Brands with no match are listed last, with their bill only. Click a matched brand to see the doctors who prescribed it.",
  cash: "Cash and TPA patients only. Margin earned = qty counted × the used brand's margin per unit; Margin possible = the same qty × the suggested brand's; Margin missed = margin possible − margin earned; % missed = margin missed ÷ margin possible (HCG's %). Margin per unit = MRP excl GST − HCG Pharma price (FY list) for the brand used and the suggested one; margin % = that margin ÷ MRP excl GST (HCG's S6 column). Qty counted is the cash + TPA quantity, less HCG's allowance for bifurcated brands: allowed = SHARING × the molecule group's quantity at the hospital, and only the excess counts. SHARING, Group, Allowed and Excess qty are worked out per hospital and month on the whole brand (IP + OP, cash + TPA together, as HCG does), so they do not follow the Patient type, Payer or doctor filters; Qty counted does. Click a brand to see the doctors who prescribed it.",
};

type BrandRow = { material: string; material_desc: string | null; suggested_desc: string | null; bifurcated?: boolean; matched?: boolean };

export default function Items({ section, filters, plant }: { section: Section; filters: Filters; plant: string }) {
  const [group, setGroup] = useState<SchemeGroup>("ALL");
  const params = { ...sectionParams(section, filters), ...(section === "scheme" && group !== "ALL" ? { Group: group } : {}) };
  const [item, setItem] = useState<BrandRow | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const base = `/spend/${section}`;
  // The total the "Share of total" column divides by, from the API's column sums.
  const sums = useTableSums(`${base}/items`, { Plant: plant, ...params });
  const totalKey = isMargin(section) ? "margin_loss" : "saving_missed";
  const total = sums?.[totalKey];

  return (
    <>
      <Card delay={80}>
        {section === "scheme" && (
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <Pills value={group} options={GROUPS} onChange={(g) => { setGroup(g); setOpen(false); }} />
            <span className="text-[11.5px]" style={{ color: SUB }}>HCG&apos;s report shows the Attis and Healthium slices under the scheme total</span>
          </div>
        )}
        <Head label={section === "cash" ? "Brands with a higher-margin suggestion" : section === "oof" ? "Out-of-formulary brands vs the formulary brand" : "Brands to switch for scheme patients"}
          note={`${NOTE[section]} ${SHARES_NOTE}`}
          badge={`${section === "cash" ? "cash + TPA · list prices" : section === "oof" ? "cash + TPA · bill vs list price" : "scheme patients · list prices"}${total != null ? ` · ${inr(total)} margin missed in total` : ""}`} />
        <KpiTable key={`${section}|${group}`} kpiKey={`spend-${section}-items`} endpoint={`${base}/items`} plant={plant}
          columns={brandCols(section)} extraParams={params}
          // An out-of-formulary brand with no formulary match has no margin to split by doctor.
          onRowClick={(r: BrandRow) => { if (section === "oof" && r.matched === false) return; setItem(r); setOpen(true); }} />
      </Card>

      <SlideOver open={open} onClose={close} eyebrow={section === "cash" ? "Brand used for cash & TPA patients" : section === "oof" ? "Out-of-formulary brand used for cash & TPA patients" : "Brand used for scheme patients"}
        title={item?.material_desc || item?.material || ""}
        sub={item ? `Material ${item.material} · ${section === "oof" ? "formulary" : "suggested"} brand ${item.suggested_desc ?? "—"}${item.bifurcated ? " · bifurcated: only use above HCG's allowance counts" : ""} · doctors who prescribed it` : undefined}>
        {item && (
          <KpiTable key={`${section}|${item.material}|${plant}|${group}`} kpiKey={`spend-${section}-item-doctors`}
            endpoint={`${base}/doctors`} plant={plant} columns={doctorCols(section)}
            extraParams={{ ...params, Material: item.material }} />
        )}
      </SlideOver>
    </>
  );
}
