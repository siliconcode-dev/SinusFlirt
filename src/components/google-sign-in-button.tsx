"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/google-icon";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // An anonymous user upgrades in place via linkIdentity (same auth.uid(),
    // so their relationship/interest data carries over automatically).
    // A user with no session at all falls back to a normal OAuth sign-in.
    const { error: authError } = user?.is_anonymous
      ? await supabase.auth.linkIdentity({
          provider: "google",
          options: { redirectTo },
        })
      : await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={loading}
        className="gap-2 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
      >
        <GoogleIcon className="size-4" />
        {loading ? "Redirecting..." : "Sign in with Google to save progress"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
