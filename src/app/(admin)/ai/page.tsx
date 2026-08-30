"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import GlobalStyle from "@/components/ai/GlobalStyle";

const AiChat = dynamic(() => import("@/components/ai/AiChat"), { ssr: false });
const AiSessions = dynamic(() => import("@/components/ai/AiSessions"), { ssr: false });

// A two-pane shell: a dark navigation RAIL and a white DOCUMENT.
//
// The old full-width header spent 72px of permanent vertical space on the product's name
// and a sentence describing it — read once on the first visit, then chrome forever.
// Identity now lives at the top of the rail (next to "New chat"), and the document carries
// a slim contextual bar instead: which conversation you are in, and what you can do to it.
//
// The rail used to be #FFFFFF against a #F6F7FB canvas — two values close enough that the
// page had no spine, which is the single biggest reason it read as a generic chat page
// rather than a tool. Dark rail, white document: the eye always knows which is which.
/** The admin header is sticky, not fixed, so the page below it gets the remaining height.
 *  Measured, not guessed: it renders at 77px, and the 64px this used to subtract left the
 *  page 13px too tall — enough to put a scrollbar on <body>, which in turn made the
 *  `100vw` width above overflow by the scrollbar's own width. */
const HEADER_H = 77;

export default function AiAnalystPage() {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="ai-page flex relative" style={{ background: "#FFFFFF" }}>
      {/* The admin shell wraps every route in `p-6 mx-auto max-w-screen-2xl`. Past ~1624px
          of viewport that max-width binds and the wrapper starts centring, which opens a
          band of empty page between the fixed icon rail and this one — two sidebars with a
          gutter down the middle, which is what it looked like.
          `-24px` cancels the wrapper's padding (what the old `-m-6` did); the `max()` term
          cancels the centring offset, and is exactly 0 until the max-width actually binds,
          so narrow screens are untouched. Guarded to lg because below it the shell drops
          its 88px icon-rail offset entirely. */}
      <GlobalStyle rules={`
        .ai-page { height: calc(100vh - ${HEADER_H}px); margin: -16px; }
        @media (min-width: 768px) { .ai-page { margin: -24px; } }
        @media (min-width: 1024px) {
          .ai-page {
            width: calc(100vw - 88px);
            margin-left: calc(-24px - max(0px, (100vw - 1624px) / 2));
            margin-right: 0;
          }
        }
      `} />
      <aside className="hidden md:flex flex-col w-[262px] flex-shrink-0">
        <AiSessions />
      </aside>

      {/* Below md the rail is hidden, and until now that left conversations unreachable on
          a phone — the list existed with no way to open it. Same component, as a drawer. */}
      {drawer && (
        <div className="md:hidden absolute inset-0 z-40 flex" role="dialog" aria-modal="true">
          <div className="absolute inset-0" style={{ background: "rgba(37,34,32,.34)" }} onClick={() => setDrawer(false)} />
          <div className="relative w-[280px] max-w-[84vw] h-full flex flex-col ai-drawer">
            <AiSessions onPick={() => setDrawer(false)} />
          </div>
          <GlobalStyle rules={`
            @keyframes aiDrawerIn { from { transform: translateX(-100%); } to { transform: none; } }
            .ai-drawer { animation: aiDrawerIn .22s cubic-bezier(.22,1,.36,1) both; }
            @media (prefers-reduced-motion: reduce) { .ai-drawer { animation: none !important; } }
          `} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <AiChat variant="page" onOpenSessions={() => setDrawer(true)} />
      </div>
    </div>
  );
}
