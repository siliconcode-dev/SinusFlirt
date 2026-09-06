import "server-only";
import Groq from "groq-sdk";

export const GROQ_MODELS = {
  stt: "whisper-large-v3-turbo",
  chat: "openai/gpt-oss-120b",
  tts: "canopylabs/orpheus-v1-english",
} as const;

// Same Groq account/tier, multiple keys issued for regional-fallback
// purposes (pre-access accounts occasionally have regional outages/
// maintenance). This is NOT multi-account rotation to evade rate limits —
// per Claude.md that's still forbidden — it's failover between keys that
// all share the exact same quota. 429 (rate limit) is deliberately NOT
// retried here: since every key draws from the same account-wide limit,
// trying another key on a 429 wouldn't help and would just waste a call.
const API_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
].filter((key): key is string => Boolean(key));

const clients = API_KEYS.map((apiKey) => new Groq({ apiKey }));

function isRetryable(error: unknown): boolean {
  if (error instanceof Groq.APIError) {
    // Same-account quota exhaustion or a malformed request — retrying with
    // a different key of the same account won't change the outcome.
    if (error.status === 429 || error.status === 400) return false;
    return true; // 5xx, 401/403 (this specific key rejected), etc.
  }
  return true; // network-level failure (fetch threw) — worth trying another key
}

/**
 * Runs `fn` against the primary Groq client, falling back to the next
 * regional key on connectivity/server-side failures only.
 */
export async function withGroqFallback<T>(
  fn: (client: Groq) => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < clients.length; i++) {
    try {
      return await fn(clients[i]);
    } catch (error) {
      lastError = error;
      const isLastKey = i === clients.length - 1;
      if (isLastKey || !isRetryable(error)) throw error;
      console.warn(
        `[groq] key #${i + 1} failed (${error instanceof Groq.APIError ? error.status : "network"}), falling back to key #${i + 2}`
      );
    }
  }

  throw lastError;
}
