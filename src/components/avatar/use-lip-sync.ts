import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { VRM } from "@pixiv/three-vrm";

const SMOOTHING = 0.35; // lower = smoother/slower response

/**
 * Orpheus returns no phoneme/timing data (confirmed Phase 2), so there's no
 * source for true viseme-accurate lip sync. This drives the "aa" viseme
 * proportionally to the currently-playing audio's real-time volume (RMS) —
 * reads as "she's talking," not claiming phoneme accuracy.
 */
export function useLipSync(vrm: VRM | null, audio: HTMLAudioElement | null) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const smoothedRef = useRef(0);

  useEffect(() => {
    if (!audio) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const context = new AudioContextCtor();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(context.destination);

    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    return () => {
      analyser.disconnect();
      source.disconnect();
      void context.close();
      analyserRef.current = null;
      dataRef.current = null;
    };
  }, [audio]);

  useFrame(() => {
    if (!vrm) return;
    const analyser = analyserRef.current;
    const data = dataRef.current;

    let target = 0;
    if (analyser && data) {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      target = Math.min(1, rms * 4); // amplify — raw RMS reads very quiet
    }

    smoothedRef.current += (target - smoothedRef.current) * SMOOTHING;
    vrm.expressionManager?.setValue("aa", smoothedRef.current);
  });
}
