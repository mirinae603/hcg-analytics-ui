"use client";
// Renderer + presentation layer for every chart the assistant produces.
//
// The backend picks the chart TYPE and the encodings (charts.py); this file owns how the
// result actually LOOKS. It used to pass the figure through with almost nothing added,
// which left Plotly's defaults showing: 11.5px labels, a full box of gridlines in both
// axes, a fixed 360px height regardless of how many categories were plotted, and default
// margins that clipped long vendor names like "Advanced Medtech Solutions Pvt Ltd".
//
// It also left the charts a different COLOUR from the product. charts.py paints its first
// series #3b5bdb — a blue that appears nowhere else in this application — so every answer
// ended with a chart that looked borrowed from another tool. The theme below repaints the
// default series in the app's own violet, and gives a single-series ranking chart a gentle
// ramp so position in the ranking is legible even where two bars are close in length.
//
// Everything here is applied UNDER the backend's own layout (spread after the defaults,
// before the hard overrides), so a chart that deliberately sets its own axis titles or
// colours still wins — this only fills in what nobody specified.
import { useEffect, useRef } from "react";
import { T } from "./theme";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Plotly = typeof window !== "undefined" ? require("plotly.js-dist-min") : null;

const FONT = "Outfit, Inter, 'Segoe UI', -apple-system, sans-serif";

/** The colours charts.py reaches for by default. Seeing one of these means "nobody chose
 *  this" — a deliberate colour (a red for an alert, a green for a target) is left alone. */
const BACKEND_DEFAULTS = new Set(
  ["#3b5bdb", "#12b886", "#e0992f", "#e8604a", "#7048e8", "#0ea5e9",
   "#0ca678", "#d9663e", "#748ffc", "#f06595", "#22b8cf", "#82c91e"].map((c) => c.toLowerCase()),
);

/** Warm neutrals led by the surface's one primary. charts.py paints its first series
 *  #3b5bdb — a blue that appears nowhere else in this application — so every answer used
 *  to end with a chart that looked borrowed from another tool. Multi-series charts still
 *  need separable hues, so the set warms and lightens rather than going fully monochrome. */
const SERIES = ["#413B35", "#8A7E6E", "#5E6E64", "#A8907A", "#6E6A7C", "#B7AA97", "#7C8A83", "#C4B6A3"];

function mix(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.round(c + (255 - c) * pct);
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

/** A single-series bar chart is almost always a RANKING (top vendors, worst SKUs). One flat
 *  colour across twelve bars throws all of that away; a ramp from full accent at the top to
 *  a pale tint at the bottom keeps rank readable even where two bars are near-identical. */
function rampFor(n: number): string[] {
  if (n <= 1) return [T.dark];
  return Array.from({ length: n }, (_, i) => mix(T.dark, Math.min(0.68, (i / (n - 1)) * 0.68)));
}

function themed(data: any[]): any[] {
  const bars = data.filter((t) => t?.type === "bar");
  const singleBar = bars.length === 1 && data.length === 1;
  let seriesIdx = 0;

  return data.map((tr: any) => {
    const t = { ...tr, marker: { ...(tr.marker || {}) } };
    const current = typeof t.marker.color === "string" ? t.marker.color.toLowerCase() : null;
    const isDefault = !!current && BACKEND_DEFAULTS.has(current);

    if (t.type === "bar" && isDefault) {
      const n = (t.orientation === "h" ? t.y : t.x)?.length || 0;
      t.marker.color = singleBar && n > 1 ? rampFor(n) : SERIES[seriesIdx % SERIES.length];
      if (t.marker.cornerradius === undefined) t.marker.cornerradius = 6;
    } else if (isDefault) {
      const c = SERIES[seriesIdx % SERIES.length];
      t.marker.color = c;
      if (t.line && typeof t.line.color === "string" && BACKEND_DEFAULTS.has(t.line.color.toLowerCase())) {
        t.line = { ...t.line, color: c };
      }
    } else if (Array.isArray(t.marker.colors) && t.marker.colors.every((c: any) => typeof c === "string" && BACKEND_DEFAULTS.has(c.toLowerCase()))) {
      // pies / donuts hand over a whole list at once
      t.marker.colors = t.marker.colors.map((_: string, i: number) => SERIES[i % SERIES.length]);
    }

    if (t.textfont) t.textfont = { ...t.textfont, family: FONT, color: T.mut, size: 10.5 };
    if (isDefault) seriesIdx++;
    return t;
  });
}

/** Height that scales with the number of categories: a 12-bar horizontal chart squeezed
 *  into a fixed 360px gives every bar 22px including its label, which is where the
 *  cramped, overlapping look came from. */
function autoHeight(figure: { data: any[]; layout?: any }): number {
  const t = figure?.data?.[0] || {};
  const horizontal = t.orientation === "h";
  const n = Math.max(
    ...(figure.data || []).map((tr: any) => (Array.isArray(horizontal ? tr.y : tr.x) ? (horizontal ? tr.y : tr.x).length : 0)),
    1,
  );
  if (!horizontal) return 380;
  return Math.min(Math.max(n * 34 + 130, 300), 720);
}

export default function PlotlyChart({ figure, title }: { figure: { data: any[]; layout?: any }; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !Plotly || !figure?.data) return;

    const horizontal = figure.data?.[0]?.orientation === "h";
    const axisBase = {
      showgrid: true,
      gridcolor: T.hair,
      gridwidth: 1,
      zeroline: false,
      showline: false,
      ticks: "" as const,
      automargin: true,          // long category labels get the room they need
      tickfont: { family: FONT, size: 11.5, color: T.mut },
      titlefont: { family: FONT, size: 11, color: T.faint },
    };

    const layout = {
      autosize: true,
      height: autoHeight(figure),
      font: { family: FONT, size: 12, color: T.ink2 },
      // Gridlines only across the measure axis. A full grid in both directions boxes the
      // data in and competes with it; one direction is enough to read a value off.
      xaxis: { ...axisBase, showgrid: horizontal },
      yaxis: { ...axisBase, showgrid: !horizontal },
      margin: { l: 8, r: 24, t: 8, b: 8 },
      bargap: 0.34,
      hoverlabel: {
        bgcolor: T.ink,
        bordercolor: T.ink,
        font: { family: FONT, size: 12.5, color: "#fff" },
      },
      hovermode: (horizontal ? "closest" : "x unified") as any,
      legend: {
        orientation: "h" as const,
        yanchor: "bottom" as const, y: -0.18,
        xanchor: "left" as const, x: 0,
        font: { family: FONT, size: 11.5, color: T.mut },
      },
      colorway: SERIES,
      ...figure.layout,
      // hard overrides — the card supplies its own title and background
      title: undefined,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    };

    // No native modebar — the chart card has its own PNG button (declutter).
    const config = { displaylogo: false, responsive: true, displayModeBar: false, staticPlot: false };
    try {
      Plotly.react(ref.current, themed(figure.data), layout, config);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Plotly render failed", e);
    }
    const el = ref.current;
    return () => { if (el && Plotly) try { Plotly.purge(el); } catch { /* noop */ } };
  }, [figure, title]);

  return <div ref={ref} className="w-full" />;
}
