import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAssignedCharacter } from "@/lib/characters/get-assigned-character";
import { EARLY_EXIT_THRESHOLD } from "@/lib/characters/tone";

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

  return NextResponse.json({
    name: assigned.character.name,
    slug: assigned.character.slug,
    interestScore: assigned.interestScore,
    memorySummary: assigned.memorySummary,
    ended: assigned.interestScore <= EARLY_EXIT_THRESHOLD,
  });
}
