"use client";
import dynamic from "next/dynamic";
import { TbSparkles } from "react-icons/tb";

const AiChat = dynamic(() => import("@/components/ai/AiChat"), { ssr: false });

export default function AiAnalystPage() {
  return (
    <div className="-m-4 md:-m-6 flex flex-col" style={{ height: "calc(100vh - 64px)", background: "#f6f7f9" }}>
      <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0 bg-white border-b" style={{ borderColor: "#eef0f4" }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4b7bd4,#16a37f)" }}><TbSparkles size={21} color="#fff" /></div>
        <div>
          <h1 className="text-[17px] font-bold" style={{ color: "#1f2333" }}>AI Analyst</h1>
          <p className="text-[12.5px]" style={{ color: "#8a91a0" }}>Ask analytics questions in plain English — answered from HCG&apos;s real supply-chain data, with charts.</p>
        </div>
      </div>
      <div className="flex-1 min-h-0 mx-auto w-full max-w-[860px]">
        <AiChat variant="page" />
      </div>
    </div>
  );
}
