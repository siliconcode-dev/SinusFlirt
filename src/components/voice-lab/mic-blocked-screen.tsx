import { AmbientBackground } from "@/components/ambient-background";
import { BezelCard } from "@/components/bezel-card";

// Masterdoc §6: "Mic permission denied → block entry entirely with an
// explanation screen (no text-chat fallback)." Same visual language as
// /blocked (the age-gate block) since both are hard, non-bypassable stops.
export function MicBlockedScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 py-16">
      <AmbientBackground />
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <BezelCard>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
            Microphone access needed
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This is a voice-only experience — there&apos;s no text-chat
            fallback. Grant microphone access in your browser&apos;s site
            settings, then reload this page to continue.
          </p>
        </BezelCard>
      </div>
    </div>
  );
}
