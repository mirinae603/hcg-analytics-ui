// Simulated data for the KPIs the current HCG SAP extract can't fully support.
// GROUNDED in the real data (see realAnchors.ts): every dimension list (hospitals,
// vendors, categories), every total and the monthly demand series are REAL — only
// the genuinely-missing metric (billing flag, returns, patient-type, SLA target,
// selling price, 12-mo history) is modelled on top. `basis` states which is which.
// Seeded per-key so the modelled overlay is stable across renders.
import { ChartCfg, Kind } from "./kpiRegistry";
import { REAL } from "./realAnchors";

export type SimCard = { label: string; value: number; kind: Kind };
export type SimBundle = {
  chartCfg: ChartCfg;
  chartData: Record<string, any>[];
  summary: SimCard[];
  headline: SimCard & { deltaPct?: number };
  table: { columns: { key: string; label: string; kind?: Kind }[]; rows: Record<string, any>[] };
  insight: string;
  basis: { real: string; modelled: string };
};

// ── seeded RNG ────────────────────────────────────────────────────────────────
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seed(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const R = (r: () => number, a: number, b: number) => a + r() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0);

type Builder = (r: () => number) => SimBundle;

const BUILDERS: Record<string, Builder> = {
  // ──────────────── CONSUMPTION & REVENUE ────────────────
  // Real consumption cost per real category; modelled billable vs non-billable split.
  // Real monthly issued units; modelled return rate.
  "return-rate": (r) => {
    const rows = REAL.months.map((m) => {
      const rate = R(r, 1.2, 4.6), returned = Math.round(m.qty * rate / 100);
      return { month: m.m, issued: m.qty, returned, return_pct: +rate.toFixed(2) };
    });
    const rates = rows.map((x) => x.return_pct);
    return {
      chartCfg: { type: "line", x: "month", series: [{ field: "return_pct", label: "Return Rate %", color: "#f43f5e" }], valueKind: "pct" },
      chartData: rows,
      headline: { label: "Avg Return Rate", value: +avg(rates).toFixed(2), kind: "pct", deltaPct: -+R(r, 2, 6).toFixed(1) },
      summary: [{ label: "Units Returned", value: sum(rows.map((x) => x.returned)), kind: "num" }, { label: "Units Issued", value: sum(rows.map((x) => x.issued)), kind: "num" }, { label: "Peak Month %", value: Math.max(...rates), kind: "pct" }],
      table: { columns: [{ key: "month", label: "Month" }, { key: "issued", label: "Issued (real)", kind: "num" }, { key: "returned", label: "Returned", kind: "num" }, { key: "return_pct", label: "Return %", kind: "pct" }], rows },
      insight: "Return rate holds low against real issue volume — tighter on high-turn consumables.",
      basis: { real: "Monthly issued units (Dec–May)", modelled: "Return rate — no returns / write-off movements in source" },
    };
  },
  // Real MRP-valued consumption per real hospital (the MRP revenue proxy).
  // Real total MRP-valued consumption; modelled IP/OP/Day-care split.
  // Real consumption cost per real category; modelled sale margin.

  // ──────────────── PROCUREMENT ────────────────
  // Real vendors + real PO→GR lead time; modelled SLA target & on-time %.
  "vendor-sla-compliance": (r) => {
    const rows = REAL.vendors.map((v) => {
      const promised = Math.max(3, Math.ceil(v.lead) + 1);
      const onTime = Math.round(clamp(97 - v.lead * 3.6 + R(r, -4, 4), 47, 99));
      return { vendor: v.name, promised_days: promised, actual_days: v.lead, on_time_pct: onTime };
    }).sort((a, b) => b.on_time_pct - a.on_time_pct);
    return {
      chartCfg: { type: "bar", x: "vendor", series: [{ field: "on_time_pct", label: "On-Time %", color: "#0ea5e9" }], valueKind: "pct" },
      chartData: rows,
      headline: { label: "Avg On-Time", value: Math.round(avg(rows.map((x) => x.on_time_pct))), kind: "pct", deltaPct: +R(r, 1, 4).toFixed(1) },
      summary: [{ label: "Vendors Tracked", value: rows.length, kind: "num" }, { label: "SLA Breaches", value: rows.filter((x) => x.on_time_pct < 80).length, kind: "num" }, { label: "Best Vendor %", value: Math.max(...rows.map((x) => x.on_time_pct)), kind: "pct" }],
      table: { columns: [{ key: "vendor", label: "Vendor" }, { key: "promised_days", label: "SLA (d)", kind: "num" }, { key: "actual_days", label: "Actual Lead (d, real)", kind: "num" }, { key: "on_time_pct", label: "On-Time %", kind: "pct" }], rows },
      insight: "High-volume suppliers with short real lead times clear SLA comfortably; slow tail lags.",
      basis: { real: "Vendors & PO→GR lead time (top by GR volume)", modelled: "SLA target & on-time % — no agreed SLA in source" },
    };
  },
  // Real count of SKUs flagged for replenishment; modelled reorder-timing accuracy.
  "reorder-accuracy": (r) => {
    const tot = REAL.skusNeedReplen;
    const onS = R(r, 0.6, 0.7), earlyS = R(r, 0.14, 0.22), lateS = 1 - onS - earlyS;
    const onTarget = Math.round(tot * onS), early = Math.round(tot * earlyS), late = tot - onTarget - early;
    const rows = [
      { status: "On-Target", skus: onTarget, share_pct: +(onS * 100).toFixed(1) },
      { status: "Too Early", skus: early, share_pct: +(earlyS * 100).toFixed(1) },
      { status: "Too Late", skus: late, share_pct: +(lateS * 100).toFixed(1) },
    ];
    return {
      chartCfg: { type: "donut", x: "status", series: [{ field: "skus", label: "SKUs" }], valueKind: "num" },
      chartData: rows,
      headline: { label: "Reorder Accuracy", value: +(onS * 100).toFixed(1), kind: "pct" },
      summary: [{ label: "On-Target SKUs", value: onTarget, kind: "num" }, { label: "Mis-Timed", value: early + late, kind: "num" }, { label: "SKUs Flagged", value: tot, kind: "num" }],
      table: { columns: [{ key: "status", label: "Status" }, { key: "skus", label: "SKUs", kind: "num" }, { key: "share_pct", label: "Share %", kind: "pct" }], rows },
      insight: "Most of the 14,989 replenishment SKUs fire on target; late triggers risk fast-mover stock-outs.",
      basis: { real: "14,989 SKUs flagged for replenishment", modelled: "Reorder-timing accuracy — no reorder-point / safety-stock master in source" },
    };
  },

  // ──────────────── INVENTORY ────────────────
  // Real stock value per real category; assumed carrying rate.
  "holding-cost": (r) => {
    const carry = 18;
    const rows = REAL.invByCat.map((c) => ({ category: c.cat, avg_inventory: c.value, carrying_pct: carry, holding_cost: Math.round(c.value * carry / 100) }));
    return {
      chartCfg: { type: "bar", x: "category", series: [{ field: "holding_cost", label: "Holding Cost", color: "#f97316" }], valueKind: "inr" },
      chartData: rows,
      headline: { label: "Annual Holding Cost", value: sum(rows.map((x) => x.holding_cost)), kind: "inr", deltaPct: -+R(r, 2, 5).toFixed(1) },
      summary: [{ label: "Stock Value (real)", value: sum(rows.map((x) => x.avg_inventory)), kind: "inr" }, { label: "Carrying Rate", value: carry, kind: "pct" }, { label: "Categories", value: rows.length, kind: "num" }],
      table: { columns: [{ key: "category", label: "Category" }, { key: "avg_inventory", label: "Stock Value (real)", kind: "inr" }, { key: "carrying_pct", label: "Carrying %", kind: "pct" }, { key: "holding_cost", label: "Holding Cost", kind: "inr" }], rows },
      insight: "Injections dominate carrying cost on real stock value — the prime target for JIT.",
      basis: { real: "Stock value by category (₹60 Cr snapshot)", modelled: "18% annual carrying rate — no holding-cost rate in source" },
    };
  },
  // Real SKU count + real monthly window; modelled stock-out rate.

  // ──────────────── FORECASTING ────────────────
  // Real monthly demand (Dec–May) as the last 6 months; modelled prior 6 + forecast.
  "seasonal-forecast": (r) => {
    const real = REAL.months;                              // Dec..May (real qty)
    const mean = avg(real.map((m) => m.qty));
    const prior = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m, i) => {
      const seas = 1 + 0.16 * Math.sin(((i + 5) / 12) * Math.PI * 2);
      return { m, qty: Math.round(mean * seas * R(r, 0.94, 1.06)), real: false };
    });
    const realRows = real.map((m) => ({ m: m.m, qty: m.qty, real: true }));
    const rows = [...prior, ...realRows].map((x) => {
      const forecast = Math.round(x.qty * R(r, 0.93, 1.07));
      return { month: x.m, actual: x.qty, forecast, error_pct: +(Math.abs(x.qty - forecast) / x.qty * 100).toFixed(1), source: x.real ? "actual" : "modelled" };
    });
    return {
      chartCfg: { type: "line", x: "month", series: [{ field: "actual", label: "Actual", color: "#3b82f6" }, { field: "forecast", label: "Forecast", color: "#10b981" }], valueKind: "num" },
      chartData: rows,
      headline: { label: "Forecast Accuracy", value: +(100 - avg(rows.map((x) => x.error_pct))).toFixed(1), kind: "pct", deltaPct: +R(r, 2, 6).toFixed(1) },
      summary: [{ label: "MAPE", value: +avg(rows.map((x) => x.error_pct)).toFixed(1), kind: "pct" }, { label: "Months Modeled", value: 12, kind: "num" }, { label: "Seasonal Peak", value: Math.max(...rows.map((x) => x.actual)), kind: "num" }],
      table: { columns: [{ key: "month", label: "Month" }, { key: "actual", label: "Actual", kind: "num" }, { key: "forecast", label: "Forecast", kind: "num" }, { key: "error_pct", label: "Error %", kind: "pct" }, { key: "source", label: "Source" }], rows },
      insight: "Extending real Dec–May demand to a full year exposes seasonality — captured within ±7%.",
      basis: { real: "6 months actual demand (Dec–May, ~3.2–4.2M units/mo)", modelled: "Prior 6 months + forecast — source has only 6 months history" },
    };
  },
};

export const isSimulated = (key: string) => !!BUILDERS[key];
export function getSimulated(key: string): SimBundle | null {
  const fn = BUILDERS[key];
  return fn ? fn(mulberry32(seed(key))) : null;
}
