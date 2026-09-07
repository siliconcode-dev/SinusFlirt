"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Loader2, Heart } from "lucide-react";
import { PushToTalkButton } from "./push-to-talk-button";
import { OpenMicToggle } from "./open-mic-toggle";
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
import { LeaveResetMenu } from "./leave-reset-menu";
import { AmbientBackground } from "@/components/ambient-background";
import { Card, CardContent } from "@/components/ui/card";
import { animateEntrance } from "@/lib/motion/entrance";
import { cn } from "cn";

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
  modelUrl: string;
  gestureIntensity: number;
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
  const [, setLatencies] = useState<TurnLatency[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [audioEl] = useState<HTMLAudioElement | null>(() =>
    typeof window !== "undefined" ? new Audio() : null
  );
  // Created once here (not inside use-lip-sync's effect) so the earliest
  // user gesture in the flow (push-to-talk's onPointerDown) can resume it —
  // iOS Safari starts AudioContext suspended and only resumes from a
  // direct gesture handler. See Phase 8 plan.
  const [audioContext] = useState<AudioContext | null>(() => {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    return new Ctor();
  });
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
  const [isPlayerSpeaking, setIsPlayerSpeaking] = useState(false);
  const avatarCardRef = useRef<HTMLDivElement>(null);
  const statusCardRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    animateEntrance(avatarCardRef.current);
    animateEntrance(statusCardRef.current);
  }, []);

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
      setStatus("Listening...");
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
          setStatus("Didn't catch that — try again.");
          return;
        }
        transcript = sttData.text;
      }

      const userMessage: ConversationMessage = { role: "user", content: transcript };
      messagesRef.current = [...messagesRef.current, userMessage];
      setMessages(messagesRef.current);

      setStatus(null);
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
          setStatus(replyText);
        }
      }
      latency.llmTotalMs = Math.round(performance.now() - chatStart);

      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: replyText,
      };
      messagesRef.current = [...messagesRef.current, assistantMessage];
      setMessages(messagesRef.current);

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

      // Refresh the always-visible meter (scored server-side, see
      // /api/voice/chat's after()-scheduled scoreTurn call).
      fetchCharacterInfo().then(setCharacterInfo);
    } catch (error) {
      console.error("[voice-lab] turn failed:", error);
      setStatus("Something went wrong — try again.");
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

  function handleEndConversation() {
    messagesRef.current = [];
    setMessages([]);
    setStatus(null);
  }

  async function handleReset() {
    const res = await fetch("/api/character/reset", { method: "DELETE" });
    if (res.ok) {
      handleEndConversation();
      fetchCharacterInfo().then(setCharacterInfo);
    }
  }

  async function handleSelectCharacter(slug: string) {
    const res = await fetch("/api/character/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (res.ok) {
      handleEndConversation();
      fetchCharacterInfo().then(setCharacterInfo);
    }
  }

  if (micDenied) {
    return <MicBlockedScreen />;
  }

  const dailyCap = characterInfo?.usage.dailyCap;
  const unlockActive = Boolean(characterInfo?.premiumUnlockExpiresAt);

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-4 px-4 py-6 sm:py-10">
      <AmbientBackground />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-semibold text-foreground">
            {name}
            {unlockActive && (
              <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-accent uppercase">
                Premium
              </span>
            )}
          </p>
          {characterInfo && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${characterInfo.interestScore}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {characterInfo.interestScore}/100
              </span>
            </div>
          )}
        </div>
        <LeaveResetMenu
          onEndConversation={handleEndConversation}
          onReset={handleReset}
          onSelectCharacter={handleSelectCharacter}
        />
      </div>

      <div
        ref={avatarCardRef}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#1a0e12] ring-1 ring-foreground/10"
      >
        <AvatarCanvas
          modelUrl={characterInfo?.modelUrl}
          audio={audioEl}
          audioContext={audioContext}
          interestScore={characterInfo?.interestScore ?? null}
          gestureIntensity={characterInfo?.gestureIntensity ?? 1}
          isPlayerSpeaking={isPlayerSpeaking}
          onStatusChange={setModelStatus}
        />
        {modelStatus !== "loaded" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-rose-200">
            {modelStatus === "error" ? (
              <p className="px-6 text-center text-sm">
                No avatar model loaded yet — drop aiko.vrm into public/models/
              </p>
            ) : (
              <>
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm">Loading avatar...</p>
              </>
            )}
          </div>
        )}
      </div>

      {status && (
        <Card ref={statusCardRef}>
          <CardContent className="text-sm leading-relaxed text-foreground">
            {status}
          </CardContent>
        </Card>
      )}

      <div className="flex-1" />

      {characterInfo?.ended ? (
        <Card className="border-destructive/30">
          <CardContent className="text-center text-sm text-muted-foreground">
            {name} has ended this conversation — her interest bottomed out.
            The score persists and can climb back up over time with better
            conversation, or restart fresh from the menu above.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-4 pb-2">
          {characterInfo?.kissAvailable && (
            <button
              type="button"
              disabled={busy || !!interruption}
              onClick={() => setShowKissCutscene(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform",
                "hover:bg-primary/90 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              <Heart className="size-4" />
              Kiss her
            </button>
          )}
          <div className="flex items-center gap-4">
            <PushToTalkButton
              disabled={busy || !!interruption}
              audioContext={audioContext}
              onAudioReady={handleAudioReady}
              onSpeakingChange={setIsPlayerSpeaking}
            />
            {!isMobile && (
              <OpenMicToggle
                disabled={busy || !!interruption}
                audioContext={audioContext}
                onAudioReady={handleAudioReady}
                onSpeakingChange={setIsPlayerSpeaking}
              />
            )}
          </div>
          {dailyCap !== null && characterInfo && (
            <p className="text-xs text-muted-foreground">
              {characterInfo.usage.turnsUsedToday}/{dailyCap} turns today
            </p>
          )}
        </div>
      )}

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
          herModelUrl={characterInfo.modelUrl}
          reactionLine={getKissLine(characterInfo.slug)}
          onComplete={() => setShowKissCutscene(false)}
        />
      )}
    </main>
  );
}
