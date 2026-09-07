// Generic, personality-agnostic pool (Phase 6 plan: revisit per-character in
// Phase 8 if wanted). Never a raw error string — always in-character.
export const DEFLECTION_LINES = [
  "Mm, let's not go there — tell me something else about your day.",
  "That's not really me. What else is on your mind?",
  "Let's talk about something better than that.",
  "Hah, nice try. Ask me something real.",
  "Not my thing — what were we just talking about?",
];

export function pickDeflectionLine(): string {
  return DEFLECTION_LINES[Math.floor(Math.random() * DEFLECTION_LINES.length)];
}

export const CAP_LINE =
  "She goes quiet for a moment, like she's drifting off... looks like she needs to rest. Try again in a bit.";

export const OUTAGE_LINE =
  "The connection to her seems to have slipped for a second. She'll be right back — try again shortly.";

// Distinct from CAP_LINE — this is *her* daily limit (Phase 7's per-account
// usage cap), not Groq's account-wide one, so the copy stays in her voice
// but mentions the unlock option, unlike the Groq-cap/outage lines.
export const USAGE_CAP_LINE =
  "She's had a long day and needs some rest — come back tomorrow, or unlock more time with her right now.";
