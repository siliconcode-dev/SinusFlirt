import { animate } from "animejs";

/**
 * Shared entrance motion for panels/overlays appearing on screen (the
 * interruption overlay, save-progress prompt, etc.) — Anime.js v4 owns
 * DOM/UI motion per Claude.md's stack split (VRM skeletal animation stays
 * on three-vrm/procedural bone manipulation, never this).
 */
export function animateEntrance(el: Element | null) {
  if (!el) return;
  animate(el, {
    opacity: [0, 1],
    translateY: [16, 0],
    duration: 420,
    ease: "outQuad",
  });
}
