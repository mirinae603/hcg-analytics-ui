"use client";
// Editorial identity mark for the AI Analyst — a tile with a minimal ascending-bars glyph.
// Replaces the old gradient "sparkle": bars read production-grade and on-brand for an
// analytics tool, where a sparkle reads as a stock AI logo.
//
// Three tones, because the mark has to sit on three different grounds and an ink tile on
// a near-ink rail is a tile you cannot see. The accent dot is the app's violet in every
// tone — it used to be a #7f9cf5 blue that appears nowhere else in the product.
import { T } from "./theme";

export default function AnalystMark({ size = 40, tone = "ink" }: { size?: number; tone?: "ink" | "light" | "rail" }) {
  const radius = Math.round(size * 0.3);
  const g = size * 0.52;

  const bg = tone === "light" ? T.accentSoft : tone === "rail" ? T.accent : T.ink;
  const bars =
    tone === "light"
      ? [T.accent2, T.accent, T.accent]
      : ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.75)", "#ffffff"];
  const dot = tone === "light" ? T.accent : tone === "rail" ? "#ffffff" : T.accent2;

  return (
    <span style={{ width: size, height: size, borderRadius: radius, background: bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={g} height={g} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="13" width="4.4" height="8" rx="1.6" fill={bars[0]} />
        <rect x="9.8" y="8" width="4.4" height="13" rx="1.6" fill={bars[1]} />
        <rect x="16.6" y="3.5" width="4.4" height="17.5" rx="1.6" fill={bars[2]} />
        <circle cx="18.8" cy="3.4" r="2.1" fill={dot} />
      </svg>
    </span>
  );
}
