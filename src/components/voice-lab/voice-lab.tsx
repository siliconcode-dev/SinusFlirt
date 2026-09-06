"use client";

import { useRef, useState } from "react";
import { PushToTalkButton } from "./push-to-talk-button";
import { OpenMicToggle } from "./open-mic-toggle";
import { LatencyPanel } from "./latency-panel";
import type { ConversationMessage, TurnLatency } from "./types";
import { chunkForTTS } from "@/lib/tts-chunking";
import { playChunksSequentially } from "@/lib/audio/playback-queue";

export function VoiceLab() {
  const messagesRef = useRef<ConversationMessage[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [latencies, setLatencies] = useState<TurnLatency[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Idle.");

  async function handleAudioReady(blob: Blob) {
    if (busy) return;
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
      await playChunksSequentially(ttsChunks, () => {});
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
      <h1>Voice Lab (Phase 2 — plain/ugly by design)</h1>
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
