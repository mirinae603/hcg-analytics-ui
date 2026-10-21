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
/** How long a FAST turn may go without a single event before it is called hung. Every step,
 *  token and query re-arms it (so would a backend heartbeat, if one is ever sent). It has to
 *  outlast the longest silence a live fast turn can produce, and the backend's 120 s turn
 *  deadline is no bound on that: it only stops a NEW tool round from starting. One model call
 *  inside a round retries silently, four attempts of up to 60 s plus back-off sleeps of up to
 *  20 s, about 300 s; a stream that dies before its first word adds one 60 s chunk timeout
 *  before the fallback call starts. At 180 s this cut off turns that would have finished, and
 *  the cost was the whole answer: the backend saves the reply only when the turn completes,
 *  so the disconnect threw it away and "Try again" ran the turn from the start. Deep turns
 *  are not watched at all (see send()). */
const IDLE_MS = 420 * 1000;

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
  /** When this message was created, ms epoch. Persisted messages carry the backend's
   *  `created_at`; live ones are stamped as they arrive. Used to timestamp each turn so a
   *  long conversation can be navigated by when things were asked. */
  at?: number;
  /** The turn failed (backend error, dropped connection, no response). Shows a visible
   *  "Try again" — the only retry used to be a hover-only Regenerate. */
  error?: boolean;
  /** The page the question was asked from (live turns only; the backend does not store it). */
  ctx?: AiPageContext;
  /** The id this user message was first drawn with. The backend's real id replaces `id`
   *  mid-turn; keying the turn on this instead stops that swap from remounting it. */
  cid?: string;
};

/** What the user is looking at when they ask, sent with the question as `context`. The
 *  backend (chat.py PageContext) whitelists exactly these keys and treats them as soft
 *  defaults for the Jun–Aug 2026 report tools only, so a sales question asked from the
 *  Formulary page is not clamped to a month the sales tables do not have. */
export type AiPageContext = {
  page: "formulary" | "spend";
  label: string;
  section?: string;
  view?: string;
  month?: string;
  monthLabel?: string;
  plant?: string;
  hospital?: string;
  filters?: { type?: string; segment?: string; payer?: string; method?: string };
};

// The backend validates every context string against ^[A-Za-z0-9 ()&·,.:/_+-]{1,80}$ (filter
// values 40) and rejects the whole request when one fails. Hospital names and month spans
// come from data ("Jun-26 – Aug-26" has an en dash), so they are cleaned here rather than
// trusted to fit: a hint must never be the reason a question fails.
const CTX_BAD = /[^A-Za-z0-9 ()&·,.:\/_+-]/g;
function ctxText(v: unknown, max: number, span = false): string | undefined {
  if (typeof v !== "string") return undefined;
  // a month span reads "Jun-26 to Aug-26"; anywhere else a dash stays a dash
  const t = span ? v.replace(/\s+[–—]\s+/g, " to ") : v;
  const s = t.replace(/[–—]/g, "-").replace(/['’]/g, "").replace(CTX_BAD, " ")
    .replace(/\s+/g, " ").trim().slice(0, max).trim();
  return s || undefined;
}
function cleanPageContext(c: AiPageContext): AiPageContext {
  const out: AiPageContext = { page: c.page, label: ctxText(c.label, 80) || (c.page === "formulary" ? "Formulary compliance" : "Spend analysis") };
  for (const k of ["section", "view", "month", "monthLabel", "plant", "hospital"] as const) {
    const v = ctxText(c[k], 80, k === "monthLabel");
    if (v) out[k] = v;
  }
  if (c.filters) {
    const f: NonNullable<AiPageContext["filters"]> = {};
    for (const k of ["type", "segment", "payer", "method"] as const) {
      const v = ctxText(c.filters[k], 40);
      if (v) f[k] = v;
    }
    if (Object.keys(f).length) out.filters = f;
  }
  return out;
}
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
  /** Resolves false when the question never left (no session could be created), so the
   *  composer can give the user their text back instead of silently losing it. */
  send: (q: string) => Promise<boolean>;
  /** The page the user is on, unless they removed it with the pill's ×. */
  pageContext: AiPageContext | null;
  dismissPageContext: () => void;
  /** false = the single-pass fast path; true = the deep reasoning engine. */
  deep: boolean;
  setDeep: (v: boolean) => void;
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
/** The page-context setter on its own, stable context. Pages publish through this; reading
 *  it from the main context would re-render the whole Formulary page on every streamed
 *  token, because that value changes each frame while an answer is written. */
const AiPageContextSetter = createContext<((c: AiPageContext | null) => void) | null>(null);
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
    error: isError,
  }];
  if (c.chart) out.push({ id: `${baseId}-chart`, role: "bot", kind: "plotly", figure: c.chart });
  if (c.table) out.push({ id: `${baseId}-table`, role: "bot", kind: "table", table: c.table });
  return out;
}

function backendMsgToFrontend(m: BackendMessage): AiMsg[] {
  if (m.role === "user") {
    return [{ id: String(m.id), role: "user", kind: "text", text: typeof m.content === "string" ? m.content : String(m.content ?? ""), at: toMs((m as any).created_at) }];
  }
  const at = toMs((m as any).created_at);
  return assistantContentToMsgs(String(m.id), m.content).map((x) => ({ ...x, at }));
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
  // Remembered across reloads: an analyst who works in deep mode should not have to
  // re-arm it every visit, and it changes the cost and latency of every question enough
  // that it must be visibly, deliberately set rather than silently defaulted each time.
  const [deep, setDeepState] = useState(false);
  useEffect(() => { try { setDeepState(localStorage.getItem("hcg_ai_deep") === "1"); } catch { /* private mode */ } }, []);
  const setDeep = useCallback((v: boolean) => {
    setDeepState(v);
    try { localStorage.setItem("hcg_ai_deep", v ? "1" : "0"); } catch { /* private mode */ }
  }, []);
  const deepRef = useRef(false);
  deepRef.current = deep;

  /** Buffer + frame handle for the paced token stream (see the `answer_delta` branch). */
  const pendingRef = useRef("");
  const rafRef = useRef<number | null>(null);
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);
  const [activeId, setActiveId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  // Live work log for the turn in flight, saved onto the answer's `trace`. `step` is the
  // single most-recent line the UI shows. A ref, not state: nothing renders the list while
  // it grows, and as state it cost a provider re-render per step.
  const traceRef = useRef<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingActive, setLoadingActive] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // The page context. Dismissing it (the pill's ×) hides THIS context only: moving to
  // another month, view or hospital is a new context and is offered again.
  const [pageCtxRaw, setPageCtxRaw] = useState<AiPageContext | null>(null);
  const [dismissedKey, setDismissedKey] = useState("");
  const ctxKey = pageCtxRaw ? JSON.stringify(pageCtxRaw) : "";
  const pageContext = pageCtxRaw && dismissedKey !== ctxKey ? pageCtxRaw : null;
  const pageCtxRef = useRef<AiPageContext | null>(null);
  pageCtxRef.current = pageContext;
  const setPageContext = useCallback((c: AiPageContext | null) => setPageCtxRaw(c ? cleanPageContext(c) : null), []);
  const dismissPageContext = useCallback(() => setDismissedKey(ctxKey), [ctxKey]);

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

  // `touch` = false for the token drain: bumping updatedAt sixty times a second re-sorted
  // and regrouped the whole sessions rail on every frame for no visible change.
  const writeMsgs = useCallback((sid: string, updater: (m: AiMsg[]) => AiMsg[], meta?: Partial<AiSession>, touch = true) => {
    commit((ss) => ss.map((s) => (s.id === sid ? { ...s, messages: updater(s.messages), ...(touch ? { updatedAt: Date.now() } : {}), ...(meta || {}) } : s)));
  }, [commit]);

  // Streams POST .../messages/stream (chat.py) instead of blocking on the plain JSON
  // route: step/sql events update `step` live instead of one frozen label for the whole
  // turn, and the answer/chart/table bubbles appear progressively as each is ready
  // rather than all at once at the end. The final "persisted" event carries the exact
  // same shape post_message used to return synchronously, so it's fed through the same
  // backendMsgToFrontend() the non-streaming path (and page reload) already use — one
  // rendering path for a session's messages regardless of how they arrived.
  const send = useCallback(async (q: string): Promise<boolean> => {
    const query = q.trim();
    if (!query || busyRef.current) return false;
    busyRef.current = true; setBusy(true); setStep("Consulting HCG data");
    // Captured now: the user may navigate away from the page while the answer streams.
    const ctx = pageCtxRef.current;
    // Captured now too: flipping Deep mid-turn must not change how this turn is sent or watched.
    const mode = deepRef.current ? "deep" : "fast";

    let sid = activeRef.current;
    if (!sid || !sessionsRef.current.find((s) => s.id === sid)) {
      try { sid = await createSession(); } catch {
        busyRef.current = false; setBusy(false); setStep("");
        setListError("Couldn't start a new chat — please try again.");
        return false;
      }
    }
    const sess = sessionsRef.current.find((s) => s.id === sid);
    const isFirst = !sess || sess.messages.length === 0;

    const optimisticId = uid();
    writeMsgs(sid, (m) => [...m, { id: optimisticId, role: "user", kind: "text", text: query, at: Date.now(), ctx: ctx ?? undefined }], isFirst ? { title: titleFrom(query) } : undefined);
    if (isFirst) {
      // PERSIST the auto-title, don't just set it locally. It was only ever written to
      // local state, so the backend kept its "New Chat" default and every row in the
      // sidebar read "New Chat" the moment anyone reloaded — a conversation list you
      // cannot navigate. Fire-and-forget: a failed title must never block the answer,
      // and the backend deliberately preserves updated_at on rename so this cannot
      // reorder the list on its own.
      apiFetch(`/chat/sessions/${sid}`, { method: "PATCH", body: JSON.stringify({ title: titleFrom(query) }) })
        .catch(() => { /* keeps the optimistic local title; harmless */ });
    }

    // Ids this turn draws provisionally, so the "persisted" event can cleanly swap them
    // for the canonical set instead of duplicating (both are appended, never one over
    // the other — see the "persisted" branch below).
    pendingRef.current = "";
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const turnBaseId = uid();
    const textId = `${turnBaseId}-text`;
    const turnMsgIds = new Set<string>();
    const turnQueries: AiQuery[] = [];
    traceRef.current = [];
    const ac = new AbortController();
    abortRef.current = ac;

    // Idle watchdog, FAST turns only. A hung model call used to show "Thinking" until the
    // user pressed Stop. Every event re-arms it, so only a stream that says nothing at all
    // for IDLE_MS is cut off. Deep turns are left alone: a deep wave runs up to six
    // sub-questions at once, each several model calls, and reports nothing until the whole
    // wave is done, so a perfectly live deep analysis can be silent for many minutes and
    // no fixed limit tells it apart from a hung one. Cutting it off lost the answer (see
    // IDLE_MS); Stop still ends one on demand.
    let idle: ReturnType<typeof setTimeout> | null = null;
    const arm = mode === "deep"
      ? () => {}
      : () => { if (idle) clearTimeout(idle); idle = setTimeout(() => ac.abort("idle"), IDLE_MS); };
    arm();

    // A bot text message for this turn: replace it when it already exists (tokens may have
    // streamed into it), else append. Pushing a second message with the same id gave two
    // React siblings one key until the persisted event cleaned it up.
    const putText = (fields: Omit<Partial<AiMsg>, "id" | "role" | "kind">) => {
      if (turnMsgIds.has(textId)) {
        writeMsgs(sid, (m) => m.map((x) => (x.id === textId ? { ...x, ...fields, streaming: false } : x)));
      } else {
        turnMsgIds.add(textId);
        writeMsgs(sid, (m) => [...m, { id: textId, role: "bot", kind: "text", ...fields }]);
      }
    };
    const stopDrain = () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      pendingRef.current = "";
    };

    const onEvent = (ev: any) => {
      arm();
      const t = ev.type;
      if (t === "user_message" && ev.message?.id != null) {
        const realId = String(ev.message.id);
        writeMsgs(sid, (m) => m.map((x) => (x.id === optimisticId ? { ...x, id: realId, cid: x.cid ?? x.id } : x)));
      } else if (t === "step") {
        setStep(ev.text || "");
        // ACCUMULATE, don't overwrite. The backend narrates real work — "Locating
        // KEYTRUDA across all tables", the purpose of each query it runs — and this
        // used to throw every line away the moment the next arrived, leaving one
        // rotating label standing in for 6-10s of genuine activity. Keeping them lets
        // the wait show what was actually done, which is also the honest answer to
        // "where did this number come from".
        const prev = traceRef.current;
        if (ev.text && prev[prev.length - 1] !== ev.text) traceRef.current = [...prev, ev.text];
      } else if (t === "answer_delta") {
        // Real token streaming, PACED. Writing each delta straight to state as it lands
        // makes the text arrive in visible clumps: the model emits a whole clause in one
        // network chunk and then pauses, so React renders a burst, nothing, a burst. The
        // deltas go into a buffer and one animation frame drains a slice of it, which
        // turns the same tokens into an even, readable rate. It drains proportionally
        // (an eighth of the backlog, minimum two characters) so a fast stream never falls
        // behind — it just types faster.
        const id = textId;
        pendingRef.current += ev.text || "";
        if (!turnMsgIds.has(id)) {
          turnMsgIds.add(id);
          setStep("");
          writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "text", text: "", streaming: true, at: Date.now() }]);
        }
        // Nobody is watching a hidden tab, and rAF does not run in one — pacing there
        // would just stall the text until the tab came back. Write it straight through.
        if (typeof document !== "undefined" && document.hidden) {
          const all = pendingRef.current; pendingRef.current = "";
          writeMsgs(sid, (m) => m.map((x) => (x.id === id ? { ...x, text: (x.text || "") + all } : x)), undefined, false);
        } else if (rafRef.current == null) {
          const drain = () => {
            const buf = pendingRef.current;
            if (!buf) { rafRef.current = null; return; }
            const take = Math.max(2, Math.ceil(buf.length / 8));
            const slice = buf.slice(0, take);
            pendingRef.current = buf.slice(take);
            writeMsgs(sid, (m) => m.map((x) => (x.id === id ? { ...x, text: (x.text || "") + slice } : x)), undefined, false);
            rafRef.current = requestAnimationFrame(drain);
          };
          rafRef.current = requestAnimationFrame(drain);
        }
      } else if (t === "answer_reset") {
        // the stream died and the non-streaming path is retrying — drop the partial so
        // the retry does not append onto half a sentence
        stopDrain();
        turnMsgIds.delete(textId);
        writeMsgs(sid, (m) => m.filter((x) => x.id !== textId));
      } else if (t === "sql") {
        // the queries the answer rests on — previously captured here and discarded,
        // then hardcoded to [] on the answer below, so the "N queries run" disclosure
        // never had anything to disclose on a live turn
        turnQueries.push({ sql: ev.sql || "", purpose: ev.purpose || "", rows: ev.rows ?? undefined });
      } else if (t === "answer") {
        // whatever is still buffered is superseded by the authoritative text below:
        // `text` has been through the sanitizer and any post-hoc correction, so it
        // replaces the accumulated deltas, and the badge/queries the stream could not
        // carry are attached to it
        stopDrain();
        setStep("");
        putText({
          text: ev.text || "",
          verified: ev.verified ?? null, options: ev.options || [],
          queries: turnQueries.slice(), trace: traceRef.current.slice(),
          streaming: false,
        });
      } else if (t === "followups" && Array.isArray(ev.options) && ev.options.length) {
        // The better follow-ups are written by a separate model call after the answer;
        // show them as soon as they exist instead of waiting for "persisted" to swap them in.
        writeMsgs(sid, (m) => m.map((x) => (x.id === textId ? { ...x, options: ev.options } : x)));
      } else if (t === "chart" && ev.plotly) {
        const id = `${turnBaseId}-chart`; turnMsgIds.add(id);
        writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "plotly", figure: ev.plotly }]);
      } else if (t === "table" && ev.table) {
        const id = `${turnBaseId}-table`; turnMsgIds.add(id);
        writeMsgs(sid, (m) => [...m, { id, role: "bot", kind: "table", table: { ...ev.table, note: ev.note || "" } }]);
      } else if (t === "clarify") {
        stopDrain();
        setStep("");
        putText({ text: ev.text || "", options: ev.options || [] });
      } else if (t === "error") {
        // An error after tokens streamed replaces the partial answer (it is not one), and
        // the drain must stop first or it keeps typing the old tokens onto the error.
        stopDrain();
        setStep("");
        const raw = ev.text || "Something went wrong answering that.";
        putText({ text: raw.trim().startsWith("⚠️") ? raw : `⚠️ ${raw}`, error: true });
      } else if (t === "persisted" && ev.assistant_message) {
        // Swap in the canonical messages but KEEP the live ids and the live chart/table
        // objects. New ids changed every React key in the turn, so the chart was purged
        // and redrawn from an empty div and the table lost its scroll position — a flash
        // and a jump at the end of every answer.
        const canonical = backendMsgToFrontend(ev.assistant_message);
        writeMsgs(sid, (m) => {
          const live = m.filter((x) => turnMsgIds.has(x.id));
          const byKind = new Map(live.map((x) => [x.kind, x] as const));
          const merged = canonical.map((c) => {
            const l = byKind.get(c.kind);
            return l ? { ...c, id: l.id, figure: l.figure ?? c.figure, table: l.table ?? c.table } : c;
          });
          return [...m.filter((x) => !turnMsgIds.has(x.id)), ...merged];
        });
      }
      // "sql"/"done" don't draw their own bubble — sql detail rides along inside the
      // persisted content's `queries`.
    };

    const url = `/chat/sessions/${sid}/messages/stream`;
    try {
      try {
        await streamFetch(url, { query, mode, ...(ctx ? { context: ctx } : {}) }, onEvent, ac.signal);
      } catch (e) {
        // A backend that rejects the page context answers 422 before a single event is
        // sent. The question itself is fine, so ask it again without the hint rather than
        // fail the turn over it.
        if (!(ctx && e instanceof ApiError && e.status === 422)) throw e;
        await streamFetch(url, { query, mode }, onEvent, ac.signal);
      }
    } catch (e) {
      if (ac.signal.aborted && ac.signal.reason === "idle") {
        writeMsgs(sid, (m) => [...m, {
          id: uid(), role: "bot", kind: "text", error: true,
          text: "⚠️ The AI Analyst stopped responding. Please try again.",
        }]);
      } else if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        // stop() was called — note the turn was cut short rather than pretending it
        // finished; whatever partial bubbles already streamed in stay exactly as-is.
        writeMsgs(sid, (m) => [...m, { id: uid(), role: "bot", kind: "text", text: "_Stopped._" }]);
      } else {
        writeMsgs(sid, (m) => [...m, {
          id: uid(), role: "bot", kind: "text", error: true,
          text: `⚠️ Couldn't reach the AI Analyst. ${e instanceof ApiError ? e.message : ""}`.trim(),
        }]);
      }
    } finally {
      if (idle) clearTimeout(idle);
      // A turn can end without its "answer" event: Stop, a dropped connection, an error
      // after tokens started. Whatever is still marked streaming is finished now. Flush
      // the paced buffer into it and clear the flag, or the caret blinks forever and the
      // footer (Copy, Export, Try again) never appears for exactly the turn that needs it.
      const rest = pendingRef.current;
      stopDrain();
      if (sessionsRef.current.find((s) => s.id === sid)?.messages.some((x) => x.streaming)) {
        writeMsgs(sid, (m) => m.map((x) => (x.streaming ? { ...x, text: (x.text || "") + (x.id === textId ? rest : ""), streaming: false } : x)), undefined, false);
      }
      busyRef.current = false; setBusy(false); setStep("");
      abortRef.current = null;
      refreshSessions();
    }
    return true;
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
    if (lastUser?.text) void send(lastUser.text);
  }, [send]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const messages = activeSession?.messages || [];

  return (
    <AiChatContext.Provider value={{
      sessions, activeId, activeSession, messages, busy, step, open,
      loadingSessions, loadingActive, listError,
      currentUserId: currentUser.current?.id ?? null,
      deep, setDeep,
      setOpen, send, stop, newChat, switchSession, refreshSessions,
      deleteSession, renameSession, regenerate,
      pageContext, dismissPageContext,
    }}>
      <AiPageContextSetter.Provider value={setPageContext}>
        {children}
      </AiPageContextSetter.Provider>
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const c = useContext(AiChatContext);
  if (!c) throw new Error("useAiChat must be used within AiChatProvider");
  return c;
}

/** Publish what this page is showing to the AI Analyst while it is mounted (null = nothing
 *  worth sending yet). Keyed on the content, so a new object with the same values each
 *  render does not churn; unmounting clears it, so leaving the page leaves no stale hint.
 *  Call it before any early return: it is a hook. */
export function useAiPageContext(ctx: AiPageContext | null) {
  const set = useContext(AiPageContextSetter);
  const key = ctx ? JSON.stringify(ctx) : "";
  useEffect(() => {
    if (!set) return;
    set(ctx);
    return () => set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, set]);
}
