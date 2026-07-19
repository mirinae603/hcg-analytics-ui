"use client";
// Editorial identity mark for the AI Analyst — an ink tile with a minimal
// ascending-bars glyph. Replaces the old gradient "sparkle" (reads production-grade,
// on-brand for analytics, not "AI-generated").
export default function AnalystMark({ size = 40, tone = "ink" }: { size?: number; tone?: "ink" | "light" }) {
  const radius = Math.round(size * 0.3);
  const g = size * 0.52;
  const bg = tone === "light" ? "#eef1f8" : "#1a1f36";
  const bars = tone === "light"
    ? ["#9fb0e0", "#5b74d6", "#3b5bdb"]
    : ["rgba(255,255,255,0.42)", "rgba(255,255,255,0.72)", "#ffffff"];
  return (
    <span style={{ width: size, height: size, borderRadius: radius, background: bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={g} height={g} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="13" width="4.4" height="8" rx="1.6" fill={bars[0]} />
        <rect x="9.8" y="8" width="4.4" height="13" rx="1.6" fill={bars[1]} />
        <rect x="16.6" y="3.5" width="4.4" height="17.5" rx="1.6" fill={bars[2]} />
        <circle cx="18.8" cy="3.4" r="2.1" fill={tone === "light" ? "#3b5bdb" : "#7f9cf5"} />
      </svg>
    </span>
  );
}
