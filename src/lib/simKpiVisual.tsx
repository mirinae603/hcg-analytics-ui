// Per-KPI line-icon + accent colour for the simulated cards/pages, so each reads
// like a modern KPI tile (coloured icon chip + accent chart) instead of an emoji.
import { IconType } from "react-icons";
import {
  TbReceipt2, TbArrowBackUp, TbBuildingBank, TbBed, TbChartPie, TbShieldCheck,
  TbTargetArrow, TbBuildingWarehouse, TbTrendingDown, TbCalendarStats,
} from "react-icons/tb";

export type SimVisual = { Icon: IconType; accent: string };

export const SIM_VISUAL: Record<string, SimVisual> = {
  "billable-consumption": { Icon: TbReceipt2, accent: "#10b981" },
  "return-rate": { Icon: TbArrowBackUp, accent: "#f43f5e" },
  "revenue-per-location": { Icon: TbBuildingBank, accent: "#6366f1" },
  "op-ip-revenue": { Icon: TbBed, accent: "#14b8a6" },
  "revenue-margin": { Icon: TbChartPie, accent: "#8b5cf6" },
  "vendor-sla-compliance": { Icon: TbShieldCheck, accent: "#0ea5e9" },
  "reorder-accuracy": { Icon: TbTargetArrow, accent: "#f59e0b" },
  "holding-cost": { Icon: TbBuildingWarehouse, accent: "#f97316" },
  "stock-out-rate": { Icon: TbTrendingDown, accent: "#ef4444" },
  "seasonal-forecast": { Icon: TbCalendarStats, accent: "#3b82f6" },
};

export const simVisual = (k: string): SimVisual =>
  SIM_VISUAL[k] || { Icon: TbCalendarStats, accent: "#6d5efc" };
