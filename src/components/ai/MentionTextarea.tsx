"use client";
// @-mention picker. Type "@" → first choose WHAT to reference (Items, Categories,
// Manufacturers, Vendors, Hospitals). Pick one → browse a curated list (top by
// importance) and keep typing to filter within it. Or type "@abc" to search across
// everything. Selecting inserts the exact quoted name into the question.
import React, { useEffect, useRef, useState } from "react";
import { TbPill, TbTruck, TbBuildingFactory2, TbCategory2, TbBuildingHospital, TbChevronRight, TbChevronLeft, TbSearch } from "react-icons/tb";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

type Mention = { type: string; label: string };
const TYPE_META: Record<string, { Icon: any; color: string; bg: string; label: string; hint: string }> = {
  item: { Icon: TbPill, color: "#3b5bdb", bg: "#eef1fb", label: "Items", hint: "products & SKUs" },
  category: { Icon: TbCategory2, color: "#7048e8", bg: "#f1ecfb", label: "Categories", hint: "material groups" },
  manufacturer: { Icon: TbBuildingFactory2, color: "#0ca678", bg: "#e6f6f0", label: "Manufacturers", hint: "brands" },
  vendor: { Icon: TbTruck, color: "#e0992f", bg: "#fbf1de", label: "Vendors", hint: "suppliers" },
  hospital: { Icon: TbBuildingHospital, color: "#e8604a", bg: "#fceae7", label: "Hospitals", hint: "billing units" },
};
const TYPES = ["item", "category", "manufacturer", "vendor", "hospital"];

export default function MentionTextarea({ value, onChange, onSubmit, disabled, placeholder }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean; placeholder?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const [items, setItems] = useState<Mention[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const rangeRef = useRef<{ start: number; end: number } | null>(null);
  const seqRef = useRef(0);

  const phase: "types" | "values" = (!activeType && query === "") ? "types" : "values";
  const list = phase === "types" ? TYPES : items;

  useEffect(() => { const ta = taRef.current; if (!ta) return; ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 128) + "px"; }, [value]);

  // fetch values (browse when query empty + a type is active; search otherwise)
  useEffect(() => {
    if (!open || phase === "types") { return; }
    const seq = ++seqRef.current; setLoading(true);
    const t = setTimeout(() => {
      fetch(`${DASHBOARD_API_BASE_URL}/ai/mentions?q=${encodeURIComponent(query)}${activeType ? `&type=${activeType}` : ""}`)
        .then((r) => r.json())
        .then((d) => { if (seq === seqRef.current) { setItems(d.items || []); setIdx(0); setLoading(false); } })
        .catch(() => { if (seq === seqRef.current) { setItems([]); setLoading(false); } });
    }, 140);
    return () => clearTimeout(t);
  }, [open, query, activeType, phase]);

  const detect = (val: string, cursor: number) => {
    const upto = val.slice(0, cursor);
    const at = upto.lastIndexOf("@");
    if (at < 0) return null;
    if (at > 0 && !/\s/.test(val[at - 1])) return null;
    const q = upto.slice(at + 1);
    if (/\s/.test(q) || q.length > 40) return null;
    return { start: at, end: cursor, q };
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value; const cursor = e.target.selectionStart ?? val.length;
    onChange(val);
    const m = detect(val, cursor);
    if (m) { rangeRef.current = { start: m.start, end: m.end }; setOpen(true); setIdx(0); setQuery(m.q); }
    else { setOpen(false); setActiveType(null); setQuery(""); setItems([]); }
  };

  const pickType = (t: string) => { setActiveType(t); setIdx(0); requestAnimationFrame(() => taRef.current?.focus()); };
  const backToTypes = () => { setActiveType(null); setQuery(""); setItems([]); setIdx(0); };

  const pickValue = (m: Mention) => {
    const r = rangeRef.current; if (!r) return;
    const before = value.slice(0, r.start); const after = value.slice(r.end);
    const insert = `"${m.label}" `;
    onChange(before + insert + after);
    setOpen(false); setActiveType(null); setQuery(""); setItems([]);
    requestAnimationFrame(() => { const pos = (before + insert).length; const ta = taRef.current; if (ta) { ta.focus(); ta.setSelectionRange(pos, pos); } });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && list.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % list.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i - 1 + list.length) % list.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); phase === "types" ? pickType(TYPES[idx]) : pickValue(items[idx]); return; }
    }
    if (e.key === "Escape" && open) { e.preventDefault(); activeType ? backToTypes() : setOpen(false); return; }
    if (e.key === "Backspace" && open && activeType && query === "") { backToTypes(); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setOpen(false); onSubmit(); }
  };

  return (
    <div className="relative flex-1 min-w-0">
      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-30 rounded-xl bg-white overflow-hidden" style={{ width: "min(460px, 84vw)", border: "1px solid #e8eaf1", boxShadow: "0 20px 46px -16px rgba(20,24,40,0.34)" }}>
          {phase === "types" ? (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] border-b" style={{ color: "#aab0bd", borderColor: "#f1f2f6" }}>What do you want to reference?</div>
              <div className="py-1">
                {TYPES.map((t, i) => {
                  const meta = TYPE_META[t]; const Icon = meta.Icon;
                  return (
                    <button key={t} type="button" onMouseDown={(e) => { e.preventDefault(); pickType(t); }} onMouseEnter={() => setIdx(i)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors" style={{ background: i === idx ? "#f4f5f8" : "transparent" }}>
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg, color: meta.color }}><Icon size={15} /></span>
                      <span className="flex-1 min-w-0"><span className="text-[13px] font-medium" style={{ color: "#2b3040" }}>{meta.label}</span><span className="text-[11px] ml-2" style={{ color: "#a2a8b6" }}>{meta.hint}</span></span>
                      <TbChevronRight size={14} style={{ color: "#c3c8d2" }} />
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-1.5 text-[10.5px] border-t" style={{ color: "#aab0bd", borderColor: "#f1f2f6" }}>…or just keep typing to search everything</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-2.5 py-1.5 border-b" style={{ borderColor: "#f1f2f6" }}>
                {activeType ? (
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); backToTypes(); }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-100" style={{ color: "#6b7280" }}><TbChevronLeft size={15} /></button>
                ) : <TbSearch size={14} style={{ color: "#aab0bd", marginLeft: 4 }} />}
                <span className="text-[11px] font-semibold" style={{ color: "#5a6072" }}>{activeType ? TYPE_META[activeType].label : "Search results"}</span>
                {query ? <span className="text-[11px]" style={{ color: "#aab0bd" }}>· “{query}”</span> : null}
                {loading ? <span className="ml-auto text-[10.5px]" style={{ color: "#aab0bd" }}>…</span> : items.length ? <span className="ml-auto text-[10.5px]" style={{ color: "#c3c8d2" }}>{items.length}</span> : null}
              </div>
              <div className="max-h-[280px] overflow-y-auto py-1">
                {loading && !items.length ? (
                  <div className="px-3 py-3 text-[12px]" style={{ color: "#a2a8b6" }}>Searching…</div>
                ) : !items.length ? (
                  <div className="px-3 py-3 text-[12px]" style={{ color: "#a2a8b6" }}>No matches{query ? ` for “${query}”` : ""}.</div>
                ) : items.map((m, i) => {
                  const meta = TYPE_META[m.type] || TYPE_META.item; const Icon = meta.Icon;
                  return (
                    <button key={`${m.type}-${m.label}`} type="button" onMouseDown={(e) => { e.preventDefault(); pickValue(m); }} onMouseEnter={() => setIdx(i)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors" style={{ background: i === idx ? "#f4f5f8" : "transparent" }}>
                      <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: meta.bg, color: meta.color }}><Icon size={13} /></span>
                      <span className="flex-1 min-w-0 truncate text-[12.5px]" style={{ color: "#2b3040" }} title={m.label}>{m.label}</span>
                      {!activeType ? <span className="text-[9.5px] font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: meta.color }}>{TYPE_META[m.type]?.label?.replace(/s$/, "") || m.type}</span> : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      <textarea
        ref={taRef} value={value} onChange={handleChange} onKeyDown={handleKeyDown} rows={1} disabled={disabled}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-2.5 py-2 text-[13.5px] outline-none max-h-32 leading-relaxed"
        style={{ color: "#1a1f36" }} />
    </div>
  );
}
