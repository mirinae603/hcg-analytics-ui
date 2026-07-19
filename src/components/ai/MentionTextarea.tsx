"use client";
// Textarea with an @-mention picker: type "@" to search real entities (items,
// vendors, manufacturers, categories, hospitals) from the warehouse and insert the
// exact name into your question — so you never have to hunt for a term.
import React, { useEffect, useRef, useState } from "react";
import { TbPill, TbTruck, TbBuildingFactory2, TbCategory2, TbBuildingHospital } from "react-icons/tb";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

type Mention = { type: string; label: string };
const TYPE_META: Record<string, { Icon: any; color: string; bg: string; label: string }> = {
  item: { Icon: TbPill, color: "#3b5bdb", bg: "#eef1fb", label: "Item" },
  category: { Icon: TbCategory2, color: "#7048e8", bg: "#f1ecfb", label: "Category" },
  manufacturer: { Icon: TbBuildingFactory2, color: "#0ca678", bg: "#e6f6f0", label: "Maker" },
  vendor: { Icon: TbTruck, color: "#e0992f", bg: "#fbf1de", label: "Vendor" },
  hospital: { Icon: TbBuildingHospital, color: "#e8604a", bg: "#fceae7", label: "Hospital" },
};

export default function MentionTextarea({ value, onChange, onSubmit, disabled, placeholder }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean; placeholder?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Mention[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const rangeRef = useRef<{ start: number; end: number } | null>(null);
  const debRef = useRef<any>(null);
  const seqRef = useRef(0);

  // auto-grow
  useEffect(() => {
    const ta = taRef.current; if (!ta) return;
    ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }, [value]);

  const detect = (val: string, cursor: number) => {
    const upto = val.slice(0, cursor);
    const at = upto.lastIndexOf("@");
    if (at < 0) return null;
    if (at > 0 && !/\s/.test(val[at - 1])) return null;   // @ must start a token
    const q = upto.slice(at + 1);
    if (/\s/.test(q) || q.length > 40) return null;        // no spaces in the query
    return { start: at, end: cursor, q };
  };

  const fetchMentions = (q: string) => {
    const seq = ++seqRef.current;
    setLoading(true);
    fetch(`${DASHBOARD_API_BASE_URL}/ai/mentions?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => { if (seq === seqRef.current) { setItems(d.items || []); setIdx(0); setLoading(false); } })
      .catch(() => { if (seq === seqRef.current) { setItems([]); setLoading(false); } });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value; const cursor = e.target.selectionStart ?? val.length;
    onChange(val);
    const m = detect(val, cursor);
    if (m && m.q.length >= 1) {
      rangeRef.current = { start: m.start, end: m.end };
      setOpen(true);
      clearTimeout(debRef.current);
      debRef.current = setTimeout(() => fetchMentions(m.q), 150);
    } else if (m && m.q.length === 0) {
      rangeRef.current = { start: m.start, end: m.end };
      setOpen(true); setItems([]); // show a hint prompt to type
    } else {
      setOpen(false); setItems([]);
    }
  };

  const pick = (m: Mention) => {
    const r = rangeRef.current; if (!r) return;
    const before = value.slice(0, r.start);
    const after = value.slice(r.end);
    const insert = `"${m.label}" `;
    onChange(before + insert + after);
    setOpen(false); setItems([]);
    requestAnimationFrame(() => { const pos = (before + insert).length; const ta = taRef.current; if (ta) { ta.focus(); ta.setSelectionRange(pos, pos); } });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && items.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % items.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i - 1 + items.length) % items.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(items[idx]); return; }
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setOpen(false); onSubmit(); }
  };

  return (
    <div className="relative flex-1 min-w-0">
      {open && (items.length > 0 || loading) && (
        <div className="absolute left-0 bottom-full mb-2 z-30 rounded-xl bg-white overflow-hidden" style={{ width: "min(440px, 82vw)", border: "1px solid #e8eaf1", boxShadow: "0 18px 44px -16px rgba(20,24,40,0.32)" }}>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] border-b" style={{ color: "#aab0bd", borderColor: "#f1f2f6" }}>Reference an item, vendor, category…</div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {loading && !items.length ? (
              <div className="px-3 py-3 text-[12px]" style={{ color: "#a2a8b6" }}>Searching…</div>
            ) : items.map((m, i) => {
              const meta = TYPE_META[m.type] || TYPE_META.item;
              const Icon = meta.Icon;
              return (
                <button key={`${m.type}-${m.label}`} type="button" onMouseDown={(e) => { e.preventDefault(); pick(m); }} onMouseEnter={() => setIdx(i)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors" style={{ background: i === idx ? "#f4f5f8" : "transparent" }}>
                  <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: meta.bg, color: meta.color }}><Icon size={13} /></span>
                  <span className="flex-1 min-w-0 truncate text-[12.5px]" style={{ color: "#2b3040" }} title={m.label}>{m.label}</span>
                  <span className="text-[9.5px] font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                </button>
              );
            })}
          </div>
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
