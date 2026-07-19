"use client";
// Thin renderer: the backend now emits fully-themed figures (colors, colorscales,
// treemaps, waterfalls, …). We only add responsive sizing + a font default and let
// the figure's own styling through. Transport reused from the original chat UI.
import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Plotly = typeof window !== "undefined" ? require("plotly.js-dist-min") : null;

const FONT = "Outfit, Inter, -apple-system, BlinkMacSystemFont, sans-serif";

export default function PlotlyChart({ figure }: { figure: { data: any[]; layout?: any } }) {
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
    const config = { displaylogo: false, responsive: true, displayModeBar: false };
    try {
      Plotly.react(ref.current, figure.data, layout, config);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Plotly render failed", e);
    }
    const el = ref.current;
    return () => { if (el && Plotly) try { Plotly.purge(el); } catch { /* noop */ } };
  }, [figure]);

  return <div ref={ref} className="w-full" style={{ minHeight: 360 }} />;
}
