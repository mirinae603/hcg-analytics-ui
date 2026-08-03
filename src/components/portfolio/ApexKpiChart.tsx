"use client";
import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import { ChartCfg } from "@/lib/kpiRegistry";
import { inr, num, pct } from "@/lib/kpiFormat";
import { useDrillDown } from "@/components/portfolio/DrillTooltip";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

/** What the parent passes when this chart's slices can be opened up. */
export type DrillSpec = {
  kpi: string;
  dim: string;
  by: string;
  label: string;      // "items" / "hospitals"
  dimLabel?: string;  // "Material group" — the eyebrow on the panel
  plant?: string;
  category?: string;
};

const FONT = "Outfit, 'Segoe UI', sans-serif";

const formatIndianAbbr = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
};

const formatNum = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
};

const yFormatter = (kind?: string) => (v: number) =>
  kind === "inr" ? formatIndianAbbr(v) : kind === "pct" ? `${v.toFixed(1)}%` : formatNum(v);

const AREA_COLORS = [
  { stroke: "rgba(58,134,255,0.85)", fill: "#E0F0FF" },
  { stroke: "rgba(0,178,140,0.85)", fill: "#D7F7F0" },
  { stroke: "rgba(255,107,170,0.85)", fill: "#FFE8F1" },
  { stroke: "rgba(255,181,94,0.85)", fill: "#FFF2E1" },
  { stroke: "rgba(147,51,234,0.85)", fill: "#F3E8FF" },
  { stroke: "rgba(239,68,68,0.85)", fill: "#FEE2E2" },
];

const DONUT_COLORS = [
  "rgba(147,197,253,0.85)",
  "rgba(134,239,172,0.85)",
  "rgba(253,224,71,0.85)",
  "rgba(252,165,165,0.85)",
  "rgba(216,180,254,0.85)",
  "rgba(165,243,252,0.85)",
  "rgba(254,215,170,0.85)",
  "rgba(199,210,254,0.85)",
];

const BAR_COLORS = [
  "#93C5FD", "#6EE7B7", "#FDE68A", "#FCA5A5", "#C4B5FD",
  "#67E8F9", "#FED7AA", "#FBCFE8",
];

export default function ApexKpiChart({ cfg, data, drill }: { cfg: ChartCfg; data: any[]; drill?: DrillSpec | null }) {
  const fmt = yFormatter(cfg.valueKind);
  const ptr = useRef({ x: 0, y: 0 });

  // The slice labels the drill-down sends to the backend. These are the RAW values —
  // the bar axis truncates long names to 20 chars for display, and sending a truncated
  // label would silently match nothing.
  const donutField = cfg.series[0]?.field;
  const slices = useMemo(() => {
    const rows = cfg.type === "donut" ? (data || []).filter((d) => Number(d[donutField]) > 0) : (data || []);
    return rows.map((d) => String(d[cfg.x] ?? "—"));
  }, [data, cfg.type, cfg.x, donutField]);

  const spec = useMemo(
    () =>
      drill
        ? {
            kpi: drill.kpi, dim: drill.dim, by: drill.by, label: drill.label,
            dimLabel: drill.dimLabel, plant: drill.plant, category: drill.category,
            format: fmt,
          }
        : null,
    // fmt is derived from cfg.valueKind only
    [drill?.kpi, drill?.dim, drill?.by, drill?.label, drill?.dimLabel, drill?.plant, drill?.category, cfg.valueKind] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dd = useDrillDown(spec);

  // Apex's own tooltip is switched OFF wherever a drill-down exists — the panel's first
  // line already carries the label + value, so keeping both would stack two boxes.
  const drillOn = !!drill;
  const tooltipCfg = (base: any) => (drillOn ? { enabled: false } : base);
  const drillEvents = drillOn
    ? {
        dataPointMouseEnter: (_e: any, _c: any, o: any) => {
          const s = slices[o?.dataPointIndex];
          if (s) dd.enter(s, ptr.current.x, ptr.current.y);
        },
        dataPointMouseLeave: () => dd.leave(),
        dataPointSelection: (_e: any, _c: any, o: any) => {
          const s = slices[o?.dataPointIndex];
          if (s) dd.pin(s, ptr.current.x, ptr.current.y);
        },
      }
    : {};

  // Wraps the chart so we can track the pointer for panel placement and clear on exit.
  const wrap = (node: React.ReactNode) => (
    <div
      className="relative"
      // onPointerDown (not just onMouseMove) so a TAP owns the coordinates it pins at.
      // Browsers emulate a mousemove before click on touch, so this worked by accident;
      // without it, any device that doesn't emulate would pin the panel at (0,0).
      onPointerDown={(e) => { ptr.current = { x: e.clientX, y: e.clientY }; }}
      onMouseMove={(e) => {
        ptr.current = { x: e.clientX, y: e.clientY };
        dd.move(e.clientX, e.clientY);
      }}
      onMouseLeave={() => dd.leave()}
    >
      {node}
      {dd.panel}
    </div>
  );

  if (!data?.length)
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        No data available for this selection.
      </div>
    );

  // ─── DONUT ────────────────────────────────────────────────────────────────
  if (cfg.type === "donut") {
    const f = cfg.series[0].field;
    const rows = data.filter((d) => Number(d[f]) > 0);
    const labels = rows.map((d) => String(d[cfg.x] ?? "—"));
    const series = rows.map((d) => Number(d[f]));
    const total = series.reduce((a, b) => a + b, 0);

    const options: any = {
      chart: {
        type: "donut",
        fontFamily: FONT,
        foreColor: "#1f2937",
        background: "transparent",
        dropShadow: { enabled: true, top: 2, left: 0, blur: 6, color: "#000", opacity: 0.08 },
        events: drillEvents,
      },
      labels,
      colors: DONUT_COLORS,
      fill: { type: "solid", opacity: 1 },
      stroke: { show: true, width: 2, colors: ["rgba(255,255,255,0.6)"] },
      legend: {
        show: true,
        position: "bottom",
        fontSize: "13px",
        fontWeight: 500,
        horizontalAlign: "center",
        offsetY: 0,
        itemMargin: { horizontal: 10, vertical: 4 },
        labels: { colors: "#4B5563" },
      },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: "50%",
            labels: {
              show: true,
              name: { show: true, fontSize: "14px", fontWeight: 500, offsetY: -6, color: "#374151" },
              value: {
                show: true, fontSize: "22px", fontWeight: 600, offsetY: 10, color: "#1f2937",
                formatter: (val: string) => fmt(parseFloat(val)),
              },
              total: {
                show: true,
                label: "Total",
                fontSize: "13px",
                fontWeight: 500,
                color: "#6B7280",
                formatter: () => fmt(total),
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(0)}%`,
        style: { fontSize: "12px", fontWeight: 600, colors: ["#f9fafb"] },
        dropShadow: { enabled: false },
      },
      tooltip: tooltipCfg({
        style: { fontSize: "13px", fontFamily: FONT },
        y: { formatter: fmt },
      }),
    };
    return wrap(<ReactApexChart options={options} series={series} type="donut" height={380} />);
  }

  // ─── BAR ──────────────────────────────────────────────────────────────────
  if (cfg.type === "bar") {
    const categories = data.map((d) => {
      const v = String(d[cfg.x] ?? "—");
      return v.length > 20 ? v.slice(0, 20) + "…" : v;
    });
    const series = cfg.series.map((s, i) => ({
      name: s.label,
      data: data.map((d) => Number(d[s.field] ?? 0)),
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));

    const options: any = {
      chart: {
        type: "bar",
        height: 370,
        fontFamily: FONT,
        toolbar: { show: true },
        zoom: { enabled: false },
        animations: {
          enabled: true,
          speed: 1200,
          animateGradually: { enabled: true, delay: 100 },
          dynamicAnimation: { enabled: true, speed: 600 },
        },
        dropShadow: { enabled: true, top: 4, left: 0, blur: 6, opacity: 0.08 },
        events: drillEvents,
      },
      colors: BAR_COLORS,
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "52%",
          borderRadius: 6,
          borderRadiusApplication: "end",
          distributed: cfg.series.length === 1,
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 1, colors: ["transparent"] },
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.2,
          opacityFrom: 0.95,
          opacityTo: 0.75,
          stops: [0, 90, 100],
        },
      },
      grid: {
        borderColor: "#E5E7EB",
        strokeDashArray: 3,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 20, right: 20, top: 0, bottom: 0 },
      },
      legend: {
        show: cfg.series.length > 1,
        position: "top",
        horizontalAlign: "center",
        fontSize: "13px",
        fontWeight: 500,
        labels: { colors: "#6B7280" },
      },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          rotate: -20,
          style: { fontSize: "12px", fontWeight: 500, colors: "#6B7280", fontFamily: FONT },
        },
      },
      yaxis: {
        labels: {
          formatter: fmt,
          offsetX: -4,
          style: { fontSize: "12px", fontWeight: 500, colors: "#6B7280", fontFamily: FONT },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      tooltip: tooltipCfg({
        theme: "light",
        style: { fontSize: "13px", fontFamily: FONT },
        y: { formatter: fmt },
      }),
    };
    return wrap(<ReactApexChart options={options} series={series} type="bar" height={370} />);
  }

  // ─── LINE / AREA ──────────────────────────────────────────────────────────
  const categories = data.map((d) => String(d[cfg.x] ?? "—"));
  const series = cfg.series.map((s, i) => ({
    name: s.label,
    data: data.map((d) => Number(d[s.field] ?? 0)),
  }));
  const strokeColors = cfg.series.map((s, i) =>
    s.color || AREA_COLORS[i % AREA_COLORS.length].stroke
  );
  const fillColors = cfg.series.map((_, i) => AREA_COLORS[i % AREA_COLORS.length].fill);

  const options: any = {
    chart: {
      type: "area",
      height: 370,
      fontFamily: FONT,
      toolbar: { show: true },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        speed: 1600,
        animateGradually: { enabled: true, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 800 },
      },
      dropShadow: { enabled: true, top: 4, left: 0, blur: 6, opacity: 0.1 },
    },
    colors: strokeColors,
    stroke: { curve: "smooth", width: 3, colors: strokeColors },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.3,
        gradientToColors: fillColors,
        inverseColors: false,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    dataLabels: { enabled: false },
    markers: {
      size: 0,
      hover: { size: 7, sizeOffset: 2 },
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 3,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      row: { colors: ["#F9FAFB", "transparent"], opacity: 0.5 },
      padding: { left: 20, right: 20, top: 0, bottom: 0 },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "center",
      fontSize: "13px",
      fontWeight: 500,
      labels: { colors: "#6B7280" },
    },
    xaxis: {
      type: "category",
      categories,
      axisBorder: { show: true },
      axisTicks: { show: false },
      labels: {
        rotate: 0,
        style: { fontSize: "12px", fontWeight: 500, colors: "#6B7280", fontFamily: FONT },
      },
    },
    yaxis: {
      tickAmount: 5,
      labels: {
        formatter: fmt,
        offsetX: -10,
        style: { fontSize: "12px", fontWeight: 500, colors: "#6B7280", fontFamily: FONT },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "13px", fontFamily: FONT },
      y: { formatter: fmt },
    },
  };
  return <ReactApexChart options={options} series={series} type="area" height={370} />;
}
