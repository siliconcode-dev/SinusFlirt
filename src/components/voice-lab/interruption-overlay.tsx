"use client";

import { AmbientBackground } from "@/components/ambient-background";
import { BezelCard } from "@/components/bezel-card";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { CAP_LINE, OUTAGE_LINE, USAGE_CAP_LINE } from "@/lib/characters/interruption-lines";

export type InterruptionKind = "cap" | "outage" | "usage-cap";

const TITLES: Record<InterruptionKind, string> = {
  cap: "She needs a moment",
  outage: "Connection slipped",
  "usage-cap": "She needs rest",
};

const LINES: Record<InterruptionKind, string> = {
  cap: CAP_LINE,
  outage: OUTAGE_LINE,
  "usage-cap": USAGE_CAP_LINE,
};

// Shared "cinematic interruption" system (Build_plan.md Phase 6: "one
// system, three triggers, not three separate UI states"), extended in
// Phase 7 with a fourth kind ("usage-cap", the free-tier daily limit — her
// limit, not Groq's) that additionally offers the ad-unlock option. The
// original moderation trigger stays lighter-weight and handled inline as a
// swapped sentence in /api/voice/chat, not here.
export function InterruptionOverlay({
  kind,
  onRetry,
  onUnlock,
  isAnonymous,
}: {
  kind: InterruptionKind;
  onRetry: () => void;
  onUnlock?: () => void;
  isAnonymous?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 py-16">
      <AmbientBackground />
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <BezelCard>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
            {TITLES[kind]}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{LINES[kind]}</p>
          {kind === "usage-cap" ? (
            <div className="mt-6 flex flex-col items-center gap-3">
              {isAnonymous ? (
                <GoogleSignInButton />
              ) : (
                <Button onClick={onUnlock}>Watch an ad to unlock more time</Button>
              )}
              <Button variant="outline" onClick={onRetry}>
                Try again later
              </Button>
            </div>
          ) : (
            <Button className="mt-6" onClick={onRetry}>
              Try again
            </Button>
          )}
        </BezelCard>
      </div>
    </div>
  );
}
