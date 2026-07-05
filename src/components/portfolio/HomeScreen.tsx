"use client";
// Landing home — production-grade. Four clickable "Analytics KPI's"-style blocks
// (the decorative card from the inventory overview, kept intact with its rings /
// underline / separator / bars / hover-lift), set on an ambient branded canvas
// with a real hero stat bar and staggered entrance motion.
import React, { useState } from "react";
import Link from "next/link";
import { TbPackage, TbReportMedical, TbShoppingCart, TbTelescope, TbArrowRight, TbBuildingHospital, TbStack2, TbCoin, TbCalendarTime } from "react-icons/tb";
import { REAL } from "@/lib/realAnchors";
import { byPortfolio } from "@/lib/kpiRegistry";

type Ico = React.ComponentType<{ size?: number }>;
const inrCr = (v: number) => `₹${(v / 1e7).toFixed(1)}Cr`;

function NavTile({ title, subtitle, href, accent, Icon, count, delay = 0 }: { title: string; subtitle: string; href: string; accent: string; Icon: Ico; count: string; delay?: number }) {
  const [h, setH] = useState(false);
  const base = "#7c8598";
  const col = h ? accent : base;
  return (
    <Link href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="hm-tile relative block" style={{ animationDelay: `${delay}ms` }}>
      {/* ambient glow */}
      <div className="absolute -inset-6 rounded-[2.4rem] transition-opacity duration-700 pointer-events-none"
        style={{ opacity: h ? 0.6 : 0.14, background: `radial-gradient(circle, ${accent}26 0%, transparent 68%)` }} />
      <div className="relative rounded-[26px] p-8 overflow-hidden transition-all duration-500"
        style={{
          background: h ? `linear-gradient(150deg, ${accent}14, ${accent}05 60%, #ffffffcc)` : "linear-gradient(150deg, #fbfcfeee, #eef1f6bb)",
          border: `1px solid ${h ? accent + "3d" : "#e8eaf0"}`, transform: h ? "translateY(-6px)" : "none",
          boxShadow: h ? `0 30px 60px -28px ${accent}70, 0 4px 14px -8px ${accent}30` : "0 14px 38px -24px rgba(30,40,70,.18)", backdropFilter: "blur(8px)",
        }}>
        {/* top accent line reveal */}
        <div className="absolute top-0 left-0 h-[3px] rounded-b-full transition-all duration-500" style={{ width: h ? "100%" : "0%", background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        {/* spinning corner rings */}
        {(["left", "right"] as const).map((side) => (
          <div key={side} className="absolute top-4 w-10 h-10 transition-opacity duration-500" style={{ [side]: 14, opacity: h ? 0.32 : 0.12 } as React.CSSProperties}>
            <div className="w-full h-full rounded-full animate-spin" style={{ border: `2px solid ${col}`, animationDuration: "20s" }} />
            <div className="absolute inset-2 rounded-full animate-spin" style={{ border: `1px solid ${col}`, animationDuration: "15s", animationDirection: "reverse" }} />
          </div>
        ))}

        <div className="text-center relative z-10">
          <div className="flex justify-center mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider transition-colors duration-500" style={{ background: h ? accent + "18" : "#eef0f4", color: col }}>{count}</span>
          </div>
          <div className="flex justify-center mb-4">
            <span className="flex items-center justify-center rounded-2xl transition-all duration-500" style={{ width: 56, height: 56, background: h ? accent + "1c" : "#eef0f4", color: col, transform: h ? "scale(1.06)" : "none" }}><Icon size={28} /></span>
          </div>
          <h3 className="text-3xl font-semibold transition-all duration-500" style={{ color: col, letterSpacing: "-0.02em", transform: h ? "scale(1.04)" : "none" }}>{title}</h3>
          <div className="mx-auto mt-2 h-0.5 rounded-full transition-all duration-700" style={{ width: h ? 100 : 34, background: col }} />

          <div className="flex items-center justify-center gap-3 py-4">
            <div className="h-px transition-all duration-500" style={{ width: h ? 46 : 24, background: col }} />
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: accent, opacity: h ? 0.7 : 0 }} />
            </div>
            <div className="h-px transition-all duration-500" style={{ width: h ? 46 : 24, background: col }} />
          </div>

          <h4 className="text-sm font-medium uppercase transition-colors duration-300" style={{ color: col, letterSpacing: "0.25em" }}>{subtitle}</h4>
          <div className="flex justify-center mt-3 gap-1.5">
            {[...Array(5)].map((_, i) => <div key={i} className="w-0.5 rounded-full transition-all duration-300" style={{ height: (i + 1) * 3, background: col, transitionDelay: `${i * 50}ms` }} />)}
          </div>

          <div className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold transition-all duration-300" style={{ color: accent, opacity: h ? 1 : 0, transform: h ? "translateY(0)" : "translateY(5px)" }}>Open overview <TbArrowRight size={14} /></div>
        </div>
      </div>
    </Link>
  );
}

const ANALYTICS = [
  { title: "Inventory", subtitle: "Stock · Aging · Health", href: "/inventory", accent: "#4f46e5", Icon: TbPackage, count: `${byPortfolio("inventory").length} KPIs` },
  { title: "Consumption", subtitle: "Usage · Departments", href: "/consumption", accent: "#0d9488", Icon: TbReportMedical, count: `${byPortfolio("consumption").length} KPIs` },
  { title: "Procurement", subtitle: "Purchasing · Vendors", href: "/procurement", accent: "#d97a1e", Icon: TbShoppingCart, count: `${byPortfolio("procurement").length} KPIs` },
];
const FC_LINKS = [
  { name: "Expected demand", href: "/salesQuantityForecast" },
  { name: "Procurement budget", href: "/cashFlowForecast" },
  { name: "Reorder & stock risk", href: "/stockReplenishmentForecast" },
];
const STATS = [
  { Icon: TbBuildingHospital, value: String(REAL.plants?.length ?? 10), label: "Hospitals" },
  { Icon: TbStack2, value: REAL.skusTotal.toLocaleString("en-IN"), label: "SKUs tracked" },
  { Icon: TbCoin, value: inrCr(REAL.totalInventoryCost), label: "Stock value" },
  { Icon: TbCalendarTime, value: "6 mo", label: "Live data" },
];

export default function HomeScreen() {
  return (
    <div className="hm-root -m-4 md:-m-6 relative overflow-hidden" style={{ minHeight: "calc(100vh - 64px)", background: "linear-gradient(180deg, #f7f8fb 0%, #eceff5 100%)" }}>
      <style jsx global>{`
        @keyframes hmUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hmFade{from{opacity:0}to{opacity:1}}
        @keyframes hmDrift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(24px,-18px) scale(1.08)}100%{transform:translate(0,0) scale(1)}}
        .hm-tile{animation:hmUp .7s cubic-bezier(.22,1,.36,1) both}
        .hm-in{animation:hmUp .6s cubic-bezier(.22,1,.36,1) both}
        .hm-glow{animation:hmDrift 18s ease-in-out infinite}
      `}</style>

      {/* ambient branded canvas */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hm-glow absolute rounded-full" style={{ width: 620, height: 620, top: -180, left: -140, background: "radial-gradient(circle, rgba(79,70,229,0.10), transparent 68%)", filter: "blur(20px)" }} />
        <div className="hm-glow absolute rounded-full" style={{ width: 560, height: 560, top: 40, right: -160, background: "radial-gradient(circle, rgba(13,148,136,0.09), transparent 68%)", filter: "blur(20px)", animationDelay: "-6s" }} />
        <div className="hm-glow absolute rounded-full" style={{ width: 560, height: 560, bottom: -220, left: "34%", background: "radial-gradient(circle, rgba(124,92,252,0.09), transparent 68%)", filter: "blur(20px)", animationDelay: "-11s" }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(60,70,110,0.35) 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.28, maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)" }} />
      </div>

      <div className="relative z-10 p-6 md:p-10">
        <div className="max-w-[1200px] mx-auto">
          {/* hero */}
          <header className="hm-in mb-7" style={{ animationDelay: "40ms" }}>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] mb-3" style={{ color: "#8a90a2" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4f46e5" }} />HCG · Supply Chain Analytics
            </div>
            <h1 className="text-[38px] md:text-[44px] font-extrabold leading-[1.05] tracking-tight" style={{ color: "#171821" }}>Welcome to your <span style={{ background: "linear-gradient(92deg,#4f46e5,#7c5cfc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>command centre</span></h1>
            <p className="text-[14.5px] mt-3 max-w-xl leading-relaxed" style={{ color: "#7c8598" }}>One place for every supply-chain KPI across HCG. Pick a domain to open its full overview and drill into the numbers.</p>
          </header>

          {/* stat bar */}
          <div className="hm-in grid grid-cols-2 md:grid-cols-4 gap-3 mb-10" style={{ animationDelay: "120ms" }}>
            {STATS.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: "#ffffffcc", border: "1px solid #e8eaf0", backdropFilter: "blur(8px)", boxShadow: "0 10px 30px -24px rgba(30,40,70,.18)" }}>
                <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: "#f1f2f7", color: "#4f46e5" }}><s.Icon size={20} /></span>
                <div className="min-w-0">
                  <div className="text-[19px] font-extrabold tabular-nums leading-none" style={{ color: "#171821" }}>{s.value}</div>
                  <div className="text-[11.5px] mt-1" style={{ color: "#8a90a2" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* analytics */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#9aa0b0" }}>Analytics</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,#dfe2ea,transparent)" }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-11">
            {ANALYTICS.map((t, i) => <NavTile key={t.href} {...t} delay={220 + i * 90} />)}
          </div>

          {/* forecasting */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#9aa0b0" }}>Forecasting</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,#dfe2ea,transparent)" }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <NavTile title="Forecasting" subtitle="Demand · Budget · Risk" href="/forecasting" accent="#7c5cfc" Icon={TbTelescope} count="3 views" delay={520} />
            <div className="hm-tile md:col-span-2 relative rounded-[26px] p-8 flex flex-col justify-center overflow-hidden" style={{ animationDelay: "600ms", background: "#ffffffcc", border: "1px solid #e8eaf0", backdropFilter: "blur(8px)", boxShadow: "0 14px 38px -26px rgba(30,40,70,.14)" }}>
              <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,92,252,0.10), transparent 70%)" }} />
              <div className="relative z-10">
                <h3 className="text-[19px] font-bold" style={{ color: "#171821" }}>Look 3 months ahead</h3>
                <p className="text-[13.5px] mt-2 leading-relaxed max-w-xl" style={{ color: "#7c8598" }}>Plan around expected demand, the cash you'll need to restock, and which items are about to run short or sit too long — all from your last 6 months of real usage.</p>
                <div className="flex flex-wrap gap-2.5 mt-5">
                  {FC_LINKS.map((l) => (
                    <Link key={l.href} href={l.href} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all hover:gap-2.5" style={{ background: "#f3f0ff", color: "#6a4df0", border: "1px solid #e6e0ff" }}>{l.name} <TbArrowRight size={13} /></Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="hm-in mt-10 pt-6 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: "1px solid #e4e7ef", animationDelay: "720ms" }}>
            <span className="text-[11.5px]" style={{ color: "#9aa0b0" }}>HCG Hospitals · Supply Chain Analytics</span>
            <span className="text-[11.5px]" style={{ color: "#b3b8c6" }}>Powered by Bidezy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
