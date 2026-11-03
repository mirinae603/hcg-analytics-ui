"use client";
// Flow — a sankey: an amount followed from column to column (unit → material type → formulary
// bucket), each band as wide as the amount it carries. Every node is as tall as the larger of
// what flows in and what flows out, on ONE scale for the whole chart, so band widths compare
// across columns. Bands leave a node in the order of the nodes they reach (and arrive in the
// order of the nodes they come from), so they cross as little as they can.
//
// Every node is named with its figure: the first column's names to its left, the others' to
// their right, on a white halo where they sit over bands. Hovering a node lights the bands that
// touch it, hovering a band lights that band and its two ends, and the panel header names what
// is under the pointer. The accessible name lists every node's figure by column; the drawer
// beside it has every band in exact figures.
//
// A band's colour is the caller's, else its source node's; a node's is the caller's, else the
// kit's SERIES in order within its column. Zero and negative bands are not drawn.
//
// A node the caller gives an action (`nodeAction`: select that hospital, narrow to that type)
// is a button — pointer and keyboard (Tab, Enter or Space) alike, named with its figure and what
// it does — and the chart is then a group of them rather than one picture; focus lights the node
// as hover does.
//
// Panel-aware: in a ChartPanel it fills the body; in a drawer it takes its own height.
import React, { useState } from "react";
import { INK, SUB, CARD, seriesCol, tint, useArmed } from "./kit";
import { useWidth } from "./minis";
import { usePanel, usePanelReadout } from "./panel";
import { isNum } from "./format";
import { clamp, textW } from "./scale";

export type FlowNode = { id: string; label: string; column: number; color?: string };
export type FlowLink = { source: string; target: string; value: number; color?: string };
/** What clicking a node does: the words its button adds to its name, and the action. */
export type FlowAction = { label: string; run: () => void };

const NODE_W = 12;
const NAME_FS = 11, VALUE_FS = 10.5, CAPTION_FS = 10;
const CAPTION_H = 16;
/** Below this width the column names would run into each other: they are left to the aria. */
const CAPTIONS_MIN_W = 560;
const PAD = 6;
/** Names wider than this share of the chart are cut short (the tooltip and aria have them whole). */
const LABEL_SHARE = 0.22;
/** A node this tall prints its figure on a second line under its name. */
const TWO_LINE_H = 26;

/** How wide a semibold label prints: textW's estimate with room for the heavier weight. */
const labelW = (s: string, fs: number) => textW(s, fs) * 1.08;

/** `s` cut to `maxW` px at `fs`, with an ellipsis. */
function fit(s: string, maxW: number, fs: number): string {
  if (labelW(s, fs) <= maxW) return s;
  const n = Math.max(1, Math.floor(maxW / (fs * 0.58 * 1.08)) - 1);
  return n >= s.length ? s : `${s.slice(0, n).trimEnd()}…`;
}

type Placed = FlowNode & { x: number; y: number; h: number; value: number; color: string };
type Band = FlowLink & { w: number; sy: number; ty: number; color: string; key: string };
type Hover = { kind: "node" | "link"; id: string } | null;

export function Flow({ nodes, links, format, ariaLabel, columns, height = 360, nodeAction }: {
  nodes: FlowNode[];
  links: FlowLink[];
  /** Prints a node's or band's figure. */
  format: (v: number) => string;
  ariaLabel: string;
  /** Each column's name, printed over it: ["Unit", "Material type", "Formulary bucket"]. */
  columns?: string[];
  /** Outside a panel. */
  height?: number;
  /** A node's action, or null to leave it a plain mark. */
  nodeAction?: (node: FlowNode) => FlowAction | null;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(720);
  const [hover, setHover] = useState<Hover>(null);
  const W = panel ? panel.size.w : measured;
  const H = panel ? panel.size.h : height;

  const live = links.filter((l) => isNum(l.value) && l.value > 0);
  const inOf = new Map<string, number>(), outOf = new Map<string, number>();
  for (const l of live) {
    outOf.set(l.source, (outOf.get(l.source) ?? 0) + l.value);
    inOf.set(l.target, (inOf.get(l.target) ?? 0) + l.value);
  }
  const used = nodes.filter((n) => (inOf.get(n.id) ?? 0) > 0 || (outOf.get(n.id) ?? 0) > 0);
  const nCols = used.length ? Math.max(...used.map((n) => n.column)) + 1 : 0;
  const byCol = Array.from({ length: nCols }, (_, c) => used.filter((n) => n.column === c));
  const valueOf = (id: string) => Math.max(inOf.get(id) ?? 0, outOf.get(id) ?? 0);

  // Room for the names: the first column's to its left, the last column's to its right.
  // A small node prints its name and figure on one line, so the room is sized for that.
  const nameW = (col: FlowNode[]) => Math.max(0, ...col.map((n) => labelW(`${n.label} · ${format(valueOf(n.id))}`, NAME_FS)));
  const left = nCols ? clamp(nameW(byCol[0]) + 10, 60, W * LABEL_SHARE) : 0;
  const right = nCols > 1 ? clamp(nameW(byCol[nCols - 1]) + 10, 60, W * LABEL_SHARE) : 0;
  const top = PAD + (columns?.length && W >= CAPTIONS_MIN_W ? CAPTION_H : 0);
  const avail = Math.max(10, H - top - PAD);
  const gapOf = (n: number) => (n > 1 ? Math.min(10, (avail * 0.3) / (n - 1)) : 0);
  // One scale for every column: the fullest column fills the height.
  const k = Math.min(...byCol.map((col) => {
    const total = col.reduce((t, n) => t + valueOf(n.id), 0);
    return total > 0 ? (avail - gapOf(col.length) * (col.length - 1)) / total : Infinity;
  }));
  const xOf = (c: number) => (nCols <= 1 ? left : left + (c / (nCols - 1)) * (W - left - right - NODE_W));

  const placed = new Map<string, Placed>();
  byCol.forEach((col, c) => {
    const g = gapOf(col.length);
    const usedH = col.reduce((t, n) => t + valueOf(n.id) * k, 0) + g * (col.length - 1);
    let y = top + Math.max(0, (avail - usedH) / 2);
    col.forEach((n, i) => {
      const h = Math.max(1, valueOf(n.id) * k);
      placed.set(n.id, { ...n, x: xOf(c), y, h, value: valueOf(n.id), color: n.color ?? seriesCol(i) });
      y += h + g;
    });
  });

  // Bands leave in the order of the nodes they reach and arrive in the order they come from.
  const bands: Band[] = [];
  const outAt = new Map<string, number>(), inAt = new Map<string, number>();
  const ordered = live.filter((l) => placed.has(l.source) && placed.has(l.target))
    .sort((a, b) => (placed.get(a.source)!.y - placed.get(b.source)!.y) || (placed.get(a.target)!.y - placed.get(b.target)!.y));
  for (const l of ordered) {
    const s = placed.get(l.source)!;
    const w = l.value * k;
    const sy = s.y + (outAt.get(l.source) ?? 0);
    outAt.set(l.source, (outAt.get(l.source) ?? 0) + w);
    bands.push({ ...l, w, sy, ty: 0, color: l.color ?? s.color, key: `${l.source}>${l.target}` });
  }
  [...bands].sort((a, b) => (placed.get(a.target)!.y - placed.get(b.target)!.y) || (placed.get(a.source)!.y - placed.get(b.source)!.y))
    .forEach((b) => { b.ty = placed.get(b.target)!.y + (inAt.get(b.target) ?? 0); inAt.set(b.target, (inAt.get(b.target) ?? 0) + b.w); });

  const path = (b: Band) => {
    const s = placed.get(b.source)!, t = placed.get(b.target)!;
    const x0 = s.x + NODE_W, x1 = t.x, xm = (x0 + x1) / 2;
    return `M${x0},${b.sy}C${xm},${b.sy} ${xm},${b.ty} ${x1},${b.ty}L${x1},${b.ty + b.w}C${xm},${b.ty + b.w} ${xm},${b.sy + b.w} ${x0},${b.sy + b.w}Z`;
  };
  const lit = (b: Band) => !hover || (hover.kind === "link" ? hover.id === b.key : b.source === hover.id || b.target === hover.id);
  const nodeLit = (id: string) => !hover || (hover.kind === "node" ? hover.id === id
    : bands.some((b) => b.key === hover.id && (b.source === id || b.target === id)));

  // Names never print over each other: in each column a name that would overlap the one above
  // moves down, and the column moves back up if that pushes its last name off the chart.
  const labelH = (n: Placed) => (n.h >= TWO_LINE_H ? 26 : 13);
  const labelY = new Map<string, number>();
  byCol.forEach((col) => {
    const ns = col.map((n) => placed.get(n.id)!).sort((a, b) => a.y - b.y);
    const ys = ns.map((n) => n.y + n.h / 2);
    for (let i = 1; i < ns.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + (labelH(ns[i - 1]) + labelH(ns[i])) / 2 + 1);
    const over = ns.length ? ys[ns.length - 1] + labelH(ns[ns.length - 1]) / 2 - (H - 1) : 0;
    if (over > 0) {
      ys[ns.length - 1] -= over;
      for (let i = ns.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - (labelH(ns[i]) + labelH(ns[i + 1])) / 2 - 1);
    }
    ns.forEach((n, i) => labelY.set(n.id, ys[i]));
  });

  const nameOf = (id: string) => placed.get(id)?.label ?? id;
  const readout = hover?.kind === "node" ? (() => { const n = placed.get(hover.id); return n ? <span><b>{n.label}</b> {format(n.value)}</span> : null; })()
    : hover?.kind === "link" ? (() => { const b = bands.find((x) => x.key === hover.id); return b ? <span><b>{nameOf(b.source)}</b> → <b>{nameOf(b.target)}</b> {format(b.value)}</span> : null; })()
    : null;
  usePanelReadout(hover ? `${hover.kind}:${hover.id}` : null, () => readout);

  const said = byCol.map((col, c) => `${columns?.[c] ?? `Column ${c + 1}`}: ${col.map((n) => `${n.label} ${format(valueOf(n.id))}`).join(", ")}`).join(". ");
  // Each drawn node's action, worked out once; with any, the svg is a group of buttons.
  const actions = new Map<string, FlowAction>();
  if (nodeAction) for (const n of placed.values()) { const a = nodeAction(n); if (a) actions.set(n.id, a); }
  const acting = actions.size > 0;

  if (!bands.length) return <div ref={ref}><p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p></div>;

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role={acting ? "group" : "img"} aria-label={`${ariaLabel}. ${said}.`} style={{ display: "block" }}
        onMouseLeave={() => setHover(null)}>
        {/* The column names, where they have room to stand apart (not on a phone). */}
        {columns?.length && W >= CAPTIONS_MIN_W ? (
          <g aria-hidden="true" style={{ fontSize: CAPTION_FS, fontWeight: 600, fill: SUB, letterSpacing: ".06em" }}>
            {columns.slice(0, nCols).map((cap, c) => (
              <text key={cap} x={c === 0 ? xOf(0) + NODE_W : c === nCols - 1 && nCols > 1 ? W - 2 : xOf(c)} y={PAD + 9}
                textAnchor={c === 0 || (c === nCols - 1 && nCols > 1) ? "end" : "start"}>{cap.toUpperCase()}</text>
            ))}
          </g>
        ) : null}
        <g aria-hidden={acting || undefined} style={{ opacity: on ? 1 : 0, transition: "opacity 500ms ease 120ms" }}>
          {bands.map((b) => (
            <path key={b.key} d={path(b)} fill={b.color} fillOpacity={lit(b) ? (hover ? 0.62 : 0.34) : 0.1}
              onMouseEnter={() => setHover({ kind: "link", id: b.key })} style={{ transition: "fill-opacity 160ms ease", cursor: "default" }}>
              <title>{`${nameOf(b.source)} → ${nameOf(b.target)}: ${format(b.value)}`}</title>
            </path>
          ))}
        </g>
        {[...placed.values()].map((n) => {
          const first = n.column === 0;
          const tx = first ? n.x - 6 : n.x + NODE_W + 6;
          const room = first ? left - 10 : n.column === nCols - 1 ? right - 10 : Math.max(60, (xOf(n.column + 1) - n.x) * 0.5);
          const val = format(n.value);
          const two = n.h >= TWO_LINE_H;
          // On one line the figure always shows; the name gives way.
          const one = `${fit(n.label, room - labelW(` · ${val}`, NAME_FS), NAME_FS)} · ${val}`;
          const cy = labelY.get(n.id) ?? n.y + n.h / 2;
          const halo = { paintOrder: "stroke" as const, stroke: CARD, strokeWidth: 3, strokeLinejoin: "round" as const };
          const act = actions.get(n.id);
          const button = act ? {
            role: "button", tabIndex: 0, "aria-label": `${n.label} ${val}: ${act.label}`, className: "hcg-flow-node",
            onClick: act.run,
            onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act.run(); } },
            onFocus: () => setHover({ kind: "node", id: n.id }), onBlur: () => setHover(null),
          } : { "aria-hidden": acting || undefined };
          return (
            <g key={n.id} {...button} onMouseEnter={() => setHover({ kind: "node", id: n.id })}
              style={{ opacity: nodeLit(n.id) ? 1 : 0.4, transition: "opacity 160ms ease", cursor: act ? "pointer" : undefined }}>
              <title>{`${n.label}: ${val}${act ? ` · ${act.label}` : ""}`}</title>
              <rect x={n.x} y={n.y} width={NODE_W} height={n.h} rx={2} fill={n.color} />
              <rect x={first ? n.x - room - 6 : n.x} y={n.y} width={room + NODE_W + 6} height={Math.max(n.h, 14)} fill="transparent" />
              <g aria-hidden="true" style={{ pointerEvents: "none" }}>
                {two ? (
                  <>
                    <text x={tx} y={cy - 2} textAnchor={first ? "end" : "start"} style={{ fontSize: NAME_FS, fontWeight: 600, fill: INK, ...halo }}>{fit(n.label, room, NAME_FS)}</text>
                    <text x={tx} y={cy + 11} textAnchor={first ? "end" : "start"} style={{ fontSize: VALUE_FS, fontWeight: 700, fill: tint(INK, 0.75), ...halo }}>{val}</text>
                  </>
                ) : (
                  <text x={tx} y={cy + 3.5} textAnchor={first ? "end" : "start"} style={{ fontSize: n.h >= 12 ? NAME_FS : VALUE_FS, fontWeight: 600, fill: INK, ...halo }}>{one}</text>
                )}
              </g>
            </g>
          );
        })}
      </svg>
      {/* A focused node's bar is outlined (an svg group has no focus ring of its own). */}
      <style jsx global>{`
        .hcg-flow-node{outline:none}
        .hcg-flow-node:focus-visible rect:first-of-type{stroke:${INK};stroke-width:2px}
      `}</style>
    </div>
  );
}
