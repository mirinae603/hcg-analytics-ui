"use client";
// Formulary Compliance — Scheme brands tab. Drugs billed to GOV schemes in the classes HCG
// tracks for scheme patients: RESTRICTED for scheme (FORMULARYR + FORMULARYR-OPD) and
// PREFERRED for scheme (FORMULARYP). GOV only, so the Payer filter is shown locked. Shares
// use drug spend of ALL payers in the same scope as the denominator, matching HCG's report.
import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { Col } from "@/lib/kpiRegistry";
import { Card, Head, HeroShell, Skeleton, INK, SUB, RULE } from "@/components/portfolio/ledger/kit";
import { inr, num, pct } from "@/lib/kpiFormat";
import { Pills, Notice, RATE_COL } from "./parts";
import { filterParams, useOverview, type Filters, type SchemeBlock, type SchemeKind } from "./api";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

const SCHEME_COLS: Col[] = [
  { field: "material", label: "Material" },
  { field: "material_desc", label: "Item" },
  { field: "generic_name", label: "Generic" },
  { field: "manufacturer", label: "Manufacturer" },
  { field: "category", label: "Category" },
  { field: "formulary_class", label: "Class" },
  { field: "cost", label: "Value", kind: "inr" },
  { field: "qty", label: "Qty", kind: "num" },
  { field: "lines", label: "Lines", kind: "num" },
  { field: "hospitals", label: "Hospitals", kind: "num" },
];

const KINDS: { key: SchemeKind; label: string }[] = [
  { key: "restricted", label: "Restricted for scheme" },
  { key: "preferred", label: "Preferred for scheme" },
];

export default function Scheme({ filters, plant }: { filters: Filters; plant: string }) {
  // Same query as the Overview tab (cached), whose `scheme` block ignores the Payer filter.
  const { data, error } = useOverview({ Plant: plant, ...filterParams(filters, { method: true }) });
  const [kind, setKind] = useState<SchemeKind>("restricted");
  const s = data?.scheme;

  return (
    <div className="grid grid-cols-1 gap-5 md:gap-6">
      {error ? <Notice title="Couldn't load the scheme totals">{error}</Notice> : !s ? <Skeleton /> : (
        <HeroShell>
          <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>
            GOV-billed drug spend · {inr(s.gov_total)}
            {s.base && <> · base of every share: all-payer drug spend {inr(s.base.all)} (onco {inr(s.base.onco)} · non-onco {inr(s.base.non_onco)})</>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Total title="Restricted for scheme" classes="FORMULARYR + FORMULARYR-OPD" b={s.restricted} base={s.base} />
            <Total title="Preferred for scheme" classes="FORMULARYP" b={s.preferred} base={s.base} />
          </div>
          <p className="text-[11px] mt-5 leading-relaxed max-w-3xl" style={{ color: SUB }}>
            Only drug lines billed to GOV schemes count here, whatever the Payer filter says. Each share is the value ÷ the drug
            spend of all payers in the same selection; the onco and non-onco shares use that segment&apos;s own drug spend.
          </p>
        </HeroShell>
      )}

      {s?.restricted_cash_tpa && (
        <Card delay={120}>
          <Head label="HCG also reports: restricted brands for cash & TPA patients"
            note="The third brand figure in HCG's report: restricted classes (FORMULARYR + FORMULARYR-OPD) billed to cash and insurance (TPA) patients. A figure HCG watches; whether it is a breach is still to be confirmed with HCG. Details in the Brand rules tab."
            badge="cash + TPA · drugs" />
          <Total title="Restricted for cash & TPA" classes="FORMULARYR + FORMULARYR-OPD" b={s.restricted_cash_tpa} base={s.base} />
        </Card>
      )}

      <Card delay={160}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <Pills value={kind} options={KINDS} onChange={setKind} />
          <span className="text-[11.5px]" style={{ color: SUB }}>GOV-billed · drugs only</span>
        </div>
        <Head label={kind === "restricted" ? "Restricted-for-scheme brands billed to GOV" : "Preferred-for-scheme brands billed to GOV"}
          note={`Items in the class, most value first. The Total row adds every matching item.${s ? ` Class total ${inr(kind === "restricted" ? s.restricted?.cost : s.preferred?.cost)}.` : ""}`} />
        <KpiTable key={kind} kpiKey="formulary-scheme-items" endpoint="/formulary/scheme/items" plant={plant} columns={SCHEME_COLS}
          extraParams={{ ...filterParams(filters, { payer: false }), Kind: kind }} />
      </Card>
    </div>
  );
}

type Base = { all: number; onco: number; non_onco: number } | undefined;

/** One scheme figure; with `base` (newer API) each % carries the drug spend it divides by. */
function Total({ title, classes, b, base }: { title: string; classes: string; b: SchemeBlock; base?: Base }) {
  return (
    <div className="min-w-0 pl-4" style={{ borderLeft: `1px solid ${RULE}` }}>
      <div className="text-[10.5px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".1em" }}>{title}</div>
      <div className="text-[10.5px] mt-0.5" style={{ color: SUB }}>{classes}</div>
      <div className="flex items-baseline gap-3 mt-3 flex-wrap">
        <span className="text-[34px] font-light tabular-nums leading-none" style={{ color: INK, letterSpacing: "-.02em" }}>{inr(b?.cost)}</span>
        <span className="text-[13px] font-semibold tabular-nums" style={{ color: RATE_COL }}>{pct(b?.share_pct, 2)} of {base ? `${inr(base.all)} ` : ""}drug spend</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 text-[12px] tabular-nums">
        <div>
          <div className="text-[10px] uppercase" style={{ color: SUB, letterSpacing: ".08em" }}>Onco</div>
          <div className="font-bold mt-1" style={{ color: INK }}>{inr(b?.onco?.cost)}</div>
          <div style={{ color: RATE_COL }}>{pct(b?.onco?.share_pct, 2)} of {base ? `${inr(base.onco)} ` : ""}onco</div>
        </div>
        <div>
          <div className="text-[10px] uppercase" style={{ color: SUB, letterSpacing: ".08em" }}>Non-onco</div>
          <div className="font-bold mt-1" style={{ color: INK }}>{inr(b?.non_onco?.cost)}</div>
          <div style={{ color: RATE_COL }}>{pct(b?.non_onco?.share_pct, 2)} of {base ? `${inr(base.non_onco)} ` : ""}non-onco</div>
        </div>
      </div>
      <div className="text-[11px] mt-3" style={{ color: SUB }}>{num(b?.lines)} lines</div>
    </div>
  );
}
