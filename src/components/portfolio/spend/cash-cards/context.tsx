// Spend Analysis — what every tile on the Cash & TPA overview shares: the data shape, the
// section's words and the selection the tiles are computed under. The colours are the Spend
// pages' own (../shared): the margin made (USED_COL), the margin proposed (PROPOSED_COL), the
// margin lost (LOSS_COL), the % missed (RATE_COL) and counts (COUNT_COL). The strip on top of a
// tile says its topic: the margin itself, the margin lost, or counts. (Out of formulary has an
// overview of its own, on purchases: ../oof-cards.)
import type { DrawerFilter } from "@/components/portfolio/ledger/DetailDrawer";
import type { Source } from "@/components/portfolio/ledger/status";
import { dayLabel } from "@/components/portfolio/ledger/format";
import { monthBefore, monthsLabel } from "../../formulary/api";
import type { CashOverview, Filters, Meta, View } from "../api";

export { USED_COL, PROPOSED_COL, LOSS_COL, RATE_COL, COUNT_COL, HOSPITAL_COL, BRAND_COL, DOCTOR_COL, typeLabel, payerLabel } from "../shared";
import { CASH_COL } from "../shared";

export type Data = CashOverview;
export type Month = Data["trend"][number];
export type Hospital = Data["by_hospital"][number];
export type TopItem = Data["top_items"][number];

// The section's words (HCG's: actual / margin possible, margin missed).
export type Words = {
  section: string; title: string; used: string; sug: string; arrow: string; none: string;
  /** Row labels on a chart face, where a long phrase would be cut: "Brands used". */
  usedShort: string; sugShort: string;
  /** What the brands used are set against, in a tile's title: "used vs suggested". */
  versus: string;
  topTitle: string; topNote: string; monthNote: string; rankNote: string; rankEmpty: string; increaseNote: string;
};

export const WORDS: Words = {
  section: "Cash & TPA", title: "Margin missed", used: "brands used", sug: "suggested brands", arrow: "suggested brand",
  none: "No cash or TPA use of these brands",
  usedShort: "Brands used", sugShort: "Suggested brands", versus: "used vs suggested",
  topTitle: "brands to switch",
  topNote: "The brands used for cash and TPA patients where the suggested brand would have earned the most more. Margin earned = qty counted × the used brand's unit margin; margin possible = the same qty × the suggested brand's; margin missed = margin possible − margin earned; % missed = margin missed ÷ margin possible; share = the brand's part of the selection's margin missed.",
  monthNote: "Margin earned on the brands used, the margin the suggested brands would have made (margin possible), the margin missed and % missed (= margin missed ÷ margin possible), per month.",
  rankNote: "Every hospital for the same months, patient type, material type and payer: this list ignores the hospital selector. Earned = margin on the brands used; possible = the margin the suggested brands would make; % missed = margin missed ÷ margin possible.",
  rankEmpty: "No cash or TPA patient got a brand with a suggestion in this selection.",
  increaseNote: "suggested − used MRP",
};

/** The selection every tile on the overview is computed under, worked out once. */
export type Ctx = {
  d: Data;
  meta: Meta;
  w: Words;
  /** "KR Bangalore" or "All hospitals". */
  where: string;
  /** "Aug-26", or "Jun-26 – Aug-26" for a run. */
  when: string;
  /** "cash & TPA patients", or the one payer picked. */
  who: string;
  /** The line after every tile's title: "KR Bangalore · Aug-26". */
  context: string;
  /** The section's colour (cash & TPA blue): its months' bars. */
  tone: string;
  /** All hospitals together, rather than one. */
  network: boolean;
  /** Where the figures come from: recomputed from the sales lines and HCG's cash list. */
  source: Source;
  asOf: string | null;
  /** The filters, read-only, in every drawer's header. */
  chips: DrawerFilter[];
  /** The overview's own query (the hospital and the section's filters). The top-doctors tile
   *  asks the Doctors tab's endpoint with it, so its rows match that tab row for row. */
  params: Record<string, string>;
  /** Moves to another tab of the section (Brands, Doctors). */
  onOpen: (v: View) => void;
};

const PAYER_WORDS: Record<string, { who: string; chip: string }> = {
  CASH: { who: "cash patients", chip: "Cash" },
  "CASH(TPA)": { who: "TPA patients", chip: "TPA" },
};

export function makeCtx(d: Data, meta: Meta, filters: Filters, params: Record<string, string>, onOpen: (v: View) => void): Ctx {
  const network = !d.scope?.plant || d.scope.plant === "ALL";
  const where = network ? "All hospitals" : (d.scope.his_name || d.scope.plant_name || d.scope.plant || "");
  const when = monthsLabel(meta, d.scope?.months || []);
  const payer = PAYER_WORDS[d.scope?.payer ?? ""];
  const segment = filters.segment === "ALL" ? "All material types"
    : meta.categories?.find((c) => c.key === filters.segment)?.label ?? filters.segment;
  return {
    d, meta, w: WORDS, where, when, network, params, tone: CASH_COL,
    who: payer?.who ?? "cash & TPA patients",
    context: `${where} · ${when}`,
    source: "computed",
    asOf: dayLabel(d.data_as_of || meta.built_at),
    chips: [
      { label: "Hospital", value: where },
      { label: "Month", value: when },
      { label: "Patients", value: filters.type === "ALL" ? "IP + OP" : filters.type },
      { label: "Material", value: segment },
      { label: "Payer", value: payer?.chip ?? "Cash + TPA" },
    ],
    onOpen,
  };
}

/** The month before a single selected month, when it had any use: what a tile's figure is
 *  compared with when there is no budget. Null for a run of months. */
export function prevMonth(d: Data): Month | null {
  const prev = monthBefore(d.trend || [], d.scope?.months || []);
  return prev && prev.lines > 0 ? prev : null;
}
