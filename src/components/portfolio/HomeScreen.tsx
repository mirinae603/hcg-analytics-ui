"use client";
// Landing home — four blocks, each an exact copy of the "Analytics KPI's" card
// (tinted fill, bold drop-shadow title, spinning corner rings, underline, dot
// separator, uppercase label, progress bars), one colour shade per domain.
// Editorial neutral canvas matching the forecast pages. No purple.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { REAL } from "@/lib/realAnchors";
import { inr } from "@/lib/kpiFormat";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

const BG = "#ffffff", INK = "#1b1c22", INK2 = "#41444f", MUT = "#8a8f9d";

// The real hospital count. The header used to print `REAL.plants?.length ?? 10` — but
// REAL.plants is a TOP-TEN-BY-REVENUE list, not the estate. It said "10 hospitals"
// while the plant selector in the header above it listed 52. Same endpoint as that
// selector now, so the two can't contradict each other again.
function useHospitalCount() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let dead = false;
    fetch(`${DASHBOARD_API_BASE_URL}/meta/plants`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!dead && d?.plants) setN(d.plants.filter((p: { code?: string }) => p.code !== "ALL").length); })
      .catch(() => {});
    return () => { dead = true; };
  }, []);
  return n;
}

// exact "Analytics KPI's" card, tinted to `accent`
function KpiBlock({ title, subtitle, href, accent, delay = 0 }: { title: string; subtitle: string; href: string; accent: string; delay?: number }) {
  const [h, setH] = useState(false);
  return (
    <Link href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="hm-tile block" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative rounded-[28px] px-8 py-12 overflow-hidden transition-all duration-500"
        style={{
          background: `linear-gradient(158deg, ${accent}1c, ${accent}0b 52%, ${accent}16)`,
          border: `1px solid ${accent}33`,
          transform: h ? "translateY(-6px)" : "none",
          boxShadow: h ? `0 32px 64px -28px ${accent}66` : `0 18px 44px -30px ${accent}4d`,
        }}>
        {/* spinning corner rings */}
        {(["left", "right"] as const).map((side) => (
          <div key={side} className="absolute top-5 w-11 h-11 transition-opacity duration-500" style={{ [side]: 20, opacity: h ? 0.7 : 0.5 } as React.CSSProperties}>
            <div className="w-full h-full rounded-full animate-spin" style={{ border: `2px solid ${accent}66`, animationDuration: "20s" }} />
            <div className="absolute inset-2 rounded-full animate-spin" style={{ border: `1.5px solid ${accent}55`, animationDuration: "15s", animationDirection: "reverse" }} />
          </div>
        ))}

        <div className="text-center relative z-10">
          <h3 className="text-[40px] font-extrabold leading-none transition-transform duration-500"
            style={{ color: accent, letterSpacing: "-0.02em", textShadow: `0 10px 24px ${accent}40`, transform: h ? "scale(1.05)" : "none" }}>{title}</h3>
          <div className="mx-auto mt-3 h-[3px] rounded-full transition-all duration-700" style={{ width: h ? 116 : 76, background: accent, opacity: 0.85 }} />

          <div className="flex items-center justify-center gap-3 py-6">
            <div className="h-[2px] rounded-full transition-all duration-500" style={{ width: h ? 54 : 42, background: `${accent}99` }} />
            <div className="relative">
              <div className="w-3 h-3 rounded-full" style={{ background: accent }} />
              <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping" style={{ background: accent, opacity: h ? 0.7 : 0 }} />
            </div>
            <div className="h-[2px] rounded-full transition-all duration-500" style={{ width: h ? 54 : 42, background: `${accent}99` }} />
          </div>

          <h4 className="text-[13px] font-semibold uppercase" style={{ color: `${accent}d0`, letterSpacing: "0.28em" }}>{subtitle}</h4>
          <div className="flex justify-center mt-4 gap-1.5">
            {[...Array(5)].map((_, i) => <div key={i} className="w-1 rounded-full transition-all duration-300" style={{ height: (i + 1) * 4, background: accent, transitionDelay: `${i * 40}ms` }} />)}
          </div>
        </div>
      </div>
    </Link>
  );
}

// domain shades — cohesive, no purple (blue · teal · amber · coral)
const ANALYTICS = [
  { title: "Inventory", subtitle: "Stock · Aging · Health", href: "/inventory", accent: "#4a80d8" },
  { title: "Consumption", subtitle: "Usage · Departments", href: "/consumption", accent: "#16a394" },
  { title: "Procurement", subtitle: "Purchasing · Vendors", href: "/procurement", accent: "#d9932b" },
];
const FC_ACCENT = "#e2674c";
// The three forecast sub-pages this used to link out to (Expected demand, Procurement
// budget, Reorder & stock risk) are not orphaned by removing that card — every one of
// them is a first-class sidebar item, and is the very first thing /forecasting itself
// shows.

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#9aa0b0" }}>{children}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,#dcdfe6,transparent)" }} />
    </div>
  );
}

export default function HomeScreen() {
  const hospitals = useHospitalCount();
  return (
    <div className="-m-4 md:-m-6 p-6 md:p-10" style={{ minHeight: "calc(100vh - 64px)", background: BG }}>
      <style jsx global>{`
        @keyframes hmUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .hm-tile{animation:hmUp .65s cubic-bezier(.22,1,.36,1) both}
        .hm-in{animation:hmUp .55s cubic-bezier(.22,1,.36,1) both}
      `}</style>

      <div className="max-w-[1200px] mx-auto">
        {/* editorial header (no gradients) */}
        <header className="hm-in mb-8" style={{ animationDelay: "30ms" }}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-2" style={{ color: MUT }}>HCG Hospitals · Supply Chain</div>
          <h1 className="text-[30px] md:text-[34px] font-extrabold leading-none tracking-tight" style={{ color: INK }}>Analytics Home</h1>
          <p className="text-[13.5px] mt-2.5" style={{ color: MUT }}>Pick a domain to open its KPI overview.</p>
          <p className="text-[12.5px] mt-3 tabular-nums" style={{ color: "#a2a7b5" }}>
            <span style={{ color: INK2, fontWeight: 600 }}>{hospitals ?? "—"}</span> hospitals
            &nbsp;·&nbsp; <span style={{ color: INK2, fontWeight: 600 }}>{REAL.skusTotal.toLocaleString("en-IN")}</span> SKUs
            {/* was a private one-liner printing "₹60.5Cr" while /inventory printed
                "₹60.47 Cr" from the very same constant */}
            &nbsp;·&nbsp; <span style={{ color: INK2, fontWeight: 600 }}>{inr(REAL.totalInventoryCost)}</span> stock value
            &nbsp;·&nbsp; <span style={{ color: INK2, fontWeight: 600 }}>6 months</span> of live data
          </p>
        </header>

        <SectionLabel>Analytics</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-11">
          {ANALYTICS.map((t, i) => <KpiBlock key={t.href} {...t} delay={140 + i * 90} />)}
        </div>

        <SectionLabel>Forecasting</SectionLabel>
        {/* Was a lopsided 1-vs-2 row: the Forecasting tile beside a much wider card
            explaining what forecasting is, restating the sidebar's own three links in
            paragraph form. Same 3-column grid as the Analytics row above so it keeps
            the page's established rhythm — just placed in the centre column instead
            of stretched into an asymmetric split. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-start-2">
            <KpiBlock title="Forecasting" subtitle="Demand · Budget · Risk" href="/forecasting" accent={FC_ACCENT} delay={420} />
          </div>
        </div>

        <div className="hm-in mt-10 pt-6 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: "1px solid #e0e3eb", animationDelay: "620ms" }}>
          <span className="text-[11.5px]" style={{ color: "#9aa0b0" }}>HCG Hospitals · Supply Chain Analytics</span>
          <span className="text-[11.5px]" style={{ color: "#b3b8c6" }}>Powered by Bidezy</span>
        </div>
      </div>
    </div>
  );
}
