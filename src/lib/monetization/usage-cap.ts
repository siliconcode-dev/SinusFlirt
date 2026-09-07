import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Free tier daily turn limit (Masterdoc §8: "higher usage caps" for
// premium implies a real free-tier limit exists to be higher than).
export const FREE_DAILY_CAP = 30;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export type UsageCapResult = { allowed: boolean; turnsUsedToday: number };

/**
 * Checks (does not increment) whether the account can take another turn
 * today. An active premium unlock always allows — see grant-unlock.ts.
 * Single lightweight read; the actual increment (incrementUsage) is
 * scheduled via after() alongside score-turn.ts's call, so this never adds
 * latency beyond the one read here.
 */
export async function checkUsageCap(
  supabase: SupabaseClient,
  accountId: string,
  hasActiveUnlock: boolean
): Promise<UsageCapResult> {
  if (hasActiveUnlock) return { allowed: true, turnsUsedToday: 0 };

  const { data } = await supabase
    .from("daily_usage")
    .select("turns_count")
    .eq("account_id", accountId)
    .eq("usage_date", todayUTC())
    .maybeSingle<{ turns_count: number }>();

  const turnsUsedToday = data?.turns_count ?? 0;
  return { allowed: turnsUsedToday < FREE_DAILY_CAP, turnsUsedToday };
}

/** Atomic upsert-increment via the Postgres function (avoids a read-then-write race). */
export async function incrementUsage(
  supabase: SupabaseClient,
  accountId: string
): Promise<void> {
  const { error } = await supabase.rpc("increment_daily_usage", {
    p_account_id: accountId,
    p_usage_date: todayUTC(),
  });
  if (error) console.error("[usage-cap] failed to increment:", error);
}
