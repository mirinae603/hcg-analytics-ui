"use client";
// The Spend page's Brand filter: one chip in the filter strip that narrows every tab (the
// Summary, each section's charts and tables) to one brand used, and, once a brand is picked,
// the line saying what switching it would have added: the margin in each section, never added
// across sections (a scheme spend and a cash margin are different measures).
//
//   BrandFilter  — the chip; a click opens a search box over the brands the page's other filters
//                  leave (/spend/brands). On a section's tab it offers only the brands used in that
//                  section, biggest gain there first, so every brand it offers fills that tab; on
//                  the Summary, every brand, by its biggest gain in any section.
//   BrandGain    — the selection line's words while a brand is picked: "If switched: Cash & TPA
//                  +₹ 24.02 L margin · Scheme +₹ 2.73 L".
//   BrandNotHere — what a section's tab shows instead of empty charts when the brand picked (on
//                  another tab) has no use in that section: where it was used, a button to each.
// The list opens in a portal: the strip scrolls sideways and would clip it.
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbChevronDown, TbSearch, TbX } from "react-icons/tb";
import { CARD, INK, SUB, LINE, RULE, LEDGER_2, tint } from "@/components/portfolio/ledger/kit";
import { lakhs, pct } from "@/components/portfolio/ledger/format";
import { LinkButton } from "@/components/portfolio/ledger/panel";
import { errText } from "../formulary/api";
import { CASH_COL, OOF_COL, SCHEME_COL } from "./shared";
import { filterParams, getBrand, getBrands, type BrandOption, type BrandPick, type BrandSide, type Filters, type Section } from "./api";

const POP_W = 420;
const LIMIT = 20;
const DEBOUNCE_MS = 220;

/** The sections a brand's switch is shown for, in the page's order, with their colours. */
const SIDES: { key: Section; label: string; color: string }[] = [
  { key: "cash", label: "Cash & TPA", color: CASH_COL },
  { key: "oof", label: "Out of formulary", color: OOF_COL },
  { key: "scheme", label: "Scheme", color: SCHEME_COL },
];

/** The sections a brand was used in, `first` (the open tab's) leading. */
const sidesOf = (b: BrandOption, first?: Section | null) => {
  const all = SIDES.flatMap((s) => (b[s.key] ? [{ ...s, side: b[s.key] as BrandSide }] : []));
  return first ? [...all.filter((s) => s.key === first), ...all.filter((s) => s.key !== first)] : all;
};
const sideLabel = (k: Section) => SIDES.find((s) => s.key === k)?.label ?? k;

/** A brand's name as the chip and the drawers print it. */
export const brandName = (b: Pick<BrandOption, "material" | "material_desc">) => b.material_desc || b.material;

/** The query the brand list and a brand's row are asked under: the page's hospital and other
 *  filters, never the brand itself, and the payer only where the tab takes one. */
export const brandQuery = (filters: Filters, plant: string, cash: boolean): Record<string, string> =>
  ({ Plant: plant, ...filterParams({ ...filters, brand: null }, { cash }) });

/** The picked brand's row under `params`: undefined while it loads (or if the request failed:
 *  then nothing is claimed about it), null when the brand has no use in them. */
export function useBrandRow(brand: BrandPick | null, params: Record<string, string>): BrandOption | null | undefined {
  const [row, setRow] = useState<{ key: string; row: BrandOption | null } | null>(null);
  const key = brand ? `${JSON.stringify(params)}|${brand.material}` : "";
  useEffect(() => {
    if (!brand) return;
    let dead = false;
    getBrand(JSON.parse(key.slice(0, key.lastIndexOf("|"))) as Record<string, string>, brand.material)
      .then((r) => { if (!dead) setRow({ key, row: r }); })
      .catch(() => undefined);
    return () => { dead = true; };
  }, [key, brand]);
  return !brand || row?.key !== key ? undefined : row.row;
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandFilter
// ─────────────────────────────────────────────────────────────────────────────
export function BrandFilter({ value, params, section, onChange }: {
  value: BrandPick | null;
  /** The page's other filters as query params (hospital, month, patient and material type,
   *  payer), so the list offers only brands with use in the selection. */
  params: Record<string, string>;
  /** The open section's tab, whose brands alone are offered; null on the Summary. */
  section: Section | null;
  onChange: (b: BrandPick | null) => void;
}) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ rows: BrandOption[]; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const open = at != null;
  const key = JSON.stringify(params);

  const show = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    setAt({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - POP_W - 8)) });
  };
  const close = (focus = false) => { setAt(null); setQ(""); if (focus) btn.current?.focus(); };
  const pick = (b: BrandOption | null) => {
    onChange(b ? { material: b.material, name: brandName(b) } : null);
    close(true);
  };

  // The list for the query, debounced while typing; the last answer stays until the next.
  useEffect(() => {
    if (!open) return;
    let dead = false;
    const t = setTimeout(() => {
      getBrands(JSON.parse(key) as Record<string, string>, { q: q.trim() || undefined, limit: LIMIT, section })
        .then((d) => { if (!dead) { setList({ rows: d.brands, total: d.total }); setErr(null); setHi(0); } })
        .catch((e) => { if (!dead) setErr(errText(e)); });
    }, q ? DEBOUNCE_MS : 0);
    return () => { dead = true; clearTimeout(t); };
  }, [open, q, key, section]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    const onMove = () => close();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onMove);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("resize", onMove); };
  }, [open]);

  // "All brands" is row 0; the brands follow it.
  const rows = list?.rows ?? [];
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(rows.length, h + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    if (e.key === "Enter") { e.preventDefault(); pick(hi === 0 ? null : rows[hi - 1] ?? null); }
  };
  useEffect(() => { pop.current?.querySelector(`[data-row="${hi}"]`)?.scrollIntoView({ block: "nearest" }); }, [hi]);

  return (
    <>
      <span className="hcg-chip relative inline-flex items-center h-7 flex-shrink-0 rounded-full text-[12px]"
        style={{ background: value ? tint(INK, 0.06) : CARD, border: `1px solid ${value ? INK : RULE}` }}>
        <button ref={btn} type="button" onClick={() => (open ? close() : show())} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
          title={value ? `Brand: ${value.name} (${value.material})` : "Narrow every chart and table to one brand"}
          className={`inline-flex items-center h-full pl-3 ${value ? "pr-1.5" : "pr-7"} max-w-[260px] focus:outline-none`}>
          <span style={{ color: SUB }}>Brand</span>
          <span className="pl-1.5 font-semibold truncate" style={{ color: INK }}>{value ? value.name : "All brands"}</span>
        </button>
        {value ? (
          <button type="button" onClick={() => onChange(null)} aria-label={`Clear the brand filter (${value.name})`} title="All brands"
            className="inline-flex items-center justify-center w-6 h-6 mr-0.5 rounded-full hover:bg-black/5" style={{ color: SUB }}>
            <TbX size={13} aria-hidden="true" />
          </button>
        ) : (
          <span aria-hidden="true" className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: SUB }}>
            <TbChevronDown size={13} />
          </span>
        )}
      </span>

      {at && typeof document !== "undefined" && createPortal(
        <div ref={pop} className="fixed rounded-[12px] overflow-hidden flex flex-col"
          style={{ top: at.top, left: at.left, width: POP_W, maxHeight: "min(460px, 70vh)", zIndex: 55, background: CARD, border: `1px solid ${RULE}`, boxShadow: "0 18px 44px -24px rgba(30,38,34,.4)" }}>
          <label className="flex items-center gap-2 px-3 h-10 flex-shrink-0" style={{ borderBottom: `1px solid ${LINE}` }}>
            <TbSearch size={15} aria-hidden="true" style={{ color: SUB }} />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
              role="combobox" aria-expanded aria-controls={id} aria-activedescendant={`${id}-${hi}`} aria-label="Search brands by name or code"
              placeholder="Search a brand by name or code" className="flex-1 min-w-0 bg-transparent text-[13px] focus:outline-none" style={{ color: INK }} />
          </label>
          <div id={id} role="listbox" aria-label="Brands" className="flex-1 min-h-0 overflow-y-auto py-1">
            <Option id={`${id}-0`} row={0} active={hi === 0} selected={!value} onPick={() => pick(null)} onHover={() => setHi(0)}>
              <span className="font-semibold" style={{ color: INK }}>All brands</span>
              <span className="text-[11px]" style={{ color: SUB }}>
                {section ? `listed below: brands used for ${sideLabel(section)}, biggest gain there first` : "listed below: every brand, by its biggest gain in any section"}
              </span>
            </Option>
            {rows.map((b, i) => (
              <Option key={b.material} id={`${id}-${i + 1}`} row={i + 1} active={hi === i + 1} selected={value?.material === b.material}
                onPick={() => pick(b)} onHover={() => setHi(i + 1)}>
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="font-semibold truncate" style={{ color: INK }}>{brandName(b)}</span>
                  <span className="text-[10.5px] tabular-nums flex-shrink-0" style={{ color: SUB }}>{b.material}</span>
                </span>
                <SideLine b={b} first={section} />
              </Option>
            ))}
            {list && !rows.length && (
              <p className="px-3 py-3 text-[12px]" style={{ color: SUB }}>
                {q ? `No brand matches “${q}”` : "No brand"}{section ? ` has ${sideLabel(section)} use` : ""} in this selection.
              </p>
            )}
            {!list && !err && <p className="px-3 py-3 text-[12px]" style={{ color: SUB }}>Loading brands…</p>}
            {err && <p className="px-3 py-3 text-[12px]" style={{ color: SUB }}>Couldn&apos;t load the brands: {err}</p>}
          </div>
          {list && list.total > rows.length && (
            <div className="px-3 py-1.5 text-[11px] flex-shrink-0" style={{ color: SUB, borderTop: `1px solid ${LINE}`, background: LEDGER_2 }}>
              The {rows.length} biggest of {list.total.toLocaleString("en-IN")} — type to find any other
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

function Option({ id, row, active, selected, onPick, onHover, children }: {
  id: string; row: number; active: boolean; selected: boolean; onPick: () => void; onHover: () => void; children: React.ReactNode;
}) {
  return (
    <div id={id} data-row={row} role="option" aria-selected={selected} onClick={onPick} onMouseEnter={onHover}
      className="flex flex-col gap-0.5 px-3 py-1.5 text-[12.5px] cursor-pointer"
      style={{ background: active ? tint(INK, 0.05) : selected ? tint(INK, 0.03) : "transparent", borderLeft: `2px solid ${selected ? INK : "transparent"}` }}>
      {children}
    </div>
  );
}

/** "Cash & TPA ₹ 24.02 L → CALPOL 650 · Scheme ₹ 2.73 L → …": each section's gain, in its colour,
 *  the open tab's first. */
function SideLine({ b, first }: { b: BrandOption; first?: Section | null }) {
  return (
    <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] tabular-nums">
      {sidesOf(b, first).map(({ key, label, color, side }) => (
        <span key={key} className="inline-flex items-center gap-1 min-w-0" title={side.suggested_desc ? `${label}: switch to ${side.suggested_desc}` : label}>
          <span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span style={{ color: SUB }}>{label}</span>
          <b style={{ color: INK }}>+{lakhs(side.missed)}</b>
          {side.suggested_desc && <span className="truncate max-w-[150px]" style={{ color: SUB }}>→ {side.suggested_desc}</span>}
        </span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandGain
// ─────────────────────────────────────────────────────────────────────────────
/** What switching the picked brand would have added, for the filter strip's selection line.
 *  Asks the API for that one brand under the page's other filters. */
export function BrandGain({ brand, params, section }: { brand: BrandPick; params: Record<string, string>; section: Section | null }) {
  const row = useBrandRow(brand, params);
  const sides = useMemo(() => (row ? sidesOf(row, section) : []), [row, section]);

  if (row === undefined) return <span>{brand.name} · working out its switch…</span>;
  if (!sides.length) return <span>{brand.name}: no use with a suggested brand in this selection</span>;
  const said = sides.map((s) => `${s.label} +${lakhs(s.side.missed)} margin${s.side.suggested_desc ? ` (to ${s.side.suggested_desc})` : ""}${s.side.pct != null ? `, ${pct(s.side.pct, 1)} missed` : ""}`).join("; ");
  return (
    <span className="inline-flex items-center gap-2" title={`If ${brand.name} had been switched: ${said}`}>
      <span style={{ color: INK, fontWeight: 600 }}>If switched:</span>
      {sides.map(({ key: k, label, color, side }) => (
        <span key={k} className="inline-flex items-center gap-1 tabular-nums">
          <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
          {label} <b style={{ color: INK }}>+{lakhs(side.missed)}</b>
        </span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandNotHere
// ─────────────────────────────────────────────────────────────────────────────
/** In place of a section's charts when the brand picked has no use in that section: says so,
 *  and offers the sections it was used in (with what switching it there would add) and all
 *  brands, rather than a screen of empty panels. */
export function BrandNotHere({ brand, row, section, onSection, onClear }: {
  brand: BrandPick;
  /** The brand's row under the page's filters; null when it has no use in any section. */
  row: BrandOption | null;
  section: Section;
  onSection: (s: Section) => void;
  onClear: () => void;
}) {
  const elsewhere = row ? sidesOf(row).filter((s) => s.key !== section) : [];
  return (
    <div className="rounded-[14px] px-6 py-8 text-center" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <div className="text-[15px] font-semibold" style={{ color: INK }}>
        {brand.name} has no {sideLabel(section)} use in this selection
      </div>
      <p className="text-[12.5px] mt-1.5 max-w-xl mx-auto leading-relaxed" style={{ color: SUB }}>
        {elsewhere.length
          ? "It was used in the sections below, under the same hospital, month and filters. Open one to see its charts, or go back to every brand."
          : "It has no use with a suggested brand anywhere under these filters. Change the month or hospital, or go back to every brand."}
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {elsewhere.map(({ key, label, color, side }) => (
          <span key={key} className="inline-flex items-center gap-2">
            <LinkButton onClick={() => onSection(key)}>
              <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
              {label}: +{lakhs(side.missed)} if switched
            </LinkButton>
          </span>
        ))}
        <LinkButton onClick={onClear}>All brands</LinkButton>
      </div>
    </div>
  );
}

