// HCG's number styles, in one place. Cards print rupees in lakhs the way HCG's own Power BI
// dashboards do ("₹ 4,535 L"); drawers print exact rupees with paise the way its MIS sheets
// carry them ("₹10,20,61,364.55"). Every formatter prints "—" for a missing figure, never 0,
// and a minus sign (−), not a hyphen.

export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const LAKH = 1e5;
const CRORE = 1e7;
const INDIAN = "en-IN";

/** A magnitude with its minus, only when the printed figure is not zero: a value that rounds
 *  away never reads "−0.00". */
const withMinus = (v: number, body: string) => (v < 0 && /[1-9]/.test(body) ? `−${body}` : body);

/** Rupees in lakhs, as HCG's dashboards print them:
 *    a crore and above      → whole lakhs, Indian grouping   "₹ 1,021 L"
 *    a lakh up to a crore   → lakhs to two decimals          "₹ 16.39 L"
 *    below a lakh           → whole rupees                   "₹ 31,030"
 *  The band is chosen on the printed value, so ₹99,999.60 reads "₹ 1.00 L", not "₹ 1,00,000". */
export function lakhs(v: number | null | undefined): string {
  if (!isNum(v)) return "—";
  const a = Math.abs(v);
  const l = a / LAKH;
  let body: string;
  if (a >= CRORE || Math.round(l * 100) >= 10000) body = `₹ ${Math.round(l).toLocaleString(INDIAN)} L`;
  else if (Math.round(a) >= LAKH) body = `₹ ${l.toFixed(2)} L`;
  else body = `₹ ${Math.round(a).toLocaleString(INDIAN)}`;
  return withMinus(v, body);
}

/** Exact rupees with Indian grouping and paise, as HCG's sheets carry them: "₹10,20,61,364.55". */
export function rupeesExact(v: number | null | undefined): string {
  if (!isNum(v)) return "—";
  return withMinus(v, `₹${Math.abs(v).toLocaleString(INDIAN, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

/** A percentage: "98.42%". */
export function pct(v: number | null | undefined, d = 2): string {
  return isNum(v) ? withMinus(v, `${Math.abs(v).toFixed(d)}%`) : "—";
}

/** A difference between two percentages, in points: "1.58 pts". */
export function pts(v: number | null | undefined, d = 2): string {
  return isNum(v) ? withMinus(v, `${Math.abs(v).toFixed(d)} pts`) : "—";
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "10-Oct-26" for a date or build stamp ('2026-10-10T09:59:34+00:00'), in the style of HCG's
 *  month labels ("Aug-26"); null without one. Read from the date part, so no time zone moves
 *  the day. */
export function dayLabel(stamp: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(stamp ?? ""));
  const mon = m ? MONTH_ABBR[Number(m[2]) - 1] : undefined;
  return m && mon ? `${m[3]}-${mon}-${m[1].slice(2)}` : null;
}

/** A change printed with its sign spelt out either way: withSign(4.3e6, lakhs) → "+₹ 43.00 L",
 *  withSign(-8.56, pct) → "−8.56%". No plus when the printed figure is zero. */
export function withSign(v: number | null | undefined, fmt: (v: number) => string): string {
  if (!isNum(v)) return "—";
  const s = fmt(v);
  return v > 0 && /[1-9]/.test(s) ? `+${s}` : s;
}
