import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { VRM } from "@pixiv/three-vrm";
import { VRMHumanBoneName } from "@pixiv/three-vrm";

const WEIGHT_SHIFT_PERIOD_S = 5.5;
const WEIGHT_SHIFT_AMPLITUDE = 0.025;

const FIDGET_MIN_INTERVAL = 6;
const FIDGET_MAX_INTERVAL = 14;
const FIDGET_DURATION_S = 2.2;
// Fraction of FIDGET_DURATION_S spent easing in before holding/easing out —
// a simple in-hold-out shape, not a physical simulation.
const FIDGET_EASE_FRACTION = 0.35;

function nextFidgetDelay(intensity: number) {
  // More expressive characters fidget more often, not just bigger.
  const scale = 1 / Math.max(0.4, intensity);
  return (FIDGET_MIN_INTERVAL + Math.random() * (FIDGET_MAX_INTERVAL - FIDGET_MIN_INTERVAL)) * scale;
}

/**
 * Small randomized life during idle stretches — a weight shift always
 * running plus an occasional "hand toward hair" fidget on the right arm —
 * so she never looks frozen at neutral mood between reactions. Additive on
 * top of useIdleAnimation/useBodyGesture (must run after both — see
 * vrm-avatar.tsx call order). Scaled by the character's gestureIntensity
 * (Phase 8 polish: personality-flavored, not identical across the roster).
 */
export function useIdleFidget(vrm: VRM | null, gestureIntensity = 1) {
  const clock = useRef(0);
  const nextFidgetAt = useRef(nextFidgetDelay(gestureIntensity));
  const fidgetElapsed = useRef<number | null>(null);

  useFrame((_, delta) => {
    if (!vrm) return;
    clock.current += delta;

    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    // Chest.z and (below) UpperArm.x are owned exclusively by this hook —
    // nothing upstream resets them each frame, so these MUST be absolute
    // assignments. Using += here previously accumulated the sine value
    // every single frame with no baseline reset — not bounded oscillation,
    // genuine unbounded drift (the "spinning arms" bug).
    const chest = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest);
    if (chest) {
      chest.rotation.z =
        Math.sin((clock.current / WEIGHT_SHIFT_PERIOD_S) * Math.PI * 2) *
        WEIGHT_SHIFT_AMPLITUDE *
        gestureIntensity;
    }

    if (fidgetElapsed.current === null) {
      if (clock.current >= nextFidgetAt.current) {
        fidgetElapsed.current = 0;
      }
      return;
    }

    fidgetElapsed.current += delta;
    const t = fidgetElapsed.current / FIDGET_DURATION_S;
    if (t >= 1) {
      fidgetElapsed.current = null;
      nextFidgetAt.current = clock.current + nextFidgetDelay(gestureIntensity);
      return;
    }

    // Triangle-ish envelope: ease in, brief hold, ease out.
    const envelope =
      t < FIDGET_EASE_FRACTION
        ? t / FIDGET_EASE_FRACTION
        : t > 1 - FIDGET_EASE_FRACTION
          ? (1 - t) / FIDGET_EASE_FRACTION
          : 1;

    const rightUpperArm = humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
    if (rightUpperArm) rightUpperArm.rotation.x = -envelope * 0.5 * gestureIntensity;
    // RightLowerArm.y IS reset fresh every frame by useBodyGesture (which
    // runs before this hook) — additive here is safe, not an accumulator.
    const rightLowerArm = humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm);
    if (rightLowerArm) rightLowerArm.rotation.y -= envelope * 0.6 * gestureIntensity;

    const head = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
    if (head) head.rotation.z += envelope * 0.05 * gestureIntensity;
  });
}
