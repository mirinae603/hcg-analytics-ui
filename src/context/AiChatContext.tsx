"use client";
// Shared multi-session AI-Analyst state. One provider (mounted in the admin layout)
// backs both the floating assistant and the /ai page. Sessions and messages are now
// persisted on the backend (SQLite via app/api/chat.py) and are DELIBERATELY common
// to every signed-in user — any account can list, open, and continue any session,
// tagged with (not restricted by) who created it. The backend is the source of truth
// on load/refresh; a thin localStorage entry just remembers which tab was open so a
// page refresh reopens the same conversation instead of always landing on the newest.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiFetch, streamFetch, ApiError } from "@/utils/api";
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
  /** the work the assistant actually did for this turn, in order */
  trace?: string[];
  /** true while tokens are still arriving for this message */
  streaming?: boolean;
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
  trace: string[];
  open: boolean;
  loadingSessions: boolean;
  loadingActive: boolean;
  listError: string | null;
  currentUserId: number | null;
  setOpen: (v: boolean) => void;
  send: (q: string) => void;
  stop: () => void;
  newChat: () => void;
  switchSession: (id: string) => void;
  refreshSessions: () => void;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  /** Re-send the last user turn in the active session as a brand-new turn (does not
   *  edit or remove the previous assistant reply — matches ChatGPT's own "regenerate",
   *  which appends rather than overwrites). No-op if the last turn isn't a bot reply. */
  regenerate: () => void;
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
  // Live work log for the turn in flight. `step` remains the single most-recent line
  // (existing callers depend on it); `trace` is the accumulated list the UI now shows.
  const [trace, setTrace] = useState<string[]>([]);
  const traceRef = useRef<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingActive, setLoadingActive] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => { traceRef.current = trace; }, [trace]);

  const sessionsRef = useRef<AiSession[]>([]);
  const activeRef = useRef<string>("");
  const busyRef = useRef(false);
  const currentUser = useRef(getUser());
  /** The in-flight turn's AbortController, if any — stop() aborts this; a fresh send()
   *  replaces it. Null whenever nothing is streaming. */
  const abortRef = useRef<AbortController | null>(null);

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

  // "Chat is common" (AiSessions.tsx / backend chat.py): any signed-in user can delete
  // any session, same as they can already list/open/post to it — not scoped to "your
  // own", by the app's own existing design, not a new gap introduced here.
  const deleteSession = useCallback(async (id: string) => {
    await apiFetch(`/chat/sessions/${id}`, { method: "DELETE" });
    commit((ss) => ss.filter((s) => s.id !== id));
    if (activeRef.current === id) {
      // The deleted session may have been open in another tab/user too — fall back to
      // whatever is now first (most-recent) rather than leaving a dangling active id
      // that no longer resolves to anything in the list.
      setActive(sessionsRef.current[0]?.id || "");
    }
  }, [commit, setActive]);

  const renameSession = useCallback(async (id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    const prevTitle = sessionsRef.current.find((s) => s.id === id)?.title;
    commit((ss) => ss.map((s) => (s.id === id ? { ...s, title: clean } : s))); // optimistic
    try {
      await apiFetch(`/chat/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ title: clean }) });
    } catch (e) {
      // Revert on failure — an optimistic rename that silently fails to persist would
      // look successful locally and then reappear under the old title on next refresh.
      commit((ss) => ss.map((s) => (s.id === id ? { ...s, title: prevTitle ?? s.title } : s)));
      throw e;
    }
  }, [commit]);

  const writeMsgs = useCallback((sid: string, updater: (m: AiMsg[]) => AiMsg[], meta?: Partial<AiSession>) => {
    commit((ss) => ss.map((s) => (s.id === sid ? { ...s, messages: updater(s.messages), updatedAt: Date.now(), ...(meta || {}) } : s)));
  }, [commit]);

  // Streams POST .../messages/stream (chat.py) instead of blocking on the plain JSON
  // route: step/sql events update `step` live instead of one frozen label for the whole
  // turn, and the answer/chart/table bubbles appear progressively as each is ready
  // rather than all at once at the end. The final "persisted" event carries the exact
  // same shape post_message used to return synchronously, so it's fed through the same
  // backendMsgToFrontend() the non-streaming path (and page reload) already use — one
  // rendering path for a session's messages regardless of how they arrived.
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

    // Ids this turn draws provisionally, so the "persisted" event can cleanly swap them
    // for the canonical set instead of duplicating (both are appended, never one over
    // the other — see the "persisted" branch below).
    const turnBaseId = uid();
    const turnMsgIds = new Set<string>();
    const turnQueries: AiQuery[] = [];
    setTrace([]); traceRef.current = [];
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await streamFetch(`/chat/sessions/${sid}/messages/stream`, { query }, (ev) => {
        const t = ev.type;
        if (t === "user_message" && ev.message?.id != null) {
          const realId = String(ev.message.id);
          writeMsgs(sid, (m) => m.map((x) => (x.id === optimisticId ? { ...x, id: realId } : x)));
        } else if (t === "step") {
          setStep(ev.text || "");
          // ACCUMULATE, don't overwrite. The backend narrates real work — "Locating
          // KEYTRUDA across all tables", the purpose of each query it runs — and this
          // used to throw every line away the moment the next arrived, leaving one
          // rotating label standing in for 6-10s of genuine activity. Keeping them lets
          // the wait show what was actually done, which is also the honest answer to
          // "where did this number come from".
          if (ev.text) setTrace((prev) => (prev[prev.length - 1] === ev.text ? prev : [...prev, ev.text]));
        } else if (t === "answer_delta") {
          // Real token streaming. The first delta creates the bot message; the rest append
          // to it, so the answer is written into the transcript as the model produces it.
          const id = `${turnBaseId}-text`;
          if (!turnMsgIds.has(id)) {
            turnMsgIds.add(id);
            setStep("");
            writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "text", text: ev.text || "", streaming: true }]);
          } else {
            writeMsgs(sid, (m) => m.map((x) => (x.id === id ? { ...x, text: (x.text || "") + (ev.text || "") } : x)));
          }
        } else if (t === "answer_reset") {
          // the stream died and the non-streaming path is retrying — drop the partial so
          // the retry does not append onto half a sentence
          const id = `${turnBaseId}-text`;
          turnMsgIds.delete(id);
          writeMsgs(sid, (m) => m.filter((x) => x.id !== id));
        } else if (t === "sql") {
          // the queries the answer rests on — previously captured here and discarded,
          // then hardcoded to [] on the answer below, so the "N queries run" disclosure
          // never had anything to disclose on a live turn
          turnQueries.push({ sql: ev.sql || "", purpose: ev.purpose || "", rows: ev.rows ?? undefined });
        } else if (t === "answer") {
          setStep("");
          const id = `${turnBaseId}-text`;
          const text: string = ev.text || "";
          const meta = {
            verified: ev.verified ?? null, options: ev.options || [],
            queries: turnQueries.slice(), trace: traceRef.current.slice(),
            streaming: false,
          };
          if (turnMsgIds.has(id)) {
            // finalise what streamed: `text` is authoritative (it has been through the
            // sanitizer and any post-hoc correction), so replace rather than trust the
            // accumulated deltas, then attach the badge/queries the stream could not carry
            writeMsgs(sid, (m) => m.map((x) => (x.id === id ? { ...x, text, ...meta } : x)));
          } else {
            turnMsgIds.add(id);
            writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "text", text, ...meta }]);
          }
        } else if (t === "chart" && ev.plotly) {
          const id = `${turnBaseId}-chart`; turnMsgIds.add(id);
          writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "plotly", figure: ev.plotly }]);
        } else if (t === "table" && ev.table) {
          const id = `${turnBaseId}-table`; turnMsgIds.add(id);
          writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "table", table: { ...ev.table, note: ev.note || "" } }]);
        } else if (t === "clarify") {
          setStep("");
          const id = `${turnBaseId}-text`; turnMsgIds.add(id);
          writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "text", text: ev.text || "", options: ev.options || [] }]);
        } else if (t === "error") {
          setStep("");
          const id = `${turnBaseId}-text`; turnMsgIds.add(id);
          const raw = ev.text || "Something went wrong answering that.";
          const text = raw.trim().startsWith("⚠️") ? raw : `⚠️ ${raw}`;
          writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "text", text }]);
        } else if (t === "persisted" && ev.assistant_message) {
          const canonical = backendMsgToFrontend(ev.assistant_message);
          writeMsgs(sid, (m) => [...m.filter((x) => !turnMsgIds.has(x.id)), ...canonical]);
        }
        // "sql"/"followups"/"done" don't draw their own bubble — sql detail rides along
        // inside the persisted content's `queries`, and followups piggyback on "answer".
      }, ac.signal);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // stop() was called — note the turn was cut short rather than pretending it
        // finished; whatever partial bubbles already streamed in stay exactly as-is.
        writeMsgs(sid, (m) => [...m, { id: uid(), role: "bot", kind: "text", text: "_Stopped._" }]);
      } else {
        writeMsgs(sid, (m) => [...m, {
          id: uid(), role: "bot", kind: "text",
          text: `⚠️ Couldn't reach the AI Analyst. ${e instanceof ApiError ? e.message : ""}`.trim(),
        }]);
      }
    } finally {
      busyRef.current = false; setBusy(false); setStep("");
      abortRef.current = null;
      refreshSessions();
    }
  }, [createSession, writeMsgs, refreshSessions]);

  const stop = useCallback(() => { abortRef.current?.abort(); }, []);

  const regenerate = useCallback(() => {
    if (busyRef.current) return;
    const sess = sessionsRef.current.find((s) => s.id === activeRef.current);
    if (!sess || sess.messages.length === 0) return;
    const last = sess.messages[sess.messages.length - 1];
    // Only makes sense right after a bot turn finished — regenerating mid-conversation
    // (last message is the user's own, still unanswered) has nothing to redo yet.
    if (last.role !== "bot") return;
    const lastUser = [...sess.messages].reverse().find((m) => m.role === "user");
    if (lastUser?.text) send(lastUser.text);
  }, [send]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const messages = activeSession?.messages || [];

  return (
    <AiChatContext.Provider value={{
      sessions, activeId, activeSession, messages, busy, step, trace, open,
      loadingSessions, loadingActive, listError,
      currentUserId: currentUser.current?.id ?? null,
      setOpen, send, stop, newChat, switchSession, refreshSessions,
      deleteSession, renameSession, regenerate,
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
