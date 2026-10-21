// The written summaries the Formulary drawers open on, in the phrasing of HCG's own MIS mails
// ("stood at … against a budget of …"). Pure functions of figures the API already sent: they
// add words, never numbers, so a summary can never disagree with the card beside it.
import { isNum, pct, pts, rupeesExact } from "@/components/portfolio/ledger/format";

const p2 = (v: number) => pct(v, 2);
/** A gap's size; the sentence around it says which way it goes. */
const gapPts = (v: number) => pts(Math.abs(v), 2);

/** Exact rupees with Indian grouping and paise, as HCG's sheets carry them. */
export const rupees = rupeesExact;

/** A change under this many points is reported as "unchanged". */
const STEADY_PTS = 0.1;

export type SegmentMove = { label: string; pct: number | null; prevPct: number | null };

export type ComplianceFacts = {
  where: string;
  when: string;
  pct: number | null;
  budget: number | null;
  /** Why the figure is not compared with a budget, when it is not: all hospitals together
   *  have none (HCG budgets each unit), HCG sets none for this unit, or a filter (IP/OP,
   *  payer, one segment, mean) narrows the figure below the scope the budget was set for. */
  noBudget?: "network" | "unit" | "filters" | null;
  prev?: { label: string; pct: number | null } | null;
  /** Onco and non-onco, this period and the previous one; empty when not known. */
  segments?: SegmentMove[];
  outOfFormulary: number;
  nonFormulary: number;
};

export function complianceSummary(f: ComplianceFacts): string[] {
  if (!isNum(f.pct)) {
    return [`${f.where} has no formulary or out-of-formulary drug spend for ${f.when}, so there is no compliance figure.`];
  }
  const out: string[] = [];
  if (!f.noBudget && isNum(f.budget)) {
    const gap = f.pct - f.budget;
    out.push(`${f.where}'s formulary compliance for ${f.when} stood at ${p2(f.pct)} against a budget of ${f.budget}%`
      + (Math.abs(gap) < 0.005 ? ", on budget." : ` (${gap > 0 ? "+" : "−"}${gapPts(gap)}). HCG's MIS would print it as ${Math.round(f.pct)}%.`));
  } else {
    const why = f.noBudget === "network" ? "HCG sets compliance budgets per hospital, so all hospitals together have none."
      : f.noBudget === "unit" ? "HCG's MIS sets no budget for this hospital."
      : "HCG's budget is set for all patients pooled, so it is not compared here.";
    out.push(`${f.where}'s formulary compliance for ${f.when} stood at ${p2(f.pct)}${f.noBudget === "filters" ? " for the filters shown" : ""}. ${why}`);
  }

  if (f.prev && isNum(f.prev.pct)) {
    const d = f.pct - f.prev.pct;
    out.push(Math.abs(d) < STEADY_PTS
      ? `That is unchanged from ${f.prev.label} (${p2(f.prev.pct)}).`
      : `That is ${d > 0 ? "up" : "down"} ${gapPts(d)} from ${f.prev.label} (${p2(f.prev.pct)}).`);

    const moves = (f.segments || [])
      .filter((s) => isNum(s.pct) && isNum(s.prevPct))
      .map((s) => ({ ...s, d: (s.pct as number) - (s.prevPct as number) }));
    if (moves.length > 1 && Math.abs(d) >= STEADY_PTS) {
      // The segment that moved most in the same direction as the total explains it.
      const driver = [...moves].sort((a, b) => (d < 0 ? a.d - b.d : b.d - a.d))[0];
      if (Math.sign(driver.d) === Math.sign(d) && Math.abs(driver.d) >= STEADY_PTS) {
        out.push(`The ${d < 0 ? "fall" : "rise"} is in ${driver.label.toLowerCase()}: ${p2(driver.pct as number)}, from ${p2(driver.prevPct as number)}.`);
      }
    }
  }

  out.push(`Out-of-formulary spend was ${rupees(f.outOfFormulary)}; non formulary spend of ${rupees(f.nonFormulary)} sits outside the ratio.`);
  return out;
}

/** "1st", "2nd", "3rd", "12th", "22nd". */
export function ordinal(n: number): string {
  const tens = n % 100, ones = n % 10;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ones === 1 ? "st" : ones === 2 ? "nd" : ones === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

export type PositionFacts = {
  /** The selected hospital; null for all hospitals. */
  where: string | null;
  /** Its rank, lowest compliance first; null when it has no ratio to rank. */
  rank: number | null;
  /** Units with a compliance figure. */
  ranked: number;
  /** Units judged against a budget of their own, and how many of them met it. */
  judged: number;
  met: number;
};

/** One line on where a hospital stands among the units, in the order the list is drawn. */
export function positionSummary(f: PositionFacts): string {
  const met = f.judged ? ` ${f.met} of the ${f.judged} units with a budget met it.` : "";
  if (f.where == null) return `${f.ranked} units, lowest compliance first.${met}`;
  if (f.rank == null) return `${f.where} has no formulary or out-of-formulary spend in this selection, so it is not ranked.${met}`;
  const place = f.rank === 1 ? "has the lowest compliance" : `is ${ordinal(f.rank)} lowest`;
  return `${f.where} ${place} of ${f.ranked} units.${met}`;
}
