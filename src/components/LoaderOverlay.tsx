"use client";
// Historically this was a SECOND full-screen blocking overlay — a 60px spinner on a
// rgba(255,255,255,0.6) + blur(8px) scrim — which meant the app had two different, competing
// answers to "we are loading".
//
// It is no longer an overlay in any sense: it draws nothing at all. It just reports "something
// is loading" into the same counter GlobalLoader renders from, so a page that gates on its own
// state gets the identical top rail + corner pill as every backend call. One loading identity
// for the whole app, and no possibility of two indicators stacking.
//
// Kept as a component (rather than a bare hook) because pages mount it conditionally —
// {loading && <LoaderOverlay />} — which is exactly the lifetime the beacon needs.
// The 450ms anti-flicker delay applies here too: a load that resolves quickly shows nothing.
import { useLoadingBeacon } from "./common/GlobalLoader";

const LoaderOverlay = () => {
  useLoadingBeacon(true);
  return null;
};

export default LoaderOverlay;
