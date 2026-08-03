"use client";

import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { AiChatProvider } from "@/context/AiChatContext";
import AiFloater from "@/components/ai/AiFloater";

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
          {/* Page Content */}
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
        </div>
      </div>
      {/* Floating AI Analyst — present on every admin page, shares the /ai conversation */}
      <AiFloater />
    </AiChatProvider>
  );
}
