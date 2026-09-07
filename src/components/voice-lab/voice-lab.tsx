"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { PushToTalkButton } from "./push-to-talk-button";
import { OpenMicToggle } from "./open-mic-toggle";
import { LatencyPanel } from "./latency-panel";
import type { ConversationMessage, TurnLatency } from "./types";
import { chunkForTTS } from "@/lib/tts-chunking";
import { playChunksSequentially, TTSRequestError } from "@/lib/audio/playback-queue";
import { createClient } from "@/lib/supabase/client";
import { SaveProgressPrompt } from "./save-progress-prompt";
import { withRetry } from "@/lib/network/with-retry";
import {
  isWebSpeechSTTAvailable,
  transcribeViaWebSpeech,
  speakViaWebSpeech,
} from "@/lib/audio/web-speech-fallback";
import { InterruptionOverlay, type InterruptionKind } from "./interruption-overlay";
import { MicBlockedScreen } from "./mic-blocked-screen";
import { KissCutscene } from "@/components/avatar/kiss-cutscene";
import { getKissLine } from "@/lib/characters/kiss-lines";

const SAVE_PROMPT_TURN_THRESHOLD = 3;
const MOBILE_QUERY = "(pointer: coarse)";

type FetchClassification = Response | "cap" | "outage" | "usage-cap";

// Wraps a fetch with the "quick silent reconnect" retry, and classifies a
// non-ok HTTP response the same way the server does (cap/outage) so callers
// can decide whether to fall back or interrupt — see Phase 6 plan.
async function fetchClassified(
  input: string,
  init?: RequestInit
): Promise<FetchClassification> {
  try {
    const res = await withRetry(() => fetch(input, init));
    if (res.ok) return res;
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (body.error === "cap" || body.error === "usage-cap") return body.error;
    return "outage";
  } catch {
    return "outage";
  }
}

// WebGL can't run during SSR.
const AvatarCanvas = dynamic(
  () => import("@/components/avatar/avatar-canvas").then((m) => m.AvatarCanvas),
  { ssr: false }
);

type CharacterInfo = {
  name: string;
  slug: string;
  interestScore: number;
  memorySummary: string | null;
  ended: boolean;
  kissAvailable: boolean;
  premiumUnlockExpiresAt: string | null;
  isAnonymous: boolean;
  usage: { turnsUsedToday: number; dailyCap: number | null };
};

async function fetchCharacterInfo(): Promise<CharacterInfo | null> {
  const res = await fetch("/api/character/me");
  if (!res.ok) return null;
  return (await res.json()) as CharacterInfo;
}

export function VoiceLab() {
  const messagesRef = useRef<ConversationMessage[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [latencies, setLatencies] = useState<TurnLatency[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Idle.");
  const [audioEl] = useState<HTMLAudioElement | null>(() =>
    typeof window !== "undefined" ? new Audio() : null
  );
  const [modelStatus, setModelStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );
  const [characterInfo, setCharacterInfo] = useState<CharacterInfo | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [exitIntent, setExitIntent] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [interruption, setInterruption] = useState<InterruptionKind | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  );
  const [showKissCutscene, setShowKissCutscene] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetchCharacterInfo().then(setCharacterInfo);
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setIsAnonymous(Boolean(user?.is_anonymous)));
  }, []);

  useEffect(() => {
    // Proactive one-time check (Masterdoc §6: "block entry entirely... no
    // text-chat fallback") — release the stream immediately, the actual
    // recording buttons acquire their own fresh stream per-recording. Always
    // resolved async (never setState synchronously in the effect body).
    const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(
      navigator.mediaDevices
    );
    if (!getUserMedia) {
      Promise.resolve().then(() => setMicDenied(true));
      return;
    }
    getUserMedia({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => setMicDenied(true));
  }, []);

  useEffect(() => {
    if (!isAnonymous || promptDismissed) return;
    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) setExitIntent(true);
    }
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [isAnonymous, promptDismissed]);

  const name = characterInfo?.name ?? "...";
  const playerTurns = messages.filter((m) => m.role === "user").length;
  const showSavePrompt =
    isAnonymous &&
    !promptDismissed &&
    (exitIntent || playerTurns >= SAVE_PROMPT_TURN_THRESHOLD);

  async function handleAudioReady(blob: Blob) {
    if (busy || !audioEl || characterInfo?.ended || interruption) return;
    setBusy(true);
    const turn = messagesRef.current.filter((m) => m.role === "user").length + 1;
    const latency: TurnLatency = {
      turn,
      sttMs: null,
      llmTtftMs: null,
      llmTotalMs: null,
      ttsChunkCount: 0,
      ttsTotalMs: null,
    };

    try {
      setStatus("Transcribing...");
      const form = new FormData();
      const ext = blob.type.includes("webm") ? "webm" : "wav";
      form.append("audio", blob, `speech.${ext}`);

      let transcript: string;
      const sttStart = performance.now();
      const sttResult = await fetchClassified("/api/voice/transcribe", {
        method: "POST",
        body: form,
      });

      if (typeof sttResult === "string") {
        // Groq's whisper call failed — fall back to the browser's own
        // speech recognition (re-listens live, can't replay the blob).
        if (!isWebSpeechSTTAvailable()) {
          setInterruption(sttResult);
          return;
        }
        try {
          setStatus("Having trouble hearing — say that again...");
          transcript = await transcribeViaWebSpeech();
        } catch {
          setInterruption(sttResult);
          return;
        }
      } else {
        const sttData = (await sttResult.json()) as { text?: string; ms?: number };
        latency.sttMs = sttData.ms ?? Math.round(performance.now() - sttStart);
        if (!sttData.text || !sttData.text.trim()) {
          setStatus("Heard nothing — try again.");
          return;
        }
        transcript = sttData.text;
      }

      const userMessage: ConversationMessage = { role: "user", content: transcript };
      messagesRef.current = [...messagesRef.current, userMessage];
      setMessages(messagesRef.current);

      setStatus("Waiting for reply...");
      const chatStart = performance.now();
      const chatResult = await fetchClassified("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesRef.current }),
      });

      if (typeof chatResult === "string") {
        // Nothing can substitute for the LLM itself — always hard-blocks.
        setInterruption(chatResult);
        return;
      }

      const reader = chatResult.body?.getReader();
      const decoder = new TextDecoder();
      let replyText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (latency.llmTtftMs === null) {
            latency.llmTtftMs = Math.round(performance.now() - chatStart);
          }
          replyText += decoder.decode(value, { stream: true });
          setStatus(`${name}: ${replyText}`);
        }
      }
      latency.llmTotalMs = Math.round(performance.now() - chatStart);

      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: replyText,
      };
      messagesRef.current = [...messagesRef.current, assistantMessage];
      setMessages(messagesRef.current);

      setStatus(`${name}: ${replyText} (speaking...)`);
      const ttsChunks = chunkForTTS(replyText);
      latency.ttsChunkCount = ttsChunks.length;
      const ttsStart = performance.now();
      try {
        await playChunksSequentially(audioEl, ttsChunks, () => {});
      } catch (error) {
        // Orpheus failed — the reply text is already known and already
        // moderated, so speak it via the browser directly rather than
        // re-chunking (SpeechSynthesisUtterance has no 200-char limit).
        const kind = error instanceof TTSRequestError ? error.kind : "outage";
        try {
          await speakViaWebSpeech(replyText);
        } catch {
          setInterruption(kind);
          return;
        }
      }
      latency.ttsTotalMs = Math.round(performance.now() - ttsStart);

      setStatus(`${name}: ${replyText}`);

      // Refresh the always-visible meter (scored server-side, see
      // /api/voice/chat's after()-scheduled scoreTurn call).
      fetchCharacterInfo().then(setCharacterInfo);
    } catch (error) {
      console.error("[voice-lab] turn failed:", error);
      setStatus("Something went wrong — check the console.");
    } finally {
      setLatencies((prev) => [...prev, latency]);
      setBusy(false);
    }
  }

  async function handleUnlock() {
    try {
      const res = await fetch("/api/monetization/unlock", { method: "POST" });
      if (res.ok) {
        setInterruption(null);
        fetchCharacterInfo().then(setCharacterInfo);
      }
    } catch (error) {
      console.error("[voice-lab] unlock failed:", error);
    }
  }

  if (micDenied) {
    return <MicBlockedScreen />;
  }

  const dailyCap = characterInfo?.usage.dailyCap;
  const unlockActive = Boolean(characterInfo?.premiumUnlockExpiresAt);

  return (
    <div
      style={{
        fontFamily: "monospace",
        padding: "16px",
        maxWidth: "min(800px, 100%)",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ fontSize: "min(20px, 5vw)" }}>
        Voice Lab (Phase 7 — animation, kiss cutscene, monetization, plain dev
        chrome by design)
      </h1>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "min(480px, 60vh)",
          background: "#1a0e12",
        }}
      >
        <AvatarCanvas
          audio={audioEl}
          interestScore={characterInfo?.interestScore ?? null}
          onStatusChange={setModelStatus}
        />
        {modelStatus !== "loaded" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fecdd3",
              fontSize: 14,
              pointerEvents: "none",
            }}
          >
            {modelStatus === "error"
              ? "No avatar model loaded yet — drop aiko.vrm into public/models/"
              : "Loading avatar..."}
          </div>
        )}
      </div>

      <p>
        Character: <strong>{name}</strong>
        {unlockActive && " (premium unlock)"} | Interest:{" "}
        <strong>{characterInfo?.interestScore ?? "..."}/100</strong>
      </p>
      <p>Memory: {characterInfo?.memorySummary ?? "(nothing yet)"}</p>
      <p>
        Usage today:{" "}
        {dailyCap === null
          ? "unlimited (premium unlock active)"
          : `${characterInfo?.usage.turnsUsedToday ?? 0}/${dailyCap ?? "..."}`}
      </p>
      <p style={{ wordBreak: "break-word" }}>Status: {status}</p>

      {characterInfo?.ended ? (
        <p style={{ color: "#c00", fontWeight: "bold" }}>
          {name} has ended this conversation — her interest bottomed out.
          Reload to try again; the score persists and can climb back up over
          time with better conversation.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "16px 0" }}>
          <PushToTalkButton disabled={busy || !!interruption} onAudioReady={handleAudioReady} />
          {!isMobile && (
            <OpenMicToggle disabled={busy || !!interruption} onAudioReady={handleAudioReady} />
          )}
          {characterInfo?.kissAvailable && (
            <button
              type="button"
              disabled={busy || !!interruption}
              onClick={() => setShowKissCutscene(true)}
              style={{
                padding: "12px 20px",
                fontSize: 14,
                background: "#be185d",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Kiss her
            </button>
          )}
        </div>
      )}

      <h2>Conversation</h2>
      <ul style={{ paddingLeft: 20 }}>
        {messages.map((m, i) => (
          <li key={i} style={{ wordBreak: "break-word" }}>
            <strong>{m.role}:</strong> {m.content}
          </li>
        ))}
      </ul>

      <h2>Latency log</h2>
      <div style={{ overflowX: "auto" }}>
        <LatencyPanel turns={latencies} />
      </div>

      {showSavePrompt && (
        <SaveProgressPrompt
          characterName={name}
          onDismiss={() => setPromptDismissed(true)}
        />
      )}

      {interruption && (
        <InterruptionOverlay
          kind={interruption}
          onRetry={() => setInterruption(null)}
          onUnlock={handleUnlock}
          isAnonymous={isAnonymous}
        />
      )}

      {showKissCutscene && characterInfo && (
        <KissCutscene
          reactionLine={getKissLine(characterInfo.slug)}
          onComplete={() => setShowKissCutscene(false)}
        />
      )}
    </div>
  );
}
