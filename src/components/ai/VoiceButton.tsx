"use client";
// Voice input for the AI chat: a mic button beside Send. The browser records the question
// (MediaRecorder, up to MAX_SECONDS), POST /ai/transcribe turns it into text on the server
// (Azure OpenAI speech-to-text, app/ai/transcribe.py), and the text lands in the chat box,
// where the user reads it and presses Send: a misheard drug name is corrected before it is
// asked, and a spoken question then goes through exactly what a typed one does. Nothing is
// stored; the audio lives only in this component until it is sent.
//
// The button is shown only when the server says voice is set up (GET /ai/status voice) and
// this browser can record, so it never sits there doing nothing.
import React, { useEffect, useRef, useState } from "react";
import { TbMicrophone, TbPlayerStopFilled, TbLoader2 } from "react-icons/tb";
import { apiFetch, ApiError } from "@/utils/api";
import { T } from "./theme";

/** A spoken question is seconds long; past a minute recording stops on its own. */
const MAX_SECONDS = 60;
/** What the browsers record, best first, as the server reads them (transcribe.AUDIO_TYPES):
 *  Chrome and Edge webm/Opus, Firefox ogg or webm/Opus, Safari mp4. */
const FORMATS = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4"];

// One status request per page load, shared by every chat on the page; retried next mount
// when it failed.
let statusRequest: Promise<boolean> | null = null;
function voiceOnServer(): Promise<boolean> {
  statusRequest ??= apiFetch<{ voice?: boolean }>("/ai/status")
    .then((s) => !!s.voice)
    .catch(() => { statusRequest = null; return false; });
  return statusRequest;
}

const canRecord = () =>
  typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

function useVoiceAvailable(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!canRecord()) return;
    let dead = false;
    voiceOnServer().then((v) => { if (!dead) setOn(v); });
    return () => { dead = true; };
  }, []);
  return on;
}

/** What the browser's microphone error means for the user, in plain words. */
function micError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "The microphone is blocked for this site. Allow it from the icon in the address bar, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone was found on this device.";
  if (name === "NotReadableError") return "The microphone is in use by another app. Close it and try again.";
  return "The microphone couldn't be started. Please try again.";
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type State = "idle" | "recording" | "sending";

export default function VoiceButton({ onText, onError }: {
  /** The words heard, to put into the chat box. */
  onText: (text: string) => void;
  /** A failure to show the user, in plain words. */
  onError: (message: string) => void;
}) {
  const available = useVoiceAvailable();
  const [state, setState] = useState<State>("idle");
  const [secs, setSecs] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const discard = useRef(false);
  const mounted = useRef(true);

  function release() {
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function cancel() {
    discard.current = true;
    stop();
  }

  async function send(blob: Blob) {
    setState("sending");
    try {
      const r = await apiFetch<{ text: string }>("/ai/transcribe", {
        method: "POST",
        body: blob,
        headers: { "Content-Type": blob.type || FORMATS[0] },
      });
      if (mounted.current && r?.text) onText(r.text);
    } catch (e) {
      if (mounted.current) onError(e instanceof ApiError ? e.message : "Couldn't reach the server. Please try again.");
    } finally {
      if (mounted.current) setState("idle");
    }
  }

  async function start() {
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      onError(micError(e));
      return;
    }
    if (!mounted.current) { s.getTracks().forEach((t) => t.stop()); return; }
    const mime = FORMATS.find((f) => MediaRecorder.isTypeSupported(f));
    const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    discard.current = false;
    r.ondataavailable = (ev) => { if (ev.data.size) chunks.current.push(ev.data); };
    r.onstop = () => {
      const blob = new Blob(chunks.current, { type: r.mimeType || mime || FORMATS[0] });
      chunks.current = [];
      release();
      if (discard.current || !mounted.current) { if (mounted.current) setState("idle"); return; }
      void send(blob);
    };
    recorder.current = r;
    stream.current = s;
    r.start();
    setSecs(0);
    setState("recording");
    const t0 = Date.now();
    timer.current = window.setInterval(() => {
      const n = Math.floor((Date.now() - t0) / 1000);
      setSecs(n);
      if (n >= MAX_SECONDS) stop();
    }, 250);
  }

  // Leaving the page mid-recording drops the clip and frees the microphone.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discard.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
    };
  }, []);

  // Esc while recording throws the clip away.
  useEffect(() => {
    if (state !== "recording") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); cancel(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!available) return null;

  if (state === "recording") {
    return (
      <span className="inline-flex items-center gap-2 flex-shrink-0">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] tabular-nums" style={{ color: T.bad }} aria-live="polite">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: T.bad }} aria-hidden="true" />
          Listening {clock(secs)}
          <span className="hidden sm:inline" style={{ color: T.faint }}>· Esc to cancel</span>
        </span>
        <button onClick={stop} title="Stop and turn it into text" aria-label="Stop recording and turn it into text"
          className="ai-send w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: T.bad, color: "#fff" }}>
          <TbPlayerStopFilled size={12} />
        </button>
      </span>
    );
  }

  const sending = state === "sending";
  return (
    <button onClick={() => void start()} disabled={sending}
      title={sending ? "Turning your question into text…" : "Speak your question (up to a minute). The words appear here for you to check before sending."}
      aria-label={sending ? "Turning your question into text" : "Speak your question"}
      className="ai-tool w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-60"
      style={{ border: `1px solid ${T.line}`, color: T.ink2, background: T.surface }}>
      {sending ? <TbLoader2 size={15} className="animate-spin" /> : <TbMicrophone size={15} />}
    </button>
  );
}
