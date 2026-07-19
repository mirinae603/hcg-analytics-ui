"use client";
// Thin renderer: the backend emits fully-themed figures; we add responsive sizing
// and Plotly's native toolbar (download-as-PNG etc., shown on hover).
import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Plotly = typeof window !== "undefined" ? require("plotly.js-dist-min") : null;

const FONT = "Inter, 'Segoe UI', -apple-system, sans-serif";

export default function PlotlyChart({ figure, title }: { figure: { data: any[]; layout?: any }; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !Plotly || !figure?.data) return;
    const layout = {
      autosize: true,
      height: 360,
      font: { family: FONT, size: 11.5, color: "#5a6072" },
      ...figure.layout,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    };
    // No native modebar — the chart card has a clean "PNG" button instead (declutter).
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

  return <div ref={ref} className="w-full" style={{ minHeight: 360 }} />;
}
