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

function playOnElement(audio: HTMLAudioElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio playback failed"));
    audio.src = url;
    void audio.play().catch(reject);
  });
}

/**
 * Since Orpheus's 200-char cap forces multiple sequential TTS calls per
 * reply, this prefetches chunk i+1's audio while chunk i is still playing —
 * so playback reads as one continuous voice instead of gapped clips.
 *
 * Takes a caller-provided `<audio>` element (reused across every chunk of a
 * turn, `.src` swapped each time) rather than creating one per chunk — this
 * is what lets Phase 3's lip-sync analyser stay connected to one stable
 * `MediaElementAudioSourceNode` for a whole reply instead of rewiring per
 * chunk (a media element can only ever be attached to one such node).
 */
export async function playChunksSequentially(
  audio: HTMLAudioElement,
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

    const previousUrl = audio.src;
    await playOnElement(audio, url);
    if (previousUrl.startsWith("blob:")) URL.revokeObjectURL(previousUrl);
  }

  if (audio.src.startsWith("blob:")) URL.revokeObjectURL(audio.src);
}
