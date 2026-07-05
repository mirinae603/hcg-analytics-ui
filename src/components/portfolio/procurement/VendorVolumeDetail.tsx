"use client";
// B4 — Vendor Volume Contribution. Unique identity: slate-indigo "concentration".
// Signature visuals (not shared with any other procurement page):
//   • Lorenz concentration curve — shaded gap between actual cumulative spend and
//     the perfect-equality diagonal = how lopsided the supplier base is.
//   • Packed-bubble supplier galaxy — vendors sized by spend, greedily packed.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRegion } from "@/context/RegionContext";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { inrAbbr, countAbbr, useMount, CountUp, smoothPath } from "@/components/portfolio/kit";
import { TbChartArcs3, TbBuildingFactory2 } from "react-icons/tb";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });

// --- soft periwinkle-indigo identity (aligned with the pastel sibling pages) ---
const PAGE = "#F1F2FA", INK = "#272c42", SUB = "#8a90a6";
const DEEP = "#6d6ef0", INDIGO = "#818cf8", PERI = "#a5b4fc", SKY = "#93c5fd", SLATE = "#7a8098";
const SH = "0 22px 46px -28px rgba(70,70,130,0.34), 0 4px 12px -8px rgba(70,70,130,0.08)";
const vName = (s: string, n = 16) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");

function Shell({ region, children }: any) {
  return (
    <div className="-m-4 md:-m-6 p-4 md:p-6 space-y-5 min-w-0" style={{ background: PAGE, minHeight: "calc(100vh - 64px)" }}>
      <style jsx global>{`
        @keyframes vvIn { from { opacity: 0; transform: translateY(16px) scale(0.987); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .vv-card { animation: vvIn 0.6s cubic-bezier(0.22,1,0.36,1) both; min-width: 0; }
      `}</style>
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: INK }}>Vendor volume contribution</h1>
          <p className="text-[13px] mt-1" style={{ color: SUB }}>who the spend flows to & how concentrated the supplier base is · {region}</p>
        </div>
        <span className="text-[12px] font-medium px-3.5 py-2 rounded-full bg-white" style={{ color: "#5b6478", boxShadow: "0 4px 14px -8px rgba(40,52,86,0.2)" }}>6-month window</span>
      </div>
      {children}
    </div>
  );
}

function Card({ children, delay = 0, className = "", style = {} }: any) {
  return <div className={`vv-card rounded-[26px] ${className}`} style={{ boxShadow: SH, animationDelay: `${delay}ms`, ...style }}>{children}</div>;
}

// ---------------- Hero: concentration-split donut ----------------
function ConcentrationDonut({ t }: { t: any }) {
  const on = useMount(60);
  const hhi = Number(t?.hhi ?? 0);
  const top1 = Number(t?.top1 ?? 0), top5 = Number(t?.top5 ?? 0), top10 = Number(t?.top10 ?? 0);
  const verdict = hhi >= 2500 ? "Highly concentrated" : hhi >= 1500 ? "Moderately concentrated" : "Competitive base";
  const segs = [
    { label: "Top vendor", val: top1, op: 0.97 },
    { label: "Vendors 2–5", val: Math.max(top5 - top1, 0), op: 0.6 },
    { label: "Vendors 6–10", val: Math.max(top10 - top5, 0), op: 0.37 },
    { label: "All others", val: Math.max(100 - top10, 0), op: 0.18 },
  ];
  const R = 56, SW = 19, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = segs.map((s) => { const len = (s.val / 100) * C; const a = { ...s, len, off: acc }; acc += len; return a; });
  return (
    <Card delay={0} className="relative overflow-hidden p-6 flex flex-col flex-1" style={{ background: "linear-gradient(158deg,#9296f5 0%,#7c81f2 48%,#6c6fea 100%)", minHeight: 360 }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 220, height: 220, background: "#c7d0ff", opacity: 0.4, top: -80, right: -50 }} />
      <div className="absolute rounded-full blur-3xl" style={{ width: 150, height: 150, background: "#e9d5ff", opacity: 0.2, bottom: -50, left: -30 }} />
      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.62)" }}><TbChartArcs3 size={14} />Concentration index</div>
        <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>{verdict}</span>
      </div>
      <div className="relative flex items-center gap-4 mt-4 flex-1">
        <svg viewBox="0 0 148 148" width="140" height="140" className="flex-shrink-0">
          <circle cx="74" cy="74" r={R} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={SW} />
          {arcs.map((a, i) => (
            <circle key={i} cx="74" cy="74" r={R} fill="none" stroke="#fff" strokeOpacity={on ? a.op : 0} strokeWidth={SW} strokeLinecap="butt"
              transform="rotate(-90 74 74)" strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={-a.off}
              style={{ transition: `stroke-opacity 0.7s ease ${0.2 + i * 0.14}s` }} />
          ))}
          <text x="74" y="70" textAnchor="middle" style={{ fontSize: 27, fontWeight: 800, fill: "#fff" }} className="tabular-nums"><CountUp value={hhi} format={(n) => Math.round(n).toLocaleString("en-IN")} /></text>
          <text x="74" y="86" textAnchor="middle" style={{ fontSize: 9.5, fill: "rgba(255,255,255,0.62)", letterSpacing: "0.08em" }}>HHI INDEX</text>
        </svg>
        <div className="flex-1 min-w-0 space-y-2">
          {arcs.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "#fff", opacity: a.op }} />
                <span className="text-[11.5px] truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{a.label}</span>
              </span>
              <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: "#fff" }}>{a.val.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative pt-5 grid grid-cols-3 gap-2.5">
        {[{ l: "Vendors", v: countAbbr(Number(t?.vendors ?? 0)) }, { l: "Vendors → 80%", v: `${Math.round(Number(t?.n80 ?? 0))}` }, { l: "Top-10 share", v: `${top10.toFixed(0)}%` }].map((p, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div className="text-[15px] font-bold tabular-nums leading-none" style={{ color: "#fff" }}>{p.v}</div>
            <div className="text-[10px] mt-1 truncate" style={{ color: "rgba(255,255,255,0.62)" }}>{p.l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Pareto: per-vendor bars + cumulative line + 80% threshold ----------------
function ParetoChart({ vendors, t }: { vendors: any[]; t: any }) {
  const on = useMount(180); const [hov, setHov] = useState<number | null>(null);
  if (!vendors.length) return null;
  const n = Math.max(Number(t?.vendors ?? vendors.length), vendors.length);
  const n80 = Number(t?.n80 ?? 0);
  const N = vendors.length;
  const W = 780, H = 320, PADL = 40, PADR = 42, PADT = 22, PADB = 38;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const slot = innerW / N;
  const bx = (i: number) => PADL + slot * i + slot / 2;
  const maxShare = Math.max(...vendors.map((v) => v.share), 1);
  const yBar = (s: number) => PADT + innerH - (s / maxShare) * innerH;      // left axis: individual share
  const yCum = (c: number) => PADT + innerH - (c / 100) * innerH;           // right axis: cumulative %
  const cumPts = vendors.map((v, i) => ({ x: bx(i), y: yCum(v.cum) }));
  const cumLine = smoothPath(cumPts);
  const bw = Math.min(slot * 0.5, 24);
  const AMBER = "#e6a34e";

  return (
    <Card delay={140} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Spend concentration · Pareto</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>each vendor's individual share (bars) and the running cumulative total (line)</p></div>
        <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: "#6b7488" }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-[3px]" style={{ background: INDIGO }} />Vendor share</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full" style={{ background: DEEP }} />Cumulative</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0 border-t-2 border-dashed" style={{ borderColor: AMBER }} />80% line</span>
        </div>
      </div>
      <div className="relative mt-3 flex-1" style={{ minHeight: 250 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id="vvBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={INDIGO} />
              <stop offset="100%" stopColor={PERI} />
            </linearGradient>
          </defs>
          {/* gridlines + right axis (cumulative %) */}
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={PADL} y1={yCum(g)} x2={W - PADR} y2={yCum(g)} stroke="#f1f3f8" strokeWidth="1" />
              <text x={W - PADR + 6} y={yCum(g) + 3} textAnchor="start" style={{ fontSize: 9.5, fill: DEEP, opacity: 0.55 }}>{g}%</text>
            </g>
          ))}
          {/* left axis (individual share %) */}
          {[0, maxShare / 2, maxShare].map((s, i) => (
            <text key={i} x={PADL - 6} y={yBar(s) + 3} textAnchor="end" style={{ fontSize: 9.5, fill: "#a9b0c2" }}>{s.toFixed(0)}%</text>
          ))}
          {/* 80% threshold */}
          <line x1={PADL} y1={yCum(80)} x2={W - PADR} y2={yCum(80)} stroke={AMBER} strokeWidth="1.5" strokeDasharray="5 5" opacity="0.9" />
          {/* bars */}
          {vendors.map((v, i) => { const h = (v.share / maxShare) * innerH; const active = hov === i; return (
            <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: "pointer" }}>
              <rect x={bx(i) - slot / 2} y={PADT} width={slot} height={innerH} fill="transparent" />
              <rect x={bx(i) - bw / 2} y={on ? yBar(v.share) : PADT + innerH} width={bw} height={on ? Math.max(h, 2) : 0} rx="4"
                fill="url(#vvBar)" opacity={active ? 1 : 0.9} style={{ transition: `height 0.8s cubic-bezier(0.34,1.05,0.64,1) ${i * 45}ms, y 0.8s cubic-bezier(0.34,1.05,0.64,1) ${i * 45}ms`, filter: active ? `drop-shadow(0 6px 12px ${INDIGO}55)` : "none" }} />
              {v.share >= maxShare * 0.12 && <text x={bx(i)} y={yBar(v.share) - 6} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 700, fill: INDIGO, opacity: on ? 1 : 0, transition: `opacity 0.5s ease ${0.5 + i * 0.04}s` }} className="tabular-nums">{v.share.toFixed(1)}%</text>}
            </g>
          ); })}
          {/* cumulative line */}
          <path d={cumLine} fill="none" stroke={DEEP} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.4s ease 0.5s", filter: `drop-shadow(0 5px 9px ${DEEP}33)` }} />
          {cumPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hov === i ? 5 : 3.2} fill="#fff" stroke={DEEP} strokeWidth="2.5"
            onMouseEnter={() => setHov(i)} style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.7 + i * 0.04}s`, cursor: "pointer" }} />)}
          {/* x ticks */}
          {vendors.map((_, i) => (i % 2 === 0 || N <= 8) && <text key={i} x={bx(i)} y={H - 14} textAnchor="middle" style={{ fontSize: 9, fill: hov === i ? INK : "#a9b0c2", fontWeight: hov === i ? 700 : 500 }}>#{i + 1}</text>)}
        </svg>
        {/* n80 chip */}
        {n80 > 0 && (
          <div className="absolute right-1 pointer-events-none" style={{ top: 2 }}>
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-full" style={{ background: `${AMBER}1f`, color: "#b8791f", boxShadow: "0 4px 12px -6px rgba(40,52,86,0.18)" }}>
              <b className="tabular-nums">{Math.round(n80)}</b> of {countAbbr(n)} vendors reach <b>80%</b>
            </span>
          </div>
        )}
        {/* tooltip */}
        {hov != null && vendors[hov] && (() => { const p = vendors[hov]; const left = (bx(hov) / W) * 100; return (
          <div className="absolute pointer-events-none" style={{ left: `${Math.min(Math.max(left, 11), 86)}%`, top: 30, transform: "translate(-50%,0)" }}>
            <div className="px-3 py-1.5 rounded-xl text-center whitespace-nowrap" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(40,52,86,0.42)", border: "1px solid #eef0f6" }}>
              <div className="text-[12px] font-bold" style={{ color: INK }}>#{hov + 1} · {vName(p.name, 20)}</div>
              <div className="text-[11px] tabular-nums" style={{ color: INDIGO }}>{inrAbbr(p.value)} · {p.share.toFixed(1)}% <span style={{ color: DEEP }}>· cum {p.cum.toFixed(0)}%</span></div>
            </div>
          </div>
        ); })()}
      </div>
    </Card>
  );
}

// ---------------- Packed-bubble supplier galaxy ----------------
function tier(share: number) {
  if (share >= 8) return DEEP; if (share >= 4) return INDIGO; if (share >= 1.5) return PERI; return SKY;
}
function packBubbles(items: { r: number }[], cx: number, cy: number) {
  const placed: { x: number; y: number; r: number }[] = [];
  items.forEach((it, idx) => {
    if (idx === 0) { placed.push({ x: cx, y: cy, r: it.r }); return; }
    for (let s = 1; s < 6000; s++) {
      const ang = s * 0.5 + idx; const dist = 4 + s * 0.55;
      const x = cx + dist * Math.cos(ang), y = cy + dist * Math.sin(ang);
      let ok = true;
      for (const q of placed) { if (Math.hypot(x - q.x, y - q.y) < it.r + q.r + 3) { ok = false; break; } }
      if (ok) { placed.push({ x, y, r: it.r }); return; }
    }
    placed.push({ x: cx, y: cy, r: it.r });
  });
  return placed;
}
function BubbleGalaxy({ vendors }: { vendors: any[] }) {
  const on = useMount(220); const [hov, setHov] = useState<number | null>(null);
  const W = 560, H = 360, PAD = 18;
  const bubbles = useMemo(() => {
    const data = (vendors || []).slice(0, 14);
    if (!data.length) return [];
    const maxS = Math.max(...data.map((d) => d.share), 1);
    const sized = data.map((d) => ({ ...d, r: 19 + Math.sqrt(d.share / maxS) * 47 }));
    const pos = packBubbles(sized, 0, 0); // pack around origin
    // fit the cluster's bounding box into the panel, centered
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pos.forEach((p, i) => { const r = sized[i].r; minX = Math.min(minX, p.x - r); maxX = Math.max(maxX, p.x + r); minY = Math.min(minY, p.y - r); maxY = Math.max(maxY, p.y + r); });
    const bw = maxX - minX || 1, bh = maxY - minY || 1;
    const scale = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return sized.map((d, i) => ({ ...d, x: (pos[i].x - cx) * scale + W / 2, y: (pos[i].y - cy) * scale + H / 2, r: sized[i].r * scale }));
  }, [vendors]);
  if (!bubbles.length) return null;
  const top = bubbles.reduce((a, b, i) => (b.share > bubbles[a].share ? i : a), 0);
  return (
    <Card delay={200} className="bg-white p-6 flex flex-col flex-1" style={{ overflow: "hidden" }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Supplier galaxy</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>each vendor sized by share of total spend · top {bubbles.length} · hover for detail</p></div>
        <div className="flex items-center gap-2.5 text-[10.5px] font-medium" style={{ color: "#6b7488" }}>
          {[["≥8%", DEEP], ["≥4%", INDIGO], ["≥1.5%", PERI], ["<1.5%", SKY]].map(([l, c]) => (
            <span key={l as string} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c as string }} />{l}</span>
          ))}
        </div>
      </div>
      <div className="relative mt-2 flex-1 flex items-center justify-center" style={{ minHeight: 300 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
          {bubbles.map((b, i) => { const c = tier(b.share); const active = hov === i; const dim = hov != null && !active; const isTop = i === top; return (
            <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: "pointer", transformOrigin: `${b.x}px ${b.y}px`, transform: on ? "scale(1)" : "scale(0)", opacity: on ? (dim ? 0.4 : 1) : 0, transition: `transform 0.7s cubic-bezier(0.34,1.4,0.64,1) ${i * 55}ms, opacity 0.35s ease ${on ? 0 : i * 55}ms` }}>
              <circle cx={b.x} cy={b.y} r={b.r} fill={`${c}20`} stroke={c} strokeWidth={active ? 2.5 : 1.5} style={{ filter: active ? `drop-shadow(0 8px 18px ${c}66)` : "none", transition: "stroke-width 0.2s" }} />
              <circle cx={b.x} cy={b.y} r={b.r * 0.54} fill={c} opacity={active ? 0.95 : 0.82} />
              <text x={b.x} y={b.y + (isTop ? -1 : 3.5)} textAnchor="middle" style={{ fontSize: b.r >= 38 ? 14 : b.r >= 24 ? 11 : 9, fontWeight: 800, fill: "#fff", filter: "drop-shadow(0 1px 1.5px rgba(48,52,92,0.4))" }} className="tabular-nums">{b.share.toFixed(1)}%</text>
              {isTop && b.r >= 38 && <text x={b.x} y={b.y + 13} textAnchor="middle" style={{ fontSize: 8.5, fontWeight: 600, fill: "rgba(255,255,255,0.9)", letterSpacing: "0.02em", filter: "drop-shadow(0 1px 1.5px rgba(48,52,92,0.4))" }}>{vName(b.name, 14)}</text>}
            </g>
          ); })}
        </svg>
        {hov != null && bubbles[hov] && (
          <div className="absolute top-1 left-1 pointer-events-none">
            <div className="px-3 py-2 rounded-xl" style={{ background: "#fff", boxShadow: "0 10px 24px -10px rgba(40,52,86,0.42)", border: "1px solid #eef0f6" }}>
              <div className="text-[12px] font-bold" style={{ color: INK }}>{vName(bubbles[hov].name, 26)}</div>
              <div className="text-[11px] tabular-nums" style={{ color: INDIGO }}>{inrAbbr(bubbles[hov].value)} · {bubbles[hov].share.toFixed(1)}% · {countAbbr(bubbles[hov].lines)} lines</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------- Leaders ladder ----------------
function Leaders({ vendors, t }: { vendors: any[]; t: any }) {
  const on = useMount(260);
  const rows = (vendors || []).slice(0, 8);
  const maxShare = Math.max(...rows.map((r: any) => r.share), 1);
  return (
    <Card delay={260} className="bg-white p-6 flex flex-col flex-1">
      <div className="flex items-center justify-between">
        <div><h3 className="text-[16px] font-semibold" style={{ color: INK }}>Largest suppliers</h3>
          <p className="text-[12px] mt-0.5" style={{ color: SUB }}>by share of total spend</p></div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${INDIGO}14`, color: INDIGO }}>top-10 = {Number(t?.top10 ?? 0).toFixed(0)}%</span>
      </div>
      <div className="mt-3 flex-1 flex flex-col justify-between gap-1">
        {rows.map((r: any, i: number) => (
          <div key={i} className="py-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 tabular-nums" style={{ background: `${tier(r.share)}18`, color: tier(r.share) }}>{i + 1}</span>
                <span className="text-[12.5px] font-medium truncate" style={{ color: "#3c465c" }} title={r.name}>{vName(r.name, 22)}</span>
              </div>
              <span className="text-[12.5px] font-bold tabular-nums flex-shrink-0" style={{ color: INK }}>{r.share.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden ml-[34px]" style={{ background: "#f0f2f7" }}>
              <div className="h-full rounded-full" style={{ width: on ? `${(r.share / maxShare) * 100}%` : "0%", background: tier(r.share), transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms` }} />
            </div>
          </div>
        ))}
        {!rows.length && <div className="py-8 text-center text-gray-400 text-sm">No data.</div>}
      </div>
    </Card>
  );
}

const COLUMNS = [
  { field: "plant", label: "Hospital" }, { field: "vendor_name", label: "Vendor" },
  { field: "vendor_value", label: "Spend", kind: "inr" as const }, { field: "vendor_qty", label: "Qty", kind: "num" as const },
  { field: "po_lines", label: "PO Lines", kind: "num" as const }, { field: "value_share_pct", label: "Share %", kind: "num" as const },
];

export default function VendorVolumeDetail() {
  const { selectedRegion } = useRegion();
  const region = selectedRegion?.name ?? "All Plants";
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${DASHBOARD_API_BASE_URL}/kpi/vendor-volume-contribution/insights?Plant=${encodeURIComponent(region)}`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [region]);
  const t = data?.totals || {};
  const vendors = data?.vendors || [];
  return (
    <Shell region={region}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-4 flex flex-col min-w-0"><ConcentrationDonut t={t} /></div>
        <div className="xl:col-span-8 flex flex-col min-w-0"><ParetoChart vendors={vendors} t={t} /></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 flex flex-col min-w-0"><BubbleGalaxy vendors={vendors} /></div>
        <div className="xl:col-span-5 flex flex-col min-w-0"><Leaders vendors={vendors} t={t} /></div>
      </div>
      <Card delay={320} className="bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Vendor purchase detail</h3>
          <p className="text-xs text-gray-400 mt-0.5">paginated · sortable · filterable · export CSV</p>
        </div>
        <KpiTable kpiKey="vendor-volume-contribution" plant={region} columns={COLUMNS} />
      </Card>
    </Shell>
  );
}
