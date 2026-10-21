"use client";
// The filter buttons above a table: one per facet its endpoint offers ("Month ▾", "Hospital ▾",
// "Category ▾", "Class ▾", "Manufacturer ▾" …). Each opens a small list of the facet's values
// with the rows each would match given the other filters, so a reader sees how many rows a tick
// keeps before ticking it. Ticks in one facet are OR, facets are AND; the choice applies when
// the list closes, so ticking three months asks the server once. Below the buttons, the
// selection as removable chips. Everything here is the table's own filtering inside the page's
// scope (hospital, month, payer … stay in the page's filter strip).
import React, { useEffect, useState } from "react";
import { Box, Button, Checkbox, Chip, InputAdornment, Popover, TextField } from "@mui/material";
import { ArrowDropDown, FilterList, Search } from "@mui/icons-material";
import { num } from "@/lib/kpiFormat";
import { isAbort, isActive, setField, type Facet, type FacetValue, type Range, type Selection } from "./query";

/** A list longer than this gets a filter box. */
const FILTER_BOX_FROM = 8;
/** Typing pause before a facet with unlisted values asks the server. */
const TYPEAHEAD_MS = 300;

type SearchValues = (field: string, text: string, signal: AbortSignal) => Promise<Facet | null>;

/** A facet worth a button: at least two values to choose between, or a real range. */
function offers(f: Facet): boolean {
  if (f.kind === "range") return f.range?.min != null && f.range?.max != null && f.range.min !== f.range.max;
  return (f.values?.length ?? 0) + (f.more ?? 0) >= 2;
}

const isDateRange = (f: Facet) => typeof f.range?.min === "string" && /^\d{4}-\d{2}-\d{2}/.test(f.range.min);

const valueLabel = (f: Facet | undefined, v: string) => f?.values?.find((o) => o.value === v)?.label ?? v;

/** A facet's selection in words, for its chip. */
function describe(f: Facet | undefined, v: string[] | Range): string {
  if (Array.isArray(v)) {
    const labels = v.map((x) => valueLabel(f, x));
    return labels.length <= 2 ? labels.join(", ") : `${labels[0]} +${labels.length - 1}`;
  }
  return v.from && v.to ? `${v.from} – ${v.to}` : v.from ? `from ${v.from}` : `to ${v.to}`;
}

/** Same filter, whatever the tick order. */
function same(a: string[] | Range | undefined, b: string[] | Range | undefined): boolean {
  if (!a || !b || !isActive(a) || !isActive(b)) return isActive(a) === isActive(b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x) => b.includes(x));
  if (Array.isArray(a) || Array.isArray(b)) return false;
  return (a.from ?? "") === (b.from ?? "") && (a.to ?? "") === (b.to ?? "");
}

export default function FacetBar({ facets, selected, onChange, searchValues }: {
  facets: Facet[];
  selected: Selection;
  onChange: (next: Selection) => void;
  /** The facet's values narrowed to `text` by the server (facets=only&fq.<field>=text), for a
   *  facet with more values than its list holds. */
  searchValues: SearchValues;
}) {
  const [open, setOpen] = useState<{ field: string; anchor: HTMLElement } | null>(null);
  const shown = facets.filter((f) => isActive(selected[f.field]) || offers(f));
  const chips = facets.filter((f) => isActive(selected[f.field]));
  const openFacet = open ? facets.find((f) => f.field === open.field) : undefined;
  if (!shown.length) return null;

  const close = (field: string, v: string[] | Range) => {
    setOpen(null);
    if (!same(v, selected[field])) onChange(setField(selected, field, v));
  };

  return (
    <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 0.75, p: "2px" }}>
      <Box role="group" aria-label="Filter this table" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
        <FilterList fontSize="small" aria-hidden="true" sx={{ color: "text.secondary" }} />
        {shown.map((f) => {
          const v = selected[f.field];
          const n = !isActive(v) ? 0 : Array.isArray(v) ? v.length : 1;
          return (
            <Button key={f.field} size="small" variant="outlined" endIcon={<ArrowDropDown />}
              aria-haspopup="dialog" aria-expanded={open?.field === f.field}
              aria-label={`${f.label} filter${n ? `, ${n} selected` : ""}`}
              onClick={(e) => setOpen({ field: f.field, anchor: e.currentTarget })}
              sx={{ textTransform: "none", fontWeight: n ? 700 : 500, whiteSpace: "nowrap" }}>
              {f.label}{n ? ` · ${n}` : ""}
            </Button>
          );
        })}
      </Box>
      {chips.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
          {chips.map((f) => {
            const v = selected[f.field];
            return (
              <Chip key={f.field} size="small" label={`${f.label}: ${describe(f, v)}`}
                title={Array.isArray(v) ? v.map((x) => valueLabel(f, x)).join(", ") : undefined}
                onDelete={() => onChange(setField(selected, f.field, []))} />
            );
          })}
          <Button size="small" onClick={() => onChange({})} sx={{ textTransform: "none", minWidth: 0 }}>Clear all</Button>
        </Box>
      )}
      {open && openFacet && (openFacet.kind === "range"
        ? <RangeMenu key={open.field} facet={openFacet} anchor={open.anchor} value={selected[open.field]} onClose={(v) => close(open.field, v)} />
        : <MultiMenu key={open.field} facet={openFacet} anchor={open.anchor} value={selected[open.field]} searchValues={searchValues} onClose={(v) => close(open.field, v)} />)}
    </Box>
  );
}

/** The popover around one facet's list: title, how many are ticked, Clear, and Done. Closing
 *  it any way (Done, Escape, a click outside) applies the choice. */
function Pop({ anchor, title, note, onClear, onDone, children }: {
  anchor: HTMLElement; title: string; note?: string; onClear: () => void; onDone: () => void; children: React.ReactNode;
}) {
  return (
    <Popover open anchorEl={anchor} onClose={onDone}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{ paper: { role: "dialog", "aria-label": `${title} filter`, sx: { width: 320, maxWidth: "calc(100vw - 32px)", mt: 0.5, p: 1.5, borderRadius: "12px" } } }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
        <Box component="span" sx={{ fontSize: 13, fontWeight: 700 }}>{title}</Box>
        {note && <Box component="span" sx={{ fontSize: 12, color: "text.secondary" }}>{note}</Box>}
        <Button size="small" onClick={onClear} sx={{ ml: "auto", textTransform: "none", minWidth: 0 }}>Clear</Button>
      </Box>
      {children}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Button size="small" variant="contained" disableElevation onClick={onDone} sx={{ textTransform: "none" }}>Done</Button>
      </Box>
    </Popover>
  );
}

function MultiMenu({ facet, anchor, value, searchValues, onClose }: {
  facet: Facet; anchor: HTMLElement; value: string[] | Range | undefined; searchValues: SearchValues; onClose: (v: string[]) => void;
}) {
  const applied = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState<string[]>(applied);
  const [text, setText] = useState("");
  // A facet that lists only part of its values asks the server as the reader types; one that
  // lists them all filters its own list at once.
  const remote = (facet.more ?? 0) > 0;
  const q = text.trim();
  const [found, setFound] = useState<{ q: string; facet: Facet | null; failed: boolean } | null>(null);
  useEffect(() => {
    if (!remote || !q) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchValues(facet.field, q, ctrl.signal)
        .then((f) => setFound({ q, facet: f, failed: false }))
        .catch((e) => { if (!isAbort(e)) setFound({ q, facet: null, failed: true }); });
    }, TYPEAHEAD_MS);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [remote, q, facet.field, searchValues]);

  const hit = remote && q && found?.q === q && found.facet ? found.facet : null;
  const needle = q.toLowerCase();
  const list: FacetValue[] = hit ? hit.values ?? []
    : (facet.values ?? []).filter((o) => !needle || o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle));
  const unlisted = hit ? hit.more ?? 0 : q ? 0 : facet.more ?? 0;
  const status = !remote || !q ? null
    : found?.q !== q ? "Searching…"
    : found.failed ? "Search failed; showing the listed values only."
    : null;
  const toggle = (v: string) => setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));

  return (
    <Pop anchor={anchor} title={facet.label} note={draft.length ? `${num(draft.length)} selected` : undefined}
      onClear={() => setDraft([])} onDone={() => onClose(draft)}>
      {(remote || (facet.values?.length ?? 0) > FILTER_BOX_FROM) && (
        <TextField value={text} onChange={(e) => setText(e.target.value)} placeholder={`Find a ${facet.label.toLowerCase()}`}
          size="small" fullWidth autoFocus sx={{ mb: 1 }}
          slotProps={{
            htmlInput: { autoComplete: "off", "aria-label": `Find a ${facet.label.toLowerCase()}` },
            input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> },
          }} />
      )}
      {status && <Box role="status" sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}>{status}</Box>}
      <Box component="ul" aria-label={`${facet.label} values`} sx={{ listStyle: "none", m: 0, p: 0, maxHeight: 300, overflowY: "auto" }}>
        {list.map((o) => {
          const on = draft.includes(o.value);
          // A value no row has under the other filters cannot be ticked, unless it already is.
          const off = o.count === 0 && !on && !applied.includes(o.value);
          return (
            <Box component="li" key={o.value}
              sx={{ display: "flex", alignItems: "center", gap: 0.5, pr: 0.5, borderRadius: 1, "&:hover": { bgcolor: "action.hover" },
                // "Only" shows on the row under the pointer or focus; always on touch screens.
                "& .only": { opacity: 0 }, "&:hover .only, &:focus-within .only": { opacity: 1 },
                "@media (hover: none)": { "& .only": { opacity: 1 } } }}>
              <Box component="label" title={o.label}
                sx={{ display: "flex", alignItems: "center", gap: 0.5, flex: 1, minWidth: 0, fontSize: 13, cursor: off ? "default" : "pointer", color: off ? "text.disabled" : "text.primary" }}>
                <Checkbox size="small" checked={on} disabled={off} onChange={() => toggle(o.value)} sx={{ p: 0.5 }} />
                <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</Box>
                <Box component="span" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary", fontSize: 12 }}>{num(o.count)}</Box>
              </Box>
              <Button className="only" size="small" disabled={off} onClick={() => setDraft([o.value])} aria-label={`Only ${o.label}`}
                sx={{ textTransform: "none", minWidth: 0, px: 0.75 }}>Only</Button>
            </Box>
          );
        })}
        {!list.length && <Box component="li" sx={{ fontSize: 12, color: "text.secondary", py: 1 }}>No {facet.label.toLowerCase()} matches.</Box>}
      </Box>
      {unlisted > 0 && (
        <Box sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
          +{num(unlisted)} more{q ? " match; type more of the name" : "; type to find them"}
        </Box>
      )}
    </Pop>
  );
}

function RangeMenu({ facet, anchor, value, onClose }: {
  facet: Facet; anchor: HTMLElement; value: string[] | Range | undefined; onClose: (v: Range) => void;
}) {
  const [draft, setDraft] = useState<Range>(value && !Array.isArray(value) ? value : {});
  const date = isDateRange(facet);
  // Dates come as ISO text (possibly with a time); the inputs take the day.
  const bound = (b: string | number | null | undefined) => (b == null ? undefined : date ? String(b).slice(0, 10) : String(b));
  const min = bound(facet.range?.min), max = bound(facet.range?.max);
  const field = (key: "from" | "to", label: string) => (
    <TextField label={label} type={date ? "date" : "number"} size="small" fullWidth value={draft[key] ?? ""}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value || undefined }))}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min, max } }} />
  );
  return (
    <Pop anchor={anchor} title={facet.label} note={min && max ? `${min} to ${max}` : undefined}
      onClear={() => setDraft({})} onDone={() => onClose(draft)}>
      <Box sx={{ display: "flex", gap: 1, pt: 0.5 }}>
        {field("from", "From")}
        {field("to", "To")}
      </Box>
    </Pop>
  );
}
