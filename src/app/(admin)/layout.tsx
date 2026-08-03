"use client";

import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useScope } from "@/context/CategoryContext";
import { AiChatProvider } from "@/context/AiChatContext";
import AiFloater from "@/components/ai/AiFloater";
import ScopeBanner from "@/components/common/ScopeBanner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Slim icon rail is a fixed 86px; the KPI flyout panel floats over content as an
  // overlay, so the main area only ever offsets by the rail width.
  const mainContentMargin = "lg:ml-[88px]";

  // Gate every dashboard route — redirect to /signin when there is no valid session.
  const { isLoggedIn, isChecking } = useAuth();

  // Every hook must run before the auth early-return below, so this sits here rather
  // than next to the JSX that uses it.
  const { scopeKey } = useScope();
  if (isChecking || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#1b1c22 transparent #1b1c22 #1b1c22" }} />
      </div>
    );
  }

  return (
    <AiChatProvider>
      <div className="min-h-screen xl:flex">
        {/* Sidebar and Backdrop */}
        <AppSidebar />
        <Backdrop />
        {/* Main Content Area */}
        <div
          className={`flex-1 min-w-0 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
        >
          {/* Header */}
          <AppHeader />
          {/* Renders nothing unless a category filter is active. */}
          <ScopeBanner />
          {/* Page Content.
              `key={scopeKey}` ("<plant>|<category>") remounts the whole page subtree
              whenever the user changes plant or category. The fetch interceptor makes
              every request carry the right scope; this is what makes the request happen
              at all for the components that never opted in — the executive cards
              (AnalyticsHomeScreenCards, forecastHomeScreenCard) fetch in a mount effect
              keyed on region only, so before this they simply never refetched on a
              category change and the headline numbers sat still. Remounting is the only
              mechanism that reaches them without editing each one, which is exactly the
              per-file wiring that let them be missed in the first place.

              The cost is transient local state: an open tab, a scroll position, an
              expanded drill-down are reset. That is deliberate — a filter change means
              "show me a different slice", and carrying a tab selected against the old
              slice across is at best meaningless and at worst misleading. Nothing
              persistent is lost (the selection itself lives in context + localStorage,
              both above this boundary).

              Not a refetch loop and not a per-render flash: scopeKey is a plain string
              derived from two context values, so it is referentially stable across
              ordinary re-renders and changes only on an explicit user action. */}
          <div key={scopeKey} className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
        </div>
      </div>
      {/* Floating AI Analyst — present on every admin page, shares the /ai conversation */}
      <AiFloater />
    </AiChatProvider>
  );
}
