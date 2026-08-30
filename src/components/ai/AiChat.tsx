"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TbSend, TbChartBar, TbShieldCheck, TbDatabase, TbChevronDown, TbFileSpreadsheet, TbFileTypePdf, TbDownload, TbArrowDown, TbPlus, TbUserCircle, TbCopy, TbCheck, TbRefresh, TbPlayerStopFilled, TbAlertTriangle } from "react-icons/tb";
import { useAiChat, AiMsg } from "@/context/AiChatContext";
import { groupTurns, exportExcel, exportPdf, Turn } from "@/lib/aiExport";
import AnalystMark from "./AnalystMark";
import MentionTextarea from "./MentionTextarea";

const PlotlyChart = dynamic(() => import("./PlotlyChart"), { ssr: false });

import { T, EASE } from "./theme";

const INK = T.ink, SUB = T.mut, ACCENT = T.accent;
const SUGGESTIONS = [
  { q: "What should we order first, and why?",        h: "Reorder priority" },
  { q: "How much stock is expiring in 90 days?",      h: "Expiry risk" },
  { q: "Which vendors do we spend the most with?",    h: "Procurement" },
  { q: "How much cash do we need to restock next month?", h: "Budget" },
];

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

function TableView({ table }: { table: NonNullable<AiMsg["table"]> }) {
  const cols = table.columns || [];
  // No .slice(0, 12). The backend sends up to 50 rows AND a caption that says so
  // ("Showing top 50 of N rows") — truncating to 12 here made the table contradict its
  // own footnote, and quietly hid 38 rows of evidence the answer was resting on. Scroll
  // instead of truncate; the caption is now true.
  const rows = table.rows || [];
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#eef0f4", background: "#fff" }}>
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 420 }}>
        <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead className="sticky top-0 z-10"><tr style={{ background: "#f7f8fb", color: SUB }}>
            {cols.map((c: any) => <th key={c.key} className="text-left font-medium px-3 py-2 whitespace-nowrap">{c.label}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} style={{ borderTop: "1px solid #f2f4f8" }}>
                {cols.map((c: any) => <td key={c.key} className={`px-3 py-2 whitespace-nowrap ${c.kind !== "text" ? "text-right tabular-nums" : ""}`} style={{ color: c.kind === "text" ? INK : "#3c465c", fontWeight: c.kind === "inr" ? 600 : 400 }}>{fmt(r[c.key], c.kind)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note ? <div className="px-3 py-2 text-[10.5px]" style={{ color: SUB, background: "#fafbfc", borderTop: "1px solid #f2f4f8" }}>{table.note}</div> : null}
    </div>
  );
}

function ChartCard({ figure }: { figure: { data: any[]; layout?: any } }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const title = figure?.layout?.title?.text || "Chart";
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
    <div ref={wrapRef} className="w-full rounded-2xl bg-white border overflow-hidden group" style={{ borderColor: "#ecedf3", boxShadow: "0 1px 2px rgba(20,24,40,0.03)" }}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
        <span className="text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>{title}</span>
        <button onClick={downloadPng} title="Download as PNG"
          className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ background: "#f4f5f8", color: "#5a6072" }}>
          <TbDownload size={12} /> PNG
        </button>
      </div>
      <div className="px-3 pb-3"><PlotlyChart figure={figure} title={title} /></div>
    </div>
  );
}

function ExportMenu({ label, onExcel, onPdf, compact }: { label: string; onExcel: () => void; onPdf: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [open]);
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen(!open)} className={`inline-flex items-center gap-1 font-medium rounded-full transition-colors ${compact ? "text-[10.5px] px-2 py-0.5" : "text-[11px] px-2.5 py-1"}`} style={{ background: "#eef1f6", color: "#5a6072" }}>
        <TbDownload size={compact ? 12 : 13} /> {label} <TbChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-20 rounded-lg overflow-hidden bg-white" style={{ boxShadow: "0 12px 30px -10px rgba(20,24,40,0.28)", border: "1px solid #eceef4", minWidth: 140 }}>
          <button onClick={() => { setOpen(false); onExcel(); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-gray-50" style={{ color: "#3c465c" }}><TbFileSpreadsheet size={15} style={{ color: "#16a37f" }} /> Excel (.xlsx)</button>
          <button onClick={() => { setOpen(false); onPdf(); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-gray-50 border-t" style={{ color: "#3c465c", borderColor: "#f2f4f8" }}><TbFileTypePdf size={15} style={{ color: "#e8604a" }} /> PDF (.pdf)</button>
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
      className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full transition-colors"
      style={{ background: copied ? "#e7f6ef" : "#f4f5f8", color: copied ? "#0e7a54" : "#5a6072" }}>
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

function Message({ m, onOption, onExport, onRegenerate }: {
  m: AiMsg; onOption?: (o: string) => void; onExport?: (kind: "excel" | "pdf") => void;
  /** Present only on the LAST bot text bubble — regenerating any earlier answer would
   *  be ambiguous (regenerate replaying WHICH later question, on top of what?). */
  onRegenerate?: () => void;
}) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[18px] px-4 py-2.5 text-[14px] leading-[1.55]" style={{ background: "#f0f1f5", color: INK }}>{m.text}</div>
      </div>
    );
  }
  if (m.kind === "plotly" && m.figure) {
    return <div className="w-full"><ChartCard figure={m.figure} /></div>;
  }
  if (m.kind === "table" && m.table) {
    return <div className="w-full"><TableView table={m.table} /></div>;
  }
  // ASSISTANT ANSWER — set as prose, not as a chat bubble.
  // A bordered white card inside a white column drew a box around the one thing on the
  // page that should read like writing, and capped it at 13.5px/relaxed. An answer here is
  // often several paragraphs with figures in it; it earns the same treatment a document
  // gets. The card, the border and the tail are gone; what remains is a comfortable measure
  // and a real vertical rhythm. Actions move to hover so they stop competing with the text.
  return <BotText m={m} onOption={onOption} onExport={onExport} onRegenerate={onRegenerate} />;
}

function BotText({ m, onOption, onExport, onRegenerate }: {
  m: AiMsg; onOption?: (o: string) => void; onExport?: (kind: "excel" | "pdf") => void;
  onRegenerate?: () => void;
}) {
  const shown = m.text || "";
  const done = !m.streaming;   // chips/actions wait until the stream finishes
  return (
    <div className="group w-full ai-prose" style={{ color: "#32384a" }}>
      <div className={`text-[14.5px] leading-[1.72]${m.streaming ? " ai-caret" : ""}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{shown}</ReactMarkdown></div>
      {done && m.options && m.options.length ? (
        <div className="flex flex-wrap gap-2 mt-4">
          {m.options.map((o) => (
            <button key={o} onClick={() => onOption?.(o)}
              className="text-[12.5px] px-3 py-1.5 rounded-lg border text-left transition-all hover:-translate-y-[1px]"
              style={{ borderColor: "#e6e8ef", color: "#4b5468", background: "#fff" }}>{o}</button>
          ))}
        </div>
      ) : null}
        {done && (m.verified || (m.queries && m.queries.length) || onExport || m.text || onRegenerate) ? (
          <div className="flex items-center gap-2 mt-3.5 flex-wrap">
            {/* All four states, in words an executive can act on. Previously only ok and
                corrected rendered, which meant "canonical" — the STRONGEST guarantee we
                have, the same calculation the dashboard card uses — showed no badge at all,
                while "flagged" also showed nothing and so was indistinguishable from a
                clean answer. Both silences were misleading in opposite directions. */}
            {m.verified === "canonical" ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                    title="This figure comes from the same calculation the dashboard card uses — not re-derived by the assistant."
                    style={{ background: "#e7f6ef", color: "#0b6b49" }}><TbShieldCheck size={12} /> Same as your dashboard</span>
            ) : m.verified === "ok" || m.verified === "corrected" ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                    title="Every figure in this answer was checked back against the query results it came from."
                    style={{ background: "#e7f6ef", color: "#0e7a54" }}><TbShieldCheck size={12} /> Figures checked{m.verified === "corrected" ? " · auto-corrected" : ""}</span>
            ) : m.verified === "flagged" ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                    title="The checker could not confirm these figures against the data. Treat them as indicative."
                    style={{ background: "#fdf0e3", color: "#a2650f" }}><TbAlertTriangle size={12} /> Couldn&rsquo;t confirm</span>
            ) : null}
            {m.queries && m.queries.length ? <QueriesDisclosure queries={m.queries} /> : null}
            {/* tools, not claims — they fade in on hover so they stop competing with the
                answer. The trust badge above deliberately does NOT hide: it is a statement
                about how far the figures were checked, and concealing that until someone
                happens to mouse over would be the dishonest kind of tidy. */}
            <span className="inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              {onExport ? <ExportMenu label="Export" compact onExcel={() => onExport("excel")} onPdf={() => onExport("pdf")} /> : null}
              {m.text ? <CopyButton text={m.text} /> : null}
              {onRegenerate ? (
                <button onClick={onRegenerate} title="Regenerate response"
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full transition-colors hover:bg-[#eceef4]"
                  style={{ background: "#f4f5f8", color: "#5a6072" }}>
                  <TbRefresh size={12} /> Regenerate
                </button>
              ) : null}
            </span>
          </div>
        ) : null}
    </div>
  );
}

function QueriesDisclosure({ queries }: { queries: NonNullable<AiMsg["queries"]> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full transition-colors" style={{ background: "#eef1fb", color: "#4b5bd5" }}>
        <TbDatabase size={12} /> {queries.length} quer{queries.length > 1 ? "ies" : "y"} run <TbChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {queries.map((q, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ border: "1px solid #eceef4" }}>
              <div className="px-2.5 py-1.5 text-[10.5px] font-medium flex items-center justify-between" style={{ background: "#f7f8fb", color: "#5a6072" }}>
                <span className="truncate pr-2">{q.purpose}</span>
                <span style={{ color: q.error ? "#b5524a" : "#8a91a0" }}>{q.error ? "error" : `${q.rows} rows`}</span>
              </div>
              <pre className="px-2.5 py-2 text-[10.5px] overflow-x-auto whitespace-pre-wrap break-words" style={{ background: "#fbfbfc", color: "#3c465c", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", margin: 0 }}>{q.error ? q.error : q.sql}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiChat({ variant = "floater" }: { variant?: "floater" | "page" }) {
  const { messages, busy, step, trace, send, stop, regenerate, newChat, activeSession, loadingActive, currentUserId } = useAiChat();
  const stillLoadingHistory = loadingActive && !!activeSession && !activeSession.loaded;
  const [input, setInput] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  // once the answer starts writing itself, it IS the progress indicator — the
  // separate thinking line would just sit underneath it saying nothing new
  const streamingNow = messages.some((m) => m.streaming);
  const atBottomRef = useRef(true);

  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottomRef.current = near; setAtBottom(near);
  };
  const scrollToBottom = (smooth = true) => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });

  // Only auto-follow when the user is already at the bottom (don't yank them up while reading).
  useEffect(() => { if (atBottomRef.current) scrollToBottom(); }, [messages, step, busy]);

  // Any programmatic send (typed input, a follow-up chip, a starter suggestion) should
  // resume auto-scroll-to-bottom, even if the user had scrolled up to read a prior answer —
  // otherwise clicking a chip silently starts a new turn with no visible scroll to it.
  const sendAndFollow = (q: string) => { atBottomRef.current = true; setAtBottom(true); send(q); };
  const submit = () => { if (!input.trim() || busy) return; sendAndFollow(input); setInput(""); };

  // The most recent bot TEXT bubble is where "Regenerate" belongs — not necessarily the
  // last array element, since a chart/table bubble from the same turn is appended AFTER
  // the text and would otherwise steal the spot.
  let lastBotTextIdx = -1;
  for (let j = messages.length - 1; j >= 0; j--) { if (messages[j].role === "bot" && messages[j].kind === "text") { lastBotTextIdx = j; break; } }

  const exportAll = async (kind: "excel" | "pdf") => {
    const turns = groupTurns(messages);
    if (!turns.length) return;
    if (kind === "excel") await exportExcel(turns, "hcg-ai-conversation");
    else await exportPdf(turns, "HCG AI Conversation");
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: variant === "page" ? T.ground : T.surface }}>
      <style jsx global>{`
        /* Prose, not chat-bubble text. Real vertical rhythm, a comfortable measure, and
           headings/lists/tables that are actually styled — answers here routinely run to
           several paragraphs with figures and sub-lists in them, and were being set as one
           undifferentiated block. */
        .ai-prose { max-width: 74ch; }
        .ai-prose p { margin: 0 0 12px; } .ai-prose p:last-child { margin-bottom: 0; }
        .ai-prose strong { color: #10142a; font-weight: 650; }
        .ai-prose ol, .ai-prose ul { margin: 10px 0 14px; padding-left: 20px; }
        .ai-prose li { margin: 5px 0; padding-left: 2px; }
        .ai-prose li::marker { color: #a8aec0; }
        .ai-prose a { color: #3b5bdb; text-underline-offset: 2px; }
        .ai-prose h1, .ai-prose h2, .ai-prose h3 {
          color: #10142a; font-weight: 650; line-height: 1.35; letter-spacing: -0.01em;
          margin: 20px 0 8px;
        }
        .ai-prose h1 { font-size: 17px; } .ai-prose h2 { font-size: 15.5px; } .ai-prose h3 { font-size: 14.5px; }
        .ai-prose > *:first-child { margin-top: 0; }
        .ai-prose hr { border: 0; border-top: 1px solid #ebedf3; margin: 18px 0; }
        .ai-prose blockquote {
          margin: 12px 0; padding: 2px 0 2px 14px;
          border-left: 2px solid #e0e3ec; color: #5c6478;
        }
        .ai-prose code {
          font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12.5px;
          background: #f2f3f7; padding: 1.5px 5px; border-radius: 5px; color: #3c4256;
        }
        /* markdown tables: the model is told not to emit these, but when it does they must
           not render as raw pipes running off the edge */
        .ai-prose table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; display: block; overflow-x: auto; }
        .ai-prose th, .ai-prose td { padding: 7px 10px; text-align: left; border-bottom: 1px solid #f0f1f6; white-space: nowrap; }
        .ai-prose th { color: #6b7285; font-weight: 600; background: #fafbfc; }
        /* caret on the last line while tokens land */
        .ai-caret > *:last-child::after {
          content: ""; display: inline-block; width: 2px; height: 1em; margin-left: 2px;
          vertical-align: -2px; background: #3b5bdb; animation: aiCaret 1s steps(2) infinite;
        }
        @keyframes aiCaret { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        /* ── motion: one easing, everything subtle, all of it optional ── */
        @keyframes aiFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ai-fade { animation: aiFade .45s ${EASE} both; }

        .ai-sugg { transition: transform .18s ${EASE}, box-shadow .18s ${EASE}, border-color .18s ${EASE}; }
        .ai-sugg:hover { transform: translateY(-2px); border-color: ${T.accent2}; box-shadow: 0 10px 24px -14px ${T.accent}; }
        .ai-sugg:active { transform: translateY(0); }

        /* the composer lifts toward you on focus rather than just recolouring a border */
        .ai-composer { transition: box-shadow .2s ${EASE}, border-color .2s ${EASE}, transform .2s ${EASE}; }
        .ai-composer:focus-within {
          border-color: ${T.accent2};
          box-shadow: 0 0 0 4px ${T.accentSoft}, 0 10px 30px -16px ${T.accent};
        }
        .ai-send { transition: transform .15s ${EASE}, filter .15s ${EASE}; }
        .ai-send:not(:disabled):hover { filter: brightness(1.08); }
        .ai-send:not(:disabled):active { transform: scale(.92); }

        .ai-jump { animation: aiFade .3s ${EASE} both; transition: transform .16s ${EASE}; }
        .ai-jump:hover { transform: translate(-50%, -2px); }
        .ai-link { transition: color .15s ${EASE}; }
        .ai-link:hover { color: ${T.mut}; }

        @media (prefers-reduced-motion: reduce) {
          .ai-fade, .ai-msg, .ai-jump { animation: none !important; }
          .ai-sugg, .ai-composer, .ai-send, .ai-jump, .ai-link { transition: none !important; }
          .ai-sugg:hover, .ai-jump:hover { transform: none; }
        }
        @keyframes aiDot { 0%,80%,100%{opacity:.25;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
        @keyframes aiMsgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ai-msg { animation: aiMsgIn .32s cubic-bezier(.22,1,.36,1) both; }
        .ai-scroll { scrollbar-width: thin; scrollbar-color: #d3d7e0 transparent; }
        .ai-scroll::-webkit-scrollbar { width: 9px; }
        .ai-scroll::-webkit-scrollbar-thumb { background: #d3d7e0; border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
        .ai-scroll::-webkit-scrollbar-thumb:hover { background: #b9bfcd; background-clip: content-box; }
      `}</style>

      <div ref={scrollRef} onScroll={onScroll} className="ai-scroll flex-1 min-h-0 overflow-y-auto relative">
        {stillLoadingHistory ? (
          <div className="min-h-full flex flex-col items-center justify-center text-center px-4 py-10">
            <span className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${SUB} transparent ${SUB} ${SUB}` }} />
            <div className="text-[12.5px] mt-3" style={{ color: SUB }}>Loading conversation…</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="min-h-full flex flex-col justify-center px-6 py-10">
            {/* Left-aligned on the same measure the conversation uses, so the first answer
                lands exactly where the invitation was — a centred splash that jumps to a
                left column the moment you ask is a small but constant jolt. Suggestions are
                real executive questions with a category label, not feature names. */}
            <div className="mx-auto w-full" style={{ maxWidth: T.col }}>
              <div className="ai-fade" style={{ animationDelay: "40ms" }}>
                <AnalystMark size={40} />
                <h2 className="text-[24px] font-semibold mt-4 tracking-[-0.02em]" style={{ color: T.ink }}>
                  What would you like to know?
                </h2>
                <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: T.mut, maxWidth: "52ch" }}>
                  Ask in plain English. Every answer is worked out from HCG&rsquo;s real supply-chain
                  data, and shows the queries it used.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5 mt-7">
                {SUGGESTIONS.map((s, i) => (
                  <button key={s.q} onClick={() => sendAndFollow(s.q)}
                    className="ai-sugg ai-fade text-left px-4 py-3 rounded-xl"
                    style={{ animationDelay: `${120 + i * 55}ms`, background: T.surface, border: `1px solid ${T.line}` }}>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.09em]" style={{ color: T.faint }}>{s.h}</span>
                    <span className="block text-[13px] mt-1.5 leading-snug" style={{ color: T.ink2 }}>{s.q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full px-4 sm:px-6 py-8 space-y-7" style={{ maxWidth: T.col }}>
            {activeSession?.createdBy && (
              <div className="flex items-center gap-1.5 text-[11px] pb-1" style={{ color: SUB }}>
                <TbUserCircle size={13} />
                Started by {activeSession.createdBy.id === currentUserId ? "you" : (activeSession.createdBy.name || activeSession.createdBy.email)}
              </div>
            )}
            {messages.map((m, i) => {
              // Only once the turn has actually finished streaming, too — mid-stream it
              // would just restart itself.
              const isLastBotText = i === lastBotTextIdx && !busy;
              return (
                <div key={m.id} className="ai-msg">
                  <Message m={m}
                    onOption={m.options && m.options.length ? (o) => sendAndFollow(o) : undefined}
                    onRegenerate={isLastBotText ? regenerate : undefined} />
                </div>
              );
            })}
            {/* One quiet line, not a growing checklist.
                An earlier version stacked every completed step with a green tick, which
                turned a 5s wait into a wall of ticked text that pushed the conversation off
                screen and looked like a build log. The steps are real work and are still
                worth surfacing — but as ONE line that updates in place, the way a person
                glances at a status, not a transcript of everything that has happened.
                Once tokens start arriving this disappears entirely: the answer writing
                itself IS the progress indicator. */}
            {busy && !streamingNow && (
              <div className="ai-msg flex items-center gap-2.5 text-[13px]" style={{ color: SUB }}>
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, animation: `aiDot 1.2s ${i * 0.15}s infinite ease-in-out` }} />)}
                </span>
                <span className="truncate">{step || "Thinking"}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer. No top border: the scroll area fades out underneath it instead, so the
          conversation reads as continuing behind the input rather than being cut off by a
          rule. Shares T.col with the messages above, which they did not before (800 vs
          840px) — a misalignment you feel without being able to name it. */}
      <div className="relative flex-shrink-0 px-4 sm:px-6 pb-5 pt-2" style={{ background: T.ground }}>
        <div className="pointer-events-none absolute left-0 right-0 -top-8 h-8"
             style={{ background: `linear-gradient(to bottom, transparent, ${T.ground})` }} />
        {!atBottom && messages.length > 0 && (
          <button onClick={() => scrollToBottom()} aria-label="Scroll to latest"
            className="ai-jump absolute -top-6 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full flex items-center justify-center z-10"
            style={{ background: T.surface, boxShadow: T.shadowLg, border: `1px solid ${T.line}`, color: T.accent }}>
            <TbArrowDown size={17} />
          </button>
        )}
        <div className="mx-auto w-full" style={{ maxWidth: T.col }}>
          <div className="ai-composer flex items-end gap-2 rounded-[20px] px-2.5 py-2"
               style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: T.shadow }}>
            <MentionTextarea value={input} onChange={setInput} onSubmit={submit} disabled={busy}
              placeholder="Ask about your data…  type @ to reference an item, vendor or category" />
            {busy ? (
              <button onClick={stop} title="Stop generating" aria-label="Stop generating"
                className="ai-send w-9 h-9 rounded-[13px] flex items-center justify-center flex-shrink-0"
                style={{ background: T.ink, color: "#fff" }}>
                <TbPlayerStopFilled size={13} />
              </button>
            ) : (
              <button onClick={submit} disabled={!input.trim()} aria-label="Send"
                className="ai-send w-9 h-9 rounded-[13px] flex items-center justify-center flex-shrink-0 disabled:opacity-25"
                style={{ background: T.accent, color: "#fff" }}><TbSend size={15} /></button>
            )}
          </div>
          {/* One quiet line under the input, not a toolbar competing with it. */}
          <div className="flex items-center justify-between gap-3 mt-2 px-1.5">
            <span className="text-[10.5px] inline-flex items-center gap-1.5" style={{ color: T.faint }}>
              <TbChartBar size={11} /> Answers use your real data
            </span>
            {messages.length > 0 && (
              <div className="flex items-center gap-3">
                <ExportMenu label="Export" onExcel={() => exportAll("excel")} onPdf={() => exportAll("pdf")} />
                <button onClick={newChat} className="ai-link inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: T.faint }}>
                  <TbPlus size={11} /> New chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
