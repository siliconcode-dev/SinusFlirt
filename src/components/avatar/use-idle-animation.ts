import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { VRM } from "@pixiv/three-vrm";
import { VRMHumanBoneName } from "@pixiv/three-vrm";

const BLINK_MIN_INTERVAL = 2;
const BLINK_MAX_INTERVAL = 6;
const BLINK_DURATION = 0.15; // seconds, full close-and-open

function nextBlinkDelay() {
  return BLINK_MIN_INTERVAL + Math.random() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL);
}

/**
 * Runs continuously regardless of speaking state: a subtle breathing sway on
 * the chest bone, and randomized blinking. Layers underneath lip sync, which
 * only touches the "aa" viseme.
 */
export function useIdleAnimation(vrm: VRM | null) {
  const clock = useRef(0);
  const nextBlinkAt = useRef(nextBlinkDelay());
  const blinkElapsed = useRef<number | null>(null);

  useFrame((_, delta) => {
    if (!vrm) return;
    clock.current += delta;

    const chest = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Chest);
    if (chest) {
      chest.rotation.x = Math.sin(clock.current * 1.2) * 0.015;
    }

    if (blinkElapsed.current === null) {
      if (clock.current >= nextBlinkAt.current) {
        blinkElapsed.current = 0;
      }
    } else {
      blinkElapsed.current += delta;
      const t = blinkElapsed.current / BLINK_DURATION;
      // Triangle wave: 0 -> 1 (closed) -> 0 over the blink window.
      const weight = t >= 1 ? 0 : 1 - Math.abs(t * 2 - 1);
      vrm.expressionManager?.setValue("blink", weight);

      if (t >= 1) {
        blinkElapsed.current = null;
        nextBlinkAt.current = clock.current + nextBlinkDelay();
      }
    }
  });
}
