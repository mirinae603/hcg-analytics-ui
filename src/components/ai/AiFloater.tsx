"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { TbX, TbArrowsDiagonal, TbMessage2 } from "react-icons/tb";
import { useAiChat } from "@/context/AiChatContext";
import AiChat from "./AiChat";
import AnalystMark from "./AnalystMark";

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
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b" style={{ background: "#fff", borderColor: "#eef0f4" }}>
            <div className="flex items-center gap-2.5">
              <AnalystMark size={34} />
              <div>
                <div className="text-[13.5px] font-semibold leading-tight" style={{ color: "#1a1f36" }}>HCG AI Analyst</div>
                <div className="text-[10.5px] leading-tight" style={{ color: "#8a91a3" }}>grounded in your real data</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setOpen(false); router.push("/ai"); }} aria-label="Expand to full page" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}><TbArrowsDiagonal size={16} /></button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}><TbX size={17} /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0"><AiChat variant="floater" /></div>
        </div>
      )}
    </>
  );
}
