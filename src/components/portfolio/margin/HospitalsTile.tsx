"use client";
// Revenue & margin — where each hospital stands, two ways, with one switch between revenue,
// margin % and margin, and the drawer both open (every hospital in exact rupees):
//   UnitRankTile — all hospitals: one bar per hospital from zero, largest first, the margin %
//                  (or the revenue) beside each figure. A row selects that hospital for the
//                  whole app; the selected one goes back to all hospitals.
//   PositionTile — one hospital selected: every hospital is a dot on one axis, the selected one
//                  large and labelled with its figure and its place in the order.
// The list is every hospital with sales in the selected months, whatever the hospital selector
// says; Patients, Material and Payer apply, so a hospital can show nothing under a filter. The
// drawer's tables (every hospital, and every hospital by bucket: HCG's unit × category view)
// each download as CSV.
// Under the Quantity switch "Revenue" becomes units sold (a volume view); margin and margin % stay
// rupees.
import React, { useState } from "react";
import { Swatch } from "@/components/portfolio/ledger/legend";
import { Pills } from "@/components/portfolio/formulary/parts";
import { DownloadCsv, type CsvColumn } from "@/components/portfolio/table/DownloadCsv";
import { useSelectHospital } from "@/context/RegionContext";
import { ChartPanel, PanelPart } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import { RankBars, type RankRow } from "@/components/portfolio/ledger/bars";
import { DotStrip, type Dot } from "@/components/portfolio/ledger/bullets";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { INK, SUB, LINE, RULE, SEL_BG } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, pct, rupeesExact } from "@/components/portfolio/ledger/format";
import { fitDomain, niceCeil } from "@/components/portfolio/ledger/scale";
import { num } from "@/lib/kpiFormat";
import {
  ACCENT, HOSPITAL_COL, RUPEES_ONLY, TYPE_LONG, TYPE_SHORT, HowBuilt, MeasureSwitch, MethodText, bucketCol, filterChips, measureLabel,
  measureOf, measureShort, plural, type Measure, type RevScope,
} from "./shared";
import type { Block, BucketRow, HospitalRow, TypeKey } from "./api";

/** The page's name on a downloaded table. */
const PAGE = "Revenue & margin";

const nameOf = (u: HospitalRow) => u.his_name || u.name || u.plant;

/** Every hospital, largest first on the measure; one with no figure (no MRP for a %) last. The
 *  API sends them by MRP; the other measures only re-order its figures. */
function ranked(units: HospitalRow[], m: Measure, s: RevScope): HospitalRow[] {
  const v = (u: HospitalRow) => measureOf(u, m, s.basis);
  return [...units].sort((a, b) => {
    const x = v(a), y = v(b);
    if (!isNum(x) || !isNum(y)) return isNum(x) ? -1 : isNum(y) ? 1 : 0;
    return y - x || nameOf(a).localeCompare(nameOf(b));
  });
}

/** The figure on the face: the measure, then the one HCG reads beside it. Beside a margin % that
 *  is the revenue in rupees on both bases: a margin % is a ratio of rupees, so its revenue is
 *  the rupees it is a share of (a unit count printed there would read as lakhs of rupees). */
function faceLabel(u: HospitalRow, m: Measure, s: RevScope): string {
  const v = measureShort(measureOf(u, m, s.basis), m, s.basis);
  return m === "margin_pct" ? `${v} · ${lakhs(u.mrp)}` : `${v} · ${pct(u.margin_pct, 1)}`;
}

/** What the switch says beside the panel's title: which figure, the one printed beside it
 *  (`beside`: the ranking prints one, the dot strip none), and whether they are rupees. */
function measureContext(m: Measure, s: RevScope, beside = true): string {
  const sizeIsUnits = m === "size" && s.basis === "qty";
  const second = !beside ? "" : m === "margin_pct" ? ", revenue beside" : ", margin % beside";
  return `${measureLabel(m, s.basis)}${second}${s.basis === "qty" && !sizeIsUnits ? ` · ${RUPEES_ONLY}` : ""}`;
}

/** No hospital sold anything under the filters: nothing to rank. */
const anySales = (units: HospitalRow[]) => units.some((u) => u.lines > 0);

export function UnitRankTile({ s, place }: { s: RevScope; place: Place }) {
  const dr = useDrawer();
  const select = useSelectHospital();
  const [m, setM] = useState<Measure>("size");
  const units = ranked(s.d.by_hospital ?? [], m, s);
  const rows: RankRow[] = units.map((u) => ({
    key: u.plant, label: nameOf(u), value: measureOf(u, m, s.basis), valueLabel: faceLabel(u, m, s),
    selected: u.selected, onClick: () => select(u),
  }));
  const title = "Revenue and margin by hospital";
  return (
    <>
      <ChartPanel id="hospitals" title={title} context={`${s.when} · ${measureContext(m, s)}`} accent={ACCENT} place={place} interactive
        label={`${title}, ${s.when}, ${plural(units.length, "hospital")}, largest ${measureLabel(m, s.basis).toLowerCase()} first`}
        onOpen={() => dr.show("units")} onInfo={() => dr.show("method")}>
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0 pb-1.5">
            <MeasureSwitch value={m} onChange={setM} basis={s.basis} label="Rank the hospitals by" />
          </div>
          <PanelPart>
            {anySales(units)
              ? <RankBars ariaLabel={`${title}, largest ${measureLabel(m, s.basis).toLowerCase()} first, ${s.when}`} rows={rows}
                  format={(v) => measureShort(v, m, s.basis)} color={HOSPITAL_COL} signed={m !== "size"} onMore={() => dr.show("units")} />
              : <p className="text-[12px]" style={{ color: SUB }}>No hospital has sales in this selection.</p>}
          </PanelPart>
        </div>
      </ChartPanel>
      <HospitalsDrawer s={s} title={title} dr={dr} />
    </>
  );
}

export function PositionTile({ s, place }: { s: RevScope; place: Place }) {
  const dr = useDrawer();
  const select = useSelectHospital();
  const [m, setM] = useState<Measure>("size");
  const units = ranked(s.d.by_hospital ?? [], m, s);
  const value = (u: HospitalRow) => measureOf(u, m, s.basis);
  const dots: Dot[] = units.map((u) => ({ key: u.plant, label: nameOf(u), value: value(u), selected: u.selected, onClick: () => select(u) }));
  const vals = units.map(value).filter(isNum);
  // A % is drawn on an axis fitted to the hospitals (a dot, never a bar, so it need not start at
  // zero); an amount from zero (or below it, for a negative margin) to a round ceiling.
  const domain: [number, number] = m === "margin_pct"
    ? fitDomain(vals, { cap: 100 })
    : [Math.min(0, ...vals) < 0 ? -niceCeil(-Math.min(...vals)) : 0, niceCeil(Math.max(0, ...vals))];
  // Its place among the hospitals that sold something under the filters: a hospital with no
  // sales has no place in the order (ties at zero would rank it by name).
  const selling = units.filter((u) => u.lines > 0 && isNum(value(u)));
  const at = selling.findIndex((u) => u.selected);
  const me = units.find((u) => u.selected) ?? null;
  const caption = at >= 0 ? `${at + 1} of ${selling.length}, largest first` : "no sales in this selection";
  const title = "How this hospital compares";
  return (
    <>
      <ChartPanel id="position" title={title} context={`${s.when} · every hospital · ${measureContext(m, s, false)}`} accent={ACCENT} place={place} interactive
        label={`${title}, ${s.when}: ${s.where} ${me ? measureShort(value(me), m, s.basis) : "no sales"}, ${caption}`}
        onOpen={() => dr.show("units")} onInfo={() => dr.show("method")}>
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0 pb-1.5">
            <MeasureSwitch value={m} onChange={setM} basis={s.basis} label="Compare the hospitals by" />
          </div>
          <PanelPart>
            <DotStrip ariaLabel={`${measureLabel(m, s.basis)} of every hospital, ${s.when}`} dots={dots} domain={domain}
              format={(v) => measureShort(v, m, s.basis)} caption={caption} />
          </PanelPart>
        </div>
      </ChartPanel>
      <HospitalsDrawer s={s} title={title} dr={dr} />
    </>
  );
}

function HospitalsDrawer({ s, title, dr }: { s: RevScope; title: string; dr: DrawerCtl }) {
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow="Revenue & margin · Overview" title={`${title} · ${s.when}`}
      source="computed" asOf={s.asOf} filters={filterChips(s, { hospital: false })}
      tabs={[
        { key: "units", label: "Every hospital", render: () => <UnitTable s={s} onPicked={dr.close} /> },
        // HCG's unit × category view; hidden for an API that sends no buckets per hospital.
        { key: "buckets", label: "By bucket", hidden: !(s.d.by_hospital ?? []).some((u) => u.buckets?.length), render: () => <UnitBucketTable s={s} onPicked={dr.close} /> },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Every hospital with pharmacy sales in the selected months, whatever the hospital selector says, for the same patient type, material type and payer: a hospital can show nothing under a filter. Each hospital&apos;s margin % is its own margin ÷ its own MRP; its share is its MRP ÷ the MRP of every hospital listed.</p>
                <p>The switch orders the hospitals by revenue (units sold under the Quantity switch), by margin % or by margin, largest first; a hospital with no MRP has no margin % and is listed last. Bars run from zero on one scale; a negative margin runs left of it.</p>
                <p>With one hospital selected, every hospital is a dot on one axis — from zero for an amount, fitted to the hospitals for a margin % — and the selected one is drawn large with its place in the order. Clicking a hospital selects it for the whole app; clicking the selected one again goes back to all hospitals.</p>
                <p>By bucket: each hospital&apos;s revenue (MRP) and margin % in each of HCG&apos;s buckets — formulary, out of formulary and non-formulary from each month&apos;s Item Master, and consumables, whatever their class — taken on the same sales lines as the hospital&apos;s own figures, so its buckets add up to its revenue. Each margin % is the bucket&apos;s own margin ÷ its own MRP. With all hospitals selected the last row is every hospital together, as the API sums it.</p>
                <p>Each table downloads as CSV: exactly its rows and columns, with exact rupees and each % as a number.</p>
              </MethodText>
              <HowBuilt s={s} />
            </>
          ),
        },
      ]} />
  );
}

/** The # and Hospital columns of a hospital table's CSV, with the plant code HCG keys it by. */
function hospitalCsv<T>(of: (r: T) => { rank: number | null; name: string; plant: string | null }): CsvColumn<T>[] {
  return [
    { label: "#", value: (r) => of(r).rank ?? "", raw: (r) => of(r).rank },
    { label: "Hospital", value: (r) => of(r).name, text: true },
    { label: "Plant", value: (r) => of(r).plant ?? "", text: true },
  ];
}

/** Every hospital in exact rupees, in the API's order (largest revenue first), laid out the way
 *  HCG's sheet reads: revenue, margin and margin % for IP and for OP side by side, then both
 *  (with one patient type selected, that type alone), then units sold and the share. A row
 *  selects it. */
function UnitTable({ s, onPicked }: { s: RevScope; onPicked: () => void }) {
  const select = useSelectHospital();
  const units = s.d.by_hospital ?? [];
  if (!units.length) return <p className="text-[12px]" style={{ color: SUB }}>No hospital has sales in the selected months.</p>;
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap";
  const td = "px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap";
  const group = "px-3 pt-2 text-[10.5px] font-semibold uppercase text-center";
  // One patient type selected: its Blocks are the hospital's whole figures, so no IP + OP group.
  const typed: TypeKey[] = s.types;
  const both = typed.length > 1;
  const groups: { key: string; label: string; of: (u: HospitalRow) => Block }[] = [
    ...typed.map((t) => ({ key: t, label: TYPE_SHORT[t], of: (u: HospitalRow) => (t === "IP" ? u.ip : u.op) })),
    ...(both ? [{ key: "all", label: "IP + OP", of: (u: HospitalRow) => u as Block }] : []),
  ];
  const caption = `Revenue and margin of every hospital${both ? ", IP and OP side by side" : `, ${TYPE_SHORT[typed[0]]}`}, ${s.when}`;
  // The download holds what the table prints, one column per figure, each named for its group.
  const csv: CsvColumn<HospitalRow>[] = [
    ...hospitalCsv((u: HospitalRow) => ({ rank: u.rank, name: nameOf(u), plant: u.plant })),
    ...groups.flatMap((g): CsvColumn<HospitalRow>[] => [
      { label: `${g.label} revenue (MRP)`, value: (u) => rupeesExact(g.of(u).mrp), raw: (u) => g.of(u).mrp, unit: "₹" },
      { label: `${g.label} margin`, value: (u) => rupeesExact(g.of(u).margin), raw: (u) => g.of(u).margin, unit: "₹" },
      { label: `${g.label} margin %`, value: (u) => pct(g.of(u).margin_pct), raw: (u) => g.of(u).margin_pct, unit: "%" },
    ]),
    { label: "Units sold", value: (u) => num(u.qty), raw: (u) => u.qty },
    { label: "Share of revenue", value: (u) => pct(u.share_pct), raw: (u) => u.share_pct, unit: "%" },
  ];
  const cells = (b: Block, strong: boolean) => (
    <>
      <td className={td} style={{ color: INK, fontWeight: strong ? 700 : 400 }}>{rupeesExact(b.mrp)}</td>
      <td className={td} style={{ color: INK }}>{rupeesExact(b.margin)}</td>
      <td className={td} style={{ color: INK, fontWeight: strong ? 700 : 400 }}>{pct(b.margin_pct)}</td>
    </>
  );
  return (
    <DrawerSection title="Every hospital, largest revenue first"
      note={`${plural(units.length, "hospital")} with sales in ${s.when}. Each margin % is that hospital's own margin ÷ its own MRP${both ? ", for IP, for OP and for both" : ""}. Click a hospital to select it.`}>
      <DownloadCsv rows={units} columns={csv} page={PAGE} caption={caption} />
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr style={{ color: SUB }}>
              <th scope="col" colSpan={2} />
              {groups.map((g) => (
                <th key={g.key} scope="colgroup" colSpan={3} className={group} style={{ letterSpacing: ".08em", borderBottom: `1px solid ${LINE}` }}>{g.label}</th>
              ))}
              <th scope="col" colSpan={2} />
            </tr>
            <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
              {["#", "Hospital"].map((h) => <th key={h} scope="col" className={`${th} text-left`} style={{ letterSpacing: ".08em" }}>{h}</th>)}
              {groups.flatMap((g) => ["Revenue (MRP)", "Margin", "Margin %"].map((h) => (
                <th key={`${g.key}-${h}`} scope="col" className={`${th} text-right`} style={{ letterSpacing: ".08em" }}>{h}</th>
              )))}
              {["Units sold", "Share"].map((h) => <th key={h} scope="col" className={`${th} text-right`} style={{ letterSpacing: ".08em" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.plant} style={{ borderBottom: `1px solid ${LINE}`, background: u.selected ? SEL_BG : undefined }}>
                <td className="px-3 py-2 text-[11.5px] tabular-nums" style={{ color: SUB }}>{u.rank ?? "—"}</td>
                <th scope="row" className="px-3 py-2 text-[12px] text-left" style={{ fontWeight: u.selected ? 700 : 500 }}>
                  <button type="button" onClick={() => { select(u); onPicked(); }} className="text-left hover:underline" style={{ color: INK }}
                    aria-label={u.selected ? `${nameOf(u)}: selected; back to all hospitals` : `Select ${nameOf(u)}`}>
                    {nameOf(u)}
                  </button>
                </th>
                {groups.map((g, i) => <React.Fragment key={g.key}>{cells(g.of(u), i === groups.length - 1)}</React.Fragment>)}
                <td className={td} style={{ color: INK }}>{num(u.qty)}</td>
                <td className={td} style={{ color: SUB }}>{pct(u.share_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] mt-2" style={{ color: SUB }}>Shaded = the hospital selected. Exact rupees, as HCG&apos;s sheets carry them.</p>
    </DrawerSection>
  );
}

/** The patients the bucket table counts: both (each bucket as the API sends it), or one type
 *  (that bucket's IP or OP Block, which the API sends beside it). */
type Side = "all" | TypeKey;

/** One row of the bucket table: a hospital, or every hospital together (the API's by_bucket). */
type BucketTableRow = {
  key: string; rank: number | null; name: string; plant: string | null; selected: boolean; total: boolean;
  buckets: BucketRow[]; unit: HospitalRow | null;
};

/** Every hospital's revenue (MRP) and margin % in each of HCG's buckets — HCG's unit × category
 *  sheet: Formulary | Out of formulary | Non-formulary | Consumables (Not in Item Master when any
 *  hospital has some), in the API's order (largest revenue first). Each hospital's buckets are
 *  cut on the same rows as its own figures, so they add up to its revenue; with both patient
 *  types in the selection a switch shows IP + OP, IP or OP. With all hospitals the last row is
 *  every hospital together, the API's own sums. A hospital's name selects it. */
function UnitBucketTable({ s, onPicked }: { s: RevScope; onPicked: () => void }) {
  const select = useSelectHospital();
  const both = s.types.length > 1;
  const [side, setSide] = useState<Side>("all");
  const shown: Side = both ? side : "all";
  const units = (s.d.by_hospital ?? []).filter((u) => u.buckets?.length);
  if (!units.length) return <p className="text-[12px]" style={{ color: SUB }}>No hospital has sales in the selected months.</p>;
  // Every unit lists the same buckets; the first sets the columns, each row finds its own by key.
  const columns = (units[0].buckets ?? []).map((b) => ({ key: b.key, label: b.label }));
  const rows: BucketTableRow[] = [
    ...units.map((u) => ({
      key: u.plant, rank: u.rank, name: nameOf(u), plant: u.plant, selected: u.selected, total: false, buckets: u.buckets ?? [], unit: u,
    })),
    // Every hospital together, as the API sums it: only when no hospital is selected, since the
    // page's by_bucket follows the hospital selector and the rows above do not.
    ...(s.network && s.d.by_bucket?.length
      ? [{ key: "__all", rank: null, name: "All hospitals", plant: null, selected: false, total: true, buckets: s.d.by_bucket, unit: null }]
      : []),
  ];
  const blockOf = (r: BucketTableRow, key: string): Block | null => {
    const b = r.buckets.find((x) => x.key === key);
    return !b ? null : shown === "all" ? b : shown === "IP" ? b.ip : b.op;
  };
  const who = shown === "all" ? (both ? "IP + OP" : TYPE_LONG[s.types[0]]) : TYPE_LONG[shown];
  const caption = `Revenue and margin % of every hospital by bucket, ${who}, ${s.when}`;
  const csv: CsvColumn<BucketTableRow>[] = [
    ...hospitalCsv((r: BucketTableRow) => r),
    ...columns.flatMap((c): CsvColumn<BucketTableRow>[] => [
      { label: `${c.label} revenue (MRP)`, value: (r) => rupeesExact(blockOf(r, c.key)?.mrp), raw: (r) => blockOf(r, c.key)?.mrp, unit: "₹" },
      { label: `${c.label} margin %`, value: (r) => pct(blockOf(r, c.key)?.margin_pct), raw: (r) => blockOf(r, c.key)?.margin_pct, unit: "%" },
    ]),
  ];
  const th = "px-3 py-2 text-[10.5px] font-semibold uppercase whitespace-nowrap";
  const td = "px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap";
  const group = "px-3 pt-2 text-[10.5px] font-semibold uppercase text-center whitespace-nowrap";
  return (
    <DrawerSection title="Every hospital by bucket"
      note={`HCG's unit × category view: each hospital's revenue (MRP) and margin % in each bucket, ${who}, ${s.when}. A hospital's buckets add up to its revenue; each margin % is the bucket's own margin ÷ its own MRP. Click a hospital to select it.`}>
      <div className="flex items-center justify-between gap-3 mb-1">
        {both ? (
          <Pills value={shown} onChange={setSide} title="Patients the table counts"
            options={[{ key: "all", label: "IP + OP" }, { key: "IP", label: "IP" }, { key: "OP", label: "OP" }]} />
        ) : <span />}
        <DownloadCsv rows={rows} columns={csv} page={PAGE} caption={caption} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr style={{ color: SUB }}>
              <th scope="col" colSpan={2} />
              {columns.map((c) => (
                <th key={c.key} scope="colgroup" colSpan={2} className={group} style={{ letterSpacing: ".08em", borderBottom: `1px solid ${LINE}` }}>
                  <span className="inline-flex items-center gap-1.5"><Swatch color={bucketCol(c.key)} />{c.label}</span>
                </th>
              ))}
            </tr>
            <tr style={{ color: SUB, borderBottom: `1px solid ${RULE}` }}>
              {["#", "Hospital"].map((h) => <th key={h} scope="col" className={`${th} text-left`} style={{ letterSpacing: ".08em" }}>{h}</th>)}
              {columns.flatMap((c) => ["Revenue (MRP)", "Margin %"].map((h) => (
                <th key={`${c.key}-${h}`} scope="col" className={`${th} text-right`} style={{ letterSpacing: ".08em" }}>{h}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const strong = r.total || r.selected;
              return (
                <tr key={r.key} style={{ borderBottom: `1px solid ${LINE}`, background: strong ? SEL_BG : undefined }}>
                  <td className="px-3 py-2 text-[11.5px] tabular-nums" style={{ color: SUB }}>{r.rank ?? (r.total ? "" : "—")}</td>
                  <th scope="row" className="px-3 py-2 text-[12px] text-left whitespace-nowrap" style={{ color: INK, fontWeight: strong ? 700 : 500 }}>
                    {r.unit ? (
                      <button type="button" onClick={() => { if (r.unit) select(r.unit); onPicked(); }} className="text-left hover:underline" style={{ color: INK }}
                        aria-label={r.selected ? `${r.name}: selected; back to all hospitals` : `Select ${r.name}`}>
                        {r.name}
                      </button>
                    ) : r.name}
                  </th>
                  {columns.map((c) => {
                    const b = blockOf(r, c.key);
                    return (
                      <React.Fragment key={c.key}>
                        <td className={td} style={{ color: INK, fontWeight: r.total ? 700 : 400 }}>{rupeesExact(b?.mrp)}</td>
                        <td className={td} style={{ color: INK, fontWeight: r.total ? 700 : 400 }}>{pct(b?.margin_pct)}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] mt-2" style={{ color: SUB }}>Shaded = the hospital selected{s.network ? ", and every hospital together" : ""}. Exact rupees, as HCG&apos;s sheets carry them; a margin % is — where the bucket has no MRP.</p>
    </DrawerSection>
  );
}
