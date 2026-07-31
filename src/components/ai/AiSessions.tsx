"use client";
import React from "react";
import { TbPlus, TbMessage2, TbUserCircle, TbRefresh, TbAlertTriangle } from "react-icons/tb";
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

// Chat is shared: every logged-in user sees every session here, labeled with who
// started it (that's the point — "You" for your own, the other person's name otherwise).
function creatorLabel(s: AiSession, currentUserId: number | null): string {
  if (!s.createdBy) return "Unknown user";
  if (currentUserId != null && s.createdBy.id === currentUserId) return "You";
  return s.createdBy.name || s.createdBy.email || "Unknown user";
}

export default function AiSessions({ onPick }: { onPick?: () => void }) {
  const { sessions, activeId, newChat, switchSession, currentUserId, loadingSessions, listError, refreshSessions } = useAiChat();

  const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups: { label: string; items: AiSession[] }[] = [];
  for (const s of ordered) {
    const label = groupLabel(s.updatedAt);
    const g = groups.find((x) => x.label === label) || (groups.push({ label, items: [] }), groups[groups.length - 1]);
    g.items.push(s);
  }

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

      {listError && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11.5px] text-red-500">
          <TbAlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> <span>{listError}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
        {loadingSessions ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4" style={{ color: SUB }}>
            <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${SUB} transparent ${SUB} ${SUB}` }} />
            <div className="text-[12px] mt-2">Loading conversations…</div>
          </div>
        ) : ordered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4" style={{ color: SUB }}>
            <TbMessage2 size={22} /><div className="text-[12px] mt-2">No conversations yet</div>
          </div>
        ) : groups.map((g) => (
          <div key={g.label} className="mb-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] px-2.5 py-1.5" style={{ color: "#aab0bd" }}>{g.label}</div>
            {g.items.map((s) => {
              const active = s.id === activeId;
              const who = creatorLabel(s, currentUserId);
              return (
                <div key={s.id} onClick={() => { switchSession(s.id); onPick?.(); }}
                  className="group flex flex-col gap-0.5 px-2.5 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors"
                  style={{ background: active ? "rgba(59,91,219,0.09)" : "transparent" }}
                  onMouseOver={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f1f2f6"; }}
                  onMouseOut={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <span className="min-w-0 truncate text-[12.5px]" style={{ color: active ? INK : "#42485a", fontWeight: active ? 600 : 400 }} title={s.title}>{s.title}</span>
                  <span className="flex items-center gap-1 min-w-0 truncate text-[10.5px]" style={{ color: active ? ACCENT : SUB }}>
                    <TbUserCircle size={11} className="flex-shrink-0" /> <span className="truncate">{who}</span>
                    {typeof s.messageCount === "number" && <span className="flex-shrink-0">· {s.messageCount} msg{s.messageCount === 1 ? "" : "s"}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
