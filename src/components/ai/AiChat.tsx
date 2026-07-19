"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TbSend, TbSparkles, TbChartBar } from "react-icons/tb";
import { useAiChat, AiMsg } from "@/context/AiChatContext";

const PlotlyChart = dynamic(() => import("./PlotlyChart"), { ssr: false });

const INK = "#1f2333", SUB = "#8a91a0", ACCENT = "#4b7bd4";
const SUGGESTIONS = [
  "Top manufacturers by revenue",
  "How much stock is expiring soon?",
  "Vendor spend concentration",
  "Which items should we reorder?",
  "Revenue trend by month",
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

function Message({ m }: { m: AiMsg }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] leading-relaxed" style={{ background: INK, color: "#fff" }}>{m.text}</div>
      </div>
    );
  }
  if (m.kind === "plotly" && m.figure) {
    return (
      <div className="flex justify-start">
        <div className="w-full max-w-[100%] rounded-2xl p-2 bg-white border" style={{ borderColor: "#eef0f4" }}><PlotlyChart figure={m.figure} /></div>
      </div>
    );
  }
  if (m.kind === "table" && m.table) {
    return <div className="flex justify-start"><div className="w-full"><TableView table={m.table} /></div></div>;
  }
  // bot text (markdown)
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md px-4 py-2.5 text-[13.5px] leading-relaxed bg-white border ai-prose" style={{ borderColor: "#eef0f4", color: "#2b3040" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text || ""}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function AiChat({ variant = "floater" }: { variant?: "floater" | "page" }) {
  const { messages, busy, step, send, clear } = useAiChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, step, busy]);

  const submit = () => { if (!input.trim() || busy) return; send(input); setInput(""); };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: variant === "page" ? "#f6f7f9" : "#fbfbfc" }}>
      <style jsx global>{`
        .ai-prose p { margin: 0 0 6px; } .ai-prose p:last-child { margin-bottom: 0; }
        .ai-prose strong { color: #1f2333; font-weight: 700; }
        .ai-prose ol, .ai-prose ul { margin: 4px 0 6px; padding-left: 18px; }
        .ai-prose li { margin: 2px 0; }
        @keyframes aiDot { 0%,80%,100%{opacity:.25;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
      `}</style>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg,#4b7bd4,#16a37f)" }}><TbSparkles size={26} color="#fff" /></div>
            <div className="text-[15px] font-semibold" style={{ color: INK }}>HCG AI Analyst</div>
            <div className="text-[12.5px] mt-1 max-w-[300px]" style={{ color: SUB }}>Ask anything about revenue, inventory, procurement, expiry or forecasts. Grounded in your real data.</div>
            <div className="flex flex-wrap gap-2 justify-center mt-5 max-w-[420px]">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-[12px] px-3 py-1.5 rounded-full border transition-colors hover:bg-white" style={{ borderColor: "#e4e7ee", color: "#4b5468", background: "#fff" }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => <Message key={m.id} m={m} />)}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-4 py-2.5 bg-white border inline-flex items-center gap-2.5" style={{ borderColor: "#eef0f4" }}>
              <span className="text-[12.5px]" style={{ color: SUB }}>{step || "Thinking"}</span>
              <span className="inline-flex gap-1">
                {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, animation: `aiDot 1.2s ${i * 0.15}s infinite ease-in-out` }} />)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t px-3 py-3" style={{ borderColor: "#eef0f4", background: "#fff" }}>
        {messages.length > 0 && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10.5px] inline-flex items-center gap-1" style={{ color: SUB }}><TbChartBar size={12} /> answers use your real data</span>
            <button onClick={clear} className="text-[11px] font-medium hover:underline" style={{ color: SUB }}>Clear</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Ask about your supply-chain data…"
            className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none focus:ring-2 max-h-28"
            style={{ background: "#f4f5f8", border: "1px solid #e8eaef", color: INK }} />
          <button onClick={submit} disabled={!input.trim() || busy} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity" style={{ background: ACCENT, color: "#fff" }} aria-label="Send"><TbSend size={17} /></button>
        </div>
      </div>
    </div>
  );
}
