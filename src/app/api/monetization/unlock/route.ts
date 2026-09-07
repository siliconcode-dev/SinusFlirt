import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { grantUnlock } from "@/lib/monetization/grant-unlock";

/**
 * Dev-trigger stand-in for the real AdSense Rewarded Ad completion callback
 * (Phase 7 plan — AdSense verification is pending, Adsterra has no rewarded
 * unit). Swap the caller for a real ad SDK once verification clears; this
 * endpoint and everything behind it (grant-unlock, premium_unlocks,
 * get-assigned-character) doesn't need to change.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  // Masterdoc §8: "tracked per Google account" — anonymous accounts can be
  // swept after 48h, which would silently orphan an unlock.
  if (user.is_anonymous) {
    return NextResponse.json(
      { error: "sign-in-required" },
      { status: 403 }
    );
  }

  const granted = await grantUnlock(supabase, user.id);
  if (!granted) {
    return NextResponse.json(
      { error: "Could not grant unlock." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    name: granted.character.name,
    slug: granted.character.slug,
    expiresAt: granted.expiresAt,
  });
}
