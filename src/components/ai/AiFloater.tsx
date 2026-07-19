"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { TbSparkles, TbX, TbArrowsDiagonal } from "react-icons/tb";
import { useAiChat } from "@/context/AiChatContext";
import AiChat from "./AiChat";

export default function AiFloater() {
  const { open, setOpen } = useAiChat();
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
          className="fixed z-[60] bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ background: open ? "#1f2333" : "linear-gradient(135deg,#4b7bd4,#16a37f)", boxShadow: "0 12px 30px -8px rgba(31,35,51,0.4)" }}
        >
          {open ? <TbX size={22} color="#fff" /> : <TbSparkles size={24} color="#fff" />}
        </button>
      )}

      {/* Panel */}
      {open && !onAiPage && (
        <div
          className="fixed z-[60] bottom-24 right-6 flex flex-col rounded-[22px] overflow-hidden bg-white"
          style={{ width: "min(420px, calc(100vw - 32px))", height: "min(640px, calc(100vh - 140px))", boxShadow: "0 30px 70px -24px rgba(31,35,51,0.42), 0 0 0 1px rgba(20,24,40,0.05)", animation: "aiPanelIn .28s cubic-bezier(.22,1,.36,1)" }}
        >
          <style jsx global>{`@keyframes aiPanelIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: "linear-gradient(135deg,#4b7bd4,#16a37f)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}><TbSparkles size={17} color="#fff" /></div>
              <div>
                <div className="text-[13.5px] font-semibold text-white leading-tight">HCG AI Analyst</div>
                <div className="text-[10.5px] leading-tight" style={{ color: "rgba(255,255,255,0.8)" }}>grounded in your real data</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setOpen(false); router.push("/ai"); }} aria-label="Expand to full page" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/15 transition-colors"><TbArrowsDiagonal size={16} color="#fff" /></button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/15 transition-colors"><TbX size={17} color="#fff" /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0"><AiChat variant="floater" /></div>
        </div>
      )}
    </>
  );
}
