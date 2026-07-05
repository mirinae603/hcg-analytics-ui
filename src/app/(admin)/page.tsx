"use client";
import dynamic from "next/dynamic";
const HomeScreen = dynamic(() => import("@/components/portfolio/HomeScreen"), { ssr: false });
export default function Home() {
  return <HomeScreen />;
}
