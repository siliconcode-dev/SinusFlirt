"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { useIdleAnimation } from "./use-idle-animation";
import { useBodyGesture } from "./use-body-gesture";
import { useLipSync } from "./use-lip-sync";

export function VrmAvatar({
  url,
  audio,
  interestScore = null,
  onStatusChange,
}: {
  url: string;
  audio: HTMLAudioElement | null;
  interestScore?: number | null;
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

  useIdleAnimation(vrm);
  useBodyGesture(vrm, interestScore);
  useLipSync(vrm, audio);

  useFrame((_, delta) => {
    vrm?.update(delta);
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}
