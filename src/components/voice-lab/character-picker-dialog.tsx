"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ROSTER, FREE_SLUGS, PREMIUM_SLUGS } from "@/lib/characters/roster";
import { cn } from "cn";

// Project-owner-directed override of the default random-only assignment
// (Claude.md rule 6 normally forbids a pick-from-roster screen) — free tier
// only, explicitly confirmed. Premium stays random-grant-only (Phase 7),
// shown here as a locked preview rather than selectable.
export function CharacterPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (slug: string) => Promise<void> | void;
}) {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleClose(next: boolean) {
    if (!next) setPendingSlug(null);
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!pendingSlug) return;
    setSubmitting(true);
    try {
      await onSelect(pendingSlug);
      handleClose(false);
    } finally {
      setSubmitting(false);
    }
  }

  const pending = pendingSlug ? ROSTER[pendingSlug] : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {pending ? (
          <>
            <DialogHeader>
              <DialogTitle>Start over with {pending.name}?</DialogTitle>
              <DialogDescription>
                This permanently erases your current companion&apos;s interest
                score and memory, then begins fresh with {pending.name}
                instead. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingSlug(null)}
                disabled={submitting}
              >
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? "Starting..." : `Yes, meet ${pending.name}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Choose a companion</DialogTitle>
              <DialogDescription>
                Picking someone new starts that relationship at zero — your
                current companion&apos;s progress is lost.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {FREE_SLUGS.map((slug) => {
                const character = ROSTER[slug];
                if (!character) return null;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setPendingSlug(slug)}
                    className="flex flex-col items-start gap-1 rounded-xl bg-card p-3 text-left ring-1 ring-foreground/10 transition-transform duration-200 ease-out hover:ring-primary/40 active:scale-[0.98]"
                  >
                    <span className="font-heading text-sm font-medium text-foreground">
                      {character.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {character.tagline}
                    </span>
                  </button>
                );
              })}
              {PREMIUM_SLUGS.map((slug) => {
                const character = ROSTER[slug];
                if (!character) return null;
                return (
                  <div
                    key={slug}
                    className={cn(
                      "relative flex flex-col items-start gap-1 rounded-xl bg-card p-3 text-left opacity-50 ring-1 ring-foreground/10"
                    )}
                  >
                    <Lock className="absolute top-2 right-2 size-3.5 text-muted-foreground" />
                    <span className="font-heading text-sm font-medium text-foreground">
                      {character.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Unlocked randomly during a conversation
                    </span>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
