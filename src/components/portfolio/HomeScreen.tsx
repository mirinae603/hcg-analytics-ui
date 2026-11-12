"use client";
// Landing home — one block per domain, each an exact copy of the "Analytics KPI's" card
// (tinted fill, bold drop-shadow title, spinning corner rings, underline, dot
// separator, uppercase label, progress bars), one colour shade per domain.
// Editorial neutral canvas matching the forecast pages. No purple.
//
// The header's facts (hospitals, SKUs, stock value, the months of data) and every tile's months
// come from GET /meta/windows (useWindows), so a new stock count or a new month of data changes
// them with no code change. A fact is left out while it loads, or when its source is not built,
// rather than shown as a guess.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/kpiFormat";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { monthLabel, snapshotLabel, useWindows, windowLabel, type Window, type WindowKey, type Windows } from "@/lib/useWindows";

const BG = "#ffffff", INK = "#1b1c22", INK2 = "#41444f", MUT = "#8a8f9d";

// The real hospital count. The header used to print `REAL.plants?.length ?? 10` — but
// REAL.plants is a TOP-TEN-BY-REVENUE list, not the estate. It said "10 hospitals"
// while the plant selector in the header above it listed 52. Same endpoint as that
// selector now, so the two can't contradict each other again. GET /meta/windows sends the same
// count (`hospitals`); this is its fallback while that loads or if it fails.
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

/** A source's months, short, for a tile: "Jun–Aug 2026", "Dec 2025 – Aug 2026", "Aug 2026"; null
 *  when the source is not built (or the windows have not loaded). */
function spanText(w: Pick<Window, "from" | "to"> | null | undefined): string | null {
  if (!w) return null;
  const [a, b] = [monthLabel(w.from), monthLabel(w.to)];
  if (w.from === w.to) return a;
  const [am, ay] = a.split(" "), [bm, by] = b.split(" ");
  return ay === by ? `${am}–${bm} ${by}` : `${a} – ${b}`;
}

/** Every source together: the first month any of them holds to the last. */
function overall(w: Windows | null): Pick<Window, "from" | "to"> | null {
  const all = w ? Object.values(w.windows).filter((x): x is Window => !!x) : [];
  if (!all.length) return null;
  return { from: all.map((x) => x.from).sort()[0], to: all.map((x) => x.to).sort().reverse()[0] };
}

/** Each source's window in words, one per line, for the header's tooltip. */
const SOURCE_NAMES: Partial<Record<WindowKey, string>> = {
  sales: "HIS pharmacy sales", purchases: "Purchases (prices)", grn: "Goods receipts", po: "Purchase orders",
  consumption: "Internal consumption", legacy_sales: "Billed sales (older tables)",
};
function sourcesTitle(w: Windows | null): string {
  if (!w) return "";
  return (Object.keys(SOURCE_NAMES) as WindowKey[])
    .filter((k) => w.windows[k])
    .map((k) => `${SOURCE_NAMES[k]}: ${windowLabel(w.windows[k])}`).join("\n");
}

// exact "Analytics KPI's" card, tinted to `accent`
function KpiBlock({ title, subtitle, href, accent, delay = 0, note, hero = false }: { title: string; subtitle: string; href: string; accent: string; delay?: number; note?: string | null; hero?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <Link href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="hm-tile block" style={{ animationDelay: `${delay}ms` }}>
      <div className={`relative rounded-[28px] px-8 ${hero ? "py-14" : "py-12"} overflow-hidden transition-all duration-500`}
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
          <h3 className={`${hero ? "text-[44px]" : "text-[40px]"} font-extrabold leading-none transition-transform duration-500`}
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
          {note && <p className="text-[12px] mt-4 tabular-nums" style={{ color: `${accent}c0` }}>{note}</p>}
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
const FM_ACCENT = "#3d9a50";
const SP_ACCENT = "#b0762a";
// The Executive overview spans every domain: a deep slate, neutral beside the domain shades.
const EX_ACCENT = "#36506b";
const RV_ACCENT = "#c0567a";
const DX_ACCENT = "#6f7d3a";
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
  const w = useWindows();
  const counted = useHospitalCount();
  const hospitals = w?.hospitals ?? counted;
  const sales = spanText(w?.windows.sales);
  const purchases = spanText(w?.windows.purchases);
  const grn = spanText(w?.windows.grn);
  const span = spanText(overall(w));
  const snapshot = snapshotLabel(w?.inventory_snapshot);
  const fact = (v: React.ReactNode) => <span style={{ color: INK2, fontWeight: 600 }}>{v}</span>;
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
          {/* Each fact shows once its figure has arrived; the separators join only the ones shown.
              Stock value prints with the shared inr() (it was once a private one-liner printing
              "₹60.5Cr" while /inventory printed "₹60.47 Cr" from the very same figure). */}
          <p className="text-[12.5px] mt-3 tabular-nums" style={{ color: "#a2a7b5" }} title={sourcesTitle(w) || undefined}>
            {[
              hospitals != null && <>{fact(hospitals)} hospitals</>,
              w?.skus_total != null && <>{fact(w.skus_total.toLocaleString("en-IN"))} SKUs</>,
              w?.stock_value != null && <>{fact(inr(w.stock_value))} stock value{snapshot ? ` at the ${snapshot} count` : ""}</>,
              span && <>{fact(span)} of live data</>,
            ].filter(Boolean).map((f, i) => <React.Fragment key={i}>{i > 0 && <>&nbsp;·&nbsp; </>}{f}</React.Fragment>)}
          </p>
        </header>

        {/* The Executive overview first, full width, at the top of the page: HCG's first screen
            across the pages under it, so it is in view on a 768px-high laptop without scrolling.
            Then those three, the width of the 3-column rows below. */}
        <SectionLabel>Compliance &amp; Spend</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-11">
          <div className="md:col-span-3">
            <KpiBlock hero title="Executive overview" subtitle="Revenue · Margin · Compliance · Missed · Insights" href="/executive" accent={EX_ACCENT} delay={140}
              note={sales ? `HIS sales ${sales}${purchases ? ` · purchases ${purchases}` : ""}` : null} />
          </div>
          <KpiBlock title="Formulary" subtitle="Compliance · Doctors · Scheme" href="/formulary" accent={FM_ACCENT} delay={190}
            note={sales ? `HIS sales · ${sales}` : null} />
          {/* Spend reads two sources with months of their own (bills, and purchases): the note names both. */}
          <KpiBlock title="Spend" subtitle="Margin missed · Prices · Generic" href="/spend" accent={SP_ACCENT} delay={240}
            note={sales && purchases ? `HIS sales ${sales} + purchases ${purchases}` : "HIS sales + GRN purchases"} />
          <KpiBlock title="Revenue" subtitle="IP · OP · Margin %" href="/revenue" accent={RV_ACCENT} delay={290}
            note={sales ? `HIS IP + OP sales · ${sales}` : null} />
        </div>

        <SectionLabel>Analytics</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-11">
          {ANALYTICS.map((t, i) => <KpiBlock key={t.href} {...t} delay={340 + i * 90} />)}
        </div>

        <SectionLabel>Forecasting</SectionLabel>
        {/* Was a lopsided 1-vs-2 row: the Forecasting tile beside a much wider card
            explaining what forecasting is, restating the sidebar's own three links in
            paragraph form. Same 3-column grid as the Analytics row above so it keeps
            the page's established rhythm — just placed in the centre column instead
            of stretched into an asymmetric split. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-start-2">
            <KpiBlock title="Forecasting" subtitle="Demand · Budget · Risk" href="/forecasting" accent={FC_ACCENT} delay={610} />
          </div>
        </div>

        <div className="mt-11"><SectionLabel>Data</SectionLabel></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-start-2">
            <KpiBlock title="Exports" subtitle="Sales by item · GRN purchases" href="/exports" accent={DX_ACCENT} delay={680}
              note={[sales ? `sales ${sales}` : null, grn ? `GRN ${grn}` : null].filter(Boolean).join(" · ") || null} />
          </div>
        </div>

        <div className="hm-in mt-10 pt-6 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: "1px solid #e0e3eb", animationDelay: "720ms" }}>
          <span className="text-[11.5px]" style={{ color: "#9aa0b0" }}>HCG Hospitals · Supply Chain Analytics</span>
          <span className="text-[11.5px]" style={{ color: "#b3b8c6" }}>Powered by Bidezy</span>
        </div>
      </div>
    </div>
  );
}
