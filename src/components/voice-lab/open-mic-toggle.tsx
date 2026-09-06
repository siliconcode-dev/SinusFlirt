"use client";

import { useRef, useState } from "react";
import { encodeWav } from "@/lib/audio/wav-encoder";

// Pinned to the installed package versions (see package.json) so the CDN
// assets always match the code that's calling them.
const VAD_BASE = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";
const ORT_WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/";

export function OpenMicToggle({
  disabled,
  onAudioReady,
}: {
  disabled?: boolean;
  onAudioReady: (blob: Blob) => void;
}) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vadRef = useRef<any>(null);

  async function enable() {
    setLoading(true);
    try {
      const { MicVAD } = await import("@ricky0123/vad-web");
      const vad = await MicVAD.new({
        baseAssetPath: VAD_BASE,
        onnxWASMBasePath: ORT_WASM_BASE,
        onSpeechEnd: (samples: Float32Array) => {
          const blob = encodeWav(samples, 16000);
          onAudioReady(blob);
        },
      });
      vad.start();
      vadRef.current = vad;
      setActive(true);
    } catch (error) {
      console.error("[open-mic] failed to start VAD:", error);
    } finally {
      setLoading(false);
    }
  }

  function disable() {
    vadRef.current?.destroy();
    vadRef.current = null;
    setActive(false);
  }

  return (
    <button
      disabled={disabled || loading}
      onClick={() => (active ? disable() : enable())}
      style={{
        padding: "12px 20px",
        fontSize: 14,
        background: active ? "#0a0" : "#555",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {loading
        ? "Loading VAD..."
        : active
          ? "Open mic: ON (click to stop)"
          : "Open mic: OFF (click to start)"}
    </button>
  );
}
