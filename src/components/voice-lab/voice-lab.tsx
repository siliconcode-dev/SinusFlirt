"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { PushToTalkButton } from "./push-to-talk-button";
import { OpenMicToggle } from "./open-mic-toggle";
import { LatencyPanel } from "./latency-panel";
import type { ConversationMessage, TurnLatency } from "./types";
import { chunkForTTS } from "@/lib/tts-chunking";
import { playChunksSequentially } from "@/lib/audio/playback-queue";

// WebGL can't run during SSR.
const AvatarCanvas = dynamic(
  () => import("@/components/avatar/avatar-canvas").then((m) => m.AvatarCanvas),
  { ssr: false }
);

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

  async function handleAudioReady(blob: Blob) {
    if (busy || !audioEl) return;
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

      const sttRes = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: form,
      });
      const sttData = (await sttRes.json()) as { text?: string; ms?: number; error?: string };
      latency.sttMs = sttData.ms ?? null;

      if (!sttData.text || !sttData.text.trim()) {
        setStatus("Heard nothing — try again.");
        return;
      }

      const userMessage: ConversationMessage = { role: "user", content: sttData.text };
      messagesRef.current = [...messagesRef.current, userMessage];
      setMessages(messagesRef.current);

      setStatus("Waiting for reply...");
      const chatStart = performance.now();
      const chatRes = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesRef.current }),
      });

      const reader = chatRes.body?.getReader();
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
          setStatus(`Aiko: ${replyText}`);
        }
      }
      latency.llmTotalMs = Math.round(performance.now() - chatStart);

      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: replyText,
      };
      messagesRef.current = [...messagesRef.current, assistantMessage];
      setMessages(messagesRef.current);

      setStatus(`Aiko: ${replyText} (speaking...)`);
      const ttsChunks = chunkForTTS(replyText);
      latency.ttsChunkCount = ttsChunks.length;
      const ttsStart = performance.now();
      await playChunksSequentially(audioEl, ttsChunks, () => {});
      latency.ttsTotalMs = Math.round(performance.now() - ttsStart);

      setStatus(`Aiko: ${replyText}`);
    } catch (error) {
      console.error("[voice-lab] turn failed:", error);
      setStatus("Something went wrong — check the console.");
    } finally {
      setLatencies((prev) => [...prev, latency]);
      setBusy(false);
    }
  }

  return (
    <div style={{ fontFamily: "monospace", padding: 24, maxWidth: 800 }}>
      <h1>Voice Lab (Phase 3 — avatar + lip sync, plain dev chrome by design)</h1>

      <div style={{ position: "relative", width: "100%", height: 480, background: "#1a0e12" }}>
        <AvatarCanvas audio={audioEl} onStatusChange={setModelStatus} />
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

      <p>Status: {status}</p>

      <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
        <PushToTalkButton disabled={busy} onAudioReady={handleAudioReady} />
        <OpenMicToggle disabled={busy} onAudioReady={handleAudioReady} />
      </div>

      <h2>Conversation</h2>
      <ul>
        {messages.map((m, i) => (
          <li key={i}>
            <strong>{m.role}:</strong> {m.content}
          </li>
        ))}
      </ul>

      <h2>Latency log</h2>
      <LatencyPanel turns={latencies} />
    </div>
  );
}
