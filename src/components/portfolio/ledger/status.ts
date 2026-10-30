// The one status rule every KPI card uses: where a figure stands against its budget, and
// whether a change since the last period is good or bad. HCG has not written its rule down,
// so the band lives here as one constant; changing it changes every card at once.
import { JADE, BRASS, RUST, SUB } from "./kit";

export type Status = "met" | "within" | "below" | "none";
export type Source = "computed" | "hcg" | "estimate";
/** Which way a change is good: compliance up, loss and out-of-formulary spend down. */
export type GoodWhen = "up" | "down" | "neutral";
export type Tone = "good" | "bad" | "flat" | "neutral";

/** Points below budget that still count as "within budget" (the amber band). Our proposal,
 *  agreed with the user on 15-10-2026; HCG's own remarks do not follow one stated rule. */
export const WITHIN_PTS = 2;

// HCG's MIS prints whole percentages, so a figure meets its budget when it PRINTS at or above
// it: 97.5% prints as 98% and meets a 98% budget; 97.49% prints as 97% and does not.
const PRINT_ROUNDING = 0.5;

export function classify(pct: number | null | undefined, budget: number | null | undefined, withinPts = WITHIN_PTS): Status {
  if (pct == null || budget == null || !Number.isFinite(pct) || !Number.isFinite(budget)) return "none";
  if (pct >= budget - PRINT_ROUNDING) return "met";
  if (pct >= budget - withinPts - PRINT_ROUNDING) return "within";
  return "below";
}

export const STATUS_LABEL: Record<Status, string> = {
  met: "Met budget",
  within: `Within ${WITHIN_PTS} pts of budget`,
  below: `More than ${WITHIN_PTS} pts below budget`,
  none: "No budget comparison",
};

export const STATUS_COLOR: Record<Status, string> = { met: JADE, within: BRASS, below: RUST, none: SUB };

/** Status bands on a min–max axis, for a bullet bar behind its budget tick. */
export function statusBands(budget: number, min: number, max: number, withinPts = WITHIN_PTS): { from: number; to: number; status: Status }[] {
  const cuts = [min, budget - withinPts - PRINT_ROUNDING, budget - PRINT_ROUNDING, max]
    .map((v) => Math.min(max, Math.max(min, v)));
  const order: Status[] = ["below", "within", "met"];
  return order
    .map((status, i) => ({ from: cuts[i], to: cuts[i + 1], status }))
    .filter((b) => b.to > b.from);
}

/** Smallest change that counts as a move, per unit; anything smaller reads as "no change". */
export const DELTA_THRESHOLD = { pts: 0.1, pct: 0.5, rs: 1 } as const;
export type DeltaUnit = keyof typeof DELTA_THRESHOLD;

export function deltaTone(delta: number, goodWhen: GoodWhen, threshold: number): Tone {
  if (!Number.isFinite(delta) || Math.abs(delta) < threshold) return "flat";
  if (goodWhen === "neutral") return "neutral";
  return (delta > 0) === (goodWhen === "up") ? "good" : "bad";
}

export const TONE_COLOR: Record<Tone, string> = { good: JADE, bad: RUST, flat: SUB, neutral: SUB };
export const TONE_WORD: Record<Tone, string> = { good: "better", bad: "worse", flat: "no change", neutral: "change" };

// "hcg" figures are pooled by the app from the rupees in HCG's MIS workbook (the app has no
// sales lines for them), so they can differ from the % HCG printed, which travels beside them.
export const SOURCE_LABEL: Record<Source, string> = { computed: "Computed", hcg: "HCG MIS", estimate: "Estimated" };
export const SOURCE_NOTE: Record<Source, string> = {
  computed: "Recomputed by the app from HCG's HIS sales lines and masters",
  hcg: "Pooled by the app from the rupees in HCG's MIS workbook (no HIS sales lines for it); HCG's printed % is shown beside it",
  estimate: "Partly estimated by the app, where HCG has not shared its own basis yet. The (i) says how it is worked out.",
};

/** A source with the words its badge's tooltip gives, for figures SOURCE_NOTE does not describe:
 *  ones read from HCG's purchases (GRN) rather than its sales lines, or an estimated definition. */
export type SourceSpec = { kind: Source; note: string };
/** What a badge, a panel or a drawer is told about a figure's source. */
export type SourceOf = Source | SourceSpec;
export const sourceKind = (s: SourceOf): Source => (typeof s === "string" ? s : s.kind);
export const sourceNote = (s: SourceOf): string => (typeof s === "string" ? SOURCE_NOTE[s] : s.note);
