"use client";
// The AI Analyst sidebar: brand → New chat → search → the conversations. Nothing else.
//
// It briefly carried section links (Inventory, Procurement, Consumption, Forecasting) and a
// "Checked answers" card. Both are gone: the app already has an icon rail one column to the
// left with exactly those destinations, so this was a second, differently-styled copy of
// the same navigation sitting right beside it — and the card was a poster, not a control.
// A chat sidebar lists chats. The signed-in-user chip went the same way, for the same
// reason: the icon rail already ends in an account button, one column to the left.
//
// One deliberate constraint: no coloured accents. Charcoal is the only primary here, which
// keeps colour available to mean something when it does appear.
import React, { useEffect, useRef, useState } from "react";
import {
  TbPlus, TbMessage2, TbUserCircle, TbRefresh, TbAlertTriangle, TbDots, TbPencil, TbTrash,
  TbCheck, TbX, TbSearch, TbChevronDown, TbLayoutSidebar,
} from "react-icons/tb";
import { useAiChat, AiSession } from "@/context/AiChatContext";
import { T, EASE } from "./theme";
import GlobalStyle from "./GlobalStyle";

function groupLabel(ts: number): string {
  const d = new Date(ts); const now = new Date();
  const day = (a: Date) => new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const diff = (day(now) - day(d)) / 86400000;
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Previous 7 days";
  if (diff <= 30) return "Previous 30 days";
  return "Older";
}

// Chat is shared: every logged-in user sees every session here, labeled with who
// started it (that's the point — "You" for your own, the other person's name otherwise).
function creatorLabel(s: AiSession, currentUserId: number | null): string {
  if (!s.createdBy) return "Unknown user";
  if (currentUserId != null && s.createdBy.id === currentUserId) return "You";
  return s.createdBy.name || s.createdBy.email || "Unknown user";
}

/** Hover "⋯" menu → Rename (inline edit) + Delete (confirm). */
function SessionMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((v) => !v)} title="Conversation options"
        className="ai-iconbtn w-6 h-6 flex items-center justify-center" style={{ borderRadius: 7, color: T.mut }}>
        <TbDots size={15} />
      </button>
      {open && (
        <div className="ai-menu absolute right-0 top-7 z-30 w-40 overflow-hidden p-1"
          style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r2, boxShadow: T.pop }}>
          <button onClick={() => { setOpen(false); onRename(); }}
            className="ai-menuitem w-full flex items-center gap-2.5 px-2.5 py-2 text-[12.5px] text-left"
            style={{ color: T.ink2, borderRadius: 7 }}><TbPencil size={14} /> Rename</button>
          <button onClick={() => { setOpen(false); onDelete(); }}
            className="ai-menuitem w-full flex items-center gap-2.5 px-2.5 py-2 text-[12.5px] text-left"
            style={{ color: T.bad, borderRadius: 7 }}><TbTrash size={14} /> Delete</button>
        </div>
      )}
    </div>
  );
}

function ConfirmDelete({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(37,34,32,0.30)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="ai-menu w-full max-w-[340px] p-5"
        style={{ background: T.surface, borderRadius: T.r3, boxShadow: T.pop }}>
        <div className="text-[14.5px] font-semibold" style={{ color: T.ink }}>Delete conversation?</div>
        <div className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: T.mut }}>
          <span className="font-medium" style={{ color: T.ink2 }}>&ldquo;{title}&rdquo;</span> and its messages will be
          permanently removed for everyone. This can&rsquo;t be undone.
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onCancel} className="ai-menuitem h-8 px-3.5 text-[12.5px] font-medium" style={{ color: T.ink2, borderRadius: T.r }}>Cancel</button>
          <button onClick={onConfirm} className="h-8 px-3.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: T.bad, borderRadius: T.r }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function AiSessions({ onPick }: { onPick?: () => void }) {
  const {
    sessions, activeId, newChat, switchSession, currentUserId, loadingSessions, listError, refreshSessions,
    deleteSession, renameSession,
  } = useAiChat();

  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AiSession | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (renamingId) renameInputRef.current?.focus(); }, [renamingId]);

  const q = query.trim().toLowerCase();
  const filtered = q ? sessions.filter((s) => s.title.toLowerCase().includes(q)) : sessions;
  const ordered = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups: { label: string; items: AiSession[] }[] = [];
  for (const s of ordered) {
    const label = groupLabel(s.updatedAt);
    const g = groups.find((x) => x.label === label) || (groups.push({ label, items: [] }), groups[groups.length - 1]);
    g.items.push(s);
  }

  const startRename = (s: AiSession) => { setRenamingId(s.id); setRenameValue(s.title); };
  const commitRename = async (id: string) => {
    const val = renameValue.trim();
    setRenamingId(null);
    if (!val) return;
    try { await renameSession(id, val); } catch { setRowError("Couldn't rename — please try again."); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try { await deleteSession(target.id); } catch { setRowError("Couldn't delete — please try again."); }
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: T.rail, borderRight: `1px solid ${T.line}` }}>
      <GlobalStyle rules={`
        /* One hover for every row in the rail. Set in CSS, not from onMouseOver — an
           inline background assigned in a handler cannot transition, which is why row
           hover used to snap on and off. */
        .ai-navrow { transition: background-color .15s ${EASE}, box-shadow .15s ${EASE}; }
        .ai-navrow:hover { background: ${T.hover}; }
        .ai-navrow.is-active {
          background: ${T.surface};
          box-shadow: 0 0 0 1px ${T.line}, ${T.card};
        }
        .ai-iconbtn { transition: background-color .15s ${EASE}, color .15s ${EASE}; }
        .ai-iconbtn:hover { background: ${T.hover}; color: ${T.ink}; }

        .ai-primary { transition: background-color .15s ${EASE}, transform .12s ${EASE}; }
        .ai-primary:hover { background: ${T.darkHi}; }
        .ai-primary:active { transform: scale(.988); }

        .ai-menu { animation: aiRailIn .15s ${EASE} both; }
        .ai-menuitem { transition: background-color .12s linear; }
        .ai-menuitem:hover { background: ${T.sunk}; }
        @keyframes aiRailIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

        .ai-search { transition: border-color .15s ${EASE}, box-shadow .15s ${EASE}; }
        .ai-search:focus { border-color: ${T.dark}; box-shadow: 0 0 0 3px ${T.darkSoft}; }
        .ai-search::placeholder { color: ${T.faint}; }

        .ai-raillist { scrollbar-width: thin; scrollbar-color: ${T.dash} transparent; }
        .ai-raillist::-webkit-scrollbar { width: 8px; }
        .ai-raillist::-webkit-scrollbar-thumb { background: ${T.dash}; border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }

        @media (prefers-reduced-motion: reduce) {
          .ai-navrow, .ai-iconbtn, .ai-primary, .ai-search, .ai-menuitem { transition: none !important; }
          .ai-menu { animation: none !important; }
        }
      `} />

      {/* ── brand ── */}
      <div className="px-3 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <span className="w-[26px] h-[26px] flex-shrink-0 rounded-full flex items-center justify-center" style={{ background: T.dark }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="13" width="4.4" height="8" rx="1.6" fill="rgba(255,255,255,.5)" />
              <rect x="9.8" y="8" width="4.4" height="13" rx="1.6" fill="rgba(255,255,255,.78)" />
              <rect x="16.6" y="3.5" width="4.4" height="17.5" rx="1.6" fill="#fff" />
            </svg>
          </span>
          <span className="text-[14px] font-semibold" style={{ color: T.ink }}>AI Analyst</span>
          <button onClick={() => refreshSessions()} title="Refresh conversations"
            className="ai-iconbtn ml-auto w-7 h-7 flex items-center justify-center" style={{ borderRadius: 8, color: T.faint }}>
            <TbRefresh size={15} />
          </button>
          <button title="Collapse sidebar" onClick={() => onPick?.()}
            className="ai-iconbtn w-7 h-7 flex items-center justify-center md:hidden" style={{ borderRadius: 8, color: T.faint }}>
            <TbLayoutSidebar size={15} />
          </button>
        </div>

        <button onClick={() => { newChat(); onPick?.(); }}
          className="ai-primary w-full flex items-center justify-center gap-2 h-[42px] text-[13.5px] font-semibold text-white"
          style={{ background: T.dark, borderRadius: T.r2 }}>
          <TbPlus size={16} /> New chat
        </button>
      </div>

      {/* ── conversations ── */}
      {sessions.length > 0 && (
        <div className="px-3 pb-2.5 relative">
          <TbSearch size={14} className="absolute left-[22px] top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: T.faint }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations"
            className="ai-search w-full h-[34px] pl-7 pr-2.5 text-[12.5px] outline-none"
            style={{ background: T.surface, color: T.ink, border: `1px solid ${T.line}`, borderRadius: T.r }} />
        </div>
      )}

      {(listError || rowError) && (
        <div className="mx-3 mb-2 flex items-start gap-2 px-3 py-2 text-[11.5px]"
             style={{ background: T.badBg, color: T.bad, border: `1px solid ${T.line}`, borderRadius: T.r }}>
          <TbAlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> <span>{listError || rowError}</span>
          <button className="ml-auto flex-shrink-0" onClick={() => setRowError(null)} aria-label="Dismiss"><TbX size={13} /></button>
        </div>
      )}

      <div className="ai-raillist flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        {loadingSessions ? (
          <div className="pt-4 space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="ai-sk h-[30px]" style={{ borderRadius: T.r }} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="pt-8 flex flex-col items-center text-center px-4" style={{ color: T.faint }}>
            <TbMessage2 size={20} /><div className="text-[12px] mt-2">No conversations yet</div>
          </div>
        ) : ordered.length === 0 ? (
          <div className="pt-8 flex flex-col items-center text-center px-4" style={{ color: T.faint }}>
            <TbSearch size={18} /><div className="text-[12px] mt-2">Nothing matches &ldquo;{query.trim()}&rdquo;</div>
          </div>
        ) : groups.map((g) => {
          const shut = !!collapsed[g.label];
          return (
            <div key={g.label} className="mb-1">
              <button onClick={() => setCollapsed((c) => ({ ...c, [g.label]: !c[g.label] }))}
                className="ai-navrow w-full flex items-center gap-2 px-2.5 h-[32px] text-[12px] font-medium"
                style={{ borderRadius: T.r, color: T.mut }}>
                {g.label}
                <TbChevronDown size={14} className="ml-auto" style={{ transform: shut ? "rotate(-90deg)" : "none", transition: `transform .18s ${EASE}` }} />
              </button>

              {/* The tree line: one continuous rule down the group with a short tick into
                  each row, so a conversation reads as belonging to its day rather than
                  floating under a label. */}
              {!shut && (
                <div className="relative pl-[18px] mt-0.5" style={{ borderLeft: `1px solid ${T.line}`, marginLeft: 14 }}>
                  {g.items.map((s) => {
                    const active = s.id === activeId;
                    const who = creatorLabel(s, currentUserId);
                    const renaming = renamingId === s.id;
                    return (
                      <div key={s.id} onClick={() => { if (!renaming) { switchSession(s.id); onPick?.(); } }}
                        className={`ai-navrow group relative flex items-center gap-1 pl-2.5 pr-1.5 py-[7px] cursor-pointer${active ? " is-active" : ""}`}
                        style={{ borderRadius: T.r }}>
                        <span aria-hidden className="absolute left-[-18px] top-1/2 w-[14px]" style={{ borderTop: `1px solid ${T.line}` }} />
                        <div className="min-w-0 flex-1">
                          {renaming ? (
                            <input ref={renameInputRef} value={renameValue} onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") commitRename(s.id); if (e.key === "Escape") setRenamingId(null); }}
                              onBlur={() => commitRename(s.id)}
                              className="w-full text-[12.5px] font-medium rounded px-1.5 py-0.5 outline-none"
                              style={{ color: T.ink, background: T.surface, border: `1px solid ${T.dark}` }} />
                          ) : (
                            <>
                              <div className="truncate text-[12.5px] leading-tight" style={{ color: active ? T.ink : T.ink2, fontWeight: active ? 600 : 400 }} title={s.title}>{s.title}</div>
                              <div className="flex items-center gap-1 truncate text-[10.5px] mt-[3px]" style={{ color: T.faint }}>
                                <TbUserCircle size={11} className="flex-shrink-0" />
                                <span className="truncate">{who}</span>
                                {typeof s.messageCount === "number" && <span className="flex-shrink-0">· {s.messageCount} msg{s.messageCount === 1 ? "" : "s"}</span>}
                              </div>
                            </>
                          )}
                        </div>
                        {renaming ? (
                          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => commitRename(s.id)} title="Save" className="ai-iconbtn w-6 h-6 flex items-center justify-center" style={{ borderRadius: 7, color: T.dark }}><TbCheck size={14} /></button>
                            <button onClick={() => setRenamingId(null)} title="Cancel" className="ai-iconbtn w-6 h-6 flex items-center justify-center" style={{ borderRadius: 7, color: T.mut }}><TbX size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <SessionMenu onRename={() => startRename(s)} onDelete={() => setDeleteTarget(s)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deleteTarget && <ConfirmDelete title={deleteTarget.title} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
