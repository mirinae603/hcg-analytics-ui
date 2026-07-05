"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Kpi } from "@/lib/kpiRegistry";
import { fmt } from "@/lib/kpiFormat";

const THEMES = [
  { primary: "#3b82f6", gradient: "linear-gradient(135deg,#60a5fa 0%,#3b82f6 100%)", bg: "linear-gradient(145deg,#f0f9ff 0%,#e0f2fe 100%)", shadow: "rgba(59,130,246,0.18)", accent: "#eff6ff", glow: "#60a5fa" },
  { primary: "#14b8a6", gradient: "linear-gradient(135deg,#2dd4bf 0%,#14b8a6 100%)", bg: "linear-gradient(145deg,#f0fdfa 0%,#ccfbf1 100%)", shadow: "rgba(20,184,166,0.18)", accent: "#f0fdfa", glow: "#2dd4bf" },
  { primary: "#8b5cf6", gradient: "linear-gradient(135deg,#a78bfa 0%,#8b5cf6 100%)", bg: "linear-gradient(145deg,#faf5ff 0%,#ede9fe 100%)", shadow: "rgba(139,92,246,0.18)", accent: "#faf5ff", glow: "#a78bfa" },
  { primary: "#f97316", gradient: "linear-gradient(135deg,#fb923c 0%,#f97316 100%)", bg: "linear-gradient(145deg,#fff7ed 0%,#ffedd5 100%)", shadow: "rgba(249,115,22,0.18)", accent: "#fff7ed", glow: "#fb923c" },
  { primary: "#f43f5e", gradient: "linear-gradient(135deg,#fb7185 0%,#f43f5e 100%)", bg: "linear-gradient(145deg,#fff1f2 0%,#ffe4e6 100%)", shadow: "rgba(244,63,94,0.18)", accent: "#fff1f2", glow: "#fb7185" },
  { primary: "#22c55e", gradient: "linear-gradient(135deg,#4ade80 0%,#22c55e 100%)", bg: "linear-gradient(145deg,#f0fdf4 0%,#dcfce7 100%)", shadow: "rgba(34,197,94,0.18)", accent: "#f0fdf4", glow: "#4ade80" },
  { primary: "#6366f1", gradient: "linear-gradient(135deg,#818cf8 0%,#6366f1 100%)", bg: "linear-gradient(145deg,#eef2ff 0%,#e0e7ff 100%)", shadow: "rgba(99,102,241,0.18)", accent: "#eef2ff", glow: "#818cf8" },
  { primary: "#f59e0b", gradient: "linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)", bg: "linear-gradient(145deg,#fffbeb 0%,#fef3c7 100%)", shadow: "rgba(245,158,11,0.18)", accent: "#fffbeb", glow: "#fbbf24" },
  { primary: "#06b6d4", gradient: "linear-gradient(135deg,#22d3ee 0%,#06b6d4 100%)", bg: "linear-gradient(145deg,#ecfeff 0%,#cffafe 100%)", shadow: "rgba(6,182,212,0.18)", accent: "#ecfeff", glow: "#22d3ee" },
];

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getProgress(val: number, kind: string, field: string): number {
  if (!val || isNaN(val)) return 0;
  if (kind === "pct") return Math.min(val / 100, 1);
  if (kind === "inr") return Math.min(val / 2e8, 1);   // 100% = ₹20 Cr
  // num: pick a sensible domain
  if (field.includes("day") || field.includes("doh") || field.includes("aging"))
    return Math.min(val / 365, 1);                       // 100% = 365 days
  if (field.includes("rate") || field.includes("pct") || field.includes("score"))
    return Math.min(val / 100, 1);
  return Math.min(val / 100000, 1);                      // qty / count
}

function getStatus(progress: number, theme: (typeof THEMES)[0]) {
  if (progress > 0.7) return { text: "Healthy", color: "#22c55e" };
  if (progress > 0.4) return { text: "Moderate", color: theme.primary };
  if (progress > 0.15) return { text: "Low", color: "#f97316" };
  return { text: "Critical", color: "#f43f5e" };
}

export default function ExecutiveKpiCard({ kpi, node, index }: { kpi: Kpi; node: any; index: number }) {
  const theme = THEMES[index % THEMES.length];
  const c = kpi.card;

  const rawVal: number = (() => {
    if (!node) return 0;
    const field = node[c.field];
    if (!field) return 0;
    if (c.agg === "count") return Number(field.distinct ?? 0);
    if (c.agg === "mean") return Number(field.mean ?? 0);
    return Number(field.sum ?? 0);
  })();

  const progress = getProgress(rawVal, c.kind, c.field);
  const status = getStatus(progress, theme);

  const [displayVal, setDisplayVal] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [displayBottom, setDisplayBottom] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [glow, setGlow] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 2200;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const raw = Math.min(elapsed / duration, 1);
      const e = easeInOutCubic(raw);
      setDisplayVal(rawVal * e);
      setDisplayProgress(progress * e);
      setDisplayBottom(progress * e);
      setOpacity(Math.min(e * 1.5, 1));
      if (raw < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [rawVal, progress]);

  useEffect(() => {
    const id = setInterval(() => setGlow((p) => (p + 1) % 100), 50);
    return () => clearInterval(id);
  }, []);

  const circumference = 2 * Math.PI * 42;
  const label = fmt(rawVal, c.kind);

  return (
    <Link href={`/kpi/${kpi.key}`} className="block">
      <div
        className="relative w-full rounded-3xl overflow-hidden cursor-pointer transition-all duration-500"
        style={{
          background: theme.bg,
          minHeight: 240,
          boxShadow: isHovered
            ? `0 20px 60px -12px ${theme.shadow}, 0 8px 32px -8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)`
            : `0 8px 32px -8px ${theme.shadow}, 0 4px 16px -4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)`,
          transform: isHovered ? "translateY(-2px) scale(1.005)" : "translateY(0) scale(1)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-28 h-28 rounded-full opacity-20 blur-2xl"
            style={{ background: theme.gradient, top: "8%", right: "10%",
              transform: `scale(${1 + Math.sin(glow * 0.1) * 0.12})` }} />
          <div className="absolute w-20 h-20 rounded-full opacity-10 blur-xl"
            style={{ background: theme.glow, bottom: "15%", left: "8%",
              transform: `scale(${1 + Math.cos(glow * 0.08) * 0.15})` }} />
        </div>

        {/* Glassmorphism */}
        <div className="absolute inset-0 backdrop-blur-sm pointer-events-none"
          style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.06) 100%)" }} />

        {/* Premium reflection */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.45) 0%,rgba(255,255,255,0.1) 25%,transparent 50%)",
            clipPath: "polygon(0 0, 50% 0, 25% 100%, 0 100%)",
            opacity: isHovered ? 0.65 : 0.4,
            transition: "opacity 0.5s",
          }} />

        {/* Content */}
        <div className="relative flex flex-col h-full p-5">

          {/* Header row */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 pr-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{kpi.short}</span>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{kpi.title}</p>
            </div>
            {/* Circular progress */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="7" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={theme.primary} strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - Math.min(displayProgress, 1))}
                  style={{ filter: `drop-shadow(0 2px 6px ${theme.shadow})`, opacity }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: theme.primary, opacity }}>
                  {Math.round(Math.min(displayProgress * 100, 100))}%
                </span>
              </div>
            </div>
          </div>

          {/* Main value */}
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight" style={{ color: "rgba(30,41,59,0.85)", opacity }}>
                {fmt(displayVal, c.kind)}
              </span>
            </div>
            {/* Gradient accent line */}
            <div className="h-1 rounded-full mt-1 transition-all duration-1000"
              style={{ background: theme.gradient, width: `${displayBottom * 100}%`, boxShadow: `0 2px 6px ${theme.shadow}` }} />
          </div>

          {/* Label */}
          <div className="mt-2">
            <span className="text-xs text-gray-400 font-medium">{c.label}</span>
          </div>

          {/* Bottom section */}
          <div className="mt-auto pt-3">
            <div className="p-3 rounded-2xl" style={{ background: `${theme.accent}cc` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 tracking-wide">Coverage</span>
                <span className="text-xs font-semibold" style={{ color: theme.primary }}>
                  {Math.round(displayProgress * 100)}%
                </span>
              </div>
              {/* Shimmer progress bar */}
              <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                  style={{ width: `${displayBottom * 100}%`, background: theme.gradient, boxShadow: `0 0 8px ${theme.shadow}` }} />
              </div>
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-xs font-semibold" style={{ color: status.color }}>{status.text}</span>
              <span className="text-[10px] text-gray-300 ml-auto">{kpi.portfolio}</span>
            </div>
          </div>
        </div>

        {/* Bottom progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              backgroundColor: status.color,
              width: `${displayBottom * 100}%`,
              opacity: isHovered ? 0.85 : 0.65,
              boxShadow: `0 0 10px ${status.color}40`,
            }} />
        </div>
      </div>
    </Link>
  );
}
