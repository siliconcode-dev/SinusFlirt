import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROSTER, FREE_SLUGS } from "./roster";
import type { Character } from "./types";

export type AssignedCharacter = {
  character: Character;
  interestScore: number;
  memorySummary: string | null;
};

/**
 * Resolves the current account's permanently-assigned free-tier character
 * (Masterdoc §5.1: "randomly assigned once per account, then fixed").
 * Lazy-assigns on first call if no assignment exists yet — this covers
 * every account created during Phases 1-3 testing, before this system
 * existed, with no backfill migration needed.
 */
export async function getAssignedCharacter(
  supabase: SupabaseClient,
  accountId: string
): Promise<AssignedCharacter | null> {
  const { data: existing } = await supabase
    .from("relationship_state")
    .select("interest_score, memory_summary, characters(slug)")
    .eq("account_id", accountId)
    .eq("is_permanent", true)
    .maybeSingle<{
      interest_score: number;
      memory_summary: string | null;
      characters: { slug: string };
    }>();

  if (existing) {
    const character = ROSTER[existing.characters.slug];
    if (!character) return null;
    return {
      character,
      interestScore: existing.interest_score,
      memorySummary: existing.memory_summary,
    };
  }

  return assignRandomCharacter(supabase, accountId);
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
  return { character, interestScore: 50, memorySummary: null };
}

export { FREE_SLUGS };
