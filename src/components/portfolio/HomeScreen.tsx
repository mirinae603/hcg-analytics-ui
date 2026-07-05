"use client";
// Landing home — four clickable "Analytics KPI's"-style blocks (the decorative
// card from the inventory overview, turned into nav tiles). Analytics: Inventory /
// Consumption / Procurement · plus Forecasting. Each opens its overview page.
import React, { useState } from "react";
import Link from "next/link";
import { TbPackage, TbReportMedical, TbShoppingCart, TbTelescope, TbArrowRight } from "react-icons/tb";

type Ico = React.ComponentType<{ size?: number }>;

function NavTile({ title, subtitle, href, accent, Icon }: { title: string; subtitle: string; href: string; accent: string; Icon: Ico }) {
  const [h, setH] = useState(false);
  const base = "#7c8598";
  const col = h ? accent : base;
  return (
    <Link href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="relative block">
      {/* ambient glow */}
      <div className="absolute -inset-5 rounded-[2.2rem] transition-opacity duration-700 pointer-events-none"
        style={{ opacity: h ? 0.55 : 0.16, background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)` }} />
      <div className="relative rounded-[26px] p-8 overflow-hidden transition-all duration-500"
        style={{
          background: h ? `linear-gradient(135deg, ${accent}12, ${accent}06)` : "linear-gradient(135deg, #f8f9fbcc, #eef1f5aa)",
          border: `1px solid ${h ? accent + "3a" : "#e9ebf1"}`, transform: h ? "translateY(-5px)" : "none",
          boxShadow: h ? `0 26px 55px -26px ${accent}66` : "0 12px 34px -22px rgba(30,40,70,.16)", backdropFilter: "blur(6px)",
        }}>
        {/* spinning corner rings */}
        {(["left", "right"] as const).map((side) => (
          <div key={side} className="absolute top-4 w-10 h-10 transition-opacity duration-500" style={{ [side]: 14, opacity: h ? 0.3 : 0.13 } as React.CSSProperties}>
            <div className="w-full h-full rounded-full animate-spin" style={{ border: `2px solid ${col}`, animationDuration: "20s" }} />
            <div className="absolute inset-2 rounded-full animate-spin" style={{ border: `1px solid ${col}`, animationDuration: "15s", animationDirection: "reverse" }} />
          </div>
        ))}

        <div className="text-center relative z-10">
          <div className="flex justify-center mb-4">
            <span className="flex items-center justify-center rounded-2xl transition-colors duration-500" style={{ width: 54, height: 54, background: h ? accent + "1c" : "#eef0f4", color: col }}><Icon size={27} /></span>
          </div>
          <h3 className="text-3xl font-semibold transition-all duration-500" style={{ color: col, letterSpacing: "-0.02em", transform: h ? "scale(1.04)" : "none" }}>{title}</h3>
          <div className="mx-auto mt-2 h-0.5 rounded-full transition-all duration-700" style={{ width: h ? 96 : 34, background: col }} />

          <div className="flex items-center justify-center gap-3 py-4">
            <div className="h-px transition-all duration-500" style={{ width: h ? 44 : 24, background: col }} />
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: accent, opacity: h ? 0.7 : 0 }} />
            </div>
            <div className="h-px transition-all duration-500" style={{ width: h ? 44 : 24, background: col }} />
          </div>

          <h4 className="text-sm font-medium uppercase transition-colors duration-300" style={{ color: col, letterSpacing: "0.25em" }}>{subtitle}</h4>
          <div className="flex justify-center mt-3 gap-1.5">
            {[...Array(5)].map((_, i) => <div key={i} className="w-0.5 rounded-full transition-all duration-300" style={{ height: (i + 1) * 3, background: col, transitionDelay: `${i * 50}ms` }} />)}
          </div>

          <div className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold transition-all duration-300" style={{ color: accent, opacity: h ? 1 : 0, transform: h ? "translateY(0)" : "translateY(4px)" }}>Open overview <TbArrowRight size={14} /></div>
        </div>
      </div>
    </Link>
  );
}

const ANALYTICS = [
  { title: "Inventory", subtitle: "Stock · Aging · Health", href: "/inventory", accent: "#4f46e5", Icon: TbPackage },
  { title: "Consumption", subtitle: "Usage · Departments", href: "/consumption", accent: "#0d9488", Icon: TbReportMedical },
  { title: "Procurement", subtitle: "Purchasing · Vendors", href: "/procurement", accent: "#d97a1e", Icon: TbShoppingCart },
];
const FC_LINKS = [
  { name: "Expected demand", href: "/salesQuantityForecast" },
  { name: "Procurement budget", href: "/cashFlowForecast" },
  { name: "Reorder & stock risk", href: "/stockReplenishmentForecast" },
];

export default function HomeScreen() {
  return (
    <div className="-m-4 md:-m-6 p-6 md:p-10" style={{ minHeight: "calc(100vh - 64px)", background: "#f6f7f9" }}>
      <div className="max-w-[1200px] mx-auto">
        <header className="mb-9">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-2" style={{ color: "#9aa0b0" }}>HCG · Supply Chain</div>
          <h1 className="text-[32px] font-extrabold leading-none tracking-tight" style={{ color: "#1b1c22" }}>Analytics Home</h1>
          <p className="text-[14px] mt-2.5" style={{ color: "#7c8598" }}>Pick a domain to open its KPI overview.</p>
        </header>

        <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: "#aab0c0" }}>Analytics</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-11">
          {ANALYTICS.map((t) => <NavTile key={t.href} {...t} />)}
        </div>

        <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: "#aab0c0" }}>Forecasting</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <NavTile title="Forecasting" subtitle="Demand · Budget · Risk" href="/forecasting" accent="#7c5cfc" Icon={TbTelescope} />
          <div className="md:col-span-2 rounded-[26px] p-8 flex flex-col justify-center" style={{ background: "#ffffff", border: "1px solid #e9ebf1", boxShadow: "0 12px 34px -22px rgba(30,40,70,.12)" }}>
            <h3 className="text-[18px] font-bold" style={{ color: "#1b1c22" }}>Look 3 months ahead</h3>
            <p className="text-[13.5px] mt-2 leading-relaxed max-w-xl" style={{ color: "#7c8598" }}>Plan around expected demand, the cash you'll need to restock, and which items are about to run short or sit too long — all from your last 6 months of real usage.</p>
            <div className="flex flex-wrap gap-2.5 mt-5">
              {FC_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors" style={{ background: "#f3f0ff", color: "#6a4df0", border: "1px solid #e6e0ff" }}>{l.name} <TbArrowRight size={13} /></Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
