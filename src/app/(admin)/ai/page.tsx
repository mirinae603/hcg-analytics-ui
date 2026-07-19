"use client";
import dynamic from "next/dynamic";
import AnalystMark from "@/components/ai/AnalystMark";

const AiChat = dynamic(() => import("@/components/ai/AiChat"), { ssr: false });
const AiSessions = dynamic(() => import("@/components/ai/AiSessions"), { ssr: false });

export default function AiAnalystPage() {
  return (
    <div className="-m-4 md:-m-6 flex flex-col" style={{ height: "calc(100vh - 64px)", background: "#f6f7f9" }}>
      <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0 bg-white border-b" style={{ borderColor: "#eef0f4" }}>
        <AnalystMark size={40} />
        <div>
          <h1 className="text-[17px] font-bold tracking-tight" style={{ color: "#1a1f36" }}>AI Analyst</h1>
          <p className="text-[12.5px]" style={{ color: "#8a91a3" }}>Ask analytics questions in plain English — answered from HCG&apos;s real supply-chain data, with charts.</p>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex">
        <aside className="hidden md:flex flex-col w-[260px] flex-shrink-0 border-r" style={{ borderColor: "#eef0f4" }}>
          <AiSessions />
        </aside>
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 mx-auto w-full max-w-[880px]">
            <AiChat variant="page" />
          </div>
        </div>
      </div>
    </div>
  );
}
