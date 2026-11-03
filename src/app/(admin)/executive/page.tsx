"use client";
import dynamic from "next/dynamic";
const ExecutivePage = dynamic(() => import("@/components/portfolio/executive/ExecutivePage"), { ssr: false });
export default function Page() {
  return <ExecutivePage />;
}
