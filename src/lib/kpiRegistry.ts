// Single source of truth for the portfolio dashboards + KPI drill-downs.
// Field names match the backend generic endpoints (/kpi/{key}, /kpi/{key}/table,
// /portfolio/{name}/summary). Only the 28 buildable KPIs are listed.

export type Kind = "inr" | "num" | "pct" | "date" | "text";
export type Col = { field: string; label: string; kind?: Kind };
export type ChartCfg = {
  type: "line" | "bar" | "donut";
  groupBy?: string;
  measures?: string;
  top?: number;
  x: string;
  series: { field: string; label: string; color?: string }[];
  valueKind?: Kind;
};
export type Card = { field: string; agg: "sum" | "mean" | "median" | "count"; kind: Kind; label: string };
export type Kpi = {
  key: string;
  title: string;
  short: string;
  portfolio: "inventory" | "procurement" | "consumption" | "forecasting";
  icon: string;            // emoji used on the summary card
  chart?: ChartCfg;
  card: Card;              // headline metric for the portfolio card
  summary?: Card[];        // summary cards on the drill-down
  columns: Col[];
  special?: "sales-forecast" | "cashflow" | "replenishment"; // uses dedicated endpoint/page
  note?: string;
};

const C = { blue: "#465fff", cyan: "#0086c9", green: "#12b76a", orange: "#fb6514", red: "#f04438", purple: "#7a5af8" };

export const KPIS: Kpi[] = [
  // ---------------- INVENTORY ----------------
  {
    key: "current-stock-value", title: "Current Stock Value", short: "Stock Value", portfolio: "inventory", icon: "📦",
    chart: { type: "bar", groupBy: "material_group", measures: "stock_value_cost", top: 12, x: "material_group",
      series: [{ field: "stock_value_cost", label: "Stock Value (Cost)", color: C.blue }], valueKind: "inr" },
    card: { field: "stock_value_cost", agg: "sum", kind: "inr", label: "Total Stock Value" },
    summary: [{ field: "stock_value_cost", agg: "sum", kind: "inr", label: "Stock Value (Cost)" },
              { field: "stock_value_mrp", agg: "sum", kind: "inr", label: "Stock Value (MRP)" }],
    columns: [{ field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "material_group", label: "Category" }, { field: "stock_qty", label: "Qty", kind: "num" },
      { field: "stock_value_cost", label: "Value (Cost)", kind: "inr" }, { field: "stock_value_mrp", label: "Value (MRP)", kind: "inr" }],
  },
  {
    key: "inventory-aging", title: "Inventory Aging", short: "Aging", portfolio: "inventory", icon: "⏳",
    chart: { type: "bar", groupBy: "aging_category", measures: "closing_stock_value", x: "aging_category",
      series: [{ field: "closing_stock_value", label: "Stock Value", color: C.orange }], valueKind: "inr" },
    card: { field: "aging_days", agg: "mean", kind: "num", label: "Avg Aging (days)" },
    summary: [{ field: "closing_stock_value", agg: "sum", kind: "inr", label: "Stock Value" },
              { field: "aging_days", agg: "mean", kind: "num", label: "Avg Aging (days)" }],
    columns: [{ field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "aging_days", label: "Aging (days)", kind: "num" }, { field: "aging_category", label: "Bucket" },
      { field: "age_since_last_sale_days", label: "Since Last Issue", kind: "num" },
      { field: "closing_stock_quantity", label: "Qty", kind: "num" }, { field: "closing_stock_value", label: "Value", kind: "inr" }],
  },
  {
    key: "days-on-hand", title: "Days of Inventory on Hand", short: "DOH", portfolio: "inventory", icon: "📅",
    chart: { type: "bar", top: 15, x: "material_desc",
      series: [{ field: "doh_days", label: "Days on Hand", color: C.purple }], valueKind: "num" },
    card: { field: "doh_days", agg: "median", kind: "num", label: "Median DOH (days)" },
    summary: [{ field: "doh_days", agg: "median", kind: "num", label: "Median DOH (days)" }],
    columns: [{ field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "stock_qty", label: "Stock Qty", kind: "num" }, { field: "avg_daily_consumption", label: "Daily Use", kind: "num" },
      { field: "doh_days", label: "DOH (days)", kind: "num" }],
  },
  {
    key: "stock-change", title: "Stock Level Change Over Time", short: "Stock Change", portfolio: "inventory", icon: "🔄",
    chart: { type: "line", groupBy: "year,month", measures: "inflow,outflow,stock_change", x: "month",
      series: [{ field: "inflow", label: "Inflow (GRN)", color: C.green }, { field: "outflow", label: "Outflow", color: C.red },
               { field: "stock_change", label: "Net Change", color: C.blue }], valueKind: "num" },
    card: { field: "stock_change", agg: "sum", kind: "num", label: "Net Δ Qty (6mo)" },
    columns: [{ field: "month", label: "Month" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "inflow", label: "Inflow", kind: "num" }, { field: "outflow", label: "Outflow", kind: "num" },
      { field: "stock_change", label: "Net Change", kind: "num" }],
  },
  {
    key: "aging-distribution", title: "Aging Distribution", short: "Aging Dist.", portfolio: "inventory", icon: "🗂️",
    chart: { type: "donut", groupBy: "aging_bucket", measures: "stock_value", x: "aging_bucket",
      series: [{ field: "stock_value", label: "Stock Value" }], valueKind: "inr" },
    card: { field: "stock_value", agg: "sum", kind: "inr", label: "Total Value" },
    summary: [{ field: "stock_value", agg: "sum", kind: "inr", label: "Total Value" },
              { field: "sku_count", agg: "sum", kind: "num", label: "SKU lines" }],
    columns: [{ field: "material_group", label: "Category" }, { field: "aging_bucket", label: "Bucket" },
      { field: "stock_value", label: "Value", kind: "inr" }, { field: "stock_qty", label: "Qty", kind: "num" },
      { field: "sku_count", label: "SKUs", kind: "num" }],
  },
  {
    key: "inventory-health-score", title: "Inventory Health Score", short: "Health Score", portfolio: "inventory", icon: "❤️",
    chart: { type: "donut", groupBy: "health_tier", measures: "closing_stock_value", x: "health_tier",
      series: [{ field: "closing_stock_value", label: "Stock Value" }], valueKind: "inr" },
    card: { field: "health_score", agg: "mean", kind: "num", label: "Avg Health Score" },
    columns: [{ field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "health_score", label: "Score", kind: "num" }, { field: "health_tier", label: "Tier" },
      { field: "aging_days", label: "Aging", kind: "num" }, { field: "turnover_annualized", label: "Turnover", kind: "num" }],
  },
  {
    key: "non-moving-inventory", title: "Non-Moving Inventory", short: "Non-Moving", portfolio: "inventory", icon: "🚫",
    chart: { type: "donut", groupBy: "reason", measures: "closing_stock_value", x: "reason",
      series: [{ field: "closing_stock_value", label: "Blocked Value" }], valueKind: "inr" },
    card: { field: "closing_stock_value", agg: "sum", kind: "inr", label: "Blocked Value" },
    summary: [{ field: "closing_stock_value", agg: "sum", kind: "inr", label: "Blocked Value" }],
    columns: [{ field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "aging_days", label: "Aging", kind: "num" }, { field: "closing_stock_quantity", label: "Qty", kind: "num" },
      { field: "closing_stock_value", label: "Value", kind: "inr" }, { field: "reason", label: "Reason" }],
  },
  {
    key: "inventory-risk", title: "Inventory Risk Classification", short: "Risk", portfolio: "inventory", icon: "⚠️",
    chart: { type: "donut", groupBy: "risk_level", measures: "closing_stock_value", x: "risk_level",
      series: [{ field: "closing_stock_value", label: "Value at Risk" }], valueKind: "inr" },
    card: { field: "closing_stock_value", agg: "sum", kind: "inr", label: "Value Classified" },
    columns: [{ field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "risk_level", label: "Risk" }, { field: "aging_days", label: "Aging", kind: "num" },
      { field: "days_to_expiry", label: "Days to Expiry", kind: "num" }, { field: "closing_stock_value", label: "Value", kind: "inr" }],
  },
  {
    key: "near-expiry", title: "Near-Expiry Inventory", short: "Near Expiry", portfolio: "inventory", icon: "⏰",
    chart: { type: "donut", groupBy: "expiry_bucket", measures: "total_cost", x: "expiry_bucket",
      series: [{ field: "total_cost", label: "Value" }], valueKind: "inr" },
    card: { field: "total_cost", agg: "sum", kind: "inr", label: "Value ≤180d" },
    summary: [{ field: "total_cost", agg: "sum", kind: "inr", label: "Value at Risk" }],
    columns: [{ field: "material", label: "Material" }, { field: "material_desc", label: "Description" }, { field: "batch", label: "Batch" },
      { field: "expiry_date", label: "Expiry", kind: "date" }, { field: "days_to_expiry", label: "Days Left", kind: "num" },
      { field: "expiry_bucket", label: "Bucket" }, { field: "total_cost", label: "Value", kind: "inr" }],
  },
  {
    key: "inventory-turnover-ratio", title: "Inventory Turnover Ratio", short: "Turnover", portfolio: "inventory", icon: "🔁",
    chart: { type: "bar", groupBy: "material_group", measures: "ITR", top: 12, x: "material_group",
      series: [{ field: "ITR", label: "ITR", color: C.cyan }], valueKind: "num" },
    card: { field: "ITR", agg: "mean", kind: "num", label: "Avg ITR (annualized)" },
    columns: [{ field: "Year", label: "Year" }, { field: "Month", label: "Month" },
      { field: "Material Group", label: "Category" }, { field: "ITR", label: "ITR", kind: "num" }],
    note: "Proxy — single inventory snapshot used as average inventory.",
  },
  {
    key: "inventory-valuation", title: "Inventory Valuation Trend", short: "Valuation", portfolio: "inventory", icon: "📈",
    chart: { type: "bar", groupBy: "Material Group", measures: "Inventory Valuation", top: 12, x: "Material Group",
      series: [{ field: "Inventory Valuation", label: "Valuation", color: C.blue }], valueKind: "inr" },
    card: { field: "Inventory Valuation", agg: "sum", kind: "inr", label: "Valuation" },
    columns: [{ field: "Year", label: "Year" }, { field: "Month", label: "Month" },
      { field: "Material Group", label: "Category" }, { field: "Inventory Valuation", label: "Valuation", kind: "inr" }],
    note: "Proxy — reconstructed from single snapshot; flagged as derived.",
  },

  // ---------------- PROCUREMENT ----------------
  {
    key: "purchase-value", title: "Purchase Value", short: "Purchase Value", portfolio: "procurement", icon: "💰",
    chart: { type: "line", groupBy: "year,month", measures: "purchase_value", x: "month",
      series: [{ field: "purchase_value", label: "Purchase Value", color: C.blue }], valueKind: "inr" },
    card: { field: "purchase_value", agg: "sum", kind: "inr", label: "Total Spend (6mo)" },
    columns: [{ field: "month", label: "Month" }, { field: "vendor_name", label: "Vendor" }, { field: "category", label: "Category" },
      { field: "purchase_value", label: "Value", kind: "inr" }, { field: "purchase_qty", label: "Qty", kind: "num" }],
  },
  {
    key: "monthly-purchase-value", title: "Monthly SKU Purchase Value", short: "Monthly Purchase", portfolio: "procurement", icon: "🧾",
    chart: { type: "line", groupBy: "year,month", measures: "monthly_purchase_value", x: "month",
      series: [{ field: "monthly_purchase_value", label: "Purchase Value", color: C.cyan }], valueKind: "inr" },
    card: { field: "monthly_purchase_value", agg: "sum", kind: "inr", label: "Total (6mo)" },
    columns: [{ field: "month", label: "Month" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "monthly_purchase_value", label: "Value", kind: "inr" }, { field: "purchase_qty", label: "Qty", kind: "num" }],
  },
  {
    key: "procurement-variance", title: "Procurement Variance", short: "Variance", portfolio: "procurement", icon: "📉",
    chart: { type: "line", groupBy: "year,month", measures: "purchase_value", x: "month",
      series: [{ field: "purchase_value", label: "Monthly Spend", color: C.blue }], valueKind: "inr" },
    card: { field: "purchase_value", agg: "sum", kind: "inr", label: "Total Spend" },
    columns: [{ field: "month", label: "Month" }, { field: "purchase_value", label: "Spend", kind: "inr" },
      { field: "variance_abs", label: "MoM Δ", kind: "inr" }, { field: "variance_pct", label: "MoM Δ %", kind: "pct" }],
  },
  {
    key: "vendor-volume-contribution", title: "Vendor Volume Contribution", short: "Vendor Volume", portfolio: "procurement", icon: "🏭",
    chart: { type: "bar", groupBy: "vendor_name", measures: "vendor_value", top: 12, x: "vendor_name",
      series: [{ field: "vendor_value", label: "Spend", color: C.blue }], valueKind: "inr" },
    card: { field: "vendor_value", agg: "sum", kind: "inr", label: "Total Spend" },
    summary: [{ field: "vendor_name", agg: "count", kind: "num", label: "Vendors" }],
    columns: [{ field: "vendor_name", label: "Vendor" }, { field: "vendor_value", label: "Spend", kind: "inr" },
      { field: "vendor_qty", label: "Qty", kind: "num" }, { field: "value_share_pct", label: "Share %", kind: "pct" }],
  },
  {
    key: "purchase-by-location", title: "Purchase Distribution by Location", short: "By Location", portfolio: "procurement", icon: "📍",
    chart: { type: "bar", top: 20, x: "plant",
      series: [{ field: "purchase_value", label: "Spend", color: C.cyan }], valueKind: "inr" },
    card: { field: "purchase_value", agg: "sum", kind: "inr", label: "Total Spend" },
    columns: [{ field: "plant", label: "Plant" }, { field: "purchase_value", label: "Spend", kind: "inr" },
      { field: "purchase_qty", label: "Qty", kind: "num" }, { field: "vendor_count", label: "Vendors", kind: "num" }],
  },
  {
    key: "procurement-cycle-time", title: "Procurement Cycle Time", short: "Cycle Time", portfolio: "procurement", icon: "⏱️",
    chart: { type: "line", groupBy: "year,month", measures: "avg_po_to_gr_tat,avg_pr_to_gr_tat", x: "month",
      series: [{ field: "avg_po_to_gr_tat", label: "PO→GR (days)", color: C.blue }, { field: "avg_pr_to_gr_tat", label: "PR→GR (days)", color: C.orange }], valueKind: "num" },
    card: { field: "avg_po_to_gr_tat", agg: "mean", kind: "num", label: "Avg PO→GR (days)" },
    columns: [{ field: "month", label: "Month" }, { field: "avg_po_to_gr_tat", label: "PO→GR (days)", kind: "num" },
      { field: "avg_pr_to_gr_tat", label: "PR→GR (days)", kind: "num" }, { field: "gr_lines", label: "GR Lines", kind: "num" }],
  },
  {
    key: "vendor-lead-time", title: "Vendor Lead Time", short: "Lead Time", portfolio: "procurement", icon: "🚚",
    chart: { type: "bar", top: 15, x: "vendor_name",
      series: [{ field: "avg_lead_time_days", label: "Avg Lead Time (days)", color: C.red }], valueKind: "num" },
    card: { field: "avg_lead_time_days", agg: "mean", kind: "num", label: "Avg Lead Time (days)" },
    columns: [{ field: "vendor_name", label: "Vendor" }, { field: "avg_lead_time_days", label: "Avg Lead (days)", kind: "num" },
      { field: "median_lead_time_days", label: "Median (days)", kind: "num" }, { field: "gr_lines", label: "GR Lines", kind: "num" }],
  },
  {
    key: "fill-rate", title: "Fill Rate", short: "Fill Rate", portfolio: "procurement", icon: "✅",
    chart: { type: "bar", top: 20, x: "plant",
      series: [{ field: "fill_rate_pct", label: "Fill Rate %", color: C.green }], valueKind: "pct" },
    card: { field: "fill_rate_pct", agg: "mean", kind: "pct", label: "Avg Fill Rate" },
    columns: [{ field: "plant", label: "Plant" }, { field: "ordered_qty", label: "Ordered", kind: "num" },
      { field: "open_qty", label: "Open", kind: "num" }, { field: "fill_rate_pct", label: "Fill Rate %", kind: "pct" }],
  },

  // ---------------- CONSUMPTION & REVENUE ----------------
  {
    key: "unit-sold-per-sku", title: "Units Consumed per SKU", short: "Units Consumed", portfolio: "consumption", icon: "💊",
    chart: { type: "line", groupBy: "year,month", measures: "total_units", x: "month",
      series: [{ field: "total_units", label: "Units Consumed", color: C.green }], valueKind: "num" },
    card: { field: "total_units", agg: "sum", kind: "num", label: "Total Units (6mo)" },
    summary: [{ field: "consumption_cost", agg: "sum", kind: "inr", label: "Consumption Cost" }],
    columns: [{ field: "month", label: "Month" }, { field: "material", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "total_units", label: "Units", kind: "num" }, { field: "consumption_cost", label: "Cost", kind: "inr" }],
  },
  {
    key: "consumption-by-department", title: "Consumption by Department", short: "By Department", portfolio: "consumption", icon: "🏥",
    note: "Department = SAP Cost Center (name master pending from HCG).",
    chart: { type: "bar", groupBy: "department_name", measures: "consumption_cost", top: 12, x: "department_name",
      series: [{ field: "consumption_cost", label: "Consumption Cost", color: C.purple }], valueKind: "inr" },
    card: { field: "consumption_cost", agg: "sum", kind: "inr", label: "Total Consumption" },
    columns: [{ field: "department_name", label: "Department (Cost Ctr)" }, { field: "month", label: "Month" },
      { field: "consumption_qty", label: "Qty", kind: "num" }, { field: "consumption_cost", label: "Cost", kind: "inr" }],
  },

  // ---------------- FORECASTING (generic ones; demand/cashflow/replenishment use dedicated pages) ----------------
  {
    key: "fulfillment-rate", title: "Fulfillment Rate", short: "Fulfillment", portfolio: "forecasting", icon: "🎯",
    card: { field: "fulfillment_rate", agg: "mean", kind: "pct", label: "Avg Fulfillment" },
    columns: [{ field: "material_id", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "closing_stock", label: "Stock", kind: "num" }, { field: "demand_monthly", label: "Monthly Demand", kind: "num" },
      { field: "fulfillment_rate", label: "Fulfillment %", kind: "pct" }, { field: "coverage_months", label: "Coverage (mo)", kind: "num" }],
  },
  {
    key: "stock-radar", title: "Stock Radar", short: "Stock Radar", portfolio: "forecasting", icon: "📡",
    chart: { type: "donut", groupBy: "radar_status", measures: "closing_stock", x: "radar_status",
      series: [{ field: "closing_stock", label: "Stock" }], valueKind: "num" },
    card: { field: "closing_stock", agg: "sum", kind: "num", label: "Stock Tracked" },
    columns: [{ field: "material_id", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "radar_status", label: "Status" }, { field: "closing_stock", label: "Stock", kind: "num" },
      { field: "demand_forecast", label: "Demand Fcst", kind: "num" }, { field: "coverage_months", label: "Coverage", kind: "num" }],
  },
  {
    key: "aging-risk-forecast", title: "Aging Risk Forecast", short: "Aging Risk", portfolio: "forecasting", icon: "🔮",
    chart: { type: "donut", groupBy: "aging_risk_forecast", measures: "closing_stock", x: "aging_risk_forecast",
      series: [{ field: "closing_stock", label: "Stock" }], valueKind: "num" },
    card: { field: "closing_stock", agg: "sum", kind: "num", label: "Stock Tracked" },
    columns: [{ field: "material_id", label: "Material" }, { field: "material_desc", label: "Description" },
      { field: "aging_days", label: "Aging", kind: "num" }, { field: "projected_aging_days", label: "Projected (90d)", kind: "num" },
      { field: "aging_risk_forecast", label: "Risk Trend" }],
  },
];

export const byKey = (k: string) => KPIS.find((x) => x.key === k);
export const byPortfolio = (p: string) => KPIS.filter((x) => x.portfolio === p);

// ── Simulated KPIs ────────────────────────────────────────────────────────────
// KPIs from the requirements scope that the current HCG SAP extract cannot yet
// support (no sales/billing, returns, patient-type, SLA/reorder masters, etc.).
// They render as fully-built drill-down pages on representative *simulated* data
// (see simulatedKpi.ts) — clearly badged and subtly faded — so stakeholders see
// exactly what each looks like once live. `requires` = the data HCG must provide.
export type SimKpiMeta = {
  key: string;
  title: string;
  short: string;
  portfolio: "inventory" | "procurement" | "consumption" | "forecasting";
  icon: string;
  why: string;        // one-line business value
  requires: string;   // the data field(s) HCG must supply to make it live
};

export const SIMULATED_KPIS: SimKpiMeta[] = [
  // ---------------- CONSUMPTION & REVENUE (biggest gap — no sales/billing) ----------------
  { key: "billable-consumption", title: "Billable vs Non-Billable Consumption", short: "Billable Consumption", portfolio: "consumption", icon: "🧾",
    why: "Split chargeable vs internal-use consumption", requires: "Billing / charge flag per goods-issue" },
  { key: "return-rate", title: "Return Rate %", short: "Return Rate", portfolio: "consumption", icon: "↩️",
    why: "Returned vs issued units by SKU & department", requires: "Return / write-off transactions" },
  { key: "revenue-per-location", title: "Revenue per Location", short: "Revenue / Location", portfolio: "consumption", icon: "💵",
    why: "True revenue by hospital (today shown as MRP proxy)", requires: "Actual sales / billing revenue" },
  { key: "op-ip-revenue", title: "OP / IP Revenue Contribution", short: "OP / IP Split", portfolio: "consumption", icon: "🛏️",
    why: "Outpatient vs inpatient revenue share", requires: "Patient-type (IP/OP) tag per transaction" },
  { key: "revenue-margin", title: "Revenue Margin Analysis", short: "Revenue Margin", portfolio: "consumption", icon: "📊",
    why: "Real sales margin per SKU / category", requires: "True selling price (Selling Price = 0 in source)" },

  // ---------------- PROCUREMENT ----------------
  { key: "vendor-sla-compliance", title: "Vendor SLA Compliance", short: "Vendor SLA", portfolio: "procurement", icon: "📶",
    why: "On-time delivery vs promised lead-time", requires: "Agreed vendor SLA / promised delivery targets" },
  { key: "reorder-accuracy", title: "Reorder Accuracy", short: "Reorder Accuracy", portfolio: "procurement", icon: "🎚️",
    why: "Did we reorder at the right level & time", requires: "Reorder-point & safety-stock master" },

  // ---------------- INVENTORY ----------------
  { key: "holding-cost", title: "Inventory Holding Cost", short: "Holding Cost", portfolio: "inventory", icon: "🏷️",
    why: "Annual cost of holding stock (capital + storage)", requires: "Carrying-cost rate %" },
  { key: "stock-out-rate", title: "Stock-Out Rate", short: "Stock-Out Rate", portfolio: "inventory", icon: "📉",
    why: "How often SKUs hit zero against live demand", requires: "Daily stock-level history (only 1 snapshot today)" },

  // ---------------- FORECASTING ----------------
  { key: "seasonal-forecast", title: "Seasonal / 12-Month Forecast Accuracy", short: "Seasonal Forecast", portfolio: "forecasting", icon: "🗓️",
    why: "Seasonality + higher accuracy (only 6 mo history today)", requires: "12+ months of consumption history" },
];

export const simulatedByPortfolio = (p: string) => SIMULATED_KPIS.filter((x) => x.portfolio === p);
export const simKpiByKey = (k: string) => SIMULATED_KPIS.find((x) => x.key === k);

export const PORTFOLIOS = [
  { key: "inventory", name: "Inventory", icon: "📦", desc: "Stock health, aging & risk" },
  { key: "procurement", name: "Procurement", icon: "🛒", desc: "Spend, vendors & lead time" },
  { key: "consumption", name: "Consumption & Revenue", icon: "📈", desc: "Internal consumption" },
  { key: "forecasting", name: "Forecasting", icon: "🔭", desc: "Demand & replenishment" },
];
