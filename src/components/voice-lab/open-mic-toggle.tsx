"use client";

import { useRef, useState } from "react";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { encodeWav } from "@/lib/audio/wav-encoder";

// Pinned to the installed package versions (see package.json) so the CDN
// assets always match the code that's calling them.
const VAD_BASE = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";
const ORT_WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/";

export function OpenMicToggle({
  disabled,
  audioContext,
  onAudioReady,
  onSpeakingChange,
}: {
  disabled?: boolean;
  audioContext?: AudioContext | null;
  onAudioReady: (blob: Blob) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vadRef = useRef<any>(null);

  async function enable() {
    if (audioContext?.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    setLoading(true);
    try {
      const { MicVAD } = await import("@ricky0123/vad-web");
      const vad = await MicVAD.new({
        baseAssetPath: VAD_BASE,
        onnxWASMBasePath: ORT_WASM_BASE,
        onSpeechStart: () => {
          onSpeakingChange?.(true);
        },
        onSpeechEnd: (samples: Float32Array) => {
          onSpeakingChange?.(false);
          const blob = encodeWav(samples, 16000);
          onAudioReady(blob);
        },
        onVADMisfire: () => {
          onSpeakingChange?.(false);
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
    onSpeakingChange?.(false);
  }

  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      disabled={disabled || loading}
      onClick={() => (active ? disable() : enable())}
      className="h-11 gap-2 px-4"
    >
      <Radio className={cn("size-4", active && "animate-pulse")} />
      {loading ? "Loading..." : active ? "Open mic: on" : "Open mic"}
    </Button>
  );
}
