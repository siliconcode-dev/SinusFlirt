export type ChunkTiming = { text: string; ms: number };

async function fetchChunkAudio(text: string): Promise<{ url: string; ms: number }> {
  const start = performance.now();
  const res = await fetch("/api/voice/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("TTS request failed");
  const blob = await res.blob();
  const ms = Math.round(performance.now() - start);
  return { url: URL.createObjectURL(blob), ms };
}

function playAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio playback failed"));
    void audio.play().catch(reject);
  });
}

/**
 * Since Orpheus's 200-char cap forces multiple sequential TTS calls per
 * reply, this prefetches chunk i+1's audio while chunk i is still playing —
 * so playback reads as one continuous voice instead of gapped clips.
 */
export async function playChunksSequentially(
  chunks: string[],
  onChunkTiming: (timing: ChunkTiming) => void
): Promise<void> {
  if (chunks.length === 0) return;

  let nextPromise = fetchChunkAudio(chunks[0]);

  for (let i = 0; i < chunks.length; i++) {
    const { url, ms } = await nextPromise;
    onChunkTiming({ text: chunks[i], ms });

    if (i + 1 < chunks.length) {
      nextPromise = fetchChunkAudio(chunks[i + 1]);
    }

    await playAudio(url);
    URL.revokeObjectURL(url);
  }
}
