"use client";
import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TbX, TbArrowsDiagonal, TbMessage2, TbPlus, TbHistory, TbChevronLeft } from "react-icons/tb";
import { useAiChat } from "@/context/AiChatContext";
import AiChat from "./AiChat";
import AiSessions from "./AiSessions";
import AnalystMark from "./AnalystMark";

export default function AiFloater() {
  const { open, setOpen, newChat } = useAiChat();
  const [showHistory, setShowHistory] = useState(false);
  const pathname = usePathname() || "";
  const router = useRouter();

  // On the dedicated /ai page the full view is already shown — hide the floater panel.
  const onAiPage = pathname.startsWith("/ai");

  return (
    <>
      {/* Launcher */}
      {!onAiPage && (
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close AI Analyst" : "Open AI Analyst"}
          className="fixed z-[60] bottom-6 right-6 w-14 h-14 rounded-[18px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#1a1f36", boxShadow: "0 14px 34px -10px rgba(26,31,54,0.5)" }}
        >
          {open ? <TbX size={22} color="#fff" /> : <TbMessage2 size={23} color="#fff" strokeWidth={2} />}
        </button>
      )}

      {/* Panel */}
      {open && !onAiPage && (
        <div
          className="fixed z-[60] bottom-24 right-6 flex flex-col rounded-[22px] overflow-hidden bg-white"
          style={{ width: "min(420px, calc(100vw - 32px))", height: "min(640px, calc(100vh - 140px))", boxShadow: "0 30px 70px -24px rgba(26,31,54,0.42), 0 0 0 1px rgba(20,24,40,0.05)", animation: "aiPanelIn .28s cubic-bezier(.22,1,.36,1)" }}
        >
          <style jsx global>{`@keyframes aiPanelIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
          <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0 border-b" style={{ background: "#fff", borderColor: "#eef0f4" }}>
            <div className="flex items-center gap-2.5 min-w-0">
              {showHistory ? (
                <button onClick={() => setShowHistory(false)} aria-label="Back" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#42485a" }}><TbChevronLeft size={18} /></button>
              ) : <AnalystMark size={32} />}
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight truncate" style={{ color: "#1a1f36" }}>{showHistory ? "Conversations" : "HCG AI Analyst"}</div>
                {!showHistory && <div className="text-[10.5px] leading-tight" style={{ color: "#8a91a3" }}>grounded in your real data</div>}
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={() => { newChat(); setShowHistory(false); }} title="New chat" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#42485a" }}><TbPlus size={17} /></button>
              <button onClick={() => setShowHistory((v) => !v)} title="History" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: showHistory ? "#3b5bdb" : "#42485a", background: showHistory ? "rgba(59,91,219,0.1)" : "transparent" }}><TbHistory size={16} /></button>
              <button onClick={() => { setOpen(false); router.push("/ai"); }} aria-label="Expand to full page" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}><TbArrowsDiagonal size={15} /></button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}><TbX size={17} /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {showHistory ? <AiSessions onPick={() => setShowHistory(false)} /> : <AiChat variant="floater" />}
          </div>
        </div>
      )}
    </>
  );
}
