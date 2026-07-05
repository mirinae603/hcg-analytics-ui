"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { PORTFOLIOS, byPortfolio } from "@/lib/kpiRegistry";
import {
  TbPackage, TbShoppingCart, TbReportMedical, TbTelescope, TbUserCircle,
  TbLayoutDashboard, TbChevronRight,
  TbStack2, TbHourglass, TbCalendarTime, TbArrowsExchange, TbChartDonut, TbHeartbeat,
  TbBan, TbAlertTriangle, TbClockExclamation, TbRotateClockwise2, TbReportMoney,
  TbCoin, TbReceipt, TbTrendingDown, TbBuildingFactory2, TbMapPin, TbClockHour4, TbTruckDelivery, TbProgressCheck,
  TbPill, TbBuildingHospital,
  TbTargetArrow, TbRadar2, TbChartDots3, TbChartLine, TbCashBanknote, TbReload,
  TbLogin2, TbUserPlus, TbHome,
} from "react-icons/tb";

// ── Two-level navigation: a slim icon rail + a fluid flyout panel that slides out to the
//    right with the selected portfolio's KPIs. Custom line icons, per-portfolio overview. ──

type Ico = React.ComponentType<{ size?: number; className?: string }>;
// Restrained, professional palette — neutral surfaces, one accent used sparingly.
const ACCENT = "#4f46e5";        // indigo-600, the single accent
const ACCENT_SOFT = "#eef0fb";   // active row tint
const INK = "#1f2333";           // primary text
const LABEL = "#414658";         // item labels
const MUTED = "#73768a";         // inactive icons
const FAINT = "#9ba0b0";          // descriptions
const HOVER = "#f4f5f8";
const BORDER = "#ececf1";
const RAIL_W = 84;
const PANEL_W = 280;
const HEADER_H = 77; // app header is sticky/77px — flyout tucks below it

const PF_ICON: Record<string, Ico> = {
  inventory: TbPackage, procurement: TbShoppingCart, consumption: TbReportMedical, forecasting: TbTelescope,
};
const KPI_ICON: Record<string, Ico> = {
  "current-stock-value": TbStack2, "inventory-aging": TbHourglass, "days-on-hand": TbCalendarTime,
  "stock-change": TbArrowsExchange, "aging-distribution": TbChartDonut, "inventory-health-score": TbHeartbeat,
  "non-moving-inventory": TbBan, "inventory-risk": TbAlertTriangle, "near-expiry": TbClockExclamation,
  "inventory-turnover-ratio": TbRotateClockwise2, "inventory-valuation": TbReportMoney,
  "purchase-value": TbCoin, "monthly-purchase-value": TbReceipt, "procurement-variance": TbTrendingDown,
  "vendor-volume-contribution": TbBuildingFactory2, "purchase-by-location": TbMapPin,
  "procurement-cycle-time": TbClockHour4, "vendor-lead-time": TbTruckDelivery, "fill-rate": TbProgressCheck,
  "unit-sold-per-sku": TbPill, "consumption-by-department": TbBuildingHospital,
  "fulfillment-rate": TbTargetArrow, "stock-radar": TbRadar2, "aging-risk-forecast": TbChartDots3,
};

type PanelItem = { name: string; title?: string; path: string; Icon: Ico };
type Panel = { key: string; name: string; desc: string; Icon: Ico; items: PanelItem[] };

// Forecasting is delivered as 3 merged pages (original-app designs). Stock Radar,
// Fulfillment Rate & Aging-Risk-Forecast fold into "Replenishment & Aging Risk".
const FC_EXTRA: PanelItem[] = [
  { name: "Demand Forecast", title: "Expected Demand Forecast", path: "/salesQuantityForecast", Icon: TbChartLine },
  { name: "Cash-Flow Forecast", title: "Cash-Flow Forecast", path: "/cashFlowForecast", Icon: TbCashBanknote },
  { name: "Replenishment & Aging Risk", title: "Replenishment · Stock Radar · Aging Risk", path: "/stockReplenishmentForecast", Icon: TbReload },
];

const PANELS: Panel[] = PORTFOLIOS.map((p) => ({
  key: p.key, name: p.name, desc: p.desc, Icon: PF_ICON[p.key] ?? TbChartDots3,
  items: p.key === "forecasting"
    ? FC_EXTRA
    : byPortfolio(p.key).map((k) => ({ name: k.short, title: k.title, path: `/kpi/${k.key}`, Icon: KPI_ICON[k.key] ?? TbChartDots3 })),
}));

const ACCOUNT: Panel = {
  key: "account", name: "Account", desc: "Your session", Icon: TbUserCircle,
  items: [{ name: "Sign In", path: "/signin", Icon: TbLogin2 }, { name: "Sign Up", path: "/signup", Icon: TbUserPlus }],
};
const ALL: Panel[] = [...PANELS, ACCOUNT];

const KPI_PF: Record<string, string> = {};
PORTFOLIOS.forEach((p) => byPortfolio(p.key).forEach((k) => { KPI_PF[k.key] = p.key; }));
const FC_PATHS = new Set(FC_EXTRA.map((i) => i.path));

function portfolioOf(path: string): string | null {
  if (path.startsWith("/kpi/")) return KPI_PF[path.split("/")[2]] ?? null;
  if (FC_PATHS.has(path)) return "forecasting";
  if (path === "/signin" || path === "/signup") return "account";
  const seg = "/" + path.split("/")[1];
  const pf = PORTFOLIOS.find((p) => `/${p.key}` === seg);
  return pf ? pf.key : null;
}

const AppSidebar: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const routePf = useMemo(() => portfolioOf(pathname), [pathname]);

  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shownKey = hoverKey ?? pinnedKey;
  const open = !!shownKey;
  const [lastKey, setLastKey] = useState<string>(routePf && routePf !== "account" ? routePf : "inventory");
  useEffect(() => { if (shownKey) setLastKey(shownKey); }, [shownKey]);
  const panel = ALL.find((p) => p.key === (shownKey ?? lastKey)) ?? PANELS[0];

  const clearTimer = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const enterTile = (key: string) => { clearTimer(); setHoverKey(key); };
  const scheduleClose = () => { clearTimer(); closeTimer.current = setTimeout(() => setHoverKey(null), 160); };
  const clickTile = (key: string) => { clearTimer(); setHoverKey(key); setPinnedKey((p) => (p === key ? null : key)); };
  const pickItem = () => { clearTimer(); setHoverKey(null); setPinnedKey(null); if (isMobileOpen) toggleMobileSidebar(); };

  const isActivePath = (path: string) => pathname === path;
  const tileActive = (key: string) => key === (shownKey ?? routePf);

  const Tile = ({ p }: { p: Panel }) => {
    const active = tileActive(p.key);
    const Icon = p.Icon;
    return (
      <div className="relative w-full flex items-center justify-center">
        {/* thin active indicator at the rail edge */}
        <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-300" style={{ width: 2.5, height: active ? 22 : 0, background: ACCENT }} />
        <button
          onMouseEnter={() => enterTile(p.key)}
          onClick={() => clickTile(p.key)}
          className="group relative flex items-center justify-center rounded-[12px] transition-colors duration-150"
          style={{ width: 46, height: 46, background: active ? ACCENT_SOFT : "transparent" }}
          title={p.name}
          onMouseOver={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = HOVER; }}
          onMouseOut={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <Icon size={21} style={{ color: active ? ACCENT : MUTED }} />
        </button>
      </div>
    );
  };

  const dashActive = isActivePath(`/${panel.key}`);

  return (
    <>
      {isMobileOpen && <div onClick={toggleMobileSidebar} className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm lg:hidden" />}

      <aside
        onMouseLeave={scheduleClose}
        className={`fixed top-0 left-0 z-50 h-screen flex transition-transform duration-300 ease-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* ── RAIL ── */}
        <div className="relative z-10 h-full flex flex-col items-center bg-white dark:bg-gray-900" style={{ width: RAIL_W, borderRight: `1px solid ${BORDER}` }}>
          <Link href="/" className="mt-5 mb-4 flex items-center justify-center rounded-[12px]"
            style={{ width: 40, height: 40, background: "#f4f6fb", border: `1px solid ${BORDER}` }} title="HCG — Home">
            <img src="/images/logo/hcg-butterfly.svg" alt="HCG" style={{ width: 26, height: 24 }} />
          </Link>

          {/* Home */}
          <div className="w-full px-3 pb-3 mb-1 flex justify-center" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <Link href="/" title="Home"
              className="group relative flex items-center justify-center rounded-[12px] transition-colors duration-150"
              style={{ width: 46, height: 46, background: pathname === "/" ? ACCENT_SOFT : "transparent" }}
              onMouseOver={(e) => { if (pathname !== "/") (e.currentTarget as HTMLElement).style.background = HOVER; }}
              onMouseOut={(e) => { if (pathname !== "/") (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-300" style={{ width: 2.5, height: pathname === "/" ? 20 : 0, background: ACCENT }} />
              <TbHome size={21} style={{ color: pathname === "/" ? ACCENT : MUTED }} />
            </Link>
          </div>

          <div className="flex-1 w-full px-3 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            {PANELS.map((p) => <Tile key={p.key} p={p} />)}
          </div>

          <div className="w-full px-3 pb-4 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
            <Tile p={ACCOUNT} />
          </div>
        </div>

        {/* ── FLYOUT PANEL ── */}
        <div
          onMouseEnter={clearTimer}
          className="absolute flex flex-col bg-white dark:bg-gray-900"
          style={{
            left: RAIL_W, top: HEADER_H, height: `calc(100vh - ${HEADER_H}px)`, width: PANEL_W,
            borderRight: `1px solid ${BORDER}`,
            boxShadow: open ? "18px 0 44px -34px rgba(20,24,40,0.28)" : "none",
            opacity: open ? 1 : 0,
            transform: open ? "translateX(0)" : "translateX(-16px)",
            pointerEvents: open ? "auto" : "none",
            transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease",
          }}
        >
          {/* header */}
          <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center rounded-[10px] flex-shrink-0" style={{ width: 38, height: 38, background: "#f4f5f8", color: INK }}><panel.Icon size={20} /></span>
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-semibold leading-tight truncate" style={{ color: INK }}>{panel.name}</h3>
                <p className="text-[11.5px] mt-0.5 truncate" style={{ color: FAINT }}>{panel.desc}</p>
              </div>
            </div>
          </div>

          {/* overview / dashboard link (portfolios only) */}
          {panel.key !== "account" && (
            <div className="px-3 pt-3">
              <Link href={`/${panel.key}`} onClick={pickItem}
                className="relative flex items-center gap-3 rounded-[10px] pl-3 pr-3 py-2.5 transition-colors duration-150"
                style={{ background: dashActive ? ACCENT_SOFT : "transparent" }}
                onMouseOver={(e) => { if (!dashActive) (e.currentTarget as HTMLElement).style.background = HOVER; }}
                onMouseOut={(e) => { if (!dashActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-300" style={{ width: 2.5, height: dashActive ? 18 : 0, background: ACCENT }} />
                <TbLayoutDashboard size={18} style={{ color: dashActive ? ACCENT : MUTED, flexShrink: 0 }} />
                <span className="text-[13px] font-medium flex-1" style={{ color: dashActive ? ACCENT : LABEL }}>Overview</span>
                <TbChevronRight size={15} style={{ color: dashActive ? ACCENT : "#c4c7d2" }} />
              </Link>
            </div>
          )}

          {/* section label */}
          <div className="px-5 pt-4 pb-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em]" style={{ color: "#aab0c0" }}>{panel.key === "account" ? "Options" : "Metrics"}</span>
          </div>

          {/* items */}
          <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
            <ul className="flex flex-col gap-0.5">
              {panel.items.map((it) => {
                const active = isActivePath(it.path);
                const Icon = it.Icon;
                return (
                  <li key={it.path}>
                    <Link href={it.path} onClick={pickItem}
                      className="group relative flex items-center gap-3 rounded-[10px] pl-3 pr-2.5 py-2 transition-colors duration-150"
                      style={{ background: active ? ACCENT_SOFT : "transparent" }}
                      onMouseOver={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = HOVER; }}
                      onMouseOut={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-300" style={{ width: 2.5, height: active ? 18 : 0, background: ACCENT }} />
                      <Icon size={18} style={{ color: active ? ACCENT : MUTED, flexShrink: 0 }} />
                      <span className="text-[13px] truncate flex-1" style={{ color: active ? ACCENT : LABEL, fontWeight: active ? 600 : 500 }} title={it.title || it.name}>{it.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
