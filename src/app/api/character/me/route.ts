import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAssignedCharacter } from "@/lib/characters/get-assigned-character";
import { EARLY_EXIT_THRESHOLD, KISS_THRESHOLD } from "@/lib/characters/tone";
import { checkUsageCap, FREE_DAILY_CAP } from "@/lib/monetization/usage-cap";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const assigned = await getAssignedCharacter(supabase, user.id);
  if (!assigned) {
    return NextResponse.json(
      { error: "Could not resolve assigned character." },
      { status: 500 }
    );
  }

  const hasActiveUnlock = assigned.premiumUnlockExpiresAt !== null;
  const usage = await checkUsageCap(supabase, user.id, hasActiveUnlock);

  return NextResponse.json({
    name: assigned.character.name,
    slug: assigned.character.slug,
    interestScore: assigned.interestScore,
    memorySummary: assigned.memorySummary,
    ended: assigned.interestScore <= EARLY_EXIT_THRESHOLD,
    kissAvailable: assigned.interestScore >= KISS_THRESHOLD,
    premiumUnlockExpiresAt: assigned.premiumUnlockExpiresAt,
    isAnonymous: user.is_anonymous ?? false,
    usage: {
      turnsUsedToday: usage.turnsUsedToday,
      dailyCap: hasActiveUnlock ? null : FREE_DAILY_CAP,
    },
  });
}
