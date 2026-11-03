"use client";
// The dashboard-wide Value ↔ Quantity switch (HCG: "one side quantity, one side value; click
// value and the whole dashboard changes to value"). It lives beside the hospital selector:
// a view choice, not a filter, so it carries from page to page and survives a reload.
//
// "value" is rupees (the default every figure was built on); "qty" is quantity — units sold,
// tablets, vials and bottles added together. The switch says "Quantity", never "Units": HCG
// calls its hospitals units, so "Units" beside the hospital selector read as a list of
// hospitals. A view that has no quantity version (margin missed, extra paid, the compliance
// budget) keeps rupees and says so; it never converts.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Basis = "value" | "qty";

export const BASIS_OPTIONS: { key: Basis; label: string }[] = [
  { key: "value", label: "Value" },
  { key: "qty", label: "Quantity" },
];

const STORAGE_KEY = "dashboardBasis";

type BasisCtx = { basis: Basis; setBasis: (b: Basis) => void };

// Outside the provider (a test, a page rendered on its own) every view reads value.
const BasisContext = createContext<BasisCtx>({ basis: "value", setBasis: () => {} });

const isBasis = (v: unknown): v is Basis => v === "value" || v === "qty";

export function BasisProvider({ children }: { children: React.ReactNode }) {
  const [basis, setState] = useState<Basis>("value");

  // Restored after mount, never during render: the static export renders without storage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isBasis(saved)) setState(saved);
    } catch { /* storage blocked: stay on value */ }
  }, []);

  const setBasis = useCallback((b: Basis) => {
    setState(b);
    try { localStorage.setItem(STORAGE_KEY, b); } catch { /* storage blocked: this visit only */ }
  }, []);

  return <BasisContext.Provider value={{ basis, setBasis }}>{children}</BasisContext.Provider>;
}

export const useBasis = () => useContext(BasisContext);

/** The `Basis=` query value an endpoint takes: sent only when it is not the default. */
export const basisParam = (b: Basis): Record<string, string> => (b === "qty" ? { Basis: "qty" } : {});
