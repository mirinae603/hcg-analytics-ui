"use client";
// The hooks every chart measures itself with: useSize (width and height, for a chart that
// fills a one-screen panel) and useWidth (width only, for a chart that sets its own height).
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export type Size = { w: number; h: number };

// A layout effect measures before the first paint, so a chart never flashes at its initial
// size; on the server (the static export prerenders) there is no layout to read.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** An element's rendered (border-box) size in px, kept current as the layout changes. A zero
 *  reading (the element is hidden, or not laid out yet) keeps the last good one. */
export function useSize<T extends Element>(initial: Size): [React.RefObject<T | null>, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>(initial);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const take = (w: number, h: number) => {
      const cw = Math.round(w), ch = Math.round(h);
      setSize((p) => {
        const next = { w: cw > 0 ? cw : p.w, h: ch > 0 ? ch : p.h };
        return next.w === p.w && next.h === p.h ? p : next;
      });
    };
    const r = el.getBoundingClientRect();
    take(r.width, r.height);
    const ro = new ResizeObserver(([e]) => {
      const b = e.borderBoxSize?.[0];
      if (b) take(b.inlineSize, b.blockSize); else take(e.contentRect.width, e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** An element's rendered width in px, kept current as the layout changes. */
export function useWidth<T extends Element>(initial: number): [React.RefObject<T | null>, number] {
  const [ref, size] = useSize<T>({ w: initial, h: 0 });
  return [ref, size.w];
}
