"use client";
import dynamic from "next/dynamic";

const AiChat = dynamic(() => import("@/components/ai/AiChat"), { ssr: false });
const AiSessions = dynamic(() => import("@/components/ai/AiSessions"), { ssr: false });

// The page is a two-pane shell and nothing else. The old full-width header bar spent 72px
// of permanent vertical space on the product's name and a sentence describing it — read
// once on the first visit, then chrome forever. Identity now lives at the top of the
// sidebar (where it belongs, next to "New chat"), and the conversation column carries a
// slim CONTEXTUAL bar instead: which conversation you are in and what you can do with it.
export default function AiAnalystPage() {
  return (
    <div className="-m-4 md:-m-6 flex" style={{ height: "calc(100vh - 64px)", background: "#F6F7FB" }}>
      <aside className="hidden md:flex flex-col w-[268px] flex-shrink-0 border-r"
             style={{ borderColor: "#ECEDF4", background: "#FFFFFF" }}>
        <AiSessions />
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <AiChat variant="page" />
      </div>
    </div>
  );
}
