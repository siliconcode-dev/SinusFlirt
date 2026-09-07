"use client";

import { useState } from "react";
import { MoreVertical, LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// Persistent leave/reset control (Masterdoc §6: "always on screen").
export function LeaveResetMenu({
  onEndConversation,
  onReset,
}: {
  onEndConversation: () => void;
  onReset: () => Promise<void> | void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleConfirmReset() {
    setResetting(true);
    try {
      await onReset();
      setConfirmOpen(false);
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Conversation options"
            className="size-11 rounded-full"
          >
            <MoreVertical />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <Button
            variant="ghost"
            className="h-auto justify-start gap-2.5 py-2.5"
            onClick={() => {
              onEndConversation();
              setMenuOpen(false);
            }}
          >
            <LogOut className="size-4" />
            <span className="flex flex-col items-start">
              <span>End conversation</span>
              <span className="text-xs font-normal text-muted-foreground">
                Clears the chat log, she remembers everything
              </span>
            </span>
          </Button>
          <Button
            variant="ghost"
            className="h-auto justify-start gap-2.5 py-2.5 text-destructive hover:text-destructive"
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
          >
            <RotateCcw className="size-4" />
            <span className="flex flex-col items-start">
              <span>Restart relationship fresh</span>
              <span className="text-xs font-normal text-muted-foreground">
                Starts over completely, possibly with someone new
              </span>
            </span>
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart the relationship?</DialogTitle>
            <DialogDescription>
              This permanently erases her interest score and everything she
              remembers about you, then randomly assigns a new companion —
              which may or may not be the same one. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={resetting}
            >
              {resetting ? "Restarting..." : "Yes, restart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
