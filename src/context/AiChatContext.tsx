"use client";
// Multi-session AI-Analyst state. One provider (mounted in the admin layout) backs
// both the floating assistant and the /ai page. Sessions persist to localStorage so
// you can browse history and continue any past conversation. Streams the SSE /ai/chat.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

const SESSIONS_KEY = "hcg_ai_sessions_v2";
const ACTIVE_KEY = "hcg_ai_active_v2";
const LEGACY_KEY = "hcg_ai_chat_v1";
const MAX_SESSIONS = 40;
const MAX_MSGS = 160;

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
  scope?: string;   // filters this answer applied — threaded back so a terse follow-up inherits it
};
export type AiSession = { id: string; title: string; messages: AiMsg[]; createdAt: number; updatedAt: number };

type Ctx = {
  sessions: AiSession[];
  activeId: string;
  messages: AiMsg[];
  busy: boolean;
  step: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  send: (q: string) => void;
  newChat: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
};

const AiChatContext = createContext<Ctx | null>(null);
const uid = () => `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
const titleFrom = (q: string) => q.trim().replace(/\s+/g, " ").slice(0, 52) || "New chat";

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [open, setOpen] = useState(false);

  const sessionsRef = useRef<AiSession[]>([]);
  const activeRef = useRef<string>("");
  const busyRef = useRef(false);
  const loaded = useRef(false);

  // keep refs in lockstep with state so async streaming reads are never stale
  const commit = useCallback((updater: AiSession[] | ((s: AiSession[]) => AiSession[])) => {
    const next = typeof updater === "function" ? (updater as any)(sessionsRef.current) : updater;
    sessionsRef.current = next;
    setSessions(next);
  }, []);
  const setActive = useCallback((id: string) => { activeRef.current = id; setActiveId(id); }, []);

  // ── load / migrate once ──
  useEffect(() => {
    let ss: AiSession[] = [];
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) ss = arr; }
    } catch { /* noop */ }
    if (!ss.length) {
      try {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const msgs = JSON.parse(legacy);
          if (Array.isArray(msgs) && msgs.length) {
            const first = msgs.find((m: AiMsg) => m.role === "user");
            ss = [{ id: uid(), title: first ? titleFrom(first.text || "Chat") : "Chat", messages: msgs, createdAt: Date.now(), updatedAt: Date.now() }];
          }
          localStorage.removeItem(LEGACY_KEY);
        }
      } catch { /* noop */ }
    }
    let act = "";
    try { act = localStorage.getItem(ACTIVE_KEY) || ""; } catch { /* noop */ }
    if (!ss.find((s) => s.id === act)) act = ss[0]?.id || "";
    sessionsRef.current = ss; setSessions(ss);
    activeRef.current = act; setActiveId(act);
    loaded.current = true;
  }, []);

  // ── persist (bounded), idle only ──
  useEffect(() => {
    if (!loaded.current || busy) return;
    try {
      const trimmed = sessions.slice(0, MAX_SESSIONS).map((s) => ({ ...s, messages: s.messages.slice(-MAX_MSGS) }));
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch { /* quota — ignore */ }
  }, [sessions, activeId, busy]);

  const createSession = useCallback((): string => {
    const id = uid();
    commit((ss) => [{ id, title: "New chat", messages: [], createdAt: Date.now(), updatedAt: Date.now() }, ...ss]);
    setActive(id);
    return id;
  }, [commit, setActive]);

  const newChat = useCallback(() => {
    // reuse an existing empty session if the current one is already blank
    const cur = sessionsRef.current.find((s) => s.id === activeRef.current);
    if (cur && cur.messages.length === 0) { setOpen(true); return; }
    createSession();
  }, [createSession]);

  const switchSession = useCallback((id: string) => { if (sessionsRef.current.find((s) => s.id === id)) setActive(id); }, [setActive]);
  const renameSession = useCallback((id: string, title: string) => commit((ss) => ss.map((s) => (s.id === id ? { ...s, title: title.slice(0, 80) || s.title } : s))), [commit]);
  const deleteSession = useCallback((id: string) => {
    commit((ss) => ss.filter((s) => s.id !== id));
    if (activeRef.current === id) setActive(sessionsRef.current[0]?.id || "");
  }, [commit, setActive]);

  const writeMsgs = useCallback((sid: string, updater: (m: AiMsg[]) => AiMsg[], meta?: Partial<AiSession>) => {
    commit((ss) => ss.map((s) => (s.id === sid ? { ...s, messages: updater(s.messages), updatedAt: Date.now(), ...(meta || {}) } : s)));
  }, [commit]);

  const send = useCallback(async (q: string) => {
    const query = q.trim();
    if (!query || busyRef.current) return;
    busyRef.current = true; setBusy(true); setStep("Understanding your question");

    let sid = activeRef.current;
    if (!sid || !sessionsRef.current.find((s) => s.id === sid)) sid = createSession();
    const sess = sessionsRef.current.find((s) => s.id === sid);
    const isFirst = !sess || sess.messages.length === 0;

    const history = (sess?.messages || [])
      .filter((m) => m.kind === "text" && m.text)
      .slice(-24)   // kept in sync with backend HISTORY_MESSAGES — deeper memory for long sessions
      // Append the answer's scope marker ONLY into the history payload (not the displayed
      // text) so a terse follow-up server-side can inherit the exact prior filters.
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text + (m.role === "bot" && m.scope ? `\n[active scope: ${m.scope}]` : ""),
      }));

    writeMsgs(sid, (m) => [...m, { id: uid(), role: "user", kind: "text", text: query }], isFirst ? { title: titleFrom(query) } : undefined);

    const botId = uid();
    let botText = ""; let botCreated = false;
    const queries: AiQuery[] = [];
    const upsertBot = (patch: Partial<AiMsg>) => writeMsgs(sid, (m) => {
      if (!botCreated) { botCreated = true; return [...m, { id: botId, role: "bot", kind: "text", text: botText, queries: [...queries], ...patch }]; }
      return m.map((x) => (x.id === botId ? { ...x, ...patch } : x));
    });
    const upsertBotText = (t: string) => { botText = t; upsertBot({ text: t }); };
    const appendMsg = (msg: AiMsg) => writeMsgs(sid, (m) => [...m, msg]);

    try {
      const res = await fetch(`${DASHBOARD_API_BASE_URL}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
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
          else if (ev.type === "answer") upsertBot({ text: ev.text || botText, verified: ev.verified ?? null, queries: [...queries], options: ev.options || [], scope: ev.scope || undefined });
          else if (ev.type === "clarify") upsertBot({ text: ev.text || "Could you clarify?", options: ev.options || [] });
          else if (ev.type === "chart" && ev.plotly) appendMsg({ id: uid(), role: "bot", kind: "plotly", figure: ev.plotly });
          else if (ev.type === "table" && ev.table) appendMsg({ id: uid(), role: "bot", kind: "table", table: { ...ev.table, note: ev.note } });
          else if (ev.type === "error") upsertBotText((botText ? botText + "\n\n" : "") + `⚠️ ${ev.text}`);
        }
      }
    } catch (e: any) {
      upsertBotText(botText || `⚠️ Couldn't reach the AI Analyst. ${e?.message || ""}`);
    } finally {
      busyRef.current = false; setBusy(false); setStep("");
      // nudge a persist now that we're idle
      commit((ss) => [...ss]);
    }
  }, [createSession, writeMsgs, commit]);

  const messages = sessions.find((s) => s.id === activeId)?.messages || [];

  return (
    <AiChatContext.Provider value={{ sessions, activeId, messages, busy, step, open, setOpen, send, newChat, switchSession, deleteSession, renameSession }}>
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const c = useContext(AiChatContext);
  if (!c) throw new Error("useAiChat must be used within AiChatProvider");
  return c;
}
