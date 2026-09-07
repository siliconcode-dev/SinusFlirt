import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FREE_SLUGS } from "@/lib/characters/roster";

/**
 * Explicit character selection (project-owner override of the default
 * random-once assignment — Claude.md rule 6 normally forbids a pick-from-
 * roster screen; kept to the free tier only, premium stays random-grant-only
 * per Phase 7). Replaces the account's permanent relationship_state row with
 * a fresh one for the chosen character — same "start over" semantics as
 * /api/character/reset, just targeted instead of random.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { slug?: string } | null;
  const slug = body?.slug;

  if (!slug || !FREE_SLUGS.includes(slug)) {
    return NextResponse.json({ error: "Invalid character." }, { status: 400 });
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id")
    .eq("slug", slug)
    .single<{ id: string }>();

  if (!character) {
    return NextResponse.json({ error: "Invalid character." }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("relationship_state")
    .delete()
    .eq("account_id", user.id)
    .eq("is_permanent", true);

  if (deleteError) {
    console.error("[character/select] delete failed:", deleteError);
    return NextResponse.json({ error: "Selection failed." }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("relationship_state").insert({
    account_id: user.id,
    character_id: character.id,
    is_permanent: true,
  });

  if (insertError) {
    console.error("[character/select] insert failed:", insertError);
    return NextResponse.json({ error: "Selection failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
