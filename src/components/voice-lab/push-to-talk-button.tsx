"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export function PushToTalkButton({
  disabled,
  audioContext,
  onAudioReady,
}: {
  disabled?: boolean;
  audioContext?: AudioContext | null;
  onAudioReady: (blob: Blob) => void;
}) {
  const [recording, setRecording] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function start() {
    if (disabled || recording) return;
    // iOS Safari's AudioContext starts suspended and can only be resumed
    // from directly inside a user-gesture handler — this is the earliest
    // gesture in the whole voice flow, so it's resumed here first.
    if (audioContext?.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    if (!streamRef.current) {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: "audio/webm",
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      onAudioReady(blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stop() {
    if (!recording) return;
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        disabled={disabled}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        size="icon"
        aria-label={recording ? "Recording — release to send" : "Hold to talk"}
        className={cn(
          "size-20 select-none rounded-full shadow-lg transition-transform duration-150",
          recording && "scale-110 bg-destructive text-white hover:bg-destructive"
        )}
      >
        <Mic className="size-8" />
      </Button>
      <span className="text-xs text-muted-foreground">
        {recording ? "Release to send" : "Hold to talk"}
      </span>
    </div>
  );
}
