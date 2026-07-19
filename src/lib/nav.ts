// Deterministic "up one level" navigation for the whole app.
//
// The old header used router.back(), which follows raw browser history — so on a
// refresh, a deep link, a new tab, or after any in-page KPI→KPI hop it sent the user
// somewhere unpredictable. parentOf() instead computes each page's LOGICAL parent
// from the route + the KPI registry, so "Back" always lands on the right place.
import { byKey, simKpiByKey } from "./kpiRegistry";

const PORTFOLIO_META: Record<string, { route: string; title: string }> = {
  inventory: { route: "/inventory", title: "Inventory" },
  procurement: { route: "/procurement", title: "Procurement" },
  consumption: { route: "/consumption", title: "Consumption & Revenue" },
  forecasting: { route: "/forecasting", title: "Forecasting" },
};

// Sub-pages that belong under a portfolio but aren't /kpi/* routes.
const SPECIAL_PARENT: Record<string, keyof typeof PORTFOLIO_META> = {
  revenueMargin: "consumption",
  salesQuantityForecast: "forecasting",
  cashFlowForecast: "forecasting",
  stockReplenishmentForecast: "forecasting",
};

export type ParentLink = { href: string; label: string };

export function parentOf(pathname: string | null | undefined): ParentLink | null {
  if (!pathname || pathname === "/") return null; // Home is the root — no parent.

  // KPI detail page → its portfolio's landing page.
  const kpiMatch = pathname.match(/^\/kpi\/([^/?#]+)/);
  if (kpiMatch) {
    const key = decodeURIComponent(kpiMatch[1]);
    const portfolio = byKey(key)?.portfolio || simKpiByKey(key)?.portfolio;
    const meta = portfolio ? PORTFOLIO_META[portfolio] : undefined;
    return meta ? { href: meta.route, label: `Back to ${meta.title}` } : { href: "/", label: "Back to Home" };
  }

  // First path segment (e.g. "inventory", "revenueMargin").
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";

  // Portfolio landing pages → Home.
  if (["inventory", "procurement", "consumption", "forecasting"].includes(seg)) {
    return { href: "/", label: "Back to Home" };
  }

  // Special sub-pages → their portfolio.
  if (SPECIAL_PARENT[seg]) {
    const meta = PORTFOLIO_META[SPECIAL_PARENT[seg]];
    return { href: meta.route, label: `Back to ${meta.title}` };
  }

  // Everything else (ai, ui-element demos, etc.) → Home.
  return { href: "/", label: "Back to Home" };
}
