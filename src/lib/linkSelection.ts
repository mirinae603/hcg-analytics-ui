// The selection a link opens a page with: ?month=YYYY-MM|ALL&type=IP|OP&segment=onco|non-onco|
// consumables. These are the names the Formulary, Spend and Revenue pages give their own filters,
// and the names the Executive overview's drill links carry (executive/shared drillHref; the API's
// executive LINK_FILTERS), so a figure picked there opens on the same month, patients and
// material here.
//
// A page reads them when it opens — from window.location.search in an effect, never during render
// and never with useSearchParams (static export) — and again when a link to the same page is
// followed. It checks each value against its own options (a month it does not hold falls back to
// its latest, a material type it has no filter for is left out), keeps what it accepts in its
// filter state, and writes that state back with writeLinkSelection, so the address bar says what
// the page shows and a copied link opens it again. The hospital and the Value ↔ Quantity switch
// are the header's, app-wide, and are not carried.

/** A patient type a link can narrow to; both is the default and has no parameter. */
export type LinkPatients = "IP" | "OP";

/** What a link asks for, as a patch on a page's filters (`{ ...filters, ...sel }`). A parameter
 *  that is absent, or that this page does not understand, is left out (never set to undefined),
 *  so the page keeps its own value for it. `month` is one YYYY-MM or "ALL"; whether the page
 *  holds that month is the page's to check. */
export type LinkSelection<S extends string> = { month?: string; type?: LinkPatients; segment?: S };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The selection in `search` (a location's "?…"), for a page whose Material filter offers
 *  `segments`. */
export function readLinkSelection<S extends string>(search: string, segments: readonly S[]): LinkSelection<S> {
  const q = new URLSearchParams(search);
  const out: LinkSelection<S> = {};
  const month = q.get("month")?.trim();
  if (month && (month.toUpperCase() === "ALL" || MONTH.test(month))) out.month = month.toUpperCase() === "ALL" ? "ALL" : month;
  const type = q.get("type")?.trim().toUpperCase();
  if (type === "IP" || type === "OP") out.type = type;
  const segment = q.get("segment")?.trim().toLowerCase();
  const known = segments.find((s) => s === segment);
  if (known) out.segment = known;
  return out;
}

/** Whether a link asked for anything this page understood. */
export const hasLinkSelection = (sel: LinkSelection<string>) => sel.month != null || sel.type != null || sel.segment != null;

/** Writes a page's selection into `url` the way a link carries it. A value at the page's default
 *  leaves its parameter out: `month` null for the latest month (the page opens on it anyway, and
 *  next month's link should open on next month), "ALL" patient types and material types. */
export function writeLinkSelection(url: URL, sel: { month: string | null; type: string; segment: string }): void {
  const set = (key: string, value: string | null) => {
    if (value == null || value === "" || value === "ALL") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  };
  // "ALL" is the default for the patients and the material, but a month of its own: every month.
  if (sel.month == null || sel.month === "") url.searchParams.delete("month");
  else url.searchParams.set("month", sel.month);
  set("type", sel.type);
  set("segment", sel.segment);
}
