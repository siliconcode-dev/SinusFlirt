"use client";

import { GoogleSignInButton } from "@/components/google-sign-in-button";

type SaveProgressPromptProps = {
  characterName: string;
  onDismiss: () => void;
};

// Phase 5: contextual "save your progress?" moment (Masterdoc §11: "offered
// contextually when the user tries to leave — not required upfront"). Plain
// dev chrome, bottom-anchored so it never blocks the avatar/conversation.
export function SaveProgressPrompt({
  characterName,
  onDismiss,
}: SaveProgressPromptProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        width: "min(92vw, 420px)",
        background: "#1a0e12",
        border: "1px solid #442833",
        borderRadius: 8,
        padding: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        fontFamily: "monospace",
        color: "#fecdd3",
        zIndex: 50,
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 44,
          height: 44,
          background: "transparent",
          border: "none",
          color: "#fecdd3",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        ×
      </button>
      <p style={{ margin: "0 32px 12px 0", fontSize: 13 }}>
        Keep talking to {characterName} later? Sign in with Google to save
        your progress — otherwise it&apos;s gone in 48 hours.
      </p>
      <GoogleSignInButton />
    </div>
  );
}
