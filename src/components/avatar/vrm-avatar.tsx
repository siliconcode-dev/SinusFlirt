"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { useIdleAnimation } from "./use-idle-animation";
import { useBodyGesture } from "./use-body-gesture";
import { useIdleFidget } from "./use-idle-fidget";
import { useSpeakingGesture } from "./use-speaking-gesture";
import { useListeningGesture } from "./use-listening-gesture";
import { useLipSync } from "./use-lip-sync";

export function VrmAvatar({
  url,
  audio,
  audioContext,
  interestScore = null,
  gestureIntensity = 1,
  isPlayerSpeaking = false,
  onStatusChange,
}: {
  url: string;
  audio: HTMLAudioElement | null;
  audioContext: AudioContext | null;
  interestScore?: number | null;
  gestureIntensity?: number;
  isPlayerSpeaking?: boolean;
  onStatusChange?: (status: "loading" | "loaded" | "error") => void;
}) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const vrmRef = useRef<VRM | null>(null);

  useEffect(() => {
    let cancelled = false;
    onStatusChange?.("loading");

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      url,
      (gltf) => {
        if (cancelled) return;
        const loadedVrm = gltf.userData.vrm as VRM;
        VRMUtils.rotateVRM0(loadedVrm); // no-op for VRM1 models, fixes VRM0 facing direction
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        vrmRef.current = loadedVrm;
        setVrm(loadedVrm);
        onStatusChange?.("loaded");
      },
      undefined,
      () => {
        if (cancelled) return;
        onStatusChange?.("error");
      }
    );

    return () => {
      cancelled = true;
      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
        setVrm(null);
      }
    };
  }, [url, onStatusChange]);

  // Call order matters: each hook below is additive on top of the previous
  // frame's writes from the ones before it (see each hook's own comment).
  useIdleAnimation(vrm);
  useBodyGesture(vrm, interestScore, gestureIntensity);
  useIdleFidget(vrm, gestureIntensity);
  useSpeakingGesture(vrm, audio, gestureIntensity);
  useListeningGesture(vrm, isPlayerSpeaking, gestureIntensity);
  useLipSync(vrm, audio, audioContext);

  useFrame((_, delta) => {
    vrm?.update(delta);
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}
