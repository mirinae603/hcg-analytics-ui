"use client";
// Simulated KPI cards — same design/style as the real "explore" KPI cards on the
// overview pages (icon chip + value + title + sub), just washed-out with a
// "Simulated" tag for consistency. Click through to a full simulated drill-down.
import React from "react";
import Link from "next/link";
import { TbFlask } from "react-icons/tb";
import { simulatedByPortfolio, SimKpiMeta } from "@/lib/kpiRegistry";
import { getSimulated } from "@/lib/simulatedKpi";
import { simVisual } from "@/lib/simKpiVisual";
import { fmt } from "@/lib/kpiFormat";

const INK = "#171a2e", MUT2 = "#9ca2b6", BORDER = "#ecedf4";
const AC = "#6d5efc", ACSOFT = "#efedff";
const SH = "0 1px 2px rgba(20,24,60,0.05), 0 8px 24px -14px rgba(20,24,60,0.14)";
const WASH = 0.62;   // washed-out opacity at rest

function SimCard({ k, i }: { k: SimKpiMeta; i: number }) {
  const b = getSimulated(k.key);
  const { Icon, accent } = simVisual(k.key);
  if (!b) return null;
  const h = b.headline;

  return (
    <Link href={`/kpi/${k.key}`} className="fc-card group rounded-[18px] p-5 block transition-all duration-300"
      style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: SH, opacity: WASH, filter: "saturate(0.72)" }}
      onMouseEnter={(e) => { const t = e.currentTarget; t.style.opacity = "1"; t.style.filter = "none"; t.style.boxShadow = "0 10px 30px -12px rgba(109,94,252,0.32)"; t.style.transform = "translateY(-2px)"; t.style.borderColor = "#dcd8ff"; }}
      onMouseLeave={(e) => { const t = e.currentTarget; t.style.opacity = String(WASH); t.style.filter = "saturate(0.72)"; t.style.boxShadow = SH; t.style.transform = "none"; t.style.borderColor = BORDER; }}>
      <div className="flex items-center justify-between">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + "1c", color: accent }}>
          <Icon size={20} />
        </span>
        <span className="flex items-center gap-1 px-2 py-[3px] rounded-full" style={{ background: "#fff7ed", border: "1px solid #fadcae" }}>
          <TbFlask size={10} style={{ color: "#c07d1a" }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: "#a56a15" }}>Simulated</span>
        </span>
      </div>
      <div className="mt-4 flex items-end gap-1.5">
        <span className="text-[21px] font-bold tabular-nums leading-none" style={{ color: INK }}>{fmt(h.value, h.kind)}</span>
        <span className="text-[11px] font-medium mb-0.5" style={{ color: MUT2 }}>{h.label}</span>
      </div>
      <div className="mt-2 text-[13px] font-semibold" style={{ color: "#333850" }}>{k.title}</div>
      <div className="text-[11.5px] mt-0.5 leading-snug" style={{ color: MUT2 }}>{k.why}</div>
    </Link>
  );
}

export default function SimulatedKpiGrid({ portfolio }: { portfolio: string }) {
  const items = simulatedByPortfolio(portfolio);
  if (!items.length) return null;

  return (
    <section className="mt-8">
      <div className="mb-3.5 flex items-center gap-2.5 flex-wrap">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ACSOFT, color: AC }}><TbFlask size={14} /></span>
        <h2 className="text-[16px] font-bold tracking-tight" style={{ color: INK }}>Simulated preview</h2>
        <span className="text-[12.5px]" style={{ color: MUT2 }}>· representative data — activates the moment HCG shares the source</span>
        <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#fff7ed", color: "#a56a15", border: "1px solid #fadcae" }}>
          {items.length} preview{items.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((k, i) => <SimCard key={k.key} k={k} i={i} />)}
      </div>
    </section>
  );
}
