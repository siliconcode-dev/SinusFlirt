export type Character = {
  slug: string;
  name: string;
  systemPrompt: string;
  voiceId: string;
  /** Path under /public — the avatar model rendered for this character. */
  modelUrl: string;
  /** Short one-line trait blurb shown on the character-picker card. */
  tagline: string;
  /** Scales mood/idle/speaking gesture amplitude — 1 = baseline, bigger for
   * more expressive personalities, smaller for reserved ones. */
  gestureIntensity: number;
};
