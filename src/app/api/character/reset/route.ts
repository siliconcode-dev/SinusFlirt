import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * "Restart the relationship fresh" (Build_plan Phase 8) — deletes the
 * account's permanent relationship_state row entirely. The next call to
 * getAssignedCharacter() then lazy-assigns a brand new random character via
 * its existing fallback path (same one fresh accounts already use) — no new
 * assignment logic needed. Does not touch daily_usage or premium_unlocks.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const { error } = await supabase
    .from("relationship_state")
    .delete()
    .eq("account_id", user.id)
    .eq("is_permanent", true);

  if (error) {
    console.error("[character/reset] failed:", error);
    return NextResponse.json({ error: "Reset failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
