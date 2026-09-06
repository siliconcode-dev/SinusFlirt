"use client";

import { useRef, useState } from "react";

export function PushToTalkButton({
  disabled,
  onAudioReady,
}: {
  disabled?: boolean;
  onAudioReady: (blob: Blob) => void;
}) {
  const [recording, setRecording] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function start() {
    if (disabled || recording) return;
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
    <button
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      style={{
        padding: "16px 24px",
        fontSize: 16,
        background: recording ? "#c00" : "#333",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
      }}
    >
      {recording ? "Recording... release to send" : "Hold to talk"}
    </button>
  );
}
