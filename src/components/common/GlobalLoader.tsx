"use client";
// Subtle global loading overlay. Patches window.fetch at MODULE load (before any
// component effect) so it catches even the very first request — important because
// the free backend sleeps after ~15 min idle and can take up to ~50s to wake.
// It only appears when a backend call runs longer than ~450ms (no flicker for warm,
// fast requests), and switches to a reassuring message after 6s.
// Shared state lives on `window` so a single tracker survives dev HMR re-evals.
import { useEffect, useState } from "react";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

const BASE = (DASHBOARD_API_BASE_URL || "").replace(/\/+$/, "");

type GlState = { active: number; subs: Set<() => void> };
type WGL = Window & { __gl?: GlState; __glPatched?: boolean };

function store(): GlState {
  const w = window as WGL;
  if (!w.__gl) w.__gl = { active: 0, subs: new Set() };
  return w.__gl;
}

// ---- patch fetch once, at module load (before React effects) ----
if (typeof window !== "undefined" && BASE && !(window as WGL).__glPatched) {
  (window as WGL).__glPatched = true;
  const st = store();
  const notify = () => st.subs.forEach((f) => f());
  const orig = window.fetch.bind(window);
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    let url = "";
    try { url = typeof input === "string" ? input : (input as Request)?.url || String(input); } catch { /* noop */ }
    const track = !!url && url.startsWith(BASE);
    if (track) { st.active += 1; notify(); }
    const p = orig(input, init);
    if (track) {
      const done = () => { st.active = Math.max(0, st.active - 1); notify(); };
      p.then(done, done);
    }
    return p;
  } as typeof window.fetch;
}

export default function GlobalLoader() {
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const st = store();
    const update = () => setBusy(st.active > 0);
    st.subs.add(update);
    update();
    return () => { st.subs.delete(update); };
  }, []);

  useEffect(() => {
    if (!busy) { setVisible(false); setSlow(false); return; }
    const t1 = setTimeout(() => setVisible(true), 450);
    const t2 = setTimeout(() => setSlow(true), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [busy]);

  return (
    <div aria-hidden={!visible} role="status"
      style={{
        position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(248,249,251,0.68)", backdropFilter: "blur(9px) saturate(1.05)", WebkitBackdropFilter: "blur(9px) saturate(1.05)",
        opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", transition: "opacity .32s ease",
      }}>
      <div style={{
        background: "#ffffff", borderRadius: 22, padding: "26px 34px 24px", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 15, minWidth: 210, border: "1px solid #edeef2",
        boxShadow: "0 26px 64px -22px rgba(20,24,40,0.30), 0 3px 12px -6px rgba(20,24,40,0.10)",
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)", transition: "transform .32s cubic-bezier(.22,1,.36,1)",
      }}>
        <div style={{ position: "relative", width: 62, height: 62 }}>
          <svg className="animate-spin" style={{ animationDuration: ".9s" }} width="62" height="62" viewBox="0 0 62 62">
            <circle cx="31" cy="31" r="26" fill="none" stroke="#edeff4" strokeWidth="4" />
            <circle cx="31" cy="31" r="26" fill="none" stroke="#3b6fd4" strokeWidth="4" strokeLinecap="round" strokeDasharray="44 200" />
          </svg>
          <img src="/images/logo/hcg-butterfly.svg" alt="" className="animate-pulse" style={{ position: "absolute", inset: 0, margin: "auto", width: 25, height: 23 }} />
        </div>
        <div style={{ textAlign: "center", maxWidth: 230 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1b1c22" }}>{slow ? "Waking up the server…" : "Loading…"}</div>
          <div style={{ fontSize: 11.5, color: "#8a8f9d", marginTop: 4, lineHeight: 1.5 }}>{slow ? "The free server sleeps after a break — the first load can take up to a minute." : "Fetching your data."}</div>
        </div>
      </div>
    </div>
  );
}
