"use client";
// Shared design primitives for premium portfolio drill-down pages (ADR-0001 D1).
// Charts stay bespoke per page; these are the common building blocks.
import React, { useEffect, useState } from "react";

export const CARD_SH = "0 16px 40px -24px rgba(40,52,86,0.22), 0 4px 14px -8px rgba(40,52,86,0.07)";

export type Tint = { bg: string; bd: string; ring: string };

export const inrAbbr = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`;
  return `₹${Math.round(v)}`;
};

// counts: keep small numbers exact (3,416), abbreviate large (250k, 1.2M)
export const countAbbr = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${Math.round(v / 1e3)}k`;
  return Math.round(v).toLocaleString("en-IN");
};

export const catName = (g: string) => String(g).replace(/^M\d+-/, "");

export function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (n: number) => { const p = Math.min((n - start) / 1100, 1); setV(value * easeOut(p)); if (p < 1) raf = requestAnimationFrame(tick); else setV(value); };
    raf = requestAnimationFrame(tick);
    const g = setTimeout(() => setV(value), 1200);
    return () => { cancelAnimationFrame(raf); clearTimeout(g); };
  }, [value]);
  return <>{format(v)}</>;
}

export const useMount = (delay = 0) => {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 140 + delay); return () => clearTimeout(t); }, [delay]);
  return on;
};

// Catmull-Rom → cubic-bezier smoothing for fluid lines
export function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

const INK = "#1f2333";

// Uniform stat card: icon + label, big number, caption, share bar pinned to the bottom.
export function StatCard({ tint, icon: Icon, label, value, format, sub, pct, barLabel, delay = 0 }: {
  tint: Tint; icon: React.ComponentType<{ size?: number }>; label: string; value: number;
  format: (n: number) => string; sub: string; pct: number; barLabel: string; delay?: number;
}) {
  const on = useMount(delay); const p = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="rounded-[24px] p-5 flex flex-col" style={{ background: tint.bg, minHeight: 196, border: `1px solid ${tint.bd}`, boxShadow: CARD_SH }}>
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-white flex-shrink-0" style={{ color: tint.ring, boxShadow: "0 5px 12px -7px rgba(40,52,86,0.4)" }}><Icon size={17} /></span>
        <span className="text-[13px] font-semibold" style={{ color: INK }}>{label}</span>
      </div>
      <div className="mt-4">
        <div className="text-[30px] leading-none font-bold tabular-nums tracking-tight whitespace-nowrap" style={{ color: INK }}><CountUp value={value} format={format} /></div>
        <div className="mt-2 text-[12px]" style={{ color: "#5a6178" }}>{sub}</div>
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium" style={{ color: "#7a8298" }}>{barLabel}</span>
          <span className="text-[12px] font-bold tabular-nums" style={{ color: tint.ring }}>{Math.round(p)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.75)" }}>
          <div className="h-full rounded-full" style={{ width: on ? `${Math.max(p, 3)}%` : "0%", background: tint.ring, transition: "width 1.15s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
      </div>
    </div>
  );
}
