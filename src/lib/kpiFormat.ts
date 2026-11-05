import { Kind } from "./kpiRegistry";
import { unbrand } from "@/utils/brand";

export const inr = (v: number | null | undefined) => {
  if (v == null || isNaN(v as number)) return "—";
  const n = Number(v), a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};
export const num = (v: number | null | undefined, d = 0) =>
  v == null || isNaN(v as number) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });
export const pct = (v: number | null | undefined, d = 1) =>
  v == null || isNaN(v as number) ? "—" : `${Number(v).toFixed(d)}%`;

export const fmt = (v: any, kind?: Kind) => {
  if (v == null || v === "") return "—";
  switch (kind) {
    case "inr": return inr(Number(v));
    case "pct": return pct(Number(v));
    case "pct2": return pct(Number(v), 2);
    case "num": return num(Number(v), 2);
    case "date": return String(v).slice(0, 10);
    case "bool": return v === true || v === "true" ? "Yes" : "No";
    // text is shown under the build's brand (src/utils/brand.ts): table cells hold the raw
    // value, which filters and row clicks send back as it is
    default: return unbrand(Array.isArray(v) ? v.join(", ") : String(v));
  }
};
