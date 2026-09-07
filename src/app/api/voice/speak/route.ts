import { NextResponse } from "next/server";
import { withGroqFallback, GROQ_MODELS } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import { getAssignedCharacter } from "@/lib/characters/get-assigned-character";

export async function POST(request: Request) {
  const { text } = (await request.json()) as { text: string };

  if (!text || text.length > 200) {
    return NextResponse.json(
      { error: "Text must be 1-200 characters (Orpheus's hard limit)." },
      { status: 400 }
    );
  }

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

  const start = performance.now();

  try {
    const response = await withGroqFallback((client) =>
      client.audio.speech.create({
        model: GROQ_MODELS.tts,
        voice: assigned.character.voiceId,
        input: text,
        response_format: "wav",
      })
    );

    const audio = await response.arrayBuffer();
    const ms = Math.round(performance.now() - start);
    console.log(`[voice/speak] ${ms}ms for ${text.length} chars`);

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/wav",
        "X-Synthesis-Ms": String(ms),
      },
    });
  } catch (error) {
    console.error("[voice/speak] failed:", error);
    return NextResponse.json({ error: "Speech synthesis failed." }, { status: 502 });
  }
}
