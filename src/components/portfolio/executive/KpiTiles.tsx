"use client";
// The six KPI tiles across the top of the Executive overview: each a figure in HCG's number
// style, a sparkline of every month its own section holds beside it, its change since the
// previous month with sales (coloured by whether that change is good news for this figure), and
// where it stands against its budget when it has one. A click opens the KPI's drawer: the figure
// in exact rupees, every month in a table, what it is and how it is compared, and the way to its
// own page.
//
// The tiles are the page's short first row (layout.tsx), so each is three lines: the figure and
// its sparkline, the change, and up to two lines of notes. Tile titles are short, to fit a sixth
// of the screen; the drawer carries the full name (the API's label). The (i) is left off these
// tiles for the same reason: their drawer opens on Detail and has the Method tab beside it. The
// notes say what else the figure needs to be read right: the total missed's three parts (D2: it
// is never shown without them; its drawer lists them too), a budget status, what the figure is
// counted in on the Quantity basis, that it is counted on purchases (or includes them), and the
// server's tag (the margin %'s lines with no cost price). They wrap between notes, never inside
// one, and the tile's tooltip has them all.
//
// Each tile is the "Current stock value" page's KPI card: an icon chip beside the title as a grey
// label, the figure big, bold and tight in charcoal, the change as a tinted pill, the sparkline in
// the coral. The first tile, sales, is that page's dark hero card.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { TbPercentage, TbPill, TbReceipt2, TbReportMoney, TbShieldCheck, TbTrendingDown } from "react-icons/tb";
import { ChartPanel, LinkButton, ON_DARK_SUB, PanelPart, usePanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { DrawerSection, KeyFigures, useDrawer, type DrawerCtl, type KeyFigure } from "@/components/portfolio/ledger/DetailDrawer";
import { DeltaChip, deltaText, type DeltaProps } from "@/components/portfolio/ledger/KpiCard";
import { Sparkline } from "@/components/portfolio/ledger/sparkline";
import { useWidth } from "@/components/portfolio/ledger/minis";
import { CORAL, CORAL_SOFT, INK, SUB } from "@/components/portfolio/ledger/kit";
import { STATUS_INK, STATUS_LABEL, WITHIN_PTS, sourceNote, type SourceOf, type SourceSpec } from "@/components/portfolio/ledger/status";
import { isNum, lakhs, pct, pts, rupeesExact, withSign } from "@/components/portfolio/ledger/format";
import { LOSS_COL, OOF_COL } from "@/components/portfolio/spend/shared";
import { ExactTable, HowBuilt, KPI_COL, KPI_PAGE, MethodText, QUANTITY, QUANTITY_LC, RUPEES_ONLY, filterChips, inSelection, kpiExact, kpiShort, type ExecCtx } from "./shared";
import type { BridgeStep, FigureSource, Kpi, KpiKey, SparkRow } from "./api";

/** A tile's title, short enough for a sixth of the screen (the header gives a title 70% of it).
 *  The total missed is "Total missed", not "Margin missed": that is the Spend summary's name for
 *  cash & TPA plus out of formulary, without the scheme saving this total also holds. */
const SHORT: Record<KpiKey, string> = {
  sales: "Revenue (MRP)", margin_pct: "Margin %", compliance: "Compliance", oof_share: "Out of formulary",
  losses: "Total missed", extra_paid: "Extra paid",
};
/** Each tile's icon chip. */
const ICON: Record<KpiKey, IconType> = {
  sales: TbReportMoney, margin_pct: TbPercentage, compliance: TbShieldCheck, oof_share: TbPill, losses: TbTrendingDown, extra_paid: TbReceipt2,
};

/** The figure's size, from the room the tile's body has: 22px in a 1280px-wide screen's sixth,
 *  26px from a 1440px one's, 30px where the body is also tall enough for a 30px line (a 1080px
 *  screen's KPI row). Its line is as tall as the figure, so nothing below it moves. */
function figureSize(w: number, h: number): number {
  if (w >= 206 && h >= 92) return 30;
  return w >= 176 ? 26 : 22;
}

/** Compliance and the out-of-formulary share are worked out on units sold on the Quantity basis:
 *  the same title over a different ratio, so they say so. */
const onQuantity = (c: ExecCtx, k: Kpi) => c.units && (k.key === "compliance" || k.key === "oof_share");
/** Money, and the margin % (a rupee ratio), keep rupees on the Quantity basis. */
const inRupees = (k: Kpi) => k.unit === "inr" || k.key === "margin_pct";

/** A KPI's full name: the API's label ("Revenue (MRP)", "Units sold" on the Quantity basis), and
 *  a ratio worked out on quantity says so. */
function nameOf(c: ExecCtx, k: Kpi): string {
  return `${k.label}${onQuantity(c, k) ? ` on ${QUANTITY_LC}` : ""}`;
}

/** Where a KPI's parts are counted, in order (an answer without `sources` has its one source). */
const sourcesOf = (k: Kpi): FigureSource[] => (k.sources?.length ? k.sources : [k.source]);
const SOURCE_WORDS: Record<FigureSource, string> = { sales: "sales lines", purchases: "purchases" };
/** "on sales lines", "on purchases", or "on sales lines + purchases" for the total missed. */
const countedOn = (k: Kpi) => `on ${sourcesOf(k).map((s) => SOURCE_WORDS[s]).join(" + ")}`;
const onPurchases = (k: Kpi) => sourcesOf(k).includes("purchases");
/** The tile's source word: "purchases", or "incl. purchases" beside sales lines (never "+ …",
 *  which would read as an amount added to the figure). */
const purchasesBadge = (k: Kpi) => (sourcesOf(k).length > 1 ? "incl. purchases" : "purchases");

/** The total missed's three parts — cash & TPA, scheme, out of formulary. The bridge's steps
 *  between its two totals are the same three section headlines (D2, D3), so they are read from
 *  there; a part whose section has no figures for the selection is left out (the note says so). */
const PART_SHORT: Record<string, string> = { cash: "Cash & TPA", scheme: "Scheme", oof: "OOF" };
const partsOf = (c: ExecCtx): BridgeStep[] => c.d.bridge.steps.filter((s) => s.kind === "delta" && isNum(s.value));
/** A part on the tile at its total's precision: whole lakhs when the total prints whole lakhs
 *  (₹ 100 L and over), so the parts visibly add up to it and the three fit a narrow tile; else as
 *  lakhs() prints it. Its drawer has every part exactly. */
function partShort(v: number | null, total: number | null): string {
  if (!isNum(v) || !isNum(total) || Math.abs(total) < 1e7 || Math.abs(v) < 1e5) return lakhs(v);
  const whole = Math.round(Math.abs(v) / 1e5).toLocaleString("en-IN");
  return `${v < 0 ? "−" : ""}₹ ${whole} L`;
}
/** The status words a tile has room for (STATUS_LABEL has the long forms, for the name). */
const STATUS_SHORT = { met: "Met budget", within: `Within ${WITHIN_PTS} pts`, below: "Below budget" } as const;

/** Figures read from purchases say so on their badge's tooltip and in the drawer. */
const PURCHASES: SourceSpec = { kind: "computed", note: "Worked out by the app from HCG's purchases (goods receipts), not from sales lines" };
/** The total missed's part names in a sentence, by the bridge step's key. */
const PART_WORDS: Record<string, string> = { cash: "cash & TPA", scheme: "the scheme saving", oof: "out of formulary" };
const andList = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The source a KPI's badge and drawer give: the app's own working, from sales lines, from
 *  purchases, or — the total missed — each part from where it is counted. */
function sourceOf(c: ExecCtx, k: Kpi): SourceOf {
  const src = sourcesOf(k);
  if (!src.includes("purchases")) return "computed";
  if (src.length === 1) return PURCHASES;
  const on = (s: FigureSource) => andList(partsOf(c).filter((p) => p.source === s).map((p) => PART_WORDS[p.key] ?? p.label));
  const sales = on("sales"), bought = on("purchases");
  return {
    kind: "computed",
    note: sales && bought
      ? `Worked out by the app: ${sales} from HCG's HIS sales lines, ${bought} from HCG's purchases (goods receipts)`
      : `Worked out by the app from HCG's HIS sales lines and purchases (goods receipts)`,
  };
}

/** The KPI's change for its chip, or undefined when it has none. */
function deltaOf(c: ExecCtx, k: Kpi): DeltaProps | undefined {
  if (!isNum(k.delta) || !c.prevLabel) return undefined;
  return { value: k.delta, unit: k.delta_unit === "pts" ? "pts" : "pct", goodWhen: k.good_when, vsLabel: `vs ${c.prevLabel}` };
}

/** Why a tile shows no change, in a few words. A month before of 0 has a figure but no % change
 *  (the API sends none from zero), so that figure is printed instead. */
function noChange(c: ExecCtx, k: Kpi): string {
  if (!isNum(k.value)) return "no figure for this selection";
  if (c.d.scope.month === "ALL") return "all months: no change shown";
  if (!c.prevLabel) return "first month with sales";
  if (isNum(k.prev)) return `${c.prevLabel}: ${kpiShort(k, k.prev)}`;
  return `no ${c.prevLabel} figure`;
}

// A layout effect measures before the first paint; on the server there is no layout to read.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** NOTES_LINES lines of notes: the ones the tile must print, then as many of the rest as still
 *  fit, measured as drawn (a note is never cut, and one that does not fit is left to the tooltip,
 *  which has them all). The fit is worked out again when the width, the notes or the page's
 *  fonts change (a web font that arrives after the first measure sets the words narrower). */
const NOTES_LINES = 2;
function Notes({ notes, dark = false }: { notes: Note[]; dark?: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [box, w] = useWidth<HTMLDivElement>(0);
  const [fonts, setFonts] = useState(0);
  useEffect(() => {
    const set = typeof document !== "undefined" ? document.fonts : undefined;
    if (!set) return;
    let live = true;
    const bump = () => { if (live) setFonts((n) => n + 1); };
    set.addEventListener("loadingdone", bump);
    void set.ready.then(bump);
    return () => { live = false; set.removeEventListener("loadingdone", bump); };
  }, []);
  const sig = `${w}|${fonts}|${notes.map((n) => `${n.key}:${n.text}`).join("|")}`;
  const kept = notes.filter((n) => n.keep).length;
  const [fit, setFit] = useState<{ sig: string; shown: number }>({ sig: "", shown: notes.length });
  const shown = fit.sig === sig ? fit.shown : notes.length;
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const over = el.scrollHeight > el.clientHeight + 1;
    if (over && shown > kept) setFit({ sig, shown: shown - 1 });
    else if (fit.sig !== sig) setFit({ sig, shown });
  });
  const list = [...notes.filter((n) => n.keep), ...notes.filter((n) => !n.keep)].slice(0, Math.max(kept, shown));
  return (
    <div ref={box} className="flex-shrink-0 min-w-0">
      {/* Each note keeps its words together; the line breaks between notes, never before a dot. */}
      <p ref={ref} className="text-[11px] leading-[13px] overflow-hidden" style={{ color: dark ? ON_DARK_SUB : SUB, maxHeight: NOTES_LINES * 13 }} title={notes.map((n) => n.text).join(" · ")}>
        {list.map((n, i) => (
          <React.Fragment key={n.key}>
            <span className="whitespace-nowrap" title={n.title}>{n.node ?? n.text}{i < list.length - 1 ? " ·" : ""}</span>
            {i < list.length - 1 ? " " : null}
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}

const sparkOf = (c: ExecCtx, rows: SparkRow[]) =>
  rows.map((r) => ({ key: r.period, label: r.label, value: r.value, selected: inSelection(c, r.period) }));

/** One note under a tile's change: its words (for the tooltip), how it prints, its own tooltip
 *  when it has one, and whether the tile must print it whatever the room (the total missed's
 *  parts, a budget status). */
type Note = { key: string; text: string; node?: React.ReactNode; title?: string; keep?: boolean };

/** The notes a tile prints, most needed first: the total missed's parts, a budget status, what
 *  the figure is counted in on the Quantity basis, where it is counted when that is purchases,
 *  and the server's tag. */
function notesOf(c: ExecCtx, k: Kpi): Note[] {
  const parts = k.key === "losses" ? partsOf(c) : [];
  const status = k.status ?? null;
  const basisTag = !c.units ? null : inRupees(k) ? RUPEES_ONLY : onQuantity(c, k) ? `on ${QUANTITY_LC}` : null;
  return [
    ...parts.map((s): Note => {
      const name = PART_SHORT[s.key] ?? s.label;
      const figure = partShort(s.value, k.value);
      return {
        key: s.key, text: `${name} ${figure}`, keep: true, title: `${s.label}: ${rupeesExact(s.value)}, ${s.source === "purchases" ? "on purchases (goods receipts)" : "on sales lines"}`,
        node: <>{name} <b className="font-semibold" style={{ color: "var(--hcg-note-ink)" }}>{figure}</b></>,
      };
    }),
    ...(status ? [{
      key: "status", keep: true, text: `${STATUS_SHORT[status]}${isNum(k.target) ? ` · budget ${pct(k.target, 0)}` : ""}`,
      node: <><span className="font-semibold" style={{ color: STATUS_INK[status] }}><span aria-hidden="true">● </span>{STATUS_SHORT[status]}</span>{isNum(k.target) ? ` · budget ${pct(k.target, 0)}` : ""}</>,
    }] : []),
    ...(basisTag ? [{ key: "basis", text: basisTag, node: <span className="font-semibold">{basisTag}</span> }] : []),
    ...(onPurchases(k) ? [{ key: "source", text: purchasesBadge(k), title: sourceNote(sourceOf(c, k)) }] : []),
    ...(k.tag ? [{ key: "tag", text: k.tag }] : []),
  ];
}

/** A tile's face: the figure and its sparkline, the change, the notes. Reads the body's size from
 *  the panel to size the figure. */
function KpiFace({ c, k, hero }: { c: ExecCtx; k: Kpi; hero: boolean }) {
  const size = usePanel()?.size ?? { w: 0, h: 0 };
  const fs = figureSize(size.w, size.h);
  const delta = deltaOf(c, k);
  const notes = notesOf(c, k);
  const target = isNum(k.target) ? { value: k.target, label: `Budget ${pct(k.target, 0)}` } : null;
  return (
    <div className="flex flex-col h-full min-h-0 gap-[3px]" style={{ "--hcg-note-ink": hero ? "#fff" : INK } as React.CSSProperties}>
      {/* The figure keeps its full width; its months fill the room beside it. */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0" style={{ height: Math.max(26, fs) }}>
        <span className="font-bold tabular-nums leading-none flex-shrink-0" style={{ fontSize: fs, color: hero ? "#fff" : INK, letterSpacing: "-.025em" }}>{kpiShort(k, k.value)}</span>
        <PanelPart className="h-full min-w-[36px]">
          <Sparkline points={sparkOf(c, k.spark)} format={(v) => kpiShort(k, v)} color={hero ? CORAL_SOFT : CORAL} target={target}
            ariaLabel={`${nameOf(c, k)} by month`} />
        </PanelPart>
      </div>
      {/* A fixed line height keeps the chip at 22px, whatever the page's. */}
      <div className="flex items-center min-w-0 h-[22px] leading-[14px] flex-shrink-0">
        {delta ? <DeltaChip {...delta} dark={hero} /> : <span className="text-[11px] truncate" style={{ color: hero ? ON_DARK_SUB : SUB }}>{noChange(c, k)}</span>}
      </div>
      {notes.length > 0 && <Notes notes={notes} dark={hero} />}
    </div>
  );
}

export function KpiTile({ c, k, place, hero = false }: { c: ExecCtx; k: Kpi; place: Place; hero?: boolean }) {
  const dr = useDrawer();
  const delta = deltaOf(c, k);
  const status = k.status ?? null;
  // Sales on the Quantity basis are units sold: the API's own label says so.
  const title = k.unit === "qty" ? k.label : SHORT[k.key] ?? k.label;
  const parts = k.key === "losses" ? partsOf(c) : [];
  const partsText = parts.map((s) => `${PART_SHORT[s.key] ?? s.label} ${lakhs(s.value)}`).join(" · ");
  const label = [
    `${nameOf(c, k)}, ${c.context}: ${kpiShort(k, k.value)}`,
    partsText || null,
    delta ? deltaText(delta) : noChange(c, k),
    status ? STATUS_LABEL[status] : null,
    k.tag || null,
    onPurchases(k) ? countedOn(k) : null,
  ].filter(Boolean).join(", ");
  return (
    <>
      <ChartPanel id={`kpi-${k.key}`} title={title} icon={ICON[k.key]} hero={hero} place={place} label={label} onOpen={() => dr.show("detail")}>
        <KpiFace c={c} k={k} hero={hero} />
      </ChartPanel>
      <KpiDrawer c={c} k={k} dr={dr} />
    </>
  );
}

function KpiDrawer({ c, k, dr }: { c: ExecCtx; k: Kpi; dr: DrawerCtl }) {
  const page = KPI_PAGE[k.key];
  const delta = deltaOf(c, k);
  const rows = k.spark;
  const isPct = k.unit === "pct";
  const all = c.d.scope.month === "ALL";
  const name = nameOf(c, k);
  // The change from the month before in the list: points for a %, else the amount itself (the
  // tile's chip gives an amount's change as a % of the month before instead).
  const diff = (r: SparkRow) => {
    const i = rows.indexOf(r);
    const before = i > 0 ? rows[i - 1].value : null;
    return isNum(r.value) && isNum(before) ? r.value - before : null;
  };
  const figures: KeyFigure[] = [
    { label: all ? "All months" : c.d.scope.month_label, value: kpiExact(k, k.value), note: [countedOn(k), k.tag].filter(Boolean).join(" · "), color: KPI_COL[k.key] },
    // The total missed's parts, each from its own section (D2).
    ...(k.key === "losses" ? partsOf(c) : []).map((s) => ({
      label: s.label, value: rupeesExact(s.value), note: s.source === "purchases" ? "on purchases (goods receipts)" : "on sales lines",
      color: s.source === "purchases" ? OOF_COL : LOSS_COL,
    })),
    ...(c.prevLabel ? [{ label: c.prevLabel, value: kpiExact(k, k.prev), note: "the previous month with sales" }] : []),
    ...(isNum(k.delta) ? [{ label: "Change", value: k.delta_unit === "pts" ? withSign(k.delta, (v) => pts(v)) : withSign(k.delta, (v) => pct(v)), note: k.delta_unit === "pts" ? "in points" : `as a % of ${c.prevLabel ?? "the month before"}` }] : []),
    ...(isNum(k.target) ? [{ label: "Budget", value: pct(k.target), note: k.status ? STATUS_LABEL[k.status] : "HCG's budget for this unit" }] : []),
  ];
  const changeUnit = isPct ? "pts" : k.unit === "qty" ? "units" : "₹";
  // On All months the purchases figure is worked out over the page's months together, against
  // one usual cheapest for the whole span, so the shaded months do not add up to it.
  const spanNote = all && k.key === "extra_paid"
    ? " On All months the figure is worked out over the shaded months together, against one usual cheapest for the whole span, so their own figures do not add up to it exactly."
    : "";
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab}
      eyebrow="Executive overview · KPI" title={`${name} · ${c.where}`}
      kpi={{ value: kpiExact(k, k.value), comparator: c.prevLabel && isNum(k.prev) ? `${c.prevLabel}: ${kpiExact(k, k.prev)}` : undefined, delta, status: k.status ?? undefined }}
      source={sourceOf(c, k)} asOf={c.asOf} filters={filterChips(c, { counted: inRupees(k) ? "rupees" : "basis" })}
      tabs={[
        {
          key: "detail", label: "Detail", render: () => (
            <>
              <DrawerSection title="Key figures"><KeyFigures figures={figures} /></DrawerSection>
              <DrawerSection title="Every month" note={`Every month ${sourcesOf(k).every((s) => s === "purchases") ? "the purchase analysis" : "its section"} holds; shaded = your selection. The change is from the month before in the list, ${isPct ? "in points" : `as an amount (the tile gives it as a % of the month before)`}.${spanNote}`}>
                <ExactTable rows={rows} rowKey={(r) => r.period} caption={`${name} by month, ${c.where}`}
                  selected={(r) => inSelection(c, r.period)}
                  columns={[
                    { label: "Month", value: (r) => r.label, text: true },
                    { label: k.unit === "qty" ? "Units sold" : name, value: (r) => kpiExact(k, r.value), raw: (r) => r.value, unit: isPct ? "%" : k.unit === "qty" ? "units" : "₹", strong: true },
                    { label: `Change, ${changeUnit}`, value: (r) => { const v = diff(r); return isNum(v) ? withSign(v, (x) => (isPct ? pts(x) : kpiExact(k, x))) : "—"; }, raw: diff, unit: changeUnit },
                  ]} empty="No months for this figure in this selection." />
              </DrawerSection>
              <DrawerSection title="What it is"><p className="text-[12.5px] leading-relaxed" style={{ color: SUB }}>{k.note}</p></DrawerSection>
              <LinkButton onClick={() => c.go(page.href)}>Open {page.name}</LinkButton>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>{k.note}</p>
                <p>The change is against {c.prevLabel ?? "the previous month with sales"}, the previous month with sales, for every KPI alike: {isPct ? "a % changes in points" : "an amount changes as a % of the month before"}. Its colour says whether the move is good news for this figure ({k.good_when === "up" ? "up is better" : "down is better"}); a move smaller than the chip&apos;s threshold reads as no change.</p>
                {isNum(k.target) && <p>The budget is HCG&apos;s for this unit (its PAN MIS). Met when the figure prints at or above it (HCG&apos;s MIS prints whole %), within when up to {WITHIN_PTS} pts below that, below beyond it.</p>}
                <p>The sparkline is every month the figure&apos;s own section holds ({rows.length} {rows.length === 1 ? "month" : "months"} here), on a range fitted to them: it shows the shape, not the size. The dot is the month selected.</p>
                {k.key === "losses" && <p>The total missed is the three parts HCG reads separately — the cash &amp; TPA margin missed, the scheme saving missed and the out-of-formulary margin missed — each its own section&apos;s headline, added up; the tile and the key figures list them. The first two are counted on HIS sales lines and out of formulary on purchases (goods receipts), so the tile says the total includes purchases. The Spend summary&apos;s &quot;margin missed&quot; leaves the scheme saving out, so it is smaller.</p>}
                {k.tag && <p>&quot;{k.tag}&quot;: {k.key === "margin_pct" ? "sales lines whose cost price is blank in the HIS file count as cost 0, as HCG's sheet does, so their MRP is margin in full; the note above gives their MRP." : "as the note above says."}</p>}
                {inRupees(k) && c.units && <p>This is {k.unit === "inr" ? "a money figure" : "a rupee ratio"}, so it stays in rupees on the {QUANTITY} basis ({RUPEES_ONLY}).</p>}
                {onQuantity(c, k) && <p>On the {QUANTITY} basis this is worked out on units sold (tablets, vials and bottles added together) instead of drug cost, so it is not the rupee figure and is never judged against the budget.</p>}
              </MethodText>
              <HowBuilt c={c} />
            </>
          ),
        },
      ]} />
  );
}
