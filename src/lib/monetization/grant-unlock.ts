import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROSTER } from "@/lib/characters/roster";
import type { Character } from "@/lib/characters/types";

// Tune later — Masterdoc §8: "minutes/hours/days, exact number TBD in build."
const UNLOCK_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export type GrantedUnlock = {
  character: Character;
  expiresAt: string;
};

/**
 * Watching an ad randomly assigns one of the 5 premium characters for the
 * unlock window (Masterdoc §8, Claude.md rule #6 — never user-picked from a
 * roster). Reuses an existing non-permanent relationship_state row for that
 * character if a previous unlock already created one, so her interest score
 * and memory persist across separate unlock windows instead of resetting.
 */
export async function grantUnlock(
  supabase: SupabaseClient,
  accountId: string
): Promise<GrantedUnlock | null> {
  const { data: premiumCharacters } = await supabase
    .from("characters")
    .select("id, slug")
    .eq("tier", "premium");

  if (!premiumCharacters || premiumCharacters.length === 0) return null;

  const pick =
    premiumCharacters[Math.floor(Math.random() * premiumCharacters.length)];
  const character = ROSTER[pick.slug];
  if (!character) return null;

  const { error: insertError } = await supabase
    .from("relationship_state")
    .insert({ account_id: accountId, character_id: pick.id, is_permanent: false });

  // 23505 = unique_violation: this account already has a relationship_state
  // row for this character from a prior unlock — fine, reuse it as-is.
  if (insertError && insertError.code !== "23505") {
    console.error("[grant-unlock] failed to ensure relationship_state row:", insertError);
    return null;
  }

  const expiresAt = new Date(Date.now() + UNLOCK_DURATION_MS).toISOString();
  const { error: unlockError } = await supabase.from("premium_unlocks").insert({
    account_id: accountId,
    character_id: pick.id,
    expires_at: expiresAt,
  });

  if (unlockError) {
    console.error("[grant-unlock] failed to insert unlock:", unlockError);
    return null;
  }

  return { character, expiresAt };
}
