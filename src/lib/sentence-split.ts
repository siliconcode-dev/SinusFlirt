// Splits on sentence-ending punctuation, keeping the punctuation with the
// sentence it closes. Shared by tts-chunking.ts (TTS 200-char chunking) and
// the chat route's per-sentence moderation gate — same boundary logic, one
// definition.
export function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
  return (matches ?? [text]).map((s) => s.trim()).filter(Boolean);
}
