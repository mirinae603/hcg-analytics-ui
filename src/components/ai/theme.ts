// One source of truth for the AI Analyst surface.
//
// These are the APPLICATION's own tokens (see ForecastingOverview.tsx), not a second
// palette invented for the chat. The chat had been running on its own blue accent
// (#3b5bdb) while every other screen in the product uses the violet #6d5efc — which is
// why it read as a bolted-on tool rather than part of the app.
export const T = {
  ground:   "#F6F7FB",   // app BG — the page behind everything
  surface:  "#FFFFFF",   // cards, composer, sidebar
  sunk:     "#F1F2F7",   // hover wells, tracks
  ink:      "#171A2E",   // app INK — headings, answer body
  ink2:     "#414A63",   // secondary text
  mut:      "#6A7085",   // app MUT — labels
  faint:    "#9CA2B6",   // app MUT2 — captions, placeholders
  line:     "#ECEDF4",   // app BORDER
  hair:     "#F2F3F8",   // lighter divider

  accent:   "#6D5EFC",   // app AC
  accent2:  "#9B8FFD",   // app AC2
  accentSoft: "#EFEDFF", // app ACSOFT

  good:     "#1FA971",
  warn:     "#F0A52A",
  bad:      "#E5545B",

  radius:   18,          // app Card is rounded-[18px]
  shadow:   "0 1px 2px rgba(20,24,60,.05), 0 8px 24px -14px rgba(20,24,60,.14)",
  shadowLg: "0 2px 6px rgba(20,24,60,.06), 0 18px 44px -18px rgba(20,24,60,.28)",

  /** Every column on this surface shares ONE measure so the composer lines up with the
   *  text above it. They were 800px and 840px before, which reads as a misalignment even
   *  when nobody can name what is off. */
  col:      760,
} as const;

/** One easing for everything that moves, so the surface feels like a single object. */
export const EASE = "cubic-bezier(.22,1,.36,1)";
