"use client";
import React from "react";

// Ultra-lightweight inline-SVG mini chart for the on-hover card preview.
// NO charting library — just SVG paths. Cannot crash, costs ~nothing to render,
// so dozens can stay mounted without blocking the main thread (unlike ApexCharts).

type Kind = "bar" | "line" | "donut";

const DONUT_PALETTE = ["#93C5FD", "#6EE7B7", "#FDE68A", "#FCA5A5", "#C4B5FD", "#67E8F9"];

export default function MiniSparkChart({
  kind,
  values,
  color,
  width = 230,
  height = 120,
}: {
  kind: Kind;
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const data = (values && values.length ? values : [4, 7, 5, 9, 6, 8, 3, 10, 7, 5]).map((v) =>
    Number.isFinite(v) ? v : 0
  );

  // ─── DONUT ──────────────────────────────────────────────
  if (kind === "donut") {
    const total = data.reduce((a, b) => a + Math.abs(b), 0) || 1;
    const r = 38;
    const cx = width / 2;
    const cy = height / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {data.slice(0, 6).map((v, i) => {
            const frac = Math.abs(v) / total;
            const dash = frac * circumference;
            const seg = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                strokeWidth={14}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
      </svg>
    );
  }

  // shared scaling for bar/line
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pad = 8;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const n = data.length;

  // ─── BAR ────────────────────────────────────────────────
  if (kind === "bar") {
    const gap = 2;
    const barW = Math.max(2, w / n - gap);
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {data.map((v, i) => {
          const bh = ((v - min) / range) * h;
          const x = pad + i * (w / n);
          const y = pad + (h - bh);
          return <rect key={i} x={x} y={y} width={barW} height={Math.max(1, bh)} rx={2} fill={color} opacity={0.85} />;
        })}
      </svg>
    );
  }

  // ─── LINE / AREA ────────────────────────────────────────
  const pts = data.map((v, i) => {
    const x = pad + (n === 1 ? w / 2 : (i / (n - 1)) * w);
    const y = pad + (h - ((v - min) / range) * h);
    return [x, y];
  });
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${(pad + h).toFixed(1)} L${pts[0][0].toFixed(1)},${(pad + h).toFixed(1)} Z`;
  const gradId = `spark-grad-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.03} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
