"use client";
// Where the money goes: the selection's sales as a treemap — each material type a block (Onco,
// Non-onco, Consumables), split into HCG's formulary buckets in the Formulary page's colours. The
// area is MRP (units sold on the Quantity basis). A tab of the IP vs OP tile's drawer, beside the
// inpatient and outpatient split of the same sales, with the exact figures under it. A block
// drills: it narrows the page to its material type with the Material filter (the chosen type goes
// back to all), as the flow's middle column does.
import React from "react";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { Treemap, type TreeAction, type TreeGroup } from "@/components/portfolio/ledger/treemap";
import { Legend, type LegendItem } from "@/components/portfolio/ledger/legend";
import { DrawerSection } from "@/components/portfolio/ledger/DetailDrawer";
import { ExactTable, MethodText, PAGES, SEGMENT_LABEL, TYPE_COL, bucketCol, isSegment, sizeExact, sizeShort, type ExecCtx } from "./shared";

export const TREEMAP_TITLE = "Where the money goes";

function groupsOf(c: ExecCtx): TreeGroup[] {
  return c.d.treemap.map((g) => ({
    key: g.key, label: g.label, value: g.value, color: TYPE_COL,
    children: g.children.map((k) => ({ key: k.key, label: k.label, value: k.value, color: bucketCol(k.key) })),
  }));
}

/** What a block does when clicked: narrow the page to its material type (the group), or back to
 *  every type from the one already chosen. A bucket has no filter of its own. */
function blockActionOf(c: ExecCtx, g: TreeGroup): TreeAction | null {
  const key = g.key;
  if (!c.narrow || !isSegment(key)) return null;
  const narrow = c.narrow;
  const chosen = c.d.scope.segment === key;
  return {
    label: chosen ? "show every material type" : `show ${SEGMENT_LABEL[key]} only`,
    run: () => narrow({ segment: chosen ? "ALL" : key }),
  };
}

/** One legend key per bucket the treemap draws, in the order they first appear. */
function legendOf(c: ExecCtx): LegendItem[] {
  const seen = new Map<string, string>();
  for (const g of c.d.treemap) for (const k of g.children) if (!seen.has(k.key) && (k.value ?? 0) > 0) seen.set(k.key, k.label);
  return [...seen].map(([key, label]) => ({ key, label, color: bucketCol(key) }));
}

/** The drawer tab: the treemap with its key, then each block's exact figure with a CSV. */
export function TreemapView({ c }: { c: ExecCtx }) {
  const fmt = (v: number) => sizeShort(v, c.units);
  const rows = c.d.treemap.flatMap((g) => g.children.map((k) => ({ key: `${g.key}/${k.key}`, type: g.label, bucket: k.label, value: k.value, group: g.value })));
  const legend = legendOf(c);
  return (
    <>
      <DrawerSection title={`${TREEMAP_TITLE} · ${c.where}`} note={`${c.units ? "Units sold" : "Sales at MRP"} by material type and formulary bucket.${c.narrow ? " Select a block to narrow the page to its material type." : ""}`}>
        {legend.length > 0 && <div className="mb-2"><Legend items={legend} /></div>}
        <Treemap groups={groupsOf(c)} format={fmt} height={300} ariaLabel={`${TREEMAP_TITLE}, by material type and formulary bucket, ${c.context}`} blockAction={(g) => blockActionOf(c, g)} />
      </DrawerSection>
      <DrawerSection title="By material type and bucket, exact" note={c.units ? "Units sold." : "Exact rupees at MRP."}>
        <ExactTable rows={rows} rowKey={(r) => r.key} caption={`${TREEMAP_TITLE}, ${c.context}`}
          columns={[
            { label: "Material type", value: (r) => r.type, text: true },
            { label: "Bucket", value: (r) => r.bucket, text: true },
            { label: c.units ? "Units sold" : "Revenue (MRP)", value: (r) => sizeExact(r.value, c.units), raw: (r) => r.value, unit: c.units ? "units" : "₹", strong: true },
            { label: "Material type total", value: (r) => sizeExact(r.group, c.units), raw: (r) => r.group, unit: c.units ? "units" : "₹" },
          ]} />
      </DrawerSection>
      <LinkButton onClick={() => c.go(PAGES.revenue.href)}>Open {PAGES.revenue.name}</LinkButton>
    </>
  );
}

export function TreemapMethod({ c }: { c: ExecCtx }) {
  return (
    <MethodText>
      <p>Every block&apos;s area is its share of the selection&apos;s sales {c.units ? "in units sold" : "at MRP"}: each material type a block with its name over it, split into the formulary buckets as each month&apos;s Item Master classes the item (formulary, out of formulary, non-formulary; consumables are their own bucket). The blocks are laid out largest first, kept as square as they can be (a squarified treemap) so their areas compare. A block too small for its name prints its figure alone, or nothing; its tooltip and the table have every figure.</p>
      <p>The colours are the Formulary page&apos;s buckets; the material types are neutral, so the buckets they split into keep the colour.</p>
      <p>Click a block (or Tab to it and press Enter) to narrow the whole page to its material type with the Material filter, and again for every type. The buckets have no filter of their own, so a block always narrows to its type.</p>
    </MethodText>
  );
}
