"use client";

import { Canvas } from "@react-three/fiber";
import { VrmAvatar } from "./vrm-avatar";

const MODEL_URL = "/models/aiko.vrm";

export function AvatarCanvas({
  audio,
  onStatusChange,
}: {
  audio: HTMLAudioElement | null;
  onStatusChange?: (status: "loading" | "loaded" | "error") => void;
}) {
  return (
    <Canvas
      gl={{ alpha: true }}
      camera={{ position: [0, 1.4, 1.6], fov: 30 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.3, 0)}
    >
      {/* Bright, convention-anime three-point rig (Masterdoc §7) — soft, no
          harsh shadows, warm key + cool rim to echo the app's rose/blue palette. */}
      <ambientLight intensity={0.7} color="#fff1f2" />
      <directionalLight position={[1.2, 2, 1.5]} intensity={1.4} color="#fff5f0" />
      <directionalLight position={[-1.5, 1, 0.5]} intensity={0.5} color="#eef2ff" />
      <directionalLight position={[0, 1.6, -1.8]} intensity={0.6} color="#93c5fd" />

      <VrmAvatar url={MODEL_URL} audio={audio} onStatusChange={onStatusChange} />
    </Canvas>
  );
}
