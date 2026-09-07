import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { VRM } from "@pixiv/three-vrm";
import { VRMHumanBoneName } from "@pixiv/three-vrm";

const NOD_PERIOD_S = 1.8;
const LERP_SPEED = 4;

/**
 * Subtle attentive head-nod while the player is actively speaking (push-to-
 * talk held, or open-mic VAD detects speech) — Head.rotation.x is otherwise
 * untouched by every other gesture hook, so this owns it exclusively.
 * Additive, order doesn't matter relative to the arm-focused hooks.
 */
export function useListeningGesture(
  vrm: VRM | null,
  isPlayerSpeaking: boolean,
  gestureIntensity = 1
) {
  const envelope = useRef(0);
  const clock = useRef(0);

  useFrame((_, delta) => {
    if (!vrm) return;
    clock.current += delta;
    envelope.current +=
      ((isPlayerSpeaking ? 1 : 0) - envelope.current) * Math.min(1, LERP_SPEED * delta);
    if (envelope.current < 0.001) return;

    const head = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head);
    if (!head) return;

    // Head.x is owned exclusively by this hook (nothing upstream resets it
    // each frame) — must be an absolute assignment, not +=, or it
    // accumulates without bound for as long as the player keeps talking.
    const wave = Math.sin((clock.current / NOD_PERIOD_S) * Math.PI * 2);
    // Biased toward the forward nod rather than symmetric, reads as "mm-hm"
    // rather than a head-shake.
    head.rotation.x = (wave * 0.5 + 0.5) * 0.06 * envelope.current * gestureIntensity;
  });
}
