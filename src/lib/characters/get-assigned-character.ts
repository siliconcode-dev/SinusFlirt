import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROSTER, FREE_SLUGS } from "./roster";
import type { Character } from "./types";

export type AssignedCharacter = {
  character: Character;
  characterId: string;
  interestScore: number;
  memorySummary: string | null;
  /** Set when the active character is a Phase 7 ad-unlock, not the
   * permanent free companion — null otherwise. */
  premiumUnlockExpiresAt: string | null;
};

/**
 * Resolves the account's currently-active character: an unexpired Phase 7
 * premium unlock takes priority (Masterdoc §8 — while unlocked, she's who
 * the player talks to), otherwise falls back to the permanently-assigned
 * free-tier character (Masterdoc §5.1: "randomly assigned once per account,
 * then fixed"). Lazy-assigns the free character on first call if no
 * assignment exists yet.
 */
export async function getAssignedCharacter(
  supabase: SupabaseClient,
  accountId: string
): Promise<AssignedCharacter | null> {
  const activeUnlock = await getActivePremiumUnlock(supabase, accountId);
  if (activeUnlock) return activeUnlock;

  const { data: existing } = await supabase
    .from("relationship_state")
    .select("character_id, interest_score, memory_summary, characters(slug)")
    .eq("account_id", accountId)
    .eq("is_permanent", true)
    .maybeSingle<{
      character_id: string;
      interest_score: number;
      memory_summary: string | null;
      characters: { slug: string };
    }>();

  if (existing) {
    const character = ROSTER[existing.characters.slug];
    if (!character) return null;
    return {
      character,
      characterId: existing.character_id,
      interestScore: existing.interest_score,
      memorySummary: existing.memory_summary,
      premiumUnlockExpiresAt: null,
    };
  }

  return assignRandomCharacter(supabase, accountId);
}

async function getActivePremiumUnlock(
  supabase: SupabaseClient,
  accountId: string
): Promise<AssignedCharacter | null> {
  const { data: unlock } = await supabase
    .from("premium_unlocks")
    .select("character_id, expires_at, characters(slug)")
    .eq("account_id", accountId)
    .gt("expires_at", new Date().toISOString())
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ character_id: string; expires_at: string; characters: { slug: string } }>();

  if (!unlock) return null;

  const character = ROSTER[unlock.characters.slug];
  if (!character) return null;

  const { data: state } = await supabase
    .from("relationship_state")
    .select("interest_score, memory_summary")
    .eq("account_id", accountId)
    .eq("character_id", unlock.character_id)
    .maybeSingle<{ interest_score: number; memory_summary: string | null }>();

  return {
    character,
    characterId: unlock.character_id,
    interestScore: state?.interest_score ?? 50,
    memorySummary: state?.memory_summary ?? null,
    premiumUnlockExpiresAt: unlock.expires_at,
  };
}

async function assignRandomCharacter(
  supabase: SupabaseClient,
  accountId: string
): Promise<AssignedCharacter | null> {
  const { data: freeCharacters } = await supabase
    .from("characters")
    .select("id, slug")
    .eq("tier", "free");

  if (!freeCharacters || freeCharacters.length === 0) return null;

  const pick =
    freeCharacters[Math.floor(Math.random() * freeCharacters.length)];

  const { error: insertError } = await supabase
    .from("relationship_state")
    .insert({
      account_id: accountId,
      character_id: pick.id,
      is_permanent: true,
    });

  if (insertError) {
    // 23505 = unique_violation: another concurrent request won the race and
    // already assigned this account's permanent character. Re-fetch theirs
    // instead of erroring.
    if (insertError.code === "23505") {
      return getAssignedCharacter(supabase, accountId);
    }
    console.error("[get-assigned-character] insert failed:", insertError);
    return null;
  }

  const character = ROSTER[pick.slug];
  if (!character) return null;
  return {
    character,
    characterId: pick.id,
    interestScore: 50,
    memorySummary: null,
    premiumUnlockExpiresAt: null,
  };
}

export { FREE_SLUGS };
