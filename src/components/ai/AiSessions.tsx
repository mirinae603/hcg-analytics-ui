"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  TbPlus, TbMessage2, TbUserCircle, TbRefresh, TbAlertTriangle,
  TbDots, TbPencil, TbTrash, TbCheck, TbX, TbSearch,
} from "react-icons/tb";
import { useAiChat, AiSession } from "@/context/AiChatContext";

const INK = "#1a1f36", SUB = "#8a91a3", ACCENT = "#3b5bdb", DANGER = "#d64545";

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

/** Hover/tap "⋯" menu → Rename (inline edit) + Delete (confirm). One instance covers
 *  both actions so only one popover can ever be open across the whole list at a time
 *  (each row owns its own `open` state, but click-outside + Escape close it uniformly). */
function SessionMenu({
  onRename, onDelete,
}: { onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Conversation options"
        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-black/[0.06]"
        style={{ color: SUB }}>
        <TbDots size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-40 rounded-lg overflow-hidden"
          style={{ background: "#fff", border: "1px solid #e7e8ee", boxShadow: "0 10px 28px -8px rgba(20,24,40,0.22)" }}>
          <button
            onClick={() => { setOpen(false); onRename(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-left transition-colors hover:bg-gray-50"
            style={{ color: INK }}>
            <TbPencil size={14} /> Rename
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-left transition-colors hover:bg-red-50"
            style={{ color: DANGER }}>
            <TbTrash size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** Small, non-blocking confirm — matches this app's existing hand-rolled popover style
 *  (see ExportMenu in AiChat.tsx) rather than pulling in a modal library for one dialog. */
function ConfirmDelete({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(20,22,30,0.32)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[340px] rounded-2xl p-5"
        style={{ background: "#fff", boxShadow: "0 30px 70px -20px rgba(20,24,40,0.35)" }}>
        <div className="text-[14px] font-semibold" style={{ color: INK }}>Delete conversation?</div>
        <div className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: SUB }}>
          <span className="font-medium" style={{ color: "#42485a" }}>&ldquo;{title}&rdquo;</span> and its messages will be
          permanently removed for everyone. This can&rsquo;t be undone.
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onCancel}
            className="h-8 px-3.5 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-gray-100"
            style={{ color: "#42485a" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="h-8 px-3.5 rounded-lg text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: DANGER }}>
            Delete
          </button>
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
    <div className="flex flex-col h-full min-h-0" style={{ background: "#fbfbfc" }}>
      <div className="p-3 flex items-center gap-2">
        <button onClick={() => { newChat(); onPick?.(); }}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
          style={{ background: INK, color: "#fff" }}>
          <TbPlus size={16} /> New chat
        </button>
        <button onClick={() => refreshSessions()} title="Refresh conversations" className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: SUB }}>
          <TbRefresh size={16} />
        </button>
      </div>

      {sessions.length > 0 && (
        <div className="px-3 pb-2 relative">
          <TbSearch size={14} className="absolute left-[22px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: SUB }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations"
            className="w-full h-8 pl-8 pr-2.5 rounded-lg text-[12px] outline-none"
            style={{ background: "#f1f2f6", color: INK }} />
        </div>
      )}

      {(listError || rowError) && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11.5px] text-red-500">
          <TbAlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> <span>{listError || rowError}</span>
          <button className="ml-auto flex-shrink-0" onClick={() => setRowError(null)} aria-label="Dismiss"><TbX size={13} /></button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
        {loadingSessions ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4" style={{ color: SUB }}>
            <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${SUB} transparent ${SUB} ${SUB}` }} />
            <div className="text-[12px] mt-2">Loading conversations…</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4" style={{ color: SUB }}>
            <TbMessage2 size={22} /><div className="text-[12px] mt-2">No conversations yet</div>
          </div>
        ) : ordered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4" style={{ color: SUB }}>
            <TbSearch size={20} /><div className="text-[12px] mt-2">No conversations match &ldquo;{query.trim()}&rdquo;</div>
          </div>
        ) : groups.map((g) => (
          <div key={g.label} className="mb-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] px-2.5 py-1.5" style={{ color: "#aab0bd" }}>{g.label}</div>
            {g.items.map((s) => {
              const active = s.id === activeId;
              const who = creatorLabel(s, currentUserId);
              const renaming = renamingId === s.id;
              return (
                <div key={s.id} onClick={() => { if (!renaming) { switchSession(s.id); onPick?.(); } }}
                  className="group flex items-start gap-1 px-2.5 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors"
                  style={{ background: active ? "rgba(59,91,219,0.09)" : "transparent" }}
                  onMouseOver={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f1f2f6"; }}
                  onMouseOut={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                    {renaming ? (
                      <input ref={renameInputRef} value={renameValue} onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(s.id); if (e.key === "Escape") setRenamingId(null); }}
                        onBlur={() => commitRename(s.id)}
                        className="w-full text-[12.5px] font-medium bg-white rounded px-1.5 py-0.5 outline-none"
                        style={{ color: INK, border: `1px solid ${ACCENT}` }} />
                    ) : (
                      <span className="min-w-0 truncate text-[12.5px]" style={{ color: active ? INK : "#42485a", fontWeight: active ? 600 : 400 }} title={s.title}>{s.title}</span>
                    )}
                    <span className="flex items-center gap-1 min-w-0 truncate text-[10.5px]" style={{ color: active ? ACCENT : SUB }}>
                      <TbUserCircle size={11} className="flex-shrink-0" /> <span className="truncate">{who}</span>
                      {typeof s.messageCount === "number" && <span className="flex-shrink-0">· {s.messageCount} msg{s.messageCount === 1 ? "" : "s"}</span>}
                    </span>
                  </div>
                  {renaming ? (
                    <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => commitRename(s.id)} title="Save" className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-black/[0.06]" style={{ color: ACCENT }}><TbCheck size={14} /></button>
                      <button onClick={() => setRenamingId(null)} title="Cancel" className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-black/[0.06]" style={{ color: SUB }}><TbX size={14} /></button>
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
        ))}
      </div>

      {deleteTarget && (
        <ConfirmDelete title={deleteTarget.title} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
