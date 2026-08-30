"use client";
// Renderer + presentation layer for every chart the assistant produces.
//
// The backend picks the chart TYPE and the encodings (charts.py); this file owns how the
// result actually looks. It used to pass the figure through with almost nothing added,
// which left Plotly's defaults showing: 11.5px labels, a full box of gridlines in both
// axes, a fixed 360px height regardless of how many categories were plotted, and default
// margins that clipped long vendor names like "Advanced Medtech Solutions Pvt Ltd".
//
// The theme below is applied UNDER the backend's own layout (spread after the defaults,
// before the hard overrides), so a chart that deliberately sets its own axis titles or
// colours still wins — this only fills in what nobody specified.
import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Plotly = typeof window !== "undefined" ? require("plotly.js-dist-min") : null;

const FONT = "Outfit, Inter, 'Segoe UI', -apple-system, sans-serif";
const INK = "#232838";
const MUT = "#8890a3";
const GRID = "#eef0f5";

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
      gridcolor: GRID,
      gridwidth: 1,
      zeroline: false,
      showline: false,
      ticks: "" as const,
      automargin: true,          // long category labels get the room they need
      tickfont: { family: FONT, size: 12, color: MUT },
      titlefont: { family: FONT, size: 11.5, color: MUT },
    };

    const layout = {
      autosize: true,
      height: autoHeight(figure),
      font: { family: FONT, size: 12.5, color: INK },
      // Gridlines only across the measure axis. A full grid in both directions boxes the
      // data in and competes with it; one direction is enough to read a value off.
      xaxis: { ...axisBase, showgrid: horizontal },
      yaxis: { ...axisBase, showgrid: !horizontal },
      margin: { l: 8, r: 24, t: 12, b: 8 },
      bargap: 0.34,
      hoverlabel: {
        bgcolor: "#12162a",
        bordercolor: "#12162a",
        font: { family: FONT, size: 12.5, color: "#fff" },
      },
      hovermode: (horizontal ? "closest" : "x unified") as any,
      legend: {
        orientation: "h" as const,
        yanchor: "bottom" as const, y: -0.18,
        xanchor: "left" as const, x: 0,
        font: { family: FONT, size: 12, color: MUT },
      },
      colorway: ["#5b6ef5", "#22a06b", "#f0a52a", "#e5545b", "#8b7bf7", "#0ea5b7", "#c2694a"],
      ...figure.layout,
      // hard overrides — the card supplies its own title and background
      title: undefined,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    };

    // No native modebar — the chart card has its own PNG button (declutter).
    const config = { displaylogo: false, responsive: true, displayModeBar: false, staticPlot: false };
    try {
      Plotly.react(ref.current, figure.data, layout, config);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Plotly render failed", e);
    }
    const el = ref.current;
    return () => { if (el && Plotly) try { Plotly.purge(el); } catch { /* noop */ } };
  }, [figure, title]);

  return <div ref={ref} className="w-full" />;
}
