"use client";

import { useState } from "react";
import { MoreVertical, LogOut, RotateCcw, Users } from "lucide-react";
import { CharacterPickerDialog } from "./character-picker-dialog";
import { Button } from "@/components/ui/button";
import { DotmSquare5 } from "@/components/ui/dotm-square-5";
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
  onSelectCharacter,
}: {
  onEndConversation: () => void;
  onReset: () => Promise<void> | void;
  onSelectCharacter: (slug: string) => Promise<void> | void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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
        <PopoverContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
          <Button
            variant="ghost"
            className="h-auto w-full items-start justify-start gap-2.5 py-2.5 text-left"
            onClick={() => {
              onEndConversation();
              setMenuOpen(false);
            }}
          >
            <LogOut className="mt-0.5 size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col items-start whitespace-normal">
              <span>End conversation</span>
              <span className="whitespace-normal text-xs font-normal text-muted-foreground">
                Clears the chat log, she remembers everything
              </span>
            </span>
          </Button>
          <Button
            variant="ghost"
            className="h-auto w-full items-start justify-start gap-2.5 py-2.5 text-left"
            onClick={() => {
              setMenuOpen(false);
              setPickerOpen(true);
            }}
          >
            <Users className="mt-0.5 size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col items-start whitespace-normal">
              <span>Choose a companion</span>
              <span className="whitespace-normal text-xs font-normal text-muted-foreground">
                Pick from the free roster, starts that relationship fresh
              </span>
            </span>
          </Button>
          <Button
            variant="ghost"
            className="h-auto w-full items-start justify-start gap-2.5 py-2.5 text-left text-destructive hover:text-destructive"
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
          >
            <RotateCcw className="mt-0.5 size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col items-start whitespace-normal">
              <span>Restart relationship fresh</span>
              <span className="whitespace-normal text-xs font-normal text-muted-foreground">
                Starts over completely, possibly with someone new
              </span>
            </span>
          </Button>
        </PopoverContent>
      </Popover>

      <CharacterPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={onSelectCharacter}
      />

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
              className="gap-2"
            >
              {resetting && (
                <DotmSquare5 size={16} dotSize={2} color="currentColor" ariaLabel="Restarting" />
              )}
              {resetting ? "Restarting..." : "Yes, restart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
