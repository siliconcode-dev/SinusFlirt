// Masterdoc §5.2: "can bottom out and end the conversation early." Recoverable,
// not a permanent lock — a reload and better conversation can climb the score
// back up (see src/lib/characters/get-assigned-character.ts).
export const EARLY_EXIT_THRESHOLD = 10;

// Masterdoc §5.2: "crossing a high threshold unlocks the kiss cutscene as
// an available action" — a button becomes available, not an automatic cut.
export const KISS_THRESHOLD = 90;

/**
 * Maps the 0-100 interest score to a short instruction appended to the
 * character's base system prompt each turn, so her warmth visibly tracks
 * the meter (Masterdoc §5.2: "gates her warmth/tone in real time").
 */
export function getToneDirective(score: number): string {
  if (score <= 20) {
    return "\n\nYour current warmth toward the player is COLD right now — he's earned distance, not affection. Keep replies short, a little clipped, noticeably less engaged than usual.";
  }
  if (score <= 40) {
    return "\n\nYour current warmth toward the player is COOL right now — guarded, a bit reserved, not unfriendly but not warm either.";
  }
  if (score <= 60) {
    return "\n\nYour current warmth toward the player is NEUTRAL right now — your normal baseline self, neither especially warm nor cool.";
  }
  if (score <= 80) {
    return "\n\nYour current warmth toward the player is WARM right now — engaged, a little more affectionate than your baseline, enjoying this.";
  }
  return "\n\nYour current warmth toward the player is VERY WARM right now — he's earned real affection from you, let that come through.";
}
