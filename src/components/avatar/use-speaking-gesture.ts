import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { VRM } from "@pixiv/three-vrm";
import { VRMHumanBoneName } from "@pixiv/three-vrm";

const GESTURE_PERIOD_S = 1.4;
const LERP_SPEED = 4; // fade the gesture envelope in/out, not a hard cut

/**
 * Small conversational hand movement (left arm) while she's actually
 * talking — derives "speaking" from the same <audio> element the TTS
 * playback already uses (play/pause/ended), no extra plumbing needed.
 * Additive, runs after useBodyGesture/useIdleFidget (see vrm-avatar.tsx).
 */
export function useSpeakingGesture(
  vrm: VRM | null,
  audio: HTMLAudioElement | null,
  gestureIntensity = 1
) {
  const [speaking, setSpeaking] = useState(false);
  const envelope = useRef(0);
  const clock = useRef(0);

  useEffect(() => {
    if (!audio) return;
    const onPlay = () => setSpeaking(true);
    const onStop = () => setSpeaking(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
    };
  }, [audio]);

  useFrame((_, delta) => {
    if (!vrm) return;
    clock.current += delta;
    envelope.current +=
      ((speaking ? 1 : 0) - envelope.current) * Math.min(1, LERP_SPEED * delta);
    if (envelope.current < 0.001) return;

    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    // Both axes are owned exclusively by this hook (nothing upstream resets
    // LeftUpperArm.x or LeftLowerArm.z each frame) — must be absolute
    // assignments, not +=/-=, or the rotation accumulates without bound
    // for as long as she keeps talking.
    const wave = Math.sin((clock.current / GESTURE_PERIOD_S) * Math.PI * 2);
    const leftUpperArm = humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
    if (leftUpperArm) leftUpperArm.rotation.x = -wave * 0.12 * envelope.current * gestureIntensity;
    const leftLowerArm = humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm);
    if (leftLowerArm) leftLowerArm.rotation.z = -wave * 0.18 * envelope.current * gestureIntensity;
  });
}
