"use client";
// Formulary Compliance — Brand rules tab (Task 4).
//
// HCG's Item Master gives every formulary brand a letter (P, P-SCH, SCH, R, R-OPD, OPD, P-OPD,
// SCH-OPD); HCG's emails say which letters are wrong for which patients. brand_rules.csv (backend)
// turns that into MEASURES — e.g. restricted brands for scheme patients — each with a verdict:
//   breach = against HCG's guidelines · watch = a figure HCG reports · info = shown until HCG confirms.
// Two views: "Rule breaches" (the measures, then one measure's trend, hospitals, brands and
// doctors) and "Rule book" (every formulary brand of the month: its letter, what each payer may
// get, its block of interchangeable brands and P1/P2 rank from HCG's Main Sheet SHARING).
// Measures can overlap, so they are shown side by side and never added up.
import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head, HeroShell, Skeleton, useArmed, INK, SUB, RULE, EASE, SEL_BG } from "@/components/portfolio/ledger/kit";
import { inr, num, pct } from "@/lib/kpiFormat";
import { dayLabel } from "@/components/portfolio/ledger/format";
import { useSelectHospital } from "@/context/RegionContext";
import { Notice, Pills, SlideOver, F_COL, OOF_COL, NF_COL, VERDICT } from "./parts";
import Guidelines from "./Guidelines";
import { SHARES_NOTE } from "../table/query";
import { filterParams, monthLabel, monthsLabel, niceMax, useRulesOverview, type Filters, type Meta, type RuleMeasure, type RulesOverview } from "./api";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const TRACK = "#EFEBE1";

const ITEM_COLS: Col[] = [
  { field: "material_desc", label: "Brand" },
  { field: "material", label: "Material" },
  { field: "letter", label: "Letter" },
  { field: "generic_name", label: "Molecule" },
  { field: "manufacturer", label: "Manufacturer" },
  { field: "cost", label: "Value", kind: "inr" },
  { field: "share_pct", label: "Share of measure", kind: "pct2" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "alternative", label: "Alternative in block" },
  { field: "p1_desc", label: "P1 of its block" },
  { field: "p_rank", label: "Its rank", kind: "num" },
  { field: "sharing", label: "Its SHARING %", kind: "num" },
  { field: "block_brands", label: "Block (letter, SHARING)" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
];
const DOCTOR_COLS: Col[] = [
  { field: "doctor_name", label: "Doctor" },
  { field: "doctor_id", label: "Doctor ID" },
  { field: "hospital_name", label: "Hospital" },
  { field: "cost", label: "Value", kind: "inr" },
  { field: "share_pct", label: "Share of measure", kind: "pct2" },
  { field: "brands", label: "Brands", kind: "num" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "lines", label: "Lines", kind: "num" },
];
const BOOK_COLS: Col[] = [
  { field: "molecule", label: "Molecule" },
  { field: "material_desc", label: "Brand" },
  { field: "material", label: "Material" },
  { field: "letter", label: "Letter" },
  { field: "gov", label: "Scheme (GOV)" },
  { field: "cash", label: "Cash" },
  { field: "tpa", label: "TPA" },
  { field: "p_rank", label: "Rank in block", kind: "num" },
  { field: "sharing", label: "SHARING %", kind: "num" },
  { field: "tie", label: "Tied", kind: "bool" },
  { field: "p1_desc", label: "P1 of its block" },
  { field: "sold", label: "Sold this month", kind: "bool" },
  { field: "conflict", label: "Main Sheet differs", kind: "bool" },
  { field: "ms_category", label: "Main Sheet letter" },
  { field: "scheme_suggested_desc", label: "Scheme suggestion" },
  { field: "cash_suggested_desc", label: "Cash suggestion" },
  { field: "manufacturer", label: "Manufacturer" },
];
const LETTERS = ["ALL", "P-SCH", "P", "SCH", "R", "R-OPD", "OPD", "P-OPD", "SCH-OPD"] as const;

type Sub = "breaches" | "book";

export default function Rules({ meta, filters, plant }: { meta: Meta; filters: Filters; plant: string }) {
  const [sub, setSub] = useState<Sub>("breaches");
  return (
    <div className="grid grid-cols-1 gap-5 md:gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Pills value={sub} onChange={setSub} options={[{ key: "breaches", label: "Rule breaches" }, { key: "book", label: "Rule book" }]} />
        <span className="text-[11.5px]" style={{ color: SUB }}>HCG&apos;s brand letters per payer · rules in brand_rules.csv until HCG confirms them</span>
      </div>
      {sub === "breaches" ? <Breaches meta={meta} filters={filters} plant={plant} /> : <Book meta={meta} filters={filters} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE BREACHES
// ─────────────────────────────────────────────────────────────────────────────
function Breaches({ meta, filters, plant }: { meta: Meta; filters: Filters; plant: string }) {
  const [measure, setMeasure] = useState<string>("");
  const params = filterParams(filters, { payer: false });
  const { data, error, loading } = useRulesOverview({ Plant: plant, ...params, ...(measure ? { Measure: measure } : {}) });
  useEffect(() => { if (data && !measure) setMeasure(data.selected); }, [data, measure]);
  if (error) return <Notice title="Brand rules aren't available">{error}</Notice>;
  if (!data) return <Skeleton />;
  const sel = data.measures.find((m) => m.measure === (measure || data.selected)) ?? data.measures[0];
  const where = !data.scope?.plant || data.scope.plant === "ALL" ? "All hospitals" : (data.scope.his_name || data.scope.plant_name || data.scope.plant);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-6" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .2s ease" }}>
      <div className="xl:col-span-12">
        <HeroShell>
          <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>
            Brand rules · {where} · {monthsLabel(meta, data.scope?.months || [])} · drug spend {inr(data.drug_spend.total)} (onco {inr(data.drug_spend.onco)} · non-onco {inr(data.drug_spend.non_onco)})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {data.measures.map((m) => <MeasureCard key={m.measure} m={m} spend={data.drug_spend} active={m.measure === sel.measure} onClick={() => setMeasure(m.measure)} />)}
          </div>
          <p className="text-[11px] mt-4 leading-relaxed max-w-4xl" style={{ color: SUB }}>
            Each share is the measure&apos;s value ÷ all drug spend in the selection (every payer), as HCG&apos;s report divides it.
            A sale can count in more than one measure, so they are never added up. Click a measure for its trend, hospitals, brands and doctors.
          </p>
        </HeroShell>
      </div>

      <div className="xl:col-span-12"><Guidelines d={data} filters={filters} plant={plant} selected={sel.measure} onPick={setMeasure} /></div>

      <div className="xl:col-span-5"><Trend d={data} m={sel} meta={meta} /></div>
      <div className="xl:col-span-7"><Hospitals d={data} m={sel} /></div>

      <div className="xl:col-span-12"><Brands m={sel} params={{ ...params, Measure: sel.measure }} plant={plant} /></div>
      {sel.by_doctor && <div className="xl:col-span-12"><Doctors m={sel} params={{ ...params, Measure: sel.measure }} plant={plant} /></div>}

      <div className="xl:col-span-12">
        <Card delay={300}>
          <Head label="How these figures are built" badge={data.data_as_of ? `data as of ${dayLabel(data.data_as_of)}` : undefined} />
          <ul className="space-y-1.5 text-[12px] leading-relaxed list-disc pl-5" style={{ color: SUB }}>
            <li>Every sale carries its brand&apos;s letter from that month&apos;s Item Master (the same tag as HCG&apos;s own sales sheets) and its payer bucket.</li>
            <li>{sel.label}: letters {sel.letters.join(", ")} · payers {sel.payers.join(", ")}{sel.patient_types[0] !== "*" ? ` · ${sel.patient_types.join("/")} only` : ""} · {VERDICT[sel.verdict].label.toLowerCase()} ({VERDICT[sel.verdict].note}){sel.rule_ref ? ` · ${sel.rule_ref}` : ""}.{sel.note ? ` ${sel.note}` : ""}</li>
            {(data.notes || []).map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function MeasureCard({ m, spend, active, onClick }: { m: RuleMeasure; spend: RulesOverview["drug_spend"]; active: boolean; onClick: () => void }) {
  const v = VERDICT[m.verdict] ?? VERDICT.info;
  const on = useArmed();
  const alt = m.alternative;
  const altTotal = alt ? alt.yes + alt.no + alt["not in list"] : 0;
  return (
    <button type="button" onClick={onClick} className="text-left rounded-[14px] p-4 transition-colors min-w-0"
      style={{ border: `1px solid ${active ? INK : RULE}`, background: active ? "#FFFFFF" : "rgba(255,255,255,.55)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ color: v.color, border: `1px solid ${v.color}66`, letterSpacing: ".08em" }}>{v.label}</span>
        <span className="text-[10.5px]" style={{ color: SUB }}>{m.letters.join(" · ")} → {m.payers.join(", ")}{m.patient_types[0] !== "*" ? ` (${m.patient_types.join("/")})` : ""}</span>
      </div>
      <div className="text-[12.5px] font-semibold mt-2" style={{ color: INK }}>{m.label}</div>
      <div className="flex items-baseline gap-2 mt-2 flex-wrap">
        <span className="text-[24px] font-light tabular-nums leading-none" style={{ color: INK }}>{inr(m.cost)}</span>
        <span className="text-[12px] font-semibold tabular-nums" style={{ color: v.color }}>{pct(m.share_pct, 2)}</span>
        <span className="text-[11px] tabular-nums" style={{ color: SUB }}>of {inr(spend.total)} · {num(m.lines)} lines</span>
      </div>
      <div className="text-[11px] mt-1.5 tabular-nums" style={{ color: SUB }}>
        onco {inr(m.onco.cost)} ({pct(m.onco.share_pct, 2)} of {inr(spend.onco)}) · non-onco {inr(m.non_onco.cost)} ({pct(m.non_onco.share_pct, 2)} of {inr(spend.non_onco)})
      </div>
      {alt && altTotal > 0 && (
        <div className="mt-3">
          <div className="flex h-[6px] rounded-full overflow-hidden" style={{ background: TRACK }}>
            {([["yes", F_COL], ["no", OOF_COL], ["not in list", NF_COL]] as const).map(([k, c]) => (
              <span key={k} style={{ width: on ? `${(alt[k] / altTotal) * 100}%` : "0%", background: c, transition: `width 600ms ${EASE}` }} />
            ))}
          </div>
          <div className="text-[10.5px] mt-1 tabular-nums" style={{ color: SUB }}>
            alternative listed {inr(alt.yes)} · no alternative {inr(alt.no)}{alt["not in list"] ? ` · not in list ${inr(alt["not in list"])}` : ""}
          </div>
        </div>
      )}
    </button>
  );
}

function Trend({ d, m, meta }: { d: RulesOverview; m: RuleMeasure; meta: Meta }) {
  const on = useArmed();
  const rows = d.trend || [];
  const max = niceMax(Math.max(1, ...rows.map((r) => r.cost)));
  const sel = new Set(d.scope?.months || []);
  // drug_spend (the month's base) arrives from a newer API; without it the column is left out.
  const base = rows.some((r) => r.drug_spend != null);
  const grid = base ? "50px minmax(0,1fr) 78px 54px 78px" : "54px minmax(0,1fr) 84px 58px";
  return (
    <Card delay={160}>
      <Head label={`${m.label}, every month`} note={`Ignores the Month filter; months in your selection are bold. Share = the month's value ÷ that month's drug spend (every payer)${base ? ", shown on the right" : ""}.`} />
      <div className="flex flex-col gap-3">
        {base && (
          <div className="grid gap-3 text-[10px] font-semibold uppercase" style={{ gridTemplateColumns: grid, color: SUB, letterSpacing: ".08em" }}>
            <span>Month</span><span /><span className="text-right">Value</span><span className="text-right">Share</span><span className="text-right">Drug spend</span>
          </div>
        )}
        {rows.map((r, i) => (
          <div key={r.period} className="grid items-center gap-3" style={{ gridTemplateColumns: grid }}>
            <span className="text-[12px]" style={{ color: sel.has(r.period) ? INK : SUB, fontWeight: sel.has(r.period) ? 700 : 500 }}>{r.label || monthLabel(meta, r.period)}</span>
            <span className="relative h-[8px] rounded-full overflow-hidden" style={{ background: TRACK }}>
              <span className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: on ? `${(r.cost / max) * 100}%` : "0%", background: (VERDICT[m.verdict] ?? VERDICT.info).color, transition: `width 600ms ${EASE} ${100 + i * 60}ms` }} />
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-right" style={{ color: INK }}>{inr(r.cost)}</span>
            <span className="text-[11px] tabular-nums text-right" style={{ color: SUB }}>{pct(r.share_pct, 2)}</span>
            {base && <span className="text-[11px] tabular-nums text-right" style={{ color: SUB }}>{inr(r.drug_spend)}</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Hospitals({ d, m }: { d: RulesOverview; m: RuleMeasure }) {
  const selectHospital = useSelectHospital();
  const on = useArmed();
  const rows = d.by_hospital || [];
  const max = niceMax(Math.max(1, ...rows.map((r) => r.cost)));
  const base = rows.some((r) => r.drug_spend != null);
  const cols = base ? "24px minmax(0,1.4fr) minmax(0,.8fr) 76px 54px 76px 50px" : "28px minmax(0,1.5fr) minmax(0,1fr) 84px 58px 50px";
  const sumCost = rows.reduce((t, r) => t + (Number(r.cost) || 0), 0);
  const sumLines = rows.reduce((t, r) => t + (Number(r.lines) || 0), 0);
  return (
    <Card delay={200}>
      <Head label={`Hospitals · ${m.label}`} note={`Every hospital for the same months and filters — ignores the hospital selector. Share = of that hospital's drug spend (every payer)${base ? ", shown beside it" : ""}. Click a hospital to select it.`} badge={`${rows.length} hospitals`} />
      {!rows.length ? <p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p> : (
        <div className="flex flex-col max-h-[380px] overflow-y-auto">
          <div className="grid gap-3 px-2 pb-2 text-[10px] font-semibold uppercase" style={{ gridTemplateColumns: cols, color: SUB, letterSpacing: ".08em" }}>
            <span>#</span><span>Hospital</span><span /><span className="text-right">Value</span><span className="text-right">Share</span>
            {base && <span className="text-right">Drug spend</span>}<span className="text-right">Lines</span>
          </div>
          {rows.map((r, i) => (
            <button key={r.plant} type="button" title={`${r.name} (${r.plant})`}
              onClick={() => selectHospital(r)}
              className="grid items-center gap-3 px-2 py-[6px] rounded-lg text-left transition-colors hover:bg-[#F5F1E7]"
              style={{ gridTemplateColumns: cols, background: r.selected ? SEL_BG : undefined }}>
              <span className="text-[11px] tabular-nums" style={{ color: SUB }}>{r.rank}</span>
              <span className="text-[12.5px] truncate" style={{ color: INK, fontWeight: r.selected ? 700 : 500 }}>{r.his_name || r.name}</span>
              <span className="relative h-[7px] rounded-full overflow-hidden" style={{ background: TRACK }}>
                <span className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: on ? `${(r.cost / max) * 100}%` : "0%", background: (VERDICT[m.verdict] ?? VERDICT.info).color, transition: `width 600ms ${EASE} ${100 + Math.min(i, 20) * 25}ms` }} />
              </span>
              <span className="text-[12px] font-bold tabular-nums text-right" style={{ color: INK }}>{inr(r.cost)}</span>
              <span className="text-[11px] tabular-nums text-right" style={{ color: SUB }}>{pct(r.share_pct, 2)}</span>
              {base && <span className="text-[11px] tabular-nums text-right" style={{ color: SUB }}>{inr(r.drug_spend)}</span>}
              <span className="text-[11px] tabular-nums text-right" style={{ color: SUB }}>{num(r.lines)}</span>
            </button>
          ))}
          <div className="grid items-center gap-3 px-2 py-[6px] mt-1" style={{ gridTemplateColumns: cols, borderTop: `1px solid ${RULE}` }}>
            <span /><span className="text-[12px] font-semibold" style={{ color: INK }}>All hospitals listed</span><span />
            <span className="text-[12px] font-bold tabular-nums text-right" style={{ color: INK }}>{inr(sumCost)}</span>
            <span />{base && <span />}
            <span className="text-[11px] font-semibold tabular-nums text-right" style={{ color: SUB }}>{num(sumLines)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

type ItemRow = { material: string; material_desc: string | null };
type DoctorRow = { doctor_id: string; doctor_name: string; plant: string; hospital_name: string };

function Brands({ m, params, plant }: { m: RuleMeasure; params: Record<string, string>; plant: string }) {
  const [item, setItem] = useState<ItemRow | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Card delay={240}>
        <Head label={`Brands · ${m.label}`}
          note={`Brands this measure counts, most value first, with their block of interchangeable brands from HCG's Main Sheet (letter and SHARING) and its P1 brand — P1/P2 are proposed until HCG confirms. "Share of measure" = the brand's value ÷ the measure total. ${SHARES_NOTE}${m.by_doctor ? " Click a brand to see the doctors who prescribed it." : ""}`}
          badge={`measure total ${inr(m.cost)}`} />
        <KpiTable key={m.measure} kpiKey="rules-items" endpoint="/formulary/rules/items" plant={plant} columns={ITEM_COLS}
          extraParams={params} onRowClick={m.by_doctor ? (r: ItemRow) => { setItem(r); setOpen(true); } : undefined} />
      </Card>
      <SlideOver open={open} onClose={close} eyebrow={m.label} title={item?.material_desc || item?.material || ""}
        sub={item ? `Material ${item.material} · doctors who prescribed it` : undefined}>
        {item && <KpiTable key={`${m.measure}|${item.material}|${plant}`} kpiKey="rules-item-doctors" endpoint="/formulary/rules/doctors"
          plant={plant} columns={DOCTOR_COLS} extraParams={{ ...params, Material: item.material }} />}
      </SlideOver>
    </>
  );
}

function Doctors({ m, params, plant }: { m: RuleMeasure; params: Record<string, string>; plant: string }) {
  const [doc, setDoc] = useState<DoctorRow | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Card delay={280}>
        <Head label={`Doctors · ${m.label}`} note={`HCG's guideline 6: monitor consultants who prescribe these brands to scheme patients. "Share of measure" = the doctor's value ÷ the measure total. ${SHARES_NOTE} Click a doctor to see the brands.`} badge={`per treating doctor · measure total ${inr(m.cost)}`} />
        <KpiTable key={m.measure} kpiKey="rules-doctors" endpoint="/formulary/rules/doctors" plant={plant} columns={DOCTOR_COLS}
          extraParams={params} onRowClick={(r: DoctorRow) => { setDoc(r); setOpen(true); }} />
      </Card>
      <SlideOver open={open} onClose={close} eyebrow={`Doctor · ${m.label}`} title={doc?.doctor_name || doc?.doctor_id || ""}
        sub={doc ? `${doc.hospital_name || doc.plant} · ID ${doc.doctor_id}` : undefined}>
        {doc && <KpiTable key={`${m.measure}|${doc.plant}|${doc.doctor_id}`} kpiKey="rules-doctor-items" endpoint="/formulary/rules/items"
          plant={doc.plant} columns={ITEM_COLS} extraParams={{ ...params, Doctor: doc.doctor_id }} />}
      </SlideOver>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE BOOK
// ─────────────────────────────────────────────────────────────────────────────
function Book({ meta, filters }: { meta: Meta; filters: Filters }) {
  const [letter, setLetter] = useState<(typeof LETTERS)[number]>("ALL");
  const month = filters.month && filters.month !== "ALL" ? filters.month : (meta.latest || meta.months[meta.months.length - 1]);
  const params: Record<string, string> = { Month: month };
  if (filters.segment !== "ALL") params.Segment = filters.segment;
  if (letter !== "ALL") params.Letter = letter;
  return (
    <Card delay={80}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <Pills value={letter} onChange={setLetter} options={LETTERS.map((l) => ({ key: l, label: l === "ALL" ? "All letters" : l }))} />
        <span className="text-[11.5px]" style={{ color: SUB }}>{monthLabel(meta, month)} Item Master{filters.month === "ALL" ? " (latest month — the rule book is per month)" : ""} · all hospitals</span>
      </div>
      <Head label="Rule book"
        note="Every formulary brand in the month's Item Master: its letter, what the rules say for each payer (breach / watch / info / ok), and its block of interchangeable brands in HCG's FY Main Sheet with SHARING and rank — rank 1 is the proposed P1. 'Main Sheet differs' flags the few brands whose Main Sheet letter disagrees with the month's Item Master. Search by molecule or brand." />
      <KpiTable key={`${month}|${letter}|${filters.segment}`} kpiKey="rules-book" endpoint="/formulary/rules/book" columns={BOOK_COLS} extraParams={params} />
      <p className="text-[11px] mt-3" style={{ color: SUB }}>
        Verdicts come from brand_rules.csv (backend). Letters: P = preferred for cash &amp; TPA · P-SCH = preferred for everyone · SCH = scheme brand · R / R-OPD = restricted · -OPD = outpatient (to confirm with HCG).
      </p>
    </Card>
  );
}
