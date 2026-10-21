// Axis arithmetic the Formulary and Spend charts share: a round ceiling for bars that start at
// zero, a fitted range for a % line drawn on its own axis, a fitted domain for a % drawn as
// dots, a value held inside a range, and how wide a label will print.
import { isNum } from "./format";

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A round axis ceiling (1, 2, 5 × 10ⁿ) at or above `v`; also the tick step close to `v`. */
export function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** A round axis ceiling at or above `v` on a finer ladder than niceMax (1, 1.2, 1.5, 2, 2.5, 3,
 *  4, 5, 6, 8 × 10ⁿ), for bars that must use the room a one-screen panel has: ₹ 1,021 L fills
 *  85% of a ₹ 1,200 L axis, against 51% of niceMax's ₹ 2,000 L. Still from zero. */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8].find((s) => m <= s + 1e-9) ?? 10) * p;
}

/** The % axis range, fitted to the values the way HCG's own charts are (its loss % axis runs
 *  41%–51% for values 44.4%–49.7%), so month-to-month moves of a few points show as a real
 *  rise and fall instead of a flat line pinned to the top. Never below 0 unless a value is (an
 *  out-of-formulary brand can earn more than its formulary match). `cap` stops the axis at a
 *  ceiling the values cannot pass, e.g. 100 for compliance. */
export function pctRange(values: number[], { cap }: { cap?: number } = {}): { lo: number; hi: number; step: number } {
  if (!values.length) return { lo: 0, hi: cap ?? 100, step: 25 };
  const min = Math.min(...values), max = Math.max(...values);
  const step = niceMax(Math.max(max - min, 2) / 4);
  const below = Math.floor(min / step) * step - step;
  const lo = min >= 0 ? Math.max(0, below) : below;
  let hi = Math.ceil(max / step) * step + step;
  if (cap != null && max <= cap) hi = Math.min(hi, cap);
  if (!(hi > lo)) hi = lo + step;
  return { lo, hi, step };
}

/** A whole-number axis around the values (and the target), at least `minSpan` wide and never
 *  above `cap`: a compliance axis stops at 100%. For a % drawn as dots, whose axis need not
 *  start at zero (Few's bullet graph). */
export function fitDomain(values: number[], { cap, minSpan = 2 }: { cap?: number; minSpan?: number } = {}): [number, number] {
  const v = values.filter(isNum);
  if (!v.length) return [0, cap ?? 100];
  let hi = Math.ceil(Math.max(...v) + 0.25);
  if (isNum(cap)) hi = Math.min(cap, hi);
  let lo = Math.floor(Math.min(...v) - 0.25);
  if (hi - lo < minSpan) lo = hi - minSpan;
  return [lo, hi];
}

/** Rough rendered width of a label at font size `fs`, enough to decide whether it fits. */
export const textW = (s: string, fs: number) => s.length * fs * 0.58;
