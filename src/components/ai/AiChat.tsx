"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TbShieldCheck, TbDatabase, TbChevronDown, TbFileSpreadsheet, TbFileTypePdf, TbDownload, TbArrowDown, TbPlus, TbCopy, TbCheck, TbRefresh, TbPlayerStopFilled, TbAlertTriangle, TbMenu2, TbAt, TbTelescope, TbListNumbers, TbClockExclamation, TbBuildingStore, TbCoin, TbBuildingHospital, TbChartLine, TbArrowUp } from "react-icons/tb";
import { useAiChat, AiMsg } from "@/context/AiChatContext";
import { getUser } from "@/utils/auth";
import { groupTurns, exportExcel, exportPdf, Turn } from "@/lib/aiExport";
import MentionTextarea from "./MentionTextarea";

const PlotlyChart = dynamic(() => import("./PlotlyChart"), { ssr: false });

import { T, EASE } from "./theme";
import GlobalStyle from "./GlobalStyle";

/** Six starters, each an actual executive question with the section it comes from and a
 *  glyph for the shape of the answer. Six, laid out 3x2, because that is the size at which
 *  a starter grid reads as "here is what this can do" rather than as four leftovers. */
const SUGGESTIONS = [
  { q: "What should we order first, and why?",              h: "Reorder priority",  s: "Ranked by risk and lead time.", icon: TbListNumbers },
  { q: "How much stock is expiring in 90 days?",            h: "Expiry risk",       s: "Value, quantity and items.",    icon: TbClockExclamation },
  { q: "Which vendors do we spend the most with?",          h: "Procurement",       s: "Spend concentration by vendor.", icon: TbBuildingStore },
  { q: "How much cash do we need to restock next month?",   h: "Budget",            s: "Cash needed to hold cover.",    icon: TbCoin },
  { q: "Which hospitals hold the most idle stock?",         h: "Inventory health",  s: "Slow movers by site.",          icon: TbBuildingHospital },
  { q: "What is our net inventory days right now?",         h: "Working capital",   s: "The same figure as the card.",  icon: TbChartLine },
];

/** "2:47 PM" for today, "30 Aug, 2:47 PM" once it isn't — a bare time on a three-day-old
 *  conversation tells you nothing, and a full date on every turn of today's is noise. */
function stamp(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const t = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  const sameDay = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  return sameDay ? t : `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${t}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Column labels arrive from whatever the SQL aliased, so a real answer shipped a table
 *  headed "vendor_name" and a chart titled "Spend by vendor name". The backend does label
 *  most columns properly; this is the fallback for the ones it cannot, applied at the last
 *  possible moment so nothing upstream has to be trusted to have done it. */
// values are in sentence case (a header reads "Median days on hand", not "Median Days On
// Hand"); the acronyms carry their own casing and keep it wherever they land
const LABEL_FIXUPS: Record<string, string> = {
  qty: "qty", doh: "days on hand", pct: "%", avg: "avg", num: "count",
  sku: "SKU", skus: "SKUs", grn: "GRN", po: "PO", id: "ID", ytd: "YTD", mtd: "MTD", asp: "ASP",
};
/** Label a whole column set, keeping every label distinct.
 *
 *  `humanLabel` drops a trailing "desc" because a column of vendors is "Vendor", not
 *  "Vendor name". When BOTH `material` and `material_desc` are selected — which is the
 *  normal shape of a ranking result — they both collapse to "Material" and the table
 *  ships two identically-headed columns. Where that happens, the bare-code column is
 *  named for what it actually is. */
function humanLabels(keys: string[]): string[] {
  const base = keys.map(humanLabel);
  const seen = new Map<string, number[]>();
  base.forEach((l, i) => seen.set(l, [...(seen.get(l) || []), i]));
  for (const [, idxs] of seen) {
    if (idxs.length < 2) continue;
    for (const i of idxs) {
      const k = keys[i].toLowerCase();
      if (!/(desc|description|name)$/.test(k)) base[i] = "Code";
    }
  }
  return base;
}

function humanLabel(raw: string): string {
  const words = String(raw).trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").split(" ");
  // a trailing "name"/"code"/"desc" is a database habit, not information: a column of
  // vendors is "Vendor", not "Vendor name"
  if (words.length > 1 && /^(name|desc|description)$/i.test(words[words.length - 1])) words.pop();
  return words
    .map((w, i) => {
      const fix = LABEL_FIXUPS[w.toLowerCase()];
      const t = fix ?? (w === w.toUpperCase() && w.length <= 4 ? w : w.toLowerCase());  // keep acronyms
      return i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    })
    .join(" ");
}

function fmt(v: any, kind: string): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (kind === "inr") { const a = Math.abs(n); if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`; return `₹${Math.round(n)}`; }
  if (kind === "pct") return `${n.toFixed(1)}%`;
  if (kind === "days") return `${Math.round(n)} d`;
  // Counts/quantities are conceptually whole — a demand of 84,166.667 or a total of
  // 1,08,73,100.944 reaching the table as raw floats reads as broken. Round to whole
  // for magnitudes ≥1000 (or already-integer); keep 2 decimals only for genuine small
  // fractionals (a ratio like 2.34) where the decimals actually carry meaning.
  if (kind === "num") {
    if (Math.abs(n) >= 1000 || Number.isInteger(n)) return Math.round(n).toLocaleString("en-IN");
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
}


/** Group the flat message stream into TURNS. The transcript arrives as separate messages
 *  (question, answer text, chart, table) and used to render as separate stacked blocks,
 *  which is why a two-line answer left a table floating on its own above 600px of dead
 *  space. A turn is one unit of work and should read as one. */
type TurnBlock = {
  qid: string; question: string;
  /** When the question was asked, ms epoch. */
  at?: number;
  /** ALL the turn's text messages, in order. A turn routinely produces more than one —
   *  the streamed prose and then a separate `present()` payload — and the second is
   *  sometimes empty. Keeping only the last one (`cur.text = m`) therefore blanked whole
   *  answers whose text had arrived perfectly well in the first. */
  texts: AiMsg[];
  figures: AiMsg[]; tables: AiMsg[];
};
function groupIntoTurns(msgs: AiMsg[]): TurnBlock[] {
  const out: TurnBlock[] = [];
  let cur: TurnBlock | null = null;
  for (const m of msgs) {
    if (m.role === "user") {
      cur = { qid: m.id, question: m.text || "", at: m.at, texts: [], figures: [], tables: [] };
      out.push(cur);
    } else {
      if (!cur) { cur = { qid: `orphan-${m.id}`, question: "", at: m.at, texts: [], figures: [], tables: [] }; out.push(cur); }
      if (m.kind === "text") cur.texts.push(m);
      else if (m.kind === "plotly") cur.figures.push(m);
      else if (m.kind === "table") cur.tables.push(m);
    }
  }
  return out;
}

/** Pull headline figures out of a ONE-ROW result table.
 *
 *  A single-row table is not really a table — it is the answer's key figures wearing a
 *  grid. "How much is expiring in 90 days" returns exactly one row of value/qty/items,
 *  and rendering that as a header and one lonely line of cells buries the three numbers
 *  the reader actually came for. Multi-row results are genuinely tabular and are left
 *  alone; the chart leads those. */
function headlineStats(t?: AiMsg["table"]): { label: string; value: string }[] | null {
  if (!t || !t.rows || t.rows.length !== 1) return null;
  const cols = (t.columns || []).filter((c: any) => c.kind && c.kind !== "text");
  if (cols.length < 2 || cols.length > 4) return null;
  return cols.map((c: any) => ({
    label: humanLabel(c.label || c.key),
    value: fmt(t.rows[0][c.key], c.kind),
  }));
}

/** Pick the column a reader is actually comparing across rows.
 *
 *  A result table here is nearly always a ranking — vendors by spend, SKUs by days on hand —
 *  and a column of right-aligned numbers makes you do the comparison arithmetic yourself:
 *  is ₹12.88 Cr close to ₹13.41 Cr? A bar behind the figure answers that at a glance, the
 *  way a spreadsheet's data bars do. Money wins over counts when both are present, because
 *  money is what the question was about. */
function measureColumn(cols: any[], rows: any[]): { key: string; max: number } | null {
  if (rows.length < 3) return null;                 // two rows compare fine unaided
  const candidates = cols.filter((c: any) => c.kind === "inr" || c.kind === "num");
  const col = candidates.find((c: any) => c.kind === "inr") || candidates[0];
  if (!col) return null;
  let max = 0;
  for (const r of rows) {
    const n = Number(r[col.key]);
    if (!Number.isFinite(n)) return null;
    if (n < 0) return null;                          // a signed column is a change, not a magnitude
    if (n > max) max = n;
  }
  return max > 0 ? { key: col.key, max } : null;
}

function TableView({ table }: { table: NonNullable<AiMsg["table"]> }) {
  const cols = table.columns || [];
  // No .slice(0, 12). The backend sends up to 50 rows AND a caption that says so
  // ("Showing top 50 of N rows") — truncating to 12 here made the table contradict its
  // own footnote, and quietly hid 38 rows of evidence the answer was resting on. Scroll
  // instead of truncate; the caption is now true.
  const rows = table.rows || [];
  const measure = measureColumn(cols, rows);
  const labels = humanLabels(cols.map((c: any) => c.label || c.key));

  return (
    <div className="overflow-hidden" style={{ border: `1px solid ${T.line}`, borderRadius: T.r2, background: T.surface }}>
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 440 }}>
        <table className="w-full text-[12.5px]" style={{ borderCollapse: "collapse" }}>
          <thead className="sticky top-0 z-10"><tr style={{ background: T.sunk, color: T.mut }}>
            {cols.map((c: any, ci: number) => (
              <th key={c.key}
                  className={`font-medium px-3.5 py-2.5 whitespace-nowrap ${c.kind && c.kind !== "text" ? "text-right" : "text-left"}`}
                  style={{ borderBottom: `1px solid ${T.line}` }}>{labels[ci]}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} className="ai-tr" style={{ borderTop: i ? `1px solid ${T.hair}` : undefined }}>
                {cols.map((c: any) => {
                  const isMeasure = measure?.key === c.key;
                  const pct = isMeasure ? Math.max(2, (Number(r[c.key]) / measure!.max) * 100) : 0;
                  return (
                    <td key={c.key}
                        className={`relative px-3.5 py-2.5 whitespace-nowrap ${c.kind !== "text" ? "text-right tabular-nums" : ""}`}
                        style={{ color: c.kind === "text" ? T.ink : T.ink2, fontWeight: c.kind === "inr" ? 600 : 400 }}>
                      {isMeasure ? (
                        <span aria-hidden className="absolute left-0 top-[3px] bottom-[3px] pointer-events-none"
                              style={{ width: `${pct}%`, background: T.darkSoft, borderRadius: "0 3px 3px 0" }} />
                      ) : null}
                      <span className="relative">{fmt(r[c.key], c.kind)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note ? <div className="px-3.5 py-2 text-[11px]" style={{ color: T.mut, background: T.sunk, borderTop: `1px solid ${T.line}` }}>{table.note}</div> : null}
    </div>
  );
}

function ChartCard({ figure }: { figure: { data: any[]; layout?: any } }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rawTitle = figure?.layout?.title?.text || "Chart";
  // "Spend by vendor name" is the SQL alias talking, not the product
  const title = humanLabel(String(rawTitle).replace(/_/g, " "));
  const downloadPng = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Plotly = require("plotly.js-dist-min");
      const gd = wrapRef.current?.querySelector(".js-plotly-plot");
      if (gd) Plotly.downloadImage(gd, { format: "png", height: 720, width: 1280, scale: 2, filename: `hcg-${String(title).replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40)}` });
    } catch { /* noop */ }
  };
  return (
    // The chart's own title carries the heading now, rather than a generic "CHART" eyebrow
    // over an untitled plot — the eyebrow said nothing the reader could not already see.
    <div ref={wrapRef} className="w-full overflow-hidden group" style={{ border: `1px solid ${T.line}`, borderRadius: T.r2, background: T.surface }}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-1">
        <span className="text-[13px] font-semibold leading-snug" style={{ color: T.ink }}>{title}</span>
        <button onClick={downloadPng} title="Download as PNG"
          className="ai-ghost inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0"
          style={{ borderRadius: T.r, color: T.mut }}>
          <TbDownload size={12} /> PNG
        </button>
      </div>
      <div className="px-2 pb-2"><PlotlyChart figure={figure} title={title} /></div>
    </div>
  );
}

function ExportMenu({ label, onExcel, onPdf, pill, up }: { label: string; onExcel: () => void; onPdf: () => void; pill?: boolean; up?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [open]);
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen(!open)}
        className={pill
          ? "ai-tool inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] font-medium"
          : "ai-ghost inline-flex items-center gap-1 font-medium text-[11px] px-2 py-1"}
        style={pill ? { border: `1px solid ${T.line}`, borderRadius: 999, color: T.ink2 } : { borderRadius: T.r, color: T.mut }}>
        <TbDownload size={pill ? 13 : 12} /> {label} <TbChevronDown size={10} />
      </button>
      {open && (
        <div className={`ai-pop absolute z-20 overflow-hidden p-1 ${up ? "left-0 bottom-full mb-1.5" : "right-0 bottom-full mb-1.5"}`} style={{ background: T.surface, boxShadow: T.pop, border: `1px solid ${T.line}`, borderRadius: T.r2, minWidth: 156 }}>
          <button onClick={() => { setOpen(false); onExcel(); }} className="ai-item w-full flex items-center gap-2.5 px-2.5 py-2 text-[12.5px]" style={{ color: T.ink2, borderRadius: T.r }}><TbFileSpreadsheet size={15} style={{ color: T.good }} /> Excel (.xlsx)</button>
          <button onClick={() => { setOpen(false); onPdf(); }} className="ai-item w-full flex items-center gap-2.5 px-2.5 py-2 text-[12.5px]" style={{ color: T.ink2, borderRadius: T.r }}><TbFileTypePdf size={15} style={{ color: T.bad }} /> PDF (.pdf)</button>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      // Clipboard API needs a secure context; fall back to the old execCommand path
      // rather than silently doing nothing on an http:// dev box.
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* give up quietly */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} title="Copy response"
      className="ai-ghost inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1"
      style={{ borderRadius: T.r, color: copied ? T.good : T.mut }}>
      {copied ? <><TbCheck size={12} /> Copied</> : <><TbCopy size={12} /> Copy</>}
    </button>
  );
}

function buildTurnAt(messages: AiMsg[], id: string): Turn {
  const i = messages.findIndex((x) => x.id === id);
  const turn: Turn = { question: "", answer: "", figures: [], tables: [] };
  for (let j = i - 1; j >= 0; j--) { if (messages[j].role === "user") { turn.question = messages[j].text || ""; break; } }
  for (let j = i; j < messages.length; j++) {
    const m = messages[j];
    if (j > i && m.role === "user") break;
    if (m.role === "bot") {
      if (m.kind === "text") turn.answer += (turn.answer ? "\n\n" : "") + (m.text || "");
      else if (m.kind === "plotly" && m.figure) turn.figures.push(m.figure);
      else if (m.kind === "table" && m.table) turn.tables.push(m.table);
    }
  }
  return turn;
}

/** The answer itself. Prose and nothing else — the chips and the trust badge that used to
 *  live in here rendered ABOVE the chart and table the answer was resting on, so the
 *  reader met "would you like a breakdown?" before they had seen the evidence. They are a
 *  turn's FOOTER and now render as one, after it. */
/** The backend bakes an unverified-figures caveat into the answer TEXT (rather than
 *  relying on a badge alone) so that copying or exporting the answer carries the warning
 *  with it. On screen that same string rendered as a yellow emoji and a line of italics
 *  sitting on top of the answer — while the footer showed a "Couldn't confirm" chip saying
 *  the identical thing. Split it out here: the words stay in `m.text` for copy and export,
 *  and the reader gets one notice, styled like a notice. */
const CAVEAT_RE = /^\s*⚠️\s*_?(.+?)_?\s*(?:\n\n|$)/;
function splitCaveat(text: string): { caveat: string | null; body: string } {
  const t = text || "";
  if (!t.trimStart().startsWith("⚠️")) return { caveat: null, body: t };
  const m = t.match(CAVEAT_RE);
  if (!m) return { caveat: null, body: t };
  return { caveat: m[1].replace(/_/g, "").trim(), body: t.slice(m[0].length) };
}

function BotProse({ m }: { m: AiMsg }) {
  const { caveat, body } = splitCaveat(m.text || "");
  return (
    <div className="w-full">
      {caveat ? (
        <div className="flex items-start gap-2.5 mb-4 px-3.5 py-3 text-[12.5px] leading-relaxed"
             style={{ background: T.warnBg, border: `1px solid ${T.line}`, borderRadius: T.r2, color: T.warn }}>
          <TbAlertTriangle size={15} className="flex-shrink-0 mt-[1px]" />
          <span>{caveat}</span>
        </div>
      ) : null}
      <div className="ai-prose" style={{ color: T.ink2 }}>
        <div className={m.streaming ? "ai-caret" : undefined}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

/** Follow-ups, then one row of provenance and tools. */
function TurnFooter({ m, onOption, onExport, onRegenerate }: {
  m: AiMsg; onOption?: (o: string) => void; onExport?: (kind: "excel" | "pdf") => void;
  onRegenerate?: () => void;
}) {
  const [showSql, setShowSql] = useState(false);
  if (m.streaming) return null;   // chips and badges wait until the stream finishes
  const hasChips = !!(m.options && m.options.length && onOption);
  const nq = m.queries?.length || 0;
  return (
    <>
      {hasChips ? (
        <div className="flex flex-wrap gap-2 mt-5">
          {m.options!.map((o) => (
            <button key={o} onClick={() => onOption!(o)} className="ai-chip text-[12.5px] px-3 py-1.5 text-left"
              style={{ border: `1px solid ${T.line}`, borderRadius: T.r, color: T.ink2, background: T.surface }}>{o}</button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {/* All four verification states, in words an executive can act on. Previously only
            ok and corrected rendered, which meant "canonical" — the STRONGEST guarantee we
            have, the same calculation the dashboard card uses — showed no badge at all,
            while "flagged" also showed nothing and so was indistinguishable from a clean
            answer. Both silences were misleading, in opposite directions. */}
        {m.verified === "canonical" ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-[3px]"
                title="This figure comes from the same calculation the dashboard card uses — not re-derived by the assistant."
                style={{ background: T.goodBg, color: T.good, borderRadius: T.r }}><TbShieldCheck size={12} /> Same as your dashboard</span>
        ) : m.verified === "ok" || m.verified === "corrected" ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-[3px]"
                title="Every figure in this answer was checked back against the query results it came from."
                style={{ background: T.goodBg, color: T.good, borderRadius: T.r }}><TbShieldCheck size={12} /> Figures checked{m.verified === "corrected" ? " · auto-corrected" : ""}</span>
        ) : null}
        {/* No "Couldn't confirm" chip here: when the answer is flagged the caveat is
            already spelled out in a notice at the top of it, and the chip repeated the same
            sentence in miniature two inches below. */}

        {nq ? (
          <button onClick={() => setShowSql((v) => !v)} className="ai-ghost inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1" style={{ borderRadius: T.r, color: T.dark }}>
            <TbDatabase size={12} /> {nq} quer{nq > 1 ? "ies" : "y"} run
            <TbChevronDown size={11} style={{ transform: showSql ? "rotate(180deg)" : "none", transition: `transform .18s ${EASE}` }} />
          </button>
        ) : null}

        {/* Tools, not claims — they fade in on hover so they stop competing with the answer.
            The trust badge above deliberately does NOT hide: it is a statement about how far
            the figures were checked, and concealing that until someone happens to mouse over
            would be the dishonest kind of tidy. */}
        <span className="inline-flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          {onExport ? <ExportMenu label="Export" onExcel={() => onExport("excel")} onPdf={() => onExport("pdf")} /> : null}
          {m.text ? <CopyButton text={m.text} /> : null}
          {onRegenerate ? (
            <button onClick={onRegenerate} title="Regenerate response"
              className="ai-ghost inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1"
              style={{ borderRadius: T.r, color: T.mut }}>
              <TbRefresh size={12} /> Regenerate
            </button>
          ) : null}
        </span>
      </div>

      {showSql && m.queries ? <QueriesPanel queries={m.queries} /> : null}
    </>
  );
}

/** ONE TURN.
 *
 *  The old layout was a chat transcript: a grey question bubble on the right, an answer
 *  on the left, then a chart and a table drifting below as unrelated blocks, then chips,
 *  then a badge, then a query pill — five stacked rows of chrome under a two-line answer.
 *
 *  The obvious fix is to box each turn in a floating card, and that is the wrong fix: a
 *  card per turn puts a border and a shadow around the one thing on the page that has to
 *  read like writing, and a column of them scrolls like a feed rather than a document.
 *
 *  So a turn is a SECTION of a document — question as its heading, figures, prose,
 *  evidence — separated from the next by a rule and by space, the way any long-form
 *  reading surface separates sections. Executives read the number first and the paragraph
 *  second, so when the result is a single row of figures it is lifted into a band above
 *  the prose instead of being buried in a one-line table. */
function Brief({ turn, onOption, onExport, onRegenerate }: {
  turn: TurnBlock;
  onOption?: (o: string) => void;
  onExport?: (kind: "excel" | "pdf") => void;
  onRegenerate?: () => void;
  isLast?: boolean;
}) {
  // Everything the assistant actually wrote, and separately the message that carries the
  // turn's metadata (verification, follow-ups, the queries it ran) — which is the last one
  // whether or not it happens to hold any prose.
  const spoken = turn.texts.filter((t) => (t.text || "").trim() || t.streaming);
  const meta = turn.texts[turn.texts.length - 1];
  const m = spoken[spoken.length - 1] || meta;
  const stats = headlineStats(turn.tables[0]?.table);
  const streaming = turn.texts.some((t) => t.streaming);
  const showEvidence = turn.figures.length > 0 || (turn.tables.length > 0 && !stats);

  return (
    <article className="ai-turn group">
      {turn.question ? (
        <header className="mb-4">
          {/* A short rule opens each question the way a rule opens a section in print.
              Scanning a long thread, this is what your eye counts — bold text alone did not
              separate a question from a bolded phrase inside an answer. The time sits on
              the same line so a long conversation can be navigated by when things were
              asked, without giving the stamp a row of its own. */}
          <div className="flex items-center gap-3 mb-3">
            <span className="block h-[3px] w-7 rounded-full flex-shrink-0" style={{ background: T.dark }} />
            {turn.at ? <time className="text-[11px] tabular-nums" dateTime={new Date(turn.at).toISOString()} style={{ color: T.faint }}>{stamp(turn.at)}</time> : null}
          </div>
          <h2 className="text-[19px] font-semibold leading-[1.38] tracking-[-0.018em]" style={{ color: T.ink }}>
            {turn.question}
          </h2>
        </header>
      ) : null}

      {/* Key figures as a ruled band, not as tiles. Three numbers in three bordered boxes
          is decoration; three numbers on one baseline separated by hairlines is how a
          results header actually reads. */}
      {stats && !streaming ? (
        <div className="flex flex-wrap items-stretch mb-5 py-4 px-4"
             style={{ background: T.sunk, border: `1px solid ${T.line}`, borderRadius: T.r2 }}>
          {stats.map((st, i) => (
            <div key={st.label} className="pr-7 mr-7" style={{ borderRight: i < stats.length - 1 ? `1px solid ${T.line}` : undefined }}>
              <div className="text-[26px] font-semibold tabular-nums tracking-[-0.028em] leading-none" style={{ color: T.ink }}>{st.value}</div>
              <div className="text-[11.5px] mt-2.5 capitalize" style={{ color: T.mut }}>{st.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {spoken.map((t) => <BotProse key={t.id} m={t} />)}

      {showEvidence ? (
        <div className="mt-5 space-y-3">
          {turn.figures.map((f) => f.figure ? <ChartCard key={f.id} figure={f.figure} /> : null)}
          {turn.tables.map((t) => t.table && !stats ? <TableView key={t.id} table={t.table} /> : null)}
        </div>
      ) : null}

      {meta ? (
        <TurnFooter
          m={{ ...meta,
               // the copy button copies what was WRITTEN, which may live on an earlier message
               text: spoken.map((t) => t.text || "").filter(Boolean).join("\n\n") || meta.text,
               options: meta.options?.length ? meta.options : m?.options,
               verified: meta.verified ?? m?.verified,
               queries: meta.queries?.length ? meta.queries : m?.queries,
               streaming }}
          onOption={onOption} onExport={onExport} onRegenerate={onRegenerate} />
      ) : null}
    </article>
  );
}

function QueriesPanel({ queries }: { queries: NonNullable<AiMsg["queries"]> }) {
  return (
    <div className="mt-2.5 space-y-2 ai-pop">
      {queries.map((q, i) => (
        <div key={i} className="overflow-hidden" style={{ border: `1px solid ${T.line}`, borderRadius: T.r2 }}>
          <div className="px-3 py-2 text-[11px] font-medium flex items-center justify-between" style={{ background: T.sunk, color: T.mut, borderBottom: `1px solid ${T.line}` }}>
            <span className="truncate pr-2">{q.purpose}</span>
            <span style={{ color: q.error ? T.bad : T.faint }}>{q.error ? "error" : `${q.rows} rows`}</span>
          </div>
          <pre className="px-3 py-2.5 text-[11px] leading-[1.6] overflow-x-auto whitespace-pre-wrap break-words" style={{ background: T.surface, color: T.ink2, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", margin: 0 }}>{q.error ? q.error : q.sql}</pre>
        </div>
      ))}
    </div>
  );
}

export default function AiChat({ variant = "floater", onOpenSessions }: { variant?: "floater" | "page"; onOpenSessions?: () => void }) {
  /** The floater is a ~420px popup — the document measure would overflow it, so the
   *  column simply takes the width it is given there. */
  const COL = variant === "page" ? T.col : "100%";
  const { messages, busy, step, send, stop, deep, setDeep, regenerate, newChat, activeSession, loadingActive, currentUserId } = useAiChat();
  const stillLoadingHistory = loadingActive && !!activeSession && !activeSession.loaded;
  const [input, setInput] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  // The header is a hairline while the document is at rest and gains a shadow once
  // content runs under it — without that the sticky bar and the first question read as
  // one block and you cannot tell there is more above.
  const [scrolled, setScrolled] = useState(false);
  // read once — this comes from localStorage and does not change inside a session
  const firstName = useMemo(() => getUser()?.firstName?.trim() || "", []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turns = groupIntoTurns(messages);
  /** Once the answer has started writing itself it IS the progress indicator, and the
   *  thinking line must not come back. It used to key off `m.streaming`, which flips to
   *  false the instant the text finalises — while `busy` stays true for another second or
   *  two as the chart and table are built. So the shimmer reappeared UNDER the completed
   *  answer and sat there: measured at 1500ms text done, 1800ms shimmer back, 1950ms gone.
   *  That flicker is most of what read as "messed up". */
  const lastTurn = turns[turns.length - 1];
  const answerStarted = !!lastTurn?.texts.some((t) => (t.text || "").trim());
  const atBottomRef = useRef(true);

  /** Only a deliberate move UP detaches the view from the bottom.
   *
   *  The obvious rule — "following = we are near the bottom" — is wrong here, because it
   *  is evaluated during a scroll event that our OWN follower just caused, against a
   *  layout that is still growing. A chart mounting adds ~500px between the scroll and
   *  the handler, so `near` reads false, following switches itself off, and the answer
   *  stops being followed halfway down. Measured: the view stopped 467px short every time.
   *
   *  Arriving at the bottom always re-arms; growth underneath never detaches. */
  const lastTopRef = useRef(0);
  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const top = el.scrollTop;
    const near = el.scrollHeight - top - el.clientHeight < 120;
    const movedUp = top < lastTopRef.current - 2;
    lastTopRef.current = top;
    if (near) atBottomRef.current = true;
    else if (movedUp) atBottomRef.current = false;
    setAtBottom(atBottomRef.current);
    setScrolled(top > 6);
  };
  const scrollToBottom = (smooth = true) => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });

  /** Stay pinned to the bottom while an answer is being written.
   *
   *  The old version scrolled from an effect on `[messages, step, busy]`, which is the
   *  wrong trigger: the message arrives, the effect runs, and only THEN does the content
   *  actually get taller — markdown lays out, the table mounts, and Plotly sets the
   *  chart's height asynchronously well after React is done. So it scrolled to where the
   *  bottom used to be and stopped, leaving 700px of answer below the fold with the view
   *  still at scrollTop 0. It also used `behavior: "smooth"` on every token, so each
   *  animation was cancelled by the next one and the view never arrived anywhere.
   *
   *  Watching the content box instead catches every one of those growth events, whenever
   *  they happen and whatever caused them. Jumps are instant here on purpose: smooth is
   *  for a deliberate jump you asked for (the button below), not for keeping up with text
   *  that is still arriving. */
  const roRef = useRef<ResizeObserver | null>(null);
  /** Following is for TEXT ONLY, and only while it is still being written.
   *
   *  The evidence a turn rests on — a 414px chart, a 10-row table — mounts all at once
   *  after the prose has finished. Pinning to the bottom through that drags the view down
   *  by ~900px in a single frame, which threw the question (and the answer you were
   *  reading) off the top of the screen the moment the chart appeared. Measured: the
   *  question sat at y=69 while the answer streamed, then jumped to y=-871.
   *
   *  So the observer keeps up with arriving tokens and then lets go. Charts and tables
   *  land quietly below the fold and you scroll to them when you are ready. */
  const streamingRef = useRef(false);
  streamingRef.current = messages.some((m) => m.streaming);
  const followRef = useCallback((node: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const el = scrollRef.current;
      if (el && atBottomRef.current && streamingRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);

  /** ASK → the question travels to the top and stays there while the answer fills in
   *  underneath it.
   *
   *  Chasing the bottom (what this did before) is the wrong model for an answer that
   *  arrives in pieces: the view jumps as each chart and table mounts, and the question —
   *  the thing that gives the answer its meaning — is pushed off the top of the screen
   *  before you have read a word of the reply. Anchoring the question instead means the
   *  screen settles once, at the moment you ask, and then nothing moves until the answer
   *  is genuinely longer than a screenful.
   *
   *  It only works because the last turn is given a screen's worth of min-height (see
   *  `--ai-vh` below) — without that there is nothing under a short answer to scroll
   *  against, and the question cannot reach the top. Bottom-following still runs from the
   *  ResizeObserver, and is a no-op until the answer actually overflows, at which point it
   *  takes over and keeps up with the text. */
  const lastTurnRef = useRef<HTMLDivElement | null>(null);
  const turnCount = turns.length;
  useEffect(() => {
    const el = scrollRef.current, node = lastTurnRef.current;
    if (!el || !node) return;
    atBottomRef.current = true; setAtBottom(true);
    const top = node.offsetTop - 20;
    lastTopRef.current = top;
    el.scrollTo({ top, behavior: turnCount > 1 ? "smooth" : "auto" });
  }, [turnCount]);

  /** The scroll viewport's height, published as a CSS variable so the last turn can
   *  reserve a screenful and the question above it has somewhere to travel to. */
  useEffect(() => {
    const el = scrollRef.current; if (!el || typeof ResizeObserver === "undefined") return;
    const set = () => el.style.setProperty("--ai-vh", `${el.clientHeight}px`);
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Any programmatic send (typed input, a follow-up chip, a starter suggestion) should
  // resume auto-scroll-to-bottom, even if the user had scrolled up to read a prior answer —
  // otherwise clicking a chip silently starts a new turn with no visible scroll to it.
  const sendAndFollow = (q: string) => { atBottomRef.current = true; lastTopRef.current = scrollRef.current?.scrollTop ?? 0; setAtBottom(true); send(q); };
  const submit = () => { if (!input.trim() || busy) return; sendAndFollow(input); setInput(""); };

  /** Export just this turn — the question, its answer, and the charts/tables it rests on. */
  const exportTurn = async (msgId: string, kind: "excel" | "pdf") => {
    const turn = buildTurnAt(messages, msgId);
    if (kind === "excel") await exportExcel([turn], "hcg-ai-answer");
    else await exportPdf([turn], turn.question || "HCG AI Answer");
  };

  const exportAll = async (kind: "excel" | "pdf") => {
    const turns = groupTurns(messages);
    if (!turns.length) return;
    if (kind === "excel") await exportExcel(turns, "hcg-ai-conversation");
    else await exportPdf(turns, "HCG AI Conversation");
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: T.canvas }}>
      <GlobalStyle rules={`
        /* ── the answer, set as prose ─────────────────────────────────────────
           Real vertical rhythm, a comfortable measure, and headings/lists/tables that are
           actually styled — answers here routinely run to several paragraphs with figures
           and sub-lists in them, and were being set as one undifferentiated block. */
        .ai-prose { max-width: 72ch; font-size: 14.5px; line-height: 1.75; }
        .ai-prose p { margin: 0 0 13px; } .ai-prose p:last-child { margin-bottom: 0; }
        .ai-prose strong { color: ${T.ink}; font-weight: 600; }
        .ai-prose ol, .ai-prose ul { margin: 11px 0 15px; padding-left: 20px; }
        .ai-prose li { margin: 6px 0; padding-left: 3px; }
        .ai-prose li::marker { color: ${T.faint}; }
        .ai-prose a { color: ${T.dark}; text-underline-offset: 2px; }
        .ai-prose h1, .ai-prose h2, .ai-prose h3 {
          color: ${T.ink}; font-weight: 600; line-height: 1.4; letter-spacing: -0.01em;
          margin: 22px 0 8px;
        }
        .ai-prose h1 { font-size: 15.5px; } .ai-prose h2 { font-size: 14.5px; } .ai-prose h3 { font-size: 14px; }
        .ai-prose > *:first-child { margin-top: 0; }
        /* An analyst's first sentence is the answer; the rest is the working. Setting it a
           step larger and a shade darker is the oldest trick in editorial layout and it is
           the difference between skimming this and reading it. */
        .ai-prose > p:first-child { font-size: 15.5px; line-height: 1.65; color: ${T.ink}; margin-bottom: 15px; }
        .ai-prose hr { border: 0; border-top: 1px solid ${T.line}; margin: 20px 0; }
        .ai-prose blockquote { margin: 14px 0; padding: 1px 0 1px 14px; border-left: 2px solid ${T.line}; color: ${T.mut}; }
        .ai-prose code {
          font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12.5px;
          background: ${T.sunk}; padding: 1.5px 5px; border-radius: 5px; color: ${T.ink2};
        }
        /* markdown tables: the model is told not to emit these, but when it does they must
           not render as raw pipes running off the edge */
        .ai-prose table { width: 100%; border-collapse: collapse; margin: 13px 0; font-size: 13px; display: block; overflow-x: auto; }
        .ai-prose th, .ai-prose td { padding: 8px 11px; text-align: left; border-bottom: 1px solid ${T.hair}; white-space: nowrap; }
        .ai-prose th { color: ${T.mut}; font-weight: 600; background: ${T.sunk}; }

        /* caret on the last line while tokens land */
        .ai-caret > *:last-child::after {
          content: ""; display: inline-block; width: 2px; height: 1em; margin-left: 2px;
          vertical-align: -2px; background: ${T.dark}; animation: aiCaret 1s steps(2) infinite;
        }
        @keyframes aiCaret { 0%,50%{opacity:1} 51%,100%{opacity:0} }

        /* ── a turn is a section of a document, not a card ────────────────────
           Separation is a rule and space. The temptation is a bordered, shadowed card per
           answer; that boxes in the one thing on the page that has to read like writing,
           and a column of them scrolls like a feed instead of a document. */
        .ai-turn + .ai-turn { margin-top: 0; }
        .ai-thread > * + * { margin-top: 38px; padding-top: 38px; border-top: 1px solid ${T.line}; }
        /* Room for the newest question to reach the top of the viewport. Without it a
           two-line answer has nothing beneath it to scroll against, so the question stays
           stranded mid-screen. Only the last turn reserves it, and only down to a floor, so
           a finished conversation does not end in a screen of blank. */
        .ai-thread > *:last-child { min-height: max(0px, calc(var(--ai-vh, 0px) - 190px)); }
        .ai-tr:hover { background: ${T.sunk}; }
        .ai-tr { transition: background-color .12s linear; }

        /* ── one interaction language ─────────────────────────────────────────
           Every ghost control (copy, export, PNG, regenerate, queries) shares one hover.
           They used to each carry their own tinted pill, which is why a finished answer
           trailed five differently-coloured lozenges. */
        .ai-ghost { transition: background-color .14s ${EASE}, opacity .14s ${EASE}; }
        .ai-ghost:hover { background: ${T.sunk}; }
        .ai-item { transition: background-color .12s linear; }
        .ai-item:hover { background: ${T.sunk}; }
        .ai-chip { transition: border-color .16s ${EASE}, background-color .16s ${EASE}; }
        .ai-chip:hover { border-color: ${T.dark}; background: ${T.darkSoft}; }

        .ai-card { transition: background-color .16s ${EASE}, border-color .16s ${EASE}, box-shadow .16s ${EASE}; }
        .ai-card:hover { background: ${T.surface}; border-color: ${T.dash}; box-shadow: ${T.card}; }
        .ai-cardbadge { transition: transform .18s ${EASE}; }
        .ai-card:hover .ai-cardbadge { transform: scale(1.07); }

        .ai-composer { transition: border-color .16s ${EASE}, box-shadow .16s ${EASE}; }
        .ai-composer:focus-within { border-color: ${T.dark}; box-shadow: 0 0 0 3px ${T.darkSoft}; }
        .ai-tool { transition: background-color .14s ${EASE}, border-color .14s ${EASE}; }
        .ai-tool:hover { background: ${T.sunk}; border-color: ${T.dash}; }
        .ai-send { transition: filter .14s ${EASE}, opacity .14s ${EASE}; }
        .ai-send:not(:disabled):hover { filter: brightness(1.07); }
        .ai-send:not(:disabled):active { filter: brightness(.94); }

        .ai-kbd {
          font-family: inherit; font-size: 10.5px; padding: 1px 4px; margin: 0 1px;
          border: 1px solid ${T.line}; border-bottom-width: 2px; border-radius: 4px;
          background: ${T.surface}; color: ${T.mut};
        }
        .ai-link { transition: color .14s ${EASE}; }
        .ai-link:hover { color: ${T.ink2}; }

        /* ── motion: 6px, 200ms, once ─────────────────────────────────────────── */
        @keyframes aiIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .ai-fade { animation: aiIn .32s ${EASE} both; }
        .ai-msg  { animation: aiIn .26s ${EASE} both; }
        .ai-pop  { animation: aiIn .16s ${EASE} both; }
        .ai-jump { animation: aiIn .2s ${EASE} both; transition: background-color .14s ${EASE}; }
        .ai-jump:hover { background: ${T.sunk}; }
        /* The wait is 4–8s of real work, so it gets a real indicator: a pulse that says
           "running" and text that says WHAT is running. An earlier version stacked every
           completed step with a green tick, which turned the wait into a wall of ticked
           text that looked like a build log; three bouncing dots said nothing at all. */
        @keyframes aiPulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(.55); opacity: .35 } }
        .ai-pulse { animation: aiPulse 1.1s ${EASE} infinite; }
        @keyframes aiShimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
        .ai-shimmer {
          background: linear-gradient(90deg, ${T.mut} 0%, ${T.mut} 38%, ${T.ink} 50%, ${T.mut} 62%, ${T.mut} 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: aiShimmer 2.2s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-fade, .ai-msg, .ai-pop, .ai-jump, .ai-shimmer { animation: none !important; }
          .ai-shimmer { color: ${T.mut}; -webkit-text-fill-color: ${T.mut}; }
          .ai-pulse { animation: none !important; }
          .ai-ghost, .ai-item, .ai-chip, .ai-card, .ai-cardbadge, .ai-tool, .ai-composer, .ai-send, .ai-link, .ai-tr { transition: none !important; }
          .ai-card:hover .ai-cardbadge { transform: none; }
        }

        @keyframes aiSk { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .ai-sk {
          border-radius: 6px;
          background: linear-gradient(90deg, ${T.sunk} 0%, ${T.hair} 45%, ${T.sunk} 90%);
          background-size: 200% 100%;
          animation: aiSk 1.4s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) { .ai-sk { animation: none !important; background: ${T.sunk}; } }

        .ai-scroll { scrollbar-width: thin; scrollbar-color: #D5D8E2 transparent; }
        .ai-scroll::-webkit-scrollbar { width: 10px; }
        .ai-scroll::-webkit-scrollbar-thumb { background: #D5D8E2; border-radius: 8px; border: 3px solid transparent; background-clip: content-box; }
        .ai-scroll::-webkit-scrollbar-thumb:hover { background: #BFC4D2; background-clip: content-box; }
      `} />

      {/* A document has a title bar. Export and "New chat" used to sit UNDER the composer,
          the one place on the page the eye is not looking when it wants them, and the
          conversation itself was never named on screen at all — you could not tell which
          of ten sessions you had open without reading the rail. */}
      {variant === "page" && (
        <header className="ai-head flex items-center gap-3 flex-shrink-0 h-[52px] px-4 sm:px-6 z-20"
                style={{ borderBottom: `1px solid ${T.line}`, background: T.canvas, boxShadow: scrolled ? "0 6px 16px -12px rgba(37,34,32,.40)" : "none" }}>
          {onOpenSessions && (
            <button onClick={onOpenSessions} aria-label="Conversations"
              className="ai-ghost md:hidden -ml-1 w-8 h-8 flex items-center justify-center flex-shrink-0"
              style={{ borderRadius: T.r, color: T.mut }}><TbMenu2 size={18} /></button>
          )}
          <div className="min-w-0 flex items-baseline gap-2">
            <h1 className="text-[13.5px] font-semibold truncate" style={{ color: T.ink }}>
              {activeSession?.title || "New conversation"}
            </h1>
            {activeSession?.createdBy && (
              <span className="text-[11.5px] whitespace-nowrap hidden sm:inline" style={{ color: T.faint }}>
                · started by {activeSession.createdBy.id === currentUserId ? "you" : (activeSession.createdBy.name || activeSession.createdBy.email)}
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {messages.length > 0 && <ExportMenu label="Export" onExcel={() => exportAll("excel")} onPdf={() => exportAll("pdf")} pill />}
            <button onClick={newChat} className="ai-tool inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] font-medium"
              style={{ border: `1px solid ${T.line}`, borderRadius: 999, color: T.ink2 }}>
              <TbPlus size={13} /> New chat
            </button>
          </div>
        </header>
      )}

      <div ref={scrollRef} onScroll={onScroll} className="ai-scroll flex-1 min-h-0 overflow-y-auto relative">
        {stillLoadingHistory ? (
          <div className="mx-auto w-full px-5 sm:px-6 py-9" style={{ maxWidth: COL }} aria-busy="true" aria-label="Loading conversation">
            <div className="ai-sk h-[22px] w-[58%]" />
            <div className="flex gap-8 mt-6 py-3" style={{ borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="ai-sk h-[21px] w-[92px]" />
                  <div className="ai-sk h-[11px] w-[64px] mt-2.5" />
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2.5">
              <div className="ai-sk h-[13px] w-full" />
              <div className="ai-sk h-[13px] w-[94%]" />
              <div className="ai-sk h-[13px] w-[71%]" />
            </div>
            <div className="ai-sk h-[190px] w-full mt-6" style={{ borderRadius: T.r2 }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="min-h-full flex flex-col justify-center px-6 py-12">
            <div className="mx-auto w-full" style={{ maxWidth: 700 }}>
              {/* Two lines, second one greyed: the greeting names you, the question invites
                  you. A single centred headline reads like a marketing page; this reads
                  like a colleague looking up as you sit down. */}
              <div className="ai-fade" style={{ animationDelay: "30ms" }}>
                <h2 className="text-[26px] font-semibold tracking-[-0.02em] leading-[1.25]" style={{ color: T.ink }}>
                  {greeting()}{firstName ? `, ${firstName}!` : "!"}
                </h2>
                <p className="text-[26px] font-semibold tracking-[-0.02em] leading-[1.25]" style={{ color: T.mut }}>
                  What would you like to know?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-8">
                {SUGGESTIONS.map((sg, i) => {
                  const Icon = sg.icon;
                  return (
                    <button key={sg.q} onClick={() => sendAndFollow(sg.q)}
                      className="ai-card ai-fade text-left p-3 flex flex-col"
                      style={{ animationDelay: `${90 + i * 40}ms`, background: T.sunk, border: `1px solid ${T.line}`, borderRadius: T.r2 }}>
                      {/* The dashed frame reads as "a placeholder for the thing you'll get",
                          which is exactly what a starter card is: a preview of an answer
                          that does not exist yet. */}
                      <span className="relative flex items-center justify-center h-[108px] w-full mb-3"
                            style={{ background: T.tile, border: `1px dashed ${T.dash}`, borderRadius: T.r }}>
                        <span className="ai-cardbadge w-[38px] h-[38px] rounded-full flex items-center justify-center" style={{ background: T.dark }}>
                          <Icon size={18} color="#fff" />
                        </span>
                      </span>
                      <span className="block text-[13.5px] font-semibold leading-snug" style={{ color: T.ink }}>{sg.h}</span>
                      <span className="block text-[12px] mt-1 leading-snug" style={{ color: T.mut }}>{sg.s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div ref={followRef} className="ai-thread mx-auto w-full px-5 sm:px-8 py-10" style={{ maxWidth: COL }}>
            {turns.map((t, i, arr) => (
              <div key={t.qid} ref={i === arr.length - 1 ? lastTurnRef : undefined} className="ai-msg">
                <Brief turn={t} isLast={i === arr.length - 1}
                  onOption={(o) => sendAndFollow(o)}
                  onExport={t.texts.length ? (kind) => exportTurn(t.texts[t.texts.length - 1].id, kind) : undefined}
                  onRegenerate={i === arr.length - 1 && !busy && t.texts.length ? regenerate : undefined} />
              </div>
            ))}
            {/* One quiet line, not a growing checklist.
                An earlier version stacked every completed step with a green tick, which
                turned a 5s wait into a wall of ticked text that pushed the conversation off
                screen and looked like a build log. The steps are real work and are still
                worth surfacing — but as ONE line that updates in place, the way a person
                glances at a status, not a transcript of everything that has happened.
                Once tokens start arriving this disappears entirely: the answer writing
                itself IS the progress indicator. */}
            {busy && !answerStarted && (
              <div className="ai-msg flex items-center gap-2.5 text-[13.5px]">
                <span className="ai-pulse w-2 h-2 rounded-full flex-shrink-0" style={{ background: T.dark }} />
                <span className="ai-shimmer truncate">{step || (deep ? "Starting deep analysis" : "Thinking")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer, to the reference: one tall field with the actions living INSIDE it on
          their own row. Chips beneath a floating pill made the input look like a search
          box with a footnote; a single bordered block with a toolbar reads as a place you
          compose in, and it gives the two real controls (@ references, Export) a home
          that is not the far corner of the page. */}
      <div className="relative flex-shrink-0 px-6 pb-5 pt-2" style={{ background: T.canvas }}>
        {!atBottom && messages.length > 0 && (
          <button onClick={() => { atBottomRef.current = true; setAtBottom(true); scrollToBottom(); }} aria-label="Scroll to latest"
            className="ai-jump absolute -top-9 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
            style={{ background: T.surface, boxShadow: T.pop, border: `1px solid ${T.line}`, color: T.mut }}>
            <TbArrowDown size={16} />
          </button>
        )}
        <div className="mx-auto w-full" style={{ maxWidth: messages.length === 0 ? 700 : COL }}>
          <div className="ai-composer" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r3, boxShadow: T.card }}>
            <div className="px-2.5 pt-2">
              <MentionTextarea value={input} onChange={setInput} onSubmit={submit} disabled={busy}
                placeholder="Ask away, or start with one of the cards above…" />
            </div>
            <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
              <button onClick={() => setDeep(!deep)} aria-pressed={deep}
                title={deep
                  ? "Deep analysis is on: the question is decomposed, run as several parallel queries, re-derived independently and reviewed before answering. Slower and more thorough."
                  : "Deep analysis: decompose the question, run several queries in parallel, re-derive the key figures independently, and review before answering. Slower, for questions where being right matters more than being quick."}
                className="ai-tool inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] font-medium"
                style={deep
                  ? { border: `1px solid ${T.dark}`, borderRadius: 999, color: "#fff", background: T.dark }
                  : { border: `1px solid ${T.line}`, borderRadius: 999, color: T.ink2 }}>
                <TbTelescope size={13} /> Deep
              </button>
              <button onClick={() => setInput((v) => (v.endsWith("@") ? v : v + "@"))} title="Reference an item, vendor or category"
                className="ai-tool inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] font-medium"
                style={{ border: `1px solid ${T.line}`, borderRadius: 999, color: T.ink2 }}>
                <TbAt size={13} /> Reference
              </button>
              {messages.length > 0 && (
                <ExportMenu label="Export" onExcel={() => exportAll("excel")} onPdf={() => exportAll("pdf")} pill up />
              )}
              <span className="ml-auto flex items-center gap-2">
                {input.trim() ? (
                  <span className="hidden sm:inline text-[11px] ai-fade" style={{ color: T.faint }}>
                    <kbd className="ai-kbd">Enter</kbd> to send
                  </span>
                ) : null}
                {busy ? (
                  <button onClick={stop} title="Stop generating" aria-label="Stop generating"
                    className="ai-send w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: T.ink, color: "#fff" }}>
                    <TbPlayerStopFilled size={12} />
                  </button>
                ) : (
                  <button onClick={submit} disabled={!input.trim()} aria-label="Send"
                    className="ai-send w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30"
                    style={{ background: T.dark, color: "#fff" }}><TbArrowUp size={17} /></button>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
