"use client";
// Billable / Non-billable / Both — a PAGE-level toggle, not a per-card chip like
// CardCategoryFilter's Category control. Category is a genuinely independent cut
// that different cards on the same page can slice differently; Scope redefines what
// "moving"/"consumption" MEANS for the whole KPI — every card on a page that uses
// this shares the same underlying question, so letting them disagree (hero on "Both",
// a card below still on "Internal only") would make the page contradict itself. See
// CardCategoryFilter.tsx's own header comment for the card-level rationale this
// deliberately does not follow.
//
// Shared across the Inventory KPIs that fold patient-billed consumption in as an
// optional lens (Days on Hand, Non-Moving Inventory, Inventory Turnover Ratio) so the
// control looks and behaves identically everywhere it appears, styled per page via
// `accent`/`track`.
import React from "react";
import { TbReceipt, TbBuildingWarehouse, TbArrowsSplit2 } from "react-icons/tb";

export type Scope = "nonbillable" | "billable" | "both";

export const SCOPE_OPTS: { key: Scope; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "nonbillable", label: "Internal only", icon: TbBuildingWarehouse },
  { key: "billable", label: "Billed only", icon: TbReceipt },
  { key: "both", label: "Both", icon: TbArrowsSplit2 },
];

export function ScopeToggle({
  value, onChange, accent = "#38352f", track = "#eae6dd", trackBorder = "#ddd6c8", idle = "#6b6355",
}: {
  value: Scope;
  onChange: (s: Scope) => void;
  /** Active-pill background. Defaults to the Non-Moving page's ink/bronze. */
  accent?: string;
  /** Pill-track background + border + idle label color — match the host page's palette. */
  track?: string;
  trackBorder?: string;
  idle?: string;
}) {
  return (
    <div className="inline-flex items-center rounded-full p-1 gap-1" style={{ background: track, border: `1px solid ${trackBorder}` }}>
      {SCOPE_OPTS.map((o) => {
        const active = o.key === value; const Icon = o.icon;
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
            style={{ background: active ? accent : "transparent", color: active ? "#fff" : idle, boxShadow: active ? `0 4px 12px -4px ${accent}66` : "none" }}>
            <Icon size={13} />{o.label}
          </button>
        );
      })}
    </div>
  );
}

export default ScopeToggle;
