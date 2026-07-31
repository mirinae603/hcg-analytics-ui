"use client";
// Shared multi-session AI-Analyst state. One provider (mounted in the admin layout)
// backs both the floating assistant and the /ai page. Sessions and messages are now
// persisted on the backend (SQLite via app/api/chat.py) and are DELIBERATELY common
// to every signed-in user — any account can list, open, and continue any session,
// tagged with (not restricted by) who created it. The backend is the source of truth
// on load/refresh; a thin localStorage entry just remembers which tab was open so a
// page refresh reopens the same conversation instead of always landing on the newest.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/utils/api";
import { getUser } from "@/utils/auth";

const ACTIVE_KEY = "hcg_ai_active_session_v3"; // which tab was open — NOT chat content

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
  scope?: string;
};
export type SessionCreator = { id: number; name: string; email: string } | null;
export type AiSession = {
  id: string;
  title: string;
  messages: AiMsg[];
  createdAt: number;
  updatedAt: number;
  createdBy?: SessionCreator;
  messageCount?: number;
  /** true once `messages` reflects a real GET /chat/sessions/{id} fetch (not just list metadata) */
  loaded?: boolean;
};

type BackendMessage = { id: number; role: "user" | "assistant"; content: any; created_at: string };

type Ctx = {
  sessions: AiSession[];
  activeId: string;
  activeSession: AiSession | null;
  messages: AiMsg[];
  busy: boolean;
  step: string;
  open: boolean;
  loadingSessions: boolean;
  loadingActive: boolean;
  listError: string | null;
  currentUserId: number | null;
  setOpen: (v: boolean) => void;
  send: (q: string) => void;
  newChat: () => void;
  switchSession: (id: string) => void;
  refreshSessions: () => void;
};

const AiChatContext = createContext<Ctx | null>(null);
const uid = () => `tmp-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
const titleFrom = (q: string) => q.trim().replace(/\s+/g, " ").slice(0, 52) || "New chat";
const toMs = (iso?: string) => { const t = Date.parse(iso || ""); return Number.isNaN(t) ? Date.now() : t; };

// ---------- backend <-> frontend message/session shape mapping ----------

function assistantContentToMsgs(baseId: string, content: any): AiMsg[] {
  const c = content && typeof content === "object" ? content : { text: String(content ?? "") };
  const isError = c.kind === "error";
  let text: string = c.text || "";
  if (isError && text && !text.trim().startsWith("⚠️")) text = `⚠️ ${text}`;
  const out: AiMsg[] = [{
    id: `${baseId}-text`,
    role: "bot",
    kind: "text",
    text,
    // Backend now persists the orchestrator's own "ok" | "corrected" | "flagged" | null
    // signal verbatim — same shape the live SSE /ai/chat stream has always sent.
    verified: c.verified ?? null,
    options: c.options || [],
    queries: c.queries || [],
  }];
  if (c.chart) out.push({ id: `${baseId}-chart`, role: "bot", kind: "plotly", figure: c.chart });
  if (c.table) out.push({ id: `${baseId}-table`, role: "bot", kind: "table", table: c.table });
  return out;
}

function backendMsgToFrontend(m: BackendMessage): AiMsg[] {
  if (m.role === "user") {
    return [{ id: String(m.id), role: "user", kind: "text", text: typeof m.content === "string" ? m.content : String(m.content ?? "") }];
  }
  return assistantContentToMsgs(String(m.id), m.content);
}

function sessionListItemToLocal(s: any, existing?: AiSession): AiSession {
  return {
    id: String(s.id),
    title: s.title || "New chat",
    messages: existing?.loaded ? existing.messages : [],
    createdAt: existing?.createdAt ?? toMs(s.created_at),
    updatedAt: toMs(s.updated_at),
    createdBy: s.created_by || null,
    messageCount: s.message_count,
    loaded: existing?.loaded || false,
  };
}

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [open, setOpen] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingActive, setLoadingActive] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const sessionsRef = useRef<AiSession[]>([]);
  const activeRef = useRef<string>("");
  const busyRef = useRef(false);
  const currentUser = useRef(getUser());

  const commit = useCallback((updater: AiSession[] | ((s: AiSession[]) => AiSession[])) => {
    const next = typeof updater === "function" ? (updater as any)(sessionsRef.current) : updater;
    sessionsRef.current = next;
    setSessions(next);
  }, []);
  const setActive = useCallback((id: string) => {
    activeRef.current = id;
    setActiveId(id);
    try { if (id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY); } catch { /* noop */ }
  }, []);

  // ---- list of ALL sessions from every user — backend is the source of truth ----
  const refreshSessions = useCallback(async (): Promise<AiSession[]> => {
    setListError(null);
    try {
      const data = await apiFetch<{ sessions: any[] }>("/chat/sessions");
      const list = (data.sessions || []).map((s) => sessionListItemToLocal(s, sessionsRef.current.find((x) => x.id === String(s.id))));
      commit(list);
      return list;
    } catch (e) {
      setListError(e instanceof ApiError ? e.message : "Couldn't load conversations. Please try again.");
      return sessionsRef.current;
    }
  }, [commit]);

  // one-time bootstrap: load the list, then restore whichever tab was open last
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSessions(true);
      const list = await refreshSessions();
      if (cancelled) return;
      let restore = "";
      try { restore = localStorage.getItem(ACTIVE_KEY) || ""; } catch { /* noop */ }
      if (!list.find((s) => s.id === restore)) restore = list[0]?.id || "";
      if (restore) setActive(restore);
      setLoadingSessions(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- fetch a session's full message history the first time it's opened (any user's) ----
  const ensureLoaded = useCallback(async (id: string) => {
    const sess = sessionsRef.current.find((s) => s.id === id);
    if (!sess || sess.loaded) return;
    setLoadingActive(true);
    try {
      const detail = await apiFetch<{ id: number; title: string; created_by: any; messages: BackendMessage[] }>(`/chat/sessions/${id}`);
      const msgs = (detail.messages || []).flatMap(backendMsgToFrontend);
      commit((ss) => ss.map((s) => (s.id === id ? { ...s, messages: msgs, title: detail.title || s.title, createdBy: detail.created_by || s.createdBy, loaded: true } : s)));
    } catch {
      // Leave unloaded rather than throw — switching away and back tries again, which
      // beats a hard error for what's usually just a transient network blip.
    } finally {
      setLoadingActive(false);
    }
  }, [commit]);

  useEffect(() => { if (activeId) ensureLoaded(activeId); }, [activeId, ensureLoaded]);

  const createSession = useCallback(async (): Promise<string> => {
    const detail = await apiFetch<{ id: number; title: string; created_by: any }>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const sess: AiSession = {
      id: String(detail.id), title: detail.title || "New chat", messages: [],
      createdAt: Date.now(), updatedAt: Date.now(),
      createdBy: detail.created_by || null, messageCount: 0, loaded: true,
    };
    commit((ss) => [sess, ...ss]);
    setActive(sess.id);
    return sess.id;
  }, [commit, setActive]);

  const newChat = useCallback(() => {
    const cur = sessionsRef.current.find((s) => s.id === activeRef.current);
    if (cur && cur.loaded && cur.messages.length === 0) { setOpen(true); return; }
    createSession().catch(() => setListError("Couldn't start a new chat — please try again."));
  }, [createSession]);

  const switchSession = useCallback((id: string) => {
    if (sessionsRef.current.find((s) => s.id === id)) setActive(id);
  }, [setActive]);

  const writeMsgs = useCallback((sid: string, updater: (m: AiMsg[]) => AiMsg[], meta?: Partial<AiSession>) => {
    commit((ss) => ss.map((s) => (s.id === sid ? { ...s, messages: updater(s.messages), updatedAt: Date.now(), ...(meta || {}) } : s)));
  }, [commit]);

  const send = useCallback(async (q: string) => {
    const query = q.trim();
    if (!query || busyRef.current) return;
    busyRef.current = true; setBusy(true); setStep("Consulting HCG data");

    let sid = activeRef.current;
    if (!sid || !sessionsRef.current.find((s) => s.id === sid)) {
      try { sid = await createSession(); } catch {
        busyRef.current = false; setBusy(false); setStep("");
        setListError("Couldn't start a new chat — please try again.");
        return;
      }
    }
    const sess = sessionsRef.current.find((s) => s.id === sid);
    const isFirst = !sess || sess.messages.length === 0;

    const optimisticId = uid();
    writeMsgs(sid, (m) => [...m, { id: optimisticId, role: "user", kind: "text", text: query }], isFirst ? { title: titleFrom(query) } : undefined);

    try {
      const res = await apiFetch<{ user_message: BackendMessage; assistant_message: BackendMessage }>(`/chat/sessions/${sid}/messages`, {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      const assistantMsgs = backendMsgToFrontend(res.assistant_message);
      writeMsgs(sid, (m) => {
        const withReal = m.map((x) => (x.id === optimisticId ? { id: String(res.user_message.id), role: "user" as const, kind: "text" as const, text: query } : x));
        return [...withReal, ...assistantMsgs];
      });
    } catch (e) {
      writeMsgs(sid, (m) => [...m, {
        id: uid(), role: "bot", kind: "text",
        text: `⚠️ Couldn't reach the AI Analyst. ${e instanceof ApiError ? e.message : ""}`.trim(),
      }]);
    } finally {
      busyRef.current = false; setBusy(false); setStep("");
      refreshSessions();
    }
  }, [createSession, writeMsgs, refreshSessions]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const messages = activeSession?.messages || [];

  return (
    <AiChatContext.Provider value={{
      sessions, activeId, activeSession, messages, busy, step, open,
      loadingSessions, loadingActive, listError,
      currentUserId: currentUser.current?.id ?? null,
      setOpen, send, newChat, switchSession, refreshSessions,
    }}>
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const c = useContext(AiChatContext);
  if (!c) throw new Error("useAiChat must be used within AiChatProvider");
  return c;
}
