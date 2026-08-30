// Trace theming for every chart the assistant produces — on screen AND in the PDF export.
//
// It used to live inside PlotlyChart.tsx, applied at render time only, so the exported PNG
// rasterised the RAW backend figure: still #3b5bdb, a blue that appears nowhere else in
// this product, while the same chart on screen was charcoal. Same class of bug as the
// formatting split — one surface fixed, the other silently left behind.
import { hospitalise } from "@/lib/aiFormat";
import { T } from "./theme";

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


/** Apply the surface's palette to a figure without mutating the original. */
export function themeFigure(figure: { data: any[]; layout?: any }): { data: any[]; layout: any } {
  const layout = { ...(figure.layout || {}) };
  if (layout.title?.text) layout.title = { ...layout.title, text: hospitalise(String(layout.title.text)) };
  return { data: themed(figure.data || []), layout };
}

export { themed, SERIES, FONT };
