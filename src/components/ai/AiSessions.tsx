"use client";
import React, { useState } from "react";
import { TbPlus, TbTrash, TbPencil, TbCheck, TbMessage2 } from "react-icons/tb";
import { useAiChat, AiSession } from "@/context/AiChatContext";

const INK = "#1a1f36", SUB = "#8a91a3", ACCENT = "#3b5bdb";

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

export default function AiSessions({ onPick }: { onPick?: () => void }) {
  const { sessions, activeId, newChat, switchSession, deleteSession, renameSession } = useAiChat();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups: { label: string; items: AiSession[] }[] = [];
  for (const s of ordered) {
    const label = groupLabel(s.updatedAt);
    const g = groups.find((x) => x.label === label) || (groups.push({ label, items: [] }), groups[groups.length - 1]);
    g.items.push(s);
  }

  const startRename = (s: AiSession) => { setEditing(s.id); setDraft(s.title); };
  const commitRename = (id: string) => { renameSession(id, draft.trim() || "Untitled"); setEditing(null); };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: "#fbfbfc" }}>
      <div className="p-3">
        <button onClick={() => { newChat(); onPick?.(); }}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
          style={{ background: INK, color: "#fff" }}>
          <TbPlus size={16} /> New chat
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
        {ordered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4" style={{ color: SUB }}>
            <TbMessage2 size={22} /><div className="text-[12px] mt-2">No conversations yet</div>
          </div>
        ) : groups.map((g) => (
          <div key={g.label} className="mb-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] px-2.5 py-1.5" style={{ color: "#aab0bd" }}>{g.label}</div>
            {g.items.map((s) => {
              const active = s.id === activeId;
              return (
                <div key={s.id} onClick={() => { switchSession(s.id); onPick?.(); }}
                  className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors"
                  style={{ background: active ? "rgba(59,91,219,0.09)" : "transparent" }}
                  onMouseOver={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f1f2f6"; }}
                  onMouseOut={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  {editing === s.id ? (
                    <input autoFocus value={draft} onClick={(e) => e.stopPropagation()} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitRename(s.id); if (e.key === "Escape") setEditing(null); }}
                      className="flex-1 min-w-0 text-[12.5px] px-1.5 py-1 rounded-md outline-none" style={{ border: `1px solid ${ACCENT}`, color: INK }} />
                  ) : (
                    <span className="flex-1 min-w-0 truncate text-[12.5px]" style={{ color: active ? INK : "#42485a", fontWeight: active ? 600 : 400 }} title={s.title}>{s.title}</span>
                  )}
                  {editing === s.id ? (
                    <button onClick={(e) => { e.stopPropagation(); commitRename(s.id); }} className="flex-shrink-0" style={{ color: ACCENT }}><TbCheck size={15} /></button>
                  ) : (
                    <span className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); startRename(s); }} title="Rename" style={{ color: SUB }}><TbPencil size={13.5} /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} title="Delete" style={{ color: "#c06a6a" }}><TbTrash size={13.5} /></button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
