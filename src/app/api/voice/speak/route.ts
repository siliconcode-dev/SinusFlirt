import { NextResponse } from "next/server";
import { withGroqFallback, GROQ_MODELS } from "@/lib/groq";
import { AIKO } from "@/lib/characters/aiko";

export async function POST(request: Request) {
  const { text } = (await request.json()) as { text: string };

  if (!text || text.length > 200) {
    return NextResponse.json(
      { error: "Text must be 1-200 characters (Orpheus's hard limit)." },
      { status: 400 }
    );
  }

  const start = performance.now();

  try {
    const response = await withGroqFallback((client) =>
      client.audio.speech.create({
        model: GROQ_MODELS.tts,
        voice: AIKO.voiceId,
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
