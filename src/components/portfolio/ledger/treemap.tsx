"use client";
// Treemap — where a whole goes, as nested rectangles whose areas are their amounts: each group
// (a material type) a block, split into its parts (HCG's formulary buckets). Squarified (Bruls,
// Huizing and van Wijk), so the blocks stay close to square and their areas can be compared.
//
// A block prints its name and figure when they fit, its figure alone when only that fits, and
// nothing when neither does: every block's name and figure are in its tooltip and in the chart's
// accessible name, and the drawer beside it has the exact figures. Groups are drawn in order of
// size, a white gap between them and a thin one between their parts; a group of one part (its
// own name) is drawn once. Colours are the caller's (one per part, the same part the same colour
// in every group), else the kit's SERIES in order. Zero and missing amounts are left out (a
// treemap cannot draw them) and named in the accessible name.
//
// A block the caller gives an action (`blockAction`: narrow the page to that material type) is a
// button — pointer and keyboard (Tab, Enter or Space) alike, named with its figure and what it
// does — and the chart is then a group of them rather than one picture; focus lights the block
// as hover does.
//
// Panel-aware: in a ChartPanel it fills the body; in a drawer it takes its own height.
import React, { useState } from "react";
import { INK, SUB, CARD, inkOn, seriesCol, tint, useArmed } from "./kit";
import { useWidth } from "./minis";
import { usePanel, usePanelReadout } from "./panel";
import { isNum } from "./format";
import { textW } from "./scale";

export type TreeLeaf = {
  key: string;
  label: string;
  value: number | null;
  /** The block's colour; the group's (then SERIES) when unset. */
  color?: string;
};
export type TreeGroup = TreeLeaf & { children?: TreeLeaf[] };
/** What clicking a block does: the words its button adds to its name, and the action. */
export type TreeAction = { label: string; run: () => void };

type Rect = { x: number; y: number; w: number; h: number };
type Laid<T> = { item: T; r: Rect };

const GAP = 3, INNER_GAP = 1.5;
const HEAD_H = 16, HEAD_FS = 10.5;
const LABEL_FS = 11, VALUE_FS = 10.5;

/** The squarified layout of `items` (amounts > 0, largest first) in `rect`. */
export function squarify<T>(items: { v: number; item: T }[], rect: Rect): Laid<T>[] {
  const total = items.reduce((t, x) => t + x.v, 0);
  if (!(total > 0) || rect.w <= 0 || rect.h <= 0) return [];
  const scale = (rect.w * rect.h) / total;
  const queue = items.map((x) => ({ a: x.v * scale, item: x.item }));
  const out: Laid<T>[] = [];
  let r = { ...rect };
  // The worst aspect ratio a row would have laid along a side of length `len`.
  const worst = (row: { a: number }[], len: number) => {
    const s = row.reduce((t, x) => t + x.a, 0);
    const mx = Math.max(...row.map((x) => x.a)), mn = Math.min(...row.map((x) => x.a));
    return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn));
  };
  const place = (row: { a: number; item: T }[]) => {
    const s = row.reduce((t, x) => t + x.a, 0);
    if (r.w >= r.h) {
      // A column along the left side, as tall as the rest.
      const w = r.h > 0 ? s / r.h : 0;
      let y = r.y;
      for (const x of row) { const h = w > 0 ? x.a / w : 0; out.push({ item: x.item, r: { x: r.x, y, w, h } }); y += h; }
      r = { x: r.x + w, y: r.y, w: Math.max(0, r.w - w), h: r.h };
    } else {
      // A row along the top, as wide as the rest.
      const h = r.w > 0 ? s / r.w : 0;
      let x0 = r.x;
      for (const x of row) { const w = h > 0 ? x.a / h : 0; out.push({ item: x.item, r: { x: x0, y: r.y, w, h } }); x0 += w; }
      r = { x: r.x, y: r.y + h, w: r.w, h: Math.max(0, r.h - h) };
    }
  };
  let row: { a: number; item: T }[] = [];
  for (const x of queue) {
    const len = Math.min(r.w, r.h);
    if (!row.length || worst([...row, x], len) <= worst(row, len)) row.push(x);
    else { place(row); row = [x]; }
  }
  if (row.length) place(row);
  return out;
}

const inset = (r: Rect, d: number): Rect => ({ x: r.x + d, y: r.y + d, w: Math.max(0, r.w - 2 * d), h: Math.max(0, r.h - 2 * d) });
const positive = <T extends { value: number | null }>(xs: T[]) =>
  xs.filter((x) => isNum(x.value) && (x.value as number) > 0).sort((a, b) => (b.value as number) - (a.value as number));

export function Treemap({ groups, format, ariaLabel, height = 280, blockAction }: {
  groups: TreeGroup[];
  /** Prints a block's figure on its face and in its tooltip. */
  format: (v: number) => string;
  ariaLabel: string;
  /** Outside a panel. */
  height?: number;
  /** A block's action, from its group and part, or null to leave it a plain mark. */
  blockAction?: (group: TreeGroup, leaf: TreeLeaf) => TreeAction | null;
}) {
  const panel = usePanel();
  const on = useArmed();
  const [ref, measured] = useWidth<HTMLDivElement>(360);
  const [hi, setHi] = useState<string | null>(null);
  const W = panel ? panel.size.w : measured;
  const H = panel ? panel.size.h : height;

  const shown = positive(groups);
  const laidGroups = squarify(shown.map((g) => ({ v: g.value as number, item: g })), { x: 0, y: 0, w: W, h: H });
  type Block = { key: string; group: TreeGroup; leaf: TreeLeaf; r: Rect; color: string };
  const blocks: Block[] = [];
  const heads: { g: TreeGroup; r: Rect }[] = [];
  laidGroups.forEach(({ item: g, r }, gi) => {
    const outer = inset(r, GAP / 2);
    const kids = positive(g.children ?? []);
    const colorOf = (k: TreeLeaf) => k.color ?? g.color ?? seriesCol(gi);
    // A group of one part named as the group itself is one block, named once.
    if (kids.length <= 1 && (!kids.length || kids[0].label === g.label)) {
      const k = kids[0] ?? g;
      blocks.push({ key: `${g.key}/${k.key}`, group: g, leaf: k, r: outer, color: colorOf(k) });
      return;
    }
    // The group's name and figure head its block when it has the room; its parts fill the rest.
    const head = outer.h >= HEAD_H + 28 && outer.w >= 56;
    if (head) heads.push({ g, r: outer });
    const body: Rect = head ? { x: outer.x, y: outer.y + HEAD_H, w: outer.w, h: outer.h - HEAD_H } : outer;
    for (const { item: k, r: kr } of squarify(kids.map((k) => ({ v: k.value as number, item: k })), body)) {
      blocks.push({ key: `${g.key}/${k.key}`, group: g, leaf: k, r: inset(kr, INNER_GAP / 2), color: colorOf(k) });
    }
  });

  const name = (b: Block) => (b.leaf === b.group || b.leaf.label === b.group.label
    ? `${b.group.label} ${format(b.leaf.value as number)}` : `${b.group.label} · ${b.leaf.label} ${format(b.leaf.value as number)}`);
  const left = groups.flatMap((g) => [
    ...(isNum(g.value) && (g.value as number) > 0 ? [] : [`${g.label}: none`]),
    ...(g.children ?? []).filter((k) => !(isNum(k.value) && (k.value as number) > 0)).map((k) => `${g.label} · ${k.label}: none`),
  ]);
  const said = [
    ...shown.map((g) => `${g.label} ${format(g.value as number)}${(g.children ?? []).length > 1 ? ` (${positive(g.children ?? []).map((k) => `${k.label} ${format(k.value as number)}`).join(", ")})` : ""}`),
    ...left,
  ].join("; ");
  const active = blocks.find((b) => b.key === hi) ?? null;
  // Each block's action, worked out once; with any, the svg is a group of buttons.
  const actions = new Map<string, TreeAction>();
  if (blockAction) for (const b of blocks) { const a = blockAction(b.group, b.leaf); if (a) actions.set(b.key, a); }
  const acting = actions.size > 0;
  usePanelReadout(active ? active.key : null, () => (active ? <span>{name(active)}</span> : null));

  if (!blocks.length) return <div ref={ref}><p className="text-[12px]" style={{ color: SUB }}>Nothing in this selection.</p></div>;

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role={acting ? "group" : "img"} aria-label={`${ariaLabel}: ${said}`} style={{ display: "block" }}
        onMouseLeave={() => setHi(null)}>
        {heads.map(({ g, r }) => {
          const label = `${g.label} · ${format(g.value as number)}`;
          const text = textW(label, HEAD_FS) + 8 <= r.w ? label : textW(g.label, HEAD_FS) + 8 <= r.w ? g.label : "";
          return (
            <g key={`h-${g.key}`} aria-hidden="true">
              <rect x={r.x} y={r.y} width={r.w} height={HEAD_H} rx={3} fill={tint(INK, 0.06)} />
              {text && <text x={r.x + 5} y={r.y + HEAD_H - 4.5} style={{ fontSize: HEAD_FS, fontWeight: 700, fill: INK }}>{text}</text>}
            </g>
          );
        })}
        {blocks.map((b, i) => {
          const { r } = b;
          const lit = hi === b.key;
          const v = b.leaf.value as number;
          const val = format(v);
          const label = b.leaf.label;
          const fitsName = r.w >= Math.max(textW(label, LABEL_FS), textW(val, VALUE_FS)) + 10 && r.h >= 32;
          const fitsValue = r.w >= textW(val, VALUE_FS) + 8 && r.h >= 18;
          const ink = inkOn(b.color);
          const act = actions.get(b.key);
          const button = act ? {
            role: "button", tabIndex: 0, "aria-label": `${name(b)}: ${act.label}`, className: "hcg-tree-block",
            onClick: act.run,
            onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act.run(); } },
            onFocus: () => setHi(b.key), onBlur: () => setHi(null),
          } : { "aria-hidden": acting || undefined };
          return (
            <g key={b.key} {...button} onMouseEnter={() => setHi(b.key)}
              style={{ opacity: on ? (hi && !lit ? 0.55 : 1) : 0, transition: `opacity 300ms ease ${on && !hi ? 60 + i * 45 : 0}ms`, cursor: act ? "pointer" : undefined }}>
              <title>{`${name(b)}${act ? ` · ${act.label}` : ""}`}</title>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={3} fill={b.color} stroke={lit ? INK : CARD} strokeWidth={lit ? 1.5 : 0} />
              {fitsName ? (
                <g aria-hidden="true" style={{ fill: ink }}>
                  <text x={r.x + 6} y={r.y + 14} style={{ fontSize: LABEL_FS, fontWeight: 600 }}>{label}</text>
                  <text x={r.x + 6} y={r.y + 27} style={{ fontSize: VALUE_FS, fontWeight: 700 }}>{val}</text>
                </g>
              ) : fitsValue ? (
                <text aria-hidden="true" x={r.x + 4} y={r.y + 13} style={{ fontSize: VALUE_FS, fontWeight: 700, fill: ink }}>{val}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {/* A focused block is outlined as a hovered one is (an svg group has no focus ring of its own). */}
      <style jsx global>{`
        .hcg-tree-block{outline:none}
        .hcg-tree-block:focus-visible rect{stroke:${INK};stroke-width:1.5px}
      `}</style>
    </div>
  );
}
