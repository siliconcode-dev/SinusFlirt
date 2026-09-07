import { splitSentences } from "./sentence-split";

const MAX_CHUNK_LENGTH = 200; // Orpheus TTS hard limit on `input` length.

// Hard-cuts a single sentence that's still too long, breaking on word
// boundaries so we never split mid-word.
function hardCut(sentence: string, maxLen: number): string[] {
  const words = sentence.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Splits LLM reply text into chunks safe for Orpheus TTS's 200-character
 * `input` limit, merging short sentences together rather than emitting one
 * chunk per sentence, so playback has as few gaps as reasonably possible.
 */
export function chunkForTTS(
  text: string,
  maxLen: number = MAX_CHUNK_LENGTH
): string[] {
  const sentences = splitSentences(text);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...hardCut(sentence, maxLen));
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > maxLen) {
      chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}
