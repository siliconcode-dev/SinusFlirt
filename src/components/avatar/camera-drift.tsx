"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { animate } from "animejs";
import "animejs/adapters/three";

/**
 * Subtle idle camera drift — Anime.js v4 (via its Three.js adapter) owns
 * this, kept separate from the VRM's own procedural skeletal animation
 * (use-idle-animation.ts/use-body-gesture.ts), per Claude.md's explicit
 * split between the two animation systems.
 */
export function CameraDrift() {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const baseY = camera.position.y;
    const anim = animate(camera, {
      y: baseY + 0.025,
      duration: 4200,
      loop: true,
      alternate: true,
      ease: "inOutSine",
    });
    return () => {
      anim.pause();
      camera.position.y = baseY;
    };
  }, [camera]);

  return null;
}
