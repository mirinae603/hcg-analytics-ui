"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TbSend, TbChartBar, TbShieldCheck, TbDatabase, TbChevronDown, TbFileSpreadsheet, TbFileTypePdf, TbDownload, TbArrowDown, TbPlus } from "react-icons/tb";
import { useAiChat, AiMsg } from "@/context/AiChatContext";
import { groupTurns, exportExcel, exportPdf, Turn } from "@/lib/aiExport";
import AnalystMark from "./AnalystMark";
import MentionTextarea from "./MentionTextarea";

const PlotlyChart = dynamic(() => import("./PlotlyChart"), { ssr: false });

const INK = "#1a1f36", SUB = "#8a91a3", ACCENT = "#3b5bdb";
const SUGGESTIONS = [
  "Revenue & margin by manufacturer",
  "How much stock is expiring soon?",
  "Top vendors by spend",
  "Which items should we reorder?",
  "Monthly revenue trend",
];

function fmt(v: any, kind: string): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (kind === "inr") { const a = Math.abs(n); if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`; if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`; if (a >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`; return `₹${Math.round(n)}`; }
  if (kind === "pct") return `${n.toFixed(1)}%`;
  if (kind === "days") return `${Math.round(n)} d`;
  if (kind === "num") return n.toLocaleString("en-IN");
  return String(v);
}

function TableView({ table }: { table: NonNullable<AiMsg["table"]> }) {
  const cols = table.columns || [];
  const rows = (table.rows || []).slice(0, 12);
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#eef0f4", background: "#fff" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f7f8fb", color: SUB }}>
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
    <div ref={wrapRef} className="w-full rounded-2xl bg-white border overflow-hidden group" style={{ borderColor: "#eceef4", boxShadow: "0 1px 2px rgba(20,24,40,0.04)" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "#a2a8b6" }}>Chart</span>
        <button onClick={downloadPng} title="Download as PNG" className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#f4f5f8", color: "#5a6072" }}>
          <TbDownload size={12} /> PNG
        </button>
      </div>
      <div className="px-2 pb-2"><PlotlyChart figure={figure} title={title} /></div>
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

function Message({ m, onOption, onExport }: { m: AiMsg; onOption?: (o: string) => void; onExport?: (kind: "excel" | "pdf") => void }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] leading-relaxed" style={{ background: INK, color: "#fff" }}>{m.text}</div>
      </div>
    );
  }
  if (m.kind === "plotly" && m.figure) {
    return <div className="flex justify-start"><div className="w-full"><ChartCard figure={m.figure} /></div></div>;
  }
  if (m.kind === "table" && m.table) {
    return <div className="flex justify-start"><div className="w-full"><TableView table={m.table} /></div></div>;
  }
  // bot text (markdown) + verified badge + queries disclosure
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] w-full rounded-2xl rounded-bl-md px-4 py-3 bg-white border ai-prose" style={{ borderColor: "#eef0f4", color: "#2b3040" }}>
        <div className="text-[13.5px] leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text || ""}</ReactMarkdown></div>
        {m.options && m.options.length ? (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {m.options.map((o) => <button key={o} onClick={() => onOption?.(o)} className="text-[11.5px] px-2.5 py-1 rounded-full border transition-colors hover:bg-gray-50" style={{ borderColor: "#e4e7ee", color: "#4b5468" }}>{o}</button>)}
          </div>
        ) : null}
        {(m.verified || (m.queries && m.queries.length) || onExport) ? (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {m.verified === "ok" || m.verified === "corrected" ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#e7f6ef", color: "#0e7a54" }}><TbShieldCheck size={12} /> Verified{m.verified === "corrected" ? " · auto-corrected" : ""}</span>
            ) : null}
            {m.queries && m.queries.length ? <QueriesDisclosure queries={m.queries} /> : null}
            {onExport ? <ExportMenu label="Export" compact onExcel={() => onExport("excel")} onPdf={() => onExport("pdf")} /> : null}
          </div>
        ) : null}
      </div>
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
  const { messages, busy, step, send, newChat } = useAiChat();
  const [input, setInput] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const exportAll = async (kind: "excel" | "pdf") => {
    const turns = groupTurns(messages);
    if (!turns.length) return;
    if (kind === "excel") await exportExcel(turns, "hcg-ai-conversation");
    else await exportPdf(turns, "HCG AI Conversation");
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: variant === "page" ? "#f6f7f9" : "#fbfbfc" }}>
      <style jsx global>{`
        .ai-prose p { margin: 0 0 7px; } .ai-prose p:last-child { margin-bottom: 0; }
        .ai-prose strong { color: #1a1f36; font-weight: 700; }
        .ai-prose ol, .ai-prose ul { margin: 5px 0 7px; padding-left: 18px; }
        .ai-prose li { margin: 3px 0; }
        .ai-prose a { color: #3b5bdb; }
        @keyframes aiDot { 0%,80%,100%{opacity:.25;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
        @keyframes aiMsgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ai-msg { animation: aiMsgIn .32s cubic-bezier(.22,1,.36,1) both; }
        .ai-scroll { scrollbar-width: thin; scrollbar-color: #d3d7e0 transparent; }
        .ai-scroll::-webkit-scrollbar { width: 9px; }
        .ai-scroll::-webkit-scrollbar-thumb { background: #d3d7e0; border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
        .ai-scroll::-webkit-scrollbar-thumb:hover { background: #b9bfcd; background-clip: content-box; }
      `}</style>

      <div ref={scrollRef} onScroll={onScroll} className="ai-scroll flex-1 min-h-0 overflow-y-auto relative">
        {messages.length === 0 ? (
          <div className="min-h-full flex flex-col items-center justify-center text-center px-4 py-10">
            <AnalystMark size={52} />
            <div className="text-[16px] font-semibold mt-4" style={{ color: INK }}>HCG AI Analyst</div>
            <div className="text-[12.5px] mt-1.5 max-w-[340px] leading-relaxed" style={{ color: SUB }}>Ask anything about revenue, inventory, procurement, expiry or forecasts — I query the real data and answer with charts.</div>
            <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-[460px]">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => sendAndFollow(s)} className="text-[12px] px-3.5 py-1.5 rounded-lg border transition-all hover:-translate-y-0.5" style={{ borderColor: "#e7e9f0", color: "#4b5468", background: "#fff", boxShadow: "0 1px 2px rgba(20,24,40,0.03)" }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[840px] px-4 sm:px-5 py-5 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="ai-msg">
                <Message m={m} onOption={m.options && m.options.length ? (o) => sendAndFollow(o) : undefined} />
              </div>
            ))}
            {busy && (
              <div className="ai-msg flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-4 py-2.5 bg-white border inline-flex items-center gap-2.5" style={{ borderColor: "#eef0f4" }}>
                  <span className="text-[12.5px]" style={{ color: SUB }}>{step || "Thinking"}</span>
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, animation: `aiDot 1.2s ${i * 0.15}s infinite ease-in-out` }} />)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t px-4 sm:px-5 pt-3 pb-4 relative" style={{ borderColor: "#eef0f4", background: variant === "page" ? "#f6f7f9" : "#fbfbfc" }}>
        {!atBottom && messages.length > 0 && (
          <button onClick={() => scrollToBottom()} aria-label="Scroll to latest" className="absolute -top-12 right-6 w-9 h-9 rounded-full flex items-center justify-center bg-white transition-transform hover:scale-105" style={{ boxShadow: "0 8px 22px -8px rgba(20,24,40,0.35)", border: "1px solid #eceef4", color: ACCENT }}>
            <TbArrowDown size={17} />
          </button>
        )}
        <div className="mx-auto w-full max-w-[840px]">
          {messages.length > 0 && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10.5px] inline-flex items-center gap-1" style={{ color: SUB }}><TbChartBar size={12} /> answers use your real data</span>
              <div className="flex items-center gap-2.5">
                <ExportMenu label="Export all" onExcel={() => exportAll("excel")} onPdf={() => exportAll("pdf")} />
                <button onClick={newChat} className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline" style={{ color: SUB }}><TbPlus size={12} /> New chat</button>
              </div>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl px-2 py-1.5 transition-shadow" style={{ background: "#fff", border: "1px solid #e6e9f1", boxShadow: "0 1px 2px rgba(20,24,40,0.04)" }}>
            <MentionTextarea value={input} onChange={setInput} onSubmit={submit} disabled={busy} placeholder="Ask about your data…  type @ to reference an item, vendor or category" />
            <button onClick={submit} disabled={!input.trim() || busy} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-all hover:opacity-90" style={{ background: ACCENT, color: "#fff" }} aria-label="Send"><TbSend size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
