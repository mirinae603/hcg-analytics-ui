"use client";
// The flow of sales (D11): unit → material type → HCG's formulary bucket, each band as wide as
// the sales it carries (MRP, or units sold on the Quantity basis). The five biggest units by name,
// the rest as "Other units". Units are in the coral as everywhere; the material types are a neutral
// pass-through; the bands into a bucket take the bucket's colour, so the right half reads as the
// formulary mix of the whole. A tab of the Hospitals tile's drawer, with the exact figures for
// every band under it.
//
// The flow drills: a unit selects that hospital in the header (the selected one goes back to all
// hospitals), and a material type narrows the page to it with the Material filter (the chosen
// one goes back to all). "Other units" and the buckets have no filter of their own to set.
import React from "react";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { Flow, type FlowAction, type FlowLink, type FlowNode } from "@/components/portfolio/ledger/flow";
import { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import { ExactTable, HOSPITAL_COL, MethodText, PAGES, SEGMENT_LABEL, TYPE_COL, bucketCol, isSegment, sizeExact, sizeShort, unitName, type ExecCtx } from "./shared";

export const FLOW_TITLE = "Flow of sales";
const COLUMNS = ["Unit", "Material type", "Formulary bucket"];

/** "bucket:formulary" → "formulary". */
const idKey = (id: string) => id.slice(id.indexOf(":") + 1);

/** A node's name: a unit by HCG's own name, as the units table prints it. */
function nodeLabel(c: ExecCtx, n: { id: string; label: string; column: number }): string {
  const u = n.column === 0 ? c.d.units.find((x) => x.plant === idKey(n.id)) : undefined;
  return u ? unitName(u) : n.label;
}

function flowOf(c: ExecCtx): { nodes: FlowNode[]; links: FlowLink[] } {
  const colour = (n: { id: string; column: number }) => (n.column === 0 ? HOSPITAL_COL : n.column === 1 ? TYPE_COL : bucketCol(idKey(n.id)));
  const nodes = c.d.flow.nodes.map((n) => ({ ...n, label: nodeLabel(c, n), color: colour(n) }));
  const col = new Map(nodes.map((n) => [n.id, n]));
  // A band takes its unit's colour into a material type, and its bucket's colour out of one.
  const links = c.d.flow.links.map((l) => {
    const t = col.get(l.target);
    return { ...l, color: t && t.column === 2 ? t.color : HOSPITAL_COL };
  });
  return { nodes, links };
}

/** What a node does when clicked: a unit selects its hospital, a material type narrows the
 *  page's Material filter to it; a click on the one already chosen goes back to all. */
export function nodeActionOf(c: ExecCtx, n: FlowNode): FlowAction | null {
  const key = idKey(n.id);
  if (n.column === 0) {
    const u = c.d.units.find((x) => x.plant === key);
    if (!u) return null;
    return { label: u.selected ? "show all hospitals" : "select this hospital", run: () => c.select(u) };
  }
  if (n.column === 1 && c.narrow && isSegment(key)) {
    const narrow = c.narrow;
    const chosen = c.d.scope.segment === key;
    return {
      label: chosen ? "show every material type" : `show ${SEGMENT_LABEL[key]} only`,
      run: () => narrow({ segment: chosen ? "ALL" : key }),
    };
  }
  return null;
}

/** The drawer tab: the flow, then every band's exact figure with a CSV. */
export function FlowView({ c }: { c: ExecCtx }) {
  const { nodes, links } = flowOf(c);
  const fmt = (v: number) => sizeShort(v, c.units);
  const name = new Map(nodes.map((n) => [n.id, n.label]));
  const rows = c.d.flow.links.map((l) => ({ key: `${l.source}>${l.target}`, from: name.get(l.source) ?? l.source, to: name.get(l.target) ?? l.target, value: l.value }));
  return (
    <>
      <DrawerSection title={`${FLOW_TITLE} · ${c.where}`} note={`${c.units ? "Units sold" : "Sales at MRP"}: unit → material type → formulary bucket. Select a unit to show that hospital, or a material type to narrow the page to it.`}>
        <Flow nodes={nodes} links={links} format={fmt} columns={COLUMNS} height={380} ariaLabel={`${FLOW_TITLE}, ${c.context}`} nodeAction={(n) => nodeActionOf(c, n)} />
      </DrawerSection>
      <DrawerSection title="Every band, exact" note={c.units ? "Units sold." : "Exact rupees at MRP."}>
        <ExactTable rows={rows} rowKey={(r) => r.key} caption={`${FLOW_TITLE}, ${c.context}`}
          columns={[
            { label: "From", value: (r) => r.from, text: true },
            { label: "To", value: (r) => r.to, text: true },
            { label: c.units ? "Units sold" : "Revenue (MRP)", value: (r) => sizeExact(r.value, c.units), raw: (r) => r.value, unit: c.units ? "units" : "₹", strong: true },
          ]} empty="No sales in this selection." />
      </DrawerSection>
      <LinkButton onClick={() => c.go(PAGES.revenue.href)}>Open {PAGES.revenue.name}</LinkButton>
    </>
  );
}

export function FlowMethod({ c }: { c: ExecCtx }) {
  return (
    <MethodText>
      <p>The selection&apos;s pharmacy sales {c.units ? "in units sold" : "at MRP"} followed from left to right: from each unit (the five biggest by name, the rest together as Other units; one unit when a hospital is selected) into its material types, and from each material type into HCG&apos;s formulary buckets as each month&apos;s Item Master classes the item. A band is as wide as what it carries, on one scale for the whole chart, and every node is named with its figure.</p>
      <p>Hover a unit, a material type or a bucket to light the bands that touch it, or a band to light it and its two ends. The middle column is where a unit&apos;s sales meet everyone else&apos;s, so the right half is the mix of the whole selection, not of one unit.</p>
      <p>Click a unit (or Tab to it and press Enter) to select that hospital in the header, and again to go back to all hospitals; click a material type to narrow the whole page to it with the Material filter, and again for every type. &quot;Other units&quot; and the buckets have no filter of their own, so they only light up.</p>
    </MethodText>
  );
}
