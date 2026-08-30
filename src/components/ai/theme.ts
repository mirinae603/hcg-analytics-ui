// ── AI Analyst surface tokens ───────────────────────────────────────────────────
//
// LIGHT, WARM-NEUTRAL, CHARCOAL-LED — built to the reference design.
//
// The palette is warm grey rather than the blue-grey the rest of the dashboard uses:
// #F7F6F4 for the sidebar, white for the working canvas, and a single charcoal
// (#413B35) carrying every primary action — the New chat button, the send button, the
// icon badges on the starter cards. There is no brand colour on this surface by design:
// colour is reserved for meaning (a checked figure is green, an unconfirmed one amber),
// so when something IS coloured here, it is telling you something.
//
// ONE scale. If a colour or radius is needed and it is not here, look again at what is —
// the dozen one-off greys this replaced (#eef0f4, #f7f8fb, #f2f4f8, #ecedf3 …) are exactly
// what made the old surface feel assembled rather than designed.
export const T = {
  // ── grounds ──
  canvas:  "#FFFFFF",   // the working area
  surface: "#FFFFFF",   // cards, menus, the composer
  rail:    "#F7F6F4",   // the sidebar
  sunk:    "#FAF9F7",   // starter cards, table headers, key-figure band
  tile:    "#F1EFEB",   // illustration grounds inside the starter cards
  hover:   "#EFEEEA",   // hover well on the rail

  // ── ink ──
  ink:   "#252220",     // headings, figures
  ink2:  "#4A4642",     // body prose
  mut:   "#8B857E",     // labels, meta, secondary greeting line
  faint: "#A9A39B",     // placeholders, disabled

  // ── lines ──
  line: "#E7E5E1",      // every real border
  hair: "#EFEDE9",      // dividers inside a block
  dash: "#DCD8D2",      // the dashed frames on the starter cards

  // ── the one primary ──
  dark:   "#413B35",    // primary buttons, icon badges, send
  darkHi: "#544C44",    // its hover
  darkSoft: "#EDEAE5",  // a charcoal wash (selection, data bars)

  // ── meaning only ──
  good: "#3F7D5C", goodBg: "#EDF4EF",
  warn: "#8A6318", warnBg: "#FAF2E4",
  bad:  "#A4463F", badBg:  "#F8ECEA",

  // ── one radius scale, two shadows ──
  r:  10,   // chips, nav rows, small buttons
  r2: 14,   // cards, inputs, evidence blocks
  r3: 18,   // the composer, menus
  /** A resting card's barely-there edge lift. */
  card: "0 1px 2px rgba(37,34,32,.05)",
  /** Floating things only: menus, the scroll-to-latest button. */
  pop:  "0 6px 14px -6px rgba(37,34,32,.12), 0 18px 42px -22px rgba(37,34,32,.30)",

  /** ONE measure, shared by the answer column and the composer, so the input lines up
   *  with the text above it. They were 800 and 840 before — a misalignment you feel
   *  without being able to name it.
   *
   *  It is 1080, not the ~700 a pure reading column would take, because this column
   *  carries charts and 50-row tables as well as prose: at 760 those were squeezed into
   *  half the available screen with a third of it left blank on either side. The PROSE is
   *  still held to 72ch by `.ai-prose`, so paragraphs stay readable while the evidence
   *  gets the room it needs. */
  col: 1080,
} as const;

/** One easing for the whole surface. Motion is 140–220ms and never moves more than 6px:
 *  a reading surface that bounces is a reading surface you stop trusting. */
export const EASE = "cubic-bezier(.22,1,.36,1)";
