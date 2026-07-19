"use client";
// Reused from the original chat UI: parse a Plotly {data, layout} object and render
// it with premium styling via plotly.js-dist-min newPlot. (Transport + rendering
// approach kept; layout polish adapted to the HCG editorial palette.)
import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Plotly = typeof window !== "undefined" ? require("plotly.js-dist-min") : null;

export default function PlotlyChart({ figure }: { figure: { data: any[]; layout?: any } }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !Plotly || !figure?.data) return;
    const layout = {
      ...figure.layout,
      autosize: true,
      height: 340,
      margin: { l: 62, r: 20, t: 54, b: 60, pad: 6 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Outfit, Inter, -apple-system, sans-serif", size: 11, color: "#5a6072" },
      title: { ...figure.layout?.title, font: { size: 14.5, color: "#1f2333", family: "Outfit, sans-serif" }, x: 0.5, xanchor: "center", y: 0.97, yanchor: "top" },
      xaxis: { ...figure.layout?.xaxis, automargin: true, tickfont: { size: 10.5 }, gridcolor: "rgba(150,160,175,0.14)", zerolinecolor: "rgba(150,160,175,0.2)" },
      yaxis: { ...figure.layout?.yaxis, automargin: true, tickfont: { size: 10.5 }, gridcolor: "rgba(150,160,175,0.14)", zerolinecolor: "rgba(150,160,175,0.2)" },
      legend: { ...figure.layout?.legend, orientation: "h", x: 0.5, y: -0.18, xanchor: "center", yanchor: "top", font: { size: 10.5, color: "#5a6072" } },
    };
    const config = { displaylogo: false, responsive: true, displayModeBar: false };
    try {
      Plotly.newPlot(ref.current, figure.data, layout, config);
    } catch (e) {
      // swallow — a malformed figure should never break the chat
      // eslint-disable-next-line no-console
      console.error("Plotly render failed", e);
    }
    const el = ref.current;
    return () => { if (el && Plotly) try { Plotly.purge(el); } catch { /* noop */ } };
  }, [figure]);

  return <div ref={ref} className="w-full" style={{ minHeight: 340 }} />;
}
