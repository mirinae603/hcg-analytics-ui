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
import { themed, FONT, SERIES } from "./plotlyTheme";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Plotly = typeof window !== "undefined" ? require("plotly.js-dist-min") : null;

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
      // `titlefont` was removed in plotly.js 3 (installed: 3.7) and silently did nothing
      title: { font: { family: FONT, size: 11, color: T.faint } },
    };
    /** The backend's axis on top of ours, one level deep. A plain spread let the backend's
     *  axis object replace ours wholesale, and it always sends one, so our tick font and
     *  title font never applied; now only the keys it actually sets win. */
    const axis = (over: any, showgrid: boolean) => {
      const o = over || {};
      const t = typeof o.title === "string" ? { text: o.title } : (o.title || {});
      return {
        ...axisBase, showgrid, ...o,
        tickfont: { ...axisBase.tickfont, ...(o.tickfont || {}) },
        title: { ...t, font: { ...axisBase.title.font, ...(t.font || {}) } },
      };
    };

    const layout = {
      autosize: true,
      height: autoHeight(figure),
      font: { family: FONT, size: 12, color: T.ink2 },
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
      // The backend reserves 52-56px at the top for a title the card replaces, which left
      // an empty band over every chart; keep only a little air above the plot.
      margin: { l: 8, r: 24, b: 8, ...(figure.layout?.margin || {}), t: 14 },
      // Gridlines only across the measure axis. A full grid in both directions boxes the
      // data in and competes with it; one direction is enough to read a value off.
      xaxis: axis(figure.layout?.xaxis, horizontal),
      yaxis: axis(figure.layout?.yaxis, !horizontal),
      // hard overrides — the card supplies its own title and background
      title: undefined,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    };

    // No native modebar — the chart card has its own PNG button (declutter).
    const config = { displaylogo: false, responsive: true, displayModeBar: false, staticPlot: false };
    const el = ref.current;
    try {
      Plotly.react(el, themed(figure.data), layout, config);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Plotly render failed", e);
    }
    // `responsive` only listens to the WINDOW. A chart whose column changes width without
    // the window changing (floater to page, the sessions drawer) kept its old size, so
    // watch the chart's own box as well. One resize per frame at most.
    //
    // Plotly refuses to resize a div that is not displayed ("Resize must be passed a displayed
    // plot div element": the AI panel closed or hidden, the chart's turn not on screen), and it
    // refuses with a REJECTED PROMISE, which a try/catch never sees, so Next reported it as an
    // unhandled error. A hidden, detached or purged div is skipped (showing it again changes
    // its box, which resizes it then); a rejection from one hidden between the frame being
    // asked for and run is absorbed.
    const resize = () => {
      if (!el.isConnected || el.getClientRects().length === 0 || !(el as any)._fullLayout) return;
      try {
        Promise.resolve(Plotly.Plots.resize(el)).catch(() => undefined);
      } catch { /* purged */ }
    };
    let frame = 0;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    }) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(frame);
      if (el && Plotly) try { Plotly.purge(el); } catch { /* noop */ }
    };
  }, [figure, title]);

  return <div ref={ref} className="w-full" />;
}
