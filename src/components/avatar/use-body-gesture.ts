import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { VRM } from "@pixiv/three-vrm";
import { VRMHumanBoneName } from "@pixiv/three-vrm";

const LERP_SPEED = 2.5; // per second, higher = snappier band transitions

// three-vrm's *normalized* humanoid bones rest at T-pose (rotation 0 == arms
// straight out) regardless of the source model's raw bind pose — so "0" is
// never a natural stand. These bring the arms down to a relaxed at-the-sides
// baseline; every mood pose's arm values are a small *deviation* added on
// top of this rest, not an absolute angle. Exact angle is a visual-tuning
// constant — verify live and adjust if a model's proportions make it clip.
const REST_UPPER_ARM_Z = 1.3;
const REST_LOWER_ARM_Y = 0.15;

type Pose = {
  chestLean: number; // added on top of idle's breathing sway (radians)
  headTurn: number;
  headTilt: number;
  upperArmIn: number; // both arms rotate inward toward this (radians)
  lowerArmBend: number;
};

const COLD_POSE: Pose = { chestLean: -0.03, headTurn: 0.12, headTilt: 0, upperArmIn: 0.55, lowerArmBend: 1.3 };
const COOL_POSE: Pose = { chestLean: -0.015, headTurn: 0.06, headTilt: 0, upperArmIn: 0.25, lowerArmBend: 0.5 };
const NEUTRAL_POSE: Pose = { chestLean: 0, headTurn: 0, headTilt: 0, upperArmIn: 0, lowerArmBend: 0 };
const WARM_POSE: Pose = { chestLean: 0.02, headTurn: 0, headTilt: -0.05, upperArmIn: 0, lowerArmBend: 0 };
const VERY_WARM_POSE: Pose = { chestLean: 0.035, headTurn: 0, headTilt: -0.09, upperArmIn: 0, lowerArmBend: 0 };

// Same 5 bands as tone.ts's getToneDirective — kept independent rather than
// imported, since this only needs the numeric cutoffs, not the LLM prompt text.
function poseForScore(score: number): Pose {
  if (score <= 20) return COLD_POSE;
  if (score <= 40) return COOL_POSE;
  if (score <= 60) return NEUTRAL_POSE;
  if (score <= 80) return WARM_POSE;
  return VERY_WARM_POSE;
}

function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t;
}

/**
 * Mood-driven body posture (Build_plan.md Phase 7: "arms crossed, leaning
 * in, turning away"), procedural in the same style as use-idle-animation —
 * direct bone-rotation writes, no animation clip assets. Must run its
 * useFrame callback AFTER useIdleAnimation's (call order in vrm-avatar.tsx
 * matters): idle fully overwrites Chest.rotation.x each frame for the
 * breathing sway, this hook then *adds* its lean on top of that same frame's
 * value rather than overwriting it, so the two effects combine instead of
 * one canceling the other.
 */
export function useBodyGesture(
  vrm: VRM | null,
  interestScore: number | null,
  gestureIntensity = 1
) {
  const current = useRef<Pose>({ ...NEUTRAL_POSE });

  useFrame((_, delta) => {
    if (!vrm || interestScore === null) return;
    const raw = poseForScore(interestScore);
    // Rest baseline (REST_UPPER_ARM_Z/Y) stays constant per Claude.md's
    // shared "natural stand" — only how far a mood pulls *away* from it
    // scales with the character's gesture intensity.
    const target: Pose = {
      chestLean: raw.chestLean * gestureIntensity,
      headTurn: raw.headTurn * gestureIntensity,
      headTilt: raw.headTilt * gestureIntensity,
      upperArmIn: raw.upperArmIn * gestureIntensity,
      lowerArmBend: raw.lowerArmBend * gestureIntensity,
    };
    const t = Math.min(1, LERP_SPEED * delta);
    current.current.chestLean = lerp(current.current.chestLean, target.chestLean, t);
    current.current.headTurn = lerp(current.current.headTurn, target.headTurn, t);
    current.current.headTilt = lerp(current.current.headTilt, target.headTilt, t);
    current.current.upperArmIn = lerp(current.current.upperArmIn, target.upperArmIn, t);
    current.current.lowerArmBend = lerp(current.current.lowerArmBend, target.lowerArmBend, t);

    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    const chest = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest);
    if (chest) chest.rotation.x += current.current.chestLean;

    const head = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
    if (head) {
      head.rotation.y = current.current.headTurn;
      head.rotation.z = current.current.headTilt;
    }

    const leftUpperArm = humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
    if (leftUpperArm) leftUpperArm.rotation.z = REST_UPPER_ARM_Z + current.current.upperArmIn;
    const rightUpperArm = humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
    if (rightUpperArm) rightUpperArm.rotation.z = -REST_UPPER_ARM_Z - current.current.upperArmIn;

    const leftLowerArm = humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm);
    if (leftLowerArm) leftLowerArm.rotation.y = REST_LOWER_ARM_Y + current.current.lowerArmBend;
    const rightLowerArm = humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm);
    if (rightLowerArm) rightLowerArm.rotation.y = -REST_LOWER_ARM_Y - current.current.lowerArmBend;
  });
}
