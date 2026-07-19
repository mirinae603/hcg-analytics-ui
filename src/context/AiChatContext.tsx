"use client";
// Shared AI-Analyst conversation state. One provider mounted in the admin layout
// backs BOTH the floating assistant and the /ai page, so the conversation follows
// the user between them. Streams the backend SSE (/ai/chat).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

const STORE_KEY = "hcg_ai_chat_v1";
const MAX_PERSIST = 80; // keep the conversation bounded in localStorage

export type AiQuery = { purpose?: string; sql?: string; rows?: number; error?: string };
export type AiMsg = {
  id: string;
  role: "user" | "bot";
  kind: "text" | "plotly" | "table";
  text?: string;
  figure?: { data: any[]; layout?: any };
  table?: { title: string; columns: any[]; rows: any[]; note?: string };
  verified?: string | null;
  queries?: AiQuery[];
  options?: string[];
};

type Ctx = {
  messages: AiMsg[];
  busy: boolean;
  step: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  send: (q: string) => void;
  clear: () => void;
};

const AiChatContext = createContext<Ctx | null>(null);
const uid = () => `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [open, setOpen] = useState(false);
  const busyRef = useRef(false);

  // Load persisted conversation once (survives reloads / navigating between floater & /ai).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) setMessages(arr); }
    } catch { /* noop */ }
  }, []);

  // Persist (bounded) whenever the conversation changes and we're idle.
  useEffect(() => {
    if (busy) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-MAX_PERSIST))); } catch { /* quota — ignore */ }
  }, [messages, busy]);

  const clear = useCallback(() => { setMessages([]); try { localStorage.removeItem(STORE_KEY); } catch { /* noop */ } }, []);

  const send = useCallback(async (q: string) => {
    const query = q.trim();
    if (!query || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setStep("Understanding your question");

    // short history for context (last few turns of prose)
    const history = messages
      .filter((m) => m.kind === "text" && m.text)
      .slice(-6)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

    setMessages((m) => [...m, { id: uid(), role: "user", kind: "text", text: query }]);
    const botId = uid();
    let botText = "";
    let botCreated = false;
    const queries: AiQuery[] = [];

    const upsertBot = (patch: Partial<AiMsg>) => {
      setMessages((m) => {
        if (!botCreated) { botCreated = true; return [...m, { id: botId, role: "bot", kind: "text", text: botText, queries: [...queries], ...patch }]; }
        return m.map((x) => (x.id === botId ? { ...x, ...patch } : x));
      });
    };
    const upsertBotText = (t: string) => { botText = t; upsertBot({ text: t }); };

    try {
      const res = await fetch(`${DASHBOARD_API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, history }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let ev: any;
          try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (ev.type === "step") setStep(ev.text);
          else if (ev.type === "sql") { queries.push({ purpose: ev.purpose, sql: ev.sql, rows: ev.rows, error: ev.error }); if (botCreated) upsertBot({ queries: [...queries] }); }
          else if (ev.type === "token") upsertBotText(botText + ev.text);
          else if (ev.type === "answer") upsertBot({ text: ev.text || botText, verified: ev.verified ?? null, queries: [...queries] });
          else if (ev.type === "clarify") upsertBot({ text: ev.text || "Could you clarify?", options: ev.options || [] });
          else if (ev.type === "chart" && ev.plotly) setMessages((m) => [...m, { id: uid(), role: "bot", kind: "plotly", figure: ev.plotly }]);
          else if (ev.type === "table" && ev.table) setMessages((m) => [...m, { id: uid(), role: "bot", kind: "table", table: { ...ev.table, note: ev.note } }]);
          else if (ev.type === "error") upsertBotText((botText ? botText + "\n\n" : "") + `⚠️ ${ev.text}`);
        }
      }
    } catch (e: any) {
      upsertBotText(botText || `⚠️ Couldn't reach the AI Analyst. ${e?.message || ""}`);
    } finally {
      busyRef.current = false;
      setBusy(false);
      setStep("");
    }
  }, [messages]);

  return (
    <AiChatContext.Provider value={{ messages, busy, step, open, setOpen, send, clear }}>
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const c = useContext(AiChatContext);
  if (!c) throw new Error("useAiChat must be used within AiChatProvider");
  return c;
}
