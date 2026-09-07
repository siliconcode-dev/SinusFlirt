const RETRY_DELAY_MS = 1500;

// "Quick silent reconnect" (Masterdoc §10/§6): one silent retry on a
// network-level failure (fetch itself throwing — offline, DNS, dropped
// connection) before escalating to the interruption system. Does not retry
// on a normal HTTP error response (4xx/5xx) — those already carry a
// classified error body the caller handles directly.
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn("[with-retry] network-level failure, retrying once:", error);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return fn();
  }
}
