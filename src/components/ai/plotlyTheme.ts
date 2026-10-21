// Trace theming for every chart the assistant produces — on screen AND in the PDF export.
//
// It used to live inside PlotlyChart.tsx, applied at render time only, so the exported PNG
// rasterised the RAW backend figure: still #3b5bdb, a blue that appears nowhere else in
// this product, while the same chart on screen was charcoal. Same class of bug as the
// formatting split — one surface fixed, the other silently left behind.
import { hospitalise } from "@/lib/aiFormat";
import { BLUE, BRONZE, JADE, LAVENDER, LEAF, ORANGE, PLUM, ROSE } from "@/components/portfolio/ledger/kit";
import { T } from "./theme";

const FONT = "Outfit, Inter, 'Segoe UI', -apple-system, sans-serif";

/** The colours charts.py reaches for by default. Seeing one of these means "nobody chose
 *  this" — a deliberate colour (a red for an alert, a green for a target) is left alone. */
const BACKEND_DEFAULTS = new Set(
  ["#3b5bdb", "#12b886", "#e0992f", "#e8604a", "#7048e8", "#0ea5e9",
   "#0ca678", "#d9663e", "#748ffc", "#f06595", "#22b8cf", "#82c91e"].map((c) => c.toLowerCase()),
);

/** The dashboards' own chart hues (ledger/kit), so an answer's chart looks like the pages it
 *  explains, and in colour, as HCG asked ("multi colour in graphs"), not the warm greys it had.
 *  In this fixed order, every neighbour pair passed the data-viz palette checks: colour-blind
 *  separation ΔE ≥ 14.5, normal vision ≥ 17.5; the first three also as all pairs, for pies. The
 *  orange and the leaf sit under 3:1 on white, so every chart here prints its values and has
 *  its table beside it. */
const SERIES = [BLUE, ORANGE, PLUM, LEAF, JADE, LAVENDER, BRONZE, ROSE];

function mix(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.round(c + (255 - c) * pct);
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

/** A single-series bar chart is almost always a RANKING (top vendors, worst SKUs). Up to eight
 *  bars, each one is its own hue, in the fixed order, so a ranking reads in colour like HCG's
 *  Power BI charts; its labels say what each bar is. Past eight a hue would repeat, so the bars
 *  take one hue instead, full at the top to a pale tint at the bottom, which keeps rank readable. */
function barColours(n: number): string[] {
  if (n <= SERIES.length) return SERIES.slice(0, Math.max(n, 1));
  return Array.from({ length: n }, (_, i) => mix(BLUE, Math.min(0.68, (i / (n - 1)) * 0.68)));
}

/** A pie's slices: the series hues, then paler steps of them rather than a hue over again. */
const sliceColour = (i: number) => (i < SERIES.length ? SERIES[i] : mix(SERIES[i % SERIES.length], 0.45));

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
      t.marker.color = singleBar && n > 1 ? barColours(n) : SERIES[seriesIdx % SERIES.length];
      if (t.marker.cornerradius === undefined) t.marker.cornerradius = 6;
    } else if (isDefault) {
      const c = SERIES[seriesIdx % SERIES.length];
      t.marker.color = c;
      if (t.line && typeof t.line.color === "string" && BACKEND_DEFAULTS.has(t.line.color.toLowerCase())) {
        t.line = { ...t.line, color: c };
      }
    } else if (Array.isArray(t.marker.colors) && t.marker.colors.every((c: any) => typeof c === "string" && BACKEND_DEFAULTS.has(c.toLowerCase()))) {
      // pies / donuts hand over a whole list at once
      t.marker.colors = t.marker.colors.map((_: string, i: number) => sliceColour(i));
    }

    if (t.textfont) t.textfont = { ...t.textfont, family: FONT, color: T.mut, size: 10.5 };
    // Straight segments between points. charts.py draws trend lines as splines, and on a
    // six-point monthly series a spline overshoots: it draws peaks and dips between months
    // that are not in the data. Applied here so the PDF export gets it too.
    if (t.type === "scatter" && t.line?.shape === "spline") t.line = { ...t.line, shape: "linear" };
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
