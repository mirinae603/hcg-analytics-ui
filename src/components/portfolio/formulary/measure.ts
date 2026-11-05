// What a formulary amount counts, and how it prints. The header's Value ↔ Quantity switch
// (context/BasisContext) asks every formulary endpoint for one or the other, and each answer
// says which it gave (scope.basis). Figures are printed from the ANSWER's basis, never from the
// switch: while a new answer loads the old one stays on screen, and it must keep its own unit.
//
//   value — rupees at cost (TOTALCOSTPRICE): the amounts HCG's budget is set on, judged against it.
//   qty   — units sold (QTY): tablets, vials and bottles added together, because the sales files
//           keep no unit of measure. A second lens on the same lines: never judged against the
//           budget (a drug-cost target), and every amount prints as a plain count.
import type { Basis } from "@/context/BasisContext";
import type { DeltaProps } from "@/components/portfolio/ledger/KpiCard";
import type { GoodWhen } from "@/components/portfolio/ledger/status";
import { isNum, lakhs, rupeesExact } from "@/components/portfolio/ledger/format";
import type { Kind } from "@/lib/kpiRegistry";

export type Measure = {
  basis: Basis;
  /** True on the quantity view (the measure counts units sold). */
  units: boolean;
  /** "Value" or "Quantity", as the header switch names them. Never "Units": HCG calls its
   *  hospitals units, and this word sits beside the hospital names. */
  label: string;
  /** What the amounts are, after "drug" or a group's name: "drug spend", "out-of-formulary
   *  quantity". Singular either way, so a sentence takes "is" after it. */
  noun: "spend" | "quantity";
  /** A figure on a chart: lakhs ("₹ 16.39 L") on value, a whole count ("5,19,779") on quantity. */
  short: (v: number | null | undefined) => string;
  /** A figure in a drawer or table: exact rupees with paise on value, the same count on quantity. */
  exact: (v: number | null | undefined) => string;
  /** What the exact figures are, for a drawer section's note. */
  source: string;
  /** The column kind an amount takes in a KpiTable (its cells and its CSV). */
  kind: Kind;
  /** What an amount is counted in, on a downloaded drawer table's heading ("Formulary, ₹"). */
  unit: "₹" | "units";
  /** False on quantity: no budget marker, status, budget line or budget column anywhere. */
  budgetJudged: boolean;
};

/** A whole count with Indian grouping ("5,19,779"), "—" for a missing figure and a minus sign
 *  (−), never a hyphen, as the ledger's rupee formatters print theirs. */
export function count(v: number | null | undefined): string {
  if (!isNum(v)) return "—";
  const body = Math.round(Math.abs(v)).toLocaleString("en-IN");
  return v < 0 && /[1-9]/.test(body) ? `−${body}` : body;
}

/** A count in the kit's short style ("12K", "3.4L", "1.2Cr"), for a slot too narrow for every
 *  digit (the HCG view's twelve months). */
export function countShort(v: number | null | undefined): string {
  if (!isNum(v)) return "—";
  const a = Math.abs(v), sign = v < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}${(a / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${sign}${(a / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(0)}K`;
  return `${sign}${Math.round(a)}`;
}

const VALUE: Measure = {
  basis: "value", units: false, label: "Value", noun: "spend",
  short: lakhs, exact: rupeesExact,
  source: "Exact cost (TOTALCOSTPRICE)",
  kind: "inr", unit: "₹", budgetJudged: true,
};

const UNITS: Measure = {
  basis: "qty", units: true, label: "Quantity", noun: "quantity",
  short: count, exact: count,
  source: "Units sold (QTY): tablets, vials and bottles added together",
  kind: "num", unit: "units", budgetJudged: false,
};

/** The measure for a basis the page asked in (a list tab, before any answer is back). */
export const measureFor = (basis: Basis | undefined): Measure => (basis === "qty" ? UNITS : VALUE);

/** `make`'s answer for each basis, built once at load: table columns, which must keep their
 *  identity from render to render (KpiTable rebuilds its column set when the array changes). */
export const perBasis = <T>(make: (m: Measure) => T): Record<Basis, T> => ({ value: make(VALUE), qty: make(UNITS) });

/** The measure an overview answer was given in. An API from before the switch sends no basis:
 *  its figures are value. `budget_judged` is the server's word on whether the budget applies;
 *  without it, value is judged and units are not. */
export function measureOf(d: { scope?: { basis?: string | null; budget_judged?: boolean | null } | null } | null | undefined): Measure {
  const m = measureFor(d?.scope?.basis === "qty" ? "qty" : "value");
  const judged = d?.scope?.budget_judged;
  return typeof judged === "boolean" && judged !== m.budgetJudged ? { ...m, budgetJudged: judged } : m;
}

/** The change from the month before for a drawer's header chip. Rupees change in rupees; units
 *  change as a % of the month before, because the chip has no count unit (and a count of mixed
 *  tablets and vials reads better as a rate of change). None when the month before had none. */
export function changeOf(m: Measure, v: number | null | undefined, before: number | null | undefined, goodWhen: GoodWhen, vsLabel: string): DeltaProps | undefined {
  if (!isNum(v) || !isNum(before)) return undefined;
  if (!m.units) return { value: v - before, unit: "rs", goodWhen, vsLabel };
  return before > 0 ? { value: ((v - before) / before) * 100, unit: "pct", goodWhen, vsLabel } : undefined;
}
