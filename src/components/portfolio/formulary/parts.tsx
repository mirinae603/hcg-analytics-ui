"use client";
// Shared pieces for the Formulary Compliance page: its colour law, the segmented pills the
// drawers and sub-tabs use, the slide-over the doctor/item drills open in, and the empty /
// error states. Built on the ledger kit's tokens so the page sits with the other custom pages.
//
// COLOUR LAW on this page — one job per hue, the kit's WARM hues (ledger/kit.tsx), the same on
// every screen that draws HCG's buckets:
//   F_COL   = formulary spend (group A), the numerator (SAGE).
//   OOF_COL = out-of-formulary spend (group B), the only other term in the ratio (CORAL_MARK).
//   NF_COL  = non-formulary spend (group C), OUTSIDE the ratio, so always hatched, never solid
//             (STONE_LIGHT).
//   X_COL   = not in the Item Master (TEAL_LIGHT).
//   RATE_COL = a rate (compliance %), and only ever a rate (INK).
import React, { useEffect } from "react";
import { TbX } from "react-icons/tb";
import { CARD, INK, SUB, LINE, RULE, SAGE, CORAL_MARK, STONE_LIGHT, TEAL_LIGHT, HONEY, HONEY_INK, CORAL_INK, PILL_TRACK, PILL_SHADOW, EASE } from "@/components/portfolio/ledger/kit";

// The legend key and the tab-link pill now live in the ledger kit (the one-screen panels and
// drawers use them too); re-exported so this page's imports stand.
export { Swatch } from "@/components/portfolio/ledger/legend";
export { LinkButton } from "@/components/portfolio/ledger/panel";

export const F_COL = SAGE;
export const OOF_COL = CORAL_MARK;
export const RATE_COL = INK;
export const NF_COL = STONE_LIGHT;
export const X_COL = TEAL_LIGHT;

/** "0.5 pts" — a gap from 100% on a bar scale. */
export const fmtPts = (v: number) => `${Number(v.toFixed(2))} pts`;

export const GROUP_COL: Record<string, string> = { A: F_COL, B: OOF_COL, C: NF_COL, X: X_COL };
export const GROUP_LABEL: Record<string, string> = { A: "Formulary", B: "Out of formulary", C: "Non formulary", X: "Not in Item Master" };

/** Brand-rule verdicts (Brand rules tab and its HCG guidelines card). `color` fills a verdict's
 *  bar; `ink` is the shade its words wear (4.5:1 on white). */
export const VERDICT: Record<string, { label: string; color: string; ink: string; note: string }> = {
  breach: { label: "Breach", color: OOF_COL, ink: CORAL_INK, note: "against the guidelines" },
  watch: { label: "Watch", color: HONEY, ink: HONEY_INK, note: "a figure the MIS reports" },
  info: { label: "Info", color: NF_COL, ink: SUB, note: "shown for information" },
};

export type PillOpt<T extends string> = { key: T; label: string; title?: string };

/** Segmented control in the "Current stock value" page's look: a warm track, the chosen option a
 *  white pill with its words in the coral's text shade. */
export function Pills<T extends string>({ value, options, onChange, disabled = false, title }: {
  value: T; options: PillOpt<T>[]; onChange: (v: T) => void; disabled?: boolean; title?: string;
}) {
  return (
    <div role="radiogroup" title={title} className="inline-flex items-center rounded-full p-1 gap-0.5"
      style={{ background: PILL_TRACK, border: `1px solid ${RULE}`, opacity: disabled ? 0.55 : 1 }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button key={o.key} type="button" role="radio" aria-checked={active} disabled={disabled} title={o.title ?? title}
            onClick={() => { if (!active) onChange(o.key); }}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap"
            style={{
              background: active ? CARD : "transparent", color: active ? CORAL_INK : SUB,
              boxShadow: active ? PILL_SHADOW : "none",
              cursor: disabled ? "not-allowed" : "pointer",
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A full-width notice in place of a card's content. */
export function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[20px] text-center py-14 px-6" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <div className="text-[14px] font-semibold" style={{ color: INK }}>{title}</div>
      {children && <div className="text-[12.5px] mt-1.5 max-w-xl mx-auto leading-relaxed" style={{ color: SUB }}>{children}</div>}
    </div>
  );
}

/** The page's name on a downloaded table (table/DownloadCsv). */
export const FORMULARY_PAGE = "Formulary compliance";

/** Right-hand slide-over panel (the RevenueMargin drill's chrome). Esc or the scrim closes it. */
export function SlideOver({ open, onClose, eyebrow, title, sub, children }: {
  open: boolean; onClose: () => void; eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(40,30,24,0.32)", backdropFilter: "blur(2px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s ease" }} />
      <div role="dialog" aria-modal="true" aria-hidden={!open}
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 61, width: "min(880px, 96vw)", background: "#fff", boxShadow: "-26px 0 64px -22px rgba(60,40,30,0.34)", transform: open ? "translateX(0)" : "translateX(101%)", visibility: open ? "visible" : "hidden", transition: `transform .34s ${EASE}, visibility 0s linear ${open ? "0s" : ".34s"}`, display: "flex", flexDirection: "column" }}>
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: SUB }}>{eyebrow}</div>
              <h3 className="text-[20px] font-bold leading-tight truncate" style={{ color: INK, letterSpacing: "-.02em" }}>{title}</h3>
              {sub && <div className="text-[12.5px] mt-0.5" style={{ color: SUB }}>{sub}</div>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close panel" className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F4EFE8]" style={{ color: SUB }}><TbX size={19} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </>
  );
}
