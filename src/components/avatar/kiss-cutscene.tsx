"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, VRMHumanBoneName, type VRM } from "@pixiv/three-vrm";

const DEFAULT_HER_MODEL_URL = "/models/aiko.vrm";
const PLAYER_MODEL_URL = "/models/player.vrm"; // license-checked candidate, once picked
const SFX_URL = "/audio/kiss.mp3"; // not sourced yet — see Phase 7 plan "out of scope"
const LEAN_DURATION_S = 1.5;
const HOLD_DURATION_MS = 2500;

function useLoadVrm(url: string, onFail?: () => void): VRM | null {
  const [vrm, setVrm] = useState<VRM | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      url,
      (gltf) => {
        if (cancelled) return;
        const loaded = gltf.userData.vrm as VRM;
        VRMUtils.rotateVRM0(loaded);
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        setVrm(loaded);
      },
      undefined,
      () => {
        if (!cancelled) onFail?.();
      }
    );

    return () => {
      cancelled = true;
    };
  }, [url, onFail]);

  return vrm;
}

// Procedural placeholder — both rigs' spine/head lean toward each other over
// LEAN_DURATION_S, same bone-manipulation technique as idle/gesture (see
// Phase 7 plan: a real hand-keyframed .vrma replaces this whenever one exists).
function LeaningAvatar({ vrm, side }: { vrm: VRM | null; side: "left" | "right" }) {
  const t = useRef(0);

  useFrame((_, delta) => {
    if (!vrm) return;
    vrm.update(delta);
    t.current = Math.min(1, t.current + delta / LEAN_DURATION_S);

    const humanoid = vrm.humanoid;
    const spine = humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Spine);
    const head = humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head);
    const sign = side === "left" ? 1 : -1;
    const eased = 1 - Math.pow(1 - t.current, 3);
    if (spine) spine.rotation.y = eased * 0.35 * sign;
    if (head) head.rotation.y = eased * 0.2 * sign;
  });

  if (!vrm) return null;
  return (
    <primitive
      object={vrm.scene}
      position={side === "left" ? [-0.25, 0, 0] : [0.25, 0, 0]}
      rotation={[0, side === "left" ? -0.3 : 0.3, 0]}
    />
  );
}

export function KissCutscene({
  herModelUrl,
  reactionLine,
  onComplete,
}: {
  herModelUrl?: string | null;
  reactionLine: string;
  onComplete: () => void;
}) {
  const [playerAvailable, setPlayerAvailable] = useState(true);
  const [flash, setFlash] = useState(false);
  const herVrm = useLoadVrm(herModelUrl ?? DEFAULT_HER_MODEL_URL);
  const playerVrm = useLoadVrm(PLAYER_MODEL_URL, () => setPlayerAvailable(false));

  useEffect(() => {
    const sfx = new Audio(SFX_URL);
    const voiceAudio = new Audio();
    let flashOffTimer: ReturnType<typeof setTimeout>;

    const leanTimer = setTimeout(() => {
      setFlash(true);
      flashOffTimer = setTimeout(() => setFlash(false), 150);
      sfx.play().catch(() => {});

      fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reactionLine }),
      })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!blob) return;
          voiceAudio.src = URL.createObjectURL(blob);
          return voiceAudio.play();
        })
        .catch(() => {
          // Non-critical — the visual moment already played.
        });
    }, LEAN_DURATION_S * 1000);

    const completeTimer = setTimeout(
      onComplete,
      LEAN_DURATION_S * 1000 + HOLD_DURATION_MS
    );

    return () => {
      clearTimeout(leanTimer);
      clearTimeout(flashOffTimer);
      clearTimeout(completeTimer);
    };
  }, [reactionLine, onComplete]);

  return (
    <div className="fixed inset-0 z-[60] bg-[#1a0e12]">
      <Canvas
        camera={{ position: [0, 1.4, 1.9], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.3, 0)}
      >
        <ambientLight intensity={0.8} color="#fff1f2" />
        <directionalLight position={[1, 2, 1.5]} intensity={1.2} color="#fff5f0" />
        <LeaningAvatar vrm={herVrm} side="left" />
        {playerAvailable && <LeaningAvatar vrm={playerVrm} side="right" />}
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-700 ease-out"
        style={{
          opacity: flash ? 1 : 0,
        }}
      />
    </div>
  );
}
