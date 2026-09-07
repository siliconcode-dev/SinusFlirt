// Fallback for Groq's whisper/orpheus specifically failing (Masterdoc §10:
// "Full outage... backed by the browser's free Web Speech API"). Never a
// substitute for the LLM itself — see Phase 6 plan for why that split makes
// sense (nothing can stand in for "her brain").

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = new () => any;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isWebSpeechSTTAvailable(): boolean {
  return getRecognitionCtor() !== null;
}

export function isWebSpeechTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Note: SpeechRecognition listens live via its own mic stream — it can't
// transcribe an already-recorded Blob. When Groq's whisper call fails, this
// re-opens the mic and asks the player to say it again, rather than
// reprocessing the blob that already failed to transcribe.
export function transcribeViaWebSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      reject(new Error("Web Speech STT not available"));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      resolve(event.results[0][0].transcript as string);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      reject(new Error(`Web Speech STT error: ${event.error}`));
    };
    recognition.start();
  });
}

export function speakViaWebSpeech(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isWebSpeechTTSAvailable()) {
      reject(new Error("Web Speech TTS not available"));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Web Speech TTS error: ${event.error}`));
    window.speechSynthesis.speak(utterance);
  });
}
