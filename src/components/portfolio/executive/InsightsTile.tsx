"use client";
// Insights and recommended actions, in plain words with the exact figures. The server writes them
// by fixed rules over the figures on the page (no language model, so they read the same with or
// without the AI key and every number matches its panel):
//   Insights            — up to six, most pressing first, each marked by whether it is good or
//                         bad news (better / worse / needs attention / for the record), with the
//                         page that shows it in full;
//   Recommended actions — up to four, the biggest rupees first: the switch or the price that would
//                         have kept the most, then the follow-ups that have no rupees of their own.
// On the one-screen page the tile shows the first three of each side by side (as many as its
// height holds), each cut to the lines it has room for, the whole sentence in its tooltip; the
// drawer has every one in full. "Ask the AI Analyst about this", on the tile and in the drawer,
// sends a prepared question about this hospital and month to the AI chat, with the page's context
// (the analyst then works from the same tables). Each item's link carries this page's month and
// filters (ExecCtx.link).
import React from "react";
import Link from "next/link";
import { TbAlertTriangle, TbArrowRight, TbCircleCheck, TbCircleX, TbInfoCircle, TbSparkles } from "react-icons/tb";
import { ChartPanel, usePanel } from "@/components/portfolio/ledger/panel";
import type { Place } from "@/components/portfolio/ledger/onescreen";
import DetailDrawer, { DrawerSection, useDrawer, type DrawerCtl } from "@/components/portfolio/ledger/DetailDrawer";
import { CORAL_INK, HONEY_INK, INK, LINE, SAGE, SUB, tint } from "@/components/portfolio/ledger/kit";
import { isNum, lakhs, rupeesExact } from "@/components/portfolio/ledger/format";
import { clamp } from "@/components/portfolio/ledger/scale";
import { useAiChat } from "@/context/AiChatContext";
import { ACCENT, HowBuilt, MethodText, QUANTITY, QUANTITY_LC, SEGMENT_LABEL, filterChips, pageName, type ExecCtx } from "./shared";
import type { Action, Insight, Tone } from "./api";

const TITLE = "Insights & recommended actions";
/** Said with the lists: why the reader can trust each figure. */
export const RULES_CAPTION = "Written from the figures above by fixed rules, so every number is exact.";
/** The same, short, after the tile's title. */
const RULES_SHORT = "written from these figures by fixed rules";

// The face's measures, in px: an item's text line (11.5px type) and its link line (11px), its
// padding and rule, the lists' heads and the footer with the button. The first FACE_TOP of each
// list come first: three of each at two lines fit a 1280 × 800 screen.
const LINE_H = 14, LINK_H = 13, ITEM_PAD = 5, HEAD_H = 18, FOOT_H = 28, FACE_TOP = 3;
/** The fewest lines an item is cut to on the face; READ_LINES hold most sentences whole at
 *  1440px; a taller tile gives up to MAX_LINES. */
const MIN_LINES = 2, READ_LINES = 3, MAX_LINES = 5;
/** The tile is wide enough for the two lists side by side. */
const TWO_UP_W = 560;

/** A text cut to `lines` lines, or whole when `lines` is unset. */
const clampStyle = (lines?: number): React.CSSProperties | undefined => (lines
  ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined);

/** Each tone's icon, colour and word: the word is what a screen reader hears (never colour alone).
 *  The icons say good or bad news, never a direction: an insight's figure can rise and be bad
 *  news (a loss up), and the KPI tiles' ▲/▼ already mean which way a figure moved. */
const TONE: Record<Tone, { Icon: typeof TbInfoCircle; color: string; word: string }> = {
  up: { Icon: TbCircleCheck, color: SAGE, word: "Better" },
  down: { Icon: TbCircleX, color: CORAL_INK, word: "Worse" },
  alert: { Icon: TbAlertTriangle, color: HONEY_INK, word: "Needs attention" },
  info: { Icon: TbInfoCircle, color: SUB, word: "For the record" },
};

/** What the question asks about compliance, or null when there is none to ask about. Against the
 *  budget only where the page compares it with one — the Value basis with every patient and
 *  material (c.judged), and a unit that has a budget (any unit, for all hospitals); else how it
 *  moved. Consumables have no formulary compliance. */
function complianceAsk(c: ExecCtx): string | null {
  if (c.d.scope.segment === "consumables") return null;
  const budget = c.judged && (c.network ? c.d.units.some((u) => u.status != null) : isNum(c.kpi("compliance")?.target));
  if (budget) return c.network ? "which units are furthest below their formulary compliance budget" : "how its formulary compliance compares with its budget";
  const what = `${c.network ? "formulary compliance" : "its formulary compliance"}${c.units ? " on units sold" : ""}`;
  return c.prevLabel ? `how ${what} moved against ${c.prevLabel}` : `where ${what} stands`;
}

/** The question the button sends: what changed, where compliance stands, what to do, for the
 *  hospital and month on screen, in what the page counts (the Quantity basis says units sold). Plain
 *  words; the page context carries the exact selection. */
export function questionFor(c: ExecCtx): string {
  const sc = c.d.scope;
  const narrowed = [sc.type === "IP" || sc.type === "OP" ? `${sc.type} patients only` : null, SEGMENT_LABEL[sc.segment] ?? null].filter(Boolean).join(", ");
  const where = c.network ? "all hospitals" : c.where;
  const when = sc.month === "ALL" ? `over ${c.when.replace(/^All months \((.*)\)$/, "$1")}` : `in ${sc.month_label}`;
  const counted = c.units ? `, by ${QUANTITY_LC} (units sold; money stays in rupees)` : "";
  const change = c.prevLabel ? `what drove the change in sales and margin against ${c.prevLabel}` : "what drives its sales and margin";
  const asks = [change, complianceAsk(c), "and which actions would recover the most margin"].filter(Boolean).join(", ");
  return `Explain the executive overview for ${where} ${when}${narrowed ? ` (${narrowed})` : ""}${counted}: ${asks}?`;
}

/** An insight with its tone and the page that shows it. `lines` cuts its text on the face (the
 *  whole sentence is its tooltip); the drawer prints it whole. */
function InsightItem({ c, i, lines }: { c: ExecCtx; i: Insight; lines?: number }) {
  const t = TONE[i.tone] ?? TONE.info;
  const face = lines != null;
  return (
    <li className={`flex gap-2.5 ${face ? "py-[2px]" : "py-2"}`} style={{ borderBottom: `1px solid ${LINE}` }}>
      <span aria-hidden="true" className={`flex-shrink-0 inline-flex items-center justify-center rounded-full mt-0.5 ${face ? "w-5 h-5" : "w-6 h-6"}`}
        style={{ background: tint(t.color, 0.12), color: t.color }}>
        <t.Icon size={face ? 12 : 14} />
      </span>
      <div className="min-w-0">
        <p className={face ? "text-[11.5px] leading-[14px]" : "text-[12.5px] leading-snug"} style={{ color: INK, ...clampStyle(lines) }} title={face ? i.text : undefined}>
          <span className="sr-only">{t.word}: </span>{i.text}
        </p>
        {i.link && <PageLink c={c} href={i.link} face={face} />}
      </div>
    </li>
  );
}

/** An action, its rupees and the page that shows it; `lines` as for an insight. */
function ActionItem({ c, a, n, lines }: { c: ExecCtx; a: Action; n: number; lines?: number }) {
  const face = lines != null;
  return (
    <li className={`flex gap-2.5 ${face ? "py-[2px]" : "py-2"}`} style={{ borderBottom: `1px solid ${LINE}` }}>
      <span aria-hidden="true" className={`flex-shrink-0 inline-flex items-center justify-center rounded-full mt-0.5 font-bold ${face ? "w-5 h-5 text-[11px]" : "w-6 h-6 text-[11.5px]"}`}
        style={{ background: INK, color: "#fff" }}>{n}</span>
      <div className="min-w-0 flex-1">
        <p className={face ? "text-[11.5px] leading-[14px]" : "text-[12.5px] leading-snug"} style={{ color: INK, ...clampStyle(lines) }} title={face ? a.text : undefined}>{a.text}</p>
        <div className={`flex items-center flex-wrap ${face ? "gap-x-2.5 h-[13px] leading-[13px] overflow-hidden" : "gap-3"}`}>
          {a.impact != null && (
            <span className={`text-[11px] font-semibold tabular-nums ${face ? "" : "mt-1"}`} style={{ color: CORAL_INK }} title={`${rupeesExact(a.impact)}: what this switch or price would have kept`}>
              worth {lakhs(a.impact)}
            </span>
          )}
          {a.link && <PageLink c={c} href={a.link} face={face} />}
        </div>
      </div>
    </li>
  );
}

/** The way to the page that shows an insight in full, carrying this page's month and filters. */
function PageLink({ c, href, face = false }: { c: ExecCtx; href: string; face?: boolean }) {
  return (
    <Link href={c.link(href)} aria-label={`Open ${pageName(href)}`}
      className={`items-center gap-1 font-semibold rounded hover:underline focus-visible:outline focus-visible:outline-2 ${face ? "flex w-fit h-[13px] text-[11px] leading-[13px]" : "inline-flex mt-1 text-[11.5px]"}`}
      style={{ color: INK }}>
      {pageName(href)}<TbArrowRight size={12} aria-hidden="true" />
    </Link>
  );
}

function ListHead({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[11px] font-semibold uppercase mb-0.5 leading-[16px]" style={{ color: SUB, letterSpacing: ".08em" }}>{children}</h4>;
}

/** Every insight and action, whole, for the drawer: the two lists side by side when there is
 *  room (a container query), one under the other on a narrow screen. */
function Lists({ c }: { c: ExecCtx }) {
  const { insights, actions } = c.d;
  return (
    <div className="grid grid-cols-1 @[720px]:grid-cols-2 gap-x-6 gap-y-3">
      <section aria-label="Insights">
        <ListHead>Insights</ListHead>
        {insights.length ? <ul>{insights.map((i) => <InsightItem key={i.id} c={c} i={i} />)}</ul>
          : <p className="text-[12px] py-2" style={{ color: SUB }}>Nothing stands out in this selection.</p>}
      </section>
      <section aria-label="Recommended actions">
        <ListHead>Recommended actions</ListHead>
        {actions.length ? <ol>{actions.map((a, n) => <ActionItem key={a.id} c={c} a={a} n={n + 1} />)}</ol>
          : <p className="text-[12px] py-2" style={{ color: SUB }}>No action has rupees behind it in this selection.</p>}
      </section>
    </div>
  );
}

function AskButton({ c, compact = false }: { c: ExecCtx; compact?: boolean }) {
  const { send, setOpen, busy } = useAiChat();
  const ask = () => { setOpen(true); void send(questionFor(c)); };
  return (
    <button type="button" onClick={ask} disabled={busy}
      title={busy ? "The AI Analyst is answering another question" : questionFor(c)}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${compact ? "h-6 px-3 text-[11.5px]" : "px-3.5 py-1.5 text-[12px]"}`}
      style={{ background: INK, color: "#fff" }}>
      <TbSparkles size={compact ? 13 : 14} aria-hidden="true" />Ask the AI Analyst about this
    </button>
  );
}

/** The tile's face: the first insights and actions side by side — the top three of each at two
 *  lines or more, a fourth and later ones only where a tall screen has room for them at three
 *  lines, then more lines — and the way to the rest and the AI Analyst. Reads the panel body's
 *  size, so it is drawn inside the ChartPanel. */
function FaceLists({ c, onAll }: { c: ExecCtx; onAll: () => void }) {
  const size = usePanel()?.size ?? { w: 720, h: 240 };
  const { insights, actions } = c.d;
  const two = size.w >= TWO_UP_W;
  const itemH = (lines: number) => ITEM_PAD + lines * LINE_H + LINK_H;
  // The room one list has: the body less the footer and its head (both heads, one list under the
  // other, when the tile is too narrow for two abreast).
  const room = two ? size.h - FOOT_H - HEAD_H : (size.h - FOOT_H) / 2 - HEAD_H;
  const fits = (n: number, l: number) => n * itemH(l) <= room;
  let count = clamp(Math.floor(room / itemH(MIN_LINES)), 1, FACE_TOP);
  let lines = MIN_LINES;
  while (lines < READ_LINES && fits(count, lines + 1)) lines++;
  const most = Math.max(insights.length, actions.length);
  while (count < most && fits(count + 1, lines)) count++;
  while (lines < MAX_LINES && fits(count, lines + 1)) lines++;
  const shownI = insights.slice(0, count), shownA = actions.slice(0, count);
  const hidden = insights.length - shownI.length + actions.length - shownA.length;
  const all = `See all ${insights.length} ${insights.length === 1 ? "insight" : "insights"} and ${actions.length} ${actions.length === 1 ? "action" : "actions"}`;
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={`grid gap-x-6 flex-1 min-h-0 overflow-hidden ${two ? "grid-cols-2" : "grid-cols-1"}`}>
        <section aria-label="Insights" className="min-h-0">
          <ListHead>Insights</ListHead>
          {shownI.length ? <ul>{shownI.map((i) => <InsightItem key={i.id} c={c} i={i} lines={lines} />)}</ul>
            : <p className="text-[12px] py-1" style={{ color: SUB }}>Nothing stands out in this selection.</p>}
        </section>
        <section aria-label="Recommended actions" className="min-h-0">
          <ListHead>Recommended actions</ListHead>
          {shownA.length ? <ol>{shownA.map((a, n) => <ActionItem key={a.id} c={c} a={a} n={n + 1} lines={lines} />)}</ol>
            : <p className="text-[12px] py-1" style={{ color: SUB }}>No action has rupees behind it in this selection.</p>}
        </section>
      </div>
      <div className="flex items-center gap-3 pt-1 flex-shrink-0" style={{ borderTop: `1px solid ${LINE}`, height: FOOT_H }}>
        {hidden > 0 ? (
          <button type="button" onClick={onAll} aria-haspopup="dialog"
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold rounded hover:underline focus-visible:outline focus-visible:outline-2 min-w-0 truncate"
            style={{ color: INK }}>
            {all}<TbArrowRight size={12} aria-hidden="true" />
          </button>
        ) : <span className="text-[11px] min-w-0 truncate" style={{ color: SUB }}>{RULES_CAPTION}</span>}
        <span className="ml-auto" />
        <AskButton c={c} compact />
      </div>
    </div>
  );
}

export function InsightsTile({ c, place }: { c: ExecCtx; place: Place }) {
  const dr = useDrawer();
  const label = `${TITLE}, ${c.context}: ${c.d.insights.length} insights, ${c.d.actions.length} actions, ${RULES_SHORT}`;
  return (
    <>
      <ChartPanel id="insights" title={TITLE} context={`${c.context} · ${RULES_SHORT}`} accent={ACCENT} place={place}
        label={label} interactive onOpen={() => dr.show("all")} onInfo={() => dr.show("method")}>
        <FaceLists c={c} onAll={() => dr.show("all")} />
      </ChartPanel>
      <InsightsDrawer c={c} dr={dr} />
    </>
  );
}

function InsightsDrawer({ c, dr }: { c: ExecCtx; dr: DrawerCtl }) {
  return (
    <DetailDrawer open={dr.open} onClose={dr.close} initialTab={dr.tab} size="wide"
      eyebrow="Executive overview" title={`${TITLE} · ${c.where}`}
      source="computed" asOf={c.asOf} filters={filterChips(c, { counted: "mixed" })}
      tabs={[
        {
          key: "all", label: "Detail", render: () => (
            <>
              <DrawerSection title="For this selection" note={RULES_CAPTION}>
                <div className="@container"><Lists c={c} /></div>
              </DrawerSection>
              <DrawerSection title="Ask the AI Analyst" note={`Sends: “${questionFor(c)}” with this page's hospital, month and filters.`}>
                <AskButton c={c} />
              </DrawerSection>
            </>
          ),
        },
        {
          key: "method", label: "Method", render: () => (
            <>
              <MethodText>
                <p>Insights and actions are written by the server from the same figures as the panels, by fixed rules rather than a language model, so every number in them is exact and they read the same whether or not the AI is available. A rule whose figures are missing for the selection leaves itself out.</p>
                <p>Each insight says whether it is good or bad news for the business, not which way its figure moved: better (compliance up, a loss down), worse, needs attention (short of a budget, or money missed), or for the record. They are listed most pressing first, at most six. Actions are listed by the rupees a switch or a better price would have kept, biggest first (a follow-up or a check, with no rupees of its own, comes after), at most four.</p>
                <p>Every insight and action links to the page that shows it in full, for the hospital in the header. That page has its own month and filters, which its figures follow: check they match this page&apos;s before comparing a figure. &quot;Ask the AI Analyst about this&quot; sends a prepared question to the AI chat with this page&apos;s hospital, month, filters and Value ↔ {QUANTITY} switch; its answer is the analyst&apos;s own, worked from the same tables.</p>
              </MethodText>
              <HowBuilt c={c} />
            </>
          ),
        },
      ]} />
  );
}
