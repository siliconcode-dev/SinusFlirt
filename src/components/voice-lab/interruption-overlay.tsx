"use client";

import { AmbientBackground } from "@/components/ambient-background";
import { BezelCard } from "@/components/bezel-card";
import { Button } from "@/components/ui/button";
import { CAP_LINE, OUTAGE_LINE } from "@/lib/characters/interruption-lines";

export type InterruptionKind = "cap" | "outage";

// Shared "cinematic interruption" system (Build_plan.md Phase 6: "one
// system, three triggers, not three separate UI states") for the two
// whole-conversation-blocking triggers — cap-exhausted and outage. The third
// trigger (moderation) is lighter-weight and handled inline as a swapped
// sentence in /api/voice/chat, not here.
export function InterruptionOverlay({
  kind,
  onRetry,
}: {
  kind: InterruptionKind;
  onRetry: () => void;
}) {
  const line = kind === "cap" ? CAP_LINE : OUTAGE_LINE;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 py-16">
      <AmbientBackground />
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <BezelCard>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
            {kind === "cap" ? "She needs a moment" : "Connection slipped"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{line}</p>
          <Button className="mt-6" onClick={onRetry}>
            Try again
          </Button>
        </BezelCard>
      </div>
    </div>
  );
}
